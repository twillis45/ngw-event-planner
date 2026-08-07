import {
  recordContact, contactState, silentVendors, uncontactedVendors,
  SILENCE_DAYS, CONTACT_SOURCES,
} from '../vendorContact';

// The engine side of this wire (vendorAccountability/derive.js:187) has read
// `lastContactedAt` since it was written, and NOTHING has ever written it — so
// its staleness penalty could not fire for any host, ever. These tests pin the
// intake half, and specifically pin the honesty rules, because the failure mode
// here is not a crash. It is the app saying something about a vendor that is not
// true.

const DAY = 86400000;
const ago = (d, from = Date.now()) => new Date(from - d * DAY).toISOString();
const NOW = new Date('2026-08-07T12:00:00Z');
const daysBefore = (d) => new Date(NOW.getTime() - d * DAY).toISOString();

describe('recordContact — records what the HOST did, never a send', () => {
  it('stamps an ISO time and defaults the source to host-logged', () => {
    const p = recordContact();
    expect(typeof p.lastContactedAt).toBe('string');
    expect(new Date(p.lastContactedAt).getTime()).not.toBeNaN();
    expect(p.lastContactSource).toBe('host-logged');
  });

  it('accepts the declared sources', () => {
    CONTACT_SOURCES.forEach((s) => {
      expect(recordContact({ source: s }).lastContactSource).toBe(s);
    });
  });

  it('NEVER accepts a "sent" source — the app cannot send', () => {
    // The whole ruling rests on this. A field stamped by a Send button that only
    // opened a mail client would be a lie. If sending ever ships, this test is
    // the thing that must be deliberately changed.
    expect(CONTACT_SOURCES).not.toContain('sent');
    expect(recordContact({ source: 'sent' }).lastContactSource).toBe('host-logged');
    expect(recordContact({ source: 'emailed' }).lastContactSource).toBe('host-logged');
  });

  it('is pure — it returns a patch and mutates nothing', () => {
    const vendor = { id: 'v1', name: 'Caterer' };
    const before = JSON.stringify(vendor);
    recordContact({ at: NOW });
    expect(JSON.stringify(vendor)).toBe(before);
  });
});

describe('contactState — unknown is NOT the same as never', () => {
  it('reports known:false when there is no record, and refuses to call it silent', () => {
    const s = contactState({ id: 'v1', name: 'Caterer' }, NOW);
    expect(s.known).toBe(false);
    expect(s.silent).toBe(false);           // ← the dishonesty this prevents
    expect(s.awaitingReply).toBe(false);
    expect(s.daysSince).toBeNull();
  });

  it('treats an unparseable stamp as no record rather than as day zero', () => {
    expect(contactState({ lastContactedAt: 'not-a-date' }, NOW).known).toBe(false);
    expect(contactState({ lastContactedAt: '' }, NOW).known).toBe(false);
    expect(contactState(null, NOW).known).toBe(false);
  });

  it('counts days since contact', () => {
    expect(contactState({ lastContactedAt: daysBefore(5) }, NOW).daysSince).toBe(5);
    expect(contactState({ lastContactedAt: daysBefore(0) }, NOW).daysSince).toBe(0);
  });

  it('never returns a negative age for a stamp in the future', () => {
    const future = new Date(NOW.getTime() + 3 * DAY).toISOString();
    expect(contactState({ lastContactedAt: future }, NOW).daysSince).toBe(0);
  });
});

