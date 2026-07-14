// ONE LEDGER — the attention system must not hold two opinions.
//
// The bug (measured live, 2026-07-14): the app ran TWO ledgers and the wrong one did
// the talking.
//
//   deriveEventPhaseProgress  KNEW the gaps and had row-level routes for them:
//       { id:'rain', handled:false, cueLabel:'Add a rain backup',
//         route:{ tab:'Event Details', focusField:'rain-plan' } }
//
//   eventPlan().nextActions   SPOKE — and its whole vocabulary was four dominoes
//       (date, guests, budget, food). Rain, venue, shopping, vendors, the crab order:
//       structurally uncountable.
//
// So on an outdoor August crab feast with the four dominoes set, the NEXT tile said
// "1 thing needs you — Catch up on overdue planning tasks" (a generic catch-all) while
// the app already knew the host had no rain plan and two open food decisions, and knew
// how to deep-link to both. 300px away, "Where you stand" said 2 of 5 areas were open.
//
// The engine that knew was not the engine that spoke. These tests pin them together.

import { eventPlan } from '../../CommandCenter';
import { deriveEventPhaseProgress } from '../phaseProgress';

const feast = (over = {}) => ({
  id: 'ledger-1', type: 'Crab Feast', name: 'My Crab Feast',
  date: '2026-08-04', venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
  guestMode: 'count', guestCount: 18, guestEstimate: 18,
  totalBudget: 1500,
  foodChoices: {
    steam_vs_order: 'Order steamed for pickup',
    crab_size: 'Large Males ($72–98/dz)',
    where_buy: 'Local crab house',
    dietary: 'Shellfish',
  },
  rainPlan: '',            // ← an outdoor August crab feast with NO rain backup
  vendors: [], guests: [],
  ...over,
});

const openPhaseIds = (ev) =>
  (deriveEventPhaseProgress(ev).items || [])
    .filter(i => i && !i.handled && i.cueLabel && i.route)
    .map(i => i.id);

describe('one ledger — nextActions cannot be blind to what phaseProgress knows', () => {
  test('THE REGRESSION: a missing rain plan reaches the action list', () => {
    const ev = feast();
    expect(openPhaseIds(ev)).toContain('rain');           // the phase engine knows

    const titles = eventPlan(ev).nextActions.map(a => String(a.title || ''));
    expect(titles.join(' | ')).toMatch(/rain/i);          // ...and now so does the list
  });

  test('every open phase item is represented in nextActions', () => {
    const ev = feast();
    const actions = eventPlan(ev).nextActions;
    const domains = new Set(actions.map(a => a.domain));

    for (const id of openPhaseIds(ev)) {
      // 'crabs' folds into the food domain (one domain, one row) — a domain being
      // represented is the contract, not a 1:1 id mapping.
      const expected = { crabs: 'food', location: 'venue', headcount: 'guests' }[id] || id;
      expect({ id, domains: [...domains] }).toEqual({ id, domains: expect.arrayContaining([expected]) });
    }
  });

  test('the phase item keeps its ROW-LEVEL route — the house rule, not a tab top', () => {
    const rain = eventPlan(feast()).nextActions.find(a => /rain/i.test(String(a.title || '')));
    expect(rain).toBeTruthy();
    expect(rain.primaryRoute).toEqual({ tab: 'Event Details', focusField: 'rain-plan' });
  });

  test('a fully-handled event does NOT invent phase actions', () => {
    // Same event with the rain plan set: the rain row must disappear from BOTH ledgers.
    const ev = feast({ rainPlan: 'Indoors — the garage is cleared.' });
    expect(openPhaseIds(ev)).not.toContain('rain');
    const titles = eventPlan(ev).nextActions.map(a => String(a.title || ''));
    expect(titles.join(' | ')).not.toMatch(/rain/i);
  });

  test('no domain is claimed twice — the foundation and the phase ledger dedupe', () => {
    const actions = eventPlan(feast()).nextActions;
    const domains = actions.map(a => a.domain).filter(Boolean);
    expect(domains.length).toBe(new Set(domains).size);
  });

  test('a past event still says nothing — the wipe survives the merge', () => {
    const actions = eventPlan(feast({ date: '2020-01-01' })).nextActions;
    expect(actions).toEqual([]);
  });
});
