// ─── A Repast for Deacon Willie Hayes (canonical solemn sample) ──────────────
//
// The somber pole of the roster. A repast is the meal shared after a funeral —
// in this tradition the community feeds the grieving family rather than the
// family cooking. Built to seed the day-of ruling 331:61 STATE 3 (solemn tone),
// which had no sample event to render against until now. Registered in
// hostv2/src/eventPool.js (ALL_SAMPLES + ROSTER_IDS). Type 'Repast' pulls the
// fully-authored repast.js playbook (decisions, risks, run-of-show).
//
// Language here follows repast.js: gentle, dignified, quiet. Nothing is a task
// to "win"; the app's whole job is to REMOVE burden from a tired family.

const REPAST_SAMPLE_EVENT = {
  id: 'ev-x-repast',
  rsvpCode: 'repast',
  name: 'A Repast for Deacon Willie Hayes',
  type: 'Repast',
  honoree: 'Deacon Willie Hayes',
  host: 'Gloria Hayes',
  story: 'The home-going meal for a 52-year church deacon',
  date: '2026-07-25',
  // The repast begins right after the burial — the family knows the graveside
  // time, so this is a real host-set start (not a guess), and the day reads from it.
  startTime: '13:00',
  startTimeSource: 'host',
  startTimeWhy: 'The repast begins straight after the burial — set to give people time to travel from the graveside.',
  venue: 'Mount Zion Baptist Church — Fellowship Hall',
  venueCity: 'Petersburg, VA',
  guestMode: 'count',
  guestCount: 50,
  guestEstimate: 50,
  catererCount: 50,
  // Modest by nature: the church repast committee and neighbors carry most of the
  // meal, so the family's own spend is small. Left honest, not padded.
  totalBudget: 1400,
  meaning: 'The family should not have to cook or coordinate on the hardest day of their year. The church repast committee is carrying the meal; the plan only has to keep a room ready, a seat for every elder, and a quiet place to remember together.',
};

export { REPAST_SAMPLE_EVENT };
export default REPAST_SAMPLE_EVENT;
