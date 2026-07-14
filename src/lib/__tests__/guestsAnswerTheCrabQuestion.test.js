// THE GUESTS ANSWER THE CRAB QUESTION.
//
// The crab order is the biggest cost of the flagship event, and it sizes to PICKERS,
// not heads (see pickersSizeTheShellfish.test.js). Until now that number was the
// HOST's guess — the app asked the host to estimate something only the guests know,
// while the guests were sitting on an RSVP form saying yes.
//
// The invite now asks them outright ("Are you picking crabs?" → guest.picksCrabs).
// This pins the loop end-to-end: a guest's answer must actually move the order.
//
// Precedence is deliberate:
//   1. an explicit HOST number always wins (never override a human's stated decision)
//   2. else the guests' yes-count (beats "assume everyone picks", the old default)
//   3. else the guest count, exactly as before
// A silent guest is never counted as a yes OR a no.

import { buildCrabPlan } from '../crabPlan';
import { playbookFoodPlan } from '../playbooks';

const guest = (id, rsvp, picksCrabs) => ({ id, name: 'G' + id, rsvp, ...(picksCrabs === undefined ? {} : { picksCrabs }) });

const feast = (guests, crabPlan) => ({
  id: 'e-ask', type: 'Crab Feast', date: '2026-08-20',
  guestMode: 'list', guests, foodGot: {},
  ...(crabPlan ? { crabPlan } : {}),
});

test('the guests\' answers size the crab order — the host no longer has to guess', () => {
  const guests = [
    guest('1', 'Yes', true), guest('2', 'Yes', true), guest('3', 'Yes', true),
    guest('4', 'Yes', false),                    // came for the sides
    guest('5', 'Yes', false),
  ];
  const plan = buildCrabPlan(feast(guests));
  expect(plan.crabEatingHeadcount).toBe(3);      // three said "hand me a mallet"
  expect(plan.guestPickers).toEqual({ yes: 3, no: 2, unanswered: 0, basis: 'guests' });
});

test('a silent guest is not a yes AND not a no — the app never answers for them', () => {
  const guests = [
    guest('1', 'Yes', true),
    guest('2', 'Yes', false),
    guest('3', 'Yes'),          // said yes to the event, never answered the crab question
    guest('4', 'Yes'),
  ];
  const plan = buildCrabPlan(feast(guests));
  expect(plan.guestPickers).toEqual({ yes: 1, no: 1, unanswered: 2, basis: 'guests' });
  expect(plan.crabEatingHeadcount).toBe(1);      // only the confirmed picker
});

test('an explicit HOST number always wins — we never overrule a human decision', () => {
  // 12 on the roster so the host's 8 is inside the "pickers can't outnumber guests" clamp
  const guests = [
    guest('1', 'Yes', true), guest('2', 'Yes', false),
    ...Array.from({ length: 10 }, (_, i) => guest('r' + i, 'Yes')),
  ];
  const plan = buildCrabPlan(feast(guests, { crabEatingHeadcount: 8 }));
  expect(plan.crabEatingHeadcount).toBe(8);
  expect(plan.guestPickers.basis).toBe('host');   // and we SAY whose number it is
  expect(plan.guestPickers.yes).toBe(1);          // while still showing what guests said
});

test('nobody answered → unchanged from before (the guest count)', () => {
  const guests = [guest('1', 'Yes'), guest('2', 'Yes'), guest('3', 'Yes')];
  const plan = buildCrabPlan(feast(guests));
  expect(plan.guestPickers.basis).toBe('guest-count');
  expect(plan.crabEatingHeadcount).toBe(3);
});

// The loop, end to end: a guest tapping "not me" must move real money.
test('END TO END — guests answering shrinks the actual crab order and its cost', () => {
  const everyoneComes = Array.from({ length: 12 }, (_, i) => guest(String(i), 'Yes'));
  const fourPick = everyoneComes.map((g, i) => ({ ...g, picksCrabs: i < 4 }));

  const crabLine = (guests) => {
    const fp = playbookFoodPlan(feast(guests));
    return (fp.list || []).find(i => /crab/i.test(i.id));
  };

  const before = crabLine(everyoneComes);   // nobody answered → sized to all 12
  const after = crabLine(fourPick);         // 4 said yes, 8 said no

  expect(after.qty).toBeLessThan(before.qty);
  expect(after.high).toBeLessThan(before.high);
});

// SAFETY BEFORE MONEY.
// The full allergy set sits behind progressive disclosure — right for most events,
// wrong for this one: on a crab feast the allergen IS the menu. The playbook rates a
// shellfish allergy severity:'high' and its mitigation literally opens "Ask ahead."
// We were surfacing the question that protects the host's WALLET (are you picking?)
// and collapsing the one that protects a guest's LIFE. The invite now asks outright.
test('a shellfish-allergic guest is never counted as a crab picker', () => {
  const guests = [
    // answered the invite: allergic, and therefore not picking
    { id: '1', name: 'A', rsvp: 'Yes', picksCrabs: false, allergens: ['Shellfish'] },
    { id: '2', name: 'B', rsvp: 'Yes', picksCrabs: true },
    { id: '3', name: 'C', rsvp: 'Yes', picksCrabs: true },
  ];
  const plan = buildCrabPlan(feast(guests));
  expect(plan.crabEatingHeadcount).toBe(2);          // not 3 — we don't buy crabs for someone who can't eat them
  expect(plan.guestPickers).toEqual({ yes: 2, no: 1, unanswered: 0, basis: 'guests' });
});
