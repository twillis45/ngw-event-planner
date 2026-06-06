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
import { getDatePremium, getTimeOfDayFactor } from '../estimatorFactors.js';

// Per-event-type per-head bands. Reflect commonly cited US bands. Planning
// estimates only — never claimed as quotes.
const PER_HEAD_BY_TYPE = {
  Wedding:             { low: 200, high: 500 },
  'Vow Renewal':       { low: 150, high: 400 },
  Quinceañera:         { low: 150, high: 400 },
  'Engagement Party':  { low: 100, high: 300 },
  'Bridal Shower':     { low:  80, high: 250 },
  'Baby Shower':       { low:  50, high: 180 },
  Birthday:            { low:  60, high: 250 },
  'Sweet 16':          { low: 100, high: 350 },
  'Retirement Party':  { low:  80, high: 250 },
  Reunion:             { low:  60, high: 200 },
  Graduation:          { low:  50, high: 180 },
  Conference:          { low: 150, high: 400 },
  'Corporate Retreat': { low: 200, high: 500 },
  'Corporate Event':   { low: 150, high: 400 },
  Gala:                { low: 250, high: 600 },
  'Fundraiser / Gala': { low: 250, high: 600 },
  'Networking Event':  { low:  60, high: 200 },
};

const DEFAULT_PALETTE = {
  bg:     '#111519',
  card:   '#1C2227',
  border: '#2E353D',
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

  const ph = PER_HEAD_BY_TYPE[type] || { low: 100, high: 250 };
  // Sprint 61.G — caller can pass metroFactor explicitly; otherwise the
  // hint stays neutral (1.0) so we never claim a market adjustment the
  // component can't actually derive from the lib.
  const metroFactor = 1;
  const tod = getTimeOfDayFactor(timeOfDay);
  const datePrem = getDatePremium(date, type);
  const factor = metroFactor * (tod.multiplier || 1) * (datePrem.multiplier || 1);

  const lowTotal  = Math.round(ph.low  * guests * factor / 100) * 100;
  const highTotal = Math.round(ph.high * guests * factor / 100) * 100;

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

      {verdict && (
        <div style={{
          fontSize: 11.5,
          color: verdictColor,
          marginTop: 6,
          fontWeight: 600,
        }}>
          Your {fmtMoney(budgetN)} budget is {verdict === 'tight' ? 'tight for this scope'
            : verdict === 'generous' ? 'generous for this scope'
            : 'within typical range'}.
        </div>
      )}

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
