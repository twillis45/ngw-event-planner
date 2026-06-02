// OrchestrationContext — Sprint 34 Implementation Foundation
//
// React context that wraps the orchestration engine and provides
// pressure state, hierarchy resolution, and behavioral parameters
// to all child components. Composes with existing EscalationContext
// and OperationalModeContext — does not replace them.
//
// Usage:
//   <OrchestrationProvider>
//     <YourComponent />
//   </OrchestrationProvider>
//
//   function YourComponent() {
//     const { pressure, state, setPressureInputs } = useOrchestration();
//   }

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { resolvePressure, PRESSURE_STATE } from '../orchestration/pressureState';

const OrchestrationCtx = createContext(null);

const DEFAULT_INPUTS = {
  operationalMode: 'pre-event',
  escalationLevel: 'nominal',
  temporalProximity: 240,
  activeDependencies: 0,
};

export function OrchestrationProvider({ children, initialInputs = {} }) {
  const [inputs, setInputs] = useState({ ...DEFAULT_INPUTS, ...initialInputs });
  const [isRecoveryOverride, setIsRecoveryOverride] = useState(false);

  const resolved = useMemo(() => {
    const effectiveInputs = isRecoveryOverride
      ? { ...inputs, operationalMode: 'recovery' }
      : inputs;
    return resolvePressure(effectiveInputs);
  }, [inputs, isRecoveryOverride]);

  const setPressureInputs = useCallback((partial) => {
    setInputs(prev => ({ ...prev, ...partial }));
    if (partial.operationalMode && partial.operationalMode !== 'recovery') {
      setIsRecoveryOverride(false);
    }
  }, []);

  const enterRecovery = useCallback(() => setIsRecoveryOverride(true), []);
  const exitRecovery = useCallback(() => setIsRecoveryOverride(false), []);

  const value = useMemo(() => ({
    // Resolved pressure state
    pressure: resolved.pressure,
    state: resolved.state,
    isRecovery: resolved.isRecovery,
    gravityFactor: resolved.gravityFactor,
    compressionFactor: resolved.compressionFactor,
    recessionFactor: resolved.recessionFactor,
    routingIntensity: resolved.routingIntensity,

    // Control
    inputs,
    setPressureInputs,
    enterRecovery,
    exitRecovery,

    // Convenience
    isCalmState: resolved.state === PRESSURE_STATE.CALM,
    isBuildingState: resolved.state === PRESSURE_STATE.BUILDING,
    isActiveState: resolved.state === PRESSURE_STATE.ACTIVE,
    isRecoveryState: resolved.state === PRESSURE_STATE.RECOVERY,
  }), [resolved, inputs, setPressureInputs, enterRecovery, exitRecovery]);

  return (
    <OrchestrationCtx.Provider value={value}>
      {children}
    </OrchestrationCtx.Provider>
  );
}

export function useOrchestration() {
  const ctx = useContext(OrchestrationCtx);
  if (!ctx) {
    // Graceful fallback — components work outside provider at calm state
    return {
      pressure: 0,
      state: PRESSURE_STATE.CALM,
      isRecovery: false,
      gravityFactor: 0,
      compressionFactor: 0,
      recessionFactor: 0,
      routingIntensity: 0.1,
      inputs: DEFAULT_INPUTS,
      setPressureInputs: () => {},
      enterRecovery: () => {},
      exitRecovery: () => {},
      isCalmState: true,
      isBuildingState: false,
      isActiveState: false,
      isRecoveryState: false,
    };
  }
  return ctx;
}

export { OrchestrationCtx };
