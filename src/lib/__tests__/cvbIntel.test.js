// ─── Visitors-bureau intelligence proof (host directive 2026-07-28) ──────────
// Locks the doctrine shape: contact is host-entered (never invented), every ask
// carries resolving sources + an honestly-scoped find link, the room-block ask
// is gated on a hotel-shaped group, and copy stays jargon-free.
const { cvbIntelFor, cvbAskSourcesResolve, normalizeCvbContact } = require('../cvbIntel');

const EV = {
  id: 'ev-c', name: 'Deep Creek Reunion', type: 'Reunion',
  venueCity: 'McHenry', venueState: 'MD', guestCount: 10,
};

describe('cvb intelligence', () => {
  test('every ask resolves its sources in the destination registry', () => {
    const intel = cvbIntelFor(EV);
    expect(intel.asks.length).toBeGreaterThanOrEqual(3);
    expect(cvbAskSourcesResolve(intel)).toBe(true);
  });

  test('find links are scoped to the destination city', () => {
    const intel = cvbIntelFor(EV);
    expect(intel.finder.href).toMatch(/McHenry/);
    expect(intel.contactFinder.href).toMatch(/contact/);
    for (const a of intel.asks) expect(a.href).toMatch(/McHenry%2C%20MD|McHenry.*MD/);
  });

  test('room-block ask appears for a hotel-shaped group, drops when a rental is chosen', () => {
    expect(cvbIntelFor(EV).asks.some((a) => a.key === 'rooms')).toBe(true);
    const housed = { ...EV, lodgingOptions: [{ id: 'a', url: 'https://www.airbnb.com/rooms/1', status: 'chosen' }] };
    expect(cvbIntelFor(housed).asks.some((a) => a.key === 'rooms')).toBe(false);
    const tiny = { ...EV, guestCount: 4 };
    expect(cvbIntelFor(tiny).asks.some((a) => a.key === 'rooms')).toBe(false);
  });

  test('no hospitality jargon in host copy', () => {
    const intel = cvbIntelFor(EV);
    const all = intel.asks.map((a) => a.label + ' ' + a.why).join(' ');
    expect(all).not.toMatch(/attrition|courtesy block|contracted/i);
  });

  test('contact is host-entered: absent stays null, entered yields real links', () => {
    expect(cvbIntelFor(EV).contact).toBe(null);
    const withContact = cvbIntelFor({ ...EV, cvb: { name: 'Garrett County CVB', phone: '(301) 555-0100', url: 'visitdeepcreek.com', email: 'info@visitdeepcreek.com' } });
    expect(withContact.contact.telHref).toBe('tel:3015550100');
    expect(withContact.contact.siteHref).toBe('https://visitdeepcreek.com');
    expect(withContact.contact.mailHref).toBe('mailto:info@visitdeepcreek.com');
  });

  test('junk contact never becomes a link', () => {
    const c = normalizeCvbContact({ phone: 'call them', url: 'not a url', email: 'nope' });
    expect(c.telHref).toBe(null);
    expect(c.mailHref).toBe(null);
    expect(c.siteHref).toBe(null); // https:// is prefixed only for host-shaped text
    expect(normalizeCvbContact({ url: 'visitdeepcreek.com' }).siteHref).toBe('https://visitdeepcreek.com');
  });
});
