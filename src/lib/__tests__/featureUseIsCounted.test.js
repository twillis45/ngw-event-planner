// FEATURE USE IS COUNTED (owner, 11/16/2026: "add analytics").
// PostHog saw ~8 kinds of events and none from the features shipped 11/16:
// calendar, co-hosts, cost split, family link, photos, updates. One generic
// SECTION_OPENED (which section, nothing else) plus one event per moment that
// matters. Each must exist AND be fired from the host app (an event defined and
// never sent is how analytics silently goes dark), and none may carry a name,
// an email or a message body.
const fs = require('fs');
const path = require('path');
const { EVENTS } = require('../analytics');

const SRC = path.join(__dirname, '..', '..', '..', 'hostv2', 'src');
const shell = fs.readdirSync(SRC).filter((f) => /\.(jsx|js)$/.test(f))
  .map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
// SHARED BY BOTH SHELLS (11/25/2026): some moments fire from a lib/ module the
// host app imports (guestUpdatesKit holds the update post and the reply, for
// hostv2 and hostv4). Such a module counts only while the host app imports it,
// so an event fired from a file nothing ships still fails here.
const LIB = path.join(__dirname, '..');
const sharedFiring = ['guestUpdatesKit.js'].filter((f) => shell.includes(`@app/lib/${f.replace(/\.js$/, '')}'`));
const all = [shell, ...sharedFiring.map((f) => fs.readFileSync(path.join(LIB, f), 'utf8'))].join('\n');

const NEW = {
  SECTION_OPENED: 'section_opened',
  CALENDAR_ADDED: 'calendar_added',
  COHOST_INVITED: 'cohost_invited',
  FAMILY_LINK_ON: 'family_link_on',
  GUEST_UPDATE_POSTED: 'guest_update_posted',
  GUEST_ANSWERED: 'guest_answered',
  GUEST_PHOTO_APPROVED: 'guest_photo_approved',
};

test.each(Object.entries(NEW))('%s exists and is fired from the host app', (key, name) => {
  expect(EVENTS[key]).toBe(name);
  expect(all).toMatch(new RegExp(`EVENTS\\.${key}\\b|ANALYTICS\\.${key}\\b`));
});

test('no new event is sent with a name, an email or a body', () => {
  const calls = all.match(/track(?:Event)?\((?:ANALYTICS|EVENTS)\.(SECTION_OPENED|CALENDAR_ADDED|COHOST_INVITED|FAMILY_LINK_ON|GUEST_UPDATE_POSTED|GUEST_ANSWERED|GUEST_PHOTO_APPROVED)[^)]*\)/g) || [];
  expect(calls.length).toBeGreaterThanOrEqual(Object.keys(NEW).length);
  // Whole words: `emailed` / `emailing` are a flag and a count, not an address.
  for (const c of calls) expect(c).not.toMatch(/\bemail\b|\bnames?\b|\.name\b|guest_name|\bbody\b|\bdraft\b|\.text\b/i);
});
