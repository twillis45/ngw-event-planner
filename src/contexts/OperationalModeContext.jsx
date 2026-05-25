// OperationalModeContext — the lifecycle mode of an event. Distinct from
// escalation severity: mode is WHERE we are in the event timeline; escalation
// is HOW bad things are right now. Together they drive surface behavior.
import { createContext, useContext, useMemo, useState } from 'react';

export const MODES = ['pre-event', 'live', 'recovery', 'post-event'];

export const OperationalModeCtx = createContext({
  mode: 'pre-event',
  isLive: false,
  setMode: () => {},
});

export function OperationalModeProvider({ initialMode = 'pre-event', children }) {
  const [mode, setMode] = useState(initialMode);
  const value = useMemo(() => ({
    mode,
    isLive: mode === 'live' || mode === 'recovery',
    setMode,
  }), [mode]);
  return <OperationalModeCtx.Provider value={value}>{children}</OperationalModeCtx.Provider>;
}

export const useOperationalMode = () => useContext(OperationalModeCtx);
export default OperationalModeCtx;
