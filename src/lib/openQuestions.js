// ─── "WE NOW NEED TO KNOW X, BECAUSE Y CHANGED" ─────────────────────────────
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

/** Where an answer to each question is written. One field per question, named here. */
export const OPEN_QUESTION_FIELDS = Object.freeze({
  'venue-step-free': 'venueStepFree',
});

const answered = (event, field) => {
  const v = event && event[field];
  return v === true || v === false;
};

/**
 * openQuestionsFor(event) → [{ id, question, because, answerField, route }]
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
export function openQuestionsFor(event) {
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

  if (venueName && needsStepFree && !answered(ev, OPEN_QUESTION_FIELDS['venue-step-free'])) {
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
      answerField: OPEN_QUESTION_FIELDS['venue-step-free'],
      // The app has no accessibility data for any venue and will not invent
      // any. This is the one thing only the host (or the venue) can settle.
      askWho: 'the venue',
      route: { tab: 'Event Details', focusField: 'event-venue' },
    });
  }

  return out;
}

/** The patch that records her answer. A patch, not a mutation — caller persists. */
export function answerOpenQuestionPatch(question, value) {
  const field = question && question.answerField;
  if (!field) return null;
  if (value !== true && value !== false) return null;
  return { [field]: value };
}
