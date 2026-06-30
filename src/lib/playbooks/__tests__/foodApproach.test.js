// Caterer-vs-cook lever (foodApproach / hostIsCooking) + the engine gating it drives.
import { foodApproach, hostIsCooking, hostUsesCaterer, playbookChecklist, playbookRunOfShow, getPlaybook } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (type, foodChoices = {}) => ({ id: 'e', type, date: future, guestCount: 20, guestEstimate: 20, foodChoices });

describe('foodApproach — the single-source caterer lever', () => {
  test('Birthday food_style "Cook/grill yourself" → host cooks, no caterer', () => {
    const fa = foodApproach(ev('Birthday', { food_style: 'Cook/grill yourself' }));
    expect(fa.decisionId).toBe('food_style');
    expect(fa.usesCaterer).toBe(false);
    expect(fa.cooking).toBe(true);
    expect(hostIsCooking(ev('Birthday', { food_style: 'Cook/grill yourself' }))).toBe(true);
  });
  test('Birthday food_style "Drop-off catering" → uses a caterer', () => {
    const e = ev('Birthday', { food_style: 'Drop-off catering' });
    expect(foodApproach(e).usesCaterer).toBe(true);
    expect(hostUsesCaterer(e)).toBe(true);
    expect(hostIsCooking(e)).toBe(false);
  });
  test('Potluck → no caterer (host/guests handle food)', () => {
    expect(foodApproach(ev('Birthday', { food_style: 'Potluck' })).usesCaterer).toBe(false);
  });
  test('a playbook with NO caterer-offering decision → all nulls (never gate on missing data)', () => {
    const fa = foodApproach(ev('Game Night'));
    expect(fa.decisionId).toBe(null);
    expect(fa.usesCaterer).toBe(null);
    expect(hostIsCooking(ev('Game Night'))).toBe(false); // false, not a spurious true
  });
  test('unknown event type → nulls, no throw', () => {
    expect(foodApproach({ type: 'Nonexistent' }).usesCaterer).toBe(null);
  });
});

describe('engine gating driven by the lever', () => {
  // Find a playbook whose tasks mention a caterer AND which has a food_style/help/sourcing
  // decision, to prove the checklist drops the caterer task when the host cooks.
  test('playbookChecklist drops caterer-booking tasks when the host cooks (vs uses a caterer)', () => {
    const hasCatererTask = (rows) => rows.some((r) => /cater(er|ing)/i.test(r.task) && !/\b(vs|or confirm|host[- ]?cook)\b/i.test(r.task));
    // Birthday has food_style; if its tasks include a caterer action, cooking must hide it.
    const cook = playbookChecklist(ev('Birthday', { food_style: 'Cook/grill yourself' }), future);
    const cater = playbookChecklist(ev('Birthday', { food_style: 'Drop-off catering' }), future);
    // Whatever caterer tasks exist under "caterer" must not survive the cook choice…
    expect(hasCatererTask(cook)).toBe(false);
    // …and the cook list is never LONGER than the caterer list on caterer rows.
    expect(cook.length).toBeLessThanOrEqual(cater.length);
  });
  test('playbookRunOfShow drops caterer cues when the host cooks', () => {
    const cookRos = playbookRunOfShow(ev('Birthday', { food_style: 'Cook/grill yourself' })) || [];
    expect(cookRos.every((r) => !/cater(er|ing)/i.test(r.segment))).toBe(true);
  });
});
