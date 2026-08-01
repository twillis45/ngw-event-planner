// ─── REASONING CONTINUITY v1 — the queue may explain itself, never invent ─────
//
// The execution layer rendered title + arrow while `consequence`/`dueInDays`/
// `gateHolder` sat in scope unread (DOM-verified 2026-07-31). These gates pin the
// two halves of the fix: a reason appears when a real authored/derived signal
// exists, and NOTHING appears when it does not.
import { getActionReason, reasonCoverage, MAX_REASON_CHARS, REASON_PRIORITY } from '../actionReason';
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { playbookTypicalGuests } from '../playbooks';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const normal = () => ({
  id: 'rc-normal', type: 'Birthday', name: 'Milestone', date: daysFromNow(21),
  createdAt: daysFromNow(-60), guestMode: 'count', guestCount: 30, totalBudget: 3000,
  venue: 'Hall', venueKind: 'venue', venueCity: 'Atlanta', venueState: 'GA',
  guests: [], vendors: [], timeline: [], budget: [],
});
const solemn = () => ({ ...normal(), id: 'rc-solemn', type: 'Repast', name: 'Repast for Deacon Hayes' });
const destination = () => ({ ...normal(), id: 'rc-dest', isDestination: true, venueCity: 'Santa Fe', venueState: 'NM', endDate: daysFromNow(24) });

const queueFor = (ev) => {
  const ctx = (() => { try { return buildExperienceContext(ev, null, 1); } catch { return null; } })();
  return (eventPlan(ev, ctx) || {}).nextActions || [];
};

describe('the ladder returns ONE reason, in priority order', () => {
  test('blocking outranks time, money and consequence', () => {
    const r = getActionReason({
      title: 'Lock the headcount', gateHolder: true, unlocks: 3,
      dueInDays: 0, consequence: 'Everything sizes off this number.',
    });
    expect(r.type).toBe('blocking');
    expect(r.text).toBe('unblocks 3 more steps');
    expect(r.source).toBe('gateHolder');
    expect(r.confidence).toBe('derived');
  });

  test('time outranks consequence', () => {
    const r = getActionReason({ title: 'Send the invites', dueInDays: 2, consequence: 'Guests need runway to answer.' });
    expect(r.type).toBe('time');
    expect(r.text).toBe('due in 2 days');
  });

  test('consequence is used when nothing sharper exists', () => {
    // em-dash boundary, head is independent and inside the cap -- this is the
    // dominant shape in the authored copy.
    const r = getActionReason({ title: 'Add your guest list', consequence: "Who's coming is the first domino — it sizes the budget, the food, and the schedule." });
    expect(r.type).toBe('consequence');
    expect(r.source).toBe('consequence');
    expect(r.confidence).toBe('authored');
    expect(r.text).toBe("Who's coming is the first domino");
  });

  test('a long consequence with NO boundary inside the cap yields nothing', () => {
    // Honest consequence of the 40-char rule: most authored copy is longer than
    // the cap and offers no early break, so it cannot be shown truthfully.
    expect(getActionReason({ title: 'Set your budget', consequence: 'Every estimate is guessing until it has a number to work against.' })).toBeNull();
  });

  test('singular and plural read correctly', () => {
    expect(getActionReason({ title: 'X', gateHolder: true, unlocks: 1 }).text).toBe('unblocks 1 more step');
    expect(getActionReason({ title: 'Y', dueInDays: 1 }).text).toBe('due tomorrow');
    expect(getActionReason({ title: 'Z', dueInDays: -4 }).text).toBe('past its window');
  });

  test('the documented priority list matches the implementation order', () => {
    expect(REASON_PRIORITY).toEqual(['blocking', 'money', 'time', 'risk', 'consequence', 'dependency']);
  });
});

describe('missing data produces NOTHING, never filler', () => {
  test('a bare action returns null', () => {
    expect(getActionReason({ title: 'Do the thing' })).toBeNull();
    expect(getActionReason({})).toBeNull();
    expect(getActionReason(null)).toBeNull();
  });

  test('a far-future due date is not urgency', () => {
    expect(getActionReason({ title: 'Book the venue', dueInDays: 40 })).toBeNull();
  });

  test('unlocks of zero is not a reason', () => {
    expect(getActionReason({ title: 'X', unlocks: 0 })).toBeNull();
  });

  test('an empty or whitespace consequence yields null', () => {
    expect(getActionReason({ title: 'X', consequence: '   ' })).toBeNull();
    expect(getActionReason({ title: 'X', consequence: '' })).toBeNull();
  });
});

