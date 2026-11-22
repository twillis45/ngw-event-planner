// ─── ONE VENDOR COUNT, AND A FRIEND HELPING IS NOT IN IT (Wanda audit P0-9) ──
//
// Wanda's board read "Vendors 1 of 7 confirmed · 3 booked" while her vendor
// sheet read "Booked so far 5 of 9". The board already left out the two
// friends on her vendor list (the church singer, Vida helping run the day);
// the sheet's rollup counted them as hired vendors, booked ones at that.
//
// One reader now: workstreams.hiredVendors / vendorCounts. The board, the
// sheet's rollup and the workstreams all read it.
import W from '../../data/wandaGoldEvent';
import { hiredVendors, vendorCounts, buildVendorReadinessRollup, workstreamReadinessRollup, workstreamsFor } from '../workstreams';
import { summarizeWhoIsConfirmed } from '../whoIsConfirmed';

describe('the Wanda vendor list', () => {
  test('nine rows, seven hired', () => {
    expect(W.vendors).toHaveLength(9);
    expect(hiredVendors(W).map((v) => v.id)).not.toContain('ev-x-wanda-v8');
    expect(hiredVendors(W).map((v) => v.id)).not.toContain('ev-x-wanda-v9');
    expect(hiredVendors(W)).toHaveLength(7);
  });

  test('the one count: 7 hired, 3 booked, 1 locked in', () => {
    expect(vendorCounts(W)).toEqual({ total: 7, booked: 3, confirmed: 1 });
  });

  test('the sheet rollup and the board agree', () => {
    const rc = buildVendorReadinessRollup(W).counts;
    const board = summarizeWhoIsConfirmed(W, {}, {}).vendors;
    expect({ total: rc.total, booked: rc.ready, confirmed: rc.confirmed })
      .toEqual({ total: board.total, booked: board.booked, confirmed: board.confirmed });
    expect(rc.total).toBe(7);
    expect(rc.ready).toBe(3);
    expect(workstreamReadinessRollup(W).total).toBe(7);
  });

  test('no workstream is made of friends', () => {
    const inStreams = workstreamsFor(W).flatMap((w) => w.vendors.map((v) => v.id));
    expect(inStreams).not.toContain('ev-x-wanda-v8');
    expect(inStreams).not.toContain('ev-x-wanda-v9');
  });
});

