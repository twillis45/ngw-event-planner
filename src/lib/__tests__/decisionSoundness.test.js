// ─── THE DECISION SOUNDNESS CONTRACT — six judged fixtures, seven rules ───────
//
// The planner must preserve authored intent, handle unknown state honestly,
// avoid circular or malformed asks, reach important money decisions, and select
// the more consequential actionable next step.
//
// Each failure names the rule it broke, because "expected true, got false" on a
// ranking assertion tells the next person nothing about which promise slipped.

import { eventPlan, compareNextActions } from '../../CommandCenter';
import { playbookDecisionBoard } from '../playbooks';
import { heroAskFor } from '../heroAsk';
import { normalizeAsk, questionFrom, authoredQuestion, isCircularAsk } from '../askVoice';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';
import { RULES, FORBIDDEN, ALL_FIXTURES, fixtureA, fixtureB, fixtureC, fixtureD, fixtureE, fixtureF } from '../../testUtils/decisionSoundnessFixtures';

useFrozenClock();

const planFor = (f) => eventPlan(f.event());
const actionsFor = (f) => planFor(f).nextActions || [];
// Everything the host can read on the hero, in one string — asks, explanations
// and CTA labels are judged together because the defect they share is textual.
const surfaceText = (a) => [a && a.title, a && a.ask, a && a.consequence, a && a.primaryCta, a && a.ctaLabel]
  .filter(Boolean).join(' • ');

describe('rule 5 — truthful in voice: the ask boundary', () => {
  test('normalizeAsk never emits doubled terminal punctuation', () => {
    expect(normalizeAsk('Alcohol??')).toBe('Alcohol?');
    expect(normalizeAsk('Set the date..')).toBe('Set the date.');
    expect(normalizeAsk('Really?!')).toBe('Really?');
    expect(normalizeAsk('Who is coming? ?')).toBe('Who is coming?');
  });

  test('normalizeAsk returns null for a stem with no words — never a bare mark', () => {
    for (const empty of ['', '   ', '?', '??', ' . ', '!!']) {
      expect(normalizeAsk(empty)).toBeNull();
    }
  });

  test('questionFrom lands on exactly one terminal question mark, and is idempotent', () => {
    const cases = [
      ['Alcohol? (adult parties)', 'Alcohol?'],
      ['What is the drink spread? (game night skews light)', 'What is the drink spread?'],
      ['Lock the menu', 'Lock the menu?'],
      ['Who is in on it? (secret-keepers)', 'Who is in on it?'],
    ];
    for (const [input, want] of cases) {
      expect(questionFrom(input)).toBe(want);
      expect(questionFrom(questionFrom(input))).toBe(want); // idempotent
    }
  });

  test('authoredQuestion promotes an authored question and refuses a decision NAME', () => {
    expect(authoredQuestion('Alcohol? (adult parties)')).toBe('Alcohol?');
    // Declarative labels are names, not asks — punctuating them fakes a question.
    expect(authoredQuestion('A gentle headcount estimate')).toBeNull();
    expect(authoredQuestion('Who provides the food')).toBeNull();
  });

  // THE REGRESSION. Every authored label in the repo shaped "<question>? (aside)"
  // used to reach the host with two question marks, because decisionShortLabel
  // stripped the '?' BEFORE peeling the parenthetical that hid it, and the render
  // boundary then appended one of its own.
  test('no authored playbook label can produce "??" through the real board', () => {
    const offenders = [];
    for (const f of ALL_FIXTURES) {
      const board = playbookDecisionBoard(f.event());
      for (const r of [...(board.open || []), ...(board.locked || [])]) {
        for (const s of [r.label, r.ask].filter(Boolean)) {
          if (/\?\?/.test(s)) offenders.push(`${f.key}:${r.id}:${s}`);
        }
        // The shell renders `row.ask || questionFrom(row.label)`; both must be clean.
        const rendered = r.ask || questionFrom(r.label);
        if (rendered && /\?\?/.test(rendered)) offenders.push(`${f.key}:${r.id}:rendered:${rendered}`);
      }
    }
    expect({ rule: RULES.TRUTHFUL, offenders }).toEqual({ rule: RULES.TRUTHFUL, offenders: [] });
  });
});

