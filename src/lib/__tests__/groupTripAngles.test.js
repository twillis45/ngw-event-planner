// ─── A GROUP TRIP, FROM EVERY ANGLE A HOST WILL ACTUALLY TRY (G61) ──────────
//
// Written 11/19/2026 with the Group Trip playbook (data/groupTrip.js), by owner
// ruling 11/16/2026. In a 40-host trip test, 10 hosts had no occasion to pick:
// a girls' trip, a golf weekend, a friends' trip. "Girls trip" went to Wellness
// Retreat (no playbook of its own); "golf weekend" and "friends trip" went
// nowhere. The two sentences below are the ones in the plan item.
//
// Every assertion was measured against the engine before it was written down.
import { getPlaybook, playbookChecklist, playbookMilestones, destinationDecisionsFor, ALL_PLAYBOOKS } from '../playbooks';
import { resolveCanonicalType } from '../eventTaxonomy.mjs';
import { parseSmartEventText, HOST_TYPES } from '../smartParseEvent';
import { getStandardLeadDays, isGroundedLead } from '../workflowCompression';
import { isGroundedTiming } from '../knowledge/timingProvenance';
import { groundingSourceCatalog } from '../knowledge/groundingSources';
import { passVerdictAtCreation } from '../passGate';
import { draftInvite } from '../doItForMe';

const AS_OF = new Date('2026-11-19T12:00:00');
const GOLF = 'Yes — tee times for the group';

describe('angle 1 — the names hosts use reach the Group Trip playbook', () => {
  test.each([
    'Girls trip to Nashville', "Girls' trip to Palm Springs", 'girls getaway in Sedona',
    'Girlfriends trip to Napa', 'Ladies trip to Charleston', 'Guys trip to Austin',
    "Boys' trip to Vegas", 'Golf weekend in Myrtle Beach', 'golf trip to Scottsdale',
    'Friends trip to Tulum', "friends' getaway", 'Group trip to Lisbon',
    'A trip with friends to the lake', 'trip with the girls to Miami',
  ])('%s → Group Trip', (s) => {
    expect(resolveCanonicalType(s)).toBe('Group Trip');
  });

  // "trip" is a common word. Each of these names a trip that is not a group of
  // friends going away together, or no trip at all.
  test.each([
    ['business trip to Chicago', 'a work trip'],
    ['Field trip to the zoo for the class', 'a school outing'],
    ['school trip to DC', 'a school outing'],
    ['road trip to the coast', 'no group named'],
    ['day trip to Annapolis', 'no group named'],
    ['Company golf outing', 'one afternoon, corporate'],
    ['golf tournament fundraiser', 'a fundraiser'],
    ['Girls night at my place', 'a night in, not a trip'],
    ['Mini golf birthday party for Ava', 'a birthday'],
    ['boyfriend trip to Paris', '"friend" inside another word'],
    ['Trip hazard walkthrough meeting', 'a meeting'],
    ['Girl Scout troop camping trip', 'a troop outing'],
  ])('%s is not a Group Trip (%s)', (s) => {
    expect(resolveCanonicalType(s)).not.toBe('Group Trip');
  });

  test('bachelor and bachelorette trips stay with their own playbooks', () => {
    // Pinned in fixtures/parseCorpus.mjs ("Bachelorette weekend trip to
    // Nashville" → Bachelorette Party); their rules run before this one.
    expect(resolveCanonicalType('Bachelorette weekend trip to Nashville')).toBe('Bachelorette Party');
    expect(resolveCanonicalType('Bachelor trip to Vegas')).toBe('Bachelor Party');
    expect(resolveCanonicalType('girls trip for the bachelorette')).toBe('Bachelorette Party');
  });

  test('a destination getaway with no group named still resolves where it did', () => {
    expect(resolveCanonicalType('a destination getaway with friends')).toBe('Wellness Retreat');
  });

  test('the playbook is registered, and the intake offers it', () => {
    expect(getPlaybook('Group Trip').type).toBe('Group Trip');
    expect(HOST_TYPES).toContain('Group Trip');
    expect(ALL_PLAYBOOKS.filter((pb) => pb.type === 'Group Trip')).toHaveLength(1);
  });
});

