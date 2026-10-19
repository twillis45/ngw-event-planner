// ─── WHO NEEDS WHAT TO GET IN, MOVE AROUND, AND TAKE PART ───────────────────
//
// THE MEASURED CASE. A host types "…sit-down lunch, she uses a walker" and
// both halves vanish. `HostShellV2:9455` records why it mattered: "for an 80th,
// mobility is the constraint that decides venue access, seating and where the
// cake table goes."
//
// THE DEFECT IS NOT A MISSING CAPABILITY — it is a missing OWNER. Two consumers
// already act on an access need, with two different vocabularies, reading two
// different fields:
//
//   seatingPlan.guestNeedsAccessibleSeat  access[] AND needs
//                                         /wheel|accessib|ada|step-free|mobility/
//                                         → blind to "walker"
//   lodgingIntel (stepfree must-have)     needs ONLY
//                                         /wheelchair|step-free|stairs|mobility|
//                                          walker|cane|elder/
//                                         → blind to the structured array
//
// So one guest is accommodated at the table and not in the house, or in the
// house and not at the table, depending on which box her need was typed into.
// Neither is wrong alone. `confirmedCovers.js` already named this shape: "A
// concept with eight implementations has no owner." This is the owner, and the
// vocabulary lives HERE WITH the rule that reads it — the lesson `dietRows.js`
// records from the last time a vocabulary was merged and its rule was not:
// "a vocabulary and the rule for showing it are one fact, and splitting them is
// how they came apart the first time."
//
// ── TWO HARD LINES ─────────────────────────────────────────────────────────
//
// 1. NO DIAGNOSIS, EVER. "She uses a walker" is a statement about EQUIPMENT and
//    what it needs — a step-free route, a seat that can be reached. It is not a
//    statement about anyone's health, and nothing here converts it into one. No
//    output of this module names a condition, and a test asserts that.
//
// 2. NO INVENTED PERSON. "She" is not a name. When the need was stated at
//    intake we do not know who it refers to, and guessing a guest off the
//    roster would be exactly the kind of invention the product forbids. `who`
//    stays null until something tells us.
//
// ── WHAT IS WIRED, AND WHAT IS HONESTLY NOT ────────────────────────────────
//
// Measured 2026-10-18 across the five domains Sprint 0 named:
//
//   seating   ALREADY ACTS — seatingPlan tallies it and names the guest.   WIRED
//   lodging   ALREADY ACTS — the step-free must-have steers the search.    WIRED
//   place     nothing, and no venue-accessibility data exists to reason    NOT
//             from. A step-free requirement cannot be checked against a
//             venue we know nothing about; claiming otherwise would be a
//             fabricated consequence.
//   ground    only a per-guest free-text passthrough (travelPlan.js:278).   NOT
//             No consumer would act on a derived requirement.
//   the-day   nothing.                                                      NOT
//
// The three unwired domains are REPORTED, not hidden — `notYetApplied` exists
// so a surface can say "we recorded this and here is where it has not reached
// yet" instead of absorbing the need silently. An unimplemented consequence
// that is named is honest; one that is swallowed is not.
//
// PURE: no I/O, no UI, no storage.

/**
 * The vocabulary, as a frozen named list rather than a regex buried in a
 * consumer. v1 carries exactly ONE kind, because one is what the evidence
 * supports — mobility/step-free. Dietary needs are NOT folded in here: they
 * have their own owner (`dietRows.js` + the food plan's DIET_KEYWORDS), they
 * answer a different question, and forcing them together would be the same
 * mistake in the other direction.
 */
export const ACCESS_NEEDS = Object.freeze([
  Object.freeze({
    kind: 'step-free',
    label: 'Step-free access',
    // The UNION of the two vocabularies that were in use, so neither consumer
    // loses a word it already had, plus `walker` — the word the measured case
    // actually used and the one seating could not see.
    //
    // Word-bounded deliberately: `\bwalker\b` so "walking tacos" is not an
    // access need, and `\bcanes?\b` so "hurricane" is not either. A vocabulary
    // that grows until it matches everything is worse than no vocabulary.
    match: /wheel|accessib|\bada\b|step-?free|mobility|\bwalkers?\b|\bcanes?\b|stairs|elder/i,
    // `elder` is the one term here that is an INFERENCE FROM AGE rather than a
    // stated need, and it is kept only because lodgingIntel already acted on
    // it and dropping it would silently remove a working behaviour. Terms
    // matched this way are marked `basis: 'inferred'` so a consumer can tell
    // "someone said so" from "we guessed from the event's shape".
    inferredTerms: /elder/i,
  }),
]);

const str = (v) => String(v == null ? '' : v);

/** Does this text state a step-free access need? */
export function needsStepFreeAccess(text) {
  const t = str(text).trim();
  if (!t) return false;
  const kind = ACCESS_NEEDS[0];
  return kind.match.test(t);
}

/** Stated, or inferred from the event's shape? */
const basisOf = (text) => (ACCESS_NEEDS[0].inferredTerms.test(str(text)) ? 'inferred' : 'stated');

/**
 * Everything one guest row says about access, from BOTH places it can be
 * recorded: the redesigned invite's structured `access` array and the legacy /
 * typed free-text `needs`. Reading only one of them is the original defect.
 */
export function guestAccessText(guest) {
  const g = guest || {};
  const structured = Array.isArray(g.access) ? g.access.join(' ') : '';
  return [structured, str(g.needs)].filter(Boolean).join(' ').trim();
}

/** Does this guest need a step-free route and a reachable seat? */
export function guestNeedsStepFree(guest) {
  return needsStepFreeAccess(guestAccessText(guest));
}