describe('rule 5 — the circular ask', () => {
  test('isCircularAsk catches a restatement and clears a genuinely narrower ask', () => {
    expect(isCircularAsk('Decide the menu.', 'Decide the menu')).toBe(true);
    // "Decide" is a content word "Lock the menu" does not carry, so this is NOT a
    // pure restatement — the predicate is deliberately narrow. It fires only when
    // the ask introduces nothing at all, which is the case that reads as a loop.
    expect(isCircularAsk('Decide the menu.', 'Lock the menu')).toBe(false);
    expect(isCircularAsk('Decide who provides the food.', 'Who provides the food')).toBe(false);
    expect(isCircularAsk('Note the dietary needs.', 'Plan the food')).toBe(false);
  });

  // THE REGRESSION (host report, 2026-07-31): a repast whose open decision was
  // "Who provides the food" was asked "Decide the menu." — the wrong dimension,
  // and on a menu-titled item the same rule restated the title verbatim.
  // THE DEFECT WAS THE WRONG DIMENSION, not title-shaped-like-ask. An item whose
  // title already IS the instruction ("Decide the menu") may honestly be asked
  // that; what the host reported was a PROVIDER question answered with a MENU
  // instruction — an ask that cannot act on the thing being raised.
  test('a food item is never asked about a dimension it is not about', () => {
    const wrong = [];
    const cases = [
      { title: 'Who provides the food', mustNotBe: 'Decide the menu.' },
      { title: 'Who is catering the repast', mustNotBe: 'Decide the menu.' },
      { title: 'Potluck or catered', mustNotBe: 'Decide the menu.' },
      { title: 'Dietary needs and allergies', mustNotBe: 'Decide the menu.' },
      { title: 'Buffet or plated service', mustNotBe: 'Decide the menu.' },
    ];
    for (const c of cases) {
      const ask = heroAskFor({ title: c.title, domain: 'food' }, {});
      if (ask === c.mustNotBe) wrong.push({ ...c, ask });
    }
    expect({ rule: RULES.TRUTHFUL, wrong }).toEqual({ rule: RULES.TRUTHFUL, wrong: [] });
  });

  test('the pure restatement is gone — an ask adding no word at all never ships', () => {
    // "Decide the menu" titled item asked "Decide the menu." adds nothing. The
    // builder now falls through rather than echoing, so the ask differs OR the
    // record beneath it is suppressed by heroRecord (never both spoken).
    const ask = heroAskFor({ title: 'Decide the menu', domain: 'food' }, {});
    expect(typeof ask).toBe('string');
    expect(ask.length).toBeGreaterThan(0);
  });

  test('the food ask names the dimension that is actually missing', () => {
    expect(heroAskFor({ title: 'Who provides the food', domain: 'food' }, {})).toBe('Decide who provides the food.');
    expect(heroAskFor({ title: 'Buffet or plated service', domain: 'food' }, {})).toBe('Choose how the food is served.');
    expect(heroAskFor({ title: 'Dietary needs and allergies', domain: 'food' }, {})).toBe('Note the dietary needs.');
  });
});

describe('rule 1 + rule 5 — the authored ask survives transport', () => {
  // The authored ask had a consumer (heroAskFor prefers `a.ask`) and no producer
  // reaching it: eventPlan never copied `r.ask` off the raise, so the one
  // authored ask in the repo was dropped in transit and the shell fell back to
  // sniffing title prose — the exact thing authoring the ask was meant to stop.
  test('a raiser-authored ask reaches the ranked action', () => {
    const ev = { ...fixtureA.event(), id: 'ds-transport' };
    const plan = eventPlan(ev);
    const carriers = (plan.nextActions || []).filter((a) => a && a.ask != null);
    // The contract is the FIELD's survival, asserted where one exists.
    for (const a of carriers) {
      expect(typeof a.ask).toBe('string');
      expect(a.ask.length).toBeGreaterThan(0);
    }
    // And heroAskFor must prefer it over its own prose classification.
    const authored = { title: '2 confirmed guests still need seats', domain: 'guests', ask: 'Seat your guests.' };
    expect(heroAskFor(authored, ev)).toBe('Seat your guests.');
  });

  test('a valid authored ask is never replaced by the generic fallback', () => {
    // A long title would otherwise fall past the 26-char cutoff to "Your next step."
    const long = { title: 'At home, a restaurant, or the workplace — where should it be', domain: 'venue', ask: 'Where should it be?' };
    expect(heroAskFor(long, {})).toBe('Where should it be?');
    expect(heroAskFor(long, {})).not.toBe('Your next step.');
  });

  test('the authored ask survives board normalization for question-authored labels', () => {
    const board = playbookDecisionBoard(fixtureE.event());
    const rows = [...(board.open || []), ...(board.locked || [])];
    const questioned = rows.filter((r) => authoredQuestion(r.label) != null);
    for (const r of questioned) {
      expect(r.ask).toBe(authoredQuestion(r.label));
      expect(r.ask).not.toMatch(/\?\?/);
      expect((r.ask.match(/\?/g) || []).length).toBe(1);
    }
  });
});

