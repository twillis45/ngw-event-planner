// ─── "WHERE EVERYONE STAYS" — AUDIT GATES (2026-07-28) ───────────────────────
//
// Host asked for a logic + friction audit of the lodging surface. Three real
// defects came out of it, all reproduced here so they cannot come back. Two of
// the three were mine, shipped the same day.
const { lodgingIntel, lodgingRecommendation, stayFromPick, backupFromRunnerUp,
        lodgingCommitted, extractListingCandidates } = require('../lodgingIntel');
const { hostSpending } = require('../hostSpending');

const EV = (o) => ({ id: 'a', type: 'Family Reunion', date: '2026-09-11', endDate: '2026-09-13',
  guestCount: 10, venueCity: 'McHenry', venueState: 'MD', totalBudget: 3000, ...o });
const OPT = (o) => ({ id: 'o', label: 'House', url: 'https://www.airbnb.com/rooms/1',
  sleeps: 12, totalPrice: 2000, fees: 200, status: 'option', ...o });

describe('a photo viewer is not a different house', () => {
  // FOUND IN THE HOST'S OWN DATA: seven of her eight shortlist rows were named
  // "Photo gallery for Golden Crest", "Photo gallery for Duck Cove"… Opening a
  // listing's gallery keeps the listing URL and swaps the title. The row was
  // never wrong about WHICH house — only about its name.
  const gallery = (title) => extractListingCandidates(
    `<a href="https://www.vrbo.com/4892976"><img src="https://media.vrbo.com/x.jpg"></a>` +
    `<div>${title}</div><div>Hot Tub</div>`);

  test('the property name is recovered, not the row rejected', () => {
    const { candidates } = gallery('Photo gallery for Golden Crest');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe('Golden Crest');
    expect(candidates[0].url).toBe('https://www.vrbo.com/4892976');
  });

  test('every gallery phrasing is stripped', () => {
    for (const t of ['Photos of Duck Cove', 'Photo gallery for Duck Cove',
      'Image gallery for Duck Cove', 'Gallery of Duck Cove']) {
      expect(gallery(t).candidates[0].name).toBe('Duck Cove');
    }
  });

  test('a real name containing the word photo is left alone', () => {
    expect(gallery('Photographers Loft').candidates[0].name).toBe('Photographers Loft');
  });
});

describe('the house is never charged twice', () => {
  // MEASURED BEFORE THE FIX: committed = 4,848 for a $2,200 house, because the
  // host had it on the shortlist AND typed as a budget row. vendorOwed cannot
  // double-count structurally; lodging has no such protection.
  const chosen = [OPT({ status: 'chosen' })];   // $2,000 + $200 fees

  test('with no budget row, the chosen house is committed once', () => {
    expect(lodgingCommitted(EV({ lodgingOptions: chosen }))).toBe(2200);
  });

  test('a budget row naming the house wins — the derived term stands down', () => {
    const e = EV({ lodgingOptions: chosen, budget: [{ label: 'House', actual: 2200 }] });
    expect(lodgingCommitted(e)).toBe(0);
    expect(hostSpending(e).committed).toBeLessThan(4000);
  });

  test('a generic lodging row also counts as already accounted for', () => {
    for (const label of ['Rental house', 'The house', 'Airbnb', 'Vrbo', 'Lodging', 'Cabin']) {
      expect(lodgingCommitted(EV({ lodgingOptions: chosen, budget: [{ label, actual: 2200 }] }))).toBe(0);
    }
  });

  test('an unrelated budget row does NOT suppress it', () => {
    expect(lodgingCommitted(EV({ lodgingOptions: chosen, budget: [{ label: 'Catering', actual: 900 }] }))).toBe(2200);
  });
});

describe('a stay does not outlive the pick it came from', () => {
  test('nothing chosen derives no stay', () => {
    expect(stayFromPick(EV({ lodgingOptions: [OPT({ status: 'option' })] }))).toBeNull();
  });

  test('the shell withdraws a DERIVED stay but never a typed one', () => {
    // The withdrawal is in HostShellV2's lodging write helper: it clears
    // event.lodging only when the stored name still matches a shortlist option,
    // so a stay the host typed herself is hers and survives.
    const fs = require('fs');
    const path = require('path');
    const shell = fs.readFileSync(path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(shell).toMatch(/const wasDerived = prevLabel &&/);
    expect(shell).toMatch(/if \(wasDerived\) patch\.lodging = \{ \.\.\.cur, hotelName: '', rate: null, url: '' \};/);
  });
});

describe('the parts that were already right — pinned so they stay right', () => {
  test('the cheapest house that cannot hold the group is not the pick', () => {
    const rec = lodgingRecommendation(EV({ lodgingOptions: [
      OPT({ id: 's', label: 'Small', sleeps: 4, totalPrice: 500 }),
      OPT({ id: 'b', label: 'Big', sleeps: 12, totalPrice: 2900 })] }));
    expect(rec.pick.label).toBe('Big');
  });

  test('the backup is never the house already chosen', () => {
    const bu = backupFromRunnerUp(EV({ lodgingOptions: [
      OPT({ id: 'a', label: 'A', status: 'chosen' }),
      OPT({ id: 'b', label: 'B', totalPrice: 2500 })] }));
    expect(bu.name).not.toBe('A');
  });

  test('unknown fees are flagged, never silently treated as zero', () => {
    const o = lodgingIntel(EV({ lodgingOptions: [OPT({ fees: undefined })] })).options[0];
    expect(o.feesKnown).toBe(false);
  });

  test('a guest count of zero never divides by zero', () => {
    const o = lodgingIntel(EV({ guestCount: 0, lodgingOptions: [OPT({ status: 'chosen' })] })).options[0];
    expect(o.perPerson == null || Number.isFinite(o.perPerson)).toBe(true);
  });

  test('the same listing pasted twice is one row', () => {
    const html = '<a href="https://www.airbnb.com/rooms/9?a=1"><img src="https://a0.muscache.com/1.jpg"></a>'
      + '<div>Home in X</div><div>Lake House</div><span>4 beds</span>'
      + '<a href="https://www.airbnb.com/rooms/9?b=2"><img src="https://a0.muscache.com/2.jpg"></a>'
      + '<div>Home in X</div><div>Lake House</div><span>4 beds</span>';
    expect(extractListingCandidates(html).candidates).toHaveLength(1);
  });
});
