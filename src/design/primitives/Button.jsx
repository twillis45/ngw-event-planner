// Button — operational action primitive with the Sprint 9 P1-hierarchy
// resolution baked in.
//
// THE RESOLUTION (Sprint 8 defect: neutral matte P1 lost to red escalate):
//   There is ONE structural primary per surface, chosen by EscalationContext,
//   NOT by who is loudest. In nominal context the neutral P1 is primary; in
//   escalation/emergency the escalation action becomes primary and any P1
//   demotes to a quiet secondary — so they never compete as co-equals.
//   Primacy is expressed through STRUCTURE (raised surface + grounding shadow
//   + a steel keyline for P1 / added mass for escalation), never through
//   brighter color, glow, or pulse.
import { useState } from 'react';
import { color, radius, type, space, elevation } from '../tokens';
import { transitionFor } from '../motion';
import { useEscalation } from '../../contexts/EscalationContext';

const SIZES = { sm: 36, md: 44, lg: 52, xl: 56 };

export default function Button({
  priority = 'p2',        // p1 | p2 | ambient | escalation
  size,                   // optional explicit size; otherwise derived
  full = false,
  disabled = false,
  onClick,
  style = {},
  children,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  // Resolve which class is the structural primary in the current context.
  // useEscalation() is safe unconditionally: EscalationCtx has a nominal default,
  // so it resolves to p1/non-emergency outside a provider (no conditional hook).
  const esc = useEscalation();
  const primaryClass = esc.primaryClass;
  const emergency = esc.emergency;
  const isPrimary = priority === primaryClass;

  // Escalation buttons grow with severity; primary P1 sits at md.
  const height = SIZES[size] || (priority === 'escalation' ? (emergency ? SIZES.xl : SIZES.lg) : SIZES.md);

  // Base treatment per class, then primacy is layered on via STRUCTURE.
  let bg, fg, border = null, keyline = null, shadow = elevation.none;

  if (priority === 'ambient') {
    bg = 'transparent'; fg = color.text.secondary;
  } else if (priority === 'escalation') {
    if (isPrimary) {
      bg = emergency ? color.status.riskBright : color.status.risk;
      fg = emergency ? color.text.inverse : color.text.primary; // white on controlled red (4.5+); dark ink on bright emergency
      shadow = emergency ? elevation.interrupt : elevation.escalation;
    } else {
      bg = 'transparent'; fg = color.status.riskText; border = color.status.risk; // quiet outline until needed
    }
  } else if (priority === 'p1') {
    if (isPrimary) {
      bg = color.surface.strong; fg = color.text.primary; border = color.border.strong;
      keyline = color.text.secondary; // steel keyline = structural "this is the committed action"
      shadow = elevation.active;
    } else {
      bg = color.surface.card; fg = color.text.primary; border = color.border.default; // demoted to quiet secondary
    }
  } else { // p2
    bg = color.surface.card; fg = color.text.primary; border = color.border.default;
  }

  // Interaction: press compresses + darkens + insets; hover lifts subtly.
  const pressed = press && !disabled;
  const transform = pressed ? 'translateY(1px)' : 'none';
  const boxShadow = pressed ? elevation.pressInset : (hover && !disabled && shadow !== elevation.none ? elevation.active : shadow);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        height,
        minWidth: 44,
        width: full ? '100%' : 'auto',
        padding: `0 ${space[6]}px`,
        background: bg,
        color: disabled ? color.text.disabled : fg,
        border: border ? `1px solid ${border}` : '1px solid transparent',
        borderLeft: keyline ? `3px solid ${keyline}` : (border ? `1px solid ${border}` : '1px solid transparent'),
        borderRadius: radius.md,
        boxShadow,
        transform,
        fontFamily: type.family,
        fontSize: emergency ? type.size.md : type.size.base,
        fontWeight: type.weight.semibold,
        letterSpacing: priority === 'escalation' ? '0.02em' : 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: transitionFor('press', ['transform', 'box-shadow', 'background-color']),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      data-priority={priority}
      data-primary={isPrimary || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
