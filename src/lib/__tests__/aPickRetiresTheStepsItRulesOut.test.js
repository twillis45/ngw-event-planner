// ─── A PICK RETIRES THE STEPS IT RULES OUT (11/21/2026) ─────────────────────
//
// Six step groups stayed on the checklist after a pick made them moot: a
// Reunion with no group photo still had to name its shooter, a Day Party with
// a curated playlist still had to book a DJ. Each row was read against the
// pick before it was gated:
//   • ruled out entirely → `whenChoice`, so the generator drops it and
//     reconcileChecklist retires the stored row (never deleted, revived on a
//     change of mind);
//   • still real work under the pick, with the wrong person named in it (the
//     grill master who is now the host, the DJ cue at a playlist party) →
//     `copyByAnswer`, so the row says who does it instead of standing down.
// A retired row is handled (timelineStepResolved), never overdue, and never
// on the board; the reconcile's toast says how many left.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { getPlaybook, playbookChecklist } from '../playbooks';
import { timelineStepResolved } from '../taskEngine';
import { taskIsOverdue } from '../taskLead';
import { reconcileChecklist, reconcileSummary } from '../checklistReconcile';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

// Two days out, created long ago: every pre-event row named here is past due.
const seed = (type, picks) => ({
  id: 'rule-out-' + type.replace(/\W/g, ''), name: type, type, date: daysFromNow(2),
  guestMode: 'count', guestEstimate: 30, guestCountSource: 'host', guests: [],
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', startTime: '16:00', startTimeSource: 'host',
  totalBudget: 800, budget: [], vendors: [], createdAt: daysFromNow(-120), foodChoices: picks || {},
});
const ids = (ev) => (playbookChecklist(ev) || []).map((r) => r.id.slice(`pbt-${ev.id}-`.length));
const label = (ev, id) => ((playbookChecklist(ev) || []).find((r) => r.id === `pbt-${ev.id}-${id}`) || {}).task;
// The list as stored before the pick: every row open.
const stored = (ev) => (playbookChecklist({ ...ev, foodChoices: {} }) || [])
  .map((r) => ({ id: r.id, task: r.task, leadDays: r.leadDays, week: r.week, category: r.category, done: false }));

const GROUPS = [
  ['Reunion', 'group-photo', 'Skip / candids only', ['t-photographer', 't-call-photo', 't-photo-send', 't-photo-mail'], ['t-photo-album']],
  ['The Cookout', 'grill_master', 'Host grills', ['t_grillmaster'], ['t_meat_shop', 't_grill']],
  ['The Cookout', 'grill_master', 'Hire a pitmaster / caterer', ['t_grillmaster'], ['t_meat_shop', 't_grill']],
  ['Day Party', 'music', 'Curated playlist + good speakers', ['t_bookdj'], ['t_batch', 't_setup']],
  ['Sweet 16', 'music_source', 'Self-run playlist + rented PA/lights', ['t_dj_brief'], ['t_venue_walk', 't_floor', 't_entrance']],
  ['Holiday Party', 'alcohol_service', 'Zero-proof / dry', ['t_bar_model'], ['t_rsvp_chase', 't_shop_alc', 't_replenish']],
];

describe.each(GROUPS)('%s: %s = "%s"', (type, dec, pickVal, gone, kept) => {
  test('PREMISE: the pick is a real option, and unpicked the rows are on the list', () => {
    expect(getPlaybook(type).decisions.find((d) => d.id === dec).options).toContain(pickVal);
    expect(ids(seed(type))).toEqual(expect.arrayContaining([...gone, ...kept]));
  });

  test('the pick drops the rows it rules out, and keeps the work', () => {
    const got = ids(seed(type, { [dec]: pickVal }));
    for (const id of gone) expect(got).not.toContain(id);
    expect(got).toEqual(expect.arrayContaining(kept));
  });

  test('on a stored list, the rows retire: handled, not overdue, off the board, and counted in the toast', () => {
    const before = seed(type);
    const after = { ...seed(type, { [dec]: pickVal }), timeline: stored(before).map((r) => ({ ...r, id: r.id })) };
    // PREMISE: before the pick, the rows are open and late.
    for (const id of gone) {
      const t = after.timeline.find((r) => r.id === `pbt-${after.id}-${id}`);
      if (t.leadDays < 0) expect(taskIsOverdue(t, before)).toBe(true);
    }
    const res = reconcileChecklist(after.timeline, playbookChecklist(after));
    // At least these: a hired pitmaster also retires the cook lever's fire-up
    // rows, which were already gated on the host cooking.
    expect(res.retired).toBeGreaterThanOrEqual(gone.length);
    expect(reconcileSummary(res)).toMatch(new RegExp(`${res.retired} no longer needed`));
    const ev = { ...after, timeline: res.rows };
    for (const id of gone) {
      const t = ev.timeline.find((r) => r.id === `pbt-${ev.id}-${id}`);
      expect(t.retired).toBe(true);
      expect(timelineStepResolved(ev, t)).toBe(true);
      expect(taskIsOverdue(t, ev)).toBe(false);
    }
    const plan = eventPlan(ev, buildExperienceContext(ev, null, 1)) || {};
    const onBoard = [...(plan.nextActions || []), ...(plan.worries || [])].map((a) => String(a.id || ''));
    for (const id of gone) expect(onBoard.some((x) => x.includes(`pbt-${ev.id}-${id}`))).toBe(false);
  });
});

