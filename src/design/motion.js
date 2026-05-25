// Motion timing utilities — Sprint 8 hybrid operational matrix.
// Single source for building CSS transitions so behavior stays consistent
// and restrained (no bounce/spring/elastic, ever).
import { motion } from './tokens';

const { ease, duration } = motion;

// Map an operational intent to its (duration, easing) pair.
export const choreography = {
  ambient:    { ms: duration.ambient,     ease: ease.inOut    },
  escalation: { ms: duration.escalation,  ease: ease.out      },
  emergency:  { ms: duration.emergency,   ease: ease.sharp    },
  recovery:   { ms: duration.recovery,    ease: ease.out      },
  sheetRise:  { ms: duration.sheetRise,   ease: ease.standard },
  sheetDismiss:{ ms: duration.sheetDismiss,ease: ease.out      },
  press:      { ms: duration.press,       ease: ease.out      },
};

// Build a CSS transition string for one or more properties using an intent.
// transitionFor('escalation', ['background-color','transform'])
export function transitionFor(intent, props = ['all']) {
  const c = choreography[intent] || choreography.ambient;
  return props.map((p) => `${p} ${c.ms}ms ${c.ease}`).join(', ');
}

export { ease as easings, duration as durations };
export default choreography;
