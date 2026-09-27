// ─── A CAP IS NOT A PRICE, AND THE TABLE MUST NOT DRIFT FROM GSA ───────────
//
// The property that matters here is NOT "lodging gets a number". It is that
// the module never lets a federal reimbursement ceiling be read as what a
// room costs, and never produces a figure for a place GSA does not cover.
// A confident $110 for Maui is the failure mode, exactly as a silent 1.0 is
// geoCostIndex's.
//
// GSA's own words, which the basis strings must keep carrying: "The lodging
// per diem rates are a maximum amount; the traveler only receives actual
// lodging costs up to that maximum rate." Their rule permitting up to 300%
// of per diem when rooms cannot be had at the rate is the concession that
// the cap sits below obtainable price often enough to need one.
import {
  GSA_LODGING, STANDARD_CONUS_LODGING, GSA_FISCAL_YEAR,
} from '../gsaLodgingRates';
import { lodgingCapFor, lodgingCapNote } from '../lodgingRateIndex';

describe('the table is what GSA published', () => {
  test('the shape measured at derivation still holds', () => {
    // 296 destinations / 649 source rows / 48 states + DC / $110–$483,
    // measured from FY2026_PerDiemMasterRatesFile.xlsx on 2026-09-27. If a
    // regeneration moves these, somebody has to look at the new file rather
    // than at this number.
    expect(GSA_LODGING).toHaveLength(296);
    const states = new Set(GSA_LODGING.map((r) => r[0]));
    expect(states.size).toBe(48);
    expect(states.has('DC')).toBe(true);
    // North Dakota has no listed locality — the reason CONUS is declared in
    // the index rather than inferred from these rows.
    expect(states.has('ND')).toBe(false);
    expect(STANDARD_CONUS_LODGING).toBe(110);
    expect(GSA_FISCAL_YEAR).toBe(2026);
  });

  test('every rate is a plausible nightly dollar figure, and no row is malformed', () => {
    const bad = [];
    let seasonal = 0;
    for (const [st, city, val] of GSA_LODGING) {
      if (!/^[A-Z]{2}$/.test(st)) bad.push(`state ${st}`);
      if (!city || typeof city !== 'string') bad.push(`city in ${st}`);
      if (typeof val === 'number') {
        if (!(val >= 110 && val <= 483)) bad.push(`${city}, ${st} = ${val}`);
      } else if (Array.isArray(val)) {
        seasonal += 1;
        for (const [b, e, r] of val) {
          if (!(b >= 101 && b <= 1231)) bad.push(`${city} begin ${b}`);
          if (!(e >= 101 && e <= 1231)) bad.push(`${city} end ${e}`);
          if (!(r >= 110 && r <= 483)) bad.push(`${city} rate ${r}`);
        }
      } else bad.push(`${city}, ${st} value type`);
    }
    expect(bad).toEqual([]);
    expect(seasonal).toBe(157);
  });

  test('the seasonal bands cover the whole year for every seasonal locality', () => {
    // A gap would make lodgingCapFor return null for a real CONUS date,
    // which would read as "we do not cover this place" and be false.
    const gaps = [];
    for (const [st, city, val] of GSA_LODGING) {
      if (!Array.isArray(val)) continue;
      for (let mo = 1; mo <= 12; mo += 1) {
        for (const d of [1, 15, 28]) {
          const when = mo * 100 + d;
          const hit = val.some(([b, e]) => (b <= e ? (when >= b && when <= e) : (when >= b || when <= e)));
          if (!hit) gaps.push(`${city}, ${st} @ ${when}`);
        }
      }
    }
    expect(gaps).toEqual([]);
  });
});

