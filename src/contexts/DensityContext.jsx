// DensityContext — resolved operational density. Defaults to following
// escalation severity (crisis hides nominal detail), but can be overridden
// (e.g. a user pinning full density, or a small viewport forcing compact).
import { createContext, useContext, useMemo } from 'react';
import { useEscalation } from './EscalationContext';

export const DENSITIES = ['full', 'compact', 'crisis'];

export const DensityCtx = createContext({ density: 'full' });

export function DensityProvider({ override = null, children }) {
  const { density: escDensity } = useEscalation();
  const value = useMemo(() => ({
    density: override || escDensity || 'full',
    fromEscalation: !override,
  }), [override, escDensity]);
  return <DensityCtx.Provider value={value}>{children}</DensityCtx.Provider>;
}

export const useDensity = () => useContext(DensityCtx);
export default DensityCtx;
