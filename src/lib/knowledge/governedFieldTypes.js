// ─── GOVERNED FIELD TYPES — typed value correction (Phase 5E) ────────────────
//
// WHY THIS EXISTS. Every phase up to 5D could correct a claim's REASONING but not
// its VALUE: the correction composer published `newValue` unchanged because there
// was nowhere safe to edit it. A plain text input would have been worse than the
// gap — `qtyPerGuest` is a number, `unitCostRange` is a two-element array, and
// `provenance` is a structured block, so one editor would happily publish "0.5"
// as a string and the engine would resolve NaN in a host's shopping list.
//
// So the editor is FIELD-AWARE, and this module is the single place that knows
// what each governed field is. It is pure: no I/O, no storage, no UI.
//
// SHAPES ARE MEASURED, NOT ASSUMED. Counted across the live corpus:
//   unitCostRange  array[2] of number   537 instances
//   qtyPerGuest    number               312
//   qtyFlat        number               225
//   provenance     object 148 / string   21   <- legacy strings still exist
//
// Note `unitCostRange` is a TUPLE `[min, max]`, not `{ min, max }`. Building the
// editor to the second shape would have produced values the engine cannot read.

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

// A plausibility ceiling, not a correctness claim. Its job is to catch a slipped
// decimal or a pasted cell — 500 crabs per guest, a $1M napkin — before it reaches
// a host, while leaving genuinely unusual-but-real values publishable.
const SANE_QTY_MAX = 500;
const SANE_COST_MAX = 1000000;

const num = (v) => (typeof v === 'number' && Number.isFinite(v));

