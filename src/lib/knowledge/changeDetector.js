// ─── Change Detector (KAW-1 Bundle D) ─────────────────────────────────────────
// Pure change detection. Compares new observations against previous state.
// Never decides. Only detects and classifies.
//
// Change detection is the layer between "what a provider returned" and
// "is this a meaningful difference worth surfacing?" The detector classifies
// the change type, estimates significance, and produces change records for the
// worker engine to route. Humans decide what to do with the changes.
//
// Pure functions: same inputs → same output. No side effects.

export const CHANGE_TYPES = [
  'price-increase',
  'price-decrease',
  'price-range-shift',
  'new-information',
  'information-removed',
  'regulation-change',
  'food-recall-alert',
  'weather-guidance-update',
  'best-practice-revision',
  'commercial-shift',
  'vendor-change',
  'safety-bulletin',
  'accessibility-change',
  'cultural-update',
  'seasonal-adjustment',
  'corroboration-achieved',
  'contradiction-detected',
  'evidence-expired',
  'no-change',
];

export const CHANGE_SIGNIFICANCE = {
  'food-recall-alert':       'critical',
  'safety-bulletin':         'critical',
  'regulation-change':       'high',
  'price-increase':          'med',
  'price-decrease':          'med',
  'price-range-shift':       'med',
  'new-information':         'med',
  'best-practice-revision':  'med',
  'contradiction-detected':  'high',
  'accessibility-change':    'med',
  'weather-guidance-update': 'low',
  'commercial-shift':        'low',
  'vendor-change':           'low',
  'cultural-update':         'low',
  'seasonal-adjustment':     'low',
  'corroboration-achieved':  'low',
  'information-removed':     'med',
  'evidence-expired':        'low',
  'no-change':               'none',
};

// ── Primitive: Compare two numeric values ─────────────────────────────────────
function numericChange(prev, next, tolerancePct = 0.05) {
  if (prev == null || next == null) return null;
  const prevN = parseFloat(prev);
  const nextN = parseFloat(next);
  if (isNaN(prevN) || isNaN(nextN)) return null;
  const changePct = (nextN - prevN) / prevN;
  if (Math.abs(changePct) <= tolerancePct) return null;
  return { changePct, direction: changePct > 0 ? 'increase' : 'decrease', prev: prevN, next: nextN };
}

// ── Primitive: Compare price ranges [min, max] ────────────────────────────────
function priceRangeChange(prev, next, tolerancePct = 0.08) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return null;
  const [prevMin, prevMax] = prev;
  const [nextMin, nextMax] = next;
  const midPrev = (prevMin + prevMax) / 2;
  const midNext = (nextMin + nextMax) / 2;
  if (midPrev === 0) return null;
  const midChange = Math.abs((midNext - midPrev) / midPrev);
  if (midChange <= tolerancePct) return null;
  return { prev: [prevMin, prevMax], next: [nextMin, nextMax], midChange, direction: midNext > midPrev ? 'increase' : 'decrease' };
}

// ── Core: Detect changes between two observations ────────────────────────────
// Returns a change record or null (no meaningful change).
export function detectChange(prevObservation, nextObservation, opts = {}) {
  if (!prevObservation || !nextObservation) return null;

  const { tolerancePct = 0.05 } = opts;
  const changes = [];

  // Check for price range changes
  if (prevObservation.fieldPath && prevObservation.fieldPath.includes('unitCostRange')) {
    const change = priceRangeChange(prevObservation.value, nextObservation.value, tolerancePct);
    if (change) {
      changes.push({
        type: change.direction === 'increase' ? 'price-increase' : 'price-decrease',
        detail: change,
        field: prevObservation.fieldPath,
      });
    }
  }

  // Check for single-value numeric changes
  if (typeof prevObservation.value === 'number' || typeof nextObservation.value === 'number') {
    const change = numericChange(prevObservation.value, nextObservation.value, tolerancePct);
    if (change) {
      changes.push({
        type: change.direction === 'increase' ? 'price-increase' : 'price-decrease',
        detail: change,
        field: prevObservation.fieldPath,
      });
    }
  }

  // Check for string/text content changes
  if (typeof prevObservation.value === 'string' && typeof nextObservation.value === 'string') {
    if (prevObservation.value !== nextObservation.value) {
      changes.push({ type: 'new-information', field: prevObservation.fieldPath, detail: { prev: prevObservation.value, next: nextObservation.value } });
    }
  }

  // Check for recall keywords in value
  const valueStr = JSON.stringify(nextObservation.value || '').toLowerCase();
  if (/recall|withdraw|alert|warning|outbreak|contamination/.test(valueStr)) {
    changes.push({ type: 'food-recall-alert', detail: { value: nextObservation.value }, field: prevObservation.fieldPath });
  }

  // Check for regulation keywords
  if (/regulation|law|code|requirement|compliance|permit|license/.test(valueStr)) {
    if (prevObservation.value !== nextObservation.value) {
      changes.push({ type: 'regulation-change', detail: { value: nextObservation.value }, field: prevObservation.fieldPath });
    }
  }

  if (changes.length === 0) return null;

  // Pick the most significant change
  const significanceOrder = ['critical', 'high', 'med', 'low', 'none'];
  changes.sort((a, b) => significanceOrder.indexOf(CHANGE_SIGNIFICANCE[a.type]) - significanceOrder.indexOf(CHANGE_SIGNIFICANCE[b.type]));
  const topChange = changes[0];

  return {
    id: `change-${nextObservation.assetId || ''}-${(nextObservation.fieldPath || '').replace(/\./g, '-')}-${String(nextObservation.at || '').replace(/\D/g, '').slice(0, 12)}`,
    assetId: nextObservation.assetId,
    fieldPath: nextObservation.fieldPath,
    changeType: topChange.type,
    significance: CHANGE_SIGNIFICANCE[topChange.type] || 'low',
    detail: topChange.detail,
    allChanges: changes,
    prevObservationId: prevObservation.id || null,
    nextObservationId: nextObservation.id || null,
    provider: nextObservation.provider || null,
    detectedAt: nextObservation.at,
    needsReview: true,                  // always — detector never decides
    resolved: false,
  };
}

