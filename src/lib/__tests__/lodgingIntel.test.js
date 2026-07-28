// ─── Rental-house intelligence proof (host directive 2026-07-28) ─────────────
// Locks the doctrine shape: host-entered facts only, platform derived from the
// URL host, every guidance line source-resolving, arithmetic honest, and the
// share draft carrying the real options verbatim.
const { lodgingIntel, lodgingPlatformFor, lodgingGuidanceSourcesResolve } = require('../lodgingIntel');

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
    expect(share.body).toMatch(/which works for you/i);
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
