// ─── A PLANNER NEVER ANSWERS "WHAT NOW?" WITH SILENCE ───────────────────────
//
// Coverage pass, 2026-08-17. The decision-engine rescore recorded Coverage as
// capped by "the thin tail and the decision-window gradient". Both were measured
// against the raw data files and both were wrong: every one of the 215 decisions
// already carries a T-Nd window, and the "min 1 decision" figure came from a
// horizon cut no consumer applies.
//
// Measured through THIS resolver instead — the path the product actually uses —
// the real cap showed up, and it is worse than the recorded one:
//
//   phase         avg   EMPTY BOARDS
//   planning      2.5      9 / 39
//   research      2.2      7 / 39
//   booking       2.9      5 / 39
//   purchasing    3.1      6 / 39
//   preparation   2.3      9 / 39
//
// An empty board in EVERY phase. A host opening a housewarming or a game night
// six weeks out was shown nothing at all.
//
// WHY THE FIX IS NOT "WIDEN resolveDecisions". That function means DUE NOW, and
// the composer labels its output "Resolve N pending decisions". Padding it with
// calls whose window has not opened would fix Coverage by breaking Honesty —
// the host would be told they are behind on work that has not started. The two
// states are returned separately and labelled differently instead.
import { ALL_PLAYBOOKS } from '../playbooks';
import { resolveDecisions, nextDecisionsToOpen } from './decisionIntelligence';
import { composeExperience } from './experienceComposer';
import { PHASES } from './experienceContext';

const PHASE_LIST = ['planning', 'research', 'booking', 'purchasing', 'preparation'];
const ctx = (phase) => ({ role: 'host', phase, situations: [] });
const daysOut = (d) => { const m = /^T-(\d+)d$/.exec(d.when || ''); return m ? Number(m[1]) : null; };

describe('when nothing is due, the board still says what is coming', () => {
  test('PREMISE — the empty board is real, and this is where it happens', () => {
    // If this ever returns zero empties the defect is gone by another route and
    // the rest of this file is asserting against a situation that cannot arise.
    const empties = PHASE_LIST.map((p) =>
      ALL_PLAYBOOKS.filter((pb) => resolveDecisions(pb, ctx(p)).length === 0).length);
    expect(Math.min(...empties)).toBeGreaterThan(0);
  });

  test('EVERY EMPTY BOARD NOW NAMES A NEXT CALL', () => {
    const stillSilent = [];
    PHASE_LIST.forEach((phase) => {
      ALL_PLAYBOOKS.forEach((pb) => {
        if (resolveDecisions(pb, ctx(phase)).length) return;
        if (!(pb.decisions || []).length) return;       // nothing authored at all
        // Only playbooks that HAVE a call still ahead of this phase can name one.
        const ahead = (pb.decisions || []).filter((d) => {
          const n = daysOut(d);
          return n !== null && n < PHASES[phase].daysOutMin;
        });
        if (!ahead.length) return;
        if (!nextDecisionsToOpen(pb, ctx(phase)).length) stillSilent.push(`${pb.type} @ ${phase}`);
      });
    });
    expect(stillSilent).toEqual([]);
  });

  test('IT NEVER CALLS A MISSED CALL "COMING" — the past side is excluded', () => {
    // The other direction of the same lie. A held decision sits outside the
    // phase window on one of two sides; above the ceiling its window has closed.
    // Asserted across the whole corpus rather than one fixture.
    PHASE_LIST.forEach((phase) => {
      ALL_PLAYBOOKS.forEach((pb) => {
        nextDecisionsToOpen(pb, ctx(phase)).forEach((d) => {
          expect(daysOut(d)).toBeLessThan(PHASES[phase].daysOutMin);
        });
      });
    });
  });

  test('THE SOONEST-OPENING CALL COMES FIRST, not an arbitrary one', () => {
    // "What opens next" is the only useful answer to "nothing yet", so ordering
    // is load-bearing, not cosmetic.
    const pb = ALL_PLAYBOOKS.find((p) => nextDecisionsToOpen(p, ctx('planning')).length > 1);
    expect(pb).toBeTruthy();
    const outs = nextDecisionsToOpen(pb, ctx('planning')).map(daysOut);
    expect(outs).toEqual([...outs].sort((a, b) => b - a));
  });

  test('THE DUE-NOW COUNT STAYS TRUTHFUL — coming calls never join it', () => {
    // The honesty half. If these ever overlap, the composer's "Resolve N pending
    // decisions" starts counting work the host cannot do yet.
    PHASE_LIST.forEach((phase) => {
      ALL_PLAYBOOKS.forEach((pb) => {
        const due = new Set(resolveDecisions(pb, ctx(phase)).map((d) => d.id));
        nextDecisionsToOpen(pb, ctx(phase)).forEach((d) => expect(due.has(d.id)).toBe(false));
      });
    });
  });

  test('AND IT REACHES THE SCREEN — the projection and the action both carry it', () => {
    // A resolver nobody renders is not a fix. Driven through composeExperience,
    // which is what the surface consumes.
    const phase = 'planning';
    const pb = ALL_PLAYBOOKS.find((p) => resolveDecisions(p, ctx(phase)).length === 0
      && nextDecisionsToOpen(p, ctx(phase)).length > 0);
    expect(pb).toBeTruthy();

    const x = composeExperience(pb, ctx(phase));
    expect(x.decisions).toEqual([]);                    // still honestly empty
    expect(x.upcomingDecisions.length).toBeGreaterThan(0);

    const act = x.actions.find((a) => a.id === 'decisions-ahead');
    expect(act).toBeTruthy();
    expect(act.label).toContain('Next call:');
    expect(act.label).not.toMatch(/pending|Resolve/);   // never dressed as due
  });
});
