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

// ─────────────────────────────────────────────────────────────────────────────
// ── Visual primitives ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function LevelChip({ level, label }) {
  const c = levelColor(level);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 9, fontWeight: type.weight.semibold,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      color: c, background: c + '12',
      border: `1px solid ${c}33`,
      borderRadius: radius.sm,
      padding: '3px 8px', fontFamily: FF,
      whiteSpace: 'nowrap',
    }}>
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
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: P.textSecondary, fontFamily: FF,
      }}>
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
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
          <span style={{ color: P.steelBlue, fontSize: 11, width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{label}</span>
        </span>
        {summary && (
          <span style={{
            fontSize: 10,
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
        fontSize: 11, fontWeight: type.weight.bold,
        color: v.color,
        marginTop: 1,
      }}>
        {v.badge}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: P.textSecondary, fontFamily: FF, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: type.weight.medium, color: status === 'done' ? P.textPrimary : v.color, fontFamily: FF }}>
          {value}
        </div>
        {consequence && (
          <div style={{ fontSize: 12.5, color: P.textTertiary, fontFamily: FF, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
            {consequence}
          </div>
        )}
      </div>
      {onAddress && (
        <span style={{ color: P.textTertiary, fontSize: 14, flexShrink: 0, alignSelf: 'center', marginLeft: 4 }} aria-hidden>→</span>
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

function ConflictsStrip({ conflicts, vendors, onSelectVendor }) {
  if (!conflicts || conflicts.length === 0) return null;
  const top = conflicts.slice(0, 3);
  const vendorById = new Map((vendors || []).map(v => [v.id, v]));
  const sevColor = (s) =>
    s === 'critical' ? P.red
    : s === 'high'   ? P.red
    : s === 'attention' ? P.amber
    : P.steelBlue;
  return (
    <div style={{
      flexShrink: 0,
      background: `linear-gradient(180deg, ${P.steelBlue}1f 0%, ${P.steelBlue}0a 100%)`,
      borderBottom: `1px solid ${P.borderSubtle}`,
      padding: `${space[3]}px ${space[5]}px`,
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: FF,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{
          width: 22, height: 22, borderRadius: '50%',
          background: `${P.steelBlue}26`, color: P.steelBlue,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
        }}>⚠</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.steelBlue }}>
          Conflicts found
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: P.red }}>{conflicts.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {top.map(c => {
          const target = vendorById.get(c.affectedVendorId);
          const color = sevColor(c.severity);
          return (
            <div key={c.id} style={{
              padding: '10px 12px',
              background: P.card,
              border: `1px solid ${color}3d`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 8,
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.textPrimary, letterSpacing: '-0.005em' }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 11.5, color: P.textSecondary, marginTop: 2, lineHeight: 1.45 }}>
                  {c.explanation}
                </div>
                <div style={{ fontSize: 11, color: P.steelBlue, marginTop: 4, fontWeight: 600 }}>
                  → {c.recommendedAction}
                </div>
              </div>
              {target && (
                <button
                  onClick={() => onSelectVendor && onSelectVendor(target)}
                  style={{
                    background: `linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)`,
                    color: '#fff', border: 'none', cursor: 'pointer',
                    borderRadius: 8, padding: '7px 12px',
                    fontSize: 11.5, fontWeight: 700, fontFamily: FF,
                    letterSpacing: '0.02em',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.3)',
                    flexShrink: 0,
                  }}>
                  Open {target.name.split(' ')[0]} →
                </button>
              )}
            </div>
          );
        })}
        {conflicts.length > top.length && (
          <div style={{ fontSize: 11, color: P.textTertiary, marginTop: 2 }}>
            +{conflicts.length - top.length} more conflict{conflicts.length - top.length === 1 ? '' : 's'} — open each vendor to review.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Vendor Command Strip (top of workspace) ─────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function VendorCommandStrip({ vendors, event, onSelectVendor }) {
  const summary = useMemo(() => getVendorPortfolioSummary(vendors, event), [vendors, event]);
  const topRisk = useMemo(() => getHighestRiskVendor(vendors, event), [vendors, event]);

  if (!vendors || vendors.length === 0) return null;

  const accent =
    summary.critical > 0 ? P.red
    : summary.attention > 0 ? P.amber
    : P.green;

  // Sprint 56 tone calm-down: "blocking event readiness" → "need urgent
  // follow-up"; "need attention" → "need follow-up"; "healthy" → "on track".
  // Plain English for first-time hosts; signal preserved for pros.
  const headline =
    summary.critical > 0 ? `${summary.critical} vendor${summary.critical > 1 ? 's' : ''} need${summary.critical === 1 ? 's' : ''} urgent follow-up`
    : summary.attention > 0 ? `${summary.attention} vendor${summary.attention > 1 ? 's' : ''} need${summary.attention === 1 ? 's' : ''} follow-up`
    : 'All vendors on track';

  const sub = [
    summary.safe ? `${summary.safe} safe` : null,
    summary.attention ? `${summary.attention} need attention` : null,
    summary.critical ? `${summary.critical} critical` : null,
    summary.notStarted ? `${summary.notStarted} not started` : null,
    summary.closed ? `${summary.closed} closed` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      flexShrink: 0,
      background: P.base,
      borderBottom: `1px solid ${P.borderSubtle}`,
      padding: `${space[4]}px ${space[5]}px`,
      display: 'flex', alignItems: 'stretch', gap: space[5],
      fontFamily: FF,
    }}>
      {/* Left accent strip — single colored bar, signals priority without neon */}
      <div style={{
        width: 3, flexShrink: 0,
        background: accent, borderRadius: 2,
      }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: space[5], flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          {/* Sprint 60.L F8: tag bumped 9 → 12 for status-pill min;
              headline 15 → 17 for card-title min; sub 11 → 13 for
              helper-copy min. */}
          <div style={{
            fontSize: 12, fontWeight: type.weight.semibold,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: accent, marginBottom: 4,
          }}>
            Vendor Readiness
          </div>
          <div style={{ fontSize: 17, fontWeight: type.weight.semibold, color: P.textPrimary, lineHeight: 1.3 }}>
            {headline}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: P.textSecondary, marginTop: 4 }}>
              {sub}
            </div>
          )}
        </div>

        {topRisk && topRisk.readiness.level !== 'safe' && topRisk.readiness.level !== 'closed' && (
          // Sprint 60.L chip readability: solid colored bg with near-black
          // text reads as caution-tape. Convert to TINTED carbon style —
          // bg = accent@14%, border = accent@40%, text = accent itself.
          // The chip still carries the semantic color identity (red /
          // amber / green) while the text reads cleanly on Carbon.
          <button
            onClick={() => onSelectVendor && onSelectVendor(topRisk.vendor)}
            style={{
              padding: '12px 18px', borderRadius: radius.sm,
              minHeight: 44,
              border: `1px solid ${accent}66`,
              cursor: 'pointer',
              background: `${accent}22`,
              color: accent,
              fontSize: 14, fontWeight: type.weight.bold,
              fontFamily: FF, letterSpacing: '0.02em',
              flexShrink: 0, whiteSpace: 'nowrap',
              boxShadow: `inset 0 0 0 1px ${accent}1a`,
              transition: 'background 0.16s, border-color 0.16s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${accent}30`; e.currentTarget.style.borderColor = `${accent}99`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.borderColor = `${accent}66`; }}
            aria-label={`Open ${topRisk.vendor.name} to fix the highest priority issue`}
          >
            Start with {topRisk.vendor.name} →
          </button>
        )}
      </div>
    </div>
  );
}

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

function VendorRow({ vendor, event, accountability, nextAction, isSelected, onSelect }) {
  // Sprint 61.B — Accountability tier is now the primary signal. Readiness
  // stays as a secondary chip so the existing vendor-cockpit semantics still
  // flow through. If the parent doesn't pass an accountability prop, we
  // compute it locally (keeps the component testable in isolation).
  const readiness = useMemo(() => getVendorReadiness(vendor, event), [vendor, event]);
  const stage = useMemo(() => getVendorLifecycleStage(vendor, event), [vendor, event]);
  const acc = accountability || useMemo(() => quickAccountabilityForVendor(vendor, event), [vendor, event]); // eslint-disable-line react-hooks/rules-of-hooks
  const next = nextAction || null;
  const lastContacted = useMemo(() => getVendorLastContacted(vendor, event), [vendor, event]);

  const tierColor = ACCOUNTABILITY_COLOR[acc.tier] || P.textTertiary;
  const tierLabel = accountabilityLabel(acc.tier);
  const emphasis = acc.tier === 'missed_promise' || acc.tier === 'at_risk';
  const leftStrip = emphasis ? P.red
    : acc.tier === 'needs_follow_up' ? P.amber
    : acc.tier === 'needs_proof'     ? P.steelBlue
    : isSelected ? P.green
    : 'transparent';

  // Top issue — first reason if any, otherwise stage + readiness label.
  const topIssue = (acc.reasons && acc.reasons[0]) || null;

  return (
    <button
      onClick={() => onSelect(vendor)}
      style={{
        display: 'flex', alignItems: 'flex-start',
        width: '100%', padding: '12px 14px',
        borderBottom: `1px solid ${P.borderSubtle}`,
        border: 'none',
        borderLeft: `3px solid ${leftStrip}`,
        background: isSelected ? P.borderSubtle : (emphasis ? '#15181c' : 'transparent'),
        cursor: 'pointer', textAlign: 'left', gap: 10,
        fontFamily: FF,
      }}
    >
      <StatusDot level={readiness.level} size={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: emphasis ? type.weight.semibold : type.weight.medium,
          color: P.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {vendor.name || vendor.vendor_name || 'Unnamed Vendor'}
        </div>
        <div style={{ fontSize: 10, color: P.textSecondary, marginTop: 2,
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span>{vendor.category || vendor.type || '—'}</span>
          <span style={{ color: P.borderDef }}>·</span>
          <span style={{ color: P.textTertiary, fontStyle: 'italic' }}>{stage}</span>
          {lastContacted && (
            <>
              <span style={{ color: P.borderDef }}>·</span>
              <span style={{ color: P.textTertiary }}>contacted {lastContacted}</span>
            </>
          )}
        </div>
        {/* Top issue — only renders when there's a real reason to say it. */}
        {topIssue && acc.tier !== 'on_track' && (
          <div style={{
            fontSize: 10.5, color: tierColor,
            marginTop: 4, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {topIssue}
          </div>
        )}
        {/* Next action — short. Steel-blue when actionable. */}
        {next && next.kind && next.kind !== 'none' && (
          <div style={{
            fontSize: 10, color: P.steelBlue,
            marginTop: 3, fontWeight: 600, letterSpacing: '0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Next: {next.label.replace(/^.*?:\s/, '')}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, paddingTop: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {/* Accountability chip — primary signal */}
        <span style={{
          fontSize: 9, fontWeight: 800,
          letterSpacing: '0.10em', color: tierColor,
          background: `${tierColor}14`, border: `1px solid ${tierColor}44`,
          padding: '2px 6px', borderRadius: 999,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {tierLabel}
        </span>
        {/* Readiness label — secondary, only when different from on_track */}
        {readiness.level !== 'safe' && (
          <span style={{
            fontSize: 8, fontWeight: type.weight.semibold,
            letterSpacing: '0.10em', color: levelColor(readiness.level),
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            {readiness.label.replace('Ready for day-of', 'Ready').replace('Needs follow-up', 'Follow up').replace('Day-of follow-up', 'Day-of')}
          </span>
        )}
      </div>
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
  at_risk:         P.red,
  needs_follow_up: P.amber,
  needs_proof:     P.steelBlue,
  on_track:        P.green,
};

// Phase C filter set. Filter keys match the spec Part 4 list.
const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'evidence',  label: 'Evidence missing' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'ready',     label: 'Ready' },
  { key: 'all',       label: 'All' },
];

function VendorList({ vendors, selected, onSelect, event, isMobile, onFilter, onAdd }) {
  const [filter, setFilter] = useState('attention');

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

  // Top-of-list "Start with this vendor" — surfaces the single highest
  // priority vendor when anyone is not on_track. Visible only on the
  // "Needs attention" filter so it doesn't distract from Ready/All views.
  const startWith = useMemo(() => {
    if (filter !== 'attention') return null;
    const top = sortedAll.find(x => x.acc.tier !== 'on_track');
    if (!top) return null;
    return top;
  }, [filter, sortedAll]);

  return (
    <div style={{
      width: isMobile ? '100%' : 260, flexShrink: 0,
      background: P.base,
      borderRight: isMobile ? 'none' : `1px solid ${P.borderSubtle}`,
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        height: 42, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: `1px solid ${P.borderSubtle}`,
        gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: type.weight.medium,
          letterSpacing: '0.10em', color: P.textTertiary, fontFamily: FF,
        }}>
          {vendors.length} VENDORS · Ranked by accountability
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                background: P.green, border: 'none',
                borderRadius: radius.sm, cursor: 'pointer',
                fontSize: 10, fontWeight: type.weight.semibold,
                color: P.canvas, fontFamily: FF,
                padding: '3px 8px',
              }}
            >
              + Add
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
                fontFamily: FF, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.04em',
                padding: isMobile ? '10px 12px' : '4px 10px',
                minHeight: isMobile ? 44 : 28,
                lineHeight: 1,
              }}>
              {f.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
                fontSize: 12, fontWeight: type.weight.semibold,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: P.textTertiary,
              }}>Vendors</div>
              <div style={{
                fontSize: 18, fontWeight: type.weight.semibold,
                letterSpacing: '-0.015em', lineHeight: 1.25,
                color: P.textPrimary,
              }}>Add the people helping with this event.</div>
              <div style={{ fontSize: 14.5, color: P.textSecondary, lineHeight: 1.5 }}>
                Caterers, photographers, venues, DJs, rentals, and anyone else you need to coordinate.
              </div>
              <button onClick={onAdd} style={{
                marginTop: 4,
                padding: '12px 18px', minHeight: 48,
                borderRadius: radius.sm, border: 'none',
                background: P.green, color: '#070809',
                fontSize: 16, fontWeight: type.weight.semibold,
                fontFamily: FF, cursor: 'pointer',
                alignSelf: 'flex-start',
              }}>Add a vendor</button>
            </div>
          </div>
        ) : (
          <>
            {/* Sprint 61.B — Start with this vendor card. Steel-blue rail,
                states the top vendor by name, the top reason, and a
                steel-blue Open vendor CTA. Only when something is below
                on_track AND the user is on the Needs attention filter. */}
            {startWith && (
              <div style={{
                margin: '10px 10px 4px',
                padding: '12px 14px',
                background: `linear-gradient(180deg, ${P.steelBlue}1f 0%, ${P.steelBlue}0d 100%)`,
                border: `1px solid ${P.steelBlue}3d`,
                borderLeft: `3px solid ${P.steelBlue}`,
                borderRadius: 10,
                display: 'flex', flexDirection: 'column', gap: 6,
                fontFamily: FF,
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.steelBlue }}>
                  Start with this vendor
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.textPrimary, letterSpacing: '-0.005em' }}>
                  {startWith.v.name}
                </div>
                <div style={{ fontSize: 11.5, color: P.textSecondary, lineHeight: 1.45 }}>
                  {startWith.acc.reasons[0] || `${accountabilityLabel(startWith.acc.tier)} — open the vendor to review.`}
                </div>
                <button
                  onClick={() => onSelect(startWith.v)}
                  style={{
                    alignSelf: 'flex-start', marginTop: 2,
                    background: `linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)`,
                    color: '#fff', border: 'none', cursor: 'pointer',
                    borderRadius: 8, padding: '8px 14px',
                    fontSize: 11.5, fontWeight: 700, fontFamily: FF,
                    letterSpacing: '0.02em',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.3)',
                  }}>
                  {startWith.next?.kind === 'resolve' || startWith.next?.kind === 'follow_up' ? 'Open follow-up →' : 'Open vendor →'}
                </button>
              </div>
            )}
            {sorted.length === 0 ? (
              <div style={{
                padding: '20px 16px', textAlign: 'center',
                color: P.textTertiary, fontSize: 13, fontFamily: FF,
              }}>
                {filter === 'attention' ? 'Nothing needs attention right now — every vendor is on track.'
                  : filter === 'ready' ? 'No vendors on track yet — start by confirming the highest-priority promise.'
                  : 'No vendors match this filter.'}
              </div>
            ) : sorted.map(x => (
              <VendorRow
                key={x.v.id || x.v.name}
                vendor={x.v}
                event={event}
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
  const callLink = vendor.zoomUrl || vendor.meetUrl || vendor.teamsUrl;
  const callPlatform = vendor.zoomUrl ? 'Zoom' : vendor.meetUrl ? 'Meet' : vendor.teamsUrl ? 'Teams' : null;
  const waHref = vendor.whatsapp
    ? (vendor.whatsapp.startsWith('http') ? vendor.whatsapp : `https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}`)
    : null;
  const telHref = vendor.phone ? `tel:${vendor.phone.replace(/\s/g, '')}` : null;
  const mailHref = vendor.contact ? `mailto:${vendor.contact}` : null;

  const btnStyle = {
    background: 'none', border: `1px solid ${P.borderSubtle}`,
    borderRadius: radius.sm, cursor: 'pointer',
    fontSize: 11, fontWeight: type.weight.medium,
    color: P.textSecondary, fontFamily: FF,
    padding: '5px 10px', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center', gap: 4,
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
          aria-label={`Call ${vendor.name}`}
          style={btnStyle}
        >
          Call
        </a>
      )}
      {mailHref && (
        <a
          href={mailHref}
          aria-label={`Email ${vendor.name}`}
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
function NextActionCard({ vendor, accent, nextAction, onPatchVendor, onAddLog, onEdit, eventId, userId, expandedKind: extExpandedKind, setExpandedKind: extSetExpandedKind }) {
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
      <div style={{
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: P.textTertiary, marginBottom: 6, fontFamily: FF,
      }}>
        Next action
      </div>
      <div style={{
        fontSize: 14, fontWeight: type.weight.semibold,
        color: P.textPrimary, fontFamily: FF, lineHeight: 1.35,
      }}>
        {nextAction.title}
      </div>
      <div style={{
        fontSize: 12, color: P.textSecondary, fontFamily: FF,
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
              fontSize: 11, fontWeight: type.weight.semibold,
              fontFamily: FF, letterSpacing: '0.06em', textTransform: 'uppercase',
              opacity: isDone ? 0.85 : 1,
              transition: 'background 200ms ease',
            }}
          >
            {isDone ? doneState.label : step.ctaLabel}
          </button>
          {step.editHint && !isDone && (
            <span style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
              {step.editHint}
            </span>
          )}
          {isDone && step.kind !== 'edit' && (
            <span style={{ fontSize: 10, color: P.textTertiary, fontFamily: FF, fontStyle: 'italic' }}>
              Logged to activity feed.
            </span>
          )}
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
          <div style={{ fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary }}>
            {step.amountLabel}
          </div>
          <div style={{ fontSize: 18, fontWeight: type.weight.semibold, color: P.textPrimary }}>
            ${amt.toLocaleString()}
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel payment flow"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: P.textTertiary, fontFamily: FF,
            padding: '4px 8px',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Method picker — Sprint 57d: htmlFor association for screen readers */}
      <label htmlFor={`pay-method-${vendor.id}`} style={{ display: 'block', fontSize: 10, color: P.textTertiary, marginBottom: 4, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: type.weight.semibold }}>
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
          fontSize: 13, fontFamily: FF, outline: 'none', cursor: 'pointer',
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
          <div style={{ fontSize: 11, color: P.textSecondary, marginBottom: 6, lineHeight: 1.45 }}>
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
                fontSize: 11, fontWeight: type.weight.bold,
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
                fontSize: 11, fontWeight: type.weight.semibold,
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
          fontSize: 11, color: P.amber,
        }}>
          No {method} handle on file for this vendor — open the Edit modal to add it, or pick a different method.
        </div>
      ) : (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`,
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, marginBottom: space[3],
          fontSize: 11, color: P.textSecondary, lineHeight: 1.5,
        }}>
          {offlineMsg}
          {vendor.paymentNote && (
            <button
              onClick={() => copy(vendor.paymentNote, 'paynote')}
              style={{
                marginLeft: 6, background: 'none',
                border: `1px solid ${P.borderSubtle}`,
                borderRadius: radius.sm, cursor: 'pointer',
                fontSize: 9, color: P.textSecondary, padding: '2px 6px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              {copiedField === 'paynote' ? 'Copied ✓' : 'Copy note'}
            </button>
          )}
        </div>
      )}

      {/* "I sent it" confirmation */}
      <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap' }}>
        <button
          onClick={() => onConfirmSent(method, amt)}
          style={{
            padding: '7px 14px', borderRadius: radius.sm,
            border: 'none', cursor: 'pointer',
            background: P.green, color: '#070809',
            fontSize: 11, fontWeight: type.weight.semibold,
            letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FF,
          }}
        >
          I sent it · mark paid
        </button>
        <span style={{ fontSize: 10, color: P.textTertiary, fontStyle: 'italic', alignSelf: 'center' }}>
          Records the method used in the activity log.
        </span>
      </div>
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
        <div style={{ fontSize: 11, color: P.textSecondary }}>
          Three ways to handle this contract:
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel contract flow"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: P.textTertiary, fontFamily: FF, padding: '4px 8px',
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
        <div style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
          Paste contract link
        </div>
        <div style={{ fontSize: 11, color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
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
              fontSize: 12, fontFamily: FF, outline: 'none',
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
              fontSize: 10, fontWeight: type.weight.semibold,
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
        <div style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
          Email vendor about contract
        </div>
        <div style={{ fontSize: 11, color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
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
              fontSize: 10, fontWeight: type.weight.semibold,
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
          <div style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 6 }}>
            Upload file
          </div>
          <div style={{ fontSize: 11, color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
            PDF, image, or Word document — stored securely and attached to this vendor.
          </div>
          {uploadErr && (
            <div style={{ fontSize: 11, color: '#e63946', marginBottom: 8 }}>{uploadErr}</div>
          )}
          <div style={{ display: 'flex', gap: space[2], alignItems: 'center' }}>
            <label style={{
              padding: '6px 12px', borderRadius: radius.sm,
              border: `1px solid ${P.borderDef}`, cursor: uploading ? 'wait' : 'pointer',
              background: 'none', color: P.textPrimary,
              fontSize: 10, fontWeight: type.weight.semibold,
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
            <span style={{ fontSize: 10, color: P.textTertiary }}>Max 10 MB</span>
          </div>
        </div>
      )}

      {/* Option 4: Mark received offline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space[2] }}>
        <span style={{ fontSize: 11, color: P.textTertiary, fontStyle: 'italic' }}>
          Already received offline?
        </span>
        <button
          onClick={onMarkReceived}
          style={{
            padding: '6px 12px', borderRadius: radius.sm,
            border: `1px solid ${P.borderSubtle}`, cursor: 'pointer',
            background: 'none', color: P.textSecondary,
            fontSize: 10, fontWeight: type.weight.medium,
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
      <div style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: 8 }}>
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
            fontSize: 13, fontFamily: FF, outline: 'none',
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
            fontSize: 11, fontWeight: type.weight.semibold,
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
            fontSize: 11, color: P.textTertiary, fontFamily: FF, padding: '4px 8px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// 1 — Command Header
function CommandHeader({ vendor, event, readiness, stage, nextAction, onEdit, onPatchVendor, onAddLog, userId, expandedKind, setExpandedKind }) {
  const accent = levelColor(readiness.level);
  // Sprint 56 tone calm-down: "Vendor Cockpit" → "Vendor details". Internal
  // code references still call this the cockpit (the structural pattern); the
  // visible label uses the friendlier name so first-time planners aren't
  // greeted with aviation jargon.
  const labelText =
    readiness.level === 'critical' ? 'Vendor details · Critical'
    : readiness.level === 'attention' ? 'Vendor details · Follow up'
    : readiness.level === 'closed' ? 'Vendor details · Closed'
    : 'Vendor details';

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
          fontSize: 9, fontWeight: type.weight.semibold,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: accent, marginBottom: 6, fontFamily: FF,
        }}>
          {labelText}
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 22, fontWeight: type.weight.semibold,
              color: P.textPrimary, fontFamily: FF, lineHeight: 1.2,
            }}>
              {vendor.name || vendor.vendor_name}
            </div>
            <div style={{
              fontSize: 12, color: P.textSecondary, fontFamily: FF, marginTop: 4,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span>{vendor.category || vendor.type || 'Uncategorized'}</span>
              <span style={{ color: P.borderDef }}>·</span>
              <LevelChip level={readiness.level} label={readiness.label} />
              <span style={{ color: P.borderDef }}>·</span>
              <span style={{ color: P.textTertiary, fontStyle: 'italic' }}>{stage}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <ReachActions vendor={vendor} />
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Edit vendor details"
                style={{
                  background: 'none', border: `1px solid ${P.borderSubtle}`,
                  borderRadius: radius.sm, cursor: 'pointer',
                  fontSize: 11, fontWeight: type.weight.medium,
                  color: P.textSecondary, fontFamily: FF,
                  padding: '5px 10px',
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

function ReadinessSnapshot({ challenges, isOpen, onToggle }) {
  // Sprint 60.C: collapsible. Summary shows attention/critical counts so a
  // collapsed snapshot still surfaces signal.
  const cats = challenges ? Object.values(challenges) : [];
  const critical = cats.filter(c => c && c.level === 'critical').length;
  const attention = cats.filter(c => c && c.level === 'attention').length;
  const summary = critical > 0 ? `${critical} critical${attention > 0 ? ` · ${attention} attention` : ''}`
    : attention > 0 ? `${attention} need${attention === 1 ? 's' : ''} attention`
    : 'All categories OK';
  const summaryColor = critical > 0 ? P.red : attention > 0 ? P.amber : P.green;
  return (
    <CollapsibleSection label="Where this vendor stands" summary={summary} hintColor={summaryColor} isOpen={isOpen} onToggle={onToggle}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: space[3],
      }}>
        {Object.keys(CATEGORY_LABELS).map(key => {
          const c = challenges[key];
          if (!c) return null;
          const col = levelColor(c.level);
          return (
            <div key={key} style={{
              background: P.card,
              border: `1px solid ${P.borderSubtle}`,
              borderLeft: `2px solid ${col}`,
              borderRadius: radius.sm,
              padding: `${space[3]}px ${space[4]}px`,
              fontFamily: FF,
            }}>
              <div style={{
                fontSize: 9, fontWeight: type.weight.semibold,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: col, marginBottom: 4,
              }}>
                {CATEGORY_LABELS[key]}
              </div>
              <div style={{ fontSize: 11, color: P.textSecondary, lineHeight: 1.4 }}>
                {c.note}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

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
          <span style={{ color: P.steelBlue, fontSize: 11, width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{label}</span>
        </span>
        {collapsedHint && (
          <span style={{
            fontSize: 10,
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
  const [isOpen, setIsOpen] = useState(open > 0);
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
          <span style={{ color: P.steelBlue, fontSize: 11, width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
          <span style={{
            fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.steelBlue, fontFamily: FF,
          }}>{`Required Questions · ${cat}`}</span>
        </span>
        <span style={{
          fontSize: 10,
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
    { key: 'timeline', label: 'Timeline / Run-of-Show', empty: 'No linked timeline items yet.', tab: 'Run of Show' },
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
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  textAlign: 'left', fontFamily: FF,
                  marginBottom: isOpen ? 6 : 0,
                }}
              >
                <span style={{ color: P.textTertiary, fontSize: 11, width: 12, display: 'inline-block' }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{
                  fontSize: 10, fontWeight: type.weight.semibold,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  color: P.textTertiary,
                }}>
                  {g.label} {items.length > 0 && <span style={{ color: P.textSecondary }}>· {items.length}</span>}
                </span>
              </button>
              {isOpen && (items.length === 0 ? (
                <div style={{ fontSize: 12, color: P.textTertiary, fontStyle: 'italic', paddingLeft: 18 }}>
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
                          padding: '3px 0', fontSize: 12, color: P.textPrimary,
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
                            fontSize: 12, color: P.textPrimary, transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = P.borderSubtle + '55'; e.currentTarget.style.borderColor = P.borderSubtle; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                          {it.note && <span style={{ color: P.textTertiary, flexShrink: 0, fontSize: 11 }}>{it.note}</span>}
                          <span style={{ color: P.textTertiary, fontSize: 11, flexShrink: 0 }}>→</span>
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
            <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, marginBottom: 2 }}>Contract</div>
            <div style={{ fontSize: 11, color: contractConsequence ? P.textSecondary : P.textTertiary, lineHeight: 1.4 }}>
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
                  style={{ fontSize: 11, fontWeight: type.weight.semibold, color: P.accent, textDecoration: 'none', padding: `3px ${space[3]}px`, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm }}
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
                    style={{ fontSize: 10, fontWeight: type.weight.semibold, color: P.textSecondary, background: 'transparent', border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm, padding: `3px ${space[3]}px`, cursor: 'pointer', fontFamily: FF }}
                  >
                    {extracting ? '⏳ Analyzing…' : '✨ Analyze with AI'}
                  </button>
                )}
              </div>
            )}
            <span style={{
              fontSize: 10, fontWeight: type.weight.semibold,
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
          <div style={{ fontSize: 11, color: P.red, padding: `${space[2]}px 0` }}>{extractErr}</div>
        )}
        {extracted && (
          <div style={{ background: P.canvas, border: `1px solid ${P.borderSubtle}`, borderRadius: radius.sm, padding: space[4], marginBottom: space[3] }}>
            <div style={{ fontSize: 9, fontWeight: type.weight.semibold, letterSpacing: '0.10em', textTransform: 'uppercase', color: P.textTertiary, marginBottom: space[3], display: 'flex', justifyContent: 'space-between' }}>
              <span>✨ AI-EXTRACTED · Verify against original document</span>
              <button onClick={() => setExtracted(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textTertiary, fontFamily: FF, fontSize: 11 }}>×</button>
            </div>
            {extracted.action_items?.length > 0 && (
              <div style={{ marginBottom: space[3] }}>
                <div style={{ fontSize: 10, color: P.textTertiary, fontWeight: type.weight.semibold, marginBottom: space[2] }}>ACTION ITEMS</div>
                {extracted.action_items.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: space[2], fontSize: 11, color: a.priority === 'high' ? P.red : P.textSecondary, marginBottom: 3 }}>
                    <span>{a.priority === 'high' ? '🔴' : a.priority === 'medium' ? '🟡' : '⚪'}</span>
                    <span>{a.task}{a.due_date ? ` — ${a.due_date}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {extracted.key_dates?.length > 0 && (
              <div style={{ marginBottom: space[3] }}>
                <div style={{ fontSize: 10, color: P.textTertiary, fontWeight: type.weight.semibold, marginBottom: space[2] }}>KEY DATES</div>
                {extracted.key_dates.map((d, i) => (
                  <div key={i} style={{ fontSize: 11, color: P.textSecondary, marginBottom: 2 }}>{d.label}: {d.date}</div>
                ))}
              </div>
            )}
            {extracted.cancellation_policy && (
              <div style={{ fontSize: 10, color: P.textTertiary, lineHeight: 1.4 }}>{extracted.cancellation_policy}</div>
            )}
            {extracted.disclaimer && (
              <div style={{ fontSize: 9, color: P.textTertiary, fontStyle: 'italic', marginTop: space[3] }}>{extracted.disclaimer}</div>
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
            <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary, marginBottom: 2 }}>COI / Insurance</div>
            <div style={{ fontSize: 11, color: P.textTertiary }}>{vendor.insuranceStatus || 'Not on file'}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', color: vendor.insuranceStatus ? P.success : P.textTertiary }}>
            {vendor.insuranceStatus ? 'On file' : 'Not tracked'}
          </span>
        </div>

        {/* Invoice + other docs */}
        {[{ label: 'Invoice', key: 'invoiceUrl' }, { label: 'Menu / rider / floorplan', key: 'menuUrl' }].map(({ label, key }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: space[4], padding: `${space[4]}px 0`,
            borderBottom: label !== 'Menu / rider / floorplan' ? `1px solid ${P.borderSubtle}` : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: type.weight.semibold, color: P.textPrimary }}>{label}</div>
            </div>
            <span style={{ fontSize: 10, color: P.textTertiary, fontStyle: 'italic' }}>Not attached</span>
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
        fontSize: 13, color: vendor.notes ? P.textPrimary : P.textTertiary,
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
            <div style={{ fontSize: 10, fontWeight: type.weight.semibold, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.textTertiary }}>
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
                  fontSize: 9, color: P.textTertiary, fontFamily: FF,
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
              fontSize: 13, color: P.textPrimary, fontFamily: FF,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] }}>
            <span style={{ fontSize: 10, color: P.textTertiary }}>
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
                fontSize: 11, fontWeight: type.weight.semibold,
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
            fontSize: 12, color: P.textTertiary, fontFamily: FF, textAlign: 'center',
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
                fontSize: 10, fontWeight: type.weight.semibold,
                color: P.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {entry.date || '—'}
              </span>
              {entry.derived && (
                <span style={{
                  fontSize: 9, fontWeight: type.weight.medium,
                  color: P.amber, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  Auto
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: P.textPrimary, lineHeight: type.leading.relaxed }}>
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
          fontSize: 9, fontWeight: type.weight.semibold,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: P.amber, marginBottom: 4,
        }}>
          Headcount Mismatch
        </div>
        <div style={{ fontSize: 13, color: P.textPrimary, lineHeight: 1.4 }}>
          Caterer holds <strong>{event.catererCount}</strong>; now <strong>{confirmedCount}</strong> confirmed
          {' '}
          <span style={{ color: P.textSecondary }}>
            ({driftDelta > 0 ? `+${driftDelta}` : driftDelta})
          </span>
        </div>
      </div>
      <button
        onClick={() => onMarkCatererUpdated(vendor.id, confirmedCount)}
        style={{
          padding: '6px 14px', borderRadius: radius.sm,
          border: 'none', cursor: 'pointer',
          background: P.amber, color: '#070809',
          fontSize: 11, fontWeight: type.weight.semibold,
          fontFamily: FF, letterSpacing: '0.04em', textTransform: 'uppercase',
          flexShrink: 0,
        }}
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
          fontSize: 10, fontWeight: type.weight.semibold,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: 9 }}>{open ? '▼' : '▶'}</span>
        {label} · {items.length}
      </button>
      {open && (
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 18px', listStyle: 'none' }}>
          {items.map((it, i) => (
            <li key={i} style={{
              fontSize: 11, color: P.textSecondary,
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
        fontSize: 12, color: P.textPrimary, fontFamily: FF,
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
          fontSize: 10, fontWeight: type.weight.semibold,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: copied ? P.canvas : P.textSecondary,
          fontFamily: FF, padding: '5px 12px',
        }}
      >
        {copied ? 'Copied' : 'Copy draft'}
      </button>
    </div>
  );
}

function ReadinessCopilotSection({ vendor, event, aiAvailable, onAskAi, isOpen, onToggle }) {
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
        <span style={{ fontSize: 11, color: P.textTertiary, fontStyle: 'italic' }}>
          Readiness copilot dismissed for this session.
        </span>
        <button
          onClick={() => setDismissed(false)}
          style={{
            background: 'none', border: `1px solid ${P.borderSubtle}`,
            borderRadius: radius.sm, cursor: 'pointer',
            fontSize: 10, fontWeight: type.weight.semibold,
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
  const sourceLabel = preview.source === 'ai'
    ? 'AI-enhanced readiness brief · grounded in your data'
    : (aiAvailable
        ? 'Rule-based readiness preview · click Generate AI version to enhance'
        : 'Rule-based readiness preview · AI connection not enabled yet');
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
            fontSize: 9, fontWeight: type.weight.semibold,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: sourceColor, marginBottom: 4,
          }}>
            Quick read
          </div>
          <div style={{ fontSize: 10, color: P.textTertiary, fontStyle: 'italic' }}>
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
                fontSize: 10, fontWeight: type.weight.semibold,
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
              fontSize: 10, fontWeight: type.weight.medium,
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
          fontSize: 11, color: P.amber, marginBottom: space[3],
          fontStyle: 'italic',
        }}>
          {aiError}
        </div>
      )}

      {/* Headline + summary */}
      <div style={{
        fontSize: 15, fontWeight: type.weight.semibold,
        color: P.textPrimary, lineHeight: 1.35, marginBottom: 6,
      }}>
        {preview.headline}
      </div>
      <div style={{
        fontSize: 12, color: P.textSecondary, lineHeight: 1.55,
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
                  fontSize: 12, color: P.textPrimary, lineHeight: 1.5,
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
                  fontSize: 12, color: P.textPrimary, lineHeight: 1.5,
                  marginBottom: 6, paddingLeft: 14, position: 'relative',
                }}>
                  <span style={{ position: 'absolute', left: 0, color: P.red, fontWeight: 700 }}>·</span>
                  <div>{r.risk}</div>
                  {r.consequence && (
                    <div style={{ color: P.textTertiary, fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>
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
                fontSize: 12, color: P.textPrimary, lineHeight: 1.5,
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
            fontSize: 9, fontWeight: type.weight.semibold,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.amber, marginBottom: 4,
          }}>
            Suggested next action
          </div>
          <div style={{
            fontSize: 13, fontWeight: type.weight.semibold,
            color: P.textPrimary, lineHeight: 1.35,
          }}>
            {preview.nextAction.title}
          </div>
          {preview.nextAction.consequence && (
            <div style={{
              fontSize: 11, color: P.textSecondary,
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
            <div style={{ fontSize: 10, color: P.textTertiary, fontStyle: 'italic', marginTop: 6 }}>
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
      fontSize: 9, fontWeight: type.weight.semibold,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      color: color || P.textTertiary, marginBottom: 6,
    }}>
      {label}{typeof count === 'number' ? ` · ${count}` : ''}
    </div>
  );
}

function EmptyLine({ text }) {
  return (
    <div style={{ fontSize: 11, color: P.textTertiary, fontStyle: 'italic' }}>
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
function MobileVendorSummary({ vendor, nextAction, challenges, onPrimary, onEdit }) {
  const cat = vendor.category || 'Vendor';
  const status = vendor.status || 'Considering';

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
  const ctaFill = 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)';
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
          fontSize: 9.5, fontWeight: type.weight.semibold,
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
              borderRadius: radius.sm, color: P.textSecondary, fontSize: 11,
              padding: '4px 10px', cursor: 'pointer', fontFamily: FF, flexShrink: 0,
            }}
          >Edit</button>
        )}
      </div>

      {/* Headline */}
      <h2 style={{
        margin: `${space[3]}px 0 ${space[2]}px`,
        fontSize: 22, fontWeight: type.weight.bold,
        letterSpacing: '-0.02em', lineHeight: 1.2,
        color: P.textPrimary,
      }}>
        {headline}
      </h2>

      {/* Category / status meta */}
      <div style={{ fontSize: 12, color: P.textTertiary, marginBottom: space[3] }}>
        {cat} · {status}
      </div>

      {/* Body — why it matters */}
      <p style={{
        margin: `0 0 ${space[4]}px`,
        fontSize: 14, lineHeight: 1.5,
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
            minHeight: 54,
            padding: '14px 18px',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            background: ctaFill,
            color: '#e8edf2',
            fontSize: 16,
            fontWeight: type.weight.semibold,
            fontFamily: FF,
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: ctaShadow,
            textShadow: '0 1px 0 rgba(0,0,0,0.25)',
          }}
        >
          {ctaLabel} <span style={{ fontSize: 12, opacity: 0.85 }}>→</span>
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
              fontSize: 13, fontWeight: type.weight.medium,
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
              fontSize: 13, fontWeight: type.weight.medium,
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
              fontSize: 13, fontWeight: type.weight.medium,
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
  const collapseDefaults = isMobile
    ? { readinessSnapshot: false, readinessCopilot: false, documents: false, notes: false, activity: false }
    : { readinessSnapshot: hasReadinessSignal, readinessCopilot: false, documents: contractHasIssue, notes: false, activity: false };
  const [collapse, setCollapse] = useStickyVendorCollapse(vendor.id, collapseDefaults);
  const toggle = (key) => setCollapse(prev => ({ ...prev, [key]: !prev[key] }));

  // Vendor Readiness v2: address-row router. Status rows from PhaseSection
  // and RequiredQuestionsSection route through here. For payment / contract /
  // arrival, we drive the NextActionCard's inline expand. For contact /
  // scope / vendor-status (no inline panel today), we fall back to the
  // canonical vendor edit modal.
  const addressRow = (row) => {
    const key = row?.key;
    const targetKind = (key === 'deposit' || key === 'balance' || key === 'payment-overdue') ? 'payment'
      : (key === 'contract' || key === 'documents') ? 'contract'
      : (key === 'arrival' || key === 'expectedArrival') ? 'arrival'
      : null;
    if (targetKind) {
      setExpandedKind(targetKind);
      setFlashSection('nextAction');
      setTimeout(() => setFlashSection(null), 2000);
      if (nextActionRef.current && nextActionRef.current.scrollIntoView) {
        nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (onEdit) onEdit();
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
        nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (openSection === 'payment' || openSection === 'contract' || openSection === 'arrival') {
      setExpandedKind(openSection);
      // Contract also expands the Documents collapsible so the planner sees
      // the contract row context after the inline panel.
      if (openSection === 'contract') {
        setCollapse(prev => ({ ...prev, documents: true }));
      }
      setFlashSection('nextAction');
      setTimeout(() => setFlashSection(null), 2000);
      if (nextActionRef.current && nextActionRef.current.scrollIntoView) {
        nextActionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      background: P.canvas, overflow: 'hidden',
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
        />
      </div>

      <div ref={scrollContainerRef} style={{
        flex: 1, overflowY: 'auto',
        padding: `${space[2]}px ${space[6]}px ${space[7]}px`,
      }}>
        {isMobile && (
          <MobileVendorSummary
            vendor={vendor}
            nextAction={nextAction}
            challenges={challenges}
            onPrimary={summaryPrimary}
            onEdit={onEdit}
          />
        )}
        <CatererDriftBanner vendor={vendor} event={event} onMarkCatererUpdated={onMarkCatererUpdated} />

        <ReadinessCopilotSection
          vendor={vendor} event={event}
          aiAvailable={aiAvailable}
          onAskAi={onAskAi}
          isOpen={collapse.readinessCopilot}
          onToggle={() => toggle('readinessCopilot')}
        />

        <ReadinessSnapshot
          challenges={challenges}
          isOpen={collapse.readinessSnapshot}
          onToggle={() => toggle('readinessSnapshot')}
        />

        <PhaseSection label="Planning" hint="Before the event" rows={planning} defaultOpen={!isMobile} onAddressRow={addressRow} />
        <PhaseSection label="The Day Of" hint="When the event is live" rows={dayOf} defaultOpen={false} onAddressRow={addressRow} />
        <PhaseSection label="Wrap Up" hint="After the event" rows={closeout} defaultOpen={false} onAddressRow={addressRow} />

        <div ref={questionsRef} style={flashStyle('questions')}>
          <RequiredQuestionsSection vendor={vendor} questions={questions} onAddressRow={addressRow} />
        </div>
        <LinkedWorkSection linked={linked} onRouteToLinked={onRouteToLinked} />
        <div ref={documentsRef} style={flashStyle('documents')}>
          <DocumentsSection vendor={vendor} event={event} isOpen={collapse.documents} onToggle={() => toggle('documents')} />
        </div>
        <div ref={notesRef} style={flashStyle('notes')}>
          <NotesSection vendor={vendor} isOpen={collapse.notes} onToggle={() => toggle('notes')} />
        </div>
        <div ref={activityRef} style={flashStyle('activity')}>
          <ActivityLogSection vendor={vendor} onAddLog={onAddLog} isOpen={collapse.activity} onToggle={() => toggle('activity')} />
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
      <div style={{ fontSize: 13, fontWeight: type.weight.medium, color: P.textSecondary, fontFamily: FF }}>
        {count > 0 ? 'Select a vendor to view their details' : 'No vendors added yet'}
      </div>
      <div style={{ fontSize: 11, color: P.textTertiary, fontFamily: FF, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
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
  event, isMobile,
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
  const eventConflicts = useMemo(() => deriveVendorPromiseConflicts(event, []), [event]);

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

  function handleSelect(v) {
    setSelected(v);
    if (isMobile) setMobileView('detail');
  }

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
        style={{
          background: 'transparent', border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.sm, cursor: 'pointer',
          fontSize: 11, fontWeight: type.weight.medium,
          color: P.textSecondary, fontFamily: FF,
          padding: '4px 10px',
        }}
      >
        ← Command Center
      </button>
      <span style={{
        fontSize: 9, fontWeight: type.weight.semibold,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: P.textTertiary, fontFamily: FF,
      }}>
        Vendors
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {workspaceHeader}
        <VendorCommandStrip vendors={vendors} event={event} onSelectVendor={handleSelect} />
        <ConflictsStrip conflicts={eventConflicts} vendors={vendors} onSelectVendor={handleSelect} />
        {mobileView === 'list' ? (
          <VendorList
            vendors={vendors}
            selected={selected}
            onSelect={handleSelect}
            event={event}
            isMobile
            onAdd={onAddVendor}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <button
              onClick={() => setMobileView('list')}
              style={{
                height: 38, flexShrink: 0,
                background: P.base,
                border: 'none', borderBottom: `1px solid ${P.borderSubtle}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 16px',
                fontSize: 12, color: P.textSecondary, fontFamily: FF,
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
                openSection={openSection}
                sectionPing={sectionPing}
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
      {workspaceHeader}
      <VendorCommandStrip vendors={vendors} event={event} onSelectVendor={handleSelect} />
      <ConflictsStrip conflicts={eventConflicts} vendors={vendors} onSelectVendor={handleSelect} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <VendorList
          vendors={vendors}
          selected={selected}
          onSelect={handleSelect}
          event={event}
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
            openSection={openSection}
            sectionPing={sectionPing}
          />
        ) : (
          <NoSelection count={vendors.length} />
        )}
      </div>
    </div>
  );
}
