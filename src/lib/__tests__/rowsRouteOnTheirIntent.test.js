// ─── A CHECKLIST ROW OPENS WHAT ITS VERB DOES, NOT ITS FIRST NOUN (11/22/2026) ─
//
// Lane A audit, every type walked signed out at phone width (P0-2, P1-6):
//   • "The crab order" (blue-crab sizes, "25 serious pickers") opened on any row
//     that said crab or crawfish: Juneteenth's local-tradition row, Crawfish
//     Boil's sourcing, count and pickup, Low Country Boil's seasoning and
//     shrimp, and Crab Feast's own invite and slaw rows.
//   • 30+ rows across 19 types opened the wrong surface because the router took
//     the first keyword it met ("alcohol", "tables", "decor", "book", "pay")
//     ahead of the row's act: "Send invitations…" opened the spread, the Gala's
//     "Mail invitations" opened seating, "Book florist" opened the shopping list,
//     "Set a per-head spend cap" opened the spread, "Ask each person for a firm
//     yes" opened Your money.
// Each row below is the real playbook row, through the real router and resolver.
// Expected: `kind` (any focus), `kind:focus` (exact), or null (real-world work
// with no screen keeps no button rather than a wrong one).
import { routeByWords } from '../__fixtures__/stepByWords';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { ALL_PLAYBOOKS, playbookChecklist } from '../playbooks';

const ev = (type) => ({ id: 'intent', type, date: '2026-12-31', guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' });
const landing = (type, taskId) => {
  const e = ev(type);
  const row = (playbookChecklist(e, '2026-10-01') || []).find((r) => r.id === `pbt-${e.id}-${taskId}`);
  if (!row) throw new Error(`${type} has no ${taskId} row`);
  const hit = routeByWords(row.task, { taskId: row.id, week: row.week, category: row.category }, e);
  const to = hit && hit.route ? resolveRoute(hit.route) : null;
  return { row, hit, where: to ? (to.focus ? `${to.kind}:${to.focus}` : to.kind) : (hit && hit.href ? 'external' : null) };
};
const matches = (where, want) => (want === null ? where === null
  : want.includes(':') ? where === want : String(where || '').split(':')[0] === want);

describe('P1-6: the row’s act wins over an incidental noun', () => {
  test.each([
    // Sending or mailing the invitations is the invite.
    ['Sweet 16', 't_invites', 'guests:invites'],
    ['Bachelorette Party', 't_invite', 'guests:invites'],
    ['Juneteenth Cookout', 't_invite', 'guests:invites'],
    ['Fundraiser / Gala', 't_invites', 'guests:invites'],
    ['Wedding', 't_invites', 'guests:invites'],
    // Booking or ordering from a vendor is Vendors.
    ['Elopement', 't_book_photog', 'vendors'],
    ['Elopement', 't_confirm', 'vendors'],
    ['Quinceañera', 't_florist', 'vendors'],
    ['Vow Renewal', 't_florals', 'vendors'],
    ['Bachelor Party', 't_book', 'vendors'],
    // Money agreements are Your money.
    ['Client Dinner', 't_budget', 'budget'],
    ['Client Dinner', 't_check', 'budget'],
    // A firm yes is the guest list.
    ['Group Trip', 't_commit', 'guests:entry'],
    // A committee is people with jobs: the helpers.
    ['Fundraiser / Gala', 't_committee', 'space'],
    ['PTA / Booster Fundraiser', 't_committee', 'space'],
    // The school's facility-use request is a place rule, like a permit.
    ['PTA / Booster Fundraiser', 't_facility', 'space:rules'],
    // Toasts: the call where the playbook has one; Holiday Party has none, and
    // a planning row never opens the day-of board, so it keeps no button.
    ['Engagement Party', 't_toast_brief', 'decisions:toast'],
    ['Holiday Party', 't_toast', null],
    // Rehearsing the processional is the order of the day.
    ['Vow Renewal', 't_rehearse', 'stage:day'],
    // One message to the whole group is an update to everyone.
    ['Holiday Party', 't_lost_found', 'guests:updates'],
    // Hands-on work with no screen keeps no button.
    ['Fundraiser / Gala', 't_tables', null],
    ['Fundraiser / Gala', 't_salesclose', null],
    ['Fundraiser / Gala', 't_display', null],
    ['Fundraiser / Gala', 't_firstaid', null],
    ["New Year's Eve Party", 't_midnight_station', null],
    ["New Year's Eve Party", 't_countdown_test', null],
    ['Halloween Party', 't_lights', null],
    ['Halloween Party', 't_access', null],
    ['Halloween Party', 't_yard_down', null],
    ['Quinceañera', 't_ceremony_items', null],
    ['Kwanzaa Gathering', 't_gifts', null],
    ['Retirement Party', 't_book_deliver', null],
  ])('%s %s → %s', (type, id, want) => {
    const { where } = landing(type, id);
    expect({ type, id, where, ok: matches(where, want) }).toEqual({ type, id, where, ok: true });
  });
});

describe('P0-2: the crab order opens only for buying crabs at a Crab Feast', () => {
  test.each([
    ['Juneteenth Cookout', 't_local', 'food'],
    ['Crawfish Boil', 't_source', 'food'],
    // "Lock the headcount; confirm sacks…" leads with the count: the guest list.
    ['Crawfish Boil', 't_count', 'guests:entry'],
    ['Crawfish Boil', 't_pickup', 'food'],
    ['Low Country Boil', 't_nonperish', 'food'],
    ['Low Country Boil', 't_shrimp', 'food'],
    ['Crab Feast', 't_invite', 'guests:invites'],
    ['Crab Feast', 't_prep', 'food'],
    // The rows that ARE the crab order keep it.
    ['Crab Feast', 't_source', 'crabs'],
    ['Crab Feast', 't_reserve', 'crabs'],
    ['Crab Feast', 't_pickup', 'crabs'],
    ['Crab Feast', 't_count', 'crabs'],
  ])('%s %s → %s', (type, id, want) => {
    const { where } = landing(type, id);
    expect({ type, id, where, ok: matches(where, want) }).toEqual({ type, id, where, ok: true });
  });

  test('census: no row of any other playbook opens the crab order', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      if (pb.type === 'Crab Feast') continue;
      const e = ev(pb.type);
      for (const r of (playbookChecklist(e, '2026-10-01') || [])) {
        const hit = routeByWords(r.task, { taskId: r.id, week: r.week, category: r.category }, e);
        const to = hit && hit.route ? resolveRoute(hit.route) : null;
        if (to && to.kind === 'crabs') bad.push(`${pb.type}: ${r.task.slice(0, 60)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('with no event, a crab row does not open the crab order', () => {
    // No event, no playbook: the row has no declared target to read (cause 1).
    const hit = checklistRouteFor('Pre-order the crabs by size and count', {}, null);
    expect(hit && hit.route && hit.route.focusField).not.toBe('crab-plan');
  });
});
