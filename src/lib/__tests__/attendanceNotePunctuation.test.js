// ─── THE PARENS AND THE PERIOD (2026-08-06, board, copy seat) ──────────────
// The model's note carried a terminal period and the renderer wraps it in
// parens, so a host read "(usually ~10–15% no-shows, a few plus-ones.)" —
// period inside, nothing outside. Stripping the period fixed the parens and
// immediately broke the OTHER consumer, which concatenates the note with a
// second sentence. Both are pinned here so neither fix can undo the other.
import { expectedFromPlanned } from '../attendanceModel';

describe('the attendance note punctuates for both of its consumers', () => {
  test('a plain note carries no terminal period — the renderer supplies the parens', () => {
    const r = expectedFromPlanned(12, 'Birthday');
    expect(r.note).toBeTruthy();
    expect(r.note.endsWith('.')).toBe(false);
  });

  test('when a second sentence is appended, the join supplies the break', () => {
    // An implausible count triggers the "that's a lot" sentence.
    const r = expectedFromPlanned(5000, 'Birthday');
    expect(r.note).toMatch(/double-checking/);
    // The two clauses must not run together.
    expect(r.note).not.toMatch(/[a-z] That’s|[a-z] That's/);
    expect(r.note).toMatch(/\.\s/);
  });
});
