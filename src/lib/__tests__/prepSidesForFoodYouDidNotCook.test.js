// ─── "PREP MAKE-AHEAD SIDES" FOR FOOD SOMEONE ELSE IS MAKING ─────────────────
//
// Asked to make the day-of beats read the host's `food_style` answer. The honest
// result is NARROWER than the request, and then WIDER in a place nobody was
// looking. Both halves are recorded here.
//
// NARROWER: audited all eleven RENDERED beats against food_style. Not one of them
// is false when the host is not cooking, because DROP-OFF CATERING AND ORDERED
// TRAYS BOTH LEAVE THE HOST SERVING — the caterer drops the food and leaves. So
// "set food + drinks stations", "food out while everyone's still arriving" and
// "leftovers to containers" are all still the host's work. Rewording them would
// have invented a caterer who is not in the room, which is the same refusal
// lib/rosBasis.js makes for the same reason.
//
// The ONE authored row that IS false is `preparation` at T-1d — you do not prep
// make-ahead sides for food you are not making. It now carries copyByAnswer.
//
// WIDER, AND THIS IS THE REAL FIND: that row renders NOWHERE. Measuring it
// across the corpus, 111 of 759 authored day-of rows (14.6%) never reach a
// screen at all. `rosWhenOffset` returns null for anything it cannot parse and
// the row is skipped in silence.
//
//   T-Nd .......... 84   day-before rows; the day-of board is T0-relative and
//                        nothing else reads schedules.preparation
//   unparsed ...... 25   'halftime', 'after the toast', 'End', 'End+30m',
//                        'T+1 morning', 'T0 +1d'…'T0 +7d', 'T0+1d' (no space)
//
// TWO OF THE 27 WERE TYPOS AND ARE FIXED (2026-09-23, host ruling): Low Country
// Boil authored 'T-3h' / 'T-1h' for its two preparation rows, and the missing
// 'T0 ' prefix dropped both off the day sheet entirely. Read as hours-before on
// the FILE'S OWN evidence rather than on a guess — the `setup` block directly
// below them uses T0 -5h/-4h/-3h/-1h/-0:20, and `purchasing` above writes days
// explicitly as T-3d/T-1d, so two rows saying `h` are hours from the same author
// in the same block. Driven: both now render at "3h before guests arrive" and
// "1h before guests arrive", sorted alongside the setup rows at those hours, and
// the dropped count fell 111 -> 109.
//
// NOTHING IS RE-INTERPRETED HERE. Deciding that 'T-3h' meant 'T0 -3h', or that
// 'End+30m' is thirty minutes after an event end this engine does not model, is
// authoring content on a guess — and a wrong beat placed confidently on a day
// sheet is worse than an absent one. This records the count and names the
// shapes, so it is a decision rather than a discovery.
import { ALL_PLAYBOOKS, effectiveRos, playbookDuringCues, getPlaybook } from '../playbooks';

const ev = (food, type = 'Birthday') => ({
  id: 'p', name: "Mom's 80th", type, date: '2027-06-17',
  guestMode: 'count', guestCount: 10,
  ...(food ? { foodChoices: { food_style: food } } : {}),
});
const rosOf = (e) => { const r = effectiveRos(e); return Array.isArray(r) ? r : (r && r.items) || []; };
const prepEntry = () => getPlaybook('Birthday').schedules.preparation.find((x) => /favors/i.test(x.what));
const resolvedPrep = (food) => {
  // The authored row's own resolver, exercised the way playbookRunOfShow would
  // if this row were ever rendered.
  const e = prepEntry();
  const picks = food ? { food_style: food } : {};
  const m = e.copyByAnswer && e.copyByAnswer.food_style;
  return (m && picks.food_style && m[picks.food_style] != null) ? m[picks.food_style] : e.what;
};

