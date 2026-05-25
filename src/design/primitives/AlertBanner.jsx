// AlertBanner — operational alert primitive. Left severity bar + bright
// label + body + optional action. Severity rides the controlled palette:
// amber (delayed/overdue) → risk (escalated) → risk-bright (emergency) →
// steel (resolved). Calmer + heavier as severity rises, never louder.
import { color, radius, type, space, elevation } from '../tokens';
import { transitionFor } from '../motion';

const SEV = {
  nominal:   { bar: color.status.neutral,    label: color.status.neutralText,   bg: color.surface.card,    chip: 'INFO' },
  delayed:   { bar: color.status.warning,    label: color.status.warningText,   bg: color.status.warningBg, chip: 'DELAYED' },
  overdue:   { bar: color.status.warning,    label: color.status.warningText,   bg: color.status.warningBg, chip: 'OVERDUE' },
  escalated: { bar: color.status.risk,       label: color.status.riskText,      bg: color.status.riskBg,    chip: 'ESCALATED' },
  emergency: { bar: color.status.riskBright,  label: color.status.riskText,     bg: color.status.riskBg,    chip: 'EMERGENCY' },
  resolved:  { bar: color.status.neutral,    label: color.status.neutralText,   bg: color.surface.card,    chip: 'RESOLVED' },
};

export default function AlertBanner({ severity = 'nominal', title, body, action, style = {}, ...rest }) {
  const s = SEV[severity] || SEV.nominal;
  const heavy = severity === 'escalated' || severity === 'emergency';
  return (
    <div
      role="status"
      style={{
        display: 'flex', overflow: 'hidden',
        background: s.bg,
        border: `1px solid ${severity === 'emergency' ? color.status.riskBright : (heavy ? color.status.risk : color.border.default)}`,
        borderRadius: radius.lg,
        boxShadow: heavy ? elevation.escalation : elevation.none,
        transition: transitionFor(heavy ? 'escalation' : 'ambient', ['background-color', 'box-shadow', 'border-color']),
        ...style,
      }}
      {...rest}
    >
      <div style={{ width: 4, background: s.bar, flex: '0 0 auto' }} />
      <div style={{ padding: `${space[4]}px ${space[5]}px`, display: 'flex', flexDirection: 'column', gap: space[2], minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: type.family, fontSize: type.size.sm, fontWeight: type.weight.semibold, letterSpacing: '0.05em', color: s.label }}>{s.chip}</span>
        {title && <span style={{ fontFamily: type.family, fontSize: type.size.lg, fontWeight: type.weight.semibold, color: color.text.primary }}>{title}</span>}
        {body && <span style={{ fontFamily: type.family, fontSize: type.size.base, color: color.text.secondary }}>{body}</span>}
        {action && <div style={{ marginTop: space[2] }}>{action}</div>}
      </div>
    </div>
  );
}
