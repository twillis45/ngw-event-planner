// Surface — the depth/elevation primitive. Renders one of the operational
// depth planes (canvas → card → active → escalation → interrupt) with the
// correct fill + restrained grounding shadow, density-aware (under crisis,
// secondary cards recede so the active surface carries the weight).
import { color, radius, space } from '../tokens';
import { surfaceFor } from '../surfacePriority';
import { useDensity } from '../../contexts/DensityContext';

export default function Surface({
  role = 'card',          // canvas | card | active | escalation | interrupt
  density: densityProp,   // optional override; otherwise from DensityContext
  pad = 5,                // space scale key
  rad = 'lg',
  border = true,
  style = {},
  children,
  ...rest
}) {
  // useDensity() is safe to call unconditionally: DensityCtx has a default of
  // { density: 'full' }, so it returns that outside a provider (no throw, and no
  // conditional-hook violation).
  const ctxDensity = useDensity().density;
  const density = densityProp || ctxDensity;
  const { background, boxShadow } = surfaceFor(role, density);
  const borderColor = role === 'escalation' ? color.status.risk : color.border.default;

  return (
    <div
      style={{
        background,
        boxShadow,
        borderRadius: radius[rad],
        border: border ? `1px solid ${borderColor}` : 'none',
        padding: space[pad],
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
