// "Do it for me" draft engine — proves the app WRITES a ready-to-send message from
// the event facts it already has, never inventing what the host didn't give.
import { draftInvite, draftVendorOutreach, draftThankYou, draftRecap, draftRsvpChase, draftHelperBrief, draftDietaryNote, draftShoppingList, buildShoppingPlan, draftDayBeforeDetails, draftVendorReconfirm, draftToast, hasToastMaterial, eventCulturalMeta, isAtHome, fmtLongDate, placePhrase, timePhrase } from '../doItForMe';

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

describe('draftRsvpChase', () => {
  test('gentle nudge with the date + RSVP link', () => {
    const url = 'https://x/?rsvp=maya7';
    const { subject, body } = draftRsvpChase(maya, profile, { rsvpUrl: url });
    expect(subject).toMatch(/nudge/i);
    expect(body).toMatch(/nudge|let us know/i);
    expect(body).toContain('Tuesday, July 7');
    expect(body).toContain(url);
    expect(body).toContain('Todd');
  });
  test('somber events get a respectful note, not "💛 friendly nudge"', () => {
    const { body, subject } = draftRsvpChase({ type: 'Memorial', honoree: 'Joe', date: '2026-07-07' }, profile);
    expect(body).not.toMatch(/💛|friendly nudge/i);
    expect(body).toMatch(/gentle note|mean a great deal/i);
    expect(subject).not.toMatch(/nudge/i);
  });
});

describe('eventCulturalMeta / isAtHome (analytics signals)', () => {
  test('voice slug + sombre flag from the same regexes as the invite voice', () => {
    expect(eventCulturalMeta({ type: 'Graduation' })).toEqual({ sombre: false, voice: 'graduation' });
    expect(eventCulturalMeta({ type: 'Quinceañera' })).toEqual({ sombre: false, voice: 'quinceanera' });
    expect(eventCulturalMeta({ type: 'Bat Mitzvah' })).toEqual({ sombre: false, voice: 'mitzvah' });
    expect(eventCulturalMeta({ type: 'Celebration of Life' })).toEqual({ sombre: true, voice: 'remembrance' });
    expect(eventCulturalMeta({ type: 'Something Niche' })).toEqual({ sombre: false, voice: 'other' });
  });
  test('isAtHome mirrors placePhrase', () => {
    expect(isAtHome({ venue: "Host's home" })).toBe(true);
    expect(isAtHome({ venue: 'The Grand Hall' })).toBe(false);
    expect(isAtHome({ venue: '' })).toBe(false);
  });
});

describe('draftHelperBrief', () => {
  const ros = [
    { time: '12:00', segment: 'Heat the buffet', owner: 'You' },
    { time: '14:00', segment: 'Set drinks + ice', owner: 'Marcus' },
    { time: '15:00', segment: 'Greet guests', owner: 'You' },
  ];
  test('groups cues by owner with 12h times', () => {
    const { body, subject } = draftHelperBrief({ ...maya, ros }, profile);
    expect(subject).toContain("Maya's Graduation");
    expect(body).toContain('You:');
    expect(body).toContain('Marcus:');
    expect(body).toContain('12:00 PM — Heat the buffet');
    expect(body).toContain('2:00 PM — Set drinks + ice');
    expect(body).toContain('Todd');
  });
  test('no ros → honest placeholder, never invented duties', () => {
    const { body } = draftHelperBrief({ ...maya, ros: [] }, profile);
    expect(body).toMatch(/isn’t filled in yet/);
  });
});

