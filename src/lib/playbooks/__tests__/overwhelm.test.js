// EMOTION-STATE (roadmap #5) — overwhelm read from BEHAVIOR, not just who the host is.
// A big pile of open calls AND a short runway means the host is underwater regardless of
// experience; the board slows down + reassures WITHOUT re-ordering safety/overdue.
//
// ── AMENDED 2026-09-18 · "REGARDLESS OF EXPERIENCE" WAS A FLOOR, READ AS A CEILING ──
//
// The three lines above are still true and every test below them still holds. What
// they left out is that the thresholds were UNIVERSAL — `overwhelm` did not read
// `experience` or `capacity` at all — so the one signal in the whole adaptation
// model that says "this person has never done this before" had no bearing on
// whether the app thought they were struggling.
//
// MEASURED before the change (45 playbooks, guestEstimate 60, real boards built by
// playbookDecisionBoard, counting overwhelm && staged && focusCount < open — the
// exact gate the shipping shell folds on):
//
//   runway    first-time host    host who said nothing
//     7d          21 / 45               21 / 45
//    14d           6 / 45                6 / 45
//    45d           0 / 45                0 / 45
//    90d           0 / 45                0 / 45
//
// Identical in every row: the fold a first-timer is promised fired for them exactly
// as often as for a host who had told the app nothing — which at 45 days out was
// never. The largest board in the corpus at that runway carries 9 open calls and
// the bar was 14, so it could not fire.
//
// AFTER (same measurement, same events): 45d 20/45 first-timer vs 0/45 neutral;
// 90d 9/45 vs 0/45; 7d and 14d unchanged, because at those runways the universal
// bar already binds and the change can only ever LOWER a threshold.
//
// The new bar for a hand-held host is not a new constant — it is this board's own
// pacing arithmetic, its first foreground plus one follow-on batch. See
// computeHostAdaptation for the full reasoning. The negative controls that keep it
// honest live in the second describe block below: a host who has said nothing, and
// an experienced host, are byte-identical to before.
import { computeHostAdaptation, playbookDecisionBoard } from '../index';

// experienced + has_help + easy difficulty + medium size ⇒ handHolding 'light' by default.
const seasoned = (openCount, runwayDays) =>
  computeHostAdaptation('experienced', 'has_help', 'easy', openCount, 40, runwayDays);

describe('emotion-state: overwhelm', () => {
  test('a calm seasoned host is NOT overwhelmed — stays terse/light', () => {
    const a = seasoned(4, 60); // few open, long-ish runway
    expect(a.overwhelm).toBe(false);
    expect(a.handHolding).toBe('light');
    expect(a.terse).toBe(true);
  });

  test('a seasoned host UNDERWATER (many open + short runway) IS overwhelmed', () => {
    const a = seasoned(9, 5); // 9 open, 5 days out (rush)
    expect(a.overwhelm).toBe(true);
    expect(a.terse).toBe(false);      // never go quiet on someone drowning
    expect(a.reassure).toBe(true);    // speak to the state
    expect(a.staged).toBe(true);      // pace the pile into sessions
    expect(a.focusCount).toBeLessThan(9); // shrink the first foreground
  });

  test('overwhelm NEVER re-orders — proposeDerivable stays gated on real host input', () => {
    // The ease-in re-sequence (which can move rows) is proposeDerivable; overwhelm must not
    // trigger it, so safety/overdue ordering is untouched no matter how underwater the host is.
    expect(seasoned(9, 5).proposeDerivable).toBe(false);
  });

  test('needs BOTH a real pile AND real time pressure — a calm board is byte-identical', () => {
    expect(seasoned(3, 5).overwhelm).toBe(false);    // rush but only 3 open
    expect(seasoned(20, 200).overwhelm).toBe(false); // 20 open but a relaxed runway
    expect(seasoned(14, 40).overwhelm).toBe(true);   // standard runway needs >=14
    expect(seasoned(13, 40).overwhelm).toBe(false);
  });

  test('a first-timer is hand-held regardless (unchanged by overwhelm)', () => {
    const ft = computeHostAdaptation('first_time', 'solo', 'easy', 4, 40, 60);
    expect(ft.handHolding).toBe('high');
  });
});

