// ─── 250 ROWS RETIRED, AND THE SEVEN THAT WERE MOVED INSTEAD ─────────────────
//
// This replaces `twoHundredAndFiftyRowsOnNoScreen.test.js`, which measured a
// state that no longer exists. That file established the finding and argued
// against building a surface for it; this one holds the state that followed.
//
// WHAT WAS RETIRED (2026-09-23), measured across 45 playbooks:
//
//   152 rows   `schedules.purchasing`   — a key no function in the codebase
//                                         read. Not in ROS_SCHEDULE_KINDS, named
//                                         nowhere else. Even its `T0` rows,
//                                         which would resolve, were dead: the
//                                         block was never opened.
//    98 rows   `T-Nd` / `T0 +Nd` in the read keys — dropped by rule.
//   ───────
//   250 rows, none of which had ever reached a host.
//
// WHY DELETING WAS SAFE, AND HOW THAT WAS ESTABLISHED. Not by assertion: every
// clause of every dead row was checked against every LIVE surface — tasks,
// purchases, milestones, decisions, risks, contingencies, and the schedule rows
// that do render. `purchases[].buyAt` already drove the real shopping list and
// its day-of section, per item and editable by the host; `tasks[]` already said
// the same things more specifically and checkably.
//
// THE FIRST SWEEP GOT IT WRONG, AND THE REASON IS THE LESSON. It asked only
// whether tasks/purchases/milestones/decisions covered each clause, and returned
// a long list of "uncovered" content that was in fact carried by risks and by
// live schedule rows — bachelorParty's "charge phones + speaker" sits in its own
// `T0 -3h` beat, sweet16's charged backup device in a risk mitigation. The right
// detector on the WRONG POPULATION is still a wrong answer. Only when the
// population was every surface a host can see did the number mean anything.
//
// SEVEN THINGS WERE MOVED RATHER THAN DELETED, because they had no live carrier
// and were worth keeping. They are asserted below on the surfaces that now show
// them — the point of the move was reach, so reach is what gets tested. One
// further gap, PTA's missing ice, is covered by its own file.
import { ALL_PLAYBOOKS, getPlaybook, playbookChecklist } from '../playbooks';

const READ_KEYS = ['cooking', 'preparation', 'setup', 'program', 'cleanup'];
const DAY_OFFSET = [/^T-\d+d/i, /^T0\s*[+-]\s*\d+\s*d\b/i];

const ev = (type) => ({
  id: 't', name: 'x', type, date: '2027-06-17', guestMode: 'count', guestCount: 20,
});
const checklistText = (type) => {
  const list = playbookChecklist(ev(type), new Date('2027-04-01T12:00:00')) || [];
  const flat = Array.isArray(list) ? list : (list.items || []);
  return flat.map((x) => String(x.task || x.label || '')).join(' | ');
};

describe('the dead rows are gone and what mattered in them is not', () => {
  test('(premise) the corpus is still the corpus — this is not a vacuous pass', () => {
    expect(ALL_PLAYBOOKS.length).toBe(45);
    const rows = ALL_PLAYBOOKS.flatMap((pb) => READ_KEYS.flatMap((k) => (
      (pb.schedules && Array.isArray(pb.schedules[k])) ? pb.schedules[k] : [])));
    expect(rows.length).toBeGreaterThan(600);
  });

  test('THE RETIREMENT: `purchasing` is gone as a KEY, not merely emptied', () => {
    // Asserted by absence of the key, so re-adding `purchasing: []` to "keep the
    // shape" fails too — an empty block is an invitation to refill it.
    const left = ALL_PLAYBOOKS.filter((pb) => pb.schedules && 'purchasing' in pb.schedules).map((pb) => pb.type);
    expect(left).toEqual([]);
  });

  test('THE RETIREMENT: not one day-offset row survives in a read key', () => {
    const left = ALL_PLAYBOOKS.flatMap((pb) => READ_KEYS.flatMap((k) => (
      ((pb.schedules && Array.isArray(pb.schedules[k])) ? pb.schedules[k] : [])
        .filter((r) => DAY_OFFSET.some((re) => re.test(String(r.when || ''))))
        .map((r) => `${pb.type}/${k}: ${r.when}`))));
    expect(left).toEqual([]);
  });

  test('MOVED, NOT LOST: Birthday still charges the speaker — and now says so on the checklist', () => {
    // The only mention of the speaker anywhere in this playbook. It lived in a
    // row no host could see, and a flat battery at the cake moment is exactly
    // the kind of thing nobody plans for.
    const text = checklistText('Birthday');
    expect(text).toMatch(/charge the speaker/i);
    expect(text).toMatch(/make-ahead sides/i);
    expect(text).toMatch(/favor bags/i);
  });

  test('MOVED, NOT LOST: Graduation preps its cold sides', () => {
    // This playbook had no food-prep task at all — only shopping. Buying a salad
    // is not making one.
    expect(checklistText('Graduation')).toMatch(/prep the cold sides/i);
  });

  test('MOVED, NOT LOST: Housewarming returns what it borrowed, and thanks people', () => {
    // Its day-of reset ended with "finish the rest in the morning" and then named
    // none of it. Borrowed chairs come from neighbours who do not chase them.
    const text = checklistText('Housewarming');
    expect(text).toMatch(/borrowed chairs|whoever lent them/i);
    expect(text).toMatch(/thank-yous/i);
  });

  test('MOVED, NOT LOST: the Holiday Party cocktail actually gets batched', () => {
    // `p_signature`'s own note says "Batch ahead so no one mixes to order", and
    // nothing performed the batching. Buying the base is not making the punch.
    expect(checklistText('Holiday Party')).toMatch(/batch the signature cocktail/i);
  });

  test('MOVED, NOT LOST: the Reunion reconfirms its vendors a week out', () => {
    // It booked them at T-40d and never touched them again. Reconfirming is the
    // step that catches a van nobody actually reserved.
    expect(checklistText('Reunion')).toMatch(/reconfirm every booked vendor/i);
  });

  test('MOVED, NOT LOST: the Bachelor Party marinates what it bought', () => {
    expect(checklistText('Bachelor Party')).toMatch(/marinate the proteins/i);
  });

  test('NOT DUPLICATED: content that already had a live carrier was NOT re-added', () => {
    // The discipline the first sweep failed. bachelorParty's dead row also said
    // "charge phones + speaker" and "confirm rides" — both already live, in a
    // `T0 -3h` beat and in `t_rides`. Re-adding them would have put the same
    // instruction on the checklist twice, which is how a list stops being read.
    const bp = getPlaybook('Bachelor Party');
    const added = bp.tasks.filter((t) => t.id === 't_prep_protein');
    expect(added.length).toBe(1);
    expect(String(added[0].label)).not.toMatch(/charge|rides/i);
    // …and the live carriers are still there, so this is a no-duplication claim
    // rather than a no-coverage one.
    const live = JSON.stringify(bp.schedules) + bp.tasks.map((t) => t.label).join(' ');
    expect(live).toMatch(/charge phones/i);
    expect(bp.tasks.some((t) => /safe-rides/i.test(String(t.label)))).toBe(true);
  });
});
