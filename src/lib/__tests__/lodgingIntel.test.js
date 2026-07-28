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

// ─── WHICH ONE THE PLAN WOULD PICK (host directive 2026-07-28) ───────────────
// "intelligence should derive a rental choice based on our event choices and
// criteria." A PROPOSAL with its reasoning shown — never a decision, never a
// write. Scores only on facts the host typed and facts the event already knows.
const { lodgingRecommendation } = require('../lodgingIntel');

const evWith = (opts, extra) => ({
  id: 'r', name: 'Deep Creek Reunion', type: 'Reunion',
  date: iso(60), endDate: iso(63), guestCount: 10, lodgingOptions: opts, ...extra,
});

describe('lodgingRecommendation', () => {
  test('a house that cannot hold the group is not a cheap option, it is the wrong house', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'small', label: 'Cheap Cabin', url: 'https://www.airbnb.com/rooms/1', sleeps: 6, totalPrice: 900 },
      { id: 'right', label: 'Lake House', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400 },
    ]));
    expect(rec.pick.id).toBe('right');                    // not the cheaper one
    expect(rec.why.join(' ')).toMatch(/sleeps 12/);
  });

  test('among houses that fit, the cheaper one wins and says so', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'a', label: 'A', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 3200 },
      { id: 'b', label: 'B', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400 },
    ]));
    expect(rec.pick.id).toBe('b');
    expect(rec.why.join(' ')).toMatch(/least expensive/);
  });

  test('the host budget is a real criterion, and going over it is named in dollars', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'over', label: 'Over', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 5000 },
      { id: 'in', label: 'In', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400 },
    ], { totalBudget: 3000 }));
    expect(rec.pick.id).toBe('in');
    expect(rec.scores.find((s) => s.id === 'over').reasons.join(' ')).toMatch(/\$2,000 over your budget/);
  });

  test('a hard cancellation is weighed against a group booked months out', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'strict', label: 'Strict', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 2400, cancellationTier: 'strict' },
      { id: 'flex', label: 'Flex', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400, cancellationTier: 'flexible' },
    ]));
    expect(rec.pick.id).toBe('flex');
    expect(rec.scores.find((s) => s.id === 'strict').reasons.join(' ')).toMatch(/total loss/);
  });

  test('who is coming counts — step-free only when the roster actually asked', () => {
    const opts = [
      { id: 'stairs', label: 'Stairs', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 2400 },
      { id: 'flat', label: 'Flat', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400, notes: 'Single level, no stairs' },
    ];
    const withNeed = lodgingRecommendation(evWith(opts, {
      guests: [{ id: 'g1', name: 'A', rsvp: 'Yes', needs: 'uses a wheelchair' }],
    }));
    expect(withNeed.pick.id).toBe('flat');
    expect(withNeed.why.join(' ')).toMatch(/step-free/);
    // …and with nobody asking, that criterion stays silent rather than inventing a preference
    const noNeed = lodgingRecommendation(evWith(opts));
    expect(noNeed.tie).toBe(true);
  });

  test('a tie says tie — it never picks arbitrarily', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'a', label: 'A', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 2400 },
      { id: 'b', label: 'B', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400 },
    ]));
    expect(rec.tie).toBe(true);
    expect(rec.pick).toBe(null);
  });

  test('it says out loud what it could NOT weigh', () => {
    const rec = lodgingRecommendation(evWith([
      { id: 'a', label: 'A', url: 'https://www.airbnb.com/rooms/1', sleeps: 12 },
      { id: 'b', label: 'B', url: 'https://www.airbnb.com/rooms/2', sleeps: 14 },
    ]));
    expect(rec.unweighed.join(' ')).toMatch(/what any of them cost/);
    expect(rec.unweighed.join(' ')).toMatch(/how cancellation works/);
  });

  test('one option is not a choice', () => {
    expect(lodgingRecommendation(evWith([{ id: 'a', label: 'A', url: 'https://www.airbnb.com/rooms/1', sleeps: 12 }]))).toBe(null);
    expect(lodgingRecommendation(evWith([]))).toBe(null);
  });
});

// ─── GO LOOK, PRE-FILTERED (host question 2026-07-28) ────────────────────────
// "can the app use the event to find our suggest say a top 3 compatible options
// from airbnb or vrbo?" — not by searching them (live rental API is never-build,
// and the alternative is scraping). It hands over a search already filtered by
// everything the event knows. Parameter names verified against both platforms'
// live search pages on 2026-07-28, not invented.
const { lodgingSearchLinks } = require('../lodgingIntel');

