// ─── A DAY-OF PROGRAM CAN BE THE RIGHT LENGTH AND THE WRONG THING ───────────
//
// `dayModelAudit.test.js:29` requires every playbook to carry at least six
// programme beats. That ratchet enforces COUNT. Nothing enforces that the beats
// are the ones this tradition actually has, and for culturally-specific
// playbooks that distinction is the whole risk.
//
// A generic beat does not fail by being empty. It fails by being CONFIDENTLY
// WRONG in the host's own voice — the app asserting that this is what your
// tradition looks like. "Greet guests, open the food" satisfies the six-beat
// ratchet on `repast.js` and turns a funeral meal into a party opener. On
// `ethiopianCoffeeCeremony.js` it erases abol, tona and baraka. On
// `theCookout.js` it deletes the grill, the elders' plates and the spades table
// and leaves a barbecue. That is the appropriation vector the roster's
// discipline names: not taking a tradition, but flattening it and handing the
// flattened thing back to the people it belongs to.
//
// WHY THIS FILE EXISTS AT ALL (2026-08-16). A census counted day-of coverage by
// reading `tasks[].phase` and reported that 26 of 39 playbooks — the Black and
// immigrant ones prominent among them — had NO day-of programme and abandoned
// the host at the door. It was false. Day-of lives in `schedules.program`, every
// playbook has one, and the gift-opening/toast/elders-first beats it called
// missing were all authored. The danger was not the wrong number: it was that
// the number would have justified a generic auto-fill pass over exactly the
// twelve files that most need hands. THAT pass would have done the real damage.
//
// So this pins the insider vocabulary already present, verbatim, per playbook.
// Every marker below was read out of the corpus, not invented for the test.
//
// RED-PROOF: replace any listed programme with six generic beats ("Doors open",
// "Food out", "Dessert", "Wind down"...). `dayModelAudit` stays green; this goes
// red and names the playbook and the missing marker.
//
// This gate can only ever be a floor. It cannot make a beat authentic, and it is
// not a substitute for an insider pass — `repast.js`'s unowned blessing and the
// pan-Ethiopian-only coffee ceremony are open questions no test can settle.
import { ALL_PLAYBOOKS } from '../playbooks';

// Each entry: markers that MUST appear somewhere in the programme text.
// A marker is a list of alternatives — any one satisfies it — because the
// corpus legitimately words things more than one way, and a gate that demands
// one exact phrasing would block honest editing instead of blocking flattening.
const REQUIRED = {
  'The Cookout': [
    ['elders and kids first', 'elders first'],   // service order is the tradition
    ['spades'],                                  // the card table IS the cookout
    ['to-go plate'],                             // nobody leaves empty-handed
    ['grill'],
  ],
  'Fish Fry': [
    ['elders first'],
    ['fryer'],
    ['oil'],                                     // the safety spine — oil cools before it moves
  ],
  'Card Party': [
    ['house rules'],                             // said out loud, before the first hand
    ['settle up'],                               // and settled in front of everyone
    ['partners'],
  ],
  'Sunday Dinner': [
    ['blessing'],
    ['elders first'],
    ['to-go plate'],
  ],
  'Juneteenth Cookout': [
    ['red drink', 'red dessert'],                // the red foods carry the meaning
    ['elders first'],
    ['what the day is'],                         // the telling — the point of the day
  ],
  'Kwanzaa Gathering': [
    ['kinara'],
    ['habari gani'],                             // the greeting, in Swahili
    ['libation'],
    ['elders first'],
    ['children speak'],                          // the young are not an audience
  ],
  Repast: [
    ['family first', 'immediate family first'],  // the bereaved eat first
    ['elders'],
    ['blessing'],
    ['to-go plate'],
    ['someone stays with the family'],           // she is not left alone
  ],
  'Ethiopian Coffee Ceremony': [
    ['abol'], ['tona'], ['baraka'],              // the three rounds, in order
    ['eldest first'],
    ['jebena'],                                  // the non-substitutable vessel
  ],
  'Pupusa Gathering': [
    ['comal'],
    ['curtido'],
  ],
  'Low Country Boil': [
    ['table papered'],
    ['the dump'],                                // not plated, not portioned — dumped
    ['shells'],
  ],
  'Crawfish Boil': [
    ['table papered'],
    ['pinch'],                                   // teaching the first-timers is a beat
    ['shells'],
  ],
  'Day Party': [
    ['last call'],
    ['posted'],                                  // a day party ends at the posted hour
  ],
};

const programText = (pb) => (((pb.schedules && pb.schedules.program) || [])
  .map((b) => String(b.what || '')).join(' • ').toLowerCase());

describe('culturally-specific day-of programmes keep their own vocabulary', () => {
  test('every named playbook still exists — the gate cannot pass by absence', () => {
    // If a playbook is renamed or dropped, REQUIRED silently stops guarding it
    // and this file goes quietly green while protecting nothing. That failure
    // mode is the reason the census above was wrong, so it is checked first.
    const missing = Object.keys(REQUIRED).filter((t) => !ALL_PLAYBOOKS.some((pb) => pb.type === t));
    expect(missing).toEqual([]);
  });

  test.each(Object.keys(REQUIRED))('%s keeps its insider markers', (type) => {
    const pb = ALL_PLAYBOOKS.find((p) => p.type === type);
    const text = programText(pb);
    // Premise: the programme is non-trivial. A one-beat programme could pass a
    // lenient marker check by accident.
    expect(((pb.schedules && pb.schedules.program) || []).length).toBeGreaterThanOrEqual(6);
    const absent = REQUIRED[type]
      .filter((alts) => !alts.some((m) => text.includes(m)))
      .map((alts) => alts.join(' | '));
    expect(absent).toEqual([]);
  });

  test('service order is authored, never assumed, wherever it is part of the tradition', () => {
    // Across these traditions the same rule recurs: elders (or the bereaved
    // family) are served first. It is the single most consistent marker in the
    // set, and the one a generic "food out" beat most reliably destroys.
    const ORDERED = ['The Cookout', 'Fish Fry', 'Sunday Dinner', 'Juneteenth Cookout',
      'Kwanzaa Gathering', 'Repast', 'Ethiopian Coffee Ceremony'];
    const failures = ORDERED.filter((type) => {
      const text = programText(ALL_PLAYBOOKS.find((p) => p.type === type));
      // `elders and kids first` (The Cookout) is the same rule worded for a yard
      // with children in it — the pattern allows the interjection rather than
      // forcing every playbook to say it one way.
      return !/elders?\b[^.•]{0,20}\bfirst|eldest first|(immediate )?family first/.test(text);
    });
    expect(failures).toEqual([]);
  });
});
