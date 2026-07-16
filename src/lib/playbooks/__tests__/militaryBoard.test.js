// The military-retirement engine reaches the DECISION BOARD: an Army retirement injects the
// protocol as real, grounded decisions (a new Coverage axis) — a civilian retirement doesn't.
import { playbookDecisionBoard } from '../index';

const armyRet = { id: 'e', type: 'Retirement Party', story: '30 years in the Army', date: '2027-04-15', guests: [], guestEstimate: 60 };
const civRet = { id: 'e', type: 'Retirement Party', story: '32 years at the library', date: '2027-04-15', guests: [], guestEstimate: 60 };
const ASOF = '2027-03-10'; // ~5 weeks out — the T-45d protocol calls are active

const allRows = (b) => [...(b.open || []), ...(b.locked || []), ...(b.deferred || [])];

describe('military-retirement engine on the board', () => {
  test('an Army retirement injects the grounded protocol decisions', () => {
    const b = playbookDecisionBoard(armyRet, ASOF);
    const rows = allRows(b);
    const ids = rows.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([
      'mil_color_guard', 'mil_shadowbox', 'mil_order_reader', 'mil_official_party', 'mil_uniform', 'mil_spouse',
    ]));
  });
  test('each military decision is GROUNDED (cites resolving Army sources)', () => {
    const b = playbookDecisionBoard(armyRet, ASOF);
    const mil = allRows(b).filter((r) => /^mil_/.test(r.id));
    expect(mil.length).toBeGreaterThanOrEqual(6);
    mil.forEach((r) => {
      expect(r.militaryGrounded).toBe(true);
      expect(r.militaryContext && r.militaryContext.branch).toBe('army');
    });
  });
  test('a civilian retirement gets NO military decisions', () => {
    const rows = allRows(playbookDecisionBoard(civRet, ASOF));
    expect(rows.find((r) => /^mil_/.test(r.id))).toBeUndefined();
  });
});
