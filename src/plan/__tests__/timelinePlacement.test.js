// ─── Wave-6: TimelineBuilder places EVERY row — the crunch band is visible ────
//
// The grid placed items by `item.week === column` against 11 columns; stored playbook
// rows carry the full 19-label vocabulary ('5 Days Out', '3 Weeks Out', 'Event Day',…)
// so the entire final-week band rendered NOWHERE — grid and mobile list both. Placement
// is now by numeric lead (taskLeadDays → nearest column anchor, placementPhase), with a
// label/'Week Of' fallback so a row can never be unplaced.

import { placementPhase, PHASES } from '../TimelineBuilder';
import { taskLeadDays } from '../../lib/taskLead';
import { ALL_PLAYBOOKS, playbookChecklist } from '../../lib/playbooks';
import { storedTimelineFromPlaybook, inDays } from './storedSchemaFixture';

describe('every playbook milestone lands in exactly one column', () => {
  const withMilestones = ALL_PLAYBOOKS.filter(
    (pb) => Array.isArray(pb.milestones) && pb.milestones.length
  );

  test('there are playbooks to check', () => {
    expect(withMilestones.length).toBeGreaterThan(30);
  });

  test('stored-schema rows: placement is a real column, exactly one cell renders', () => {
    for (const pb of withMilestones) {
      for (const row of storedTimelineFromPlaybook(pb)) {
        const place = placementPhase(row);
        expect({ pb: pb.type, id: row.milestoneId, place, member: PHASES.includes(place) })
          .toEqual({ pb: pb.type, id: row.milestoneId, place, member: true });
        // The grid's own cell predicate — exactly one column cell holds the bar.
        const cells = PHASES.filter((ph) => place === ph).length;
        expect(cells).toBe(1);
      }
    }
  });

  test('playbookChecklist rows (sentence-case week + leadDays) also all place', () => {
    for (const pb of withMilestones) {
      const ev = { id: 'e', type: pb.type, date: inDays(60), guestCount: 12, guestMode: 'count' };
      for (const row of playbookChecklist(ev) || []) {
        expect(PHASES.includes(placementPhase(row))).toBe(true);
      }
    }
  });
});

describe('the crunch band is visible', () => {
  test('a stored T-5d row ("5 Days Out", offsetDays 5) places in a near-term column', () => {
    const row = { id: 't', task: 'Pre-order the crabs', week: '5 Days Out', offsetDays: 5, done: false };
    const place = placementPhase(row);
    expect(PHASES.includes(place)).toBe(true);
    expect(['Week Of', 'Final Days']).toContain(place);
  });

  test('event-day and day-before rows land in Final Days', () => {
    expect(placementPhase({ week: 'Event Day', offsetDays: 0 })).toBe('Final Days');
    expect(placementPhase({ week: 'Day Before', offsetDays: 1 })).toBe('Final Days');
    expect(placementPhase({ week: '3 Days Out', offsetDays: 3 })).toBe('Final Days');
  });

  test('"3 Weeks Out" and "10 Days Out" collapse to the nearest existing column', () => {
    expect(placementPhase({ week: '3 Weeks Out', offsetDays: 21 })).toBe('2 Weeks Out');
    expect(placementPhase({ week: '10 Days Out', offsetDays: 10 })).toBe('Week Of');
  });
});

describe('nothing is ever unplaced', () => {
  test('legacy label-only rows keep their own column', () => {
    expect(placementPhase({ week: '2 Weeks Out' })).toBe('2 Weeks Out');
    expect(placementPhase({ week: '6 Months Out' })).toBe('6 Months Out');
  });

  test('a row with no readable lead at all still places (Week Of fallback)', () => {
    const custom = { id: 'c', task: 'Something custom', week: 'Custom', done: false };
    expect(taskLeadDays(custom)).toBeNull();
    expect(placementPhase(custom)).toBe('Week Of');
  });

  test('a vendor-lane item (week "Week Of", no offsets) stays in Week Of', () => {
    expect(placementPhase({ week: 'Week Of', _vendor: true })).toBe('Week Of');
  });

  test('a lead longer than the first column clamps to 12 Months Out', () => {
    expect(placementPhase({ leadDays: -540 })).toBe('12 Months Out');
  });
});
