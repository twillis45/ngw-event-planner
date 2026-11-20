// "Send the details" — the pre-written text a host sends a vendor from their
// own phone (owner + host board ruling, 11/15/2026). Synthetic names only.
//
// What these pin: every clause the data supports is there, in the host's voice
// and US date format; every clause whose data is missing is gone WHOLE — no
// "undefined", no "TBD", no number the app made up; and the channel links are
// the existing sms:/mailto: rails, nothing more.
import {
  buildVendorDetailsMessage, dietPhrase, vendorGreetingName, hostSignName,
  detailsSmsHref, detailsMailtoHref, textDigits,
} from '../vendorDetailsMessage';

const LINK = 'https://example.invalid/hostv2/?vendor=abcdefghij1234567890xy';
const CATERER = { id: 'v1', name: 'Harbor Rotisserie', contactName: 'Marco Bell', category: 'Catering', phone: '(555) 010-2000', email: 'marco@harbor.example' };
const FULL = {
  id: 'e1', name: 'Juniper’s Game Night', type: 'Game Night', date: '2026-11-28',
  startTime: '18:30', startTimeSource: 'host', venue: 'Fort Ward Park',
  hostName: 'Juniper Vale', guestCount: 40,
  dietCounts: { Vegetarian: 3, 'Nut allergy': 1, 'Grandma no-salt': 2 },
};
const NOISE = /undefined|null|NaN|TBD|\[object/;

describe('buildVendorDetailsMessage — every clause present', () => {
  test('who, what, when, where, how many, which job, and the link', () => {
    const { body, subject } = buildVendorDetailsMessage({ vendor: CATERER, event: FULL, profile: { name: 'Someone Else' }, link: LINK });
    expect(body).toBe(
      'Hi Marco, it’s Juniper Vale. I’m hosting Juniper’s Game Night on Saturday, November 28 at 6:30 PM at Fort Ward Park, '
      + '40 guests (3 vegetarian, 1 nut allergy). You’re doing the catering. '
      + 'Here’s everything in one place — please tap to confirm, or tell me if anything’s off: ' + LINK,
    );
    expect(subject).toBe('Juniper’s Game Night — the details for the catering');
    expect(body).not.toMatch(NOISE);
  });

  test('US date: weekday, Month D — never day-first', () => {
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, date: '2027-03-04' }, link: LINK });
    expect(body).toContain('on Thursday, March 4 at 6:30 PM');
    expect(body).not.toMatch(/4 March|04\/03|4\/3/);
  });

  test('a host-typed custom diet key never leaves (free text could name a person)', () => {
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: FULL, link: LINK });
    expect(body).not.toMatch(/Grandma|no-salt/);
  });
});

