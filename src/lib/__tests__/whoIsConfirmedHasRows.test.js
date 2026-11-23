// ─── WHO'S CONFIRMED AS ROWS (tall-iPad package, owner 11/22/2026) ───────────
//
// On a tall tablet the "Still waiting: a, b, c…" sentence becomes two row
// groups. They are built from the SAME structured summary the sentence is
// built from (never by parsing the sentence), carry the ids a row needs to
// open its own card, and their counts equal the chips: a vendor group of
// total − confirmed, a helper group of total − confirmed.
import { summarizeWhoIsConfirmed, whoIsConfirmedLines, whoIsConfirmedGroups } from '../whoIsConfirmed';
import WANDA from '../../data/wandaGoldEvent';

const wanda = summarizeWhoIsConfirmed(WANDA, {}, {});
const groups = (cbv) => whoIsConfirmedGroups(WANDA, cbv || {}, {});

describe('whoIsConfirmedGroups', () => {
  test('Wanda: the group counts equal the chips', () => {
    const g = groups();
    expect(g.vendors.count).toBe(wanda.vendors.total - wanda.vendors.confirmed);
    expect(g.helpers.count).toBe(wanda.helpers.total - wanda.helpers.confirmed);
    expect(g.vendors.rows).toHaveLength(g.vendors.count);
    expect(g.helpers.rows).toHaveLength(g.helpers.count);
    expect(g.vendors.count).toBe(6);
    expect(g.helpers.count).toBe(6);
  });
  test('every vendor row carries the vendor id it opens', () => {
    const g = groups();
    const ids = new Set((WANDA.vendors || []).map((v) => String(v.id)));
    for (const r of g.vendors.rows) expect(ids.has(String(r.id))).toBe(true);
  });
  test('helper rows keep the job and the person apart, with the job’s own route', () => {
    const g = groups();
    for (const r of g.helpers.rows) {
      expect(r.label).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r).toHaveProperty('route');
    }
  });
  test('the same names the sentence prints, in the same order', () => {
    const g = groups();
    const line = whoIsConfirmedLines(wanda).waiting;
    const fromRows = [
      ...g.vendors.rows.filter((r) => !r.note).map((r) => r.label),
      ...g.helpers.rows.filter((r) => !r.note).map((r) => (r.name ? `${r.label} (${r.name})` : r.label)),
    ];
    expect(line).toBe(`Still waiting: ${fromRows.join(', ')}`);
  });
  test('a flagged vendor and a helper who can’t are not confirmed either', () => {
    const v1 = (WANDA.vendors || []).find((v) => v && !v.isInformal);
    const cbv = { [String(v1.id)]: { state: 'problem' } };
    const s = summarizeWhoIsConfirmed(WANDA, cbv, {});
    const g = groups(cbv);
    expect(g.vendors.count).toBe(s.vendors.total - s.vendors.confirmed);
    expect(g.vendors.rows.some((r) => String(r.id) === String(v1.id) && r.note)).toBe(true);
  });
  test('nothing to show is null groups', () => {
    expect(whoIsConfirmedGroups({}, {}, {})).toEqual({ vendors: null, helpers: null });
  });
});
