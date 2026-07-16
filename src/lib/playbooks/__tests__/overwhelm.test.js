// EMOTION-STATE (roadmap #5) — overwhelm read from BEHAVIOR, not just who the host is.
// A big pile of open calls AND a short runway means the host is underwater regardless of
// experience; the board slows down + reassures WITHOUT re-ordering safety/overdue.
import { computeHostAdaptation } from '../index';

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
