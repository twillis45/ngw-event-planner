// ─── Rental-house intelligence proof (host directive 2026-07-28) ─────────────
// Locks the doctrine shape: host-entered facts only, platform derived from the
// URL host, every guidance line source-resolving, arithmetic honest, and the
// share draft carrying the real options verbatim.
const { lodgingIntel, lodgingPlatformFor, lodgingGuidanceSourcesResolve, normalizeLodgingOption } = require('../lodgingIntel');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };

const EV = {
  id: 'ev-l', name: 'Deep Creek Reunion', type: 'Reunion',
  date: iso(60), endDate: iso(63), guestCount: 10,
  lodgingOptions: [
    { id: 'a', label: 'Lakefront A-frame', url: 'https://www.airbnb.com/rooms/12345', sleeps: 12, beds: 5, totalPrice: 2400, cancellationTier: 'moderate' },
    { id: 'b', label: 'The Lodge', url: 'https://www.vrbo.com/987654', sleeps: 8, pricePerNight: 500 },
  ],
};

describe('lodging intelligence', () => {
  test('platform derives from the URL host, never from text', () => {
    expect(lodgingPlatformFor('https://www.airbnb.com/rooms/1')).toBe('airbnb');
    expect(lodgingPlatformFor('https://www.vrbo.com/1')).toBe('vrbo');
    expect(lodgingPlatformFor('https://evil.example.com/airbnb')).toBe('other');
    expect(lodgingPlatformFor('not a url')).toBe(null);
  });

  test('every guidance line resolves its sources in the booking registry', () => {
    const intel = lodgingIntel(EV);
    expect(intel.guidance.length).toBeGreaterThanOrEqual(5);
    expect(lodgingGuidanceSourcesResolve(intel)).toBe(true);
  });

  test('honest arithmetic: fit against the real count, split against typed money', () => {
    const intel = lodgingIntel(EV);
    const a = intel.options.find((o) => o.id === 'a');
    const b = intel.options.find((o) => o.id === 'b');
    expect(a.checks.find((c) => c.key === 'fit').ok).toBe(true);
    expect(b.checks.find((c) => c.key === 'fit').ok).toBe(false);       // sleeps 8 of 10
    expect(a.checks.find((c) => c.key === 'split').text).toMatch(/\$240/); // 2400 / 10
    // per-night option: 500 × 3 nights ÷ 10 = 150, flagged as before-fees
    expect(b.checks.find((c) => c.key === 'split').text).toMatch(/\$150/);
    expect(b.checks.find((c) => c.key === 'split').text).toMatch(/before fees/i);
  });

  test('no typed money, no math; no guest count, no fit verdict', () => {
    const bare = lodgingIntel({ id: 'x', date: iso(10), lodgingOptions: [{ label: 'Mystery house', url: 'https://www.airbnb.com/rooms/9' }] });
    expect(bare.options[0].checks.length).toBe(0);
  });

  test('the share draft carries the options verbatim and the reply ask', () => {
    const { share } = lodgingIntel(EV);
    expect(share.body).toMatch(/Lakefront A-frame/);
    expect(share.body).toMatch(/airbnb\.com\/rooms\/12345/);
    expect(share.body).toMatch(/sleeps 12/);
    // Copy relaid 2026-07-28 once the invite could actually take a pick: the
    // draft now points at the invite block by name instead of vaguely inviting a
    // reply, and says what tapping it does NOT do.
    expect(share.body).toMatch(/tap your pick on the invite/i);
    expect(share.body).toMatch(/not a booking/i);
    expect(share.body).toMatch(/own checkout/i);
  });

  test('roles name the who-does-what the sources make real', () => {
    const { roles } = lodgingIntel(EV);
    expect(roles.map((r) => r.role)).toEqual(['One booker', 'Money lead', 'Arrival checker']);
    expect(roles[2].why).toMatch(/photograph/i);
  });

  test('photoUrl rides only as a pasted https link — never anything else', () => {
    const withPhoto = lodgingIntel({ ...EV, lodgingOptions: [{ ...EV.lodgingOptions[0], photoUrl: 'https://a0.muscache.com/im/pictures/x.jpg' }] });
    expect(withPhoto.options[0].photoUrl).toMatch(/^https:\/\//);
    const bad = lodgingIntel({ ...EV, lodgingOptions: [{ ...EV.lodgingOptions[0], photoUrl: 'javascript:alert(1)' }] });
    expect(bad.options[0].photoUrl).toBe('');
  });

  test('chosen surfaces; empty shortlist stays honest', () => {
    const withChoice = lodgingIntel({ ...EV, lodgingOptions: [{ ...EV.lodgingOptions[0], status: 'chosen' }] });
    expect(withChoice.chosen && withChoice.chosen.id).toBe('a');
    const none = lodgingIntel({ id: 'y', date: iso(5) });
    expect(none.options).toEqual([]);
    expect(none.share.body).toMatch(/No options on the list yet/i);
  });
});

// ─── rosSlotTime (day-of drag → timeslot adoption, host ask 2026-07-28) ──────
const { rosSlotTime } = require('../rosOverlap');
describe('rosSlotTime', () => {
  test('both neighbors: the slot midpoint, on 5-minute grid, inside the slot', () => {
    expect(rosSlotTime('13:00', '15:00')).toBe('14:00');
    expect(rosSlotTime('14:30', '15:00')).toBe('14:45');
  });
  test('no honest room in a tight slot: nothing assigned', () => {
    expect(rosSlotTime('14:00', '14:05')).toBe(null);
  });
  test('one-sided: 15 minutes off the timed neighbor, clamped to the day', () => {
    expect(rosSlotTime('22:00', null)).toBe('22:15');
    expect(rosSlotTime(null, '00:10')).toBe('00:00');
    expect(rosSlotTime('23:50', null)).toBe('23:55');
  });
  test('clockless day stays clockless', () => {
    expect(rosSlotTime(null, null)).toBe(null);
    expect(rosSlotTime('', undefined)).toBe(null);
  });
});

// ─── THE GROUP'S ANSWER COMES HOME (migration 016, applied 2026-07-28) ───────
// Guests pick on the invite; the reply rides the per-guest upsert as
// `lodging_pick` and lands on the roster row as `lodgingPick`. This is a TALLY:
// it informs the host and never picks for them, and silence stays silence.
describe('guest lodging picks', () => {
  const withPicks = (picks) => lodgingIntel({
    ...EV,
    guests: picks.map((p, i) => ({ id: 'g' + i, name: 'G' + i, rsvp: 'Yes', ...(p ? { lodgingPick: p } : {}) })),
  });

  test('no replies reads as silence, never as zero support', () => {
    const i = withPicks([null, null, null]);
    expect(i.voted).toBe(0);
    expect(i.groupSaid).toBe('Nobody has weighed in yet.');
    expect(i.options.every((o) => o.votes === 0)).toBe(true);
  });

  test('a lean is reported with the count, and the call stays the host’s', () => {
    const i = withPicks(['a', 'a', 'b', null]);
    expect(i.voted).toBe(3);
    expect(i.options.find((o) => o.id === 'a').votes).toBe(2);
    expect(i.groupSaid).toMatch(/2 of 3/);
    expect(i.groupSaid).toMatch(/Lakefront A-frame/);
    expect(i.groupSaid).toMatch(/Yours is still the call/);
  });

  test('a tie says tie rather than picking a winner', () => {
    expect(withPicks(['a', 'b']).groupSaid).toMatch(/tie/i);
  });

  test('the tally shows up as a per-option check, in people not percentages', () => {
    const a = withPicks(['a', 'a']).options.find((o) => o.id === 'a');
    expect(a.checks.find((c) => c.key === 'votes').text).toMatch(/2 people prefer this one/);
    expect(JSON.stringify(a.checks)).not.toMatch(/%/);
  });

  test('a pick for an option the host deleted never invents a row', () => {
    const i = withPicks(['ghost-option']);
    expect(i.options.every((o) => o.votes === 0)).toBe(true);
    expect(i.voted).toBe(1);   // they DID answer — we just don't have that option any more
  });
});

// ─── Multiple photos per property (host ask 2026-07-28) ──────────────────────
// Grounded on the repo's OWN real images rather than a placeholder service:
// public/crab-hero.png and public/catfish-hero.png are sourced through the
// documented Wikimedia-Commons public-domain pipeline in lib/artworkMarks.
const { photoList } = require('../lodgingIntel');
const REAL_A = 'https://twillis45.github.io/ngw-event-planner/crab-hero.png';
const REAL_B = 'https://twillis45.github.io/ngw-event-planner/catfish-hero.png';

describe('a property can carry a strip of photos', () => {
  test('an array of https links rides through in order', () => {
    expect(photoList({ photos: [REAL_A, REAL_B] })).toEqual([REAL_A, REAL_B]);
  });

  test('one field holding several pasted links is split — hosts paste in bulk', () => {
    expect(photoList({ photoUrl: `${REAL_A} ${REAL_B}` })).toEqual([REAL_A, REAL_B]);
    expect(photoList({ photos: `${REAL_A},${REAL_B}` })).toEqual([REAL_A, REAL_B]);
  });

  test('the legacy single field still works, and never duplicates', () => {
    expect(photoList({ photoUrl: REAL_A })).toEqual([REAL_A]);
    expect(photoList({ photos: [REAL_A], photoUrl: REAL_A })).toEqual([REAL_A]);
  });

  test('anything that is not an https link is dropped, not rendered', () => {
    expect(photoList({ photos: ['javascript:alert(1)', 'http://x.test/a.png', '', null, REAL_A] })).toEqual([REAL_A]);
    expect(photoList({})).toEqual([]);
    expect(photoList(null)).toEqual([]);
  });

  test('the normalized option exposes the strip and keeps photoUrl as the first', () => {
    const o = normalizeLodgingOption({ id: 'x', url: 'https://www.airbnb.com/rooms/1', photos: [REAL_A, REAL_B] });
    expect(o.photos).toEqual([REAL_A, REAL_B]);
    expect(o.photoUrl).toBe(REAL_A);
  });
});

// ─── ONE PASTE, EVERY PHOTO (host ask 2026-07-28) ────────────────────────────
// "can the app do the several link pasting?" — yes, and without touching the
// never-build line: the app never contacts the platform. The HOST copies the
// gallery they are looking at; we parse what they pasted. Same sanctioned shape
// as the vendor-reply parser ("apply reviewed extraction").
//
// The fixture is REAL markup from a live Vrbo listing gallery (media.vrbo.com
// lodging paths, captured 2026-07-28), not an invented sample.
const { extractPhotoUrls } = require('../lodgingIntel');
const V = 'https://media.vrbo.com/lodging/21000000/20260000/20256300/20256226';

describe('extractPhotoUrls — the host pastes once', () => {
  test('a copied gallery yields every image, in order, deduped', () => {
    const pastedHtml = `
      <div><img alt="A two-story building with a swimming pool" src="${V}/dc3f560c.jpg"/>
      <img alt="Balcony" src="${V}/367aec85.jpg?impolicy=resizecrop&rw=1200"/>
      <img alt="Kitchen" src="${V}/d43597c4.jpg"/>
      <img alt="dupe" src="${V}/dc3f560c.jpg"/></div>`;
    expect(extractPhotoUrls(pastedHtml)).toEqual([
      `${V}/dc3f560c.jpg`,
      `${V}/367aec85.jpg?impolicy=resizecrop&rw=1200`,
      `${V}/d43597c4.jpg`,
    ]);
  });

  test('srcset candidates and background-image both come through', () => {
    expect(extractPhotoUrls(`<img srcset="${V}/a.jpg 400w, ${V}/b.jpg 800w">`))
      .toEqual([`${V}/a.jpg`, `${V}/b.jpg`]);
    expect(extractPhotoUrls(`<div style="background-image:url('${V}/c.jpg')">`))
      .toEqual([`${V}/c.jpg`]);
  });

  test('a plain-text column of links works for the host who pasted those instead', () => {
    expect(extractPhotoUrls(`${V}/a.jpg\n${V}/b.webp`)).toEqual([`${V}/a.jpg`, `${V}/b.webp`]);
  });

  test('page furniture is not a property photo', () => {
    const junk = `<img src="https://www.vrbo.com/static/logo.svg"><a href="https://www.vrbo.com/help">Help</a>
                  <img src="http://insecure.test/a.jpg"><img src="${V}/real.jpg">`;
    expect(extractPhotoUrls(junk)).toEqual([`${V}/real.jpg`]);   // no svg, no page link, no http
  });

  test('nothing in, nothing out — never a fabricated photo', () => {
    expect(extractPhotoUrls('')).toEqual([]);
    expect(extractPhotoUrls(null)).toEqual([]);
    expect(extractPhotoUrls('just some words about a house')).toEqual([]);
  });
});
