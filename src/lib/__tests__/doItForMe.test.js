// "Do it for me" draft engine — proves the app WRITES a ready-to-send message from
// the event facts it already has, never inventing what the host didn't give.
import { draftInvite, draftVendorOutreach, draftThankYou, draftRecap, draftRsvpChase, draftHelperBrief, draftHelperConfirm, draftDietaryNote, draftShoppingList, buildShoppingPlan, localityAnchor, draftDayBeforeDetails, draftVendorReconfirm, draftToast, hasToastMaterial, eventCulturalMeta, isAtHome, fmtLongDate, placePhrase, timePhrase, draftLodgingNote, draftRidesNote, draftGettingHereNote } from '../doItForMe';

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
    expect(body).toContain('You’re invited!');
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

describe('draftHelperConfirm', () => {
  test('personalizes to the one helper, lists only their own assignments', () => {
    const helper = { id: 'g-1', guestId: 'g-1', name: 'Uncle Ray', role: 'food · task' };
    const resp = [
      { helperId: 'g-1', label: 'Pitmaster', itemType: 'task' },
      { helperId: 'g-1', label: 'Protein pickup', itemType: 'food' },
    ];
    const { subject, body } = draftHelperConfirm(maya, profile, helper, resp);
    expect(subject).toContain("Maya's Graduation");
    expect(body).toContain('Hi Uncle');
    expect(body).toContain('Pitmaster');
    expect(body).toContain('Protein pickup');
    expect(body).toContain('Todd');
    // never another helper's items — this is a per-person, not a group, message
    expect(body).not.toContain('Marcus');
  });
  test('no responsibilities passed → honest generic confirm, never invented duties', () => {
    const helper = { id: 'g-2', guestId: 'g-2', name: 'Cindy' };
    const { body } = draftHelperConfirm(maya, profile, helper, []);
    expect(body).toMatch(/still able to help out/);
    expect(body).not.toMatch(/You're on for/);
  });
  test('no event or helper → empty draft, never throws', () => {
    expect(draftHelperConfirm(null, profile, { name: 'X' }, [])).toEqual({ subject: '', body: '' });
    expect(draftHelperConfirm(maya, profile, null, [])).toEqual({ subject: '', body: '' });
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
  test('mapLink is a live Maps search of the store type near the anchor — never a fake address', () => {
    const items = [{ name: 'Buns', where: ['Grocery'], category: 'food' }];
    const plan = buildShoppingPlan(items, { anchor: 'Austin, TX' });
    const link = plan.stores[0].mapLink;
    expect(link).toContain('maps');
    expect(link).toContain(encodeURIComponent('Grocery'));
    expect(link).toContain(encodeURIComponent('Austin, TX'));
  });
  test('mapLink degrades to null when no anchor — never invented', () => {
    const items = [{ name: 'Buns', where: ['Grocery'], category: 'food' }];
    expect(buildShoppingPlan(items).stores[0].mapLink).toBe(null);
    expect(buildShoppingPlan(items, { anchor: '' }).stores[0].mapLink).toBe(null);
  });
  test('orderLinks always include a real Instacart entry point', () => {
    const plan = buildShoppingPlan([{ name: 'Buns', where: ['Grocery'], category: 'food' }]);
    const ic = plan.orderLinks.find((l) => l.label === 'Instacart');
    expect(ic).toBeTruthy();
    expect(ic.url).toContain('instacart.com');
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
  test('marks an often-forgotten item with a text label', () => {
    const { body } = draftShoppingList(maya, profile, { items });
    expect(body).toContain('(often forgotten)');
    expect(body).toMatch(/Sunscreen.*\(often forgotten\)/);
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
  test('with an anchor, the text carries the live store-finder map link + an order line', () => {
    const { body } = draftShoppingList(maya, profile, { items, anchor: 'Austin, TX' });
    expect(body).toContain('Find one near you: https://www.google.com/maps/search/?api=1&query=');
    expect(body).toContain(encodeURIComponent('Austin, TX'));
    expect(body).toMatch(/Order for pickup\/delivery: Instacart https?:\/\//);
  });
  test('no anchor → no map link line (never a fabricated store), order line still present', () => {
    const { body } = draftShoppingList(maya, profile, { items });
    expect(body).not.toContain('Find one near you');
    expect(body).toMatch(/Order for pickup\/delivery: Instacart/);
  });
  test('venue chrome is stripped from the map link — only the locality reaches the query', () => {
    const { body } = draftShoppingList(maya, profile, { items, anchor: 'My place — Atlanta, Georgia' });
    // the clean locality survives; the host-facing "My place" chrome and em-dash do not
    expect(body).toContain(encodeURIComponent('Atlanta, Georgia'));
    expect(body).not.toContain(encodeURIComponent('My place'));
    expect(body).not.toContain('%E2%80%94'); // em-dash must never appear in the URL
  });
  test('anchor with no geographic segment is left intact (never guesses a location)', () => {
    expect(localityAnchor('Hartwell Legal Aid — Main Conference Room')).toBe('Hartwell Legal Aid — Main Conference Room');
    expect(localityAnchor('Austin, TX')).toBe('Austin, TX');
    expect(localityAnchor('')).toBe('');
  });
  test('a line carries its per-guest basis as a "because" — only when it has a quantity', () => {
    const { body } = draftShoppingList(maya, profile, { items: [
      { name: 'BBQ chicken', qty: 12, unit: 'lbs', basis: '½ lb/guest' },
      { name: 'Ribs', qty: 15, unit: 'lbs', basis: '½ lb/guest', forgotten: false },
      { name: 'Napkins', qty: 0, unit: '', basis: '1.5/guest' }, // no qty → no dangling basis
    ] });
    expect(body).toContain('BBQ chicken — 12 lbs  · ½ lb/guest');
    expect(body).not.toMatch(/Napkins.*·/); // basis suppressed when there's no quantity to explain
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

// DESTINATION-2 slice 1 — the where-to-stay note. Doctrine under test: DRAFT
// content comes ONLY from event.lodging (the fields lib/travelPlan reads);
// missing fields are omitted, never bracket-filled or invented; no place name
// means an empty body (the UI's "nothing to draft yet" guard); plain host
// language ("group rate goes away"), never hospitality jargon.
describe('draftLodgingNote', () => {
  const dest = {
    name: 'The Chen Reunion',
    isDestination: true,
    lodging: {
      hotelName: 'Harborview Inn',
      rate: 189,
      code: 'CHEN25',
      deadline: '2026-08-12',
      backupOptions: [{ name: 'Bayside Suites', note: '10 min farther, usually cheaper' }],
    },
  };
  test('composes the full note from every host-entered field', () => {
    const { subject, body } = draftLodgingNote(dest);
    expect(subject).toBe('Where to stay for The Chen Reunion');
    expect(body).toContain('We’ve lined up rooms at Harborview Inn.');
    expect(body).toContain('The group rate is $189 a night — give them the code CHEN25 when you book.');
    expect(body).toContain('Book by Wednesday, August 12 — after that the group rate goes away');
    expect(body).toContain('- Bayside Suites — 10 min farther, usually cheaper');
    expect(body).toContain('If it fills up, or you’d rather stay somewhere else:');
  });
  test('omits lines for missing fields instead of inventing them', () => {
    const { body } = draftLodgingNote({ name: 'The Chen Reunion', lodging: { hotelName: 'Harborview Inn' } });
    expect(body).toContain('Harborview Inn');
    expect(body).not.toContain('$');            // no rate line
    expect(body).not.toContain('code');         // no booking-code line
    expect(body).not.toContain('Book by');      // no deadline line
    expect(body).not.toContain('fills up');     // no backup section
    expect(body).not.toContain('[');            // and never a bracket placeholder
  });
  test('code-only variant still tells guests how to get the group rate', () => {
    const { body } = draftLodgingNote({ lodging: { hotelName: 'Harborview Inn', code: 'CHEN25' } });
    expect(body).toContain('Give them the code CHEN25 when you book to get the group rate.');
    expect(body).not.toContain('$');
  });
  test('no place name → empty body (the UI guard, not a guessed hotel)', () => {
    expect(draftLodgingNote({ name: 'X', lodging: { rate: 200, code: 'ABC' } }).body).toBe('');
    expect(draftLodgingNote({}).body).toBe('');
    expect(draftLodgingNote(null).body).toBe('');
  });
  test('backup options cap at 2 and skip nameless entries', () => {
    const { body } = draftLodgingNote({
      lodging: {
        hotelName: 'Harborview Inn',
        backupOptions: [{ name: '', note: 'ghost' }, { name: 'A' }, { name: 'B' }, { name: 'C' }],
      },
    });
    expect(body).toContain('- A');
    expect(body).toContain('- B');
    expect(body).not.toContain('- C');
    expect(body).not.toContain('ghost');
  });
  test('unreadable deadline is dropped, never asserted', () => {
    const { body } = draftLodgingNote({ lodging: { hotelName: 'Harborview Inn', deadline: 'soonish' } });
    expect(body).not.toContain('Book by');
  });
});

// DESTINATION-2 slice 2 — the getting-around note. Doctrine under test: DRAFT
// content comes ONLY from event.groundTransport (the host's own words — the
// late-night note VERBATIM) plus the dest_transport decision answer via
// transportDecision (Phase 1's single source); an undecided shuttle is
// silence, never a guess; nothing real to say means an empty body (the UI's
// "nothing to draft yet" guard); matching stays host-mediated — the note
// invites replies, it never assigns anyone a car.
describe('draftRidesNote', () => {
  const dest = {
    name: 'The Chen Reunion',
    isDestination: true,
    foodChoices: { dest_transport: 'Yes, a shuttle or van' },
    groundTransport: {
      lastReturnNote: 'no rideshare after 9pm — last shuttle 11:30',
      pickupPoints: [{ name: 'Hotel lobby', note: 'on the hour' }, { name: 'Venue gate' }],
    },
  };
  test('composes the full note: decision answer, pickup spots, late-night note verbatim', () => {
    const { subject, body } = draftRidesNote(dest);
    expect(subject).toBe('Getting around for The Chen Reunion');
    expect(body).toContain('We’re arranging a shuttle or van for the group');
    expect(body).toContain('Pickup spots:');
    expect(body).toContain('- Hotel lobby — on the hour');
    expect(body).toContain('- Venue gate');
    expect(body).toContain('Getting back at night: no rideshare after 9pm — last shuttle 11:30');
    // Shuttle decided → the plain questions closer, not the pair-up ask.
    expect(body).toContain('Questions about getting around? Just reply here.');
  });
  test('self-manage answer says so plainly and invites host-mediated pairing', () => {
    const { body } = draftRidesNote({ ...dest, foodChoices: { dest_transport: 'No, guests self-manage' } });
    expect(body).toContain('There’s no group shuttle');
    expect(body).toContain('Reply here and I’ll pair people up.');
    expect(body).not.toContain('We’re arranging');
  });
  test('undecided shuttle is silence — never a claimed plan either way', () => {
    const { body } = draftRidesNote({ ...dest, foodChoices: {} });
    expect(body).not.toContain('We’re arranging');
    expect(body).not.toContain('There’s no group shuttle');
    // The host's real fields still carry the note.
    expect(body).toContain('Getting back at night: no rideshare after 9pm — last shuttle 11:30');
    expect(body).toContain('- Hotel lobby — on the hour');
  });
  test('"Not sure yet" is a real non-answer — treated as undecided, not as no', () => {
    const { body } = draftRidesNote({ ...dest, foodChoices: { dest_transport: 'Not sure yet' } });
    expect(body).not.toContain('There’s no group shuttle');
    expect(body).not.toContain('We’re arranging');
  });
  test('nothing real to say → empty body (the UI guard)', () => {
    expect(draftRidesNote({ name: 'X' }).body).toBe('');
    expect(draftRidesNote({ groundTransport: {} }).body).toBe('');
    expect(draftRidesNote({ groundTransport: { pickupPoints: [{ note: 'nameless' }] }, foodChoices: { dest_transport: 'Not sure yet' } }).body).toBe('');
    expect(draftRidesNote(null).body).toBe('');
    expect(draftRidesNote({}).body).toBe('');
  });
  test('a decided shuttle alone is real enough to send', () => {
    const { body } = draftRidesNote({ foodChoices: { dest_transport: 'Yes, a shuttle or van' } });
    expect(body).toContain('We’re arranging a shuttle or van for the group');
    expect(body).not.toContain('Pickup spots');
    expect(body).not.toContain('Getting back at night');
  });
  test('pickup spots cap at 2 and skip nameless entries; missing fields are omitted', () => {
    const { body } = draftRidesNote({
      groundTransport: { pickupPoints: [{ name: '', note: 'ghost' }, { name: 'A' }, { name: 'B' }, { name: 'C' }] },
    });
    expect(body).toContain('- A');
    expect(body).toContain('- B');
    expect(body).not.toContain('- C');
    expect(body).not.toContain('ghost');
    expect(body).not.toContain('Getting back at night');
    expect(body).not.toContain('[');
  });
  test('legacy explicit boolean field still reads when no decision answer exists', () => {
    const { body } = draftRidesNote({ groundTransport: { providing: true } });
    expect(body).toContain('We’re arranging a shuttle or van for the group');
  });
});

// DESTINATION-2 slice 3 — the getting-here note. Doctrine under test: DRAFT
// content comes ONLY from the host's own airport options (with their honest
// tradeoff notes, cap 3), the event's real date fields, and the dest_transport
// decision via transportDecision (Phase 1's single source); arrive-by guidance
// derives from event.date / the host's own start time — a time is never
// invented; no airports means an empty body (the UI's "nothing to draft yet"
// guard); missing pieces are omitted, never bracket-filled.
describe('draftGettingHereNote', () => {
  const dest = {
    name: 'The Chen Reunion',
    isDestination: true,
    date: '2026-09-12',
    airportOptions: [
      { name: 'Baltimore/Washington Intl', code: 'BWI', note: 'closer, fewer flights' },
      { name: 'Reagan National', code: 'DCA' },
    ],
    foodChoices: { dest_transport: 'Yes, a shuttle or van' },
  };
  test('composes the full note: airports with tradeoffs, the real date, the decision answer', () => {
    const { subject, body } = draftGettingHereNote(dest);
    expect(subject).toBe('Getting here for The Chen Reunion');
    expect(body).toContain('Airports worth comparing:');
    expect(body).toContain('- Baltimore/Washington Intl (BWI) — closer, fewer flights');
    expect(body).toContain('- Reagan National (DCA)');
    expect(body).toContain('The day itself is Saturday, September 12. Plan to land before then.');
    expect(body).toContain('we’re arranging a shuttle or van for the group');
    expect(body).toContain('Questions about flights or timing? Just reply here.');
    expect(body).not.toContain('[');
  });
  test('a single airport reads as the plain instruction, not a comparison', () => {
    const { body } = draftGettingHereNote({ airportOptions: [{ code: 'BWI' }] });
    expect(body).toContain('Fly into:');
    expect(body).toContain('- BWI');
    expect(body).not.toContain('worth comparing');
  });
  test('multi-day window uses both real dates — land before, fly home after', () => {
    const { body } = draftGettingHereNote({ ...dest, endDate: '2026-09-14' });
    expect(body).toContain('It runs Saturday, September 12 through Monday, September 14 — plan to land before it starts, and book the flight home for after it ends.');
    expect(body).not.toContain('The day itself');
  });
  test('the start time appears ONLY when the host actually gave one', () => {
    const withTime = draftGettingHereNote({ ...dest, startTime: '2pm' }).body;
    expect(withTime).toContain('it starts at 2pm');
    const withPartOfDay = draftGettingHereNote({ ...dest, timeOfDay: 'afternoon' }).body;
    expect(withPartOfDay).toContain('it starts in the afternoon');
    expect(draftGettingHereNote(dest).body).not.toContain('it starts');
  });
  test('no date → no land-by line, never a guessed one', () => {
    const { body } = draftGettingHereNote({ ...dest, date: null });
    expect(body).not.toContain('Plan to land');
    expect(body).not.toContain('The day itself');
    expect(body).toContain('- Baltimore/Washington Intl (BWI)');
  });
  test('undecided transport is silence — never a claimed plan either way', () => {
    const { body } = draftGettingHereNote({ ...dest, foodChoices: {} });
    expect(body).not.toContain('shuttle');
    expect(body).not.toContain('rental car');
  });
  test('self-manage answer says so plainly', () => {
    const { body } = draftGettingHereNote({ ...dest, foodChoices: { dest_transport: 'No, guests self-manage' } });
    expect(body).toContain('getting around is on your own wheels');
    expect(body).not.toContain('we’re arranging');
  });
  test('no airports → empty body (the UI guard), even with everything else set', () => {
    expect(draftGettingHereNote({ ...dest, airportOptions: [] }).body).toBe('');
    expect(draftGettingHereNote({ ...dest, airportOptions: [{ note: 'nameless' }] }).body).toBe('');
    expect(draftGettingHereNote({ name: 'X', date: '2026-09-12' }).body).toBe('');
    expect(draftGettingHereNote(null).body).toBe('');
    expect(draftGettingHereNote({}).body).toBe('');
  });
  test('airports cap at 3 and skip entries with neither a name nor a code', () => {
    const { body } = draftGettingHereNote({
      airportOptions: [{ note: 'ghost' }, { code: 'A' }, { code: 'B' }, { code: 'C' }, { code: 'D' }],
    });
    expect(body).toContain('- A');
    expect(body).toContain('- B');
    expect(body).toContain('- C');
    expect(body).not.toContain('- D');
    expect(body).not.toContain('ghost');
  });
});
