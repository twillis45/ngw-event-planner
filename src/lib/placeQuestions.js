// ─── WHAT ONLY THE OUTSIDE WORLD CAN TELL US ABOUT WHERE THIS HAPPENS ───────
//
// ── RENAMED AND NARROWED, 2026-10-19 (Sprint 0.5 Decision 3) ───────────────
//
// Shipped in Sprint 0 as `openQuestions` with one rule. Sprint 0.5 tested that
// abstraction against two more consequence cases found in the repo, and the
// name did not survive either of them:
//
//   1. VENUE × ACCESS (this file, Sprint 0). Two facts coexist — a named venue
//      and somebody needing a step-free route — and the building becomes a
//      question. Answer lives with the venue.
//   2. ATTENDANCE × OUTDOORS (this file, added here). A derived number crosses
//      a line: an outdoor event planned for 50+ probably needs a city or park
//      permit. Answer lives with the city. placeIntelligence.js:182 has
//      said so since before any of this existed — as an inert NOTE inside a
//      card, never raised, never answerable, never resolved.
//   3. VENDOR × SCHEDULE WINDOW. A booked vendor has not given an arrival time
//      and the window the trade usually locks it in has passed. **ALREADY
//      BUILT** — `vendorAsks.openArrivalAsks`, raising through
//      `surfaceRegistry:62` since before Sprint 0 P1-5 existed.
//
// CASE 3 IS THE FINDING. Consequence generation in this repo was ALREADY
// domain-specific, with `surfaceRegistry` as the shared result contract and
// `eventPlan` as the only ranker. `rsvpchase`, `seating`, the lodging and
// travel deadlines and `openArrivalAsks` are all the same pattern. So Sprint 0
// did not introduce a general primitive; it introduced a FIFTH domain producer
// wearing a general name — and `openQuestions` was already taken, by
// `CommunicationHub.jsx:1349`, for unanswered questions in a message thread.
//
// THE RULE THAT SURVIVED ALL THREE: a consequence belongs to the domain where
// its ANSWER lives, not the domain that triggered it. Both rules here are
// triggered elsewhere — by a person's need, by a headcount — and both are
// answered by somebody at or around the place. That is what makes them one
// module. The arrival-time case is triggered by a vendor and answered by a
// vendor, so it belongs where it already is, and is not moved here.
//
// NO GENERALISED GRAPH, and now with evidence rather than instruction: three
// cases produced two owners and zero need for a central one.
//
// WHAT THIS IS NOT. Not a dependency graph, not a rules engine, not a
// re-architecture of how consequence works in this app. Derive-on-read already
// does the heavy lifting and does it well: a single event blob, pure authority
// modules, nothing cached, so nothing can go stale. Sprint 0's instruction is
// explicit — *preserve derive-on-read, add only the smallest missing piece.*
//
// THE PIECE THAT WAS MISSING. Derive-on-read answers "given everything known,
// what is true?" It has no way to say "answering that question has made a
// DIFFERENT question relevant, and nobody has asked it." Those two are not the
// same, and the gap shows up as a specific failure: a fact the host told us
// sits recorded and inert because the thing that would have made it actionable
// arrived later.
//
// THE REFERENCE CASE, and it is a real one rather than an illustration.
// P1-2 normalised "she uses a walker" into a step-free requirement and wired it
// to the two domains that could act on it truthfully — seating and lodging. It
// explicitly recorded `place` as NOT reached, because a step-free requirement
// cannot be checked against a venue the app knows nothing about. That was the
// honest answer at the time and it is still the honest answer about the VENUE.
//
// But it stops being the whole story the moment the host names one. Now there
// is a specific building, and a specific unknown about it, and the host is the
// only person who can resolve it:
//
//     We now need to know whether <venue> has a step-free way in,
//     because you named a venue and someone needs one.
//
// THE APP DOES NOT ANSWER IT. It cannot — it has no accessibility data for any
// venue, and guessing would be the fabricated consequence this whole sprint is
// written against. It asks, records what she says, and stops asking.
//
// WHY ONE RULE. The brief asks for "at least one real Venue consequence" and
// warns against raisers added for domain-count symmetry. One rule that earns
// its place is the deliverable; a second written to look thorough would be the
// thing being warned about. The shape generalises when a second case is
// genuinely found.
//
// eventPlan() REMAINS THE FINAL AUTHORITY. This produces questions. It does not
// rank them, schedule them, or decide they matter more than anything else —
// `surfaceRegistry` raises them and `eventPlan` orders them, exactly like every
// other job on the board.
//
// PURE: no I/O, no UI, no storage.
import { venueFor } from './venueFor';
import { accessNeedsFor } from './accessNeeds';
import { isLikelyOutdoor } from './weather';
import { attendanceBand } from './playbooks';

/** The headcount at which a public/outdoor gathering starts needing a permit. */
const PERMIT_THRESHOLD = 50;

/** Where an answer to each question is written. One field per question, named here. */
export const PLACE_QUESTION_FIELDS = Object.freeze({
  'venue-step-free': 'venueStepFree',
  'outdoor-permit': 'permitChecked',
});

const answered = (event, field) => {
  const v = event && event[field];
  return v === true || v === false;
};