describe('lodgingSearchLinks', () => {
  const EV2 = { id: 's', type: 'Reunion', date: '2026-09-11', endDate: '2026-09-13',
    venueCity: 'Deep Creek Lake', venueState: 'Maryland', guestCount: 10, totalBudget: 3000 };

  test('the event fills the search box on both platforms', () => {
    const [ab, vr] = lodgingSearchLinks(EV2);
    expect(ab.href).toMatch(/airbnb\.com\/s\/.*Deep-Creek-Lake.*Maryland.*\/homes/);
    expect(ab.href).toMatch(/checkin=2026-09-11/);
    expect(ab.href).toMatch(/checkout=2026-09-13/);
    expect(ab.href).toMatch(/adults=10/);
    expect(ab.href).toMatch(/price_max=3000/);
    expect(vr.href).toMatch(/vrbo\.com\/search\?/);
    expect(vr.href).toMatch(/destination=Deep\+Creek\+Lake/);
    expect(vr.href).toMatch(/startDate=2026-09-11/);
    expect(vr.href).toMatch(/adults=10/);
  });

  test('it says what it applied, so the host can see it is their own answers', () => {
    const [ab] = lodgingSearchLinks(EV2);
    expect(ab.applied.join(' · ')).toMatch(/Deep Creek Lake, Maryland/);
    expect(ab.applied.join(' · ')).toMatch(/10 guests/);
    expect(ab.applied.join(' · ')).toMatch(/under \$3,000/);
  });

  test('a fact the host never gave is simply left out of the search', () => {
    const [ab] = lodgingSearchLinks({ ...EV2, totalBudget: 0, guestCount: 0, guests: [] });
    expect(ab.href).not.toMatch(/price_max/);
    expect(ab.href).not.toMatch(/adults/);
    expect(ab.applied.join(' ')).not.toMatch(/under \$/);
  });

  test('no town, no search — it never guesses where the event is', () => {
    expect(lodgingSearchLinks({ id: 'x', type: 'Reunion', date: '2026-09-11' })).toEqual([]);
    expect(lodgingSearchLinks(null)).toEqual([]);
  });

  test('a single-day event still produces a real checkout date', () => {
    const [ab] = lodgingSearchLinks({ ...EV2, endDate: null });
    expect(ab.href).toMatch(/checkin=2026-09-11/);
    expect(ab.href).toMatch(/checkout=2026-09-11/);
  });
});

// ─── THE HOST'S OWN REQUIREMENTS (host directive 2026-07-28) ─────────────────
// "have the host input other amenities or things that are requirements for the
// search." These are the only criterion the host states outright rather than us
// inferring it, so they weigh heaviest — and the ones with a VERIFIED platform
// filter also ride the search URL. A filter we cannot prove is not sent.
const { LODGING_MUST_HAVES, mustHavesFor } = require('../lodgingIntel');

