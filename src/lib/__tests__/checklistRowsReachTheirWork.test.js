// ─── CHECKLIST ROWS REACH THE SURFACE THAT DOES THE WORK (11/21/2026) ───────
//
// An audit walked every buttonless or misrouted checklist row against the
// surfaces hostv2 already renders. Each row below had a real surface and
// either no button or a button to the wrong place:
//   • Group Trip "Collect the rest of each person's share" had none; Split the
//     costs is where each person's share and who owes whom is kept.
//   • Bachelor "Name a buddy for the groom + a sober point-person" had none:
//     the helper rule knew "point person" but not "point-person".
//   • Repast "Share the repast place and time" had none; the guest list's
//     Share & invite block is the link that carries both.
//   • Sweet 16 "custom hashtag + photo-booth frame" had none; Make it yours
//     holds the event hashtag.
//   • Quinceañera "confirm cake and flower delivery windows" had none; the
//     baker's and the florist's own vendor rows hold their times.
//   • Team Retreat "Send arrival instructions…" had none; Updates to everyone
//     posts one note on every guest's invite (as Group Trip's house norms do).
//   • Three rows opened Calls to make on a `tribute` call their playbook does
//     not have: Juneteenth's meaning moment (its call is `meaning`) and two
//     Anniversary slideshow rows (its call is `slideshow`).
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { playbookChecklist, getPlaybook } from '../playbooks';

const ev = (type, extra) => ({ id: 'reach', type, date: '2026-12-31', guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX', ...(extra || {}) });
const landing = (type, taskId, extra) => {
  const e = ev(type, extra);
  const row = (playbookChecklist(e, '2026-10-01') || []).find((r) => r.id === `pbt-${e.id}-${taskId}`);
  if (!row) throw new Error(`${type} has no ${taskId} row`);
  const hit = routeByWords(row.task, { taskId: row.id, week: row.week, category: row.category }, e);
  return { row, hit, to: hit && hit.route ? resolveRoute(hit.route) : null };
};

describe('rows that had no button reach their surface', () => {
  test.each([
    ['Group Trip', 't_balance', 'split', null],
    ['Bachelor Party', 't_buddy', 'space', null],
    ['Repast', 't_spread', 'guests', 'invites'],
    ['Sweet 16', 't_social', 'meaning', 'hashtag'],
    ['Team Retreat', 't_final_comms', 'guests', 'updates'],
  ])('%s %s → %s', (type, id, kind, focus) => {
    const { hit, to } = landing(type, id);
    expect(hit).toBeTruthy();
    expect(to).toEqual(expect.objectContaining({ kind, focus }));
  });

  test('Quinceañera: the delivery windows open the baker’s row, then the florist’s', () => {
    const vendors = [
      { id: 'v-dj', name: 'DJ Rico', category: 'DJ', status: 'Considering' },
      { id: 'v-cake', name: 'Dulce Bakery', category: 'Cake', status: 'Booked' },
      { id: 'v-flor', name: 'Rosa Florals', category: 'Florals', status: 'Considering' },
    ];
    // The florist is not booked yet, so it is the row still needing the host.
    expect(landing('Quinceañera', 't_pickups', { vendors }).to).toEqual(expect.objectContaining({ kind: 'vendors', focus: 'v-flor' }));
    // Both booked: the first of the two, never the DJ.
    const booked = vendors.map((v) => ({ ...v, status: 'Booked' }));
    expect(landing('Quinceañera', 't_pickups', { vendors: booked }).to).toEqual(expect.objectContaining({ kind: 'vendors', focus: 'v-cake' }));
    // Neither added yet: add one.
    const none = landing('Quinceañera', 't_pickups', { vendors: [vendors[0]] });
    expect(none.hit.route).toEqual({ tab: 'Vendors', focusField: 'vendor-add' });
  });
});

// The neighbors the new rules must not catch, found in the full route-map diff.
describe('neighbors stay where they were', () => {
  test.each([
    // Buying the flowers or picking up the cake is shopping, not a delivery check.
    ['Anniversary', 't_fresh_shop', 'food'],
    ['Vow Renewal', 't_fresh_shop', 'food'],
    // Group Trip's deposit stays on Your money.
    ['Group Trip', 't_deposit', 'budget'],
  ])('%s %s stays on %s', (type, id, kind) => {
    expect(landing(type, id).to).toEqual(expect.objectContaining({ kind }));
  });
});

describe('a tribute row opens the call its own playbook has', () => {
  test.each([
    ['Juneteenth Cookout', 't_program_plan', 'meaning'],
    ['Anniversary', 't_buildshow', 'slideshow'],
    ['Anniversary', 't_after_share_show', 'slideshow'],
    // Retirement has a tribute call, and keeps it.
    ['Retirement Party', 't_slideshow', 'tribute'],
  ])('%s %s → %s', (type, id, call) => {
    const { to } = landing(type, id);
    expect(to).toEqual(expect.objectContaining({ kind: 'decisions', focus: call }));
    expect(getPlaybook(type).decisions.map((d) => d.id)).toContain(call);
  });
});

describe('the two new landings resolve', () => {
  test('cost-split opens Split the costs', () => {
    expect(resolveRoute({ focusField: 'cost-split' })).toEqual({ kind: 'split', focus: null });
  });
  test('meaning-hashtag opens Make it yours on the hashtag', () => {
    expect(resolveRoute({ focusField: 'meaning-hashtag' })).toEqual({ kind: 'meaning', focus: 'hashtag' });
  });
});
