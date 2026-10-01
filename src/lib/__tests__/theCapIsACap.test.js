/**
 * The lookup cap must bound the number of listing reads that actually fire.
 *
 * commitStaged used to count one set and read another: it filtered the kept
 * rows down to the ones needing a read, checked THAT count against the cap,
 * and then handed the reader the whole kept list. The cap stopped being a cap
 * the moment any row already carried data.
 *
 * This file gates the DECISION only. A unit test on the helper would pass
 * forever while the component kept reading `keep`, so the DELIVERY is gated
 * where it can actually be observed: hostv2/e2e/theCapIsACap.spec.mjs counts
 * the unfurl requests that really fire. A source-grep here would be a text
 * gate on a behavior claim, which textGateRatchet.test.js correctly refuses.
 */
const { lookupTargets, needsLookup } = require('../lodgingIntel');

const CAP = 8;

const listingRow = (k) => ({ _k: k, url: 'https://airbnb.com/rooms/' + k, sleeps: null, amenities: [] });
const readRow = (k) => ({ _k: k, url: 'https://airbnb.com/rooms/' + k, sleeps: 10, amenities: ['Hot tub'] });
const hotelRow = (k) => ({ _k: k, platform: 'google', sleeps: null, amenities: ['Pool', 'Wifi'] });

describe('lookupTargets bounds what gets read', () => {
  test('never returns more rows than the cap allows', () => {
    for (let n = 0; n <= 20; n += 1) {
      const rows = Array.from({ length: n }, (_, i) => listingRow('L' + i));
      expect(lookupTargets(rows, CAP).length).toBeLessThanOrEqual(CAP);
    }
  });

  test('never returns a row that has nothing left to look up', () => {
    const rows = [readRow('a'), listingRow('b'), hotelRow('c'), readRow('d')];
    expect(lookupTargets(rows, CAP).map((r) => r._k)).toEqual(['b']);
  });

  // THE REPRODUCTION. Eight pasted links, one lookup came back empty. The old
  // gate saw unread === 1, waved it through, and read all eight.
  test('one failed lookup among eight does not re-read the seven that worked', () => {
    const keep = [
      ...Array.from({ length: 7 }, (_, i) => readRow('ok' + i)),
      listingRow('failed'),
    ];
    const targets = lookupTargets(keep, CAP);
    expect(targets).toHaveLength(1);
    expect(targets[0]._k).toBe('failed');
  });

  // A mixed paste: hotel cards arrive with amenities, results cards do not.
  test('a mixed kept set reads only the rows missing a record', () => {
    const keep = [
      ...Array.from({ length: 6 }, (_, i) => hotelRow('h' + i)),
      ...Array.from({ length: 4 }, (_, i) => listingRow('l' + i)),
    ];
    const targets = lookupTargets(keep, CAP);
    expect(targets).toHaveLength(4);
    expect(targets.every((r) => r._k.startsWith('l'))).toBe(true);
  });

  test('over the cap reads nothing, matching the untick-down copy', () => {
    const rows = Array.from({ length: CAP + 1 }, (_, i) => listingRow('L' + i));
    expect(lookupTargets(rows, CAP)).toEqual([]);
  });

  test('nothing to read returns nothing, so no request is made', () => {
    expect(lookupTargets([readRow('a'), hotelRow('b')], CAP)).toEqual([]);
    expect(lookupTargets([], CAP)).toEqual([]);
    expect(lookupTargets(null, CAP)).toEqual([]);
  });
});

describe('the notice counts the same rows the gate does', () => {
  test('needsLookup and lookupTargets never disagree about a row', () => {
    const rows = [readRow('a'), listingRow('b'), hotelRow('c'), listingRow('d')];
    const targets = lookupTargets(rows, CAP).map((r) => r._k);
    expect(rows.filter(needsLookup).map((r) => r._k)).toEqual(targets);
  });

  test('a hotel card needs no read even though it has no bed count', () => {
    expect(needsLookup(hotelRow('h'))).toBe(false);
    expect(needsLookup(listingRow('l'))).toBe(true);
    expect(needsLookup(readRow('r'))).toBe(false);
  });
});
