// EscalationContext — the operational severity state that drives adaptive
// hierarchy, density reduction, and which action class is structurally
// primary. Additive infrastructure: not yet wired into App.js screens.
import { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Severity ladder. Order matters (index = severity).
export const LEVELS = ['nominal', 'caution', 'escalated', 'emergency'];

// Each level resolves: density (how much UI shows), and the action class
// that should be the SINGLE structural primary on a surface.
const RESOLUTION = {
  nominal:   { density: 'full',    primaryClass: 'p1',         emergency: false },
  caution:   { density: 'full',    primaryClass: 'p1',         emergency: false },
  escalated: { density: 'compact', primaryClass: 'escalation', emergency: false },
  emergency: { density: 'crisis',  primaryClass: 'escalation', emergency: true  },
};

export const EscalationCtx = createContext({
  level: 'nominal',
  ...RESOLUTION.nominal,
  isEscalated: false,
  setLevel: () => {},
  escalate: () => {},
  deescalate: () => {},
});

export function EscalationProvider({ initialLevel = 'nominal', children }) {
  const [level, setLevel] = useState(initialLevel);

  const escalate = useCallback(() => {
    setLevel((l) => LEVELS[Math.min(LEVELS.indexOf(l) + 1, LEVELS.length - 1)]);
  }, []);
  const deescalate = useCallback(() => {
    setLevel((l) => LEVELS[Math.max(LEVELS.indexOf(l) - 1, 0)]);
  }, []);

  const value = useMemo(() => {
    const r = RESOLUTION[level] || RESOLUTION.nominal;
    return {
      level,
      density: r.density,
      primaryClass: r.primaryClass,
      emergency: r.emergency,
      isEscalated: level === 'escalated' || level === 'emergency',
      setLevel, escalate, deescalate,
    };
  }, [level, escalate, deescalate]);

  return <EscalationCtx.Provider value={value}>{children}</EscalationCtx.Provider>;
}

export const useEscalation = () => useContext(EscalationCtx);
export default EscalationCtx;
