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

import { useState, useEffect, useMemo, useContext } from 'react';
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

function StatusRow({ label, value, status, consequence }) {
  const v = rowStatusVisual(status);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: `${space[3]}px 0`,
      borderBottom: `1px solid ${P.borderSubtle}`,
    }}>
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
        <div style={{ fontSize: 12, color: P.textSecondary, fontFamily: FF, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: type.weight.medium, color: status === 'done' ? P.textPrimary : v.color, fontFamily: FF }}>
          {value}
        </div>
        {consequence && (
          <div style={{ fontSize: 11, color: P.textTertiary, fontFamily: FF, marginTop: 3, lineHeight: 1.45, fontStyle: 'italic' }}>
            {consequence}
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
          <div style={{
            fontSize: 9, fontWeight: type.weight.semibold,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: accent, marginBottom: 4,
          }}>
            Vendor Readiness
          </div>
          <div style={{ fontSize: 15, fontWeight: type.weight.semibold, color: P.textPrimary, lineHeight: 1.3 }}>
            {headline}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: P.textSecondary, marginTop: 3 }}>
              {sub}
            </div>
          )}
        </div>

        {topRisk && topRisk.readiness.level !== 'safe' && topRisk.readiness.level !== 'closed' && (
          <button
            onClick={() => onSelectVendor && onSelectVendor(topRisk.vendor)}
            style={{
              padding: '8px 16px', borderRadius: radius.sm,
              border: 'none', cursor: 'pointer',
              background: accent, color: '#070809',
              fontSize: 11, fontWeight: type.weight.semibold,
              fontFamily: FF, letterSpacing: '0.04em', textTransform: 'uppercase',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            Start with {topRisk.vendor.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Vendor list (left column) — risk-aware ──────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function VendorRow({ vendor, event, isSelected, onSelect }) {
  const readiness = useMemo(() => getVendorReadiness(vendor, event), [vendor, event]);
  const stage = useMemo(() => getVendorLifecycleStage(vendor, event), [vendor, event]);
  const next = useMemo(() => getVendorNextAction(vendor, event), [vendor, event]);
  const isCritical = readiness.level === 'critical';
  const isAttention = readiness.level === 'attention';

  // Highest-risk vendor gets an extra emphasis line — but no neon, no glow.
  const emphasis = isCritical;
  const leftStrip = isCritical ? P.red : (isAttention ? P.amber : (isSelected ? P.green : 'transparent'));

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
        </div>
        {next && (isCritical || isAttention) && (
          <div style={{
            fontSize: 10, color: levelColor(readiness.level),
            marginTop: 4, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            → {next.title}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, paddingTop: 1 }}>
        <span style={{
          fontSize: 8, fontWeight: type.weight.semibold,
          letterSpacing: '0.10em', color: levelColor(readiness.level),
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {readiness.label.replace('Ready for day-of', 'Ready').replace('Needs follow-up', 'Follow up').replace('Day-of follow-up', 'Day-of')}
        </span>
      </div>
    </button>
  );
}

function VendorList({ vendors, selected, onSelect, event, isMobile, onFilter, onAdd }) {
  // Sort: critical first, then attention, then safe, then not_started/closed
  const sorted = useMemo(() => {
    const rank = { critical: 0, attention: 1, not_started: 2, safe: 3, closed: 4 };
    return [...vendors]
      .map(v => ({ v, r: getVendorReadiness(v, event) }))
      .sort((a, b) => (rank[a.r.level] ?? 9) - (rank[b.r.level] ?? 9))
      .map(x => x.v);
  }, [vendors, event]);

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
          {vendors.length} VENDORS · Ranked by risk
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
          {onFilter && (
            <button
              onClick={onFilter}
              style={{
                background: 'none', border: `1px solid ${P.borderSubtle}`,
                borderRadius: radius.sm, cursor: 'pointer',
                fontSize: 10, fontWeight: type.weight.medium,
                color: P.textSecondary, fontFamily: FF,
                padding: '2px 8px',
              }}
            >
              Filter
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {vendors.length === 0 ? (
          <div style={{ padding: space[7], textAlign: 'center', fontSize: 12, color: P.textTertiary, fontFamily: FF }}>
            No vendors added yet
          </div>
        ) : sorted.map(v => (
          <VendorRow
            key={v.id || v.name}
            vendor={v}
            event={event}
            isSelected={selected?.id === v.id || (selected && !v.id && selected.name === v.name)}
            onSelect={onSelect}
          />
        ))}
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
function NextActionCard({ vendor, accent, nextAction, onPatchVendor, onAddLog, onEdit, eventId, userId }) {
  const step = useMemo(() => getActionableNextStep(nextAction, vendor), [nextAction, vendor]);
  const [doneState, setDoneState] = useState(null);
  const [expandedKind, setExpandedKind] = useState(null); // 'payment' | 'contract' | 'arrival'
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
            if (onAddLog) onAddLog(vendor.id, `Contract sent to ${vendor.contact || vendor.name} for signature.`);
            flashDone('Logged');
          }}
          onUploadFile={({ storagePath, fileName, fileSize }) => {
            if (onPatchVendor) onPatchVendor(vendor.id, {
              contractStoragePath: storagePath,
              contractFileName: fileName,
              contractFileSize: fileSize,
              // contractSigned intentionally NOT set here — uploading a file
              // does not mean the contract is signed. Planner marks it signed
              // separately after confirming signatures exist.
            });
            if (onAddLog) onAddLog(vendor.id, `Contract file uploaded: ${fileName} (${Math.round((fileSize || 0) / 1024)}KB) — mark signed once you confirm signatures.`);
            flashDone('Contract uploaded');
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
                background: accent, color: '#070809', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: type.weight.semibold,
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
          Send for signature
        </div>
        <div style={{ fontSize: 11, color: P.textSecondary, marginBottom: 8, lineHeight: 1.45 }}>
          {mailtoHref
            ? 'Opens your mail client with a templated message to the vendor contact.'
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
                      setUploadErr(result.error || 'Upload failed — try again');
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
function CommandHeader({ vendor, event, readiness, stage, nextAction, onEdit, onPatchVendor, onAddLog, userId }) {
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

function ReadinessSnapshot({ challenges }) {
  return (
    <div>
      <SectionHeading label="Readiness Snapshot" hint="9 categories" />
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
    </div>
  );
}

// 3/4/5 — Phase sections (Planning / Day-Of / Closeout)
function PhaseSection({ label, hint, rows }) {
  return (
    <div>
      <SectionHeading label={label} hint={hint} />
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: `0 ${space[5]}px`,
      }}>
        {rows.map((r, i) => (
          <StatusRow
            key={r.key}
            label={r.label}
            value={r.value}
            status={r.status}
            consequence={r.consequence}
          />
        ))}
      </div>
    </div>
  );
}

// 6 — Required Questions
function RequiredQuestionsSection({ vendor, questions }) {
  const cat = vendor.category || 'this vendor';
  const open = questions.filter(q => q.status !== 'answered').length;
  return (
    <div>
      <SectionHeading
        label={`Required Questions · ${cat}`}
        hint={open > 0 ? `${open} unanswered` : 'All answered'}
      />
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: `0 ${space[5]}px`,
      }}>
        {questions.map(q => {
          const status = q.status === 'answered' ? 'done' : (q.status === 'missing' ? 'missing' : 'not_tracked');
          return (
            <StatusRow
              key={q.key}
              label={q.question}
              value={q.value || (q.status === 'answered' ? 'Confirmed' : 'Not tracked yet')}
              status={status}
              consequence={q.consequence}
            />
          );
        })}
      </div>
    </div>
  );
}

// 7 — Linked Event Work
function LinkedWorkSection({ linked }) {
  const groups = [
    { key: 'timeline', label: 'Timeline / Run-of-Show', empty: 'No linked timeline items yet.' },
    { key: 'decisions', label: 'Decisions / Approvals', empty: 'No linked decisions yet.' },
    { key: 'tasks', label: 'Planning Tasks', empty: 'No linked planning tasks yet.' },
    { key: 'communication', label: 'Communication', empty: 'No linked messages yet.' },
    { key: 'budget', label: 'Budget Items', empty: 'No linked budget items yet.' },
    { key: 'documents', label: 'Linked Documents', empty: 'No linked documents yet.' },
  ];
  return (
    <div>
      <SectionHeading label="Linked Event Work" hint="What depends on this vendor" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
        {groups.map(g => {
          const items = linked[g.key] || [];
          return (
            <div key={g.key} style={{
              background: P.card, border: `1px solid ${P.borderSubtle}`,
              borderRadius: radius.md, padding: `${space[3]}px ${space[5]}px`,
              fontFamily: FF,
            }}>
              <div style={{
                fontSize: 10, fontWeight: type.weight.semibold,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: P.textTertiary, marginBottom: 6,
              }}>
                {g.label} {items.length > 0 && <span style={{ color: P.textSecondary }}>· {items.length}</span>}
              </div>
              {items.length === 0 ? (
                <div style={{ fontSize: 12, color: P.textTertiary, fontStyle: 'italic' }}>
                  {g.empty}
                </div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {items.map((it, i) => (
                    <li key={it.id || i} style={{
                      display: 'flex', justifyContent: 'space-between', gap: 12,
                      padding: '3px 0', fontSize: 12, color: P.textPrimary,
                    }}>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.label}
                      </span>
                      {it.note && (
                        <span style={{ color: P.textTertiary, flexShrink: 0 }}>
                          {it.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 8 — Documents (honest until file storage)
function DocumentsSection({ vendor }) {
  const contractSigned = vendor.contractSigned === true || vendor.contract_signed === true;
  const items = [
    { label: 'Contract', status: contractSigned ? 'done' : 'missing', value: contractSigned ? 'Signed (no file storage yet)' : 'Not attached' },
    { label: 'Invoice', status: 'not_tracked', value: 'Not attached' },
    { label: 'COI / Insurance', status: vendor.insuranceStatus ? 'done' : 'not_tracked', value: vendor.insuranceStatus || 'Not attached' },
    { label: 'Proposal', status: 'not_tracked', value: 'Not attached' },
    { label: 'Menu / rider / floorplan', status: 'not_tracked', value: 'Not attached' },
  ];
  return (
    <div>
      <SectionHeading label="Documents" hint="File uploads coming next" />
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: `0 ${space[5]}px`,
      }}>
        {items.map((it, i) => (
          <StatusRow
            key={it.label}
            label={it.label}
            value={it.value}
            status={it.status}
            consequence={i === 0 && it.status === 'missing' ? 'Booking record is incomplete without a contract on file.' : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// 9 — Notes
function NotesSection({ vendor }) {
  return (
    <div>
      <SectionHeading label="Notes" />
      <div style={{
        background: P.card, border: `1px solid ${P.borderSubtle}`,
        borderRadius: radius.md, padding: space[5], minHeight: 80,
        fontSize: 13, color: vendor.notes ? P.textPrimary : P.textTertiary,
        fontFamily: FF, lineHeight: type.leading.relaxed,
        whiteSpace: 'pre-wrap',
      }}>
        {vendor.notes || 'No notes for this vendor.'}
      </div>
    </div>
  );
}

// 10 — Activity log (preserves Sprint 50 functionality)
function ActivityLogSection({ vendor, onAddLog }) {
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

  return (
    <div>
      <SectionHeading label="Activity Log" hint={feed.length > 0 ? `${feed.length} entr${feed.length === 1 ? 'y' : 'ies'}` : undefined} />
      {onAddLog && (
        <div style={{
          background: P.card, border: `1px solid ${P.borderSubtle}`,
          borderRadius: radius.md, padding: space[4], marginBottom: space[3],
          fontFamily: FF,
        }}>
          <div style={{
            fontSize: 10, fontWeight: type.weight.semibold,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: P.textTertiary, marginBottom: space[3],
          }}>
            Log Activity · {today}
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
    </div>
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

function ReadinessCopilotSection({ vendor, event, aiAvailable, onAskAi }) {
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

  return (
    <div style={{
      marginTop: space[5], marginBottom: space[5],
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
            Readiness Copilot
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
function VendorDetail({ vendor, event, onEdit, onAddLog, onMarkCatererUpdated, onPatchVendor, aiAvailable, onAskAi, userId }) {
  const readiness = useMemo(() => getVendorReadiness(vendor, event), [vendor, event]);
  const stage = useMemo(() => getVendorLifecycleStage(vendor, event), [vendor, event]);
  const nextAction = useMemo(() => getVendorNextAction(vendor, event), [vendor, event]);
  const challenges = useMemo(() => getVendorChallengeSummary(vendor, event), [vendor, event]);
  const planning = useMemo(() => getVendorPlanningState(vendor, event), [vendor, event]);
  const dayOf = useMemo(() => getVendorDayOfState(vendor, event), [vendor, event]);
  const closeout = useMemo(() => getVendorCloseoutState(vendor, event), [vendor, event]);
  const questions = useMemo(() => getVendorRequiredQuestions(vendor, event), [vendor, event]);
  const linked = useMemo(() => getVendorLinkedWork(vendor, event), [vendor, event]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: P.canvas, overflow: 'hidden',
    }}>
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
      />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `${space[2]}px ${space[6]}px ${space[7]}px`,
      }}>
        <CatererDriftBanner vendor={vendor} event={event} onMarkCatererUpdated={onMarkCatererUpdated} />

        <ReadinessCopilotSection
          vendor={vendor} event={event}
          aiAvailable={aiAvailable}
          onAskAi={onAskAi}
        />

        <ReadinessSnapshot challenges={challenges} />

        <PhaseSection label="Planning" hint="Before the event" rows={planning} />
        <PhaseSection label="The Day Of" hint="When the event is live" rows={dayOf} />
        <PhaseSection label="Wrap Up" hint="After the event" rows={closeout} />

        <RequiredQuestionsSection vendor={vendor} questions={questions} />
        <LinkedWorkSection linked={linked} />
        <DocumentsSection vendor={vendor} />
        <NotesSection vendor={vendor} />
        <ActivityLogSection vendor={vendor} onAddLog={onAddLog} />
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
}) {
  const auth = useContext(AuthCtx);
  const userId = auth?.user?.id || 'anon';
  const vendors = useMemo(() => event.vendors || [], [event.vendors]);

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
                onEdit={onEditVendor ? () => onEditVendor(selected) : undefined}
                onAddLog={onAddLog}
                onMarkCatererUpdated={onMarkCatererUpdated}
                onPatchVendor={onPatchVendor}
                aiAvailable={aiAvailable}
                onAskAi={onAskAi}
                userId={userId}
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
          />
        ) : (
          <NoSelection count={vendors.length} />
        )}
      </div>
    </div>
  );
}
