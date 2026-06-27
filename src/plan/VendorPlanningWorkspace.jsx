// demo/src/plan/VendorPlanningWorkspace.jsx
// Sprint 53 · Vendor Intelligence + Detail Cockpit Pass
// PLAN Layer · Tier 0 · Track A
//
// Major refactor: the previous tabbed detail view (Overview / Contract /
// Deliverables / Communication / Activity / Notes) is replaced by a single
// scrolling Vendor Detail Cockpit with 10 sections:
//   1. Command Header      — readiness, lifecycle, next action, why it matters
//   2. Readiness Snapshot   — 9 challenge categories as chips
//   3. Planning             — what must be true before event day
//   4. Day-Of               — what we need when the event is live (honest empties)
//   5. Closeout             — what happens after the event (honest empties)
//   6. Required Questions   — category-specific checklist
//   7. Linked Event Work    — timeline / decisions / tasks / communication / budget / docs
//   8. Documents            — honest "not attached" until file storage ships
//   9. Notes                — vendor.notes display
//  10. Activity log         — feed + composer (preserves Sprint 50 functionality)
//
// The list (left column) now also surfaces readiness label + next-action hint.
// A new Vendor Command Strip sits above the list/detail at workspace top:
// "Vendor readiness: N safe · M attention · K critical" + highest-risk CTA.
//
// All intelligence is deterministic — see src/lib/vendorIntelligence.js and
// src/lib/vendorQuestions.js. No AI, no fake scoring.

import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { AuthCtx } from '../contexts/AuthContext';
// UX-SAAS (host de-cockpit): the SAME signal the L3 nav uses to reveal this tab
// to a host (flag-gated audience persona). When true, this surface speaks plain
// host words and hides planner-only B2B machinery; when false the planner /
// operator rendering is byte-identical to before. Sourced from presentationNav
// (not App.js) so the plan module stays insulated.
import { hostNavActive } from '../lib/presentationNav';
import { color, space, type, radius } from '../design/tokens';
import {
  getVendorLifecycleStage,
  getVendorReadiness,
  getVendorNextAction,
  getVendorChallengeSummary,
  getVendorPlanningState,
  getVendorDayOfState,
  getVendorCloseoutState,
  getVendorLinkedWork,
  getHighestRiskVendor,
  getVendorPortfolioSummary,
  getActionableNextStep,
} from '../lib/vendorIntelligence';
import { getVendorRequiredQuestions } from '../lib/vendorQuestions';
// Sprint 58C — Decision Memory: surface the captured "why this vendor" rationale.
import { memoryOn, latestRationaleForSubject } from '../lib/decisionMemory';
// Sprint 58G — Event Memory: the private per-vendor track record, surfaced at the pick.
import { vendorMemoryFor, summarizeVendorMemory } from '../lib/eventMemory';
import {
  buildVendorCopilotContext,
  getRuleBasedPreview,
  buildCopilotPrompt,
  parseCopilotResponse,
} from '../lib/vendorCopilot';
import {
  PAY_METHODS,
  DIGITAL_PAY_METHODS,
  buildPayLink,
  getSuggestedPayMethod,
  getOfflinePayInstruction,
} from '../lib/payLinks';
import {
  isStorageConfigured,
  uploadFile,
  getSignedUrl,
  validateFile,
  fmtFileSize,
  inferCategory,
} from '../lib/storage';
// Sprint 61.B — Vendor Accountability Phase C
// Sprint 61.C — Phase D adds conflict rendering
import {
  quickAccountabilityForVendor,
  inferPromisesFromVendor,
  deriveVendorNextAccountabilityAction,
  accountabilityLabel,
  deriveVendorPromiseConflicts,
  conflictsForVendor,
  // Sprint 50B — surface the promise tracker + follow-up drafts in the detail
  PROMISE_STATUS_LABEL,
  PROMISE_STATUS_SEVERITY,
  generateVendorFollowUpDraft,
} from '../lib/vendorAccountability';

const P = {
  canvas:       color.surface.canvas,
  base:         color.surface.base,
  card:         color.surface.card,
  elev:         color.surface.elevated || '#181c22',
  borderSubtle: color.border.subtle,
  borderDef:    color.border.default,
  textPrimary:   '#eef0f4',
  textSecondary: color.text.secondary,
  textTertiary:  color.text.tertiary,
  green:  color.status.confirmed,
  amber:  color.status.warning,
  red:    color.status.risk,
  // Sprint 60.U.3 10+ — steel-blue accent for non-semantic section
  // eyebrows. Matches App.js accentTopGrad + CommandCenter P.steelBlue.
  steelBlue: '#4E6877',
};
const FF = type.family;

// Studio Matte: the ONE steel-blue gradient used by primary CTAs in this
// workspace. Previously hardcoded as three separate `linear-gradient(...)`
// literals (Conflicts strip / Vendor list / Mobile summary) — consolidated so
// the design-system button reads from a single source.
const STEEL_CTA = 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)';

// Canonical PRIMARY button — matches App.js s.btn('primary') so the Vendors
// cockpit reads as the same app (steel-blue gradient, white text, 36/8/13,
// sentence case). Neutral "do this" actions use this; semantic green is kept
// ONLY for confirm/paid affirmations (a positive state change), never as a
// generic primary. Spread it and override only padding/width where needed.
const BTN_PRIMARY = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: STEEL_CTA, color: '#fff', border: 'none',
  borderRadius: 8, minHeight: 32, padding: '6px 14px',
  fontSize: type.size['base'], fontWeight: 600, fontFamily: FF,
  cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.30)',
};

// ── Level → color mapping (used everywhere chips/dots appear) ────────────────
function levelColor(level) {
  switch (level) {
    case 'critical': return P.red;
    case 'attention': return P.amber;
    case 'safe': return P.green;
    case 'not_started': return P.textTertiary;
    case 'closed': return P.textTertiary;
    case 'not_tracked': return P.textTertiary;
    default: return P.textTertiary;
  }
}
// (Legacy STATUS_CONFIG / appStageToFigma / statusCfg / fmt* utils removed in
// Sprint 53 — the cockpit uses readiness-level chips via LevelChip instead.
// All formatting concerns moved into vendorIntelligence helpers.)

// ── UX-SAAS host de-cockpit helpers ──────────────────────────────────────────
// A host hiring a caterer is not running a procurement pipeline. When this
// surface is shown to a host, swap the planner's CRM vocabulary (Lead / Booking /
// Contracted / Quoted / Considering, "vendor readiness", "critical") for plain
// host words. Every helper is a pure projection — planner / operator strings are
// untouched (the call sites only branch when `isHost` is true).
function isHostView(event) {
  return hostNavActive(event);
}
// Raw vendor.status → a calm host phrase. Hosts think "are they booked or am I
// still deciding?" — not "Contracted vs Deposit Paid vs Confirmed".
function hostStatusWord(status) {
  switch (status) {
    case 'Confirmed':
    case 'Booked':
    case 'Deposit Paid':
    case 'Contracted':
      return 'Booked';
    case 'Quoted':
      return 'Got a price';
    case 'Considering':
    case 'Not Started':
    case '':
    case undefined:
    case null:
      return 'Still deciding';
    default:
      return 'Booked';
  }
}
// Lifecycle stage word, host edition. The planner sees pipeline rungs
// (Lead · Booking · Locked in); a host just needs booked / still deciding,
// plus the genuinely useful time states.
function hostStageWord(stage, vendor) {
  if (stage === 'After the Event' || stage === 'Archived') return 'After the event';
  if (stage === 'Event Day') return 'Event day';
  return hostStatusWord(vendor && vendor.status);
}
// Accountability tier → host phrase. The planner's compliance vocabulary
// ("Missed promise", "Needs proof", "At risk") frames a friend you hired as a
// delinquent contractor. Hosts get the same SIGNAL in plain, calm words.
const HOST_TIER_LABEL = {
  on_track:        'On track',
  needs_proof:     'Check on this',
  needs_follow_up: 'Follow up',
  at_risk:         'Needs a nudge',
  missed_promise:  'Behind',
};
function hostTierLabel(tier) {
  return HOST_TIER_LABEL[tier] || 'Follow up';
}

// Studio Matte: the ONE status-chip style. The board flagged ~5 slightly
// different status-pill treatments (tint 12/14/1c/1e, border 33/40/55, radius
// sm/99/999) reading as inconsistency. Every status pill — readiness level,
// accountability tier, lock-in rung, promise status — now spreads this so they
// read as one system. `c` is the semantic color (green/amber/red/steel).
const statusChip = (c) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: type.size['xs'], fontWeight: 800, letterSpacing: '0.08em',
  textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.3,
  color: c, background: `${c}1a`, border: `1px solid ${c}4d`,
  borderRadius: 999, padding: '2px 8px', fontFamily: FF,
});