/**
 * heardAccessNeeds(text) → the normalized needs stated in an intake sentence.
 *
 * Same shape and same seam as `heardMustHaves` in lodgingIntel: the creation
 * flow matches the host's own sentence against a module's own vocabulary and
 * writes the result only when her words actually matched something. The PARSER
 * is deliberately untouched — `smartParseEvent` stays the owner of the event's
 * skeleton, and an operational need is not part of that skeleton.
 *
 * THE CLAUSE IS KEPT VERBATIM. `phrase` is the sentence fragment she typed, not
 * a rewrite of it, so the surface that eventually shows this can show her own
 * words and she can tell at a glance whether we read her correctly.
 *
 * WHO IS NEVER GUESSED. "She uses a walker" names no one this app knows. The
 * requirement is recorded without an owner rather than attached to whichever
 * roster row seems likeliest.
 */
export function heardAccessNeeds(text) {
  const t = str(text).trim();
  if (!t) return [];
  const kind = ACCESS_NEEDS[0];
  // Clause-level, not sentence-level: a host types one long line and only the
  // fragment that carries the need should be kept. Splitting on the separators
  // the creation flow's own examples use keeps "she uses a walker" out of
  // "sit-down lunch for 40".
  const clauses = t.split(/[,;.\n]|—| - /).map((c) => c.trim()).filter(Boolean);
  const hits = [];
  for (const c of clauses) {
    if (!kind.match.test(c)) continue;
    if (hits.some((h) => h.phrase.toLowerCase() === c.toLowerCase())) continue;
    hits.push({ kind: kind.kind, phrase: c, source: 'host-said' });
  }
  return hits;
}

/** Every domain Sprint 0 asked this model to be evaluated against, in order. */
export const ACCESS_DOMAINS = Object.freeze(['seating', 'lodging', 'place', 'ground', 'the-day']);

/**
 * Which domains THIS requirement actually reaches — not which domains the
 * model knows about.
 *
 * The distinction is the whole point and I got it wrong first. `lodging` acts
 * on the COUNT of people needing a step-free route, so an unnamed need still
 * changes the house search: a ground-floor bed and bath is needed whether or
 * not we know whose it is. `seating` seats PEOPLE — its tally is one entry per
 * roster row and its instruction names the guest ("Seat with easy access:
 * Tonya Brooks"). A need with no name cannot reach it without inventing a
 * person to attach it to, which is the one thing this model must never do.
 *
 * So "she uses a walker" typed at intake reaches lodging and NOT seating, and
 * saying otherwise would be exactly the fabricated consequence Sprint 0
 * forbids.
 */
const domainsFor = (requirement) => (requirement && requirement.who
  ? ['seating', 'lodging']
  : ['lodging']);

/**
 * accessNeedsFor(event) → { requirements, appliedTo, notYetApplied }
 *
 * `requirements` is one entry per person-or-statement we were told about:
 *   { kind, label, who, phrase, source, basis }
 *     who     the person's name when we were told one, else NULL — never guessed
 *     phrase  the words it came from, so the host can see what we read
 *     source  'host-said' (intake) | 'guest-said' (their own RSVP / roster row)
 *     basis   'stated' | 'inferred'
 *
 * `appliedTo` / `notYetApplied` are empty when there is nothing to apply —
 * naming unreached domains for an event with no access need would be noise,
 * not honesty.
 */
export function accessNeedsFor(event) {
  const ev = event || {};
  const requirements = [];
  const kind = ACCESS_NEEDS[0];

  // ── Said at intake, about someone who may not be on any roster ───────────
  // This is the slot the measured case had nowhere to go. It holds normalized
  // entries, not raw text, so a consumer never re-parses a sentence.
  for (const n of (Array.isArray(ev.accessNeeds) ? ev.accessNeeds : [])) {
    if (!n) continue;
    const phrase = str(n.phrase).trim();
    const k = str(n.kind).trim() || (needsStepFreeAccess(phrase) ? kind.kind : '');
    if (k !== kind.kind) continue;
    requirements.push({
      kind: kind.kind,
      label: kind.label,
      // Only when we were TOLD. "she" is not a name.
      who: str(n.who).trim() || null,
      phrase: phrase || null,
      source: 'host-said',
      basis: basisOf(phrase),
    });
  }

  // ── Said by the guests themselves ────────────────────────────────────────
  for (const g of (Array.isArray(ev.guests) ? ev.guests : [])) {
    const text = guestAccessText(g);
    if (!needsStepFreeAccess(text)) continue;
    requirements.push({
      kind: kind.kind,
      label: kind.label,
      // A roster row HAS a name, so this one is known rather than guessed.
      who: str(g && g.name).trim() || null,
      phrase: text || null,
      source: 'guest-said',
      basis: basisOf(text),
    });
  }

  for (const r of requirements) r.appliedTo = domainsFor(r);

  // The union across requirements, and its complement. `notYetApplied` is not
  // a static list of unbuilt features — it is computed, so a surface can say
  // "recorded, and here is where it has not reached" with the answer true for
  // THIS event rather than true in general.
  const applied = ACCESS_DOMAINS.filter((d) => requirements.some((r) => r.appliedTo.includes(d)));
  return {
    requirements,
    appliedTo: applied,
    // Nothing to apply means nothing is owed — naming five unreached domains
    // for an event with no access need is noise, not honesty.
    notYetApplied: requirements.length ? ACCESS_DOMAINS.filter((d) => !applied.includes(d)) : [],
  };
}