describe('angle 2 — the intake reads it from one sentence', () => {
  test('"Girls trip to Nashville March 6–9 for 8": type, dates, count, town, a trip', () => {
    const r = parseSmartEventText('Girls trip to Nashville March 6–9 for 8', { now: AS_OF });
    expect(r).toEqual(expect.objectContaining({
      type: 'Group Trip', typeBasis: 'named', date: '2027-03-06', endDate: '2027-03-09', guests: 8,
      venueCity: 'Nashville', isDestination: true, destinationBasis: 'travel-language',
    }));
  });
  test('"Golf weekend in Myrtle Beach for 12": type, count, a trip to a named vacation area', () => {
    const r = parseSmartEventText('Golf weekend in Myrtle Beach for 12', { now: AS_OF });
    expect(r).toEqual(expect.objectContaining({ type: 'Group Trip', guests: 12, venueCity: 'Myrtle Beach', isDestination: true }));
  });
  test('a business trip is still not a typed event', () => {
    expect(parseSmartEventText('business trip to Chicago', { now: AS_OF }).type).not.toBe('Group Trip');
  });
});

describe('angle 3 — a multi-day destination event, gated like the others', () => {
  const trip = { id: 'cust-gt', type: 'Group Trip', date: '2027-03-06', endDate: '2027-03-09', guestCount: 8, isDestination: true, foodChoices: {} };
  test('stamped at creation as destination and multi-day, the same reasons any trip gets', () => {
    expect(passVerdictAtCreation(trip)).toEqual({ passRequired: true, passReasons: ['destination', 'multi-day'] });
  });
  test('multi-day by definition, like Wellness Retreat where "girls trip" used to land', () => {
    expect(passVerdictAtCreation({ type: 'Group Trip', date: '2027-03-06' }).passReasons).toEqual(['multi-day']);
  });
  test('where everyone stays is the destination toolkit\'s question, not a second one of its own', () => {
    const ids = destinationDecisionsFor(trip, getPlaybook('Group Trip')).map((d) => d.id);
    expect(ids).toContain('dest_lodging');
    expect(getPlaybook('Group Trip').decisions.map((d) => d.id)).not.toContain('lodging');
  });
});

describe('angle 4 — the plan, in the order the guides give', () => {
  const ev = (foodChoices = {}) => ({ id: 'gt', type: 'Group Trip', name: 'Girls trip', date: '2027-03-06', endDate: '2027-03-09',
    guestCount: 8, guestMode: 'count', isDestination: true, foodChoices, vendors: [], guests: [], budget: [], timeline: [] });
  const due = (e, id) => playbookMilestones(e, AS_OF).find((m) => m.id === id);
  const labels = (e) => playbookChecklist(e, AS_OF).map((c) => c.task).join('\n');

  test('deposits before the place, the place before tee times, details five weeks out', () => {
    const e = ev({ golf: GOLF });
    expect(due(e, 'gt_commit').dueDate).toBe('2026-11-06');   // 120 days
    expect(due(e, 'gt_stay').dueDate).toBe('2026-11-21');     // 105
    expect(due(e, 'gt_golf').dueDate).toBe('2026-12-06');     // 90
    expect(due(e, 'gt_details').dueDate).toBe('2027-01-30');  // 35
    expect(due(e, 'gt_balance').dueDate).toBe('2027-02-04');  // 30
  });
  test('golf steps appear only when the group is playing', () => {
    expect(labels(ev())).not.toMatch(/tee times/i);
    expect(labels(ev({ golf: GOLF }))).toMatch(/Book the tee times as a block/);
    expect(due(ev(), 'gt_golf')).toBeUndefined();
  });
  test('the runway is 120 days and grounded, so a trip two months out reads as tight, not as the 91-day default', () => {
    expect(getStandardLeadDays('Group Trip')).toBe(120);
    expect(isGroundedLead('Group Trip')).toBe(true);
  });
});

describe('angle 5 — every figure has a registered source, and nothing is made up', () => {
  const pb = getPlaybook('Group Trip');
  const registered = new Set(groundingSourceCatalog().flatMap((g) => g.sources.map((s) => s.id)));
  test.each(pb.decisions.map((d) => [d.id, d]))('%s: its timing is researched and grounded', (_id, d) => {
    expect(isGroundedTiming(d.timingProvenance)).toBe(true);
  });
  test('every source the playbook names is a registered source', () => {
    expect(pb.knowledge.sources.length).toBeGreaterThan(0);
    expect(pb.knowledge.sources.filter((s) => !registered.has(s))).toEqual([]);
  });
  test('no per-person cost band, no priced lines, no vendor ranges: none had a source', () => {
    expect(pb.meta.perGuestCost).toBeUndefined();
    expect(pb.purchases).toEqual([]);
    expect(pb.vendors).toEqual([]);
  });
});

describe('angle 6 — the invitation sounds like a trip', () => {
  test('a trip is not "hosted"', () => {
    const { body } = draftInvite({ type: 'Group Trip', name: 'Girls trip', date: '2027-03-06' }, null);
    expect(body).toMatch(/We’re planning a trip together, and we want you on it\./);
    expect(body).not.toMatch(/We’re hosting/);
  });
});
