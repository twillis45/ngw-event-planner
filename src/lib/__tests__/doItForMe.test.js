// "Do it for me" draft engine — proves the app WRITES a ready-to-send message from
// the event facts it already has, never inventing what the host didn't give.
import { draftInvite, draftVendorOutreach, draftThankYou, draftRecap, fmtLongDate, placePhrase, timePhrase } from '../doItForMe';

const maya = { name: "Maya's Graduation", type: 'Graduation', date: '2026-07-07', timeOfDay: 'afternoon', venue: "Host's home", honoree: 'Maya', guestEstimate: '35' };
const profile = { name: 'Todd' };

describe('formatters', () => {
  test('fmtLongDate → weekday, month day (locale-stable)', () => {
    expect(fmtLongDate('2026-07-07')).toBe('Tuesday, July 7');
    expect(fmtLongDate('')).toBe('');
    expect(fmtLongDate('garbage')).toBe('');
  });
  test('placePhrase: home → "our place", real venue verbatim, empty → ""', () => {
    expect(placePhrase({ venue: "Host's home" })).toBe('our place');
    expect(placePhrase({ venue: 'The Grand Hall' })).toBe('The Grand Hall');
    expect(placePhrase({ venue: '' })).toBe('');
  });
  test('timePhrase from part-of-day; blank when unknown', () => {
    expect(timePhrase({ timeOfDay: 'afternoon' })).toBe('in the afternoon');
    expect(timePhrase({})).toBe('');
  });
});

describe('draftInvite', () => {
  test('composes a warm, ready-to-send invite from real facts', () => {
    const { subject, body } = draftInvite(maya, profile);
    expect(subject).toContain('Maya’s graduation');
    expect(body).toContain('🎓');
    expect(body).toContain('Maya’s graduation');
    expect(body).toContain('Tuesday, July 7');
    expect(body).toContain('in the afternoon');
    expect(body).toContain('our place');
    expect(body).toContain('— Todd');
  });
  test('never invents a place — omits the line when venue unknown', () => {
    const { body } = draftInvite({ ...maya, venue: '' }, profile);
    expect(body).not.toContain('📍');
    expect(body).toContain('details to follow');
  });
  test('closes the loop — embeds the RSVP link when given', () => {
    const url = 'https://twillis45.github.io/ngw-event-planner/?rsvp=w9k2mx';
    const { body } = draftInvite(maya, profile, { rsvpUrl: url });
    expect(body).toContain(url);
    expect(body).toContain('Tap to let us know');
  });
  test('no RSVP link → open-ended "let us know"', () => {
    const { body } = draftInvite(maya, profile);
    expect(body).not.toContain('http');
    expect(body).toContain('let us know');
  });
  test('works with no honoree and no host name', () => {
    const { body, subject } = draftInvite({ type: 'Dinner Party', date: '2026-07-07' }, {});
    expect(subject).toBeTruthy();
    expect(body).toContain('You’re invited');
    expect(body.split('\n').some(l => l.startsWith('— '))).toBe(false);  // no signature line without a host name
  });
});

describe('cultural & somber awareness', () => {
  test('a memorial NEVER gets the festive template (no party emoji, no "celebrate")', () => {
    const { subject, body } = draftInvite({ type: 'Celebration of Life', date: '2026-07-07', honoree: 'Grandpa Joe' }, { name: 'Todd' });
    expect(body).not.toMatch(/🎉|🎊|🎂|🥂/);
    expect(body).not.toMatch(/celebrat/i);
    expect(body).not.toMatch(/can’t imagine|come join|raise a glass/i);
    expect(body).toContain('remember Grandpa Joe');
    expect(subject).toMatch(/remembrance/i);
  });
  test('a shiva thank-you thanks for presence, not celebrating', () => {
    const { body } = draftThankYou({ type: 'Shiva', honoree: 'Grandpa Joe' }, { name: 'Todd' });
    expect(body).not.toMatch(/celebrat/i);
    expect(body).toContain('remembered Grandpa Joe');
  });
  test('quinceañera is named specifically, not flattened to "a party"', () => {
    const { body } = draftInvite({ type: 'Quinceañera', date: '2026-07-07', honoree: 'Sofia' }, {});
    expect(body).toMatch(/quincea/i);
    expect(body).toContain('Sofia');
  });
  test('bar/bat mitzvah names the rite', () => {
    expect(draftInvite({ type: 'Bat Mitzvah', date: '2026-07-07', honoree: 'Maya' }, {}).body).toContain('bat mitzvah');
    expect(draftInvite({ type: 'Bar Mitzvah', date: '2026-07-07', honoree: 'Eli' }, {}).body).toContain('bar mitzvah');
  });
});

describe('draftVendorOutreach', () => {
  test('drafts an availability + pricing inquiry from event facts', () => {
    const { body } = draftVendorOutreach(maya, { name: 'Bloom & Stem', category: 'Florals' }, profile);
    expect(body).toContain('Hi Bloom & Stem,');
    expect(body).toContain('graduation');
    expect(body).toContain('Tuesday, July 7');
    expect(body).toContain('about 35 guests');
    expect(body).toContain('florals');
    expect(body).toMatch(/available|pricing/i);
    expect(body).toContain('Todd');
  });
  test('falls back gracefully with no vendor name/contact', () => {
    const { body } = draftVendorOutreach({ type: 'Wedding', date: '2026-09-12' }, null, {});
    expect(body).toContain('Hi there,');
    expect(body).toContain('wedding');
  });
});

describe('draftRecap (keepsake)', () => {
  test('warm shareable recap grounded in the event + its heart', () => {
    const { subject, body } = draftRecap({ ...maya, must_have_moment: 'the whole family there for the walk' }, profile);
    expect(subject).toContain('thank you');
    expect(body).toContain("Maya's Graduation");
    expect(body).toContain('At the heart of it: the whole family there for the walk');
    expect(body).toContain('Todd');
  });
  test('somber recap remembers, never "what a day"', () => {
    const { body } = draftRecap({ type: 'Memorial', name: 'Remembering Joe', honoree: 'Joe' }, profile);
    expect(body).not.toMatch(/what a day|💛/i);
    expect(body).toContain('remember Joe');
  });
});

describe('draftThankYou', () => {
  test('one warm note grounded in the event', () => {
    const { subject, body } = draftThankYou(maya, profile);
    expect(subject).toContain('Maya’s graduation');
    expect(body).toContain('Thank you so much');
    expect(body).toContain('Maya’s graduation');
    expect(body).toContain('Todd');
  });
});
