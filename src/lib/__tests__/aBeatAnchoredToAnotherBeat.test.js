// ─── "after the toast" — A BEAT ANCHORED TO ANOTHER BEAT ─────────────────────
//
// Four authored cleanup rows are written against a MOMENT rather than a clock —
// 'after the toast', 'after toast', 'after the cake'. No clock parser can read
// them, so all four were dropped in silence.
//
// The moment is not invented: it is found in the SAME playbook's `program`
// block, by the word the author used. The LAST matching beat wins, because
// "after the toast" means after the toasting is finished.
//
// ONE OF THE FOUR CANNOT RESOLVE, AND MUST NOT. Retirement Party authors 'after
// the toast' and its program contains no toast — it has "The program: the boss,
// the oldest friend…" and "The gift and the honoree's own words". Attaching the
// row to the nearest speech would be this engine deciding what counts as a
// toast. It stays dropped, and that is the honest outcome: the row is anchored
// to a moment its own playbook does not have, which is an authoring gap for a
// person to close.
//
// AND ONE ANCHOR WAS WRONG IN A WAY THAT MATTERED. Anniversary authored 'after
// the toast', which resolves to its WELCOME toast at T0 +30m — so "box leftover
// cake to send home" would have landed 35 minutes in, an hour and a half before
// the cake is served at T0 +2:15. Corrected to 'after the cake' on the corpus's
// own evidence: vowRenewal carries a near-identical row, same text, anchored to
// 'after the cake'. A beat placed confidently at the wrong hour is worse than an
// absent one — which is exactly why this mechanism could not simply be switched
// on and left to land where it fell.
import { effectiveRos, rosAfterMoment, getPlaybook } from '../playbooks';

const ev = (type) => ({ id: 'x', type, date: '2027-06-17', guestMode: 'count', guestCount: 20 });
const rows = (type) => { const r = effectiveRos(ev(type)); return Array.isArray(r) ? r : (r && r.items) || []; };
const find = (type, re) => rows(type).find((x) => re.test(String(x.segment || '')));

describe('a beat anchored to another beat', () => {
  test('the parser reads the authored spellings, and only moment tokens', () => {
    expect(rosAfterMoment('after the toast')).toBe('toast');
    expect(rosAfterMoment('after toast')).toBe('toast');
    expect(rosAfterMoment('after the cake')).toBe('cake');
    expect(rosAfterMoment('after the first dance')).toBe('first dance');
    expect(rosAfterMoment('End+1h')).toBe(null);
    expect(rosAfterMoment('T0 +1h')).toBe(null);
    expect(rosAfterMoment('during')).toBe(null);
  });

  test('THE FIX: the three resolvable rows land after the moment they name', () => {
    // Engagement Party's toast is T0 +1h; Vow Renewal's cake is T0 +2:30.
    expect(find('Engagement Party', /Clear used flutes/i).rel).toBe('1h 5m in');
    expect(find('Vow Renewal', /Box leftover cake/i).rel).toBe('2h 35m in');
  });

  test('Anniversary boxes the cake AFTER the cake, not 35 minutes in', () => {
    // The whole reason the anchor was corrected. Its welcome toast is T0 +30m
    // and its cake is T0 +2:15; the row is about leftover cake.
    expect(find('Anniversary', /Box leftover cake/i).rel).toBe('2h 20m in');
    const cake = find('Anniversary', /^Cake, and their song/i);
    expect(cake.rel).toBe('2h 15m in');
    // And it sorts AFTER the cake, which is the point.
    const at = (re) => rows('Anniversary').findIndex((x) => re.test(String(x.segment || '')));
    expect(at(/^Cake, and their song/i)).toBeLessThan(at(/Box leftover cake/i));
  });

  test('NEGATIVE CONTROL: a moment the playbook does not have stays dropped', () => {
    // Retirement Party: 'after the toast', no toast in its program. Attaching it
    // to the nearest speech would be the engine deciding what a toast is.
    const pb = getPlaybook('Retirement Party');
    expect(pb.schedules.program.some((x) => /toast/i.test(String(x.what || '')))).toBe(false);
    expect(find('Retirement Party', /Clear used flutes/i)).toBeUndefined();
  });

  test('NEGATIVE CONTROL: no other playbook’s day sheet moved', () => {
    expect(rows('Birthday').length).toBe(11);
    expect(rows('Birthday').some((x) => /after/i.test(String(x.rel)))).toBe(false);
  });

  test('NEGATIVE CONTROL: the moment word must match real beat text', () => {
    // The match is against the program beat's own words — a playbook with no
    // beat containing the word cannot resolve, which is what keeps this a
    // lookup rather than a guess.
    expect(getPlaybook('Vow Renewal').schedules.program
      .some((x) => /cake/i.test(String(x.what || '')))).toBe(true);
    expect(getPlaybook('Engagement Party').schedules.program
      .some((x) => /toast/i.test(String(x.what || '')))).toBe(true);
  });
});
