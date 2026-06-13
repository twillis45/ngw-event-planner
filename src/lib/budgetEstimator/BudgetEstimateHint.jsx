// ─── BudgetEstimateHint shared component ───────────────────────────────────
// Sprint 61.G. Surfaces a planning-grade total range with confidence + a
// "Not included" disclosure. Same math wherever it's placed (NewEvent /
// Client Intake / NewClient / Vendor cockpit).
//
// Honest about confidence. Honest about exclusions. Never claims contract.
//
// Required: { type, guestCount }
// Optional: { date, timeOfDay, profile, userBudget, palette, compact }
//
// `palette` provides the local theme colors so this component can render
// inside Studio Matte (Mid Carbon) or any host-supplied theme without
// importing ThemeCtx.

import { estimatorConfidence, NOT_INCLUDED } from './confidence.js';
import { estimateTotalRange } from './totalEstimate.js';
import { carbonBody, carbonPanel, carbonBorder } from '../../theme/palette';

const DEFAULT_PALETTE = {
  bg:     carbonBody,   // tokenized canvas — follows ACTIVE_MODE
  card:   carbonPanel,  // tokenized card
  border: carbonBorder, // tokenized hairline
  text:   '#eef0f4',
  muted:  '#9098b0',
  accent: '#4E6877',  // steel-blue
  success: '#4FAE7A',
  warn:    '#ECA13F',
  danger:  '#E84036',
};

function fmtMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function BudgetEstimateHint({
  type,
  guestCount,
  date = null,
  timeOfDay = 'afternoon',
  profile = null,
  userBudget = null,
  palette = DEFAULT_PALETTE,
  compact = false,
}) {
  const guests = Math.max(0, Number(guestCount) || 0);
  if (!type || guests < 1) return null;

  // Sprint 61.G / 60.Y — shared total math (metroFactor neutral at 1.0 so we
  // never claim a market adjustment the component can't derive from the lib).
  const { lowTotal, highTotal } = estimateTotalRange({ type, guestCount: guests, date, timeOfDay, metroFactor: 1 });

  const conf = estimatorConfidence({
    hasType:       !!type,
    hasDate:       !!date,
    hasGuestCount: guests > 0,
    hasMarket:     !!(profile && profile.metroMarket),
    hasTimeOfDay:  !!timeOfDay,
    hasHistory:    false,
  });

  const confColor =
    conf.level === 'high'   ? palette.success
    : conf.level === 'medium' ? palette.warn
                              : palette.muted;

  const budgetN = Number(userBudget) || 0;
  const verdict =
    budgetN > 0 && budgetN < lowTotal  ? 'tight'
    : budgetN > highTotal              ? 'generous'
    : budgetN > 0                      ? 'in range'
                                       : null;
  const verdictColor =
    verdict === 'tight'    ? palette.warn
    : verdict === 'generous' ? palette.success
                             : palette.text;

  return (
    <div style={{
      background: `linear-gradient(180deg, ${palette.accent}14 0%, ${palette.accent}07 100%)`,
      border:     `1px solid ${palette.accent}33`,
      borderLeft: `3px solid ${palette.accent}`,
      borderRadius: 10,
      padding: compact ? '10px 12px' : '12px 14px',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
          color: palette.accent, textTransform: 'uppercase',
        }}>
          Budget estimate
        </span>
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: confColor,
          background:  `${confColor}14`,
          border:      `1px solid ${confColor}44`,
          padding: '1px 7px', borderRadius: 999,
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {conf.label}
        </span>
      </div>

      <div style={{
        fontSize: compact ? 13 : 14,
        fontWeight: 700,
        color: palette.text,
        letterSpacing: '-0.005em',
      }}>
        {type} · {guests} guests typically runs {fmtMoney(lowTotal)}–{fmtMoney(highTotal)}
      </div>

      <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 4, lineHeight: 1.5 }}>
        Anchored to per-head averages{profile?.metroMarket ? ', your saved metro' : ''}{date ? ', date factors' : ''}.
        {' '}{conf.level === 'low' && 'Adding date and metro will tighten the range.'}
      </div>

      {verdict && (() => {
        // Budget-stretch coaching (board 2026-06-12, Wanda dogfood): when the
        // budget is well UNDER the floor, "tight" undersells it — quantify the
        // gap and hand over concrete ways to stretch it, so the honest signal is
        // also actionable instead of just discouraging.
        const gap = Math.max(0, lowTotal - budgetN);
        const pct = lowTotal > 0 ? Math.round((budgetN / lowTotal) * 100) : 100;
        const wellUnder = verdict === 'tight' && budgetN < lowTotal * 0.7;
        return (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11.5, color: verdictColor, fontWeight: 600 }}>
              {verdict === 'tight'
                ? `Your ${fmtMoney(budgetN)} budget is ${wellUnder ? 'well under' : 'tight for'} this scope — ${fmtMoney(gap)} below the ${fmtMoney(lowTotal)} typical floor (≈${pct}%).`
                : verdict === 'generous' ? `Your ${fmtMoney(budgetN)} budget is generous for this scope.`
                : `Your ${fmtMoney(budgetN)} budget is within typical range.`}
            </div>
            {wellUnder && (
              <div style={{ fontSize: 11, color: palette.muted, marginTop: 4, lineHeight: 1.6 }}>
                Doable, but it means real trade-offs. Common ways to stretch it: a community or in-house-catering venue, family-style or buffet service, DIY or rented décor, a smaller act or friend for music, BYO bar where allowed, and treating premium add-ons (photo booth, extras) as optional.
              </div>
            )}
          </div>
        );
      })()}

      {!compact && (
        <details style={{ marginTop: 8 }}>
          <summary style={{
            fontSize: 11, color: palette.accent,
            cursor: 'pointer', fontWeight: 700,
          }}>
            Not included in this estimate
          </summary>
          <ul style={{
            margin: '6px 0 0 16px', padding: 0,
            fontSize: 11, color: palette.muted, lineHeight: 1.55,
          }}>
            {NOT_INCLUDED.slice(0, 5).map(item => <li key={item}>{item}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
