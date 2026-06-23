// quantityBasis — the "because" behind a shopping quantity.
//
// This module does NOT invent ratios. Every per-person / per-N factor is read
// from the canonical playbook purchase rows (src/lib/playbooks/data/*: the
// authored `qtyPerGuest`, `qtyFlat`, `qtyPer` fields, each traceable to a
// `provenance` note). This is the No-Guesswork honesty rule made literal: we
// only ever FORMAT a number the playbook already stands behind — we never guess,
// pad, or buffer it. When a row has no per-person rate (a flat buy like "1 grill"
// or a whole-good that was unit-converted), this returns '' — no basis, never a
// fabricated one.
//
// Pure, no deps, no I/O. The output is a short rate phrase the shopping-list
// deliverable appends to a line, e.g.:
//   { qtyPerGuest: 0.5, unit: 'lb' }        → "½ lb/guest"
//   { qtyPerGuest: 2,   unit: 'drinks' }    → "2/guest"   (count unit dropped — the line already names it)
//   { qtyPer: 13, qtyFlat: 1, unit: 'cake' }→ "1 cake per 13 guests"
//   { qtyFlat: 6, unit: 'candles' }         → ""           (flat buy — no per-person basis)

// Common fractions read friendlier than decimals on a shopping line.
const FRACTIONS = [
  [0.5, '½'], [0.25, '¼'], [0.75, '¾'],
  [0.33, '⅓'], [0.34, '⅓'], [0.67, '⅔'], [0.66, '⅔'],
];

function fmtRate(n) {
  if (!(n > 0)) return '';
  const f = FRACTIONS.find(([v]) => Math.abs(v - n) < 0.005);
  if (f) return f[1];
  return String(Math.round(n * 100) / 100); // 1.0 → "1", 1.50 → "1.5"
}

// A count-ish unit is redundant on a rate ("2 drinks/guest" when the line already
// says "60 drinks") — drop it so the basis reads "2/guest". Weight/volume units
// (lb, oz, bottle) stay, singularized for the rate: "½ lb/guest".
const COUNT_UNIT = /^(each|count|unit|units|piece|pieces|serving|servings|drink|drinks|napkin|napkins|candle|candles|arrangement|arrangements)$/;

function unitWord(unit) {
  // Drop a compound "per N guests" tail some playbooks bake into the unit string
  // ("loaf per 4 guests") — the per-N already lives in qtyPer, so keep only the noun.
  const u = String(unit || '').split('(')[0].split(/\s+per\s+/i)[0].trim().toLowerCase();
  if (!u || COUNT_UNIT.test(u)) return '';
  return u.replace(/s$/, '');
}

// p: a playbook purchase row (or any object carrying the authored qty fields).
export function quantityBasis(p) {
  if (!p) return '';
  if (typeof p.qtyPerGuest === 'number' && p.qtyPerGuest > 0) {
    const r = fmtRate(p.qtyPerGuest);
    const u = unitWord(p.unit);
    return u ? `${r} ${u}/guest` : `${r}/guest`;
  }
  if (typeof p.qtyPer === 'number' && p.qtyPer > 0) {
    const flat = typeof p.qtyFlat === 'number' && p.qtyFlat > 0 ? p.qtyFlat : 1;
    const u = unitWord(p.unit) || 'unit';
    return `${flat} ${flat === 1 ? u : u + 's'} per ${p.qtyPer} guests`;
  }
  return '';
}