describe('duplicate suppression -- a reason never restates its title', () => {
  test('a consequence that only echoes the title is dropped', () => {
    expect(getActionReason({ title: 'Set your budget', consequence: 'Set your budget.' })).toBeNull();
  });

  test('near-duplicates with only stop-words added are dropped', () => {
    expect(getActionReason({ title: 'Plan the food', consequence: 'You plan the food.' })).toBeNull();
  });

  test('a consequence that adds a real noun survives', () => {
    const r = getActionReason({ title: 'Plan the food', consequence: 'Drives the shopping list and the rentals.' });
    expect(r).toBeTruthy();
    expect(r.type).toBe('consequence');
  });
});

describe('truncation never produces a fragment', () => {
  // REGRESSION (live DOM, 2026-07-31): "With your headcount in" and "How you're
  // feeding everyone" rendered as reasons. Both are dependent clauses cut
  // mid-thought -- worse than saying nothing.
  test('a dependent opening clause is refused, not truncated', () => {
    for (const c of [
      'With your headcount in, a budget frames every food and vendor choice.',
      'When the guests are confirmed, the seating can finally be drawn up properly.',
      'While the venue is unsettled, nothing downstream can be scheduled with confidence.',
      'Once the date is locked, every other deadline counts back from it correctly.',
    ]) {
      expect(getActionReason({ title: 'Set your budget', consequence: c })).toBeNull();
    }
  });

  // REGRESSION (live DOM, second pass): "How you're feeding everyone" still
  // rendered after the first truncation fix -- a leading interrogative is a noun
  // phrase with no main verb, i.e. a fragment.
  test('a leading interrogative head is refused', () => {
    for (const c of [
      "How you're feeding everyone — cook, cater, or potluck — drives the shopping list.",
      'What you are serving — the whole spread — sets the budget for the week.',
      'Where the event lands — indoors or out — changes the whole rain plan.',
    ]) {
      expect(getActionReason({ title: 'Plan the food', consequence: c })).toBeNull();
    }
  });

  test('an independent subject clause starting with who SURVIVES', () => {
    const r = getActionReason({ title: 'Add your guest list', consequence: "Who's coming is the first domino — it sizes the budget." });
    expect(r.text).toBe("Who's coming is the first domino");
  });

  test('a long sentence with no usable boundary is refused', () => {
    const c = 'How you are feeding everyone drives the entire shopping list and the rental list downstream';
    expect(getActionReason({ title: 'Plan the meal', consequence: c })).toBeNull();
  });

  test('a short independent clause before a comma survives', () => {
    const r = getActionReason({ title: 'Book the DJ', consequence: 'Popular dates go first, so this one moves fast.' });
    expect(r).toBeTruthy();
    expect(r.text).toBe('Popular dates go first');
  });
});

