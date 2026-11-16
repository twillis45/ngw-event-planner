// ─── A SETTLED FACT ANSWERS ITS CALL (owner's live demo, 11/15/2026) ─────────
//
// On the seeded VFW retirement the Calls-to-make sheet asked "At home, a
// restaurant, or the workplace?" beside a BOOKED VFW post, "How is the food
// handled?" beside a CONTRACTED caterer, and parked "Heavy appetizers or a
// buffet" behind the venue call as "Waiting on At home, a restaurant, or the
// workplace." — a wait that could never end. Items 4, 12, 13, 15 and 16.
import { buildDemoEvent } from '../demoSeed';
import {
  playbookDecisionBoard, choicePickFor, decisionSettledByData, playbookOpenDecisionAffects,
  playbookRisks, playbookDayOfChecklist, playbookRunOfShow, getPlaybook,
} from '../playbooks';
import { buildVendorPlan } from '../vendorPlan';
import { deriveEventPhaseProgress } from '../phaseProgress';

const NOW = Date.UTC(2026, 10, 15, 17);
const asOf = new Date(NOW);
const demo = () => buildDemoEvent(NOW);
const rows = (b) => [...b.open, ...(b.deferred || [])];
const pb = getPlaybook('Retirement Party');
const dec = (id) => pb.decisions.find((d) => d.id === id);

describe('item 4 — a booked venue answers the venue call', () => {
  test('the venue call is locked from the booked VFW, and nothing waits on it', () => {
    const b = playbookDecisionBoard(demo(), asOf);
    expect(rows(b).map((r) => r.id)).not.toContain('venue');
    // One settled row for the place — the f-venue foundation fact — not two.
    expect(b.locked.find((r) => r.id === 'venue')).toBeUndefined();
    expect(b.locked.find((r) => r.id === 'f-venue').because).toContain('VFW Post 3150');
    expect(decisionSettledByData(demo(), dec('venue')).because).toBe('VFW Post 3150 — Alexandria, VA — booked');
    expect(rows(b).filter((r) => r.status === 'waiting')).toEqual([]);
  });
  test('control: a venue that is only being considered still asks', () => {
    const ev = demo();
    ev.vendors = ev.vendors.map((v) => (v.category === 'Venue' ? { ...v, status: 'Considering' } : v));
    const b = playbookDecisionBoard(ev, asOf);
    expect(rows(b).map((r) => r.id)).toContain('venue');
  });
  test('a waiting label reads in lowercase, natural words', () => {
    const ev = demo();
    ev.vendors = ev.vendors.filter((v) => v.category !== 'Venue');
    const fmt = rows(playbookDecisionBoard(ev, asOf)).find((r) => r.id === 'format');
    expect(fmt.status).toBe('waiting');
    expect(fmt.because).toBe('Waiting on the venue.');
  });
});

describe('item 13 — a contracted caterer answers how the food is handled', () => {
  test('food_style is locked by the caterer, and the food area does not count it open', () => {
    const ev = demo();
    const b = playbookDecisionBoard(ev, asOf);
    expect(rows(b).map((r) => r.id)).not.toContain('food_style');
    const locked = b.locked.find((r) => r.id === 'food_style');
    expect(locked.because).toMatch(/^Capital Rotisserie Catering — contracted$/);
    expect(decisionSettledByData(ev, dec('food_style')).pick).toBe('Drop-off catering / buffet');
    expect(choicePickFor(ev, 'food_style')).toBe('Drop-off catering / buffet');
    expect(Object.values(playbookOpenDecisionAffects(ev))).not.toContain(dec('food_style').label);
    const food = deriveEventPhaseProgress(ev, asOf).items.find((i) => i.id === 'food');
    expect(food.records || []).not.toContain('food_style');
  });
  test('control: a caterer still being quoted does not answer it', () => {
    const ev = demo();
    ev.vendors = ev.vendors.map((v) => (v.category === 'Catering' ? { ...v, status: 'Quoted', contractSigned: false } : v));
    expect(rows(playbookDecisionBoard(ev, asOf)).map((r) => r.id)).toContain('food_style');
    expect(decisionSettledByData(ev, dec('food_style'))).toBeNull();
  });
  test('control: the host’s own answer wins over the vendor record', () => {
    const ev = { ...demo(), foodChoices: { food_style: 'Host cooks' } };
    expect(choicePickFor(ev, 'food_style')).toBe('Host cooks');
  });
});

describe('item 15 — surprise risks only when a surprise is chosen, in neutral words', () => {
  const surprise = (ev) => (playbookRisks(ev).items || []).filter((r) => /surprise/i.test(r.trigger));
  test('unanswered "Surprise or announced?" shows no surprise risk', () => {
    expect(surprise(demo())).toEqual([]);
  });
  test('a chosen surprise shows it, with "they’re here"', () => {
    const r = surprise({ ...demo(), foodChoices: { surprise: 'Full surprise' } });
    expect(r.length).toBe(1);
    expect(r[0].mitigation).toContain('they’re here');
    expect(r[0].mitigation).not.toMatch(/\bshe\b/i);
  });
  test('control: an announced celebration shows none', () => {
    expect(surprise({ ...demo(), foodChoices: { surprise: 'Announced celebration' } })).toEqual([]);
  });
});

describe('item 12 — cleaning advice follows the venue', () => {
  const cleaning = (ev) => buildVendorPlan(ev).categories.find((r) => r && /clean/i.test(r.category || ''));
  test('a VFW event is not told "at home"', () => {
    const c = cleaning(demo());
    expect(c.altToDIY).not.toMatch(/at home/);
  });
  test('control: a host-home answer keeps "at home"', () => {
    const c = cleaning({ ...demo(), venueKind: 'home', venue: '', foodChoices: { venue: 'Host home' } });
    expect(c.altToDIY).toMatch(/at home/);
  });
});

describe('item 16 — The Day reads the Army ceremony it already has', () => {
  test('the day-of list carries the ceremony, not only the generic safety floor', () => {
    const rc = playbookDayOfChecklist(demo());
    const ids = rc.items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['mil_flag_presentation', 'mil_retirement_order']));
    expect(rc.isDefault).toBe(false);
  });
  test('the run of show names the ceremony at the program beat', () => {
    const ros = playbookRunOfShow(demo());
    const program = ros.find((r) => /retirement ceremony/i.test(r.segment));
    expect(program).toBeTruthy();
    expect(program.segment).toContain('Colors');
  });
  test('control: a civilian retirement keeps the generic floor and the civilian program', () => {
    const ev = { ...demo(), name: 'Pat’s Retirement Party', venue: 'Elm Street Hall', vendors: [] };
    expect(playbookDayOfChecklist(ev).isDefault).toBe(true);
    expect(playbookRunOfShow(ev).some((r) => /retirement ceremony/i.test(r.segment))).toBe(false);
  });
});

describe('item 22 — engine copy reads as plain words', () => {
  test('no "(≤36" reach)" in the run of show', () => {
    expect(playbookRunOfShow(demo()).map((r) => r.segment).join(' ')).not.toMatch(/≤36" reach/);
  });
});
