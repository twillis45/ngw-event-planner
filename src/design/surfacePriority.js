// Surface-priority logic — maps operational density to how much depth /
// elevation a surface earns. Under escalation, the system gets QUIETER:
// fewer planes, flatter background, the active surface gets the weight.
import { color, elevation } from './tokens';

// density: 'full' | 'compact' | 'crisis'
// role:    'canvas' | 'card' | 'active' | 'escalation' | 'interrupt'
export function surfaceFor(role, density = 'full') {
  const fill = {
    canvas:     color.surface.canvas,
    card:       color.surface.card,
    active:     color.surface.strong,
    escalation: color.status.riskBg,
    interrupt:  color.surface.strong,
  }[role] || color.surface.card;

  // In crisis density, secondary cards lose elevation (recede) so the
  // active/escalation surface is the only thing that reads as "raised".
  const shadow = {
    canvas:     elevation.none,
    card:       density === 'crisis' ? elevation.none : elevation.base,
    active:     elevation.active,
    escalation: elevation.escalation,
    interrupt:  elevation.interrupt,
  }[role] || elevation.none;

  return { background: fill, boxShadow: shadow };
}

// How many secondary items a surface should show at a given density.
export function visibleCountFor(density, full) {
  if (density === 'crisis') return 0;       // hide nominal items entirely
  if (density === 'compact') return Math.min(full, 3);
  return full;
}
export default surfaceFor;