// ── The registry ─────────────────────────────────────────────────────────────
// Keyed by the field SUFFIX of a governed path (`p_crabs.qtyPerGuest` -> `qtyPerGuest`).
export const GOVERNED_FIELD_TYPES = Object.freeze({
  qtyPerGuest: {
    type: 'number',
    label: 'Quantity per guest',
    hint: 'How much of this item per guest. A number, not text.',
    format: (v) => (num(v) ? String(v) : ''),
    parse: (raw) => {
      const t = String(raw).trim();
      if (t === '') return { ok: false, error: 'A quantity is required.' };
      // Deliberately strict: Number('') is 0 and Number('5abc') is NaN, but
      // Number(' 5 ') is 5 — a pasted cell should not become a governed value
      // by accident, so the string must look like a number and nothing else.
      if (!/^-?\d*\.?\d+$/.test(t)) return { ok: false, error: `"${raw}" is not a number.` };
      return { ok: true, value: Number(t) };
    },
    validate: (v) => {
      if (!num(v)) return [`Expected a number, got ${typeof v}.`];
      const e = [];
      if (v <= 0) e.push('Must be greater than zero — a zero quantity removes the line instead of sizing it.');
      if (v > SANE_QTY_MAX) e.push(`Implausible: ${v} per guest exceeds the ${SANE_QTY_MAX} sanity ceiling.`);
      return e;
    },
  },

  qtyFlat: {
    type: 'number',
    label: 'Flat quantity',
    hint: 'A fixed count for the whole event, regardless of guest count.',
    format: (v) => (num(v) ? String(v) : ''),
    parse: (raw) => GOVERNED_FIELD_TYPES.qtyPerGuest.parse(raw),
    validate: (v) => {
      if (!num(v)) return [`Expected a number, got ${typeof v}.`];
      const e = [];
      if (v <= 0) e.push('Must be greater than zero.');
      if (v > SANE_QTY_MAX) e.push(`Implausible: ${v} exceeds the ${SANE_QTY_MAX} sanity ceiling.`);
      return e;
    },
  },

  unitCostRange: {
    type: 'range',
    label: 'Unit cost range',
    hint: 'Low and high price per unit. The spread is price uncertainty, not attendance.',
    format: (v) => (Array.isArray(v) && v.length === 2 ? { min: v[0], max: v[1] } : { min: '', max: '' }),
    parse: (raw) => {
      const lo = GOVERNED_FIELD_TYPES.qtyPerGuest.parse(raw && raw.min);
      const hi = GOVERNED_FIELD_TYPES.qtyPerGuest.parse(raw && raw.max);
      if (!lo.ok) return { ok: false, error: `Minimum: ${lo.error}` };
      if (!hi.ok) return { ok: false, error: `Maximum: ${hi.error}` };
      return { ok: true, value: [lo.value, hi.value] };
    },
    validate: (v) => {
      if (!Array.isArray(v) || v.length !== 2) return ['Expected a two-element [min, max] array.'];
      const [lo, hi] = v;
      const e = [];
      if (!num(lo) || !num(hi)) return ['Both ends must be numbers.'];
      if (lo < 0 || hi < 0) e.push('Costs cannot be negative.');
      if (lo > hi) e.push(`Minimum (${lo}) is above maximum (${hi}).`);
      if (hi > SANE_COST_MAX) e.push(`Implausible: ${hi} exceeds the sanity ceiling.`);
      return e;
    },
  },

  // ── The two ENGINE-GOVERNING fields (Phase 5E.3) ───────────────────────────
  //
  // These are the fields an admin is sent to when the crab line refuses a direct
  // edit: `qtyPerGuest` cannot move a bushel, so the ownership contract names
  // `priceLadder` and `servingGuide` as the way in. Both are nested objects, and a
  // JSON textarea would have handed the one class of value with the widest blast
  // radius — the crab line, the costliest item on the list — the least safe editor
  // in the console. So both are ROW editors: pick the size you are correcting, edit
  // named numeric fields, and the untouched rows come through verbatim.
  //
  // The editor draft carries its own `base` so `parse` stays pure — it merges the
  // edited row back into the object the admin actually opened, rather than into
  // whatever the module happens to hold at parse time.

  priceLadder: {
    type: 'ladder',
    label: 'Price ladder',
    hint: 'Dealer prices per size. Edit one size at a time; the other sizes are kept as-is.',
    // The numeric fields of a ladder row. `approx*` are the fallbacks used only when
    // the sourced serving table is silent on a size, so they are editable too.
    fields: ['perDz', 'per2Dz', 'perHalfBushel', 'perBushel', 'approxPerBushel', 'approxPerHalfBushel'],
    // Rows are the size keys; everything else on the object (source, note) is metadata.
    rowKeys: (v) => (v && typeof v === 'object'
      ? Object.keys(v).filter((k) => v[k] && typeof v[k] === 'object' && !Array.isArray(v[k]))
      : []),
    format: (v) => {
      const keys = GOVERNED_FIELD_TYPES.priceLadder.rowKeys(v);
      const key = keys[0] || '';
      const src = (v && v[key]) || {};
      const row = {};
      for (const f of GOVERNED_FIELD_TYPES.priceLadder.fields) {
        row[f] = src[f] == null ? '' : String(src[f]);
      }
      return { base: v && typeof v === 'object' ? v : {}, key, row };
    },
    parse: (draft) => {
      if (!draft || !draft.key) return { ok: false, error: 'Choose which size you are correcting.' };
      const src = (draft.base && draft.base[draft.key]) || {};
      const row = { ...src };
      let touched = false;
      for (const f of GOVERNED_FIELD_TYPES.priceLadder.fields) {
        const raw = draft.row ? draft.row[f] : '';
        const t = String(raw == null ? '' : raw).trim();
        // BLANK MEANS ABSENT, NOT ZERO. Several rows legitimately have no
        // `perBushel` (jumboMale is sold by the dozen only), and resolveBulkPurchase
        // branches on the field being falsy — so a blank must delete the key, not
        // write a 0 that would read as a free bushel.
        if (t === '') { if (f in row) { delete row[f]; touched = true; } continue; }
        const n = GOVERNED_FIELD_TYPES.qtyPerGuest.parse(t);
        if (!n.ok) return { ok: false, error: `${f}: ${n.error}` };
        if (row[f] !== n.value) touched = true;
        row[f] = n.value;
      }
      if (!touched) return { ok: false, error: 'Nothing changed — every price is the value already published.' };
      return { ok: true, value: { ...draft.base, [draft.key]: row } };
    },
    validate: (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return ['Expected a price-ladder object.'];
      const keys = GOVERNED_FIELD_TYPES.priceLadder.rowKeys(v);
      if (!keys.length) return ['A price ladder needs at least one size row.'];
      const e = [];
      for (const k of keys) {
        const row = v[k];
        // A row with no purchasable unit cannot price anything: resolveBulkPurchase
        // falls through every branch and returns a dozen count at $0.
        if (!row.perDz && !row.perHalfBushel && !row.perBushel) {
          e.push(`${k}: needs at least one of perDz, perHalfBushel or perBushel.`);
        }
        for (const f of GOVERNED_FIELD_TYPES.priceLadder.fields) {
          if (row[f] == null) continue;
          if (!num(row[f])) { e.push(`${k}.${f}: expected a number, got ${typeof row[f]}.`); continue; }
          if (row[f] <= 0) e.push(`${k}.${f}: must be greater than zero.`);
          if (row[f] > SANE_COST_MAX) e.push(`${k}.${f}: implausible — exceeds the sanity ceiling.`);
        }
        if (row.perDz && row.perBushel && row.perBushel < row.perDz) {
          e.push(`${k}: a bushel (${row.perBushel}) priced below a dozen (${row.perDz}).`);
        }
      }
      return e;
    },
  },

  servingGuide: {
    type: 'servingGuide',
    label: 'Serving guide',
    hint: 'How many crabs one adult picker eats, and how many fit a bushel. This is what '
        + 'moves the COUNT — a per-guest rate cannot.',
    // Each is a published [low, high] SPREAD, not a point estimate: sources disagree
    // by about a crab and the engine plans against the top of the range.
    fields: ['withSides', 'mainOnly', 'perBushel'],
    fieldHints: {
      withSides: 'Crabs per picker when there are sides — the crab-feast case, and the planning default.',
      mainOnly: 'Crabs per picker when crabs are the whole meal.',
      perBushel: 'Crabs in a bushel of this size. Bigger crabs, fewer per bushel.',
    },
    sizes: ['medium', 'large', 'xl', 'jumbo', 'colossal'],
    format: (v) => {
      const bySize = (v && v.bySize) || {};
      const key = Object.keys(bySize)[0] || 'large';
      const src = bySize[key] || {};
      const row = {};
      for (const f of GOVERNED_FIELD_TYPES.servingGuide.fields) {
        const pair = Array.isArray(src[f]) ? src[f] : ['', ''];
        row[f] = { low: pair[0] === '' ? '' : String(pair[0]), high: pair[1] === '' ? '' : String(pair[1]) };
      }
      return { base: v && typeof v === 'object' ? v : {}, key, row };
    },
    parse: (draft) => {
      if (!draft || !draft.key) return { ok: false, error: 'Choose which crab size you are correcting.' };
      const row = {};
      for (const f of GOVERNED_FIELD_TYPES.servingGuide.fields) {
        const cell = (draft.row && draft.row[f]) || {};
        const lo = GOVERNED_FIELD_TYPES.qtyPerGuest.parse(cell.low);
        const hi = GOVERNED_FIELD_TYPES.qtyPerGuest.parse(cell.high);
        // ALL THREE ARE REQUIRED. The engine reads every one of them, and a partial
        // row is discarded wholesale by entryFor() — so a half-filled correction
        // would publish, pass every gate, and change nothing. Refused here instead.
        if (!lo.ok) return { ok: false, error: `${f} low: ${lo.error}` };
        if (!hi.ok) return { ok: false, error: `${f} high: ${hi.error}` };
        if (lo.value > hi.value) return { ok: false, error: `${f}: low (${lo.value}) is above high (${hi.value}).` };
        row[f] = [lo.value, hi.value];
      }
      const base = draft.base && typeof draft.base === 'object' ? draft.base : {};
      const prior = (base.bySize && base.bySize[draft.key]) || {};
      return {
        ok: true,
        // Row-level metadata (tier, source, inches) is preserved: a corrected count
        // does not un-cite the row it came from.
        value: { ...base, bySize: { ...(base.bySize || {}), [draft.key]: { ...prior, ...row } } },
      };
    },
    validate: (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return ['Expected a serving-guide object.'];
      const bySize = v.bySize;
      if (!bySize || typeof bySize !== 'object') return ['A serving guide needs a bySize table.'];
      const keys = Object.keys(bySize);
      if (!keys.length) return ['A serving guide needs at least one size row.'];
      const e = [];
      for (const k of keys) {
        const row = bySize[k] || {};
        for (const f of GOVERNED_FIELD_TYPES.servingGuide.fields) {
          const pair = row[f];
          // Mirrors usableRow() in crabServing.js. A row failing this check is
          // silently ignored at runtime, so publishing it would be a no-op wearing
          // the authority of a governed value.
          if (!Array.isArray(pair) || pair.length !== 2 || !num(pair[0]) || !num(pair[1])) {
            e.push(`${k}.${f}: expected a [low, high] pair of numbers — the engine ignores a row missing any of ${GOVERNED_FIELD_TYPES.servingGuide.fields.join(', ')}.`);
            continue;
          }
          if (pair[0] <= 0 || pair[1] <= 0) e.push(`${k}.${f}: counts must be greater than zero.`);
          if (pair[0] > pair[1]) e.push(`${k}.${f}: low (${pair[0]}) is above high (${pair[1]}).`);
          if (pair[1] > SANE_QTY_MAX) e.push(`${k}.${f}: implausible — exceeds the ${SANE_QTY_MAX} sanity ceiling.`);
        }
      }
      return e;
    },
  },

  provenance: {
    type: 'provenance',
    label: 'Provenance',
    hint: 'Where this claim comes from. A source and a note are required.',
    format: (v) => (v && typeof v === 'object'
      ? { sources: (v.sources || []).join(', '), note: v.note || '', confidence: v.confidence || 'medium', tier: v.tier || 'researched' }
      // Legacy string provenance (21 in the corpus) surfaces as its note so it can
      // be upgraded to a structured block rather than silently discarded.
      : { sources: '', note: typeof v === 'string' ? v : '', confidence: 'medium', tier: 'researched' }),
    parse: (raw) => {
      const sources = String((raw && raw.sources) || '').split(',').map((s) => s.trim()).filter(Boolean);
      const note = String((raw && raw.note) || '').trim();
      const confidence = String((raw && raw.confidence) || '').trim();
      if (!sources.length) return { ok: false, error: 'At least one source id is required.' };
      if (!note) return { ok: false, error: 'A note is required — a source without a claim is not provenance.' };
      if (!CONFIDENCE_LEVELS.includes(confidence)) {
        return { ok: false, error: `Confidence must be one of ${CONFIDENCE_LEVELS.join(' | ')}.` };
      }
      return {
        ok: true,
        value: {
          tier: String((raw && raw.tier) || 'researched'),
          confidence,
          verificationStatus: 'researched',
          sources,
          note,
        },
      };
    },
    // TYPE SAFETY (publish gate). Deliberately narrower than the editor's rules.
    // Requiring a source and a note here felt right and was wrong: it is EDITORIAL
    // completeness, not schema safety, and enforcing it at publish would reject
    // legitimate historical provenance that predates the convention. The gate's job
    // is "will this break the engine", not "is this well written".
    // SCOPE OF THE PUBLISH GATE, stated plainly because I got it wrong twice.
    //
    // The harm this gate exists to stop is a NUMBER that resolves to NaN in a
    // host's shopping list. `qtyPerGuest: "banana"` sizes a real purchase; that
    // must never publish. Provenance is metadata: a malformed block degrades the
    // "Sourced -" line to nothing, which is ugly and honest, not corrupting.
    //
    // So the gate is strict where the blast radius is a host's numbers and
    // permissive where it is a caption. Editorial quality on provenance is the
    // composer's job (validateForEditor), not the publish gate's — enforcing it
    // here also rejected legitimate historical records that predate the shape.
    validate: (v) => (v == null ? ['Provenance cannot be null.'] : []),
    // EDITORIAL completeness (composer only). A human authoring a NEW correction
    // must name a source and state a claim; history is held to the gate above.
    validateForEditor: (v) => {
      const e = [];
      if (!v || typeof v !== 'object') return ['Expected a provenance object.'];
      if (!Array.isArray(v.sources) || !v.sources.length) e.push('At least one source id is required.');
      if (!v.note) e.push('A note is required - a source without a claim is not provenance.');
      if (!CONFIDENCE_LEVELS.includes(v.confidence)) e.push(`Confidence must be one of ${CONFIDENCE_LEVELS.join(' | ')}.`);
      return e;
    },
  },
});

