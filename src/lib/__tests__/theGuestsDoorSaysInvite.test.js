// ─── THE GUESTS DOOR SAYS "INVITE" (owner, 11/24/2026) ───────────────────────
// The invite lives in the Guests sheet, and a host looking for "the invite"
// did not see it in the menu. The owner ruled the door's label "Guests &
// invite": the same door (k 'guests', the same sheet), in All sections and the
// 13" rail (both read sectionGroups) and in search (the shell's palette).
import { sectionGroups } from '../sectionDirectory';

const rows = (ev) => sectionGroups({ event: ev || { id: 'x', type: 'Birthday' } }).flatMap((g) => g.rows);

test('the guests door reads "Guests & invite", and it is the same door', () => {
  const g = rows().filter((r) => r.k === 'guests');
  expect(g).toHaveLength(1);
  expect(g[0].label).toBe('Guests & invite');
});

test('no other door claims the bare word "Guests"', () => {
  expect(rows().filter((r) => r.label === 'Guests')).toEqual([]);
});
