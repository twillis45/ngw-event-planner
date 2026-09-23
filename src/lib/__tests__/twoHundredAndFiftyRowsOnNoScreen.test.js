// ─── 250 AUTHORED ROWS THAT REACH NO HOST, AND WHY THAT IS CORRECT ───────────
//
// Chasing the last of the unresolved day-sheet rows turned up something bigger
// than the rows themselves. MEASURED, across 45 playbooks:
//
//   152 rows   `schedules.purchasing`   — read by NOTHING. The key is not in
//                                         ROS_SCHEDULE_KINDS, and no other
//                                         function names it. Even its `T0` rows,
//                                         which would resolve fine, are dead:
//                                         the block is never opened.
//    98 rows   `schedules.{preparation,setup,cleanup,cooking}` carrying `T-Nd`
//              or `T0 +Nd` — the key IS read, but rosWhenOffset deliberately
//              returns null for those tokens (index.js:1847 and :1853).
//   ───────
//   250 rows
//
// THE FIRST INSTINCT IS TO BUILD A SURFACE FOR THEM. That would be a mistake,
// and this file exists mainly to say so before someone spends a sprint on it.
//
// BOTH GROUPS ARE SUPERSEDED BY LIVE DATA THAT IS STRICTLY BETTER:
//
//   purchasing  -> `purchases[]`, whose `buyAt` token drives the real shopping
//                  list, its aisle order and its day-of section. Per item,
//                  priced, provenanced, and EDITABLE BY THE HOST.
//   T-Nd prep   -> `tasks[]`, which are specific, individually checkable and
//                  attached to a milestone.
//
// Read them side by side and the schedule rows are an older, coarser draft.
// Client Dinner's dead `T-14d` row reads "Per-head cap agreed, card left on
// file, room noise and accessibility confirmed". Its live tasks say all of
// that separately and actionably: "Set a per-head spend cap and check it
// against your expense policy before the menu is chosen", "Ask the restaurant
// what else is booked in the room that night and whether the music can be
// turned down", "Confirm step-free entry, an accessible restroom, and a seat
// that works for anyone with mobility or hearing needs".
//
// AND RENDERING THEM WOULD REINTRODUCE A DEFECT THIS CODEBASE ALREADY FIXED.
// Watch Party's eighth pass (2026-09-17) found the checklist still telling a
// host to shop for chili they had removed from their list, because the task
// label hard-coded the menu. The lesson recorded there — "a label that
// restates a list the host can edit can only drift out of sync with it" — is
// exactly what 152 rows of prose shopping summaries would do the moment a host
// edits a single item. They cannot lie today only because nobody can read them.
//
// SO THIS IS A RATCHET ON THE WAY OUT, NOT A TODO. The count may FALL — these
// rows are candidates for retirement, which is a host decision, not one to take
// opportunistically across 45 files. It must not RISE: a new row here is
// authoring into a drawer that nothing opens.
import { ALL_PLAYBOOKS, playbookRunOfShow, playbookDuringCues, getPlaybook } from '../playbooks';
import * as PLAYBOOK_API from '../playbooks';

const READ_KEYS = ['cooking', 'preparation', 'setup', 'program', 'cleanup'];
const DAY_OFFSET = [/^T-\d+d/i, /^T0\s*[+-]\s*\d+\s*d\b/i];

const purchasingRows = () =>
  ALL_PLAYBOOKS.flatMap((pb) => (Array.isArray(pb.schedules && pb.schedules.purchasing) ? pb.schedules.purchasing : []));

const offsetRowsInReadKeys = () =>
  ALL_PLAYBOOKS.flatMap((pb) => READ_KEYS.flatMap((k) => {
    const list = (pb.schedules && Array.isArray(pb.schedules[k])) ? pb.schedules[k] : [];
    return list.filter((r) => DAY_OFFSET.some((re) => re.test(String(r.when || ''))));
  }));

