// EscalationBadge — status pill. Uses the *-text-on-*-bg contrast pairing
// from Sprint 5/6 (bright tint label on dark tint pill) so labels never go
// dim/same-hue (the Sprint 7 contrast defect). All pairs clear WCAG AA.
import { color, radius, type, space } from '../tokens';

const STATUS = {
  confirmed: { dot: color.status.confirmed, text: color.status.confirmedText, bg: color.status.confirmedBg },
  warning:   { dot: color.status.warning,   text: color.status.warningText,   bg: color.status.warningBg },
  risk:      { dot: color.status.risk,      text: color.status.riskText,      bg: color.status.riskBg },
  emergency: { dot: color.status.riskBright, text: color.status.riskText,     bg: color.status.riskBg },
  neutral:   { dot: color.status.neutral,   text: color.status.neutralText,   bg: color.surface.card },
};

export default function EscalationBadge({ status = 'neutral', dot = true, children, style = {}, ...rest }) {
  const s = STATUS[status] || STATUS.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: space[3],
        background: s.bg,
        border: `1px solid ${s.dot}`,
        color: s.text,
        borderRadius: radius.full,
        padding: `${space[2]}px ${space[4]}px`,
        fontFamily: type.family, fontSize: type.size.sm, fontWeight: type.weight.semibold,
        letterSpacing: '0.04em',
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flex: '0 0 auto' }} />}
      {children}
    </span>
  );
}
