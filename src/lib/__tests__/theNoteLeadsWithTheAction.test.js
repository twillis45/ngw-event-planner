// ─── AUGUSTA'S CONCESSION HISTORY BEFORE WHAT TO BUY ─────────────────────────
//
// Host report: the Watch Party playbooks "put too much copy into food
// descriptions". MEASURED across all 45 playbooks, purchase notes only — the
// text that renders on a shopping row:
//
//   corpus average            111 chars over 527 notes
//   Quinceañera               189      Watch Party (before)   153
//   New Year's Eve            157      Watch Party (after)    128
//
// SO THE HEADLINE COMPLAINT IS HALF RIGHT AND THE FIRST MEASUREMENT WAS WRONG.
// A first pass regexed every `note:` in the source files and reported Watch
// Party at an average of 685 with a 15,063-character maximum — by far the worst
// in the corpus. That 15KB note is in the `knowledge` block: the playbook's own
// provenance documentation, which never reaches a host. Counting it measured
// the wrong population. Watch Party's real position was THIRD, not first.
//
// WHAT WAS ACTUALLY WRONG WAS ORDER, NOT LENGTH. Four Watch Party rows opened
// with the trivia and buried the instruction after an em dash:
//
//   "Augusta National's own concession stand has sold a $1.50 pimento cheese
//    sandwich since 2002 — the tournament's signature food. This band prices
//    making the same sandwich (cheese, mayo, pimento, bread) at home…"
//
// A host standing in a shop needs the four ingredients, not the year the stand
// opened. Compare the row that was already right: "Plan 2 drinks in the first
// hour then 1 an hour after — the convention caterers buy to."
//
// So the five longest were rewritten instruction-first, keeping every sourced
// fact as the REASON rather than the opening. Nothing was deleted: the
// citations live in `provenance` / `costProvenance` blocks, not in the note, so
// a shorter note loses no grounding. Measured after: 153 -> 128 average, 273 ->
// 189 longest, and rows over 200 characters 4 -> 0.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';

const notesOf = (pb) => (pb.purchases || []).filter((p) => p && p.note).map((p) => String(p.note));
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);

describe('a shopping note leads with the shopping', () => {
  test('(premise) the corpus really is measured over purchase notes, not all notes', () => {
    // The distinction the first measurement missed. `knowledge.note` is
    // documentation and is intentionally long; it must never be counted as
    // host-facing copy, and it must never be trimmed for being long.
    const wp = getPlaybook('Watch Party');
    expect(notesOf(wp).length).toBeGreaterThan(10);
    expect(String(wp.knowledge.note).length).toBeGreaterThan(5000);
  });

  test('THE FIX: no Watch Party shopping note runs past 200 characters', () => {
    const over = notesOf(getPlaybook('Watch Party')).filter((n) => n.length > 200);
    expect(over).toEqual([]);
  });

  test('Watch Party now sits inside the corpus spread, not above it', () => {
    const wp = avg(notesOf(getPlaybook('Watch Party')).map((n) => n.length));
    const all = ALL_PLAYBOOKS.flatMap((pb) => notesOf(pb).map((n) => n.length));
    expect(wp).toBeLessThanOrEqual(avg(all) + 25);
  });

  test('the five rewritten rows open with the thing you do, not the trivia', () => {
    // Named individually so a later authoring pass that reinstates the old
    // opening fails here rather than drifting back silently.
    const note = (id) => String((getPlaybook('Watch Party').purchases || []).find((p) => p.id === id).note);
    expect(note('p_pimentocheese')).toMatch(/^Cheese, mayo, pimento/);
    expect(note('p_pimms_strawberries')).toMatch(/^Strawberries, cream and Pimm/);
    expect(note('p_worldcupcolors')).toMatch(/^Flags, jerseys and face paint/);
    expect(note('p_teamcolors')).toMatch(/^Team colors, flags and banners/);
    expect(note('p_serveware')).toMatch(/^Consumables only/);
  });

  test('NEGATIVE CONTROL: the sourced facts survived the trim', () => {
    // Shortening must not become deleting. Each rewritten note still carries
    // the specific, checkable fact that justified the row existing at all.
    const note = (id) => String((getPlaybook('Watch Party').purchases || []).find((p) => p.id === id).note);
    expect(note('p_pimentocheese')).toMatch(/Augusta/);
    expect(note('p_pimentocheese')).toMatch(/\$1\.50/);
    expect(note('p_pimms_strawberries')).toMatch(/Wimbledon/);
    expect(note('p_pimms_strawberries')).toMatch(/300,000/);
    expect(note('p_teamcolors')).toMatch(/Playoff/);
    expect(note('p_serveware')).toMatch(/\$55-75/);
  });

  test('NEGATIVE CONTROL: the citations were never in the note to begin with', () => {
    // The reason trimming is safe. If a future pass moves grounding INTO the
    // note text, this stops being true and shortening starts costing evidence.
    const rows = (getPlaybook('Watch Party').purchases || []).filter((p) => p && p.note);
    const grounded = rows.filter((p) => p.provenance || p.costProvenance);
    expect(grounded.length).toBeGreaterThan(10);
  });

  test('NEGATIVE CONTROL: no OTHER playbook was touched', () => {
    // The complaint was about Watch Party. Quinceañera is measurably worse and
    // is deliberately left alone — a copy pass on it is its own decision, not a
    // side effect of this one.
    expect(avg(notesOf(getPlaybook('Quinceañera')).map((n) => n.length))).toBeGreaterThan(150);
    expect(notesOf(getPlaybook('Crab Feast')).some((n) => n.length > 400)).toBe(true);
  });
});
