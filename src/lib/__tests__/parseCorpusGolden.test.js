// ─── THE GOLDEN FILE FOR THE PARSER SEED CORPUS ──────────────────────────────
//
// Every sentence in fixtures/parseCorpus.mjs is run through parseSmartEventText
// against a FROZEN clock and diffed field by field against the expectation
// recorded beside it. One test per sentence, named with the sentence, so a
// failure reads as "this sentence, this field, expected X got Y" rather than as
// a line number in a wall of assertions.
//
// The corpus file itself explains how to append a sentence — that workflow is
// the whole point of this harness, and it lives with the data, not here.
//
// WHAT THIS DOES NOT DO: it does not assert a field a sentence never supported.
// "Cookout for 20 people" carries no budget, so nothing here claims one — the
// corpus asserts `budget: null` there only because the absence is the point.
import { parseSmartEventText } from '../smartParseEvent';
import { PARSE_CORPUS, PARSER_FIELDS, corpusNow } from './fixtures/parseCorpus.mjs';

// Value comparison that handles the one nested shape the parser emits
// (monthYear) without depending on key order.
function sameValue(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => sameValue(a[k], b[k]));
}

const show = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

describe('the parser seed corpus reparses exactly as recorded', () => {
  test('the corpus is big enough to be a corpus, and holds no duplicate sentences', () => {
    expect(PARSE_CORPUS.length).toBeGreaterThanOrEqual(25);
    const seen = PARSE_CORPUS.map((e) => e.text);
    expect(seen.length - new Set(seen).size).toBe(0);
  });

  test('every entry carries its provenance and at least one expectation', () => {
    // A sentence with no `from` is a sentence nobody can trace back to a host,
    // and a sentence with no expectation asserts nothing at all.
    const thin = PARSE_CORPUS
      .filter((e) => !e.from || !e.expect || Object.keys(e.expect).length === 0)
      .map((e) => e.text);
    expect(thin).toEqual([]);
  });

  test('PARSER_FIELDS names exactly the fields the parser returns', () => {
    // If a field is added, renamed or dropped in smartParseEvent.js, the corpus
    // must be told — otherwise an expectation on a vanished field would pass
    // forever by comparing undefined to undefined.
    const actual = Object.keys(parseSmartEventText('Cookout for 20', { now: corpusNow() })).sort();
    expect(actual).toEqual([...PARSER_FIELDS].sort());
  });

  test('no entry expects a field that does not exist', () => {
    const bogus = [];
    for (const entry of PARSE_CORPUS) {
      for (const field of Object.keys(entry.expect || {})) {
        if (!PARSER_FIELDS.includes(field)) bogus.push(`[${entry.text}] unknown field "${field}"`);
      }
    }
    expect(bogus).toEqual([]);
  });

  PARSE_CORPUS.forEach((entry, i) => {
    test(`#${i + 1} — ${entry.text}`, () => {
      const got = parseSmartEventText(entry.text, { now: corpusNow() });
      const diff = [];
      for (const [field, want] of Object.entries(entry.expect)) {
        if (!sameValue(got[field], want)) {
          diff.push(`${field}: expected ${show(want)}, got ${show(got[field])}`);
        }
      }
      // The sentence is repeated inside the failure payload as well as in the
      // test name: a `--testPathPattern` run prints the name, but a CI summary
      // that only shows the diff still says which sentence broke.
      expect({ sentence: entry.text, mismatches: diff })
        .toEqual({ sentence: entry.text, mismatches: [] });
    });
  });
});