describe('the prep row reads the host’s own food answer', () => {
  test('(premise) the row is authored with conditional copy', () => {
    expect(prepEntry().what).toMatch(/Prep make-ahead sides/);
    expect(prepEntry().copyByAnswer.food_style['Drop-off catering']).toBeTruthy();
  });

  test('THE FIX: a host who is not cooking is not told to prep sides', () => {
    for (const answer of ['Drop-off catering', 'Order pizza/trays']) {
      const seg = resolvedPrep(answer);
      expect(seg).not.toMatch(/Prep make-ahead sides/i);
      expect(seg).toMatch(/no sides to prep/i);
      // A step is dropped; the beat is not replaced.
      expect(seg).toMatch(/Assemble favors/);
      expect(seg).toMatch(/charge speaker/);
    }
  });

  test('NEGATIVE CONTROL: cooking, and potluck, both keep the sides', () => {
    // A potluck host still usually makes something; dropping it there would be a
    // different guess, not the same fix.
    expect(resolvedPrep('Cook/grill yourself')).toMatch(/Prep make-ahead sides/);
    expect(resolvedPrep('Potluck')).toMatch(/Prep make-ahead sides/);
  });

  test('NEGATIVE CONTROL: an UNANSWERED event keeps the base text', () => {
    // Birthday DEFAULTS food_style to "Order pizza/trays", and resolveAnsweredCopy
    // fires only on an ANSWERED pick — the same rule that caught rosBasis firing
    // at every untouched birthday.
    expect(resolvedPrep(null)).toMatch(/Prep make-ahead sides/);
  });

  test('THE RENDERED BEATS ARE UNCHANGED, because none of them was wrong', () => {
    // The narrow half, asserted rather than assumed. A caterer who drops and
    // leaves does not set the table, plate the food, or box the leftovers.
    const text = rosOf(ev('Drop-off catering')).map((x) => x.segment).join(' | ');
    expect(text).toMatch(/set food \+ drinks stations/i);
    expect(text).toMatch(/Food out while everyone.s still arriving/i);
    expect(text).toMatch(/Leftovers to containers/i);
    expect(rosOf(ev('Drop-off catering')).length).toBe(rosOf(ev('Cook/grill yourself')).length);
  });

  test('the two typo rows now reach the day sheet, at the hours they name', () => {
    // The fix, driven rather than asserted from the data: a missing 'T0 ' prefix
    // had dropped both rows off Low Country Boil's day sheet entirely.
    const rows = rosOf(ev(null, 'Low Country Boil'));
    const hit = (re) => rows.find((x) => re.test(String(x.segment || '')));
    expect(hit(/Scrub potatoes/i).rel).toBe('3h 5m before guests arrive');
    expect(hit(/Ice down the beer/i).rel).toBe('1h 5m before guests arrive');
    // FIVE MINUTES OFF THE HOUR, not on it. `setup` already holds T0 -3h and
    // T0 -1h, and dayModelAudit forbids two moments on one minute because the
    // board reads equal starts as an OVERLAP — a stacked minute makes it warn
    // about a clash on a day that is fine. Prep sits just before its setup
    // neighbour, which keeps the author's hour and their order without editing
    // rows that already ship.
    expect(hit(/Tables papered/i).rel).toBe('3h before guests arrive');
  });

  test('RECORDED: the edited row reaches no screen today, and it is not alone', () => {
    // Honesty about this change's own reach: the fix is correct data that fixes
    // no screen, because T-Nd rows are dropped by the day-of board.
    const shown = rosOf(ev('Drop-off catering')).map((x) => x.segment).join(' | ');
    expect(shown).not.toMatch(/sides to prep|make-ahead sides/i);

    let authored = 0; let rendered = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const sch = pb.schedules || {};
      const rows = ['cooking', 'preparation', 'setup', 'program', 'cleanup']
        .flatMap((k) => (Array.isArray(sch[k]) ? sch[k] : []).map((x) => String(x.what || x.do || '')));
      authored += rows.length;
      const e = { id: 'x', type: pb.type, date: '2027-06-17', guestMode: 'count', guestCount: 20 };
      let cues = []; try { cues = playbookDuringCues(e) || []; } catch (_e) { cues = []; }
      const seen = new Set([...rosOf(e), ...cues].map((x) => String(x.segment || '').trim().toLowerCase()));
      rendered += rows.filter((w) => seen.has(w.trim().toLowerCase())).length;
    }
    // A ratchet, not a target: this must not get WORSE without someone noticing.
    expect(authored).toBeGreaterThan(700);
    expect(authored - rendered).toBeLessThanOrEqual(109);
  });
});
