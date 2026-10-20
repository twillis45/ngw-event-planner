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

export default AttendanceZone;
