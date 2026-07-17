import { answerPlanQuestion } from '../askPlan';

const CTX = {
  money: { planned: 5000, committed: 3250, spent: 2568, spentEstimated: 900 },
  foodPlan: { foodLow: 800, foodHigh: 1100, perHeadLow: 32, perHeadHigh: 44, guests: 25 },
  guests: 25,
  guestBand: 'planned around · likely 21–26 on the day',
  wx: { pop: 65, rainWindow: { label: 'late afternoon' } },
  readiness: { done: 4, total: 6, nextLabel: 'Add the location' },
  eventName: 'My Crab Feast',
};

describe('answerPlanQuestion — deterministic, honest, sourced', () => {
  test('budget fit: an amount that covers reports the headroom', () => {
    const r = answerPlanQuestion('will $4000 cover it?', CTX);
    expect(r.matched).toBe(true);
    expect(r.route).toBe('budget');
    expect(r.answer).toMatch(/covers/i);
    expect(r.answer).toMatch(/\$750/); // 4000 - 3250
    expect(r.basis.join(' ')).toMatch(/\$3,250/); // names the committed source
    expect(r.basis.join(' ')).toMatch(/estimate/i); // flags the soft portion
  });

  test('budget fit: a short amount reports the shortfall against committed', () => {
    const r = answerPlanQuestion('is $2k enough?', CTX);
    expect(r.matched).toBe(true);
    expect(r.answer).toMatch(/short/i);
    expect(r.answer).toMatch(/\$1,250/); // 3250 - 2000
  });

  // This case previously MATCHED and answered with the whole-plan shortfall —
  // the host asked about crabs for 50 and got a number about the entire plan at
  // its current 25. Answering the question we can compute instead of the one
  // asked is the failure; declining hands it to a tool-calling answer.
  test('budget fit declines a question scoped to one part of the plan', () => {
    const r = answerPlanQuestion('will $2,000 cover crabs for 50?', CTX);
    expect(r.matched).toBe(false);
    expect(r.answer).not.toMatch(/\$1,250|\$750|covers/i);
  });

  test('budget fit declines a head count the plan is not sized for', () => {
    expect(answerPlanQuestion('is $2,000 enough for 50 guests?', CTX).matched).toBe(false);
    // ...but the plan's OWN size is still answerable.
    expect(answerPlanQuestion('is $4,000 enough for 25 guests?', CTX).matched).toBe(true);
  });

  test('a head count is never read as a dollar figure', () => {
    // Previously "50" became money: "$50 is about $3,200 short".
    const r = answerPlanQuestion('do I have enough crabs for 50 people?', CTX);
    expect(r.answer).not.toMatch(/\$50\b/);
    expect(r.matched).toBe(false);
  });

  test('spend so far reads money.spent and flags the estimated part', () => {
    const r = answerPlanQuestion('how much have I spent?', CTX);
    expect(r.answer).toMatch(/\$2,568/);
    expect(r.basis.join(' ')).toMatch(/\$900/);
  });

  test('food cost gives the range; per-person gives the per-head band', () => {
    expect(answerPlanQuestion('what does the food cost?', CTX).answer).toMatch(/\$800.*\$1,100/);
    expect(answerPlanQuestion('food cost per person?', CTX).answer).toMatch(/\$32.*\$44/);
  });

  test('guests reads the resolved count', () => {
    expect(answerPlanQuestion('how many are coming?', CTX).answer).toMatch(/25/);
  });

  test('weather reads the forecast pop honestly', () => {
    const r = answerPlanQuestion('will it rain?', CTX);
    expect(r.answer).toMatch(/65%/);
    expect(r.answer).toMatch(/backup/i);
  });

  test('readiness reads N of M and the next cue', () => {
    const r = answerPlanQuestion('am I ready?', CTX);
    expect(r.answer).toMatch(/4 of 6/);
    expect(r.answer).toMatch(/Add the location/);
  });

  test('unrecognized questions answer honestly — never fabricate', () => {
    const r = answerPlanQuestion('what colour tablecloth is trendy this year?', CTX);
    expect(r.matched).toBe(false);
    expect(r.answer).toMatch(/money, food, guests, weather/i);
  });

  test('a term is silent when its data is absent (no invention)', () => {
    const r = answerPlanQuestion('will it rain?', { eventName: 'X' }); // no wx
    expect(r.matched).toBe(false); // falls through to honest fallback, not a made-up forecast
  });
});
