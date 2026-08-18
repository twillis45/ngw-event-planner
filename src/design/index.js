// NGW Operational Design System — public entry.
// Import primitives + tokens from here: `import { Button, color } from 'design'`.
export { default as tokens, color, space, radius, type, motion, elevation, legacyBridge } from './tokens';
export { default as choreography, transitionFor } from './motion';
export { default as surfaceFor, visibleCountFor } from './surfacePriority';

export { default as Surface } from './primitives/Surface';
export { default as Text } from './primitives/Text';
export { default as Button } from './primitives/Button';
export { default as AlertBanner } from './primitives/AlertBanner';
export { default as EscalationBadge } from './primitives/EscalationBadge';
export { default as BottomSheet } from './primitives/BottomSheet';

// Providers ship WITH the system, not alongside it. Button and AlertBanner read
// EscalationContext; Surface reads DensityContext. A consumer who imports the
// primitives without these gets the context defaults at best and blank renders
// at worst, so a barrel that omitted them was exporting a system that could not
// stand up on its own. Added 2026-08-18 for the library build.
export {
  EscalationProvider, useEscalation, LEVELS as ESCALATION_LEVELS,
} from '../contexts/EscalationContext';
export {
  DensityProvider, useDensity, DENSITIES,
} from '../contexts/DensityContext';