describe('must-have requirements', () => {
  const base = { id: 'm', type: 'Reunion', date: '2026-09-11', endDate: '2026-09-13',
    venueCity: 'Deep Creek Lake', venueState: 'Maryland', guestCount: 10 };

  test('only verified platform filters reach the search URL', () => {
    const [ab] = lodgingSearchLinks({ ...base, lodgingMustHaves: ['hottub', 'pool', 'pets', 'bigtable'] });
    // verified live 2026-07-28: amenities[]=25 hot tub, []=7 pool, pets=1
    expect(ab.href).toMatch(/amenities(%5B%5D|\[\])=25/);
    expect(ab.href).toMatch(/amenities(%5B%5D|\[\])=7/);
    expect(ab.href).toMatch(/pets=1/);
    // 'bigtable' has no proven filter param — it must NOT be faked into the URL
    expect(ab.href).not.toMatch(/bigtable/);
  });

  test('the search says which requirements it actually applied', () => {
    const [ab] = lodgingSearchLinks({ ...base, lodgingMustHaves: ['hottub', 'bigtable'] });
    expect(ab.applied.join(' · ')).toMatch(/hot tub/);
    expect(ab.applied.join(' · ')).not.toMatch(/table for everyone/i);
  });

  test('a requirement the host set decides the ranking', () => {
    const opts = [
      { id: 'plain', label: 'Plain House', url: 'https://www.airbnb.com/rooms/1', sleeps: 12, totalPrice: 2000 },
      { id: 'tub', label: 'Hot Tub House', url: 'https://www.airbnb.com/rooms/2', sleeps: 12, totalPrice: 2400, notes: 'Hot tub on the deck' },
    ];
    // without the requirement, the cheaper one wins
    expect(lodgingRecommendation({ ...base, lodgingOptions: opts }).pick.id).toBe('plain');
    // with it, the one that meets it wins and says so
    const rec = lodgingRecommendation({ ...base, lodgingOptions: opts, lodgingMustHaves: ['hottub'] });
    expect(rec.pick.id).toBe('tub');
    expect(rec.why.join(' ')).toMatch(/has hot tub/);
    expect(rec.scores.find((x) => x.id === 'plain').reasons.join(' ')).toMatch(/doesn't say it has hot tub/);
  });

  test('junk requirement ids are dropped, never stored as a criterion', () => {
    expect(mustHavesFor({ lodgingMustHaves: ['hottub', 'not-a-thing', null] }).map((m) => m.id)).toEqual(['hottub']);
    expect(mustHavesFor({})).toEqual([]);
  });

  test('every requirement in the vocabulary is usable', () => {
    for (const m of LODGING_MUST_HAVES) {
      expect(m.id).toMatch(/^[a-z]+$/);
      expect(String(m.label).length).toBeGreaterThan(2);
      expect(m.match instanceof RegExp).toBe(true);
    }
  });
});

// ─── FEES ARE PART OF THE PRICE (host directive 2026-07-28) ──────────────────
// "include fees in rate for the per person cost. what would be the total cost
// for each" — cleaning, service and taxes turn an $1,800 listing into a $2,300
// bill, so splitting the sticker price understates what each person owes.
describe('the all-in number', () => {
  const ev = (opts) => ({ id: 'f', type: 'Reunion', date: iso(60), endDate: iso(63), guestCount: 10, lodgingOptions: opts });

  test('fees are added to the total and the split runs off the real number', () => {
    const i = lodgingIntel(ev([{ id: 'a', label: 'A', url: 'https://www.vrbo.com/1', sleeps: 12, totalPrice: 1800, fees: 500 }]));
    const o = i.options[0];
    expect(o.allIn).toBe(2300);
    expect(o.checks.find((c) => c.key === 'total').text).toMatch(/\$2,300 all in — \$1,800 plus \$500 in fees/);
    expect(o.checks.find((c) => c.key === 'split').text).toMatch(/\$230 a person/);
    expect(o.checks.find((c) => c.key === 'split').text).toMatch(/fees included/);
  });

  test('no fees entered says BEFORE fees rather than pretending', () => {
    const i = lodgingIntel(ev([{ id: 'a', label: 'A', url: 'https://www.vrbo.com/1', sleeps: 12, totalPrice: 1800 }]));
    const o = i.options[0];
    expect(o.allIn).toBe(1800);
    expect(o.feesKnown).toBe(false);
    expect(o.checks.find((c) => c.key === 'total').text).toMatch(/before fees/);
    expect(o.checks.find((c) => c.key === 'split').text).toMatch(/before fees/);
  });

  test('the cheaper sticker is not the cheaper house once fees land', () => {
    const rec = lodgingRecommendation(ev([
      { id: 'sticker', label: 'Cheap Sticker', url: 'https://www.vrbo.com/1', sleeps: 12, totalPrice: 1800, fees: 900 },
      { id: 'honest', label: 'Honest Total', url: 'https://www.vrbo.com/2', sleeps: 12, totalPrice: 2400, fees: 100 },
    ]));
    expect(rec.pick.id).toBe('honest');           // 2,500 all in beats 2,700 all in
    expect(rec.why.join(' ')).toMatch(/least expensive/);
  });

  test('a nightly rate plus fees still produces a real all-in total', () => {
    const i = lodgingIntel(ev([{ id: 'a', label: 'A', url: 'https://www.vrbo.com/1', sleeps: 12, pricePerNight: 500, fees: 300 }]));
    expect(i.options[0].allIn).toBe(500 * 3 + 300);
  });
});

// ─── ONE PASTE FILLS THE FORM (host question 2026-07-28) ────────────────────
// "if the app can pull the deep links does the host need to input the urls for
// property and gallery?" — the deep link only goes OUT and fetches nothing, so
// the host is still the one thing that crosses back. What we can do is make the
// crossing cost ONE action: a copied listing page carries its canonical link and
// its title in the same payload as the images.
//
// Fixture is the real shape of the live Vrbo listing open during this session.
const { extractListingMeta } = require('../lodgingIntel');

describe('extractListingMeta', () => {
  const PAGE = `
    <head>
      <link rel="canonical" href="https://www.vrbo.com/987654?pwaThumbnailDialog=thumbnail-gallery"/>
      <meta property="og:title" content="Gulf View Home with Private Pool! Large Families &amp; Reunions Welcome. - Pensacola Beach | Vrbo"/>
      <title>Gulf View Home with Private Pool! - Pensacola Beach | Vrbo</title>
    </head>`;

  test('the canonical link comes through, query junk stripped', () => {
    expect(extractListingMeta(PAGE).url).toBe('https://www.vrbo.com/987654');
  });

  test('the name comes through with the platform suffix trimmed', () => {
    const t = extractListingMeta(PAGE).title;
    expect(t).toMatch(/^Gulf View Home with Private Pool/);
    expect(t).not.toMatch(/Vrbo/);
    expect(t).not.toMatch(/Pensacola Beach \|/);
  });

  test('with no metadata it finds a property link among plain text', () => {
    expect(extractListingMeta('look at https://www.airbnb.com/rooms/12345 and https://www.airbnb.com/help/x').url)
      .toBe('https://www.airbnb.com/rooms/12345');
  });

  test('a page with nothing usable returns empties, never a guess', () => {
    expect(extractListingMeta('just some words')).toEqual({ url: '', title: '' });
    expect(extractListingMeta('')).toEqual({ url: '', title: '' });
    expect(extractListingMeta(null)).toEqual({ url: '', title: '' });
  });

  test('a non-https link is never accepted as the listing', () => {
    expect(extractListingMeta('http://www.vrbo.com/987654').url).toBe('');
  });
});