describe('the schedule rows that reach no host', () => {
  test('(premise) the corpus is the size this analysis was done against', () => {
    expect(ALL_PLAYBOOKS.length).toBe(45);
    expect(ALL_PLAYBOOKS.filter((pb) => Array.isArray(pb.schedules && pb.schedules.purchasing)).length).toBe(45);
  });

  test('PROVEN BY EXECUTION: a purchasing row reaches no engine output at all', () => {
    // Not a grep. Every exported function is CALLED with a real event and its
    // output searched for a string unique to one purchasing row. A reader added
    // later — by any route, including one nobody thought to grep for — makes
    // this fail, which is the point.
    const needle = 'candles, non-perishables';
    const authored = getPlaybook('Dinner Party').schedules.purchasing.find((r) => String(r.what).includes(needle));
    expect(authored).toBeTruthy();                      // the needle is real
    expect(authored.when).toBe('T-3d');

    const ev = { id: 'd', name: 'Dinner', type: 'Dinner Party', date: '2027-06-17', guestMode: 'count', guestCount: 8 };
    const reached = [];
    let called = 0;
    for (const [name, fn] of Object.entries(PLAYBOOK_API)) {
      if (typeof fn !== 'function') continue;
      let out;
      try { out = fn(ev, new Date('2027-05-01T12:00:00')); }
      catch (_e) { try { out = fn(ev); } catch (_e2) { continue; } }
      called += 1;
      let s = ''; try { s = JSON.stringify(out) || ''; } catch (_e) { s = ''; }
      if (s.includes(needle)) reached.push(name);
    }
    expect(called).toBeGreaterThan(30);                 // the sweep really ran
    expect(reached).toEqual([]);
  });

  test('…and the day-offset rows are dropped from the day sheet by rule', () => {
    // The other 98. Spot-checked on a playbook that authors both ends.
    const ev = { id: 'c', type: 'Client Dinner', date: '2027-06-17', guestMode: 'count', guestCount: 8 };
    const shown = [...playbookRunOfShow(ev), ...(playbookDuringCues(ev) || [])]
      .map((r) => String(r.segment || '')).join(' | ');
    const dead = getPlaybook('Client Dinner').schedules.preparation.filter((r) => /^T-\d+d/.test(r.when));
    expect(dead.length).toBeGreaterThan(0);
    for (const r of dead) expect(shown).not.toContain(String(r.what));
  });

  test('THE RATCHET: the dead count may fall, never rise', () => {
    // Measured 2026-09-23: 152 + 98 = 250 across 45 playbooks. A new row in
    // either group is authoring into a drawer nothing opens — if that is
    // deliberate, lower the number in the same commit and say why.
    const purchasing = purchasingRows().length;
    const offset = offsetRowsInReadKeys().length;
    expect(purchasing).toBeLessThanOrEqual(152);
    expect(offset).toBeLessThanOrEqual(98);
    expect(purchasing + offset).toBeLessThanOrEqual(250);
  });

  test('THE REASON IT IS SAFE TO LEAVE THEM DEAD: the live surface says it better', () => {
    // If `purchases[]` ever stopped carrying buyAt, or tasks[] thinned out, the
    // argument above would collapse and these rows would become a real gap.
    // This holds the premise, not the prose.
    const dp = getPlaybook('Dinner Party');
    const priced = dp.purchases.filter((p) => p.buyAt);
    expect(priced.length).toBeGreaterThan(5);
    expect(new Set(priced.map((p) => p.buyAt)).size).toBeGreaterThan(1);   // more than one buying day

    const cd = getPlaybook('Client Dinner');
    expect(cd.tasks.length).toBeGreaterThan(cd.schedules.preparation.length);
    // The three live tasks that between them cover the dead T-14d row.
    const labels = cd.tasks.map((t) => String(t.label || '')).join(' | ');
    expect(labels).toMatch(/per-head spend cap/i);
    expect(labels).toMatch(/music can be turned down|what else is booked/i);
    expect(labels).toMatch(/step-free entry|accessible restroom/i);
  });
});
