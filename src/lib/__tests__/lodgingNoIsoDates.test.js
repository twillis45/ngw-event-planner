// ─── NO ISO DATE REACHES A HOST ON THE LODGING SURFACE ─────────────────────
//
// Caught by DRIVING the sheet on a phone (2026-08-03), not by any gate.
//
// `lodgingSearchBlocked` had already fixed this once — its own comment records
// it: "Host language, not ISO. The first version printed '2028-06-17 to
// 2028-06-21' at a host who has never typed a date that way." But the fix was
// applied at that ONE call site. `lodgingSearchLinks` built its `said[]`
// summary straight from the ISO slices, so the line directly under the search
// doors still read "Santa Fe, NM · 2028-06-17 to 2028-06-21 · 10 guests".
//
// A fix applied at one call site is not a fix applied to the class. This gate
// covers BOTH producers, so the next one cannot regress alone.
const { lodgingSearchLinks, lodgingSearchBlocked, niceDay } = require('../lodgingIntel');

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;

const evt = (over) => ({
  id: 'ev-iso', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21',
  isDestination: true, venueCity: 'Santa Fe', venueState: 'NM',
  guestCount: 10, budget: [], vendors: [], guests: [],
  ...over,
});

describe('the lodging surface never prints an ISO date', () => {
  it('formats a day the way a host would say it', () => {
    expect(niceDay('2028-06-17')).toBe('Jun 17');
    expect(ISO.test(niceDay('2028-06-17'))).toBe(false);
  });

  // EVERY host-readable field on EVERY link, not just `applied`. The first cut
  // of this gate checked `applied` alone and shipped — the live sheet then
  // showed "Vrbo opens at its own search — put in Santa Fe, NM · 2028-06-17 to
  // 2028-06-21", because `criteria` is a third producer of the same string.
  // Whitelisting the one field that carries ISO by necessity (`href`) and
  // sweeping the rest is what makes this cover the class.
  it('keeps ISO out of every host-readable field on every link', () => {
    const links = lodgingSearchLinks(evt());
    expect(links.length).toBeGreaterThan(0);
    const MACHINE = new Set(['href', 'id']);
    for (const l of links) {
      for (const [k, v] of Object.entries(l)) {
        if (MACHINE.has(k)) continue;
        const text = Array.isArray(v) ? v.join(' · ') : String(v == null ? '' : v);
        expect(`${l.id}.${k}: ${text}`).not.toMatch(ISO);
      }
      const summary = (l.applied || []).join(' · ');
      expect(summary).toMatch(/Jun 17/);
      expect(summary).toMatch(/Jun 21/);
    }
  });

  it('keeps ISO out of the blocked state’s detail', () => {
    // no town -> blocked, and it names what is already in hand
    const b = lodgingSearchBlocked(evt({ venueCity: '', venueState: '', venue: '' }));
    expect(b).toBeTruthy();
    expect(ISO.test(String(b.detail))).toBe(false);
    expect(String(b.detail)).toMatch(/Jun 17/);
    // ONE SPAN, ONE DASH. Walking the workflow end to end showed this producer
    // rendering "Jun 17-Jun 21" while lodgingSearchLinks — the very next screen
    // — rendered "Jun 17–Jun 21". Same span, two characters.
    expect(String(b.detail)).toMatch(/Jun 17–Jun 21/);
  });

  it('a platform PARAMETER may carry ISO — the platform parses it', () => {
    // The guard is about what a host READS. Airbnb takes ISO check-in params;
    // stripping those would break the handoff for no gain.
    const links = lodgingSearchLinks(evt());
    const airbnb = links.find((l) => l.id === 'airbnb');
    expect(airbnb.href).toMatch(/checkin=2028-06-17/);
  });

  it('but a SEARCH QUERY inside an href is prose the host reads', () => {
    // Google echoes ?q= straight into its own search box, so this string is
    // host-facing even though it travels in a URL. The href exemption covers
    // parameters a platform parses, not prose that rides along inside one.
    const hotels = lodgingSearchLinks(evt()).find((l) => l.id === 'hotels');
    const q = decodeURIComponent((hotels.href.split('?q=')[1] || ''));
    expect(q).toMatch(/hotels in/);
    expect(q).toMatch(/Jun 17/);
    expect(ISO.test(q)).toBe(false);
  });
});