describe('draftDietaryNote', () => {
  test('lists each guest dietary need from their own field', () => {
    const guests = [
      { name: 'Priya', rsvp: 'Yes', needs: 'Nut allergy' },
      { name: 'Carlos', rsvp: 'Yes', needs: 'Gluten-free' },
      { name: 'Tom', rsvp: 'Yes', needs: '' },
    ];
    const { body } = draftDietaryNote({ ...maya, guests }, profile);
    expect(body).toContain('Priya: Nut allergy');
    expect(body).toContain('Carlos: Gluten-free');
    expect(body).not.toContain('Tom');           // no need → not listed
    expect(body).toContain('about 3 guests');     // 3 RSVP'd Yes
  });
  test('no needs → honest "nothing to flag", never invents', () => {
    const { body } = draftDietaryNote({ ...maya, guests: [{ name: 'A', rsvp: 'Yes', needs: '' }] }, profile);
    expect(body).toMatch(/No special dietary needs/);
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

describe('buildShoppingPlan', () => {
  test('fewest-trips: overlapping where[] collapse onto the minimal store set', () => {
    const items = [
      { name: 'Buns', where: ['Grocery'], category: 'food' },
      { name: 'Chicken', where: ['Grocery', 'Costco'], category: 'food' },
      { name: 'Soda', where: ['Costco', 'Grocery'], category: 'beverage' },
      { name: 'Napkins', where: ['Grocery', 'Costco'], category: 'cleanup' },
    ];
    const plan = buildShoppingPlan(items);
    expect(plan.storeCount).toBe(1);               // everything covered by Grocery → one trip
    expect(plan.stores[0].store).toBe('Grocery');
    expect(plan.stores[0].items.map((i) => i.name).sort()).toEqual(['Buns', 'Chicken', 'Napkins', 'Soda']);
    expect(plan.stores[0].distance).toBe(null);    // never invented
  });
  test('partitions day-of (T0) items out of the store sections', () => {
    const items = [
      { name: 'Cups', where: ['Grocery'], category: 'cleanup', buyAt: 'T-1d' },
      { name: 'Ice', where: ['Grocery'], category: 'logistics', buyAt: 'T0' },
    ];
    const plan = buildShoppingPlan(items);
    expect(plan.dayOf.map((i) => i.name)).toEqual(['Ice']);
    expect(plan.stores.flatMap((s) => s.items.map((i) => i.name))).not.toContain('Ice');
  });
});

describe('draftShoppingList', () => {
  const items = [
    { name: 'Ice', qty: 18, unit: 'lbs', got: false, category: 'logistics', where: ['Grocery'], buyAt: 'T0', forgotten: true },
    { name: 'Chicken', qty: 4, unit: 'lbs', got: false, category: 'food', where: ['Grocery'], buyAt: 'T-1d' },
    { name: 'Sunscreen', qty: 1, unit: '', got: false, category: 'logistics', where: ['Grocery'], buyAt: 'T-3d', forgotten: true },
    { name: 'Buns', qty: 3, unit: 'packs', got: true, category: 'food', where: ['Grocery'], buyAt: 'T-1d' },
  ];
  test('groups items under a store header, not a flat checklist', () => {
    const { subject, body } = draftShoppingList(maya, profile, { items });
    expect(subject).toContain('Shopping list');
    expect(body).toContain('GROCERY');             // store-grouped section header
    expect(body).toContain('[ ] Chicken — 4 lbs'); // checkbox + qty
    expect(body).not.toContain('Buns');            // already got → off the list
  });
  test('puts a buyAt:T0 item (Ice) in the day-of section', () => {
    const { body } = draftShoppingList(maya, profile, { items });
    expect(body).toMatch(/DAY-OF \(grab the morning of\)/);
    const dayOfIdx = body.indexOf('DAY-OF');
    expect(body.indexOf('Ice')).toBeGreaterThan(dayOfIdx);  // Ice lives under day-of
  });
  test('marks an often-forgotten item with ⭐', () => {
    const { body } = draftShoppingList(maya, profile, { items });
    expect(body).toContain('⭐');
    expect(body).toMatch(/Sunscreen.*⭐/);
  });
  test('never prints a per-line dollar amount', () => {
    const priced = items.map((i) => ({ ...i, costLow: 3, costHigh: 6 }));
    const { body } = draftShoppingList(maya, profile, { items: priced });
    for (const line of body.split('\n').filter((l) => l.startsWith('[ ]'))) {
      expect(line).not.toMatch(/\$\d/);
    }
  });
  test('shows a modeled total line when costs are given', () => {
    const priced = items.map((i) => ({ ...i, costLow: 3, costHigh: 6 }));
    const { body } = draftShoppingList(maya, profile, { items: priced });
    expect(body).toMatch(/Estimated total ~\$\d+–\$\d+ \(modeled, not live prices\)/);
  });
  test('honest when the menu is empty — never invents items', () => {
    const { body } = draftShoppingList(maya, profile, { items: [] });
    expect(body).toMatch(/menu isn’t set yet/i);
  });
  test('celebrates when everything is checked off', () => {
    const { body } = draftShoppingList(maya, profile, { items: [{ name: 'Ice', qty: 5, unit: 'lbs', got: true }] });
    expect(body).toMatch(/checked off|ready/i);
  });
});

describe('draftDayBeforeDetails', () => {
  test('logistics blast from real venue/date/time', () => {
    const { subject, body } = draftDayBeforeDetails(maya, profile);
    expect(subject).toMatch(/See you soon/i);
    expect(body).toContain('Tuesday, July 7');
    expect(body).toContain('Our place');
    expect(body).toContain('Todd');
  });
  test('includes a host-provided bring note, never an invented one', () => {
    expect(draftDayBeforeDetails(maya, profile).body).not.toMatch(/🎁/);
    expect(draftDayBeforeDetails({ ...maya, whatToBring: 'a side dish to share' }, profile).body).toContain('a side dish to share');
  });
  test('somber events stay respectful', () => {
    const { body } = draftDayBeforeDetails({ type: 'Memorial', name: 'Remembering Joe', date: '2026-07-07' }, profile);
    expect(body).not.toMatch(/Can’t wait|💛/);
    expect(body).toMatch(/Thank you for being with us/i);
  });
});

describe('draftVendorReconfirm', () => {
  test('reconfirms date/place with a booked vendor', () => {
    const { subject, body } = draftVendorReconfirm({ ...maya, venue: 'The Grand Hall' }, { name: 'Ace Catering', arrivalTime: '3:00 PM' }, profile);
    expect(subject).toContain('Ace Catering');
    expect(body).toContain('Hi Ace Catering,');
    expect(body).toContain('Tuesday, July 7');
    expect(body).toContain('The Grand Hall');
    expect(body).toContain('3:00 PM');
  });
  test('no-name vendor reads "Hi there," so one note serves several', () => {
    expect(draftVendorReconfirm(maya, null, profile).body).toContain('Hi there,');
  });
});

describe('draftToast', () => {
  test('shapes the host’s own words, never fabricates', () => {
    const ev = { ...maya, honoree_story: 'she worked two jobs to get here', meaning_why: 'this family never quits' };
    const { subject, body } = draftToast(ev, profile);
    expect(subject).toContain('Maya');
    expect(body).toContain('Tonight is about Maya');
    expect(body).toContain('she worked two jobs to get here');
    expect(body).toContain('this family never quits');
    expect(body).toMatch(/raise your glass/i);
  });
  test('body never exceeds 5 spoken lines', () => {
    const ev = { ...maya, honoree_story: 'she worked two jobs to get here', meaning_why: 'this family never quits', feeling_words: 'pride and joy' };
    const { body } = draftToast(ev, profile);
    expect(body.split('\n').filter(Boolean).length).toBeLessThanOrEqual(5);
  });
  test('truncates a very long host line to one speakable beat', () => {
    const longStory = 'She started from absolutely nothing and worked two jobs while raising three kids and studying every single night until two in the morning, and somehow she still found time to coach the team and bake for every bake sale and never once complained about any of it to anyone';
    const ev = { ...maya, honoree_story: longStory };
    const { body } = draftToast(ev, profile);
    expect(body).not.toContain(longStory);                 // the full paragraph is gone
    expect(body.split('\n').filter(Boolean).length).toBeLessThanOrEqual(5);
  });
  test('hasToastMaterial gates the card on real material', () => {
    expect(hasToastMaterial(maya)).toBe(true);                       // honoree present
    expect(hasToastMaterial({ type: 'Dinner Party' })).toBe(false);  // nothing to shape
  });
  test('somber toast remembers, never "raise your glass"', () => {
    const { body } = draftToast({ type: 'Celebration of Life', honoree: 'Joe' }, profile);
    expect(body).toMatch(/remember|hold each other|because of Joe/i);
    expect(body).not.toMatch(/raise your glass/i);
    expect(body.split('\n').filter(Boolean).length).toBeLessThanOrEqual(5);
  });
});
