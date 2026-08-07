// Pins the ONE named door list. Extracted from HostShellV2 so a rail and a
// sheet cannot drift into two different answers to "what is in my plan".
//
// The invariants that matter are not the wording — they are (a) the core eight
// always have a door even on a calm event, which is the reason the directory
// exists at all, and (b) a conditional door appears ONLY when the event really
// has that leg, because a door to an empty surface is its own kind of lie.

import { sectionGroups, sectionDoorCount } from '../sectionDirectory';

const CORE_EIGHT = ['guests', 'food', 'budget', 'vendors', 'space', 'seating', 'tasks', 'decisions'];

const keysOf = (groups) => groups.flatMap((g) => g.rows.map((r) => r.k));

describe('sectionGroups', () => {
  test('never throws on a null or absent state — nav policy must not crash a render', () => {
    expect(() => sectionGroups(null)).not.toThrow();
    expect(() => sectionGroups()).not.toThrow();
    expect(() => sectionGroups({})).not.toThrow();
  });

  test('the core eight always have a door, even on a completely calm event', () => {
    const keys = keysOf(sectionGroups({ event: {} }));
    CORE_EIGHT.forEach((k) => expect(keys).toContain(k));
  });

  test('every door is unique — two rows routing to one sheet is a duplicate surface', () => {
    const keys = keysOf(sectionGroups({
      event: { costSharing: true, lodging: { name: 'x' } },
      travel: { relevant: true, air: { roster: [] }, ground: { needRide: [] } },
      crab: { relevant: true },
      outdoor: true,
    }));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('every row carries a label and a sub — no bare keys reach a rail', () => {
    sectionGroups({ event: {} }).forEach((g) => {
      expect(typeof g.title).toBe('string');
      g.rows.forEach((r) => {
        expect(r.k).toBeTruthy();
        expect(r.label).toBeTruthy();
        expect(r.sub).toBeTruthy();
      });
    });
  });

  describe('conditional doors appear only when the event has that leg', () => {
    test('rain only when outdoor', () => {
      expect(keysOf(sectionGroups({ event: {} }))).not.toContain('rain');
      expect(keysOf(sectionGroups({ event: {}, outdoor: true }))).toContain('rain');
    });

    test('crabs only when the crab plan is relevant', () => {
      expect(keysOf(sectionGroups({ event: {}, crab: { relevant: false } }))).not.toContain('crabs');
      expect(keysOf(sectionGroups({ event: {}, crab: { relevant: true } }))).toContain('crabs');
    });

    test('costshare only when the event shares cost', () => {
      expect(keysOf(sectionGroups({ event: {} }))).not.toContain('costshare');
      expect(keysOf(sectionGroups({ event: { costSharing: true } }))).toContain('costshare');
    });

    test('air and ground need travel.relevant AND that leg', () => {
      const noTravel = keysOf(sectionGroups({ event: {}, travel: { relevant: false, air: {}, ground: {} } }));
      expect(noTravel).not.toContain('air');
      expect(noTravel).not.toContain('ground');

      const airOnly = keysOf(sectionGroups({ event: {}, travel: { relevant: true, air: { roster: [] } } }));
      expect(airOnly).toContain('air');
      expect(airOnly).not.toContain('ground');
    });
  });

  describe('lodging — the shortlist must have a door', () => {
    test('absent when there is no travel, no shortlist and no pick', () => {
      expect(keysOf(sectionGroups({ event: {} }))).not.toContain('lodging');
    });

    // The 2026-07-28 click-through finding: a host can build a shortlist on an
    // event the travel engine does not consider a travel event. That shortlist
    // moves real money into `committed`, so it always gets a door.
    test('present on a shortlist even when travel is NOT relevant', () => {
      const keys = keysOf(sectionGroups({
        event: { lodgingOptions: [{ name: 'A' }] },
        travel: { relevant: false },
      }));
      expect(keys).toContain('lodging');
    });

    test('present on a pick even when travel is NOT relevant', () => {
      expect(keysOf(sectionGroups({ event: { lodging: { name: 'A' } }, travel: { relevant: false } })))
        .toContain('lodging');
    });

    test('the sub counts the shortlist rather than describing it', () => {
      const row = sectionGroups({ event: { lodgingOptions: [{}, {}] } })
        .flatMap((g) => g.rows).find((r) => r.k === 'lodging');
      expect(row.sub).toBe('2 places on your shortlist');
    });

    test('singular reads naturally', () => {
      const row = sectionGroups({ event: { lodgingOptions: [{}] } })
        .flatMap((g) => g.rows).find((r) => r.k === 'lodging');
      expect(row.sub).toBe('1 place on your shortlist');
    });
  });

  describe('sectionDoorCount', () => {
    test('is a real derived number that moves with the event', () => {
      const calm = sectionDoorCount({ event: {} });
      const busy = sectionDoorCount({
        event: { costSharing: true },
        crab: { relevant: true },
        outdoor: true,
      });
      expect(busy).toBeGreaterThan(calm);
      // 3 conditional doors added: rain, crabs, costshare.
      expect(busy - calm).toBe(3);
    });

    test('agrees with the rows actually rendered', () => {
      const state = { event: { costSharing: true }, outdoor: true };
      expect(sectionDoorCount(state)).toBe(keysOf(sectionGroups(state)).length);
    });
  });
});
