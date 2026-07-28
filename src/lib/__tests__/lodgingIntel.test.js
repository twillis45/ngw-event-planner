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

  test('chosen surfaces; empty shortlist stays honest', () => {
    const withChoice = lodgingIntel({ ...EV, lodgingOptions: [{ ...EV.lodgingOptions[0], status: 'chosen' }] });
    expect(withChoice.chosen && withChoice.chosen.id).toBe('a');
    const none = lodgingIntel({ id: 'y', date: iso(5) });
    expect(none.options).toEqual([]);
    expect(none.share.body).toMatch(/No options on the list yet/i);
  });
});
