// ─── THE HALFTIME LAP NOBODY WAS TOLD TO RUN ─────────────────────────────────
//
// Watch Party's cleanup schedule authors `{ when: 'halftime' }` — restock food,
// swap the trash bag, bag the cans, top up the ice. `rosWhenOffset` parses
// `during`, `ongoing` and `T0 ±X` and nothing else, so the bare word returned
// null and every schedule reader dropped the row. Trash on game day is the one
// thing that actually overflows, and the host was never told to deal with it.
//
// THIS WAS A KNOWN DEFECT, RECORDED AND LEFT. The playbook's own `note` field
// has carried it since 2026-09-13: "DISCOVERED, OUT OF SCOPE, NOT FIXED: the
// cleanup schedule's {when:'halftime'} row has never actually reached a host".
// It is fixed now by the moment anchor built for "after the toast", not by
// teaching the parser a sport-specific word.
//
// WHY AN ANCHOR AND NOT A NUMBER. Writing `T0 +1:50` here would work today and
// would make this row a SECOND OWNER of when halftime is — free to drift from
// the program beat it is the cleanup half of. That is the defect class this
// whole sweep has been closing, and it would have been reintroduced by the fix.
import { playbookRunOfShow, getPlaybook } from '../playbooks';

const ev = (answer) => ({
  id: 'wp', name: 'The game', type: 'Watch Party',
  date: '2027-06-17', guestMode: 'count', guestCount: 20,
  ...(answer ? { foodChoices: { major_event: answer } } : {}),
});
const rows = (answer) => playbookRunOfShow(ev(answer));
const lap = (answer) => rows(answer).find((r) => /swap trash bag/i.test(String(r.segment || '')));
const at = (answer, rel) => rows(answer).find((r) => r.rel === rel);

describe('the halftime cleanup lap reaches the host', () => {
  test('(premise) the row is authored against a MOMENT, and the beat it names exists', () => {
    // If either side is ever rewritten, the assertions below start passing or
    // failing for reasons that have nothing to do with this fix.
    const sch = getPlaybook('Watch Party').schedules;
    const authored = sch.cleanup.find((r) => /swap trash bag/i.test(r.what));
    expect(authored.when).toBe('after halftime');
    const beat = sch.program.find((r) => /^Halftime:/.test(String(r.what || '')));
    expect(beat.when).toBe('T0 +1:45');
  });

  test('THE FIX: the lap lands five minutes after the halftime beat, on a real game', () => {
    expect(lap('Super Bowl').rel).toBe('1h 50m in');
    expect(at('Super Bowl', '1h 45m in').segment).toMatch(/^Halftime:/);
  });

  test('…and on the default path, where the host has answered nothing at all', () => {
    // The unanswered event is the one most hosts are on. It must not depend on
    // a pick.
    expect(lap(null).rel).toBe('1h 50m in');
  });

  test('NOT ON THE MINUTE — the board reads equal starts as a clash', () => {
    // dayModelAudit forbids two moments on one minute. The lap FOLLOWS the beat
    // by the corpus's five-minute sequencing step rather than sitting on it.
    const halftime = at('Super Bowl', '1h 45m in');
    expect(lap('Super Bowl').rel).not.toBe(halftime.rel);
  });

  test('THE GATE IS DERIVED, NOT RESTATED: no halftime, no lap', () => {
    // UFC/Boxing, the Masters, Wimbledon, the Draft and an awards show have no
    // halftime, and the program beat is already gated `not: FORMAT_NO_HALFTIME`.
    // The lap disappears because THE ANCHOR IS NOT THERE TO FIND — the row
    // carries no gate of its own, so the two can never drift apart.
    for (const format of ['UFC / Boxing', 'The Masters', 'Wimbledon', 'NFL Draft', 'Awards Show']) {
      expect(at(format, '1h 45m in')).toBeUndefined();
      expect(lap(format)).toBeUndefined();
    }
  });

  test('…and the row genuinely authors NO gate of its own', () => {
    // The load-bearing half of the test above. If someone later "helpfully" adds
    // a whenChoice here, the suppression would still pass while the duplication
    // is back.
    const authored = getPlaybook('Watch Party').schedules.cleanup.find((r) => /swap trash bag/i.test(r.what));
    expect(authored.whenChoice).toBeUndefined();
  });

  test('A REWORDED BEAT KEEPS ITS ANCHOR — the index reads the authored spelling', () => {
    // World Series renders "The 7th-inning stretch" and Kentucky Derby renders
    // "Food + mint julep refresh" — neither contains the word "halftime". Both
    // still get the lap, because the break is real and only its NAME changed.
    // Matching rendered text instead would silently break an anchor every time
    // someone adds a copyByAnswer.
    for (const format of ['World Series', 'Kentucky Derby']) {
      expect(at(format, '1h 45m in').segment).not.toMatch(/halftime/i);
      expect(lap(format).rel).toBe('1h 50m in');
    }
  });

  test('NEGATIVE CONTROL: no other playbook grew a day sheet row', () => {
    // 'after halftime' is authored exactly once in the corpus. Nothing else may
    // have moved.
    const before = rows('Super Bowl').length;
    expect(before).toBeGreaterThan(5);
    const bd = playbookRunOfShow({ id: 'b', type: 'Birthday', date: '2027-06-17', guestMode: 'count', guestCount: 20 });
    expect(bd.some((r) => /swap trash bag/i.test(String(r.segment || '')))).toBe(false);
  });
});