describe('missing data is omitted cleanly', () => {
  test('a bare vendor and a bare event still read as a sentence', () => {
    const { body, subject } = buildVendorDetailsMessage({ vendor: {}, event: {}, link: '' });
    expect(body).toBe('Hi!');
    expect(subject).toBe('The details');
    expect(body).not.toMatch(NOISE);
  });

  test('no contact person greets the business; no host name drops "it’s"', () => {
    const { body } = buildVendorDetailsMessage({ vendor: { name: 'Harbor Rotisserie', category: 'Catering' }, event: { name: 'Picnic' }, link: LINK });
    expect(body.startsWith('Hi Harbor Rotisserie! I’m hosting Picnic.')).toBe(true);
  });

  test('the profile name signs when the event carries no host name', () => {
    expect(hostSignName({}, { name: 'Rowan Pike' })).toBe('Rowan Pike');
    expect(hostSignName({ hostName: 'Juniper Vale' }, { name: 'Rowan Pike' })).toBe('Juniper Vale');
  });

  test('our DERIVED start hour never leaves; the host’s part of day stands in', () => {
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, startTimeSource: 'derived', timeOfDay: 'evening' }, link: LINK });
    expect(body).toContain('on Saturday, November 28 in the evening at Fort Ward Park');
    expect(body).not.toContain('6:30');
  });

  test('no date: no "on", and no time either', () => {
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, date: '' }, link: LINK });
    expect(body).toContain('I’m hosting Juniper’s Game Night at Fort Ward Park, 40 guests');
    expect(body).not.toMatch(/ on |6:30/);
  });

  test('no venue drops the "at" clause; a home venue reads "at my place"', () => {
    const none = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, venue: '' }, link: LINK }).body;
    expect(none).toContain('at 6:30 PM, 40 guests');
    const home = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, venue: 'Backyard' }, link: LINK }).body;
    expect(home).toContain('at 6:30 PM at my place, 40 guests');
  });

  test('a playbook-typical headcount is OURS and is never stated', () => {
    const ev = { ...FULL, guestCount: undefined, guestEstimate: 40, guestCountSource: 'playbook-typical' };
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: ev, link: LINK });
    expect(body).not.toMatch(/40|guests|vegetarian/);
    expect(body).toContain('at Fort Ward Park. You’re doing the catering.');
  });

  // Owner ruling 11/15/2026: every vendor's text carries the guest count the
  // host gave. Diet counts stay with the vendors who feed guests.
  test('a DJ is told the headcount, but not the diet counts', () => {
    const { body } = buildVendorDetailsMessage({ vendor: { name: 'Spin Cycle', category: 'DJ' }, event: FULL, link: LINK });
    expect(body).toContain('40 guests.');
    expect(body).not.toMatch(/vegetarian|nut allergy/);
    expect(body).toContain('You’re doing the DJ.');
  });

  test('rentals get the count but not the dietary tally', () => {
    const { body } = buildVendorDetailsMessage({ vendor: { name: 'Tent Co', category: 'Rentals' }, event: FULL, link: LINK });
    expect(body).toContain(', 40 guests. You’re doing the rentals.');
    expect(body).not.toMatch(/vegetarian/);
  });

  test('no diet counts: the count stands alone, no empty parentheses', () => {
    const { body } = buildVendorDetailsMessage({ vendor: CATERER, event: { ...FULL, dietCounts: {} }, link: LINK });
    expect(body).toContain('40 guests. You’re doing');
    expect(body).not.toContain('()');
  });

  test('no category: no "You’re doing the" sentence; no link: no confirm ask', () => {
    const { body } = buildVendorDetailsMessage({ vendor: { name: 'Pat' }, event: FULL, link: null });
    expect(body).not.toMatch(/doing the|Here’s everything/);
    expect(body).not.toMatch(NOISE);
  });
});

describe('diet counts formatting', () => {
  test('the brief’s own words, comma-joined, in vocabulary order', () => {
    expect(dietPhrase({ 'Nut allergy': 1, Vegetarian: 3, Shellfish: 2, Kosher: 1 })).toBe('3 vegetarian, 1 nut allergy, 2 shellfish allergy, 1 Kosher');
    expect(dietPhrase({ Vegan: 0, Vegetarian: 'x' })).toBe('');
    expect(dietPhrase(null)).toBe('');
  });
});

describe('the channels are the phone’s own apps', () => {
  test('sms: digits, then ?&body= — the guest-list rail', () => {
    expect(textDigits('(555) 010-2000')).toBe('5550102000');
    expect(detailsSmsHref('(555) 010-2000', 'Hi & bye')).toBe('sms:5550102000?&body=Hi%20%26%20bye');
    expect(detailsSmsHref('', 'Hi')).toBeNull();
  });

  test('mailto: carries subject and body; a malformed address makes no link', () => {
    expect(detailsMailtoHref('marco@harbor.example', 'S', 'B')).toBe('mailto:marco%40harbor.example?subject=S&body=B');
    expect(detailsMailtoHref('Marco Bell', 'S', 'B')).toBeNull();
  });

  test('greeting prefers the contact person’s first name', () => {
    expect(vendorGreetingName(CATERER)).toBe('Marco');
    expect(vendorGreetingName({ name: 'Harbor Rotisserie' })).toBe('Harbor Rotisserie');
    expect(vendorGreetingName({})).toBe('');
  });
});

describe('a drafted message\'s "Text it" goes to the vendor when it can', () => {
  const { draftSmsHref } = require('../vendorDetailsMessage');
  test('a vendor with a number: addressed to them, words filled in', () => {
    expect(draftSmsHref({ phone: '(410) 555-0142' }, 'See you at 4')).toBe('sms:4105550142?&body=See%20you%20at%204');
  });
  test('the day-of number when that is the only one', () => {
    expect(draftSmsHref({ dayOfPhone: '+1 410 555 0199' }, 'Hi')).toBe('sms:+14105550199?&body=Hi');
  });
  test('no vendor or no number: no recipient, the host picks', () => {
    expect(draftSmsHref(null, 'Hi')).toBe('sms:?&body=Hi');
    expect(draftSmsHref({ phone: '' }, 'Hi')).toBe('sms:?&body=Hi');
  });
});
