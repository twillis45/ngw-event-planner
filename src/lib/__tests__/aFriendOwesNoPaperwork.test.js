// ─── A FRIEND HELPING OWES NO PAPERWORK (Wanda audit P0-10) ─────────────────
//
// Wanda's checklist asked her to get insurance from, pay a deposit to and sign
// a contract with the church singer and Vida (the friend running her day). The
// singer's card read "Insurance still needed" beside the engine's own "No
// paperwork needed — this is someone helping out". Both are `isInformal`, and
// both carry `coiStatus: 'n/a'` — which the insurance gate read as an explicit
// status it did not know, and so fell through to "required".
//
// The rules now:
//   · vendorObligations skips informal vendors entirely;
//   · getVendorCOIState honors the informal ruling over any stored status, and
//     reads `coiStatus: 'n/a'` as "not required" — so every reader of the gate
//     (the checklist, the card chip, the COI next step) agrees.
import W from '../../data/wandaGoldEvent';
import { vendorObligations } from '../vendorObligations';
import { getVendorCOIState, coiNextAction } from '../vendorIntelligence';

const byId = (id) => W.vendors.find((v) => v.id === id);
const SINGER = 'ev-x-wanda-v8';
const VIDA = 'ev-x-wanda-v9';
const PHOTOSHOOT = 'ev-x-wanda-v7'; // a paid friend, coiStatus 'n/a', NOT informal

describe('the checklist asks friends for nothing', () => {
  const rows = vendorObligations(W);
  test.each([SINGER, VIDA])('%s has no derived row', (id) => {
    expect(rows.filter((r) => r.vendorId === id)).toEqual([]);
  });

  test('a recorded n/a means no insurance row, even for a paid vendor', () => {
    const mine = rows.filter((r) => r.vendorId === PHOTOSHOOT).map((r) => r.id);
    expect(mine.some((id) => id.startsWith('d_coi_'))).toBe(false);
  });

  test('premise: real obligations still raise (the booked DJ has no contract on file)', () => {
    const dj = { ...byId('ev-x-wanda-v4'), contractSigned: false };
    const r = vendorObligations({ ...W, vendors: [dj] });
    expect(r.map((x) => x.id)).toContain('d_con_ev-x-wanda-v4');
  });
});

describe('the insurance gate says one thing', () => {
  test.each([SINGER, VIDA])('%s: not required, and no next step', (id) => {
    const v = byId(id);
    const st = getVendorCOIState(v, W);
    expect(st.required).toBe(false);
    expect(st.need).toBe('not_needed');
    expect(coiNextAction(v, W, v.name)).toBeNull();
  });

  test("coiStatus 'n/a' is not required", () => {
    const st = getVendorCOIState({ name: 'Uncle Ray', category: 'Catering', coiStatus: 'n/a' }, W);
    expect(st.required).toBe(false);
    expect(st.status).toBe('not_required');
  });
});
