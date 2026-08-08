/**
 * EVERY AUTHORED SEVERITY MUST RENDER A REAL LABEL — asserted over the corpus,
 * not over a handful of examples.
 *
 * The defect this gates was invisible precisely because the fallback looked
 * like an answer. `{ high, medium, low }[sev] || 'Worth a look'` renders a
 * plausible chip for a value it does not know, so 261 `med` records and 4
 * `critical` records shipped a string nobody chose, and the `critical` rows
 * were painted amber — QUIETER than `high`. Among them:
 *
 *     holidayParty r_saferides  "An impaired guest is about to drive home"
 *     holidayParty r_overserve  self-serve bar, guests over-served
 *     dinnerParty  r_dietary    "Menu locked before allergies collected"
 *
 * An example-based test would have passed throughout: someone would have
 * written `expect(label('high')).toBe(...)` and never typed 'med'. So this
 * walks the ACTUAL playbook data and fails on any value the display layer does
 * not know. The corpus is the fixture.
 */
const fs = require('fs');
const path = require('path');
const {
  RISK_RANK, isKnownRiskSeverity, normalizeRiskSeverity, riskRank,
  riskSeverityLabel, riskSeverityTone, raisesToCommandBoard,
} = require('../riskSeverity');

const DATA = path.join(__dirname, '../playbooks/data');

/** Every `severity: '...'` literal authored anywhere in the playbook corpus. */
function authoredSeverities() {
  const out = [];
  for (const f of fs.readdirSync(DATA).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(DATA, f), 'utf8');
    for (const m of src.matchAll(/severity:\s*'([^']*)'/g)) out.push({ file: f, sev: m[1] });
  }
  return out;
}

describe('risk severity display covers everything the playbooks author', () => {
  const authored = authoredSeverities();

  test('the corpus is non-empty — this test must never pass vacuously', () => {
    // Guard the guard: a bad path or a renamed directory would otherwise make
    // every assertion below trivially true over an empty array.
    expect(authored.length).toBeGreaterThan(300);
  });

  test('every authored severity is one the display layer knows', () => {
    const unknown = [...new Set(authored.filter((a) => !isKnownRiskSeverity(a.sev))
      .map((a) => `${a.sev} (${a.file})`))];
    expect(unknown).toEqual([]);
  });

  test('both med and medium exist in the data and collapse to one tier', () => {
    // The premise of the whole fix. If a future cleanup normalizes the data to
    // one spelling, this fails loudly and the alias can be retired deliberately
    // rather than discovered missing.
    const spellings = new Set(authored.map((a) => a.sev));
    expect(spellings.has('med')).toBe(true);
    expect(normalizeRiskSeverity('med')).toBe('medium');
    expect(normalizeRiskSeverity('medium')).toBe('medium');
    expect(riskRank('med')).toBe(riskRank('medium'));
  });

  test('critical is authored, and it is louder than high — never quieter', () => {
    const crit = authored.filter((a) => a.sev === 'critical');
    expect(crit.length).toBeGreaterThan(0);
    // Rank: critical sorts ahead of high.
    expect(riskRank('critical')).toBeLessThan(riskRank('high'));
    // Colour: critical must not land on the muted or warn band, which is what
    // the old ternary did by falling through to `warn`.
    expect(riskSeverityTone('critical')).toEqual(riskSeverityTone('high'));
    expect(riskSeverityTone('critical').color).toBe('var(--danger)');
  });

  test('critical raises to the command board; medium and low still do not', () => {
    // The 2026-07-14 ruling: a static authored contingency is not an emergency.
    expect(raisesToCommandBoard('critical')).toBe(true);
    expect(raisesToCommandBoard('high')).toBe(true);
    expect(raisesToCommandBoard('med')).toBe(false);
    expect(raisesToCommandBoard('medium')).toBe(false);
    expect(raisesToCommandBoard('low')).toBe(false);
  });

  test('every tier renders a distinct, non-empty label', () => {
    const labels = ['critical', 'high', 'medium', 'low'].map(riskSeverityLabel);
    for (const l of labels) expect(typeof l === 'string' && l.length > 0).toBe(true);
    expect(new Set(labels).size).toBe(4);
  });

  test('the labels separate at chip distance — distinct first words', () => {
    // The old set was "Worth planning now" / "Worth a look" / "Keep an eye on
    // it" / "Minor": three of four opened with the same word, which is exactly
    // the glance distance a chip is read at.
    const first = ['critical', 'high', 'medium', 'low']
      .map((s) => riskSeverityLabel(s).split(/[\s—]+/)[0].toLowerCase());
    expect(new Set(first).size).toBe(4);
  });

  test('an unknown severity never invents a label — it lands on a real tier', () => {
    expect(isKnownRiskSeverity('urgent')).toBe(false);
    expect(normalizeRiskSeverity('urgent')).toBe('medium');
    expect(riskSeverityLabel('urgent')).toBe(riskSeverityLabel('medium'));
    // And the old fallback string is gone from the vocabulary entirely.
    for (const s of ['critical', 'high', 'medium', 'low', 'urgent', '', null]) {
      expect(riskSeverityLabel(s)).not.toBe('Worth a look');
    }
  });

  test('RISK_RANK still spells the tiers the sort in playbooks/index.js expects', () => {
    expect(RISK_RANK).toEqual({ critical: 0, high: 1, med: 2, medium: 2, low: 3 });
  });
});

describe('the shell renders severity through the one table', () => {
  const SHELL = fs.readFileSync(
    path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');

  test('no inline severity lookup survives in the shell', () => {
    // Two verbatim copies of the broken map existed. A third would reintroduce
    // the defect on one of the two risk lists and pass every other test here.
    expect(SHELL).not.toMatch(/high:\s*'Worth planning now'/);
    expect(SHELL).not.toMatch(/'Worth a look'/);
  });

  test('both risk rows call the shared helpers', () => {
    expect([...SHELL.matchAll(/riskSeverityTone\(/g)]).toHaveLength(2);
    expect([...SHELL.matchAll(/riskSeverityLabel\(/g)]).toHaveLength(2);
  });
});