describe('a reply is EVIDENCE, not a flag', () => {
  // We read the things a reply produces rather than inventing a `repliedAt`
  // nobody writes — the host cannot forget to tick a signed contract.
  const contacted = { lastContactedAt: daysBefore(30) };

  it.each([
    ['contractSigned', { contractSigned: true }],
    ['depositPaid', { depositPaid: true }],
    ['balancePaid', { balancePaid: true }],
    ['status confirmed', { status: 'confirmed' }],
    ['status Confirmed (case-insensitive)', { status: 'Confirmed' }],
  ])('%s counts as a reply, so the vendor is not silent', (_label, evidence) => {
    const s = contactState({ ...contacted, ...evidence }, NOW);
    expect(s.awaitingReply).toBe(false);
    expect(s.silent).toBe(false);
  });

  it('with no evidence, a long-contacted vendor IS silent', () => {
    const s = contactState(contacted, NOW);
    expect(s.awaitingReply).toBe(true);
    expect(s.silent).toBe(true);
  });
});

describe('silence uses the SAME line the readiness score already uses', () => {
  it('is not silent one day before the line, and is silent on it', () => {
    // derive.js penalises past 21 days. If these two numbers ever drift, the
    // surface and the score would disagree about the same vendor.
    expect(contactState({ lastContactedAt: daysBefore(SILENCE_DAYS - 1) }, NOW).silent).toBe(false);
    expect(contactState({ lastContactedAt: daysBefore(SILENCE_DAYS) }, NOW).silent).toBe(true);
  });

  it('the line is 21 days', () => {
    expect(SILENCE_DAYS).toBe(21);
  });
});

describe('silentVendors — the named state surface, without a hub', () => {
  const event = {
    vendors: [
      { id: 'a', name: 'Caterer', lastContactedAt: daysBefore(40) },
      { id: 'b', name: 'Florist', lastContactedAt: daysBefore(25) },
      { id: 'c', name: 'DJ', lastContactedAt: daysBefore(2) },          // recent
      { id: 'd', name: 'Baker', lastContactedAt: daysBefore(60), depositPaid: true }, // replied
      { id: 'e', name: 'Photographer' },                                // no record
    ],
  };

  it('returns only vendors we RECORDED contacting who have not replied', () => {
    expect(silentVendors(event, NOW).map((x) => x.vendor.id)).toEqual(['a', 'b']);
  });

  it('puts the longest silence first — the one most worth chasing', () => {
    const [first] = silentVendors(event, NOW);
    expect(first.vendor.id).toBe('a');
    expect(first.state.daysSince).toBe(40);
  });

  it('excludes the vendor we never logged — unknown is a different sentence', () => {
    expect(silentVendors(event, NOW).map((x) => x.vendor.id)).not.toContain('e');
    expect(uncontactedVendors(event).map((v) => v.id)).toEqual(['e']);
  });

  it('survives a malformed event rather than throwing on a layout path', () => {
    expect(silentVendors(null, NOW)).toEqual([]);
    expect(silentVendors({}, NOW)).toEqual([]);
    expect(silentVendors({ vendors: [null, undefined] }, NOW)).toEqual([]);
    expect(uncontactedVendors(null)).toEqual([]);
  });

  it('ignores an unnamed vendor row when counting uncontacted', () => {
    // Blank rows exist in the vendor table while a host is typing.
    expect(uncontactedVendors({ vendors: [{ id: 'x', name: '  ' }] })).toEqual([]);
  });
});

describe('the round trip: record, then read it back', () => {
  it('a freshly recorded contact is known, awaiting a reply, and not yet silent', () => {
    const vendor = { id: 'v1', name: 'Caterer', ...recordContact({ at: NOW }) };
    const s = contactState(vendor, NOW);
    expect(s.known).toBe(true);
    expect(s.daysSince).toBe(0);
    expect(s.awaitingReply).toBe(true);
    expect(s.silent).toBe(false);
    expect(s.source).toBe('host-logged');
  });

  it('becomes silent once the line passes, and stops the moment evidence lands', () => {
    const vendor = { id: 'v1', ...recordContact({ at: new Date(NOW.getTime() - 30 * DAY) }) };
    expect(contactState(vendor, NOW).silent).toBe(true);
    expect(contactState({ ...vendor, contractSigned: true }, NOW).silent).toBe(false);
  });
});