// ─── THE SAME PILE IS NOT THE SAME PILE FOR EVERY HOST (2026-09-18) ──────────
describe('overwhelm reads the host, not only the board', () => {
  // medium event (40 guests), standard runway (60d). Only the host differs.
  const A = (experience, capacity, openCount, runwayDays = 60) =>
    computeHostAdaptation(experience, capacity, 'moderate', openCount, 40, runwayDays);

  test('a first-timer with a pile bigger than two sittings IS underwater; a silent host is not', () => {
    const first = A('first_time', null, 8);
    const silent = A(null, null, 8);
    expect(first.overwhelm).toBe(true);
    expect(silent.overwhelm).toBe(false);
    // the bar itself, stated rather than implied: first foreground (3) + one
    // follow-on batch (3) at a standard runway, vs the universal 14.
    expect(first.overwhelmPile).toBe(6);
    expect(silent.overwhelmPile).toBe(14);
  });

  test('NEGATIVE CONTROL: it does not fire for everyone', () => {
    // a host who has said nothing, at every pile the corpus actually produces
    for (const n of [3, 5, 8, 9, 13]) expect(A(null, null, n).overwhelm).toBe(false);
    // an experienced host with help — the universal bar, untouched
    for (const n of [3, 8, 9, 13]) expect(A('experienced', 'has_help', n).overwhelm).toBe(false);
    expect(A('experienced', 'has_help', 14).overwhelm).toBe(true);
    // a first-timer with a SMALL pile is still not underwater
    for (const n of [1, 3, 5]) expect(A('first_time', null, n).overwhelm).toBe(false);
    // a long runway still cannot trip it, however big the pile and whoever the host
    expect(A('first_time', 'solo', 50, 300).overwhelm).toBe(false);
    // no date ⇒ unknown runway ⇒ still cannot trip (unknown means unknown)
    expect(computeHostAdaptation('first_time', 'solo', 'moderate', 50, 40).overwhelm).toBe(false);
    expect(computeHostAdaptation('first_time', 'solo', 'moderate', 50, 40).overwhelmPile).toBeNull();
  });

  test('NEGATIVE CONTROL: the change can only LOWER a bar, and only at standard runway', () => {
    // rush and tight already bind on the universal bar, so a hand-held host's
    // threshold there is identical to everyone else's — no silent widening.
    for (const days of [4, 14]) {
      expect(A('first_time', 'solo', 9, days).overwhelmPile).toBe(A(null, null, 9, days).overwhelmPile);
    }
    expect(A('first_time', 'solo', 9, 60).overwhelmPile)
      .toBeLessThan(A(null, null, 9, 60).overwhelmPile);
  });

  test('overwhelm is the ONLY field that moves for a hand-held host', () => {
    // The claim this change must not overreach on: crossing the new bar must not
    // re-order the board, re-size the sessions, or change the hand-holding level.
    // Below the bar vs above it, everything except `overwhelm`/`focusCount` (which
    // is min(runwayFocus, openCount) and so tracks openCount) must be equal.
    const below = A('first_time', 'solo', 5);
    const above = A('first_time', 'solo', 8);
    expect(below.overwhelm).toBe(false);
    expect(above.overwhelm).toBe(true);
    for (const k of ['handHolding', 'staged', 'reassure', 'terse', 'proposeDerivable', 'batchSize', 'runway', 'size', 'difficultyBand']) {
      expect([k, above[k]]).toEqual([k, below[k]]);
    }
  });

  test('REAL BOARDS: at 45 days out a first-timer now folds where a silent host does not', () => {
    // The measurement in this file's header, re-run. `folds` counts the exact gate
    // the shipping shell uses: overwhelm && staged && focusCount actually removes rows.
    const dt = new Date(); dt.setDate(dt.getDate() + 45);
    const iso = dt.toISOString().slice(0, 10);
    const { ALL_PLAYBOOKS } = require('../index');
    let firstFolds = 0, silentFolds = 0, n = 0;
    const folds = (b) => {
      const ha = b.hostAdaptation;
      return !!ha.overwhelm && !!ha.staged && ha.focusCount < b.open.length;
    };
    for (const pb of ALL_PLAYBOOKS) {
      const base = { id: 'e', type: pb.type, date: iso, guests: [], guestEstimate: 60 };
      let f, s;
      try {
        f = playbookDecisionBoard({ ...base, hostExperience: 'first_time' });
        s = playbookDecisionBoard(base);
      } catch (_e) { continue; }
      n += 1;
      if (folds(f)) firstFolds += 1;
      if (folds(s)) silentFolds += 1;
    }
    expect(n).toBeGreaterThanOrEqual(40);
    expect(firstFolds).toBeGreaterThan(10);  // was 0 — measured 20
    expect(silentFolds).toBe(0);             // NEGATIVE CONTROL: unchanged, still 0
  });
});
