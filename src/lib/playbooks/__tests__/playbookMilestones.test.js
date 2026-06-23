import { playbookMilestones, playbookAreaNextStep } from '../index';

// A fixed "today" so the test is deterministic.
const AS_OF = '2026-06-01';
// Dinner Party event 20 days out.
const EV = { type: 'Dinner Party', date: '2026-06-21', guestCount: 8 };

describe('playbookMilestones — authored milestones as dated actions', () => {
  test('returns dated milestones with owner + computed due date, never the event row', () => {
    const ms = playbookMilestones(EV, AS_OF);
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.every((m) => m.category !== 'event')).toBe(true);
    for (const m of ms) {
      expect(typeof m.dueDate).toBe('string');     // event has a date → real due dates
      expect(typeof m.daysOut).toBe('number');
      expect(m.owner).toBeTruthy();
    }
    // due date = event date minus offsetDays
    const setdate = ms.find((m) => m.id === 'dp_setdate');
    expect(setdate.dueDate).toBe('2026-05-31'); // 2026-06-21 minus 21 days
  });
  test('no event date → null due date, never a fabricated one', () => {
    const ms = playbookMilestones({ type: 'Dinner Party' });
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.every((m) => m.dueDate === null && m.daysOut === null)).toBe(true);
  });
});

describe('playbookAreaNextStep — the next dated step per home area', () => {
  test('Guests area maps to a guest milestone with a concrete action + due date', () => {
    const s = playbookAreaNextStep(EV, 'Guests', AS_OF);
    expect(s).toBeTruthy();
    expect(s.action.length).toBeGreaterThan(0);
    expect(s.action).not.toMatch(/\(/); // parenthetical aside trimmed for the compact row
    expect(typeof s.dueDate).toBe('string');
  });
  test('Heart (no dated milestone) and unknown areas return null → caller keeps the status word', () => {
    expect(playbookAreaNextStep(EV, 'Heart', AS_OF)).toBeNull();
    expect(playbookAreaNextStep(EV, 'Nonsense', AS_OF)).toBeNull();
  });
});