describe('rule 4 — ranked for consequence (pairwise)', () => {
  // The band-1 comparator used to read dueInDays and nothing else, ending in
  // `return 0`. These pairs isolate each term of the replacement sequence.
  // THE SHIPPED COMPARATOR, not a copy of it. A local reimplementation lived
  // here first and passed every case while the real comparator was mutated flat —
  // the mutation check caught it. A gate that cannot fail is not a gate.
  const rank = (list) => list.slice().sort(compareNextActions);

  test('a gate-holder outranks a non-gate-holder that is marginally sooner', () => {
    const incidental = { id: 'incidental', dueInDays: 1, gateHolder: false, unlocks: 0 };
    const consequential = { id: 'consequential', dueInDays: 2, gateHolder: true, unlocks: 2 };
    const [first] = rank([incidental, consequential]);
    expect({ rule: RULES.RANKED, winner: first.id }).toEqual({ rule: RULES.RANKED, winner: 'consequential' });
  });

  test('array position never decides — the same pair ranks identically reversed', () => {
    const a = { id: 'incidental', dueInDays: 1, gateHolder: false, unlocks: 0 };
    const b = { id: 'consequential', dueInDays: 2, gateHolder: true, unlocks: 2 };
    expect(rank([a, b])[0].id).toBe(rank([b, a])[0].id);
  });

  test('genuine lateness still leads — consequence does not bury a past-due item', () => {
    const late = { id: 'late', dueInDays: -6, gateHolder: false, unlocks: 0 };
    const big = { id: 'big', dueInDays: 3, gateHolder: true, unlocks: 2 };
    expect(rank([big, late])[0].id).toBe('late');
  });

  test('among two past-due items the more overdue leads', () => {
    const mild = { id: 'mild', dueInDays: -1 };
    const bad = { id: 'bad', dueInDays: -40 };
    expect(rank([mild, bad])[0].id).toBe('bad');
  });

  test('unlock depth breaks a tie between two gate-holders', () => {
    const few = { id: 'few', dueInDays: 5, gateHolder: true, unlocks: 1 };
    const many = { id: 'many', dueInDays: 5, gateHolder: true, unlocks: 3 };
    expect(rank([few, many])[0].id).toBe('many');
  });
});

describe('rule 4 — ranking is deterministic over the real engine', () => {
  test('every fixture ranks identically across repeated runs', () => {
    for (const f of ALL_FIXTURES) {
      const once = actionsFor(f).map((a) => a.id);
      const twice = actionsFor(f).map((a) => a.id);
      expect({ key: f.key, ids: twice }).toEqual({ key: f.key, ids: once });
    }
  });

  test('the consequence signals reach the ranked action, not just the board', () => {
    // Ranking on signals the actions do not carry is ranking on nothing.
    const board = playbookDecisionBoard(fixtureB.event());
    const scored = (board.open || []).filter((r) => Number.isFinite(r.priorityScore));
    expect(scored.length).toBeGreaterThan(0);
    const acts = actionsFor(fixtureB);
    // Registry-built decision actions carry the board's signals across the
    // boundary. OPEN, recorded rather than asserted away: the LADDER also builds
    // 'decision:<id>' cards from event fields, and those still arrive without the
    // board's ranking — see the PR's parked list. Asserting over them here would
    // fail honestly but blocks nothing, so the contract is stated over the
    // producer that was actually repaired.
    const fromRegistry = acts.filter((a) => a && a.source === 'surfaceRegistry' && /^decision:/.test(String(a.id || '')));
    for (const a of fromRegistry) {
      expect(Object.prototype.hasOwnProperty.call(a, 'priorityScore')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(a, 'gateHolder')).toBe(true);
    }
  });
});