/** The field suffix of a governed path: 'p_crabs.qtyPerGuest' -> 'qtyPerGuest'. */
export function governedFieldOf(fieldPath) {
  const parts = String(fieldPath || '').split('.');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

/** The type descriptor for a path, or null when the field is not typed here. */
export function fieldTypeFor(fieldPath) {
  return GOVERNED_FIELD_TYPES[governedFieldOf(fieldPath)] || null;
}

/**
 * validateGovernedValue(fieldPath, value) -> { ok, errors[] }
 *
 * UNKNOWN PATHS PASS. This is deliberate and worth being explicit about: it
 * validates what it knows how to validate and refuses to guess at the rest. A
 * blanket reject would break every governed field this registry has not learned
 * yet; a blanket accept for known-but-wrong types is the bug it exists to stop.
 */
export function validateGovernedValue(fieldPath, value) {
  const t = fieldTypeFor(fieldPath);
  if (!t) return { ok: true, errors: [] };
  const errors = t.validate(value) || [];
  return { ok: errors.length === 0, errors };
}

/**
 * validateForEditor(fieldPath, value) -> { ok, errors[] }
 *
 * The stricter pass a human composing a correction must satisfy. Falls back to
 * the type gate for fields with no separate editorial rules.
 */
export function validateForEditor(fieldPath, value) {
  const t = fieldTypeFor(fieldPath);
  if (!t) return { ok: true, errors: [] };
  const errors = (t.validateForEditor || t.validate)(value) || [];
  return { ok: errors.length === 0, errors };
}