describe('a cap is a cap', () => {
  test('a listed flat locality answers with GSA’s figure', () => {
    const c = lodgingCapFor('Birmingham', 'AL', '2027-05-10');
    expect(c).toMatchObject({ capPerNight: 126, standard: false, listed: true, season: null });
  });

  test('a seasonal locality answers for the DATE, not for the year', () => {
    // Gulf Shores is the worked example in the data file's header: the same
    // town is $134 in February and $216 in July. Reading it without a date
    // is how a July party gets a February number with a federal citation on
    // it, so the date is required rather than defaulted.
    expect(lodgingCapFor('Gulf Shores', 'AL', '2027-02-14').capPerNight).toBe(134);
    expect(lodgingCapFor('Gulf Shores', 'AL', '2027-07-04').capPerNight).toBe(216);
    expect(lodgingCapFor('Gulf Shores', 'AL', '2027-04-01').capPerNight).toBe(163);
    expect(lodgingCapFor('Gulf Shores', 'AL', null)).toBeNull();
    expect(lodgingCapFor('Gulf Shores', 'AL', 'sometime in July')).toBeNull();
  });

  test('SPOT-CHECKED against the source file, not against itself', () => {
    // Read out of FY2026_PerDiemMasterRatesFile.xlsx by hand on 2026-09-27
    // and pinned here, so a bad regeneration fails rather than quietly
    // shipping a table that is internally consistent and wrong.
    //
    //   NM Santa Fe    Oct 1–Oct 31 $167 · Nov 1–Dec 31 $142
    //                  Jan 1–Feb 28 $122 · Mar 1–Sep 30 $167
    //   SC Charleston  Oct 1–Oct 31 $244 · Nov 1–Feb 28 $218
    //                  Mar 1–May 31 $288 · Jun 1–Sep 30 $244
    expect(lodgingCapFor('Santa Fe', 'NM', '2027-10-15').capPerNight).toBe(167);
    expect(lodgingCapFor('Santa Fe', 'NM', '2027-12-01').capPerNight).toBe(142);
    expect(lodgingCapFor('Santa Fe', 'NM', '2027-01-31').capPerNight).toBe(122);
    expect(lodgingCapFor('Santa Fe', 'NM', '2027-06-17').capPerNight).toBe(167);
    expect(lodgingCapFor('Charleston', 'SC', '2027-10-15').capPerNight).toBe(244);
    expect(lodgingCapFor('Charleston', 'SC', '2027-04-10').capPerNight).toBe(288);
    expect(lodgingCapFor('Charleston', 'SC', '2027-01-05').capPerNight).toBe(218);
  });

  test('THE SCALE OF THE GAP, recorded rather than resolved', () => {
    // lodgingFloor.js measures the Santa Fe 80th: ten guests, four nights,
    // and the six real listings the app handed that host ran $2,180–$9,040
    // for the stay, i.e. $545–$2,260 a night for the group. GSA caps Santa
    // Fe at $167 a night PER ROOM in June.
    //
    // Those units do not divide into each other — a party does not split
    // into rooms by arithmetic, which is exactly what lodgingIntel refuses
    // to guess — so this is not a correction factor and must never be used
    // as one. It is here so the number's smallness is on the record beside
    // the number.
    const june = lodgingCapFor('Santa Fe', 'NM', '2027-06-17');
    expect(june.capPerNight).toBe(167);
    expect(june.capPerNight * 4).toBeLessThan(2180);   // one room, four nights
  });

  test('a band that wraps the new year is still one band', () => {
    // Gulf Shores runs 1001–0228. A naive `>= begin && <= end` returns
    // nothing for either December or January.
    expect(lodgingCapFor('Gulf Shores', 'AL', '2026-12-20').capPerNight).toBe(134);
    expect(lodgingCapFor('Gulf Shores', 'AL', '2027-01-20').capPerNight).toBe(134);
  });

  test('an unlisted CONUS town gets the fallback and SAYS it is the fallback', () => {
    const c = lodgingCapFor('Cumberland Gap', 'TN', '2027-05-10');
    expect(c.capPerNight).toBe(110);
    expect(c.standard).toBe(true);
    expect(c.listed).toBe(false);
    expect(c.basis).toMatch(/not separately listed/);
    // North Dakota has no listed locality at all and must still answer.
    expect(lodgingCapFor('Fargo', 'ND', '2027-05-10')).toMatchObject({
      capPerNight: 110, standard: true,
    });
  });

  test('the city is matched however the host typed it', () => {
    for (const c of ['Birmingham', 'birmingham', '  BIRMINGHAM  ']) {
      expect(lodgingCapFor(c, 'al', '2027-05-10').capPerNight).toBe(126);
    }
  });
});

describe('what it refuses', () => {
  test('outside CONUS there is no number, because GSA does not set one', () => {
    // Alaska, Hawaii and the territories are DoD's file; foreign is State's.
    // Different publishers, so a fallback here would be a fabrication.
    for (const st of ['HI', 'AK', 'PR', 'GU', 'VI', 'AS', 'MP']) {
      expect({ [st]: lodgingCapFor('Anywhere', st, '2027-05-10') }).toEqual({ [st]: null });
    }
  });

  test('no state, no number — and a city is never enough on its own', () => {
    for (const s of [null, undefined, '', '  ', 'Texas', 'TEX', 7, {}]) {
      expect({ [String(s)]: lodgingCapFor('Austin', s, '2027-05-10') })
        .toEqual({ [String(s)]: null });
    }
  });
});

describe('the words that reach a host', () => {
  test('every basis says maximum, and none says price, estimate or average', () => {
    const samples = [
      lodgingCapFor('Birmingham', 'AL', '2027-05-10'),
      lodgingCapFor('Gulf Shores', 'AL', '2027-07-04'),
      lodgingCapFor('Cumberland Gap', 'TN', '2027-05-10'),
    ];
    for (const c of samples) {
      expect(c.basis).toMatch(/maximum/i);
      expect(c.basis).toMatch(/not a market price/i);
      // The words that would turn a ceiling into a forecast.
      expect(c.basis).not.toMatch(/\b(estimate|average|typical|expect)\b/i);
    }
  });

  test('the host line calls it a ceiling and fits a phone', () => {
    const n = lodgingCapNote('Gulf Shores', 'AL', '2027-07-04');
    expect(n).toMatch(/ceiling, not what rooms go for/);
    expect(n).toContain('$216');
    // geoCostIndex pins its note to a 390px phone; the same bar applies.
    expect(n.length).toBeLessThanOrEqual(120);
    expect(lodgingCapNote('Anywhere', 'HI', '2027-05-10')).toBeNull();
  });

  test('the unlisted line does not name the town as though the rate were its own', () => {
    const n = lodgingCapNote('Cumberland Gap', 'TN', '2027-05-10');
    expect(n).toMatch(/towns like this one/);
    expect(n).not.toMatch(/Cumberland Gap/);
  });
});
