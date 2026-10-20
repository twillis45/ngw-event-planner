// ─── PEOPLE — the attendance truth, composed from the locked kit ────────────
//
// FIRST PRODUCTION SLICE of the NGW redesign. Not a second redesign: every atom
// here comes from ./parity/askKit (the Figma-matched Studio-Matte kit) and every
// number comes from a canonical reader. See
// docs/architecture/redesign/PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md.
//
// ── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────
//
// The legacy guests sheet is ~1,200 lines inside a 24,600-line shell, and its
// word choice cannot be pinned by a test. The display RULES therefore live in
// `@app/lib/attendanceStatement` (pure, 16 tests, red-proofed) and this file is
// only composition. If you find yourself computing a headcount here, stop — the
// statement module is the only thing allowed to decide what the number means.
//
// ── THE ONE THING THIS SURFACE EXISTS TO SAY ───────────────────────────────
//
// Not "here are your guests". The attendance figure, WHOSE IT IS, and how firm
// it is — because `attendanceBand().confirmed` means "people said yes" on a
// roster and "the number is firm" on a headcount, and a surface that blurs
// those two is lying on one of them. The statement module branches on the basis
// so this file never has to.
//
// ── MIGRATION ──────────────────────────────────────────────────────────────
//
// Reached by `?people=1` on the Guests door. The legacy body is the default and
// is untouched, so nothing retires and all 129 existing specs keep running
// against what they were written for. Same shape as `?demo=lodging` (the
// reimagined cockpit "driven and judged before it replaces anything") and
// `?elegant=0` (the v2 fallback after the v3 cut). The default flips at parity
// closure, not before.
import React from 'react';
import { AskColumn, Eyebrow, BigValue, GuideLine, Grounding, CtaRow } from './parity/askKit';
import { attendanceStatement } from '@app/lib/attendanceStatement';

/**
 * The attendance zone — People's dominant first viewport.
 *
 * `solemn` carries the day-of 331:61 state-3 ruling outward: a repast drops
 * celebratory framing, so the figure leans serif and the eyebrow mutes. The
 * tone prop is read, not re-decided.
 */
export function AttendanceZone({ event, solemn, onConfirmCount, onOpenRoster }) {
  const s = attendanceStatement(event);

  // NOTHING HONEST TO SAY IS A REAL STATE, not an empty card. No figure, no
  // placeholder zero, no "0 guests" — the one action that creates truth.
  if (!s.known) {
    return (
      <AskColumn>
        <Eyebrow tone={solemn ? 'solemn' : 'steel'}>Who’s coming</Eyebrow>
        <GuideLine gap={2}>Nobody is counted yet.</GuideLine>
        <Grounding>
          Give a number or start a list, and the food, seats and money size themselves to it.
        </Grounding>
        {onOpenRoster ? (
          <CtaRow><button className="cta" onClick={onOpenRoster}>Start the guest list</button></CtaRow>
        ) : null}
      </AskColumn>
    );
  }

  return (
    <AskColumn>
      <Eyebrow tone={solemn ? 'solemn' : 'steel'}>Who’s coming</Eyebrow>
      <BigValue tone={solemn ? 'solemn' : 'default'} suffix={s.unit}>{s.figure}</BigValue>

      {/* THE GUIDE VOICE carries how it is going — serif italic, per the
          boss/guide split. It must never carry an instruction. */}
      <GuideLine>{s.headline}</GuideLine>

      {/* The engine's own reason, verbatim. It already includes the
          substitution disclosure when the number is not hers, so this file
          does not restate it — "doubled the telling" is its own defect. */}
      {s.because ? <Grounding>{s.because}</Grounding> : null}

      {/* WHAT THE PLAN BUYS FOR, only when it disagrees with the figure above.
          A host whose food is sized past her yeses should be able to see why. */}
      {s.preparingFor ? (
        <Grounding gap={6}>
          The plan buys for {s.preparingFor} — the larger of your yeses and the number you told us to expect.
        </Grounding>
      ) : null}

      {/* PROVENANCE, MADE USEFUL. Not a badge: the one fact she can act on is
          that we are holding this number back from everything outward until
          she says it is hers. `confirmable` is present only when it is not. */}
      {s.confirmable ? (
        <>
          <Grounding gap={6}>
            It stays out of anything we send — invites, vendor briefs, the caterer — until you confirm it.
          </Grounding>
          {onConfirmCount ? (
            <CtaRow>
              <button className="cta" onClick={() => onConfirmCount(s.confirmable)}>
                Yes, plan for {s.confirmable}
              </button>
            </CtaRow>
          ) : null}
        </>
      ) : null}
    </AskColumn>
  );
}

