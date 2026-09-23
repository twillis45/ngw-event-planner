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
// WIDER, AND THIS IS THE REAL FIND: that row rendered NOWHERE. Measuring it
// across the corpus, 111 of 759 authored day-of rows (14.6%) reached no screen
// at all — `rosWhenOffset` returns null for anything it cannot parse and the row
// is skipped in silence.
//
// WHAT HAPPENED NEXT, over the following commits. The parseable shapes were
// given anchors: bare `End` and `End +30m`, then rows anchored to a MOMENT in
// the same day ("after the toast", "after the cake"), then Watch Party's
// `halftime`. The count fell 111 -> 101. Then the remaining shapes were ASKED
// the question nobody had asked — where do these rows surface at all? — and the
// answer was nowhere: 98 `T-Nd`/`T0 +Nd` rows the day board drops by rule, plus
// 152 in a `purchasing` block no function in the codebase reads. All 250 were
// retired on 2026-09-23, because `tasks[]` and `purchases[]` already carried
// their content in better form: per item, checkable, and editable by the host.
//
// THE ROW THIS FILE IS NAMED FOR WAS ONE OF THEM, and it did not just get
// deleted. Its conditional copy was the point of this file, so it moved to
// `tasks[]` as `t_prep_ahead`, where playbookChecklist resolves the same
// copyByAnswer — and where a host can finally see it. The assertions below are
// unchanged in substance; they simply drive the checklist now instead of a
// hand-rolled stand-in for a renderer that never ran.
//
// The corpus gap is now 3 of 661, and none of the three is a defect: two Watch
// Party beats gated to a format this bare event has not chosen, and Retirement
// Party's row anchored to a toast its own program does not contain.
//
// NOTHING WAS RE-INTERPRETED ANYWHERE IN THIS. Deciding that 'End+30m' is thirty
// minutes after an event end the engine does not model, or that a dead row's
// prose should be rendered as-is, is authoring content on a guess — and a wrong
// beat placed confidently on a day sheet is worse than an absent one.
//
// TWO TYPO ROWS WERE FIXED ALONG THE WAY (2026-09-23, host ruling): Low Country
// Boil authored 'T-3h' / 'T-1h' for two preparation rows, and the missing 'T0 '
// prefix dropped both off the day sheet. Read as hours-before on the FILE'S OWN
// evidence rather than a guess — the `setup` block below them uses T0 -5h/-4h/
// -3h/-1h, and the same author wrote days explicitly as T-3d/T-1d elsewhere.
import { ALL_PLAYBOOKS, effectiveRos, playbookDuringCues, getPlaybook, playbookChecklist } from '../playbooks';

const ev = (food, type = 'Birthday') => ({
  id: 'p', name: "Mom's 80th", type, date: '2027-06-17',
  guestMode: 'count', guestCount: 10,
  ...(food ? { foodChoices: { food_style: food } } : {}),
});
const rosOf = (e) => { const r = effectiveRos(e); return Array.isArray(r) ? r : (r && r.items) || []; };
// THE ROW BECAME A TASK (2026-09-23), so these now drive the REAL surface.
// Until then this file simulated the resolver by hand — "the way
// playbookRunOfShow would if this row were ever rendered" — because the row it
// tested rendered nowhere. It was retired along with the other 249 dead rows and
// re-authored as `t_prep_ahead`, where playbookChecklist resolves the same
// copyByAnswer and a host can actually see it. The assertions below are
// unchanged in substance; what changed is that they now exercise the checklist
// instead of a stand-in for it.
const prepEntry = () => getPlaybook('Birthday').tasks.find((t) => t.id === 't_prep_ahead');
const resolvedPrep = (food) => {
  const list = playbookChecklist(ev(food), new Date('2027-06-01T12:00:00')) || [];
  const flat = Array.isArray(list) ? list : (list.items || []);
  const hit = flat.find((x) => /favor bags/i.test(String(x.task || x.label || '')));
  return hit ? String(hit.task || hit.label) : '';
};

describe('the prep row reads the host’s own food answer', () => {
  test('(premise) the task is authored with conditional copy, and is REACHABLE', () => {
    expect(prepEntry().label).toMatch(/make-ahead sides/);
    expect(prepEntry().copyByAnswer.food_style['Drop-off catering']).toBeTruthy();
    // The half that never held before: it is on the checklist a host opens.
    expect(resolvedPrep(null)).toBeTruthy();
  });

  test('THE FIX: a host who is not cooking is not told to prep sides', () => {
    for (const answer of ['Drop-off catering', 'Order pizza/trays']) {
      const seg = resolvedPrep(answer);
      expect(seg).not.toMatch(/make-ahead sides/i);
      expect(seg).toMatch(/no sides to prep/i);
      // A step is dropped; the beat is not replaced.
      expect(seg).toMatch(/favor bags/i);
      expect(seg).toMatch(/charge the speaker/i);
    }
  });

  test('NEGATIVE CONTROL: cooking, and potluck, both keep the sides', () => {
    // A potluck host still usually makes something; dropping it there would be a
    // different guess, not the same fix.
    expect(resolvedPrep('Cook/grill yourself')).toMatch(/make-ahead sides/);
    expect(resolvedPrep('Potluck')).toMatch(/make-ahead sides/);
  });

  test('NEGATIVE CONTROL: an UNANSWERED event keeps the base text', () => {
    // Birthday DEFAULTS food_style to "Order pizza/trays", and resolveAnsweredCopy
    // fires only on an ANSWERED pick — the same rule that caught rosBasis firing
    // at every untouched birthday.
    expect(resolvedPrep(null)).toMatch(/make-ahead sides/);
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

  test('MEASURED: what still does not reach a screen, and why each one is fine', () => {
    // This began as honesty about the fix's own reach — correct data that fixed
    // no screen. The rows it counted have since been retired or anchored.
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
    // 111 → 105 (bare `End` and `End+30m` resolved) → 102 (rows anchored to a
    // MOMENT) → 101 (Watch Party's halftime lap) → 3, when the 250 rows that
    // reached no host were RETIRED rather than rendered. Measured: 661 authored,
    // 658 rendered.
    //
    // `authored` fell 759 → 661 in the same commit, and that is the point rather
    // than a side effect: the gap did not close because more rows started
    // rendering, it closed because rows nothing could render stopped being
    // authored. Both numbers are asserted so a future drop in `authored` cannot
    // quietly flatter the gap.
    //
    // WHAT THE REMAINING 3 ARE. This sweep drives a BARE event with no answers,
    // so a row gated to a choice the host has not made is counted absent here and
    // reaches a screen perfectly well once someone picks that format — Watch
    // Party's undercard and pre-race beats are two of the three. The third is
    // Retirement Party's row anchored to a toast its program does not have, which
    // is reported and deliberately unresolved. None of the three is a defect.
    expect(authored).toBeGreaterThan(600);
    expect(authored).toBeLessThan(700);
    expect(authored - rendered).toBeLessThanOrEqual(3);
  });
});