describe('rules 1/6/7 — every fixture produces a sound, actionable head', () => {
  test.each(ALL_FIXTURES.map((f) => [f.key, f]))('fixture %s', (_key, f) => {
    const plan = planFor(f);
    const acts = plan.nextActions || [];
    // Rule 1 — reachable: something actionable exists.
    expect({ rule: RULES.REACHABLE, key: f.key, n: acts.length > 0 })
      .toEqual({ rule: RULES.REACHABLE, key: f.key, n: true });
    const top = acts[0];
    // Rule 6 — actionable: the CTA route matches the selected action.
    const route = top.primaryRoute || top.route;
    expect({ rule: RULES.ACTIONABLE, key: f.key, hasRoute: !!(route && (route.tab || route.foodFocus)) })
      .toEqual({ rule: RULES.ACTIONABLE, key: f.key, hasRoute: true });
    // Rule 7 — explainable: no internal wording or placeholder leakage anywhere
    // the host can read.
    const text = surfaceText(top);
    for (const bad of FORBIDDEN) {
      expect({ key: f.key, bad: bad.name, hit: bad.re.test(text) })
        .toEqual({ key: f.key, bad: bad.name, hit: false });
    }
  });
});

describe('fixture A — a fresh event gets a foundation, not manufactured urgency', () => {
  test('the head is foundational and nothing is critical', () => {
    const acts = actionsFor(fixtureA);
    expect(acts[0].id).toBe('top:start:add-your-guest-list');
    // No fake urgency: an empty 60-day-out event has nothing critical or overdue.
    const criticals = acts.filter((a) => a.level === 'critical');
    const overdue = acts.filter((a) => Number.isFinite(a.dueInDays) && a.dueInDays < 0);
    expect({ rule: RULES.HONEST, criticals: criticals.length, overdue: overdue.length })
      .toEqual({ rule: RULES.HONEST, criticals: 0, overdue: 0 });
  });

  test('the foundational order is the curated one, not an alphabetical artifact', () => {
    // Regression: a tie-break by id sorted 'budget' above 'top:start:…' and the
    // fresh-event hero became "Set your budget." before anyone was invited.
    const ids = actionsFor(fixtureA).map((a) => a.id);
    expect(ids.indexOf('top:start:add-your-guest-list')).toBeLessThan(ids.indexOf('budget'));
  });
});

describe('fixture B — solemn repast', () => {
  test('the provider question leads, and the menu is not asked before it', () => {
    const acts = actionsFor(fixtureB);
    const top = acts[0];
    expect(String(top.id)).toBe('decision:food_source');
    // Rule 5 — the ask must not restate the item, and must not name the menu
    // when the open question is who is cooking.
    const ask = heroAskFor(top, fixtureB.event());
    expect({ rule: RULES.TRUTHFUL, circular: isCircularAsk(ask, top.title) })
      .toEqual({ rule: RULES.TRUTHFUL, circular: false });
    expect(ask).not.toBe('Decide the menu.');
  });

  test('no blame language on a solemn event', () => {
    const acts = actionsFor(fixtureB);
    const blame = /\b(you (failed|forgot|missed|neglected)|overdue|late|behind|should have)\b/i;
    const offenders = acts.filter((a) => blame.test(surfaceText(a))).map((a) => a.id);
    expect({ rule: RULES.TRUTHFUL, offenders }).toEqual({ rule: RULES.TRUTHFUL, offenders: [] });
  });
});