/**
 * The needs zone — a known need with an owner we may not know.
 *
 * ── THE PRODUCT GAP THIS CLOSES ───────────────────────────────────────────
 *
 * P1-2 normalised "she uses a walker" into a step-free requirement and wired it
 * to the domains that could act on it. What it never did was SAY SO: the host
 * told us something operational and the only evidence was a line in a lodging
 * list. `accessNeedsFor` has carried `who: null` — "we were told about a need,
 * not about a person" — since the day it was written, and no surface showed it.
 *
 * ── THE RULE THIS SURFACE CANNOT BREAK ────────────────────────────────────
 *
 * "she" is not a name, and this zone never guesses which guest. No diagnosis is
 * inferred, ever: a mobility aid is not evidence of a condition, `healthNoted`
 * owns health, and that is a different question.
 *
 * ── A RESOLUTION THIS SLICE DELIBERATELY DOES NOT OFFER ───────────────────
 *
 * The obvious next control is "which of these people is it for?", writing the
 * need onto a roster row. It is NOT built here, because the data model cannot
 * carry the result truthfully yet, and that was measured rather than assumed:
 *
 *   `lodgingIntel.js:2073` sizes the step-free line on
 *   `accessNeedsFor(ev).requirements.length` and prints that count as prose —
 *   "2 people asked about stairs". `accessNeedsFor` builds requirements from
 *   `event.accessNeeds` AND from roster rows with no dedupe, so assigning a
 *   host-stated need to a guest produces TWO requirements for ONE person and
 *   the lodging sheet says two people asked.
 *
 * The alternatives all lose something real: dropping the intake entry loses her
 * verbatim words and relabels a host statement as the guest's own; keeping both
 * double-counts. Filling only `who` would make `appliedTo` claim seating while
 * `seatingPlan` — which reads the GUEST ROW, not this module — still cannot see
 * it, so the surface would promise a check that never happens.
 *
 * So this zone states the unknown and stops. Declared as a bounded gap in
 * PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md §7 under the eleven-condition rule:
 * named, evidenced from the destination's own consumer, honestly handled, and
 * with a regression test. Closing it is engine work — a dedupe or an owner
 * field — not a control on a screen.
 */
export function NeedsZone({ needs }) {
  const reqs = (needs && needs.requirements) || [];
  if (!reqs.length) return null;

  return (
    <div>
      <div className="shelf-label" style={{ margin: 'var(--sp-6) 0 var(--sp-2)' }}>
        What someone needs
      </div>
      {reqs.map((r, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
          <div style={{ fontSize: 'var(--t-body-s)', fontWeight: 650 }}>
            {r.label}
            {r.who ? <span style={{ fontWeight: 500, color: 'var(--ink-soft)' }}> — {r.who}</span> : null}
          </div>

          {/* HER OWN WORDS, verbatim. `phrase` is the fragment she typed, not a
              rewrite of it, so she can tell at a glance whether we read her
              correctly — which is the whole reason the engine keeps it. */}
          {r.phrase ? (
            <GuideLine gap={4} style={{ fontSize: 'var(--t-body-s)' }}>“{r.phrase}”</GuideLine>
          ) : null}

          {/* THE UNKNOWN, STATED AS AN UNKNOWN. Not a warning and not an error:
              it is ordinary for a host to mention someone before listing them,
              and the honoree usually never RSVPs to her own party.
              The claim about reach is narrowed to what is TRUE for an unowned
              need — lodging, which `domainsFor` is the authority on, and which
              is honest because that search is sized by the count, not by who. */}
          {!r.who ? (
            <Grounding gap={6}>
              We don’t know which person this is for, and we won’t guess. Where everyone stays is
              already planned around it; a specific seat can’t be until we know who.
            </Grounding>
          ) : (
            <Grounding gap={6}>
              Their seat and where they stay are both checked against this.
            </Grounding>
          )}
        </div>
      ))}

      {/* WHERE IT HAS NOT REACHED, computed for THIS event rather than listed
          as a static set of unbuilt features. */}
      {(needs.notYetApplied || []).length ? (
        <Grounding gap={8}>
          Not yet carried into: {(needs.notYetApplied).join(', ')}.
        </Grounding>
      ) : null}
    </div>
  );
}

export default AttendanceZone;