describe('length and shape constraints', () => {
  test('never exceeds the cap, never ends mid-word, never trails punctuation', () => {
    const long = 'Popular dates go first here, cook or cater or potluck, drives the entire shopping list downstream';
    const r = getActionReason({ title: 'Plan the meal', consequence: long });
    expect(r.text.length).toBeLessThanOrEqual(MAX_REASON_CHARS);
    expect(r.text).not.toMatch(/[.,;:]$/);
    expect(r.text).not.toMatch(/\s$/);
    const last = r.text.split(' ').pop();
    expect(long.toLowerCase()).toContain(last.toLowerCase());
  });

  test('no reason ever contains a placeholder', () => {
    for (const a of [
      { title: 'A', consequence: 'Real reason with content here.' },
      { title: 'B', dueInDays: 0 },
      { title: 'C', gateHolder: true, unlocks: 2 },
    ]) {
      const r = getActionReason(a);
      expect(String(r.text)).not.toMatch(/undefined|null|NaN|\[object/);
    }
  });
});

describe('solemn suppression', () => {
  test('time pressure is never shown on a solemn event', () => {
    const ev = solemn();
    expect(getActionReason({ title: 'Order the flowers', dueInDays: -3 }, { event: ev })).toBeNull();
    expect(getActionReason({ title: 'Order the flowers', dueInDays: 1 }, { event: ev })).toBeNull();
  });

  test('the same action DOES show time pressure on a normal event', () => {
    const r = getActionReason({ title: 'Order the flowers', dueInDays: 1 }, { event: normal() });
    expect(r.type).toBe('time');
  });

  // REGRESSION (live DOM, 2026-07-31): the board's `because` field carries
  // "Was due 1 day ago." into `consequence`, which walked straight through the
  // per-branch solemn guard and rendered blame on a repast row.
  test('backward-looking language is suppressed on solemn WHATEVER field carries it', () => {
    const ev = solemn();
    for (const c of [
      'Was due 1 day ago.',
      'Was due 14 days ago.',
      'Its easy window closed 2 months ago.',
      'This is overdue and past its window.',
      'You are behind on this one.',
    ]) {
      expect(getActionReason({ title: 'Resolve the venue', consequence: c }, { event: ev })).toBeNull();
    }
  });

  test('the same backward language DOES render on a non-solemn event', () => {
    const r = getActionReason({ title: 'Resolve the venue', consequence: 'Was due 1 day ago.' }, { event: normal() });
    expect(r).toBeTruthy();
    expect(r.type).toBe('consequence');
  });

  test('a solemn event still gets its authored consequence', () => {
    const r = getActionReason({ title: 'Plan the food', consequence: 'The committee cooks to a count — tell them early.' }, { event: solemn() });
    expect(r.type).toBe('consequence');
    expect(r.text).toBe('The committee cooks to a count');
  });
});

describe('money comes only from a dated obligation', () => {
  const rows = [{ key: 'v1', label: 'Balance', daysLeft: 3, passed: false }];
  test('matches by route key and reports the real window', () => {
    const r = getActionReason({ title: 'Pay the caterer', route: { moneyKey: 'v1' } }, { moneyRows: rows });
    expect(r.type).toBe('money');
    expect(r.text).toBe('payment due in 3 days');
  });
  test('a passed row is never a reason', () => {
    const r = getActionReason({ title: 'Pay the caterer', route: { moneyKey: 'v1' } },
      { moneyRows: [{ key: 'v1', daysLeft: -2, passed: true }] });
    expect(r === null || r.type !== 'money').toBe(true);
  });
  test('no matching row means no money reason', () => {
    expect(getActionReason({ title: 'Pay the caterer', route: { moneyKey: 'other' } }, { moneyRows: rows })).toBeNull();
  });
});

describe('sources with no producer yet are wired but honest', () => {
  test('risk.ifDelayed is consumed IF an action ever carries it', () => {
    const r = getActionReason({ title: 'Book the venue', ifDelayed: 'Popular dates go first.' });
    expect(r.type).toBe('risk');
    expect(r.confidence).toBe('authored');
  });
  test('dependsOn is consumed IF an action ever carries it', () => {
    const r = getActionReason({ title: 'Order the cake', dependsOn: ['gn_invite', 'gn_menu'] });
    expect(r.type).toBe('dependency');
    expect(r.text).toBe('waits on 2 earlier steps');
  });
  test('and the coverage report names them as unrealised on real actions', () => {
    const rep = reasonCoverage(queueFor(normal()), { event: normal() });
    expect(rep.unrealisedSources).toEqual(expect.arrayContaining(['risk.ifDelayed', 'dependsOn']));
  });
});

describe('real events -- normal, destination, solemn', () => {
  test.each([['normal', normal], ['destination', destination], ['solemn', solemn]])(
    '%s: every reason is well-formed, capped, and non-duplicating', (_label, mk) => {
      const ev = mk();
      const actions = queueFor(ev);
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) {
        const r = getActionReason(a, { event: ev });
        if (!r) continue;
        expect(REASON_PRIORITY).toContain(r.type);
        expect(r.text.length).toBeLessThanOrEqual(MAX_REASON_CHARS);
        expect(r.text.length).toBeGreaterThan(0);
        expect(r.source).toBeTruthy();
        expect(['authored', 'derived']).toContain(r.confidence);
        expect(r.text).not.toMatch(/undefined|null|NaN/);
      }
    });

  test('solemn queue carries no time-pressure reason at all', () => {
    const ev = solemn();
    const types = queueFor(ev).map(a => getActionReason(a, { event: ev })).filter(Boolean).map(r => r.type);
    expect(types).not.toContain('time');
  });

  test('coverage is reported honestly, with the misses itemised', () => {
    const ev = normal();
    const rep = reasonCoverage(queueFor(ev), { event: ev });
    expect(rep.analyzed).toBeGreaterThan(0);
    expect(rep.withReason + rep.missing.length).toBe(rep.analyzed);
    expect(rep.coveragePct).toBeGreaterThanOrEqual(0);
    expect(rep.coveragePct).toBeLessThanOrEqual(100);
    for (const m of rep.missing) expect(typeof m.hasConsequence).toBe('boolean');
  });
});