// Board re-audit: the detail's reference sections group under 4 plain-language
// ZONES (Deliverables · Money & contract · Day-of & after · Reference) so the
// cockpit reads as 4 areas, not ~10 flat peers.
const ZONE_LABEL = {
  marginTop: space[5], marginBottom: space[2], paddingTop: space[3],
  borderTop: `1px solid ${P.borderSubtle}`,
  fontSize: type.size['xs'], fontWeight: 800, letterSpacing: '0.16em',
  textTransform: 'uppercase', color: P.steelBlue, fontFamily: FF,
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Visual primitives ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function LevelChip({ level, label }) {
  const c = levelColor(level);
  return (
    <span style={statusChip(c)}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c, display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

function StatusDot({ level, size = 7 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: levelColor(level), flexShrink: 0,
      display: 'inline-block',
    }} />
  );
}

function SectionHeading({ label, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginTop: space[5], marginBottom: space[3], gap: 8,
    }}>
      <span style={{
        fontSize: type.size['xs'], fontWeight: type.weight.semibold,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: P.textSecondary, fontFamily: FF,
      }}>
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: type.size['xs'], color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ─── Sprint 60.C: reusable collapsible section wrapper ───────────────────────
// Replaces ad-hoc collapse code per-section so every cockpit section uses the
// same chevron + count + aria-expanded affordance. Caller drives isOpen so
// the sticky localStorage hook above can persist preferences per vendor.
function CollapsibleSection({ label, summary, hintColor, isOpen, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, marginTop: space[5], marginBottom: space[3],
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'left', fontFamily: FF,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: P.steelBlue, fontSize: type.size['sm'], width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: type.size['xs'], fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{label}</span>
        </span>
        {summary && (
          <span style={{
            fontSize: type.size['xs'],
            color: hintColor || P.textTertiary,
            fontFamily: FF, fontStyle: 'italic',
          }}>{summary}</span>
        )}
      </button>
      {isOpen && children}
    </div>
  );
}

// ─── Sprint 60.C: sticky collapse state per vendor (localStorage-backed) ────
// Stores BOOLEANS ONLY under `ngw-vendor-collapse-{vendorId}`. No vendor
// content; no PII. Falls back to in-memory state if localStorage throws.
// Smart defaults from the caller's `defaults` arg only apply when no saved
// state exists.
function useStickyVendorCollapse(vendorId, defaults) {
  const storageKey = vendorId ? `ngw-vendor-collapse-${vendorId}` : null;
  const [state, setState] = useState(() => {
    if (!storageKey) return defaults;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults so missing keys (e.g. new sections added later)
        // pick up their smart defaults instead of being undefined.
        return { ...defaults, ...parsed };
      }
    } catch {}
    return defaults;
  });
  // Re-init when switching vendors (the hook is called per-VendorDetail render).
  // Effect keys are vendorId-scoped so changing vendor doesn't write the new
  // defaults over the prior vendor's localStorage.
  useEffect(() => {
    if (!storageKey) { setState(defaults); return; }
    try {
      const raw = localStorage.getItem(storageKey);
      setState(raw ? { ...defaults, ...JSON.parse(raw) } : defaults);
    } catch { setState(defaults); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);
  const update = (patch) => {
    setState(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };
  return [state, update];
}

// Status-color → label mapping for planning/day-of/closeout rows
function rowStatusVisual(status) {
  switch (status) {
    case 'done': return { color: P.green, badge: '✓', badgeText: undefined };
    case 'missing': return { color: P.red, badge: '!', badgeText: undefined };
    case 'pending': return { color: P.amber, badge: '·', badgeText: undefined };
    case 'not_tracked': return { color: P.textTertiary, badge: '—', badgeText: 'Not tracked yet' };
    default: return { color: P.textTertiary, badge: '·', badgeText: undefined };
  }
}

// Vendor Readiness Pass · v2: every actionable status row is a button that
// addresses the issue. `onAddress` is the click handler the parent sets per
// row. When provided, the row renders with hover affordance + → indicator.
// When absent (e.g. status === 'not_tracked' where no field exists yet),
// the row stays inert.
function StatusRow({ label, value, status, consequence, onAddress, addressLabel }) {
  const v = rowStatusVisual(status);
  const body = (
    <>
      <span style={{
        width: 18, height: 18, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: type.size['sm'], fontWeight: type.weight.bold,
        color: v.color,
        marginTop: 1,
      }}>
        {v.badge}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: type.size['base'], color: P.textSecondary, fontFamily: FF, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: type.size['md'], fontWeight: type.weight.medium, color: status === 'done' ? P.textPrimary : v.color, fontFamily: FF }}>
          {value}
        </div>
        {consequence && (
          <div style={{ fontSize: type.size['caption'], color: P.textTertiary, fontFamily: FF, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
            {consequence}
          </div>
        )}
      </div>
      {onAddress && (
        <span style={{ color: P.textTertiary, fontSize: type.size['md'], flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} aria-hidden>→</span>
      )}
    </>
  );

  if (onAddress) {
    return (
      <button
        type="button"
        onClick={onAddress}
        title={addressLabel || `Address: ${label}`}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: `${space[3]}px 4px`,
          borderBottom: `1px solid ${P.borderSubtle}`,
          background: 'none', border: 'none', borderLeft: 'none', borderRight: 'none',
          borderTop: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: FF,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = P.borderSubtle + '33'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        {body}
      </button>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: `${space[3]}px 0`,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      {body}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Conflicts Strip (Phase D) ───────────────────────────────────────────────
// Surfaces the highest-severity cross-vendor conflicts above the workspace
// command strip. Each row is a plain-language explanation + steel-blue
// route CTA. Hidden when no conflicts detected.
// ─────────────────────────────────────────────────────────────────────────────

// Inter-vendor SCHEDULE conflicts (board 2026-06-10): the "no conflicts" banner
// was asserted from promise/delivery data only. This computes real day-of
// collisions — two+ vendors arriving at the same time bottleneck the dock — so
// "schedules are aligned" is earned, not claimed. Same conflict shape as
// deriveVendorPromiseConflicts so the strip renders them identically.
function getVendorArrivalConflicts(vendors) {
  const byTime = new Map();
  (vendors || []).forEach(v => {
    const t = v.arrivalTime;
    if (!t) return;
    if (!byTime.has(t)) byTime.set(t, []);
    byTime.get(t).push(v);
  });
  const out = [];
  byTime.forEach((vs, time) => {
    if (vs.length >= 2) {
      const names = vs.map(v => v.name || 'a vendor');
      out.push({
        id: `arrival-collision-${time}`,
        severity: 'attention',
        title: `${vs.length} vendors arrive at ${time}`,
        explanation: `${names.join(', ')} all arrive at ${time} — they'll bottleneck the dock unless you sequence their load-in.`,
        recommendedAction: 'Stagger arrival times or set a clear load-in order.',
        affectedVendorId: vs[0].id,
      });
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Vendor status bar (top of workspace) — ONE quiet line ────────────────────
// Board 2026-06-12 ("Vendors: eyes go to too many spots → calm the waters").
// The workspace previously stacked TWO loud bands above the list+detail:
//   • VendorCommandStrip — a red/amber "VENDOR READINESS" headline band with a
//     "Start with <vendor> →" button.
//   • ConflictsStrip — a steel-gradient "CONFLICTS FOUND" banner with its own
//     "Open <vendor> →" primary button.
// Both raced the Next-Step spine for the eye, AND both pointed at the SAME
// vendor the list already sorts to the top and auto-selects — the one action
// announced four times in four treatments. Verdict: one hero, collapse the
// redundant alarm layers. This single muted line replaces both:
//   • readiness = plain stat counts with small dots — NO band, NO CTA. "Where
//     do I start?" is answered by the risk-sorted list + default selection.
//   • the schedule conflict = a quiet clickable flag (text button, amber on
//     hover), NOT a banner with a filled button — an operational note, not a
//     second alarm.
// The ONE accent left on screen is the selected vendor's next-action button.
// ─────────────────────────────────────────────────────────────────────────────
function VendorStatusBar({ vendors, event, conflicts, onSelectVendor }) {
  const summary = useMemo(() => getVendorPortfolioSummary(vendors, event), [vendors, event]);
  const host = isHostView(event);
  if (!vendors || vendors.length === 0) return null;

  // UX-SAAS: hosts get warmer count words ("needs attention", not "critical").
  const segs = [
    summary.safe ? { level: 'safe', n: summary.safe, label: 'on track' } : null,
    summary.attention ? { level: 'attention', n: summary.attention, label: host ? 'to follow up on' : 'need follow-up' } : null,
    summary.critical ? { level: 'critical', n: summary.critical, label: host ? 'needs attention' : 'critical' } : null,
    summary.notStarted ? { level: 'not_started', n: summary.notStarted, label: host ? 'not started yet' : 'not started' } : null,
    summary.closed ? { level: 'closed', n: summary.closed, label: host ? 'all done' : 'closed' } : null,
  ].filter(Boolean);

  // Quiet conflict flag — top conflict only; click routes to the affected
  // vendor and centers its action card (handleSelect owns the focus).
  const topConflict = conflicts && conflicts.length ? conflicts[0] : null;
  const conflictTarget = topConflict
    ? (vendors.find(v => v.id === topConflict.affectedVendorId) || null)
    : null;
  const conflictText = topConflict
    ? (conflicts.length > 1 ? `${conflicts.length} scheduling conflicts` : topConflict.title)
    : null;

  return (
    <div style={{
      flexShrink: 0,
      background: P.base,
      borderBottom: `1px solid ${P.borderSubtle}`,
      padding: `${space[3]}px ${space[5]}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: space[4], flexWrap: 'wrap',
      fontFamily: FF,
    }}>
      {/* Readiness — a whisper label + stat counts. The 7px dots carry the only
          color; no headline, no band, no CTA. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{
          fontSize: type.size['xs'], fontWeight: type.weight.semibold,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: P.textTertiary,
        }}>
          {host ? 'Where things stand' : 'Vendor readiness'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {segs.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: type.size['base'], color: P.textSecondary }}>
              <StatusDot level={s.level} size={7} />
              <span style={{ fontWeight: type.weight.semibold, color: P.textPrimary }}>{s.n}</span>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Conflict flag, or a quiet all-clear. A text button — never a filled
          CTA. This is an operational note, not a second alarm. */}
      {conflictTarget ? (
        <button
          onClick={() => onSelectVendor && onSelectVendor(conflictTarget, topConflict)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: P.textSecondary, fontSize: type.size['caption'], fontFamily: FF,
            padding: '4px 2px', flexShrink: 0, borderRadius: radius.sm,
            transition: 'color 0.16s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = P.amber; }}
          onMouseLeave={e => { e.currentTarget.style.color = P.textSecondary; }}
          title={topConflict.explanation || 'Review this scheduling conflict'}
          aria-label={`Review scheduling conflict: ${conflictText}`}
        >
          <span aria-hidden style={{ color: P.amber, fontSize: type.size['caption'] }}>⚑</span>
          <span style={{ borderBottom: `1px dotted ${P.borderSubtle}` }}>{conflictText}</span>
          <span aria-hidden style={{ color: P.textTertiary }}>→</span>
        </button>
      ) : (vendors.length >= 2 ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: type.size['caption'], color: P.textTertiary, flexShrink: 0 }}>
          <span aria-hidden style={{ color: P.green, fontWeight: 800 }}>✓</span>
          Schedules aligned
        </span>
      ) : null)}
    </div>
  );
}

// (VendorCommandStrip + ConflictsStrip removed 2026-06-12 — both folded into
// the single VendorStatusBar above. getHighestRiskVendor still drives the
// list's default selection in VendorPlanningWorkspace, so the planner still
// lands on the top-risk vendor without a "Start with X" band saying so.)

// ─────────────────────────────────────────────────────────────────────────────
// ── Vendor list (left column) — risk-aware ──────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Fix #7: compute last contacted date for a vendor from event commClient
function getVendorLastContacted(vendor, event) {
  const comms = event?.commClient || [];
  const vName = vendor.name || vendor.vendor_name || '';
  const vMsgs = comms.filter(m =>
    m.channel === 'vendor' &&
    (m.vendor_name === vName || m.senderName === vName) &&
    (m.direction === 'outbound' || m.sender === 'planner')
  );
  if (!vMsgs.length) return null;
  const latest = vMsgs.reduce((best, m) => {
    const t = new Date(m.createdAt || m.date || 0).getTime();
    return t > (best?.t || 0) ? { t, msg: m } : best;
  }, null);
  if (!latest) return null;
  const daysAgo = Math.floor((Date.now() - latest.t) / 86400000);
  return daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
}

function VendorRow({ vendor, event, allEvents, accountability, nextAction, isSelected, onSelect }) {
  // Sprint 61.B — Accountability tier is now the primary signal. Readiness
  // stays as a secondary chip so the existing vendor-cockpit semantics still
  // flow through. If the parent doesn't pass an accountability prop, we
  // compute it locally (keeps the component testable in isolation).
  const readiness = useMemo(() => getVendorReadiness(vendor, event), [vendor, event]);
  const acc = accountability || useMemo(() => quickAccountabilityForVendor(vendor, event), [vendor, event]); // eslint-disable-line react-hooks/rules-of-hooks

  const host = isHostView(event);
  const tierColor = ACCOUNTABILITY_COLOR[acc.tier] || P.textTertiary;
  const tierLabel = host ? hostTierLabel(acc.tier) : accountabilityLabel(acc.tier);
  const emphasis = acc.tier === 'missed_promise' || acc.tier === 'at_risk';
  // The chip is reserved for the EXCEPTION — a genuinely critical vendor (red
  // readiness) or a broken/at-risk promise. Routine follow-up rows ride on the
  // colored dot alone, so the list reads "quiet, quiet, THIS" instead of five
  // identical pills. A critical vendor is labelled by its real state.
  const isCritical = readiness.level === 'critical';
  const showChip = isCritical || emphasis;
  const chipColor = isCritical ? P.red : tierColor;
  const chipLabel = isCritical ? (host ? 'Needs you' : 'Critical') : tierLabel;
  const leftStrip = isSelected ? P.steelBlue
    : emphasis ? P.red
    : acc.tier === 'needs_follow_up' ? P.amber
    : 'transparent';

  // Redesign (2026-06-10, "too busy"): the list is for SCANNING, not reading.
  // Each row is now TWO lines max — status dot + name, then category — with a
  // SINGLE status chip (only when the vendor isn't on track). The "why",
  // last-contacted, next-step and tags all live in the detail; piling them into
  // every row turned the list into a wall of repeated pills. On-track vendors
  // carry only a calm green dot so attention rows actually stand out.
  return (
    <button
      onClick={() => onSelect(vendor)}
      style={{
        display: 'flex', alignItems: 'center',
        width: '100%', padding: '11px 14px',
        borderBottom: `1px solid ${P.borderSubtle}`,
        border: 'none',
        borderLeft: `3px solid ${leftStrip}`,
        background: isSelected ? `${P.steelBlue}38` : 'transparent',
        cursor: 'pointer', textAlign: 'left', gap: 10,
        fontFamily: FF,
      }}
    >
      <StatusDot level={readiness.level} size={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: type.size['lg'], fontWeight: type.weight.semibold,
          color: P.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {vendor.name || vendor.vendor_name || 'Unnamed Vendor'}
        </div>
        <div style={{
          fontSize: type.size['sm'], color: P.textTertiary, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {vendor.category || vendor.type || '—'}
        </div>
        {/* Sprint 58C — Decision Memory expression: surface the captured "why this
            vendor" back where the planner sees the vendor. */}
        {memoryOn() && (() => {
          const why = latestRationaleForSubject(event, vendor.id);
          return why ? (
            <div style={{ fontSize: type.size['xs'], color: P.textTertiary, marginTop: 2, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontStyle: 'normal', fontWeight: 700, opacity: 0.7 }}>Rationale:</span> {why}
            </div>
          ) : null;
        })()}
        {/* Sprint 58G — Event Memory: the private track record from PAST events
            (excludes this event), surfaced where the planner picks the vendor. */}
        {memoryOn() && (() => {
          const mem = vendorMemoryFor(allEvents, { bankId: vendor.bankId, name: vendor.name || vendor.vendor_name }, event && event.id);
          const line = summarizeVendorMemory(mem);
          return line ? (
            <div style={{ fontSize: type.size['xs'], color: P.textTertiary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: 700, opacity: 0.7 }}>Memory:</span> {line}
            </div>
          ) : null;
        })()}
      </div>
      {/* Board re-audit (2026-06-10): the tier chip now shows ONLY on the
          exception (critical / at-risk). When most rows share a tier the chip
          was pure repetition — "five identical alarms." The colored status dot
          + left strip carry routine follow-up; the chip is reserved for the one
          vendor that's genuinely on fire, so the list reads "quiet, quiet, THIS." */}
      {showChip && (
        <span style={{ ...statusChip(chipColor), flexShrink: 0 }}>
          {chipLabel}
        </span>
      )}
    </button>
  );
}

// Sprint 61.B — accountability tier priority. Drives VendorList default sort.
const ACCOUNTABILITY_RANK = {
  missed_promise:  0,
  at_risk:         1,
  needs_follow_up: 2,
  needs_proof:     3,
  on_track:        4,
};
const ACCOUNTABILITY_COLOR = {
  missed_promise:  P.red,
  at_risk:         P.amber,  // Red audit (2026-06-10): reserve red for the broken-promise tier; at-risk is amber.
  needs_follow_up: P.amber,
  needs_proof:     P.steelBlue,
  on_track:        P.green,
};

// Phase C filter set. Filter keys match the spec Part 4 list.
// Redesign (2026-06-10): trimmed from 5 chips to 3 so the filter row no longer
// wraps to two rows and reads as chrome. "Evidence missing" / "Conflicts" were
// power-filters — that signal still surfaces via the attention tier + the
// Conflicts strip; the list header just needs the three the planner actually
// toggles between.
const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'ready',     label: 'Ready' },
  { key: 'all',       label: 'All' },
];

function VendorList({ vendors, selected, onSelect, event, allEvents, isMobile, onFilter, onAdd }) {
  const [filter, setFilter] = useState('attention');
  const [tagFilter, setTagFilter] = useState(null); // attribute-tag filter

  // Compute accountability for every vendor once. Stable across filter changes.
  const enriched = useMemo(() => {
    return (vendors || []).map(v => {
      const promises = inferPromisesFromVendor(v, event);
      const acc = quickAccountabilityForVendor(v, event);
      const next = deriveVendorNextAccountabilityAction(v, event, promises);
      const readiness = getVendorReadiness(v, event);
      return { v, promises, acc, next, readiness };
    });
  }, [vendors, event]);

  // Sort by accountability tier first, then by event-day proximity + issue count.
  const sortedAll = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const tA = ACCOUNTABILITY_RANK[a.acc.tier] ?? 9;
      const tB = ACCOUNTABILITY_RANK[b.acc.tier] ?? 9;
      if (tA !== tB) return tA - tB;
      // Higher open-issue count wins among same tier
      if ((b.acc.openIssues || 0) !== (a.acc.openIssues || 0)) return (b.acc.openIssues || 0) - (a.acc.openIssues || 0);
      // More evidence missing wins
      if ((b.acc.missingProof || 0) !== (a.acc.missingProof || 0)) return (b.acc.missingProof || 0) - (a.acc.missingProof || 0);
      // Otherwise alphabetic by name
      return (a.v.name || '').localeCompare(b.v.name || '');
    });
  }, [enriched]);

  // Apply current filter.
  const sorted = useMemo(() => {
    if (filter === 'all') return sortedAll;
    if (filter === 'attention') return sortedAll.filter(x => x.acc.tier !== 'on_track');
    if (filter === 'ready')     return sortedAll.filter(x => x.acc.tier === 'on_track');
    if (filter === 'evidence')  return sortedAll.filter(x => (x.acc.missingProof || 0) > 0);
    if (filter === 'conflicts') return sortedAll.filter(x => (x.acc.tier === 'at_risk' || x.acc.tier === 'missed_promise'));
    return sortedAll;
  }, [sortedAll, filter]);

  // Attribute-tag filter (additive to the tier filter).
  const availableTags = useMemo(() => {
    const set = new Set();
    (vendors || []).forEach(v => (v.tags || []).forEach(t => set.add(t)));
    return [...set];
  }, [vendors]);
  const visible = useMemo(
    () => tagFilter ? sorted.filter(x => ((x.v && x.v.tags) || []).includes(tagFilter)) : sorted,
    [sorted, tagFilter]
  );


  return (
    <div style={{
      width: isMobile ? '100%' : 260, flexShrink: 0,
      background: P.base,
      borderRight: isMobile ? 'none' : `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column',
      height: isMobile ? 'auto' : '100%',
    }}>
      <div style={{
        height: 42, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: `1px solid ${P.borderSubtle}`,
        gap: 8,
      }}>
        <span style={{
          fontSize: type.size['xs'], fontWeight: type.weight.medium,
          letterSpacing: '0.10em', color: P.textTertiary, fontFamily: FF,
        }}>
          {vendors.length} {isHostView(event) ? (vendors.length === 1 ? 'PERSON' : 'PEOPLE') : 'VENDORS'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {onAdd && (
            <button
              data-testid="add-vendor-btn"
              aria-label="Add vendor"
              onClick={onAdd}
              style={{ ...BTN_PRIMARY, padding: isMobile ? '10px 16px' : '8px 16px', minHeight: isMobile ? 44 : 36, flexShrink: 0 }}
            >
              + Add vendor
            </button>
          )}
        </div>
      </div>
      {/* Sprint 61.B — filter chips. 44px touch targets on mobile. */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 6, padding: '8px 10px',
        borderBottom: `1px solid ${P.borderSubtle}`, flexWrap: 'wrap',
        background: P.base,
      }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              style={{
                background: active ? `${P.steelBlue}26` : 'transparent',
                border: `1px solid ${active ? P.steelBlue : P.borderSubtle}`,
                borderRadius: 999, cursor: 'pointer',
                color: active ? P.textPrimary : P.textSecondary,
                fontFamily: FF, fontSize: type.size['sm'], fontWeight: 700,
                letterSpacing: '0.04em',
                padding: isMobile ? '10px 12px' : '4px 10px',
                minHeight: isMobile ? 44 : 34,
                lineHeight: 1,
              }}>
              {f.label}
            </button>
          );
        })}
      </div>
      {/* Attribute-tag filter — show only when vendors actually carry tags. */}
      {availableTags.length > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: '6px 10px', borderBottom: `1px solid ${P.borderSubtle}`, flexWrap: 'wrap', background: P.base, alignItems: 'center' }}>
          <span style={{ fontSize: type.size['xs'], fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.textTertiary, fontFamily: FF }}>Attributes</span>
          {availableTags.map(t => {
            const on = tagFilter === t;
            return (
              <button key={t} onClick={() => setTagFilter(on ? null : t)} aria-pressed={on}
                style={{ background: on ? `${P.green}26` : 'transparent', border: `1px solid ${on ? P.green : P.borderSubtle}`, borderRadius: 999, cursor: 'pointer', color: on ? P.textPrimary : P.textSecondary, fontFamily: FF, fontSize: type.size['xs'], fontWeight: 700, padding: isMobile ? '8px 11px' : '4px 9px', minHeight: isMobile ? 40 : 26, lineHeight: 1 }}>
                {on ? '✓ ' : ''}{t}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto' }}>
        {vendors.length === 0 ? (
          // Sprint 60.L EmptyStateCard pattern (inline, using P tokens).
          // Title / body / primary CTA so the user understands what
          // belongs here and what to do next.
          <div style={{ padding: `${space[5]}px ${space[5]}px ${space[6]}px`, fontFamily: FF }}>
            <div style={{
              padding: '20px 18px 22px',
              background: P.base,
              border: `1px solid ${P.borderSubtle}`,
              borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{
                fontSize: type.size['caption'], fontWeight: type.weight.semibold,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: P.textTertiary,
              }}>Vendors</div>
              <div style={{
                fontSize: type.size['2xl'], fontWeight: type.weight.semibold,
                letterSpacing: '-0.015em', lineHeight: 1.25,
                color: P.textPrimary,
              }}>Add the people helping with this event.</div>
              <div style={{ fontSize: type.size['md'], color: P.textSecondary, lineHeight: 1.5 }}>
                Caterers, photographers, venues, DJs, rentals, and anyone else you need to coordinate.
              </div>
              <button onClick={onAdd} style={{
                marginTop: 4,
                padding: '12px 18px', minHeight: 48,
                borderRadius: radius.sm, border: 'none',
                background: P.green, color: '#070809',
                fontSize: type.size['xl'], fontWeight: type.weight.semibold,
                fontFamily: FF, cursor: 'pointer',
                alignSelf: 'flex-start',
              }}>Add a vendor</button>
            </div>
          </div>
        ) : (
          <>
            {/* Redesign (2026-06-10): the in-list "Start with this vendor" card
                was removed — the workspace's top readiness strip already names
                the one vendor to start with, and the two surfaces were naming
                DIFFERENT vendors (different ranking logic), which read as noise
                and confusion. One "start here" prompt, at the top. */}
            {visible.length === 0 ? (
              <div style={{
                padding: '20px 16px', textAlign: 'center',
                color: P.textTertiary, fontSize: type.size['base'], fontFamily: FF,
              }}>
                {tagFilter ? `No vendors tagged “${tagFilter}”.`
                  : filter === 'attention' ? 'Nothing needs attention right now — every vendor is on track.'
                  : filter === 'ready' ? 'No vendors on track yet — start by confirming the highest-priority promise.'
                  : 'No vendors match this filter.'}
              </div>
            ) : visible.map(x => (
              <VendorRow
                key={x.v.id || x.v.name}
                vendor={x.v}
                event={event}
                allEvents={allEvents}
                accountability={x.acc}
                nextAction={x.next}
                isSelected={selected?.id === x.v.id || (selected && !x.v.id && selected.name === x.v.name)}
                onSelect={onSelect}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Vendor Detail Cockpit ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1b — Reach actions (Sprint 57)
// Adds zero-friction "Join call" + "WhatsApp" + "Call" + "Email" links to the
// cockpit Command Header. Each is a deep link — opens the right app with
// minimal effort. No new fields, no new schema — purely leveraging vendor data
// already stored. Renders only buttons for which the vendor has data on file.
function ReachActions({ vendor }) {
  // Call → opens the phone/dialer app (tel:); Email → opens the mail app
  // (mailto:). On a phone these launch the native apps directly (user request
  // 2026-06-12: "I want call and email to open the app").
  const callLink = vendor.zoomUrl || vendor.meetUrl || vendor.teamsUrl;
  const callPlatform = vendor.zoomUrl ? 'Zoom' : vendor.meetUrl ? 'Meet' : vendor.teamsUrl ? 'Teams' : null;
  const waHref = vendor.whatsapp
    ? (vendor.whatsapp.startsWith('http') ? vendor.whatsapp : `https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}`)
    : null;
  const telHref = vendor.phone ? `tel:${vendor.phone.replace(/\s/g, '')}` : null;
  const mailHref = vendor.contact ? `mailto:${vendor.contact}` : null;

  // Secondary action style — aligned to the app's canonical button dimensions
  // (height 32, radius 8, 13px) so Vendors' Call/Email/Edit read as the same
  // system as the rest of the app, just the quiet (outlined) tier.
  const btnStyle = {
    background: 'none', border: `1px solid ${P.borderSubtle}`,
    borderRadius: 8, cursor: 'pointer',
    fontSize: type.size['base'], fontWeight: type.weight.medium,
    color: P.textSecondary, fontFamily: FF,
    padding: '6px 14px', textDecoration: 'none', minHeight: 32,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  };

  return (
    <>
      {callLink && (
        <a
          href={callLink} target="_blank" rel="noopener noreferrer"
          aria-label={`Join ${callPlatform} call with ${vendor.name}`}
          style={btnStyle}
        >
          {callPlatform} call →
        </a>
      )}
      {waHref && (
        <a
          href={waHref} target="_blank" rel="noopener noreferrer"
          aria-label={`Open WhatsApp chat with ${vendor.name}`}
          style={btnStyle}
        >
          WhatsApp →
        </a>
      )}
      {telHref && (
        <a
          href={telHref}
          aria-label={`Call ${vendor.name} — opens your phone app`}
          title={`Call ${vendor.phone}`}
          style={btnStyle}
        >
          Call
        </a>
      )}
      {mailHref && (
        <a
          href={mailHref}
          aria-label={`Email ${vendor.name} — opens your mail app`}
          title={`Email ${vendor.contact}`}
          style={btnStyle}
        >
          Email
        </a>
      )}
    </>
  );
}

// 1a — Next Action card (deep CTAs)
// Sprint 56d — pushed deeper than Sprint 56c. The CTAs now actually do the
// thing: payment opens a method picker with deep links to Venmo/Zelle/etc.,
// contract handling exposes URL paste + send-for-signature, arrival time
// shows an inline time picker. No more "mark this happened" without giving
// the planner a real way to make it happen.
function NextActionCard({ vendor, accent, nextAction, onPatchVendor, onAddLog, onEdit, eventId, userId, expandedKind: extExpandedKind, setExpandedKind: extSetExpandedKind, alsoItems = [], onAddressItem }) {
  const step = useMemo(() => getActionableNextStep(nextAction, vendor), [nextAction, vendor]);
  const [doneState, setDoneState] = useState(null);
  // Sprint 60.B: when VendorDetail drives expandedKind from outside (e.g.
  // section-focus route from Day-of Missing arrival), use the external
  // state. Otherwise fall back to local state so call sites that don't
  // pass the prop keep the pre-60.B behavior.
  const [localExpandedKind, setLocalExpandedKind] = useState(null);
  const expandedKind     = extSetExpandedKind ? extExpandedKind   : localExpandedKind;
  const setExpandedKind  = extSetExpandedKind ? extSetExpandedKind : setLocalExpandedKind;
  const isDone = doneState && Date.now() < doneState.until;

  const flashDone = (label) => {
    setDoneState({ label: label + ' ✓', until: Date.now() + 2200 });
    setExpandedKind(null);
  };

  const fire = () => {
    if (!step) return;
    if (step.kind === 'patch' && onPatchVendor) {
      onPatchVendor(vendor.id, step.patch);
      if (step.logText && onAddLog) onAddLog(vendor.id, step.logText);
      flashDone(step.ctaLabel);
    } else if (step.kind === 'log' && onAddLog) {
      onAddLog(vendor.id, step.logText);
      flashDone(step.ctaLabel);
    } else if (step.kind === 'edit' && onEdit) {
      onEdit();
    } else if (step.kind === 'payment' || step.kind === 'contract' || step.kind === 'arrival') {
      setExpandedKind(step.kind);
    }
  };

  return (
    <div style={{
      marginTop: space[5],
      background: P.card,
      border: `1px solid ${accent}33`,
      borderLeft: `2px solid ${accent}`,
      borderRadius: radius.md,
      padding: `${space[4]}px ${space[5]}px`,
    }}>
      {/* Consolidated header: when there are other attention items the card IS
          the "what needs attention" surface (next action = the lead item);
          otherwise it's a plain "Next action". */}
      <div style={{
        fontSize: type.size['xs'], fontWeight: type.weight.semibold,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: alsoItems.length ? accent : P.textTertiary, marginBottom: 6, fontFamily: FF,
      }}>
        {alsoItems.length ? `What needs attention · ${alsoItems.length + 1}` : 'Next action'}
      </div>
      <div style={{
        fontSize: type.size['md'], fontWeight: type.weight.semibold,
        color: P.textPrimary, fontFamily: FF, lineHeight: 1.35,
      }}>
        {nextAction.title}
      </div>
      <div style={{
        fontSize: type.size['caption'], color: P.textSecondary, fontFamily: FF,
        marginTop: 5, lineHeight: 1.45,
      }}>
        {nextAction.consequence}
      </div>

      {/* CTA row OR expanded inline UI */}
      {step && !expandedKind && (
        <div style={{
          marginTop: space[4],
          display: 'flex', alignItems: 'center', gap: space[3], flexWrap: 'wrap',
        }}>
          <button
            onClick={fire}
            disabled={isDone}
            style={{
              padding: '7px 14px', borderRadius: radius.sm,
              border: 'none', cursor: isDone ? 'default' : 'pointer',
              background: isDone ? P.green : accent,
              color: '#070809',
              fontSize: type.size['sm'], fontWeight: type.weight.semibold,
              fontFamily: FF, letterSpacing: '0.06em', textTransform: 'uppercase',
              opacity: isDone ? 0.85 : 1,
              transition: 'background 200ms ease',
            }}
          >
            {isDone ? doneState.label : step.ctaLabel}
          </button>
          {step.editHint && !isDone && (
            <span style={{ fontSize: type.size['xs'], color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
              {step.editHint}
            </span>
          )}
          {isDone && step.kind !== 'edit' && (
            <span style={{ fontSize: type.size['xs'], color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
              Logged to activity feed.
            </span>
          )}
        </div>
      )}

      {/* "Also needs attention" — the remaining items, deduped against the lead
          action. Hidden while an inline flow (payment/contract/arrival) is open
          so the planner stays focused on the task they just started. */}
      {!expandedKind && alsoItems.length > 0 && (
        <div style={{ marginTop: space[4], paddingTop: space[3], borderTop: `1px solid ${P.borderSubtle}` }}>
          <div style={{
            fontSize: type.size['xs'], fontWeight: type.weight.semibold,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: P.textTertiary, marginBottom: space[2], fontFamily: FF,
          }}>
            Also open
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
            {alsoItems.slice(0, 4).map((it, i) => {
              const col = it.sev === 'critical' ? P.red : P.amber;
              // Each "Also open" row is now a CLICKABLE button that routes to its
              // clearing action (board 2026-06-12: no dead alerts). onAddressItem
              // maps the item's category key → payment/contract/arrival panel or
              // the editor; falls back to a plain row if no handler is wired.
              const body = (
                <>
                  <span style={{ color: col, fontSize: type.size['caption'], fontWeight: 800, lineHeight: 1.4, flexShrink: 0, width: 12, textAlign: 'center' }}>
                    {it.sev === 'critical' ? '!' : '•'}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: type.size['caption'], color: P.textSecondary, lineHeight: 1.45 }}>
                    <span style={{ color: P.textPrimary, fontWeight: type.weight.medium }}>{it.label}</span>
                    {it.text ? <span style={{ color: P.textTertiary }}> — {it.text}</span> : null}
                  </span>
                  {onAddressItem && <span aria-hidden style={{ color: P.textTertiary, fontSize: type.size['base'], flexShrink: 0, alignSelf: 'center' }}>→</span>}
                </>
              );
              if (!onAddressItem) {
                return <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: FF, padding: '2px 0' }}>{body}</div>;
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAddressItem(it)}
                  title={`Resolve: ${it.label}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
                    textAlign: 'left', fontFamily: FF, cursor: 'pointer',
                    background: 'none', border: 'none', borderRadius: radius.sm,
                    padding: '5px 6px', margin: '0 -6px', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.borderSubtle + '40'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {expandedKind === 'payment' && (
        <PaymentFlow
          vendor={vendor}
          step={step}
          accent={accent}
          onCancel={() => setExpandedKind(null)}
          onConfirmSent={(method, amt) => {
            const patch = step.target === 'deposit'
              ? { depositPaid: true, depositPaidAt: new Date().toISOString(), depositMethod: method }
              : { balancePaid: true, balancePaidAt: new Date().toISOString(), balanceMethod: method };
            if (onPatchVendor) onPatchVendor(vendor.id, patch);
            if (onAddLog) onAddLog(vendor.id,
              `${step.target === 'deposit' ? 'Deposit' : 'Balance'} of $${amt.toLocaleString()} sent via ${method} (recorded via vendor cockpit).`
            );
            flashDone(`Sent via ${method}`);
          }}
        />
      )}

      {expandedKind === 'contract' && (
        <ContractFlow
          vendor={vendor}
          accent={accent}
          eventId={eventId}
          userId={userId}
          onCancel={() => setExpandedKind(null)}
          onAttachUrl={(url) => {
            if (onPatchVendor) onPatchVendor(vendor.id, { contractUrl: url, contractSigned: true });
            if (onAddLog) onAddLog(vendor.id, `Contract link attached and marked signed: ${url}`);
            flashDone('Contract attached');
          }}
          onMarkReceived={() => {
            if (onPatchVendor) onPatchVendor(vendor.id, { contractSigned: true });
            if (onAddLog) onAddLog(vendor.id, 'Signed contract received offline; status updated via vendor cockpit.');
            flashDone('Marked received');
          }}
          onLogSentForSignature={() => {
            if (onAddLog) onAddLog(vendor.id, `Emailed ${vendor.contact || vendor.name} to request the signed contract.`);
            flashDone('Logged');
          }}
          onUploadFile={({ storagePath, fileName, fileSize, signedUrl }) => {
            if (onPatchVendor) onPatchVendor(vendor.id, {
              contractStoragePath: storagePath,
              contractFileName: fileName,
              contractFileSize: fileSize,
              // Store the signed URL so DocumentsSection and AI extraction can
              // use it immediately. Signed URLs expire in 1 hour — for long-lived
              // access the planner can re-open the cockpit to refresh.
              ...(signedUrl ? { contractUrl: signedUrl } : {}),
              // contractSigned intentionally NOT set here — uploading a file
              // does not mean the contract is signed. Planner marks it signed
              // separately after confirming signatures exist.
            });
            if (onAddLog) onAddLog(vendor.id, `Contract file uploaded: ${fileName} (${Math.round((fileSize || 0) / 1024)}KB) — mark signed once you confirm signatures.`);
            flashDone('Contract uploaded — ready to analyze');
          }}
        />
      )}

      {expandedKind === 'arrival' && (
        <ArrivalTimeFlow
          vendor={vendor}
          accent={accent}
          onCancel={() => setExpandedKind(null)}
          onSave={(time) => {
            if (onPatchVendor) onPatchVendor(vendor.id, { arrivalTime: time });
            if (onAddLog) onAddLog(vendor.id, `Arrival/setup time set to ${time} via vendor cockpit.`);
            flashDone('Arrival set');
          }}
        />
      )}
    </div>
  );
}

// ── Payment flow — actually go pay (or copy info, or mark sent) ─────────────
function PaymentFlow({ vendor, step, accent, onCancel, onConfirmSent }) {
  const [confirming, setConfirming] = useState(false);
  const [method, setMethod] = useState(getSuggestedPayMethod(vendor));
  const amt = step.amount || 0;
  const link = useMemo(() => buildPayLink(method, vendor, amt), [method, vendor, amt]);
  const isDigital = DIGITAL_PAY_METHODS.includes(method);
  const offlineMsg = !link && getOfflinePayInstruction(method, vendor);
  const [copiedField, setCopiedField] = useState(null);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {}
  };

  return (
    <div style={{
      marginTop: space[4],
      padding: space[4],
      background: P.canvas,
      border: `1px solid ${P.borderSubtle}`,
      borderRadius: radius.sm,
      fontFamily: FF,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space[3], gap: space[3], flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary }}>
            {step.amountLabel}
          </div>
          <div style={{ fontSize: type.size['2xl'], fontWeight: type.weight.semibold, color: P.textPrimary }}>
            ${amt.toLocaleString()}
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel payment flow"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF,
            padding: '4px 8px',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Method picker — Sprint 57d: htmlFor association for screen readers */}
      <label htmlFor={`pay-method-${vendor.id}`} style={{ display: 'block', fontSize: type.size['xs'], color: P.textTertiary, marginBottom: 4, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: type.weight.semibold }}>
        Pay via
      </label>
      <select
        id={`pay-method-${vendor.id}`}
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        aria-label="Payment method"
        style={{
          width: '100%', padding: '8px 10px', marginBottom: space[3],
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, color: P.textPrimary,
          fontSize: type.size['base'], fontFamily: FF, outline: 'none', cursor: 'pointer',
        }}
      >
        {PAY_METHODS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Digital deep link OR offline instructions */}
      {isDigital && link ? (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`,
          background: P.card, border: `1px solid ${accent}33`,
          borderRadius: radius.sm, marginBottom: space[3],
        }}>
          <div style={{ fontSize: type.size['sm'], color: P.textSecondary, marginBottom: 6, lineHeight: 1.45 }}>
            {link.startsWith('zelle:')
              ? 'Zelle has no universal deep link — copy the destination and send from your bank app.'
              : `Tap to open ${method} with the amount + note pre-filled.`}
          </div>
          {link.startsWith('zelle:') ? (
            <button
              onClick={() => copy(link.slice(6), 'zelle-dest')}
              style={{
                padding: '8px 14px', borderRadius: radius.sm,
                background: `${accent}22`, color: accent, border: `1px solid ${accent}66`, cursor: 'pointer',
                fontSize: type.size['sm'], fontWeight: type.weight.bold,
                letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
              }}
            >
              {`Copy Zelle destination${copiedField === 'zelle-dest' ? ' ✓' : ''}`}
            </button>
          ) : (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 14px', borderRadius: radius.sm,
                background: accent, color: '#070809',
                fontSize: type.size['sm'], fontWeight: type.weight.semibold,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: FF, textDecoration: 'none',
              }}
            >
              Open {method} →
            </a>
          )}
        </div>
      ) : isDigital ? (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`,
          background: P.card, border: `1px solid ${P.amber}33`,
          borderRadius: radius.sm, marginBottom: space[3],
          fontSize: type.size['sm'], color: P.amber,
        }}>
          No {method} handle on file for this vendor — open the Edit modal to add it, or pick a different method.
        </div>
      ) : (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`,
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, marginBottom: space[3],
          fontSize: type.size['sm'], color: P.textSecondary, lineHeight: 1.5,
        }}>
          {offlineMsg}
          {vendor.paymentNote && (
            <button
              onClick={() => copy(vendor.paymentNote, 'paynote')}
              style={{
                marginLeft: 6, background: 'none',
                border: `1px solid ${P.borderSubtle}`,
                borderRadius: radius.sm, cursor: 'pointer',
                fontSize: type.size['xs'], color: P.textSecondary, padding: '2px 6px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              {copiedField === 'paynote' ? 'Copied ✓' : 'Copy note'}
            </button>
          )}
        </div>
      )}

      {/* "I sent it" confirmation — two-step so a paid mark is never accidental */}
      {confirming ? (
        <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap', alignItems: 'center', background: `${P.green}10`, border: `1px solid ${P.green}33`, borderRadius: radius.sm, padding: space[3] }}>
          <span style={{ fontSize: type.size['sm'], fontWeight: type.weight.semibold, color: P.textPrimary, fontFamily: FF }}>
            Mark ${amt.toLocaleString()} paid via {method}?
          </span>
          <button
            onClick={() => { onConfirmSent(method, amt); setConfirming(false); }}
            style={{ padding: '7px 14px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', background: P.green, color: '#070809', fontSize: type.size['sm'], fontWeight: type.weight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF }}
          >
            Yes · mark paid
          </button>
          <button
            onClick={() => setConfirming(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, padding: '4px 8px' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
          <button
            onClick={() => setConfirming(true)}
            style={{
              padding: '7px 14px', borderRadius: radius.sm,
              border: 'none', cursor: 'pointer',
              background: P.green, color: '#070809',
              fontSize: type.size['sm'], fontWeight: type.weight.semibold,
              letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
            }}
          >
            I sent it · mark paid
          </button>
          <span style={{ fontSize: type.size['xs'], color: P.textTertiary, fontStyle: 'italic', alignSelf: 'center' }}>
            Records the method used in the activity log.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Contract flow — paste URL, upload file, send for signature, or mark received
function ContractFlow({ vendor, accent, onCancel, onAttachUrl, onMarkReceived, onLogSentForSignature, onUploadFile, eventId, userId }) {
  const [url, setUrl] = useState(vendor.contractUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const validUrl = /^https?:\/\/\S+/.test(url.trim());

  const mailtoHref = vendor.contact
    ? `mailto:${vendor.contact}?subject=${encodeURIComponent(`Contract for ${vendor.name}`)}&body=${encodeURIComponent(
        `Hi ${vendor.contactName || vendor.name},\n\nCould you send over the signed contract when you have a moment? We want to make sure we have a clean booking record on file.\n\nThanks,\n[Your name]`
      )}`
    : null;

  return (
    <div style={{
      marginTop: space[4],
      padding: space[4],
      background: P.canvas,
      border: `1px solid ${P.borderSubtle}`,
      borderRadius: radius.sm,
      fontFamily: FF,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space[3] }}>
        <div style={{ fontSize: type.size['sm'], color: P.textSecondary }}>
          Three ways to handle this contract:
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel contract flow"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, padding: '4px 8px',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Option 1: Paste link */}
      <div style={{
        padding: space[3], marginBottom: space[3],
        background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
      }}>
        <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
          Paste contract link
        </div>
        <div style={{ fontSize: type.size['sm'], color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
          Drive / Dropbox / DocuSign URL. Saves it to the vendor record and marks signed.
        </div>
        <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '7px 10px',
              background: P.canvas, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.sm, color: P.textPrimary,
              fontSize: type.size['caption'], fontFamily: FF, outline: 'none',
            }}
          />
          <button
            onClick={() => validUrl && onAttachUrl(url.trim())}
            disabled={!validUrl}
            style={{
              padding: '6px 12px', borderRadius: radius.sm,
              border: 'none', cursor: validUrl ? 'pointer' : 'not-allowed',
              background: validUrl ? accent : P.borderSubtle,
              color: validUrl ? '#070809' : P.textTertiary,
              fontSize: type.size['xs'], fontWeight: type.weight.semibold,
              letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
            }}
          >
            Attach + sign
          </button>
        </div>
      </div>

      {/* Option 2: Email for signature */}
      <div style={{
        padding: space[3], marginBottom: space[3],
        background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
      }}>
        <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
          Email vendor about contract
        </div>
        <div style={{ fontSize: type.size['sm'], color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
          {mailtoHref
            ? 'Opens your mail client with a templated request for the signed contract. This is an email, not an e-signature flow.'
            : `No email on file for ${vendor.name} — add one in the editor to use this option.`}
        </div>
        <div style={{ display: 'flex', gap: space[2] }}>
          <a
            href={mailtoHref || '#'}
            onClick={(e) => { if (!mailtoHref) { e.preventDefault(); return; } onLogSentForSignature(); }}
            style={{
              padding: '6px 12px', borderRadius: radius.sm,
              border: `1px solid ${mailtoHref ? P.borderDef : P.borderSubtle}`,
              cursor: mailtoHref ? 'pointer' : 'not-allowed',
              background: 'none',
              color: mailtoHref ? P.textPrimary : P.textTertiary,
              fontSize: type.size['xs'], fontWeight: type.weight.semibold,
              letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            Open email →
          </a>
        </div>
      </div>

      {/* Option 3: Upload file directly — only when Supabase Storage is configured */}
      {isStorageConfigured() && (
        <div style={{
          padding: space[3], marginBottom: space[3],
          background: P.card, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm,
        }}>
          <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
            Upload file
          </div>
          <div style={{ fontSize: type.size['sm'], color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
            PDF, image, or Word document — stored securely and attached to this vendor.
          </div>
          {uploadErr && (
            <div style={{ fontSize: type.size['sm'], color: P.red, marginBottom: 8 }}>{uploadErr}</div>
          )}
          <div style={{ display: 'flex', gap: space[2], alignItems: 'center' }}>
            <label style={{
              padding: '6px 12px', borderRadius: radius.sm,
              border: `1px solid ${P.borderDef}`, cursor: uploading ? 'wait' : 'pointer',
              background: 'none', color: P.textPrimary,
              fontSize: type.size['xs'], fontWeight: type.weight.semibold,
              letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
              display: 'inline-block',
            }}>
              {uploading ? 'Uploading…' : 'Choose file'}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                style={{ display: 'none' }}
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const validation = validateFile(file);
                  if (!validation.ok) { setUploadErr(validation.error); return; }
                  setUploadErr(null);
                  setUploading(true);
                  try {
                    const result = await uploadFile({
                      file,
                      eventId: eventId || 'unknown',
                      category: inferCategory(file),
                      userId: userId || 'anon',
                    });
                    if (result.ok) {
                      onUploadFile && onUploadFile({
                        storagePath: result.path,
                        fileName: file.name,
                        fileSize: file.size,
                        signedUrl: result.url,
                      });
                    } else {
                      const errMsg = result.error || 'Upload failed';
                      // Surface bucket-not-found as an actionable message
                      const isBucketMissing = errMsg.toLowerCase().includes('bucket') || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('does not exist');
                      setUploadErr(isBucketMissing
                        ? 'Storage bucket not set up — run the event-files bucket SQL migration in Supabase Dashboard → SQL Editor'
                        : errMsg + ' — check browser console for details');
                    }
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <span style={{ fontSize: type.size['xs'], color: P.textTertiary }}>Max 10 MB</span>
          </div>
        </div>
      )}

      {/* Option 4: Mark received offline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space[2] }}>
        <span style={{ fontSize: type.size['sm'], color: P.textTertiary, fontStyle: 'italic' }}>
          Already received offline?
        </span>
        <button
          onClick={onMarkReceived}
          style={{
            padding: '6px 12px', borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`, cursor: 'pointer',
            background: 'none', color: P.textSecondary,
            fontSize: type.size['xs'], fontWeight: type.weight.medium,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
          }}
        >
          Mark received
        </button>
      </div>
    </div>
  );
}

// ── Arrival flow — inline time picker, no modal hop ──────────────────────────
function ArrivalTimeFlow({ vendor, accent, onCancel, onSave }) {
  const [time, setTime] = useState(vendor.arrivalTime || '');
  const valid = /^\d{2}:\d{2}$/.test(time);

  return (
    <div style={{
      marginTop: space[4],
      padding: space[4],
      background: P.canvas,
      border: `1px solid ${P.borderSubtle}`,
      borderRadius: radius.sm,
      fontFamily: FF,
    }}>
      <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 8 }}>
        Arrival / setup time
      </div>
      <div style={{ display: 'flex', gap: space[3], alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{
            padding: '7px 10px', minWidth: 140,
            background: P.card, border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.sm, color: P.textPrimary,
            fontSize: type.size['base'], fontFamily: FF, outline: 'none',
          }}
        />
        <button
          onClick={() => valid && onSave(time)}
          disabled={!valid}
          style={{
            padding: '7px 14px', borderRadius: radius.sm,
            border: 'none', cursor: valid ? 'pointer' : 'not-allowed',
            background: valid ? accent : P.borderSubtle,
            color: valid ? '#070809' : P.textTertiary,
            fontSize: type.size['sm'], fontWeight: type.weight.semibold,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          aria-label="Cancel arrival-time edit"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, padding: '4px 8px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// 1 — Command Header
function CommandHeader({ vendor, event, readiness, stage, nextAction, onEdit, onPatchVendor, onAddLog, userId, expandedKind, setExpandedKind, isMobile = false, alsoItems = [], onAddressItem }) {
  const accent = levelColor(readiness.level);
  // Sprint 56 tone calm-down: "Vendor Cockpit" → "Vendor details". Internal
  // code references still call this the cockpit (the structural pattern); the
  // visible label uses the friendlier name so first-time planners aren't
  // greeted with aviation jargon.
  // Board re-audit (2026-06-10): drop the "· Critical / · Follow up" suffix —
  // it stated the level a THIRD time (the colored LevelChip beside the name and
  // the list-row chip already carry it). The breadcrumb accent color still
  // signals urgency without repeating the word.
  const labelText = 'Vendor details';

  return (
    <div style={{
      padding: `${space[5]}px ${space[6]}px ${space[5]}px`,
      borderBottom: `1px solid ${P.borderSubtle}`,
      flexShrink: 0,
      display: 'flex', gap: space[5],
      background: P.canvas,
    }}>
      {/* Single accent strip — sets command-desk tone, no glow */}
      <div style={{
        width: 3, flexShrink: 0,
        background: accent, borderRadius: 2, alignSelf: 'stretch',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label */}
        <div style={{
          fontSize: type.size['xs'], fontWeight: type.weight.semibold,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: accent, marginBottom: 6, fontFamily: FF,
        }}>
          {labelText}
        </div>

        {/* Title row. Redesign (2026-06-10): wrap-based, not breakpoint-based.
            The name claims a 240px min and the reach/edit actions drop to their
            own line whenever the pane can't fit both — so the vendor name never
            gets squeezed into a 3-line wrap (was breaking at mobile AND at the
            narrow two-pane detail on tablet-portrait). */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: isMobile ? 10 : 12 }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? type.size['2xl'] : type.size['3xl'], fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, lineHeight: 1.2,
            }}>
              {vendor.name || vendor.vendor_name}
            </div>
            <div style={{
              fontSize: type.size['caption'], color: P.textSecondary, fontFamily: FF, marginTop: 4,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span>{vendor.category || vendor.type || 'Uncategorized'}</span>
              <span style={{ color: P.borderDef }}>·</span>
              <LevelChip level={readiness.level} label={readiness.label} />
              <span style={{ color: P.borderDef }}>·</span>
              <span style={{ color: P.textTertiary, fontStyle: 'italic' }}>{isHostView(event) ? hostStageWord(stage, vendor) : stage}</span>
            </div>
            {/* Attention-item KPIs LEAD the detail (board 2026-06-12): a glanceable,
                clickable strip — what needs you, how locked-in, what's owed — so the
                planner reads the vendor's state in one look and can act from the top. */}
            {(() => {
              const planning = getVendorPlanningState(vendor, event);
              const gates = LOCKIN_GATES.map(g => (planning || []).find(x => x.key === g.key)).filter(g => g && g.status !== 'not_tracked');
              const lockedIn = gates.filter(g => g.status === 'done').length;
              const lockTotal = gates.length;
              const openCount = (readiness.counts?.critical || 0) + (readiness.counts?.attention || 0);
              const balanceDue = !vendor.balancePaid && (vendor.cost || 0) > 0
                ? (vendor.depositPaid ? Math.max(0, (vendor.cost || 0) - (vendor.depositAmt || 0)) : (vendor.cost || 0)) : 0;
              const chip = (key, label, color, onClick) => (
                <button key={key} type="button" onClick={onClick || undefined} disabled={!onClick}
                  title={onClick ? `Resolve: ${label}` : label}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: type.size['sm'], fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}40`, borderRadius: 999, padding: '3px 10px', fontFamily: FF, cursor: onClick ? 'pointer' : 'default' }}>
                  {label}{onClick ? ' →' : ''}
                </button>
              );
              const chips = [];
              const hostHdr = isHostView(event);
              if (openCount > 0) chips.push(chip('open', `${openCount} need you`, (readiness.counts?.critical ? P.red : P.amber), () => onAddressItem && alsoItems[0] && onAddressItem(alsoItems[0])));
              if (lockTotal > 0) chips.push(chip('lock', `${lockedIn}/${lockTotal} ${hostHdr ? 'sorted' : 'locked in'}`, lockedIn === lockTotal ? P.green : P.steelBlue, null));
              if (balanceDue > 0) chips.push(chip('bal', `$${balanceDue.toLocaleString()} due`, P.amber, () => onAddressItem && onAddressItem({ key: 'financial' })));
              if (!chips.length) return null;
              return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{chips}</div>;
            })()}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <ReachActions vendor={vendor} />
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Edit vendor details"
                style={{
                  background: 'none', border: `1px solid ${P.borderSubtle}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: type.size['base'], fontWeight: type.weight.medium,
                  color: P.textSecondary, fontFamily: FF,
                  padding: '6px 14px', minHeight: 32,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                Edit details →
              </button>
            )}
          </div>
        </div>

        {/* Next action card — embedded, not floating. Sprint 56c: CTA wires
            the suggested follow-up to a one-click execution. */}
        {nextAction && (
          <NextActionCard
            vendor={vendor}
            accent={accent}
            nextAction={nextAction}
            onPatchVendor={onPatchVendor}
            onAddLog={onAddLog}
            onEdit={onEdit}
            eventId={event?.id}
            userId={userId}
            expandedKind={expandedKind}
            setExpandedKind={setExpandedKind}
            alsoItems={alsoItems}
            onAddressItem={onAddressItem}
          />
        )}
      </div>
    </div>
  );
}

// 2 — Readiness Snapshot (9 challenge categories)
const CATEGORY_LABELS = {
  booking: 'Booking',
  communication: 'Communication',
  logistics: 'Logistics',
  scope: 'Scope',
  timeline: 'Timeline',
  financial: 'Payment',
  documents: 'Documents',
  dayOf: 'Day of',
  closeout: 'Wrap-up',
};


// 3/4/5 — Phase sections (Planning / Day-Of / Closeout)
// Vendor Readiness Pass: each phase is now collapsible. Planning is open
// by default (most relevant before event day); Day-Of + Wrap Up collapse
// to keep the cockpit scrollable on long vendor records. Items needing
// attention show in the collapsed-state count so the planner still sees
// signal.
function PhaseSection({ label, hint, rows, defaultOpen = true, onAddressRow }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const attentionCount = rows.filter(r => r.status === 'missing' || r.status === 'attention' || r.status === 'pending').length;
  const collapsedHint = !isOpen && attentionCount > 0
    ? `${attentionCount} need${attentionCount === 1 ? 's' : ''} attention`
    : hint;
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, marginTop: space[5], marginBottom: space[3],
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'left', fontFamily: FF,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: P.steelBlue, fontSize: type.size['sm'], width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: type.size['xs'], fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{label}</span>
        </span>
        {collapsedHint && (
          <span style={{
            fontSize: type.size['xs'],
            color: !isOpen && attentionCount > 0 ? P.amber : P.textTertiary,
            fontFamily: FF, fontStyle: 'italic',
          }}>
            {collapsedHint}
          </span>
        )}
      </button>
      {isOpen && (
        <div style={{
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.md, padding: `0 ${space[5]}px`,
        }}>
          {rows.map((r, i) => {
            // Vendor Readiness v2: every actionable row routes via
            // onAddressRow. The parent decides where each row.key goes
            // (most route to onEditVendor). 'not_tracked' rows stay
            // inert because the data model has no field to edit yet.
            const canAddress = r.status !== 'not_tracked' && Boolean(onAddressRow);
            return (
              <StatusRow
                key={r.key}
                label={r.label}
                value={r.value}
                status={r.status}
                consequence={r.consequence}
                onAddress={canAddress ? () => onAddressRow(r) : undefined}
                addressLabel={canAddress ? `Address: ${r.label}` : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// 6 — Required Questions
// Vendor Readiness Pass: collapsible. Open by default when any question is
// unanswered (signal-first); collapses to a one-line "All answered" summary
// once the vendor's checklist is complete.
function RequiredQuestionsSection({ vendor, questions, onAddressRow }) {
  const cat = vendor.category || 'this vendor';
  const open = questions.filter(q => q.status !== 'answered').length;
  // Redesign (2026-06-10, "too busy"): collapsed by default. A wall of
  // "Not tracked yet" rows read as a cliff of failure, not a task — the
  // collapsed "N unanswered" summary carries the signal; the planner opens
  // the checklist when they're ready to work it.
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, marginTop: space[5], marginBottom: space[3],
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'left', fontFamily: FF,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: P.steelBlue, fontSize: type.size['sm'], width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: type.size['xs'], fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{`Required Questions · ${cat}`}</span>
        </span>
        <span style={{
          fontSize: type.size['xs'],
          color: open > 0 ? P.amber : P.textTertiary,
          fontFamily: FF, fontStyle: 'italic',
        }}>
          {open > 0 ? `${open} unanswered` : 'All answered'}
        </span>
      </button>
      {isOpen && (
        <div style={{
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.md, padding: `0 ${space[5]}px`,
        }}>
          {questions.map(q => {
            const status = q.status === 'answered' ? 'done' : (q.status === 'missing' ? 'missing' : 'not_tracked');
            // Every required question that has a real backing field routes
            // to the vendor edit modal where the planner can answer it.
            const canAddress = status !== 'not_tracked' && Boolean(onAddressRow);
            return (
              <StatusRow
                key={q.key}
                label={q.question}
                value={q.value || (q.status === 'answered' ? 'Confirmed' : 'Not tracked yet')}
                status={status}
                consequence={q.consequence}
                onAddress={canAddress ? () => onAddressRow({ key: q.key, kind: 'question' }) : undefined}
                addressLabel={canAddress ? `Answer: ${q.question}` : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// 7 — Linked Event Work
// Vendor Readiness Pass: every linked item is now a button that routes to
// its canonical L4 tab (timeline → Run of Show, decisions → Decisions with
// decisionId, tasks → Planning with taskId, communication → Communication
// with commId, budget → Budget, documents → Documents). Each of the 6
// sub-cards is collapsible so a vendor with lots of linked work doesn't
// dominate the scroll. Defaults: any group with items is open; empty
// groups stay collapsed.
function LinkedWorkSection({ linked, onRouteToLinked }) {
  const groups = [
    { key: 'timeline', label: 'Event Day Schedule', empty: 'No linked timeline items yet.', tab: 'Run of Show' },
    { key: 'decisions', label: 'Decisions / Approvals', empty: 'No linked decisions yet.', tab: 'Decisions' },
    { key: 'tasks', label: 'Planning Tasks', empty: 'No linked planning tasks yet.', tab: 'Planning Tasks' },
    { key: 'communication', label: 'Communication', empty: 'No linked messages yet.', tab: 'Communication' },
    { key: 'budget', label: 'Budget Items', empty: 'No linked budget items yet.', tab: 'Budget' },
    { key: 'documents', label: 'Linked files', empty: 'No linked files yet.', tab: 'Documents' },
  ];
  // Default collapse state — groups with items are open; empty groups are
  // collapsed so the cockpit shows the actionable signal first.
  const [openKeys, setOpenKeys] = useState(() => {
    const initial = new Set();
    groups.forEach(g => { if ((linked[g.key] || []).length > 0) initial.add(g.key); });
    return initial;
  });
  const toggle = (k) => setOpenKeys(prev => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  return (
    <div>
      <SectionHeading label="Linked Event Work" hint="What depends on this vendor" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
        {groups.map(g => {
          const items = linked[g.key] || [];
          const isOpen = openKeys.has(g.key);
          return (
            <div key={g.key} style={{
              background: P.card, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.md, padding: `${space[3]}px ${space[5]}px`,
              fontFamily: FF,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOpen ? 6 : 0 }}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-expanded={isOpen}
                style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  textAlign: 'left', fontFamily: FF,
                }}
              >
                <span style={{ color: P.textTertiary, fontSize: type.size['sm'], width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{
                  fontSize: type.size['xs'], fontWeight: type.weight.semibold,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  color: P.textTertiary,
                }}>
                  {g.label} {items.length > 0 && <span style={{ color: P.textSecondary }}>· {items.length}</span>}
                </span>
              </button>
              {onRouteToLinked && g.tab && items.length > 0 && (
                <button type="button" onClick={() => onRouteToLinked(g.tab, null)} title={`Open ${g.tab}`}
                  style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FF, fontSize: type.size['xs'], fontWeight: type.weight.semibold, color: P.textSecondary, letterSpacing: '0.04em' }}>
                  View all →
                </button>
              )}
              </div>
              {isOpen && (items.length === 0 ? (
                <div style={{ fontSize: type.size['caption'], color: P.textTertiary, fontStyle: 'italic', paddingLeft: 18 }}>
                  {g.empty}
                </div>
              ) : (
                <ul style={{ margin: 0, padding: '0 0 0 18px', listStyle: 'none' }}>
                  {items.map((it, i) => {
                    const canRoute = Boolean(onRouteToLinked);
                    const handleRoute = () => {
                      if (!canRoute) return;
                      onRouteToLinked(g.tab, it.id || null);
                    };
                    if (!canRoute) {
                      return (
                        <li key={it.id || i} style={{
                          display: 'flex', justifyContent: 'space-between', gap: 12,
                          padding: '3px 0', fontSize: type.size['caption'], color: P.textPrimary,
                        }}>
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                          {it.note && <span style={{ color: P.textTertiary, flexShrink: 0 }}>{it.note}</span>}
                        </li>
                      );
                    }
                    return (
                      <li key={it.id || i} style={{ padding: 0 }}>
                        <button
                          type="button"
                          onClick={handleRoute}
                          title={`Open in ${g.tab}`}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 12, padding: '4px 6px', margin: '1px -6px',
                            background: 'none', border: '1px solid transparent', borderRadius: radius.sm,
                            cursor: 'pointer', fontFamily: FF, textAlign: 'left',
                            fontSize: type.size['caption'], color: P.textPrimary, transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = P.borderSubtle + '55'; e.currentTarget.style.borderColor = P.borderSubtle; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                          {it.note && <span style={{ color: P.textTertiary, flexShrink: 0, fontSize: type.size['sm'] }}>{it.note}</span>}
                          <span style={{ color: P.textTertiary, fontSize: type.size['sm'], flexShrink: 0 }}>→</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Document AI extraction via backend proxy
async function extractDocumentAI({ contractUrl, vendorName, eventName, documentType = 'contract' }) {
  const BASE = process.env.REACT_APP_API_BASE_URL;
  if (!BASE || !contractUrl) return null;
  try {
    const res = await fetch(`${BASE}/api/ai/extract-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_url: contractUrl,
        document_type: documentType,
        vendor_name: vendorName,
        event_name: eventName,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// 8 — Documents
function DocumentsSection({ vendor, event, isOpen, onToggle }) {
  const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
  const hasContractFile = Boolean(vendor.contractUrl || vendor.contractStoragePath);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [extractErr, setExtractErr] = useState(null);

  const contractValue = hasContractFile
    ? vendor.contractFileName || 'Contract attached'
    : contractSigned
    ? 'Signed — no file attached'
    : 'Not attached';

  const contractStatus = hasContractFile && contractSigned
    ? 'done'
    : hasContractFile
    ? 'attention'   // file exists but not marked signed
    : contractSigned
    ? 'attention'   // signed but no file
    : 'missing';

  const contractConsequence = !hasContractFile && !contractSigned
    ? 'Booking record is incomplete without a contract on file.'
    : hasContractFile && !contractSigned
    ? 'File attached — mark signed once you confirm both parties have signed.'
    : undefined;

  // Sprint 60.C: collapsible. Summary mirrors the contract status so the
  // collapsed header still signals "Signed" / "Pending" / "Missing".
  const summary = contractStatus === 'done' ? 'Signed'
    : contractStatus === 'attention' ? 'Needs attention'
    : 'Missing';
  const summaryColor = contractStatus === 'done' ? P.green
    : contractStatus === 'attention' ? P.amber
    : P.red;

  return (
    <CollapsibleSection label="Files & contract" summary={summary} hintColor={summaryColor} isOpen={isOpen} onToggle={onToggle}>
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: `0 ${space[5]}px`,
      }}>
        {/* Contract row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: space[4], padding: `${space[4]}px 0`,
          borderBottom: `1px solid ${P.borderSubtle}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: type.size['caption'], fontWeight: type.weight.semibold, color: P.textPrimary, marginBottom: 2 }}>Contract</div>
            <div style={{ fontSize: type.size['sm'], color: contractConsequence ? P.textSecondary : P.textTertiary, lineHeight: 1.4 }}>
              {contractConsequence || contractValue}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[3], flexShrink: 0 }}>
            {hasContractFile && (
              <div style={{ display: 'flex', gap: space[2] }}>
                <a
                  href={vendor.contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: type.size['sm'], fontWeight: type.weight.semibold, color: P.accent, textDecoration: 'none', padding: `3px ${space[3]}px`, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm }}
                >
                  Open →
                </a>
                {process.env.REACT_APP_API_BASE_URL && (
                  <button
                    onClick={async () => {
                      setExtracting(true); setExtractErr(null);
                      const result = await extractDocumentAI({
                        contractUrl: vendor.contractUrl,
                        vendorName: vendor.name,
                        eventName: event?.name,
                      });
                      setExtracting(false);
                      if (result?.ok) setExtracted(result.extracted);
                      else setExtractErr('AI extraction failed — try again');
                    }}
                    disabled={extracting}
                    style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, color: P.textSecondary, background: 'transparent', border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm, padding: `3px ${space[3]}px`, cursor: 'pointer', fontFamily: FF }}
                  >
                    {extracting ? '⏳ Analyzing…' : '✨ Analyze with AI'}
                  </button>
                )}
              </div>
            )}
            <span style={{
              fontSize: type.size['xs'], fontWeight: type.weight.semibold,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: contractStatus === 'done' ? P.success
                   : contractStatus === 'attention' ? P.warn
                   : P.danger,
            }}>
              {contractStatus === 'done' ? 'Signed' : contractStatus === 'attention' ? 'Needs action' : 'Missing'}
            </span>
          </div>
        </div>

        {/* AI extraction results */}
        {extractErr && (
          <div style={{ fontSize: type.size['sm'], color: P.red, padding: `${space[2]}px 0` }}>{extractErr}</div>
        )}
        {extracted && (
          <div style={{ background: P.canvas, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm, padding: space[4], marginBottom: space[3] }}>
            <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: space[3], display: 'flex', justifyContent: 'space-between' }}>
              <span>✨ AI-EXTRACTED · Verify against original document</span>
              <button onClick={() => setExtracted(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textTertiary, fontFamily: FF, fontSize: type.size['sm'] }}>×</button>
            </div>
            {extracted.action_items?.length > 0 && (
              <div style={{ marginBottom: space[3] }}>
                <div style={{ fontSize: type.size['xs'], color: P.textTertiary, fontWeight: type.weight.semibold, marginBottom: space[2] }}>ACTION ITEMS</div>
                {extracted.action_items.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: space[2], fontSize: type.size['sm'], color: a.priority === 'high' ? P.red : P.textSecondary, marginBottom: 3 }}>
                    <span>{a.priority === 'high' ? '🔴' : a.priority === 'medium' ? '🟡' : '⚪'}</span>
                    <span>{a.task}{a.due_date ? ` — ${a.due_date}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {extracted.key_dates?.length > 0 && (
              <div style={{ marginBottom: space[3] }}>
                <div style={{ fontSize: type.size['xs'], color: P.textTertiary, fontWeight: type.weight.semibold, marginBottom: space[2] }}>KEY DATES</div>
                {extracted.key_dates.map((d, i) => (
                  <div key={i} style={{ fontSize: type.size['sm'], color: P.textSecondary, marginBottom: 2 }}>{d.label}: {d.date}</div>
                ))}
              </div>
            )}
            {extracted.cancellation_policy && (
              <div style={{ fontSize: type.size['xs'], color: P.textTertiary, lineHeight: 1.4 }}>{extracted.cancellation_policy}</div>
            )}
            {extracted.disclaimer && (
              <div style={{ fontSize: type.size['xs'], color: P.textTertiary, fontStyle: 'italic', marginTop: space[3] }}>{extracted.disclaimer}</div>
            )}
          </div>
        )}

        {/* COI row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: space[4], padding: `${space[4]}px 0`,
          borderBottom: `1px solid ${P.borderSubtle}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: type.size['caption'], fontWeight: type.weight.semibold, color: P.textPrimary, marginBottom: 2 }}>COI / Insurance</div>
            <div style={{ fontSize: type.size['sm'], color: P.textTertiary }}>{vendor.insuranceStatus || 'Not on file'}</div>
          </div>
          {(() => {
            // Honesty (board): "On file" green only when actually insured — a status
            // of "Not insured" / "Expired" must NOT read as present-and-good.
            const insOk = vendor.insuranceStatus && !/\b(not|no|none|missing|expired|lapsed)\b/i.test(vendor.insuranceStatus);
            return (
              <span style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', color: insOk ? P.success : vendor.insuranceStatus ? P.danger : P.textTertiary }}>
                {insOk ? 'On file' : vendor.insuranceStatus ? 'Not valid' : 'Not tracked'}
              </span>
            );
          })()}
        </div>

        {/* Invoice + other docs */}
        {[{ label: 'Invoice', key: 'invoiceUrl' }, { label: 'Menu / rider / floorplan', key: 'menuUrl' }].map(({ label, key }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: space[4], padding: `${space[4]}px 0`,
            borderBottom: label !== 'Menu / rider / floorplan' ? `1px solid ${P.borderSubtle}` : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: type.size['caption'], fontWeight: type.weight.semibold, color: P.textPrimary }}>{label}</div>
            </div>
            <span style={{ fontSize: type.size['xs'], color: P.textTertiary, fontStyle: 'italic' }}>Not attached</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// 9 — Notes
function NotesSection({ vendor, isOpen, onToggle }) {
  // Sprint 60.C: collapsible. Closed by default; summary surfaces note
  // presence so the planner sees signal without expanding.
  const hasNotes = Boolean(vendor.notes && vendor.notes.trim());
  const summary = hasNotes ? 'Notes on file' : 'No notes';
  return (
    <CollapsibleSection label="Notes" summary={summary} hintColor={hasNotes ? P.green : P.textTertiary} isOpen={isOpen} onToggle={onToggle}>
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: space[5], minHeight: 80,
        fontSize: type.size['base'], color: vendor.notes ? P.textPrimary : P.textTertiary,
        fontFamily: FF, lineHeight: type.leading.relaxed,
        whiteSpace: 'pre-wrap',
      }}>
        {vendor.notes || 'No notes for this vendor.'}
      </div>
    </CollapsibleSection>
  );
}

// 10 — Activity log (preserves Sprint 50 functionality)
function ActivityLogSection({ vendor, onAddLog, isOpen, onToggle }) {
  const [draft, setDraft] = useState('');
  const log = Array.isArray(vendor.log) ? vendor.log : [];
  const entries = [...log].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const derived = [];
  if (vendor.depositPaidAt) derived.push({ date: vendor.depositPaidAt.slice(0, 10), text: 'Deposit marked paid.', derived: true });
  else if (vendor.depositPaid) derived.push({ date: '—', text: 'Deposit marked paid.', derived: true });
  if (vendor.balancePaidAt) derived.push({ date: vendor.balancePaidAt.slice(0, 10), text: 'Balance marked paid.', derived: true });
  else if (vendor.balancePaid) derived.push({ date: '—', text: 'Balance marked paid.', derived: true });

  const feed = [...entries, ...derived].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const today = new Date().toISOString().slice(0, 10);

  const submit = () => {
    const t = draft.trim();
    if (!t || !onAddLog) return;
    onAddLog(vendor.id, t);
    setDraft('');
  };

  // Sprint 60.C: collapsible. Summary surfaces latest entry's date so the
  // collapsed header still hints at recency.
  const latest = feed[0];
  const summary = feed.length === 0 ? 'No activity yet'
    : `${feed.length} entr${feed.length === 1 ? 'y' : 'ies'}${latest && latest.date && latest.date !== '—' ? ` · last ${latest.date}` : ''}`;
  return (
    <CollapsibleSection label="Recent activity" summary={summary} hintColor={feed.length > 0 ? P.textSecondary : P.textTertiary} isOpen={isOpen} onToggle={onToggle}>
      {onAddLog && (
        <div style={{
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.md, padding: space[4], marginBottom: space[3],
          fontFamily: FF,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] }}>
            <div style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.textTertiary }}>
              Log Activity · {today}
            </div>
            {/* Fix #5: Quick-log shortcuts — one click to log common interactions */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: '📞 Call', text: `Called ${vendor.name || 'vendor'} —` },
                { label: '💬 WhatsApp', text: `WhatsApp with ${vendor.name || 'vendor'} —` },
                { label: '✉ Email', text: `Emailed ${vendor.name || 'vendor'} —` },
              ].map(({ label, text }) => (
                <button key={label} onClick={() => setDraft(d => d ? d : text)} style={{
                  padding: '3px 7px', borderRadius: radius.sm, border: `1px solid ${P.borderSubtle}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: type.size['xs'], color: P.textTertiary, fontFamily: FF,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What happened? (e.g. confirmed walk-through, sent revised contract, follow-up call left voicemail)"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            style={{
              width: '100%', minHeight: 56, resize: 'vertical',
              background: P.canvas, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.sm, padding: '8px 10px',
              fontSize: type.size['base'], color: P.textPrimary, fontFamily: FF,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] }}>
            <span style={{ fontSize: type.size['xs'], color: P.textTertiary }}>
              ⌘/Ctrl+Enter to add
            </span>
            <button
              onClick={submit}
              disabled={!draft.trim()}
              style={{
                padding: '5px 14px', borderRadius: radius.sm,
                border: 'none', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                background: draft.trim() ? P.green : P.borderSubtle,
                color: draft.trim() ? '#fff' : P.textTertiary,
                fontSize: type.size['sm'], fontWeight: type.weight.semibold,
                fontFamily: FF, letterSpacing: '0.04em',
              }}
            >
              Add Entry
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        {feed.length === 0 ? (
          <div style={{
            background: P.card, border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.md, padding: `${space[5]}px ${space[5]}px`,
            fontSize: type.size['caption'], color: P.textTertiary, fontFamily: FF, textAlign: 'center',
          }}>
            No activity logged yet for this vendor.
          </div>
        ) : feed.map((entry, i) => (
          <div key={entry.id || i} style={{
            background: P.card, border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.md, padding: space[4],
            borderLeft: entry.derived ? `2px solid ${P.amber}` : `2px solid ${P.borderDef}`,
            fontFamily: FF,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{
                fontSize: type.size['xs'], fontWeight: type.weight.semibold,
                color: P.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {entry.date || '—'}
              </span>
              {entry.derived && (
                <span style={{
                  fontSize: type.size['xs'], fontWeight: type.weight.medium,
                  color: P.amber, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Auto
                </span>
              )}
            </div>
            <div style={{ fontSize: type.size['base'], color: P.textPrimary, lineHeight: type.leading.relaxed }}>
              {entry.text}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ── Caterer drift banner (Sprint 51 — preserved at top of cockpit body) ─────
function CatererDriftBanner({ vendor, event, onMarkCatererUpdated }) {
  const isCatering = vendor.category === 'Catering';
  const confirmedCount = event ? (event.guests || []).filter(g => g.rsvp === 'Yes').length : 0;
  const show = isCatering
    && event
    && event.catererCount !== undefined
    && event.catererCount !== null
    && event.catererCount !== confirmedCount
    && typeof onMarkCatererUpdated === 'function';
  if (!show) return null;
  const driftDelta = confirmedCount - event.catererCount;
  return (
    <div style={{
      marginBottom: space[5],
      background: P.card, border: `1px solid ${P.amber}66`,
      borderLeft: `3px solid ${P.amber}`,
      borderRadius: radius.md, padding: `${space[4]}px ${space[5]}px`,
      display: 'flex', alignItems: 'center', gap: space[5], flexWrap: 'wrap',
      fontFamily: FF,
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{
          fontSize: type.size['xs'], fontWeight: type.weight.semibold,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: P.amber, marginBottom: 4,
        }}>
          Headcount Mismatch
        </div>
        <div style={{ fontSize: type.size['base'], color: P.textPrimary, lineHeight: 1.4 }}>
          Caterer holds <strong>{event.catererCount}</strong>; now <strong>{confirmedCount}</strong> confirmed
          {' '}
          <span style={{ color: P.textSecondary }}>
            ({driftDelta > 0 ? `+${driftDelta}` : driftDelta})
          </span>
        </div>
      </div>
      <button
        onClick={() => onMarkCatererUpdated(vendor.id, confirmedCount)}
        style={{ ...BTN_PRIMARY, flexShrink: 0 }}
      >
        Update to {confirmedCount}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Sprint 54 · AI Readiness Copilot ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Embedded inside the cockpit (between the Command Header and Readiness
// Snapshot — the highest-leverage placement). Two modes:
//
//   - Rule-based preview: always available, deterministic. Labeled honestly
//     when no AI key is configured.
//   - AI-enhanced: requires planner's Anthropic API key (from Profile). Uses
//     the rule-based preview as ground truth + a strict JSON prompt.
//
// Both modes render the same shape: headline, summary, missing, risks,
// questions, next action, draft message, evidence, limitations.
//
// Review-first per skill 06: nothing is auto-sent. "Copy draft" is the only
// outgoing action; everything else just informs the planner.

function CollapsibleList({ label, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: space[3], fontFamily: FF }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, color: P.textTertiary, fontFamily: FF,
          fontSize: type.size['xs'], fontWeight: type.weight.semibold,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: type.size['xs'] }}>{open ? '▼' : '▶'}</span>
        {label} · {items.length}
      </button>
      {open && (
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 18px', listStyle: 'none' }}>
          {items.map((it, i) => (
            <li key={i} style={{
              fontSize: type.size['sm'], color: P.textSecondary,
              lineHeight: 1.5, marginBottom: 2,
              position: 'relative',
            }}>
              <span style={{ position: 'absolute', left: -12, color: P.textTertiary }}>·</span>
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyableDraft({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: P.canvas, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.sm, padding: space[4],
        fontSize: type.size['caption'], color: P.textPrimary, fontFamily: FF,
        lineHeight: 1.55, whiteSpace: 'pre-wrap',
        maxHeight: 260, overflowY: 'auto',
      }}>
        {text}
      </div>
      <button
        onClick={onCopy}
        style={{
          marginTop: space[2],
          background: copied ? P.green : 'none',
          border: `1px solid ${copied ? P.green : P.borderSubtle}`,
          borderRadius: radius.sm, cursor: 'pointer',
          fontSize: type.size['sm'], fontWeight: type.weight.semibold,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          color: copied ? P.canvas : P.textSecondary,
          fontFamily: FF, padding: '9px 14px', minHeight: 40,
        }}
      >
        {copied ? 'Copied' : 'Copy draft'}
      </button>
    </div>
  );
}

function ReadinessCopilotSection({ vendor, event, aiAvailable, onAskAi, isOpen, onToggle }) {
  const host = isHostView(event);
  const context = useMemo(() => buildVendorCopilotContext(vendor, event), [vendor, event]);
  const rulePreview = useMemo(() => getRuleBasedPreview(context), [context]);

  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Reset state when vendor changes — the preview is per-vendor
  useEffect(() => {
    setAiPreview(null);
    setAiError(null);
    setDismissed(false);
  }, [vendor?.id]);

  if (!context || !rulePreview) return null;

  if (dismissed) {
    return (
      <div style={{
        marginTop: space[5],
        background: 'transparent',
        border: `1px dashed ${P.borderSubtle}`,
        borderRadius: radius.md,
        padding: `${space[3]}px ${space[5]}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: space[3], fontFamily: FF,
      }}>
        <span style={{ fontSize: type.size['sm'], color: P.textTertiary, fontStyle: 'italic' }}>
          {host ? 'Quick read dismissed for now.' : 'Readiness copilot dismissed for this session.'}
        </span>
        <button
          onClick={() => setDismissed(false)}
          style={{
            background: 'none', border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.sm, cursor: 'pointer',
            fontSize: type.size['xs'], fontWeight: type.weight.semibold,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: P.textSecondary, fontFamily: FF, padding: '4px 10px',
          }}
        >
          Restore
        </button>
      </div>
    );
  }

  const preview = aiPreview || rulePreview;
  const sourceLabel = host
    ? (preview.source === 'ai'
        ? 'A quick take, based on what you’ve entered'
        : (aiAvailable
            ? 'A quick take from your details · tap to write a sharper version'
            : 'A quick take, based on what you’ve entered'))
    : (preview.source === 'ai'
        ? 'AI-enhanced readiness brief · grounded in your data'
        : (aiAvailable
            ? 'Rule-based readiness preview · click Generate AI version to enhance'
            : 'Rule-based readiness preview · AI connection not enabled yet'));
  const sourceColor = preview.source === 'ai' ? P.green : P.textTertiary;

  const generate = async () => {
    if (!onAskAi) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = buildCopilotPrompt(context, rulePreview);
      const raw = await onAskAi(prompt);
      const parsed = parseCopilotResponse(raw);
      if (!parsed) {
        setAiError('AI returned an unparseable response. Showing rule-based preview.');
      } else {
        setAiPreview(parsed);
      }
    } catch (e) {
      setAiError(e?.message?.includes('no-key') ? 'No API key on file.' : 'AI request failed. Showing rule-based preview.');
    }
    setAiLoading(false);
  };

  // Sprint 60.C: collapsible. Summary surfaces preview source so a closed
  // copilot still shows whether AI is active.
  const summary = preview.source === 'ai' ? 'AI-enhanced brief ready' : 'Rule-based preview';
  return (
    <CollapsibleSection
      label="Quick read"
      summary={summary}
      hintColor={preview.source === 'ai' ? P.green : P.textTertiary}
      isOpen={isOpen}
      onToggle={onToggle}
    >
    <div style={{
      marginTop: 0, marginBottom: space[5],
      background: P.card,
      border: `1px solid ${P.borderSubtle}`,
      borderLeft: `2px solid ${preview.source === 'ai' ? P.green : '#3a5a78'}`,
      borderRadius: radius.md,
      padding: `${space[5]}px ${space[5]}px ${space[5]}px`,
      fontFamily: FF,
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: space[3], marginBottom: space[4], flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontSize: type.size['xs'], fontWeight: type.weight.semibold,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: sourceColor, marginBottom: 4,
          }}>
            Quick read
          </div>
          <div style={{ fontSize: type.size['xs'], color: P.textTertiary, fontStyle: 'italic' }}>
            {sourceLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {aiAvailable && (
            <button
              onClick={generate}
              disabled={aiLoading}
              aria-label={aiPreview ? 'Regenerate AI readiness brief' : 'Generate AI-enhanced readiness brief'}
              style={{
                background: aiLoading ? P.borderSubtle : 'none',
                border: `1px solid ${P.green}66`,
                borderRadius: radius.sm,
                cursor: aiLoading ? 'wait' : 'pointer',
                fontSize: type.size['xs'], fontWeight: type.weight.semibold,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: aiLoading ? P.textTertiary : P.green,
                fontFamily: FF, padding: '5px 12px',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {aiLoading && (
                <span aria-hidden="true" style={{
                  display: 'inline-block', width: 8, height: 8,
                  border: `2px solid ${P.textTertiary}`, borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {aiLoading ? 'Generating' : (aiPreview ? 'Regenerate' : 'Generate AI version')}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss readiness copilot for this session"
            style={{
              background: 'none', border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.sm, cursor: 'pointer',
              fontSize: type.size['xs'], fontWeight: type.weight.medium,
              color: P.textTertiary, fontFamily: FF, padding: '5px 10px',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Error line (if any) */}
      {aiError && (
        <div style={{
          fontSize: type.size['sm'], color: P.amber, marginBottom: space[3],
          fontStyle: 'italic',
        }}>
          {aiError}
        </div>
      )}

      {/* Headline + summary */}
      <div style={{
        fontSize: type.size['lg'], fontWeight: type.weight.semibold,
        color: P.textPrimary, lineHeight: 1.35, marginBottom: 6,
      }}>
        {preview.headline}
      </div>
      <div style={{
        fontSize: type.size['caption'], color: P.textSecondary, lineHeight: 1.55,
        marginBottom: space[5],
      }}>
        {preview.summary}
      </div>

      {/* Missing + Risks side-by-side (wraps on mobile) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: space[4], marginBottom: space[4],
      }}>
        <div>
          <SubSectionLabel label="Missing" count={preview.missing.length} color={P.amber} />
          {preview.missing.length === 0 ? (
            <EmptyLine text="Nothing critical missing — verify the planning section." />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {preview.missing.map((m, i) => (
                <li key={i} style={{
                  fontSize: type.size['caption'], color: P.textPrimary, lineHeight: 1.5,
                  marginBottom: 4, paddingLeft: 14, position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0, color: P.amber, fontWeight: 700 }}>·</span>
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SubSectionLabel label="Risks" count={preview.risks.length} color={P.red} />
          {preview.risks.length === 0 ? (
            <EmptyLine text="No active risks detected." />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {preview.risks.map((r, i) => (
                <li key={i} style={{
                  fontSize: type.size['caption'], color: P.textPrimary, lineHeight: 1.5,
                  marginBottom: 6, paddingLeft: 14, position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0, color: P.red, fontWeight: 700 }}>·</span>
                  <div>{r.risk}</div>
                  {r.consequence && (
                    <div style={{ color: P.textTertiary, fontSize: type.size['sm'], fontStyle: 'italic', marginTop: 2 }}>
                      {r.consequence}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Questions to ask */}
      {preview.questions.length > 0 && (
        <div style={{ marginBottom: space[4] }}>
          <SubSectionLabel label="Questions to ask" count={preview.questions.length} color={P.textSecondary} />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {preview.questions.map((q, i) => (
              <li key={i} style={{
                fontSize: type.size['caption'], color: P.textPrimary, lineHeight: 1.5,
                marginBottom: 3, paddingLeft: 14, position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: P.textTertiary }}>·</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next action card */}
      {preview.nextAction && (
        <div style={{
          background: P.canvas,
          border: `1px solid ${P.borderSubtle}`,
          borderLeft: `2px solid ${P.amber}`,
          borderRadius: radius.sm,
          padding: `${space[3]}px ${space[4]}px`,
          marginBottom: space[4],
        }}>
          <div style={{
            fontSize: type.size['xs'], fontWeight: type.weight.semibold,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.amber, marginBottom: 4,
          }}>
            Suggested next action
          </div>
          <div style={{
            fontSize: type.size['base'], fontWeight: type.weight.semibold,
            color: P.textPrimary, lineHeight: 1.35,
          }}>
            {preview.nextAction.title}
          </div>
          {preview.nextAction.consequence && (
            <div style={{
              fontSize: type.size['sm'], color: P.textSecondary,
              lineHeight: 1.5, marginTop: 4,
            }}>
              {preview.nextAction.consequence}
            </div>
          )}
        </div>
      )}

      {/* Draft message */}
      {preview.draftMessage && (
        <div>
          <SubSectionLabel
            label={preview.source === 'ai' ? 'AI-drafted message' : 'Templated draft message'}
            color={P.textSecondary}
          />
          <CopyableDraft text={preview.draftMessage} />
          {preview.source === 'rule-based' && !aiAvailable && (
            <div style={{ fontSize: type.size['xs'], color: P.textTertiary, fontStyle: 'italic', marginTop: 6 }}>
              Add your Anthropic API key in Profile to generate a tailored version.
            </div>
          )}
        </div>
      )}

      {/* Evidence + Limitations (collapsible) */}
      <CollapsibleList label="Evidence used" items={preview.evidence} />
      <CollapsibleList label="Limitations" items={preview.limitations} />
    </div>
    </CollapsibleSection>
  );
}

function SubSectionLabel({ label, count, color }) {
  return (
    <div style={{
      fontSize: type.size['xs'], fontWeight: type.weight.semibold,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      color: color || P.textTertiary, marginBottom: 6,
    }}>
      {label}{typeof count === 'number' ? ` · ${count}` : ''}
    </div>
  );
}

function EmptyLine({ text }) {
  return (
    <div style={{ fontSize: type.size['sm'], color: P.textTertiary, fontStyle: 'italic' }}>
      {text}
    </div>
  );
}

// ── Vendor Detail Cockpit (root of detail pane) ─────────────────────────────
// ─── Sprint 60.H: Mobile vendor summary card ─────────────────────────────────
// Goal: on mobile, the first thing the planner sees on a vendor detail must be
// "what's wrong with this vendor and what to do about it" — not a wall of
// readiness sections. This card sits above CommandHeader on mobile only.
// Reads from existing challenges + nextAction data; no new source of truth.
function MobileVendorSummary({ vendor, nextAction, challenges, onPrimary, onEdit, host = false }) {
  const cat = vendor.category || 'Vendor';
  const status = host ? hostStatusWord(vendor.status) : (vendor.status || 'Considering');

  // Top 3 challenges in plain language from the existing intelligence layer.
  const issues = challenges
    ? Object.values(challenges)
        .filter(c => c && (c.level === 'critical' || c.level === 'attention') && c.note)
        .sort((a, b) => (a.level === 'critical' ? 0 : 1) - (b.level === 'critical' ? 0 : 1))
        .slice(0, 3)
    : [];

  // Map next-action sourceCategory → vendor cockpit section key.
  const sectionByCategory = {
    financial: 'payment',
    closeout:  'payment',
    contract:  'contract',
    arrival:   'arrival',
    contact:   'contact',
    logistics: 'arrival',
  };
  const section = sectionByCategory[nextAction?.sourceCategory] || null;
  const ctaLabel = issues.length > 0 ? 'Fix this first' : null;
  const looksReady = issues.length === 0;
  const hasCritical = issues.some(i => i.level === 'critical');
  const railColor = hasCritical ? P.red : P.amber;
  const headIssue = issues[0];

  // Sprint 60.Q Vendor mobile fix-first: hero copy matches the locked
  // system on Home — eyebrow names the state, headline is the plain
  // truth, body explains why, CTA tells the user what to do, contact
  // shortcuts sit beneath as quiet honest affordances.
  const eyebrow = looksReady ? 'LOOKS READY' : hasCritical ? 'FIX FIRST · CRITICAL' : 'FIX FIRST';
  const headline = looksReady
    ? `${vendor.name || 'This vendor'} is on track.`
    : `${vendor.name || 'This vendor'} ${headIssue?.note?.replace(/^[A-Z]/, c => c.toLowerCase()) || 'needs your attention.'}`;
  const body = looksReady
    ? 'No critical blockers. Payments are current, contract is in place, arrival is set.'
    : (issues.length > 1
        ? `${issues.length} issues found — fix the top item first; the others may resolve downstream.`
        : 'Other tasks are stuck until this is handled.');

  const telHref  = vendor.phone   ? `tel:${vendor.phone.replace(/\s/g, '')}` : null;
  const mailHref = vendor.contact ? `mailto:${vendor.contact}` : null;
  const smsHref  = vendor.phone   ? `sms:${vendor.phone.replace(/\s/g, '')}` : null;

  // Steel-blue gradient stack — mirrors StudioCommandPanel hero in App.js
  const ctaFill = STEEL_CTA;
  const ctaShadow = [
    'inset 0 1px 0 rgba(255,255,255,0.14)',
    'inset 0 -1px 0 rgba(0,0,0,0.30)',
    '0 1px 0 rgba(255,255,255,0.04)',
    '0 6px 14px rgba(0,0,0,0.40)',
    '0 18px 36px rgba(0,0,0,0.30)',
    '0 0 0 1px rgba(193,203,208,0.18)',
  ].join(', ');
  const panelRaise = [
    'inset 0 1px 0 rgba(255,255,255,0.05)',
    '0 1px 0 rgba(255,255,255,0.02)',
    '0 4px 10px rgba(0,0,0,0.30)',
    '0 14px 28px rgba(0,0,0,0.22)',
  ].join(', ');

  return (
    <div style={{
      position: 'relative',
      margin: `${space[4]}px ${space[5]}px 0`,
      padding: `${space[4]}px ${space[5]}px ${space[5]}px`,
      paddingLeft: space[5] + 3, // visual lead for the rail
      background: P.card,
      border: `1px solid ${P.borderSubtle}`,
      borderLeft: `3px solid ${looksReady ? P.green : railColor}`,
      borderRadius: 14,
      boxShadow: panelRaise,
      fontFamily: FF,
    }}>
      {/* Top row — eyebrow chip + edit affordance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
        <span style={{
          fontSize: type.size['xs'], fontWeight: type.weight.semibold,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: looksReady ? P.green : railColor,
          padding: '2px 7px', borderRadius: 4,
          border: `1px solid ${(looksReady ? P.green : railColor)}55`,
        }}>
          {eyebrow}
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label="Edit vendor details"
            style={{
              background: 'transparent', border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.sm, color: P.textSecondary, fontSize: type.size['sm'],
              padding: '4px 10px', cursor: 'pointer', fontFamily: FF, flexShrink: 0,
            }}
          >Edit</button>
        )}
      </div>

      {/* Headline */}
      <h2 style={{
        margin: `${space[3]}px 0 ${space[2]}px`,
        fontSize: type.size['3xl'], fontWeight: type.weight.bold,
        letterSpacing: '-0.02em', lineHeight: 1.2,
        color: P.textPrimary,
      }}>
        {headline}
      </h2>

      {/* Category / status meta */}
      <div style={{ fontSize: type.size['caption'], color: P.textTertiary, marginBottom: space[3] }}>
        {cat} · {status}
      </div>

      {/* Body — why it matters */}
      <p style={{
        margin: `0 0 ${space[4]}px`,
        fontSize: type.size['md'], lineHeight: 1.5,
        color: P.textSecondary,
      }}>
        {body}
      </p>

      {/* Primary CTA — steel-blue gradient, full-width */}
      {ctaLabel && onPrimary && (
        <button
          onClick={() => onPrimary(section)}
          style={{
            width: '100%',
            minHeight: 50,
            padding: '13px 18px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: ctaFill,
            color: '#fff',
            fontSize: type.size['lg'],
            fontWeight: type.weight.semibold,
            fontFamily: FF,
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: ctaShadow,
            textShadow: '0 1px 0 rgba(0,0,0,0.25)',
          }}
        >
          {ctaLabel} <span style={{ fontSize: type.size['caption'], opacity: 0.85 }}>→</span>
        </button>
      )}

      {/* Contact shortcuts row — small honest icon affordances. Each is a
          real route (tel:, sms:, mailto:) — disabled state when contact
          field is missing, never a fake send. */}
      {(telHref || smsHref || mailHref) && (
        <div style={{
          display: 'flex', gap: space[2],
          marginTop: space[4],
          paddingTop: space[4],
          borderTop: `1px solid ${P.borderSubtle}`,
        }}>
          {telHref && (
            <a href={telHref} style={{
              flex: 1, textAlign: 'center',
              padding: '10px 12px',
              fontSize: type.size['base'], fontWeight: type.weight.medium,
              color: P.textPrimary,
              background: P.canvas,
              border: `1px solid ${P.borderSubtle}`,
              borderRadius: 10, textDecoration: 'none',
              fontFamily: FF,
            }}>📞 Call</a>
          )}
          {smsHref && (
            <a href={smsHref} style={{
              flex: 1, textAlign: 'center',
              padding: '10px 12px',
              fontSize: type.size['base'], fontWeight: type.weight.medium,
              color: P.textPrimary,
              background: P.canvas,
              border: `1px solid ${P.borderSubtle}`,
              borderRadius: 10, textDecoration: 'none',
              fontFamily: FF,
            }}>💬 Text</a>
          )}
          {mailHref && (
            <a href={mailHref} style={{
              flex: 1, textAlign: 'center',
              padding: '10px 12px',
              fontSize: type.size['base'], fontWeight: type.weight.medium,
              color: P.textPrimary,
              background: P.canvas,
              border: `1px solid ${P.borderSubtle}`,
              borderRadius: 10, textDecoration: 'none',
              fontFamily: FF,
            }}>📧 Email</a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sprint 50B: Deliverables / Promises tracker ────────────────────────────
// Surfaces the EXISTING vendor accountability engine (inferPromisesFromVendor
// + promise lifecycle + follow-up draft generator) in the vendor detail.
// Read-only derivation. "Draft follow-up" is COPY-ONLY — never sends/emails.
const PROMISE_SEV_COLOR = (sev) => sev === 'critical' ? P.red : sev === 'attention' ? P.amber : sev === 'none' ? P.green : P.textTertiary;
const PROMISE_NEXT_BY_STATUS = {
  not_requested:   'Request from vendor',
  requested:       'Awaiting vendor response',
  promised:        'Get it in writing — request proof',
  evidence_needed: 'Request proof (COI, confirmation, etc.)',
  due_soon:        'Confirm before it’s due',
  overdue:         'Follow up now — past due',
  changed:         'Re-confirm the change',
  at_risk:         'Resolve the conflict / follow up',
  confirmed:       null,
  completed:       null,
};

function PromiseTrackerSection({ vendor, event, isOpen, onToggle, onAddressRow, onPatchVendor, onAddLog }) {
  // "Mark proof on file" (board 2026-06-12): an honest manual assertion the
  // planner HAS the evidence — persisted to vendor.promiseEvidence, undoable,
  // never a faked upload. Closes the "evidence missing → needs follow-up" loop.
  const markProof = (p) => {
    if (!onPatchVendor) return;
    onPatchVendor(vendor.id, { promiseEvidence: { ...(vendor.promiseEvidence || {}), [p.promiseKey]: 'attached' } });
    if (onAddLog) onAddLog(vendor.id, `Marked proof on file for "${p.promiseText}" (planner-asserted via cockpit).`);
  };
  const undoProof = (p) => {
    if (!onPatchVendor) return;
    const next = { ...(vendor.promiseEvidence || {}) };
    delete next[p.promiseKey];
    onPatchVendor(vendor.id, { promiseEvidence: next });
    if (onAddLog) onAddLog(vendor.id, `Un-marked proof for "${p.promiseText}" (correction via cockpit).`);
  };
  const [draftFor, setDraftFor] = useState(null);
  const promises = useMemo(
    () => inferPromisesFromVendor(vendor, event).filter(p => p.status !== 'not_required'),
    [vendor, event]
  );
  if (!promises.length) return null;
  const sevRank = { critical: 0, attention: 1, watch: 2, none: 3 };
  const sorted = [...promises].sort(
    (a, b) => (sevRank[PROMISE_STATUS_SEVERITY[a.status]] ?? 2) - (sevRank[PROMISE_STATUS_SEVERITY[b.status]] ?? 2)
  );
  const openCount  = promises.filter(p => !['confirmed', 'completed'].includes(p.status)).length;
  const riskyCount = promises.filter(p => ['overdue', 'at_risk'].includes(p.status)).length;
  const summary = riskyCount > 0 ? `${riskyCount} need attention` : openCount > 0 ? `${openCount} open` : 'All confirmed';
  const summaryColor = riskyCount > 0 ? P.red : openCount > 0 ? P.amber : P.green;
  const ownerLabel = (o) => o ? o.charAt(0).toUpperCase() + o.slice(1) : '—';

  return (
    <CollapsibleSection label="What this vendor will deliver" summary={summary} hintColor={summaryColor} isOpen={isOpen} onToggle={onToggle}>
      <div style={{ fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, marginBottom: space[3], lineHeight: 1.5 }}>
        What this vendor agreed to deliver, and whether you have it in hand. Drafts are copy-only — Event Boss never sends or emails on its own.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
        {sorted.map(p => {
          const sev = PROMISE_STATUS_SEVERITY[p.status] || 'watch';
          const col = PROMISE_SEV_COLOR(sev);
          const nextHint = p.nextAction || PROMISE_NEXT_BY_STATUS[p.status] || null;
          const showDraft = draftFor === p.id;
          let draft = null;
          if (showDraft) { try { draft = generateVendorFollowUpDraft(vendor, event, [p]); } catch (e) { draft = null; } }
          const proofTxt = p.evidenceRequired ? ` · Proof: ${(p.evidenceStatus === 'attached' || p.evidenceStatus === 'confirmed') ? 'on file' : 'needed'}` : '';
          // Each promise bar is clickable to its clearing action (board 2026-06-12).
          // Evidence-backed promises route to the documents/contract flow (where
          // proof is recorded); others open the editor. Done promises stay inert.
          const canAddress = onAddressRow && !['confirmed', 'completed'].includes(p.status);
          const address = () => canAddress && onAddressRow({ key: p.evidenceRequired ? 'documents' : 'promise', label: p.promiseText });
          return (
            <div
              key={p.id}
              onClick={canAddress ? address : undefined}
              role={canAddress ? 'button' : undefined}
              title={canAddress ? `Resolve: ${p.promiseText}` : undefined}
              style={{ background: P.canvas, border: `1px solid ${P.borderSubtle}`, borderLeft: `3px solid ${col}`, borderRadius: radius.sm, padding: space[3], cursor: canAddress ? 'pointer' : 'default', transition: 'background 0.1s' }}
              onMouseEnter={canAddress ? (e => { e.currentTarget.style.background = P.card; }) : undefined}
              onMouseLeave={canAddress ? (e => { e.currentTarget.style.background = P.canvas; }) : undefined}
            >
              {/* PT-4: text takes the flex space and the pill stays anchored top-right
                  (no more detaching to its own line). PT-2: ≥10px + a leading glyph so
                  the severity isn't carried by color alone. */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: type.size['base'], fontWeight: type.weight.medium, color: P.textPrimary, fontFamily: FF, lineHeight: 1.35 }}>{p.promiseText}</span>
                <span style={{ ...statusChip(col), flexShrink: 0 }}>
                  {(sev === 'critical' ? '! ' : (p.status === 'confirmed' || p.status === 'completed') ? '✓ ' : '• ')}{PROMISE_STATUS_LABEL[p.status] || p.status}
                </span>
                {canAddress && <span aria-hidden style={{ color: P.textTertiary, fontSize: type.size['base'], flexShrink: 0, alignSelf: 'center' }}>→</span>}
              </div>
              <div style={{ fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, marginTop: 3 }}>
                Handled by: {ownerLabel(p.owner)}{p.dueDate ? ` · Due ${p.dueDate}` : ''}{proofTxt}
              </div>
              {nextHint && (
                <div style={{ fontSize: type.size['caption'], color: P.textSecondary, fontFamily: FF, marginTop: 4 }}>→ {nextHint}</div>
              )}
              {(() => {
                const open = !['confirmed', 'completed'].includes(p.status);
                const plannerProof = !!(vendor.promiseEvidence && vendor.promiseEvidence[p.promiseKey]);
                const needsProof = p.evidenceRequired && onPatchVendor && !plannerProof && open;
                if (!open && !plannerProof) return null;
                const btn = { background: 'none', border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: type.size['sm'], fontWeight: type.weight.semibold, letterSpacing: '0.05em', textTransform: 'uppercase', color: P.textSecondary, fontFamily: FF, padding: '9px 14px', minHeight: 40 };
                return (
                  <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap', alignItems: 'center', marginTop: space[2] }}>
                    {open && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDraftFor(showDraft ? null : p.id); }} style={btn}>
                        {showDraft ? 'Hide draft' : 'Draft follow-up'}
                      </button>
                    )}
                    {needsProof && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); markProof(p); }}
                        style={{ ...btn, border: `1px solid ${P.green}55`, color: P.green }}>
                        ✓ Mark proof on file
                      </button>
                    )}
                    {plannerProof && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: type.size['sm'], color: P.green, fontFamily: FF }}>
                        ✓ Proof on file
                        <button type="button" onClick={(e) => { e.stopPropagation(); undoProof(p); }}
                          style={{ background: 'none', border: 'none', color: P.textTertiary, cursor: 'pointer', fontSize: type.size['xs'], textDecoration: 'underline', fontFamily: FF, padding: 0 }}>
                          Undo
                        </button>
                      </span>
                    )}
                  </div>
                );
              })()}
              {showDraft && draft && (
                <div style={{ marginTop: space[2] }} onClick={(e) => e.stopPropagation()}>
                  <CopyableDraft text={draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

// ── "What needs attention" — hero digest ─────────────────────────────────────
// Board review #2 (Cognitive Load Officer + Grandmother, ranked #1): instead of
// making the planner expand the Readiness Snapshot AND the Promise Tracker to
// learn what's wrong, lead the detail with ONE merged digest that pulls only
// the critical/attention items from BOTH surfaces, prioritized, in plain
// language. The full Snapshot + Tracker still live below (collapsed) for depth
// — this compresses the signal, it doesn't bury the detail. Renders nothing
// when the vendor is clean (the calm path stays calm). Desktop-only: on mobile
// the MobileVendorSummary already carries the first-look "what's wrong" signal.
// Board re-audit (2026-06-10): consolidation. The standalone "What needs
// attention" digest was removed — its items now live INSIDE the Next Action
// card (the next action is the lead item; the rest list below it, deduped).
// This helper computes the sorted attention items (readiness challenges +
// risky promises) so the Next Action card can render the "also" list.
function computeAttentionItems(challenges, vendor, event) {
  const items = [];
  Object.keys(CATEGORY_LABELS).forEach(key => {
    const c = challenges?.[key];
    if (c && (c.level === 'critical' || c.level === 'attention')) {
      // `key` is the challenge category (booking/communication/financial/
      // documents/logistics/…) — carried so the "Also open" rows are CLICKABLE
      // to their clearing action (board 2026-06-12: every alert is actionable).
      items.push({ sev: c.level, label: CATEGORY_LABELS[key], text: c.note, key });
    }
  });
  let promises = [];
  try { promises = inferPromisesFromVendor(vendor, event).filter(p => p.status !== 'not_required'); } catch (e) { promises = []; }
  promises.forEach(p => {
    const sev = PROMISE_STATUS_SEVERITY[p.status] || 'watch';
    if (sev === 'critical' || sev === 'attention') {
      const nextHint = p.nextAction || PROMISE_NEXT_BY_STATUS[p.status] || null;
      // Promise rows route to the documents/contract editor (where proof + the
      // promised deliverable are recorded) unless they map to a money gate.
      const key = p.evidenceRequired ? 'documents' : 'promise';
      items.push({ sev, label: p.promiseText, text: nextHint || PROMISE_STATUS_LABEL[p.status] || '', key });
    }
  });
  const rank = { critical: 0, attention: 1 };
  items.sort((a, b) => (rank[a.sev] ?? 2) - (rank[b.sev] ?? 2));
  return items;
}

// ── Lock-in / clearance progress tracker ─────────────────────────────────────
// Board (2026-06-10): the false-done guard + COI gate made the BEHAVIOR correct
// (auto-advance, "cleared" only when all green) — this makes it VISIBLE. Shows
// the real lock-in gates as one "X of N" strip so the planner sees "getting
// there" at a glance, instead of one next-action at a time. Reads the existing
// planning checklist rows (no new data).
const LOCKIN_GATES = [
  { key: 'selected', label: 'Booked' },
  { key: 'contract', label: 'Contract' },
  { key: 'deposit',  label: 'Deposit' },
  { key: 'balance',  label: 'Final pay' },
  { key: 'coi',      label: 'COI' },
  { key: 'arrival',  label: 'Arrival' },
];
// Reversal patches for "uncheck for unpaid / undo mark" — payment gates only.
// Clears the paid flag + its timestamp/method so readiness, budget truth and
// the overdue alarm all re-derive honestly. Contract/COI reversal is a separate
// follow-up (those have multi-flag state).
const GATE_REVERSAL = {
  deposit: { patch: { depositPaid: false, depositPaidAt: null, depositMethod: null }, label: 'Deposit', log: 'Deposit un-marked — back to unpaid (correction via cockpit).' },
  balance: { patch: { balancePaid: false, balancePaidAt: null, balanceMethod: null }, label: 'Final payment', log: 'Final payment un-marked — back to unpaid (correction via cockpit).' },
};
function LockInTracker({ rows, vendor, onPatchVendor, onAddLog, onAddressRow }) {
  const [confirmKey, setConfirmKey] = useState(null);
  const gates = LOCKIN_GATES.map(g => {
    const r = (rows || []).find(x => x.key === g.key);
    return r ? { ...g, status: r.status } : null;
  }).filter(g => g && g.status !== 'not_tracked');
  if (gates.length < 2) return null;
  const reverse = (key) => {
    const rev = GATE_REVERSAL[key];
    if (!rev || !vendor || !onPatchVendor) return;
    onPatchVendor(vendor.id, rev.patch);
    if (onAddLog) onAddLog(vendor.id, rev.log);
    setConfirmKey(null);
  };
  const done = gates.filter(g => g.status === 'done').length;
  const total = gates.length;
  const allDone = done === total;
  const headColor = allDone ? P.green : P.steelBlue;
  return (
    <div style={{
      background: P.card, border: `1px solid ${P.borderSubtle}`,
      borderLeft: `3px solid ${headColor}`, borderRadius: radius.md,
      padding: space[4], marginBottom: space[4],
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space[3] }}>
        <span style={{ fontSize: type.size['xs'], fontWeight: type.weight.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: headColor, fontFamily: FF }}>
          {allDone ? 'Fully locked in' : 'Lock-in progress'}
        </span>
        <span style={{ fontSize: type.size['sm'], fontWeight: type.weight.semibold, color: P.textSecondary, fontFamily: FF }}>{done} of {total}</span>
      </div>
      <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap', alignItems: 'center' }}>
        {gates.map(g => {
          const c = g.status === 'done' ? P.green : g.status === 'missing' ? P.red : P.amber;
          const glyph = g.status === 'done' ? '✓' : g.status === 'missing' ? '!' : '•';
          // A PAID payment gate can be un-marked (correction). Clicking asks to
          // confirm inline before reversing — no accidental un-pay.
          const canReverse = g.status === 'done' && GATE_REVERSAL[g.key] && vendor && onPatchVendor;
          // A PENDING/MISSING gate is clickable to advance it — jumps to the
          // panel that clears it (board 2026-06-12: every lock-in rung is live).
          const canAddress = g.status !== 'done' && onAddressRow;
          if (confirmKey === g.key) {
            return (
              <span key={g.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: type.size['sm'], fontWeight: type.weight.medium, color: P.amber, background: `${P.amber}14`, border: `1px solid ${P.amber}40`, borderRadius: 999, padding: '4px 9px', fontFamily: FF, whiteSpace: 'nowrap' }}>
                Un-mark {GATE_REVERSAL[g.key].label}?
                <button onClick={() => reverse(g.key)} style={{ background: P.amber, color: '#070809', border: 'none', borderRadius: 5, padding: '2px 7px', fontSize: type.size['xs'], fontWeight: 700, cursor: 'pointer', fontFamily: FF }}>Yes</button>
                <button onClick={() => setConfirmKey(null)} style={{ background: 'none', color: P.textTertiary, border: 'none', padding: '2px 4px', fontSize: type.size['xs'], cursor: 'pointer', fontFamily: FF }}>No</button>
              </span>
            );
          }
          return (
            <span key={g.key}
              onClick={canReverse ? () => setConfirmKey(g.key) : (canAddress ? () => onAddressRow({ key: g.key, label: g.label }) : undefined)}
              title={canReverse ? `Mistake? Un-mark ${GATE_REVERSAL[g.key].label} as paid` : (canAddress ? `Resolve: ${g.label}` : undefined)}
              style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: type.size['sm'], fontWeight: type.weight.medium, color: c,
              background: `${c}14`, border: `1px solid ${c}40`,
              borderRadius: 999, padding: '4px 9px', fontFamily: FF, whiteSpace: 'nowrap',
              cursor: (canReverse || canAddress) ? 'pointer' : 'default',
            }}>
              <span style={{ fontWeight: 800 }}>{glyph}</span>{g.label}{canReverse ? ' ⤺' : (canAddress ? ' →' : '')}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function VendorDetail({ vendor, event, isMobile = false, onEdit, onAddLog, onMarkCatererUpdated, onPatchVendor, aiAvailable, onAskAi, userId, onRouteToLinked, openSection = null, sectionPing = 0 }) {
  const readiness = useMemo(() => getVendorReadiness(vendor, event), [vendor, event]);
  const stage = useMemo(() => getVendorLifecycleStage(vendor, event), [vendor, event]);
  const nextAction = useMemo(() => getVendorNextAction(vendor, event), [vendor, event]);
  const challenges = useMemo(() => getVendorChallengeSummary(vendor, event), [vendor, event]);
  const planning = useMemo(() => getVendorPlanningState(vendor, event), [vendor, event]);
  const dayOf = useMemo(() => getVendorDayOfState(vendor, event), [vendor, event]);
  const closeout = useMemo(() => getVendorCloseoutState(vendor, event), [vendor, event]);
  const questions = useMemo(() => getVendorRequiredQuestions(vendor, event), [vendor, event]);
  const linked = useMemo(() => getVendorLinkedWork(vendor, event), [vendor, event]);

  // Board re-audit (2026-06-10) consolidation: the "what needs attention" items
  // now live inside the Next Action card. `alsoItems` is the attention list with
  // the lead (next-action) item removed — deduped by label-in-title so the
  // planner reads the primary problem once. Desktop/tablet only; on mobile the
  // MobileVendorSummary already carries the first-look attention signal.
  const attentionItems = useMemo(() => computeAttentionItems(challenges, vendor, event), [challenges, vendor, event]);
  const alsoItems = useMemo(() => {
    const title = (nextAction?.title || '').toLowerCase();
    return attentionItems.filter(it => {
      const lbl = (it.label || '').toLowerCase();
      return lbl && !title.includes(lbl);
    });
  }, [attentionItems, nextAction]);

  // Sprint 60.B — section-focus state. expandedKind is shared with
  // NextActionCard so payment/contract/arrival routes from outside the
  // cockpit can open the right inline panel. flashSection drives a 2-second
  // amber outline on the target section after focus lands.
  const [expandedKind, setExpandedKind] = useState(null);
  const [flashSection, setFlashSection] = useState(null);
  const scrollContainerRef = useRef(null);
  const nextActionRef = useRef(null);
  const documentsRef = useRef(null);
  const notesRef = useRef(null);
  const activityRef = useRef(null);
  const questionsRef = useRef(null);

  // Sprint 60.C — sticky per-vendor collapse state. Smart defaults reflect
  // signal-first behavior: open the sections that have something the
  // planner should see immediately, collapse the rest.
  const challengesCats = challenges ? Object.values(challenges) : [];
  const hasReadinessSignal = challengesCats.some(c => c && (c.level === 'critical' || c.level === 'attention'));
  const contractHasIssue = !(vendor.contractSigned === true || vendor.contract_signed === true)
    || !(vendor.contractUrl || vendor.contractStoragePath);
  // Sprint 60.H: on mobile, the new MobileVendorSummary card handles the
  // first-look "what's wrong" signal — so all sections start closed below it.
  // Desktop keeps the smart-default open behavior so pros see the signal-led
  // sections without an extra tap.
  // Board review #2: the desktop AttentionDigest now carries the critical/
  // attention signal from BOTH the Readiness Snapshot and the Promise Tracker,
  // so those two sections start COLLAPSED (the digest leads; their full detail
  // is one tap away). Documents stays open when the contract has an issue —
  // the Trust Officer requirement that a missing contract/COI stays visible.
  const collapseDefaults = isMobile
    ? { readinessSnapshot: false, promises: false, readinessCopilot: false, documents: false, notes: false, activity: false }
    : { readinessSnapshot: false, promises: false, readinessCopilot: false, documents: contractHasIssue, notes: false, activity: false };
  const [collapse, setCollapse] = useStickyVendorCollapse(vendor.id, collapseDefaults);
  const toggle = (key) => setCollapse(prev => ({ ...prev, [key]: !prev[key] }));

  // Vendor Readiness v2: address-row router. Status rows from PhaseSection
  // and RequiredQuestionsSection route through here. For payment / contract /
  // arrival, we drive the NextActionCard's inline expand. For contact /
  // scope / vendor-status (no inline panel today), we fall back to the
  // canonical vendor edit modal.
  const addressRow = (row) => {
    const key = row?.key;
    // "Booking — not yet confirmed" is a ONE-CLICK confirm, not a trip to the
    // editor (board 2026-06-12: on a Contracted vendor like Premier AV it
    // routed to onEdit and felt like nothing happened). Confirm in place.
    if (key === 'booking' && onPatchVendor && vendor && vendor.status !== 'Confirmed' && vendor.status !== 'Booked') {
      onPatchVendor(vendor.id, { status: 'Confirmed' });
      if (onAddLog) onAddLog(vendor.id, `Marked Confirmed via vendor cockpit (was ${vendor.status || 'unset'}).`);
      setFlashSection('nextAction');
      setTimeout(() => setFlashSection(null), 2000);
      return;
    }
    // Maps a row/attention-item key → the inline panel that clears it. Now also
    // accepts challenge-CATEGORY keys (financial/documents/logistics) so the
    // "Also open" attention rows route to the same panels (board 2026-06-12).
    const targetKind = (key === 'deposit' || key === 'balance' || key === 'payment-overdue' || key === 'financial') ? 'payment'
      : (key === 'contract' || key === 'documents') ? 'contract'
      : (key === 'arrival' || key === 'expectedArrival' || key === 'logistics') ? 'arrival'
      : null;
    // Every readiness CTA must REACT: center the viewport on the action card and
    // flash it, regardless of row kind. Previously only payment/contract/arrival
    // rows scrolled; every other row fell through to onEdit (or, if onEdit was
    // absent, did nothing at all) — so the CTA "went nowhere".
    if (targetKind) setExpandedKind(targetKind);
    setFlashSection('nextAction');
    setTimeout(() => setFlashSection(null), 2000);
    // Defer one tick so a freshly-expanded panel is laid out before we center.
    setTimeout(() => {
      if (nextActionRef.current && nextActionRef.current.scrollIntoView) {
        nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    // Contact / scope / status have no inline panel on the action card — also
    // open the edit modal where those are actually fixed.
    if (!targetKind && onEdit) onEdit();
  };

  // Sprint 60.H: MobileVendorSummary primary action — same section-focus
  // mechanism as addressRow but invoked directly by the summary card's CTA.
  const summaryPrimary = (section) => {
    if (section === 'contact') { if (onEdit) onEdit(); return; }
    if (section === 'payment' || section === 'contract' || section === 'arrival') {
      setExpandedKind(section);
      setFlashSection('nextAction');
      setTimeout(() => setFlashSection(null), 2000);
      if (nextActionRef.current?.scrollIntoView) {
        nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Sprint 60.B — react to external section-focus requests (from Budget,
  // Documents, Day-of arrivals, Home AttentionQueue, CommandCenter NEXT
  // actions). Re-fires when sectionPing increments so the same section
  // can be requested twice in a row. Sprint 60.C — also force-open the
  // sticky-collapse state for the target section so a planner who
  // previously collapsed it still lands inside an expanded panel.
  useEffect(() => {
    if (!openSection) return;
    if (openSection === 'contact') {
      if (onEdit) onEdit();
      return;
    }
    // 'nextAction' = center the viewport on the action card without forcing a
    // specific inline panel open (used by the Conflicts strip "Open" CTA, which
    // may swap the selected vendor — so we let the card show its own top action).
    if (openSection === 'payment' || openSection === 'contract' || openSection === 'arrival' || openSection === 'nextAction') {
      if (openSection !== 'nextAction') setExpandedKind(openSection);
      // Contract also expands the Documents collapsible so the planner sees
      // the contract row context after the inline panel.
      if (openSection === 'contract') {
        setCollapse(prev => ({ ...prev, documents: true }));
      }
      setFlashSection('nextAction');
      setTimeout(() => setFlashSection(null), 2000);
      // Defer the scroll one tick so a just-swapped vendor's card is laid out
      // before we center it (the conflict CTA changes `selected` in the same pass).
      setTimeout(() => {
        if (nextActionRef.current && nextActionRef.current.scrollIntoView) {
          nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      return;
    }
    const refMap = { documents: documentsRef, notes: notesRef, activity: activityRef, questions: questionsRef };
    const collapseKeyMap = { documents: 'documents', notes: 'notes', activity: 'activity' };
    const collapseKey = collapseKeyMap[openSection];
    if (collapseKey) setCollapse(prev => ({ ...prev, [collapseKey]: true }));
    const targetRef = refMap[openSection];
    if (targetRef && targetRef.current) {
      setFlashSection(openSection);
      setTimeout(() => setFlashSection(null), 2000);
      if (targetRef.current.scrollIntoView) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [openSection, sectionPing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: amber outline wrapper applied to the flashing section.
  const flashStyle = (key) => flashSection === key ? {
    boxShadow: `0 0 0 2px ${P.amber}`,
    borderRadius: radius.md,
    transition: 'box-shadow 0.18s ease-out',
  } : { transition: 'box-shadow 0.4s ease-out' };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: P.canvas, overflow: isMobile ? 'visible' : 'hidden',
    }}>
      <div ref={nextActionRef} style={flashStyle('nextAction')}>
        <CommandHeader
          vendor={vendor}
          event={event}
          readiness={readiness}
          stage={stage}
          nextAction={nextAction}
          onEdit={onEdit}
          onPatchVendor={onPatchVendor}
          onAddLog={onAddLog}
          userId={userId}
          expandedKind={expandedKind}
          setExpandedKind={setExpandedKind}
          isMobile={isMobile}
          alsoItems={isMobile ? [] : alsoItems}
          onAddressItem={addressRow}
        />
      </div>

      <div ref={scrollContainerRef} style={{
        flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto',
        // Vertical-center when short, but DON'T clip when tall. The old `margin:auto`
        // on the child clipped the top of tall vendors so you couldn't scroll up to it
        // (user 2026-06-12). `justify-content: safe center` centers short content and
        // top-aligns (fully scrollable) once it overflows.
        display: isMobile ? 'block' : 'flex', flexDirection: 'column',
        justifyContent: isMobile ? undefined : 'safe center',
        // The whole cockpit is now centered at the `wide` measure (App.js), so the
        // detail body fills the pane symmetrically — its right edge lines up with the
        // readiness/conflicts bands above it (no inner 1200 cap, which made the detail
        // content ~150px narrower than the bands). Long PROSE keeps its own inner cap.
        padding: `${space[2]}px ${space[6]}px ${space[7]}px ${space[6]}px`,
      }}>
        <div style={{ margin: 0, width: '100%' }}>
        {isMobile && (
          <MobileVendorSummary
            vendor={vendor}
            nextAction={nextAction}
            challenges={challenges}
            onPrimary={summaryPrimary}
            onEdit={onEdit}
            host={isHostView(event)}
          />
        )}
        <CatererDriftBanner vendor={vendor} event={event} onMarkCatererUpdated={onMarkCatererUpdated} />

        {/* Lock-in progress — "X of N" at a glance (makes the auto-advance
            behavior visible). Desktop/tablet; mobile leads with MobileVendorSummary. */}
        {!isMobile && <LockInTracker rows={planning} vendor={vendor} onPatchVendor={onPatchVendor} onAddLog={onAddLog} onAddressRow={addressRow} />}

        {/* Consolidation (2026-06-10): the standalone "What needs attention"
            digest was merged INTO the Next Action card above (next action = the
            lead item, the rest list beneath it). One block, no duplicated
            payment line. */}

        {/* Board re-audit (2026-06-10) consolidation: promises LEAD the
            reference sections; the redundant "Where this vendor stands" snapshot
            was removed (the Next Action card's attention list now carries that
            signal); the AI "Quick read" brief is demoted below the structured
            facts (prose is for when you can't act — you can act above). Plainer,
            topic-led labels; the day-of section is promoted with real arrivals
            data. Flow ≈ Deliverables → Money/contract → Scope → On the day →
            After → files/history. */}

        {/* ── Zone 1 · What this vendor delivers (scope + deliverables) ── */}
        <div style={ZONE_LABEL}>What this vendor delivers</div>
        <PromiseTrackerSection
          vendor={vendor}
          event={event}
          isOpen={collapse.promises}
          onToggle={() => toggle('promises')}
          onAddressRow={addressRow}
          onPatchVendor={onPatchVendor}
          onAddLog={onAddLog}
        />
        <div ref={questionsRef} style={flashStyle('questions')}>
          <RequiredQuestionsSection vendor={vendor} questions={questions} onAddressRow={addressRow} />
        </div>

        {/* ── Zone 2 · Money & contract ─────────────────────────────── */}
        <div style={ZONE_LABEL}>Money &amp; contract</div>
        <PhaseSection label="Payments & booking" hint="The deal" rows={planning} defaultOpen={false} onAddressRow={addressRow} />
        <div ref={documentsRef} style={flashStyle('documents')}>
          <DocumentsSection vendor={vendor} event={event} isOpen={collapse.documents} onToggle={() => toggle('documents')} />
        </div>

        {/* ── Zone 3 · The day-of & after ───────────────────────────── */}
        <div style={ZONE_LABEL}>The day-of &amp; after</div>
        <PhaseSection label="On the day" hint="Arrivals, load-in, on-site" rows={dayOf} defaultOpen={false} onAddressRow={addressRow} />
        <PhaseSection label="After the event" hint="Closeout" rows={closeout} defaultOpen={false} onAddressRow={addressRow} />
        <LinkedWorkSection linked={linked} onRouteToLinked={onRouteToLinked} />

        {/* ── Zone 4 · Reference & history ──────────────────────────── */}
        <div style={ZONE_LABEL}>Reference &amp; history</div>
        {/* AI readiness brief — demoted below the structured, actionable facts. */}
        <ReadinessCopilotSection
          vendor={vendor} event={event}
          aiAvailable={aiAvailable}
          onAskAi={onAskAi}
          isOpen={collapse.readinessCopilot}
          onToggle={() => toggle('readinessCopilot')}
        />
        <div ref={notesRef} style={flashStyle('notes')}>
          <NotesSection vendor={vendor} isOpen={collapse.notes} onToggle={() => toggle('notes')} />
        </div>
        <div ref={activityRef} style={flashStyle('activity')}>
          <ActivityLogSection vendor={vendor} onAddLog={onAddLog} isOpen={collapse.activity} onToggle={() => toggle('activity')} />
        </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Empty state ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function NoSelection({ count }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      background: P.canvas,
    }}>
      <div style={{ fontSize: type.size['base'], fontWeight: type.weight.medium, color: P.textSecondary, fontFamily: FF }}>
        {count > 0 ? 'Select a vendor to view their details' : 'No vendors added yet'}
      </div>
      <div style={{ fontSize: type.size['sm'], color: P.textTertiary, fontFamily: FF, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        {count > 0
          ? 'You\'ll see what\'s ready, what still needs follow-up, and what to do next — across planning, the day of, and wrap-up.'
          : 'Add vendors from the event overview to start tracking what needs follow-up.'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Root export ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorPlanningWorkspace({
  event, allEvents = [], isMobile,
  openId,
  // Sprint 60.B: section focus inside the vendor cockpit.
  openSection = null,
  sectionPing = 0,
  onBack,
  onEditVendor,
  onAddVendor,
  onAddLog,
  onMarkCatererUpdated,
  // Sprint 56c: shallow-merge vendor mutator. Powers the one-click "Mark
  // balance paid / Mark contract signed / Mark confirmed" CTAs on the
  // cockpit's NEXT ACTION card. If not provided, the CTA falls back to
  // the existing Edit modal flow for that vendor.
  onPatchVendor = null,
  // Sprint 54: AI Readiness Copilot. Both are optional — if the planner
  // hasn't set their Anthropic API key in Profile, aiAvailable will be
  // false and the section falls back to the rule-based preview (honest
  // label, deterministic output).
  aiAvailable = false,
  onAskAi = null,
  // Vendor Readiness Pass: route a linked item (timeline/decision/task/
  // communication/budget/document) back to its canonical L4 tab. The
  // caller maps category → tab and forwards an optional item id.
  onRouteToLinked = null,
}) {
  const auth = useContext(AuthCtx);
  const userId = auth?.user?.id || 'anon';
  const vendors = useMemo(() => event.vendors || [], [event.vendors]);
  // Sprint 61.C Phase D — event-level conflict detection. Pure function;
  // recomputes whenever vendors/ros/guests/budget change.
  const eventConflicts = useMemo(
    () => [...deriveVendorPromiseConflicts(event, []), ...getVendorArrivalConflicts(vendors)],
    [event, vendors]
  );

  const initialSelected = useMemo(() => {
    if (openId) {
      const found = vendors.find(v => v.id === openId);
      if (found) return found;
    }
    // Default selection: highest-risk vendor, not first vendor.
    // Better orientation per Sprint 53 brief — alpha feedback was "don't know where to start".
    const top = getHighestRiskVendor(vendors, event);
    if (top) return top.vendor;
    return vendors.length > 0 ? vendors[0] : null;
  }, [openId, vendors, event]);

  const [selected, setSelected] = useState(initialSelected);
  const [mobileView, setMobileView] = useState(openId ? 'detail' : 'list');

  useEffect(() => {
    if (openId) {
      const found = vendors.find(v => v.id === openId);
      if (found) {
        setSelected(found);
        if (isMobile) setMobileView('detail');
      }
    }
  }, [openId, vendors, isMobile]);

  // When the underlying selected vendor object changes (e.g. after edit), re-resolve it
  useEffect(() => {
    if (selected) {
      const fresh = vendors.find(v => v.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
  }, [vendors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local section-focus request. When a vendor is opened from the Conflicts
  // strip we don't just select it — we ask its detail pane to center the
  // viewport on the action card (and flash it). `ping` is monotonic so the
  // detail's effect re-fires even when the same section is requested twice.
  const [localFocus, setLocalFocus] = useState({ section: null, ping: 0 });

  // Mobile: when a vendor is selected (incl. "Start with X"), bring the detail
  // into the viewport — the page scroll otherwise stays on the command strip and
  // the vendor loads below the fold (user 2026-06-12).
  const mobileDetailRef = useRef(null);
  useEffect(() => {
    if (!isMobile || mobileView !== 'detail') return undefined;
    const t = setTimeout(() => {
      if (mobileDetailRef.current && mobileDetailRef.current.scrollIntoView) {
        mobileDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 70);
    return () => clearTimeout(t);
  }, [isMobile, mobileView, selected]);

  function handleSelect(v, conflict) {
    setSelected(v);
    if (isMobile) setMobileView('detail');
    if (conflict) {
      // Payment-vs-budget routes to the payment panel; every other conflict
      // (arrival / timeline / coverage / count / delivery) just centers the
      // action card so the planner lands on what to do next.
      const section = conflict.kind === 'payment_vs_budget' ? 'payment' : 'nextAction';
      setLocalFocus(f => ({ section, ping: f.ping + 1 }));
    }
  }

  // Effective focus passed to the detail pane: local conflict-driven focus
  // takes over once used; external deep-links (openSection prop) drive the
  // initial mount. `effPing` sums both so either source re-fires the effect.
  const effSection = localFocus.ping > 0 ? localFocus.section : openSection;
  const effPing = sectionPing + localFocus.ping;

  const workspaceHeader = onBack && (
    <div style={{
      height: 42, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      background: P.base,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
      <button
        onClick={onBack}
        title={event?.name ? `Back to ${event.name}` : 'Back to event overview'}
        style={{
          background: 'transparent', border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, cursor: 'pointer',
          fontSize: type.size['sm'], fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px', maxWidth: 200, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        ← {event?.name ? (event.name.length > 24 ? event.name.slice(0, 23) + '…' : event.name) : 'Overview'}
      </button>
      <span style={{
        fontSize: type.size['xs'], fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
      }}>
        {isHostView(event) ? 'People you’re hiring' : 'Vendors'}
      </span>
    </div>
  );

  if (isMobile) {
    return (
      // Mobile: flow with the page (the host tab area scrolls). A fixed height +
      // overflow:hidden here collapsed against the unbounded mobile container, so
      // the vendor detail couldn't scroll. Let it grow and the page handles scroll.
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {workspaceHeader}
        <VendorStatusBar vendors={vendors} event={event} conflicts={eventConflicts} onSelectVendor={handleSelect} />
        {mobileView === 'list' ? (
          <VendorList
            vendors={vendors}
            selected={selected}
            onSelect={handleSelect}
            event={event}
            allEvents={allEvents}
            isMobile
            onAdd={onAddVendor}
          />
        ) : (
          <div ref={mobileDetailRef} style={{ display: 'flex', flexDirection: 'column', scrollMarginTop: 8 }}>
            <button
              onClick={() => setMobileView('list')}
              style={{
                height: 38, flexShrink: 0,
                background: P.base,
                border: 'none', borderBottom: `1px solid ${P.borderSubtle}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 16px',
                fontSize: type.size['caption'], color: P.textSecondary, fontFamily: FF,
              }}
            >
              ← All vendors
            </button>
            {selected ? (
              <VendorDetail
                vendor={selected} event={event}
                isMobile={true}
                onEdit={onEditVendor ? () => onEditVendor(selected) : undefined}
                onAddLog={onAddLog}
                onMarkCatererUpdated={onMarkCatererUpdated}
                onPatchVendor={onPatchVendor}
                aiAvailable={aiAvailable}
                onAskAi={onAskAi}
                userId={userId}
                onRouteToLinked={onRouteToLinked}
                openSection={effSection}
                sectionPing={effPing}
              />
            ) : (
              <NoSelection count={vendors.length} />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Desktop: the shared LegacyTabHeader band (added in App.js) now carries
          the ← Overview back + VENDORS label, so the in-workspace breadcrumb is
          redundant and removed here to avoid a double header. */}
      {/* One quiet status line (readiness stats + a conflict flag) — see
          VendorStatusBar. The risk-sorted list + default selection answer
          "where do I start", so there's no "Start with X" band. */}
      <VendorStatusBar vendors={vendors} event={event} conflicts={eventConflicts} onSelectVendor={handleSelect} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <VendorList
          vendors={vendors}
          selected={selected}
          onSelect={handleSelect}
          event={event}
          allEvents={allEvents}
          isMobile={false}
          onAdd={onAddVendor}
        />
        {selected ? (
          <VendorDetail
            vendor={selected} event={event}
            onEdit={onEditVendor ? () => onEditVendor(selected) : undefined}
            onAddLog={onAddLog}
            onMarkCatererUpdated={onMarkCatererUpdated}
            onPatchVendor={onPatchVendor}
            aiAvailable={aiAvailable}
            onAskAi={onAskAi}
            onRouteToLinked={onRouteToLinked}
            openSection={effSection}
            sectionPing={effPing}
          />
        ) : (
          <NoSelection count={vendors.length} />
        )}
      </div>
    </div>
  );
}
