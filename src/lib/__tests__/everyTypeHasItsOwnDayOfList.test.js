// ─── EVERY TYPE A HOST CAN PICK HAS ITS OWN DAY-OF LIST (audit 2 lane A P0-6) ─
//
// 29 types authored no `dayOfChecklist`, so The Day opened "0 of 3 — standard
// safety basics" under "We have no day-of list written for wedding yet" —
// while the checklist rows that sent her there were that type's real day-of
// steps ("Hair/makeup → first look → ceremony…", the Karamu libation, the
// vals and the crowning).
//
// The day-of list is not authored a second time. It is derived from the
// playbook's OWN day-of rows — the checklist rows due on the day (leadDays 0),
// the same rows the checklist shows — and the universal safety basics ride
// along as an addition, never as the whole list.
import { playbookDayOfChecklist, playbookChecklist } from '../playbooks';
import { HOST_TYPES } from '../smartParseEvent';

const DEFAULT_IDS = new Set(['food', 'cleanup', 'emergency', 'weather']);
const evFor = (type) => ({ id: 'census', type, name: type, date: '2027-06-12', startTime: '15:00', guestCount: 40, guests: [], vendors: [], budget: [], timeline: [] });

describe('census: every host-pickable type has a day-of list of its own', () => {
  for (const type of HOST_TYPES) {
    test(type, () => {
      const rc = playbookDayOfChecklist(evFor(type));
      expect(rc).not.toBeNull();
      expect(rc.isDefault).toBe(false);
      expect(rc.items.some((i) => !DEFAULT_IDS.has(i.id))).toBe(true);
    });
  }
});

test('the derived list is the checklist’s own day-of rows (one source)', () => {
  const ev = evFor('Wedding');
  const dayOfRows = playbookChecklist(ev).filter((r) => r.leadDays === 0);
  expect(dayOfRows.length).toBeGreaterThan(0);
  const rc = playbookDayOfChecklist(ev);
  for (const r of dayOfRows) {
    expect(rc.items.find((i) => i.id === r.id && i.label === r.task)).toBeTruthy();
  }
});

test('the safety basics stay, as an addition', () => {
  const rc = playbookDayOfChecklist(evFor('Wedding'));
  expect(rc.items.some((i) => i.id === 'emergency')).toBe(true);
  expect(rc.because).not.toMatch(/^standard .* safety basics$/);
});