describe('the rows that stay say who does the work now', () => {
  test.each([
    ['The Cookout', 'grill_master', 'Host grills', 't_meat_shop', 'Buy the ribs, chicken, burgers, dogs, links + the spread groceries'],
    ['The Cookout', 'grill_master', 'Host grills', 't_grill', 'Fire the pit and work batches all afternoon; elders served first; bless the food before the plates go'],
    ['The Cookout', 'grill_master', 'Hire a pitmaster / caterer', 't_meat_shop', 'Buy the spread groceries, and the meat unless the pitmaster brings it'],
    ['The Cookout', 'grill_master', 'Hire a pitmaster / caterer', 't_grill', 'The pitmaster works the pit all afternoon; elders served first; bless the food before the plates go'],
    ['Sweet 16', 'music_source', 'Self-run playlist + rented PA/lights', 't_venue_walk', 'Tour venue/hall: capacity, power for the PA and lights, parking, restrooms, curfew'],
    ['Sweet 16', 'music_source', 'Self-run playlist + rented PA/lights', 't_floor', 'Clear and mark the dance floor; place lights; sound check the PA'],
    ['Sweet 16', 'music_source', 'Self-run playlist + rented PA/lights', 't_entrance', 'Stage the grand entrance: clear path, cue the spotlight + song with whoever runs the playlist'],
    ['Elopement', 'photography', 'Self/timer + phone', 't_book_photog', 'Book the officiant; confirm they know the location + permit'],
    ['Elopement', 'photography', 'Self/timer + phone', 't_confirm', 'Confirm the officiant’s arrival, check the forecast, set the day-of timeline, order/pick up the small meal + champagne'],
    ['Elopement', 'photography', 'Self/timer + phone', 't_sign', 'Sign the license with officiant + witnesses; set the timer to capture it; mail/return to the clerk'],
    ['Holiday Party', 'alcohol_service', 'Zero-proof / dry', 't_rsvp_chase', 'Chase non-responders; give the caterer the final guaranteed count'],
    ['Holiday Party', 'alcohol_service', 'Zero-proof / dry', 't_shop_alc', 'Zero-proof drinks + mixers + ice plan + paper goods + cleanup kit (non-perishable)'],
    ['Holiday Party', 'alcohol_service', 'Zero-proof / dry', 't_replenish', 'Keep apps + drinks + water replenished; assign a helper to watch the food'],
  ])('%s %s "%s": %s', (type, dec, pickVal, id, want) => {
    expect(label(seed(type, { [dec]: pickVal }), id)).toBe(want);
  });

  test('the default pick keeps the authored words', () => {
    expect(label(seed('The Cookout'), 't_grill')).toMatch(/^Grill master fires the pit/);
    expect(label(seed('Elopement'), 't_book_photog')).toMatch(/^Book elopement photographer/);
  });
});

describe('a change of mind brings them back', () => {
  test('Reunion: picking a family shooter again revives the photo steps, still open', () => {
    const base = seed('Reunion');
    const skip = { ...seed('Reunion', { 'group-photo': 'Skip / candids only' }), timeline: stored(base) };
    const r1 = reconcileChecklist(skip.timeline, playbookChecklist(skip));
    const back = { ...seed('Reunion', { 'group-photo': 'Assign a family member + set a time' }), timeline: r1.rows };
    const r2 = reconcileChecklist(back.timeline, playbookChecklist(back));
    expect(r2.revived).toBe(4);
    const t = r2.rows.find((r) => r.id === `pbt-${back.id}-t-photographer`);
    expect(t.retired).toBeUndefined();
    expect(t.done).toBe(false);
  });
});
