// ─── THE ONLY RISK ON AN 80TH BIRTHDAY WAS ABOUT CHILDREN ─────────────────
//
// Driving the Santa Fe 80th, the WORTH HAVING A PLAN FOR lane carried exactly
// one row: "Kid food allergies not collected." Thirty adults flying in for a
// milestone birthday, zero children on the guest sheet, and the app's single
// warning was about kids — while the two access facts the host volunteered
// ("she uses a walker", "the altitude is hard on her") were declared out of
// scope one screen earlier.
//
// WHY IT FIRED. `eventHasKids` is the one place this repo answers "are kids
// actually coming", and its own comment says so. Decisions read it through
// `whenKids`. Checklist rows read it. Packing lines read it. `playbookRisks`
// never called it, so a flat row with kid-scoped prose had nothing to fail.
//
// WHY DELETING THE ROW IS THE OPPOSITE MISTAKE. Food allergies at a thirty-
// person seated dinner are a real uncollected hazard whether or not a child is
// present. Gating this row on kids would leave an adult dinner with no allergy
// warning at all — trading a false positive for a false negative on the same
// screen. The row is re-scoped to guests and keeps its kid wording for when
// kids ARE coming, which is what `kidsTrigger` is.
import { playbookRisks, ALL_PLAYBOOKS, eventHasKids } from '../playbooks';

const base = {
  id: 'kr', name: "Mom's 80th", type: 'Birthday', date: '2027-06-14',
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 30,
};
const ADULTS = { ...base };
const WITH_KIDS = { ...base, kidsCount: 4 };
// playbookRisks answers { items, count } or null — NOT an array. The first
// draft of this file read it as an array, and every assertion failed on an
// undefined row rather than on the wording it meant to test. Four red tests
// that were red for the wrong reason look exactly like four red tests.
const rows = (ev) => ((playbookRisks(ev) || {}).items || []);
const allergyRow = (ev) => rows(ev).find((r) => r.id === 'r_allergy');

// ── THE TEN THAT STAY, NAMED RATHER THAN EXCLUDED BY PATTERN ──────────────
// The sweep below found eleven kid-worded triggers across 45 playbooks. One is
// the defect. The other ten are recorded here with the reason each stays,
// because a census that quietly drops its leftovers is how a class reopens.
//
// Two reasons, and the first is the important one:
//
// SAFETY COPY IS NOT GATED ON AN UNSET FIELD. `eventHasKids` reads missing
// data as "no kids" — correct for a milestone birthday, dangerous for a
// Halloween party. A host who never touched the kids stepper has not told us
// there are no children; they have told us nothing. Stripping "Kids on foot in
// the dark near moving cars" from a trunk-or-treat on that silence would be a
// worse error than the one this file fixes, so burn, flame, traffic and
// lost-child rows keep their wording unconditionally.
//
// KID-PREMISE EVENTS keep theirs because the cohort is the event.
const KID_WORDED_BY_DESIGN = {
  'Reunion/r-lost-child': 'safety — a multi-household crowd; NCMEC guidance, not gated on a stepper',
  'Pupusa Gathering/r_comal_burn': 'safety — hot griddle; the hazard is adult-facing too, children are one named exposure',
  'Ethiopian Coffee Ceremony/r_openflame': 'safety — live charcoal; same shape as the comal row',
  'Kwanzaa Gathering/r_candle_safety': 'safety — seven open flames; same shape',
  'Halloween Party/r_cars': 'safety — the highest-risk pedestrian night of the year for children',
  'Halloween Party/r_allergy': 'kid-premise event; the candy hazard IS the cohort',
  'Halloween Party/r_scare': 'kid-premise event; the scare calibration is about children by definition',
  "New Year's Eve Party/r_kids_late": 'kid-premise row — it exists to describe the family version of the night',
  'PTA / Booster Fundraiser/r_lost_child': 'safety — a school crowd; same shape as Reunion',
  'PTA / Booster Fundraiser/r_allergy': 'kid-premise event; a school stand serves children',
};

describe('a kid-scoped risk needs a kid', () => {
  test('(premise) the predicate really does read zero kids for this event', () => {
    expect(eventHasKids(ADULTS)).toBe(false);
    expect(eventHasKids(WITH_KIDS)).toBe(true);
  });

  test('(premise) the reader answers at all, so the assertions below are not about an empty list', () => {
    expect(rows(ADULTS).length).toBeGreaterThan(0);
    expect(allergyRow(ADULTS)).toBeTruthy();
  });

  test('THE DEFECT: an adult birthday is not warned about children', () => {
    expect(allergyRow(ADULTS).trigger).not.toMatch(/\bkids?\b|\bchild/i);
  });

  test('…and the hazard survives, because it was never only about kids', () => {
    const r = allergyRow(ADULTS);
    expect(r.trigger).toMatch(/allerg/i);
    expect(r.severity).toBe('high');
    expect(r.mitigation).toMatch(/allerg/i);
  });

  test('AND THE KID WORDING RETURNS when kids are actually coming', () => {
    expect(allergyRow(WITH_KIDS).trigger).toMatch(/\bkid/i);
  });

  test('CORPUS SWEEP: no NEW kid-worded trigger reaches an adult event', () => {
    // Mechanism-independent on purpose. It does not care whether a future
    // author uses kidsTrigger, a whenKids gate, or something not invented yet
    // — only that the host of an adult event is never told a child is there.
    const seen = [];
    for (const pb of ALL_PLAYBOOKS) {
      const ev = { ...base, type: pb.type };
      for (const r of rows(ev)) {
        if (/\bkids?\b|\bchild(ren)?\b|\btoddler/i.test(String(r.trigger || ''))) seen.push(`${pb.type}/${r.id}`);
      }
    }
    // (premise) the sweep reaches real playbooks. The first draft iterated
    // Object.keys(ALL_PLAYBOOKS) — an ARRAY — so it walked "0","1","2",
    // resolved no playbook, scanned nothing and passed. It reported zero
    // offenders on the same run where the single-row test proved one existed.
    expect(ALL_PLAYBOOKS.length).toBeGreaterThan(40);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.sort()).toEqual(Object.keys(KID_WORDED_BY_DESIGN).sort());
  });

  test('every recorded exception says WHY it stays', () => {
    for (const [k, why] of Object.entries(KID_WORDED_BY_DESIGN)) {
      expect(why.length).toBeGreaterThan(20);
      expect(k).toMatch(/\//);
    }
  });
});
