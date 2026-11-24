// ─── WHAT THE HOST CALLS THE DAY'S PLAN, IN ONE PLACE (owner, 11/24/2026) ────
//
// Owner: "Host doesn't use run of show language." Every host-facing string that
// named the timed plan of the day reads these instead, so a change of wording
// is this one line. The owner has not confirmed the word yet; "schedule" is the
// parent session's proposal. Engine ids (`ros`, `runOfShow`), keys and comments
// keep their names; only what the host reads changes.
// Guarded by src/lib/__tests__/theHostNeverReadsRunOfShow.test.js.
const NOUN = 'schedule';

/** Tabs, labels and headings: "Schedule". */
export const SCHEDULE = NOUN.charAt(0).toUpperCase() + NOUN.slice(1);
/** In a sentence: "the day’s schedule". */
export const THE_SCHEDULE = `the day’s ${NOUN}`;
/** Sentence start: "The day’s schedule". */
export const THE_SCHEDULE_CAP = THE_SCHEDULE.charAt(0).toUpperCase() + THE_SCHEDULE.slice(1);
/** Indefinite or compound: "a schedule", "schedule cues". */
export const A_SCHEDULE = `a ${NOUN}`;
export const SCHEDULE_WORD = NOUN;
