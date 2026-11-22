// Crab Feast's defining food call is "Steam them yourself or order them
// steamed (pickup)?" — and the plan never asked it. The hero offered the generic
// cook / cater / potluck trio (proposing "A caterer handles it" at 40 guests),
// while the checklist and run of show ran on the authored default: "Lock a hot
// pickup slot…", "Confirm the pickup slot with the crab house" (audit 2 lane A
// P1-5; lane C P0-7: the run of show contradicted its caterer pick).
//
// Now the food ask IS the steam call, and a generic answer already on file maps
// to it, so the steps follow her answer.
import { playbookChecklist, playbookDecisionBoard, playbookRunOfShow, openFoodChoices, choicePickFor } from '../playbooks';
import { foodDecisionND } from '../decisionND';

const AS_OF = new Date('2026-11-22T12:00:00');
const crab = (foodChoices = {}) => ({
  id: 'aud-crab', name: 'Backyard Crab Feast', type: 'Crab Feast', date: '2027-07-24', startTime: '14:00', startTimeSource: 'host',
  venue: 'Our backyard', venueCity: 'Annapolis, MD', state: 'MD', venueKind: 'home', guestMode: 'count', guestCount: 40,
  guestEstimate: 40, totalBudget: 2500, budget: [], vendors: [], guests: [], createdAt: '2026-09-27T14:00:00.000Z', foodChoices,
});
const rows = (ev) => { const b = playbookDecisionBoard(ev, AS_OF); return [...(b.open || []), ...(b.locked || [])]; };
const steps = (ev) => (playbookChecklist(ev, AS_OF) || []).map((r) => String(r.task || r.label || ''));
const ros = (ev) => JSON.stringify(playbookRunOfShow(ev) || []);

describe('Crab Feast asks its steam-or-order call', () => {
  test('the food ask is the steam call, not cook / cater / potluck', () => {
    const ev = crab();
    const nd = foodDecisionND(ev, 40, rows(ev), null);
    expect(nd.id).toBe('steam_vs_order');
    expect(nd.options.map((o) => o.value)).toEqual(['Steam them myself', 'Order steamed for pickup', 'Buy live, steam in batches']);
    expect(nd.options.map((o) => o.label)).not.toContain('A caterer handles it');
  });

  test('"We’ll cook it" on file is her steam answer: she steams them herself', () => {
    const ev = crab({ sourcing: 'host cooks' });
    expect(choicePickFor(ev, 'steam_vs_order')).toBe('Steam them myself');
    expect((openFoodChoices(ev) || []).map((c) => c.id)).not.toContain('steam_vs_order');
    const s = steps(ev);
    expect(s.some((t) => /steamer pot/i.test(t))).toBe(true);
    expect(s.some((t) => /pickup slot|pick up the hot steamed/i.test(t))).toBe(false);
  });

  test('the run of show follows her answer', () => {
    expect(ros(crab({ steam_vs_order: 'Steam them myself' }))).not.toMatch(/pickup slot/i);
    expect(ros(crab({ steam_vs_order: 'Order steamed for pickup' }))).toMatch(/pickup slot/i);
    expect(ros(crab({ sourcing: 'host cooks' }))).not.toMatch(/pickup slot/i);
  });

  test('her own steam pick outranks a generic answer', () => {
    expect(choicePickFor(crab({ sourcing: 'host cooks', steam_vs_order: 'Order steamed for pickup' }), 'steam_vs_order')).toBe('Order steamed for pickup');
  });
});