/**
 * placeQuestionsFor(event) → [{ id, question, because, answerField, route }]
 *
 * `because` is not decoration. A question that cannot say what made it
 * relevant is indistinguishable from a form field nobody asked for, and this
 * app's standing rule is that a proposal which cannot say why it was made is
 * the thing most of its gates exist to refuse.
 *
 * A question disappears when it is ANSWERED — including when the answer is
 * "no". "No, there are steps" is information the plan can use; it is not an
 * unanswered question, and re-asking it would be the resurfacing P1-3 just
 * finished removing from the clause list.
 */
export function placeQuestionsFor(event) {
  const ev = event || {};
  const out = [];

  // ── VENUE × ACCESS ───────────────────────────────────────────────────────
  // Both halves must be true, and neither alone is enough:
  //   · a named venue — there is a specific building to ask about
  //   · a step-free requirement — somebody actually needs it
  // Without the venue there is nothing to ask about; without the need the
  // question is one more thing on a list she did not ask for.
  let vf = null;
  try { vf = venueFor(ev); } catch (_e) { vf = null; }
  const venueName = (vf && (vf.name || vf.address)) ? String(vf.name || vf.address).trim() : '';

  let needs = null;
  try { needs = accessNeedsFor(ev); } catch (_e) { needs = null; }
  const needsStepFree = !!(needs && needs.requirements && needs.requirements.length);

  if (venueName && needsStepFree && !answered(ev, PLACE_QUESTION_FIELDS['venue-step-free'])) {
    // WHO ASKED, QUOTED BACK. The requirement carries the host's own phrase
    // ("she uses a walker") or the guest's name, and saying which makes the
    // question answerable rather than abstract — she knows exactly who she is
    // being asked about.
    const first = needs.requirements[0];
    const who = first && first.who
      ? first.who
      : (first && first.phrase ? `you said “${first.phrase}”` : 'someone coming');
    out.push({
      id: 'venue-step-free',
      question: `Is there a step-free way into ${venueName}?`,
      // The two halves of "because Y changed", in the host's terms.
      because: `You named ${venueName}, and ${who} needs a step-free route.`,
      answerField: PLACE_QUESTION_FIELDS['venue-step-free'],
      // The app has no accessibility data for any venue and will not invent
      // any. This is the one thing only the host (or the venue) can settle.
      askWho: 'the venue',
      route: { tab: 'Event Details', focusField: 'event-venue' },
    });
  }

  // ── RULE 2 · ATTENDANCE × OUTDOORS → A PERMIT NOBODY HAS CHECKED ─────────
  //
  // A materially different shape from rule 1: not two facts coexisting, but a
  // DERIVED NUMBER CROSSING A LINE. Below ~50 outdoors, a city permit is
  // nobody's problem; above it, it is the thing that can end the event, and
  // `knowledge/legalContext.js:67` records the grounded version — a
  // special-event permit often needs 60+ days' lead, and a park or city venue
  // may also want proof of insurance.
  //
  // THE APP HAS SAID THIS ALL ALONG AND NOBODY COULD ACT ON IT.
  // `placeIntelligence.js:182` pushes exactly this sentence as a NOTE inside a
  // card — unraised, unanswerable, unresolvable, and `derivePlaceIntelligence`
  // is not in `surfaceRegistry` at all. Sprint 0.5 found it inert, not absent.
  //
  // ── THE COUNT MUST BE HERS (this is Decision 1 composed into Decision 3) ──
  // `countFromHost` is required, so an app-substituted playbook typical cannot
  // manufacture a permit question. A fabricated consequence is worse than a
  // missing one: it would send a host to a city office over a number she never
  // gave. Real RSVPs and a locked count both read as hers, so the only thing
  // refused is the app's own guess.
  const band = (() => { try { return attendanceBand(ev); } catch (_e) { return null; } })();
  const headcount = band && band.applicable && band.countFromHost ? Number(band.planning) || 0 : 0;
  const outdoors = (() => {
    if (ev.indoorOutdoor === 'indoor') return false;
    if (ev.indoorOutdoor === 'outdoor' || ev.indoorOutdoor === 'both') return true;
    if (vf && vf.kind === 'outdoor') return true;
    try { return isLikelyOutdoor((vf && vf.name) || '', ev.notes || ''); } catch (_e) { return false; }
  })();

  if (outdoors && headcount >= PERMIT_THRESHOLD
      && !answered(ev, PLACE_QUESTION_FIELDS['outdoor-permit'])) {
    out.push({
      id: 'outdoor-permit',
      question: 'Does this need a city or park permit?',
      because: `You're planning an outdoor event for ${headcount} — past about ${PERMIT_THRESHOLD}, a public or large outdoor gathering usually needs one.`,
      answerField: PLACE_QUESTION_FIELDS['outdoor-permit'],
      // Named rather than guessed: permit rules are per-city and this app holds
      // none of them. Saying "check with your city" is the whole honest answer,
      // and it is what placeIntelligence already said.
      askWho: 'your city or parks office',
      route: { tab: 'Event Details', focusField: 'event-venue' },
    });
  }

  return out;
}

/** The patch that records her answer. A patch, not a mutation — caller persists. */
export function answerPlaceQuestionPatch(question, value) {
  const field = question && question.answerField;
  if (!field) return null;
  if (value !== true && value !== false) return null;
  return { [field]: value };
}