// ── Batch detection ────────────────────────────────────────────────────────────
// Compare a set of new observations against the most recent previous observation
// for the same asset+fieldPath. Returns change records (non-null changes only).
export function detectChanges(newObservations = [], previousObservations = [], opts = {}) {
  const prevByKey = previousObservations.reduce((m, obs) => {
    const key = `${obs.assetId}::${obs.fieldPath}`;
    if (!m[key] || obs.at > m[key].at) m[key] = obs;
    return m;
  }, {});

  return newObservations
    .map((next) => {
      const key = `${next.assetId}::${next.fieldPath}`;
      const prev = prevByKey[key];
      if (!prev) return null;
      return detectChange(prev, next, opts);
    })
    .filter(Boolean);
}

// ── Contradiction detection ────────────────────────────────────────────────────
// Among a set of observations for the same asset+fieldPath, find pairs where
// the values are meaningfully different (implying contradicting sources).
export function detectContradictions(observations = [], opts = {}) {
  const { tolerancePct = 0.15 } = opts;

  // Group by asset+fieldPath
  const groups = observations.reduce((m, obs) => {
    const key = `${obs.assetId}::${obs.fieldPath}`;
    m[key] = m[key] || [];
    m[key].push(obs);
    return m;
  }, {});

  const contradictions = [];
  for (const [key, obs] of Object.entries(groups)) {
    if (obs.length < 2) continue;

    for (let i = 0; i < obs.length - 1; i++) {
      for (let j = i + 1; j < obs.length; j++) {
        const a = obs[i];
        const b = obs[j];
        const [assetId, fieldPath] = key.split('::');

        // Price range contradiction
        if (Array.isArray(a.value) && Array.isArray(b.value)) {
          const change = priceRangeChange(a.value, b.value, tolerancePct);
          if (change) {
            contradictions.push({
              id: `contradiction-${key.replace('::', '-')}-${i}-${j}`,
              assetId, fieldPath,
              type: 'price-range-shift',
              sourceA: { observationId: a.id, provider: a.provider, value: a.value },
              sourceB: { observationId: b.id, provider: b.provider, value: b.value },
              detail: change,
              needsResolution: true,
              resolved: false,
            });
          }
        }

        // String content contradiction
        if (typeof a.value === 'string' && typeof b.value === 'string' && a.value !== b.value) {
          contradictions.push({
            id: `contradiction-${key.replace('::', '-')}-${i}-${j}`,
            assetId, fieldPath,
            type: 'contradiction-detected',
            sourceA: { observationId: a.id, provider: a.provider, value: a.value },
            sourceB: { observationId: b.id, provider: b.provider, value: b.value },
            detail: null,
            needsResolution: true,
            resolved: false,
          });
        }
      }
    }
  }

  return contradictions;
}

// ── Summary + reporting ────────────────────────────────────────────────────────
export function summarizeChanges(changes = []) {
  if (!changes.length) return { total: 0, byType: {}, bySignificance: {}, critical: [], high: [] };

  const byType = changes.reduce((m, c) => { m[c.changeType] = (m[c.changeType] || 0) + 1; return m; }, {});
  const bySignificance = changes.reduce((m, c) => { m[c.significance] = (m[c.significance] || 0) + 1; return m; }, {});
  const critical = changes.filter((c) => c.significance === 'critical');
  const high = changes.filter((c) => c.significance === 'high');

  return { total: changes.length, byType, bySignificance, critical, high };
}