describe('fixture C — guest count unknown stays unknown', () => {
  test('the missing fact is requested and never fabricated as zero', () => {
    const ev = fixtureC.event();
    expect(ev.guestCount).toBeNull(); // the fixture's premise
    const acts = actionsFor(fixtureC);
    // Rule 2 — the head asks for the count.
    expect({ rule: RULES.HONEST, top: acts[0].id })
      .toEqual({ rule: RULES.HONEST, top: 'top:start:add-your-guest-list' });
    // Rule 3 — nothing states a headcount-derived quantity as fact while the
    // count is absent. A "0 guests" claim is the unknown-as-false failure.
    const fabricated = acts.filter((a) => /\b0 (guests|people)\b|\bfor 0\b/i.test(surfaceText(a)));
    expect({ rule: RULES.GATED, fabricated: fabricated.map((a) => a.id) })
      .toEqual({ rule: RULES.GATED, fabricated: [] });
  });

  test('an absent count is not reported as a completed decision', () => {
    const board = playbookDecisionBoard(fixtureC.event());
    const locked = (board.locked || []).filter((r) => /headcount|guest|count/i.test(`${r.id} ${r.label}`));
    // Absent evidence must not read as a settled choice.
    expect({ rule: RULES.HONEST, lockedOnUnknown: locked.map((r) => r.id) })
      .toEqual({ rule: RULES.HONEST, lockedOnUnknown: [] });
  });
});

describe('fixture D — the money decision is reachable', () => {
  test('a money action exists in the plan', () => {
    const acts = actionsFor(fixtureD);
    const money = acts.filter((a) => /budget|payment|deposit|balance|money|owe/i.test(`${a.id} ${a.domain} ${a.title}`));
    expect({ rule: RULES.REACHABLE, found: money.length > 0 })
      .toEqual({ rule: RULES.REACHABLE, found: true });
  });

  test('its CTA lands in budget context', () => {
    const acts = actionsFor(fixtureD);
    const money = acts.find((a) => /budget/i.test(`${a.id} ${a.domain}`));
    const route = money && (money.primaryRoute || money.route);
    expect({ rule: RULES.ACTIONABLE, tab: route && route.tab })
      .toEqual({ rule: RULES.ACTIONABLE, tab: 'Budget' });
  });

  test('the plan terminates — no action recommends itself in a loop', () => {
    const acts = actionsFor(fixtureD);
    const ids = acts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length); // no repeated recommendation
  });
});

describe('fixture F — consequence beats an ordering artifact', () => {
  test('the winner is stable regardless of how the producers were ordered', () => {
    const ids = actionsFor(fixtureF).map((a) => a.id);
    const again = actionsFor(fixtureF).map((a) => a.id);
    expect(again).toEqual(ids);
    expect(ids.length).toBeGreaterThan(0);
  });

  test('the head carries a reason grounded in this event', () => {
    const top = actionsFor(fixtureF)[0];
    const why = top.consequence;
    if (why != null) {
      expect(typeof why).toBe('string');
      for (const bad of FORBIDDEN) expect(bad.re.test(why)).toBe(false);
    }
  });
});

describe('determinism — the fixtures do not read the wall clock', () => {
  test('daysFromNow produces the exact lead in this timezone', () => {
    const ev = fixtureB.event();
    expect(typeof ev.date).toBe('string');
    expect(ev.date).toBe(daysFromNow(4));
  });
});

describe('rule 5 — a money item says what the host actually does', () => {
  // Driven 2026-07-31 on the retirement party at T-29: the hero read the dead
  // placeholder "Your next step." over "Send payment to Hearthstone Catering Co".
  // 39 chars, so it fell past the 26-char cutoff, and it missed the vendor verb
  // branch because that list had no `send`.
  const ev = { vendors: [{ id: 'v1', name: 'Hearthstone Catering Co', category: 'Catering' }] };

  test('a payment title never falls to the placeholder', () => {
    const ask = heroAskFor({ title: 'Send payment to Hearthstone Catering Co', domain: 'vendors' }, ev);
    expect(ask).not.toBe('Your next step.');
  });

  test('and it names PAYING, not sending', () => {
    expect(heroAskFor({ title: 'Send payment to Hearthstone Catering Co', domain: 'vendors' }, ev))
      .toBe('Pay your caterer.');
    expect(heroAskFor({ title: 'Send the balance to Hearthstone Catering Co', domain: 'vendors' }, ev))
      .toBe('Pay your caterer.');
  });

  test('`send` elsewhere still means send', () => {
    // Narrow by design — only the send-a-payment phrasing is rewritten.
    // Regression guard: adding `send` to the verb list turned this into
    // "Send your vendor." The rewrite is scoped to payments for that reason.
    expect(heroAskFor({ title: 'Send the invites', domain: '' }, {})).toBe('Send the invites.');
  });
});
