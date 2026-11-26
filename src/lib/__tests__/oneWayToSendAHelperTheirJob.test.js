// ONE WAY TO SEND A HELPER THEIR JOB (B3 day crew, 11/26/2026). hostv2's
// sendHelperJob built the helper's message, picked text or share, recorded the
// handoff in the send ledger and which helpers have a link, and named a failed
// link in plain words. hostv4's "Your day crew" sends the same job, so the parts
// that are not the button live in lib/helperJob and both shells call them.
import { helperJobMessage, helperLinkPatch, helperHandoffPatch, helperMintWhy, crewRows, helperPageBase } from '../helperJob';

const EV = {
  id: 'e-crew', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00',
  venue: '12 Elm Street', guestMode: 'list',
  guests: [
    { id: 'g-maya', name: 'Maya Fenn', phone: '(240) 555-0101', rsvp: 'Yes' },
    { id: 'g-sam', name: 'Sam Ortiz', email: 'sam@example.com', rsvp: 'Yes' },
  ],
  vendors: [], budget: [],
  timeline: [
    { id: 't-ice', task: 'Drinks and ice', owner: 'Maya Fenn', done: false },
    { id: 't-coats', task: 'Coats and parking', owner: 'Sam Ortiz', done: false },
    { id: 't-dish', task: 'Dishes in shifts', owner: 'Jo', done: false },
  ],
};

describe('the message', () => {
  test('a helper with a phone: a text to that number, with their jobs and link', () => {
    const m = helperJobMessage({ event: EV, profile: { name: 'Todd' }, helperId: 'g-maya', code: 'abc', appUrl: 'https://x.test/hostv2/' });
    expect(m.first).toBe('Maya');
    expect(m.channel).toBe('text');
    expect(m.href).toBe('sms:2405550101?&body=' + encodeURIComponent(m.body));
    expect(m.body).toMatch(/Drinks and ice/);
    expect(m.body).toContain('https://x.test/hostv2/?helper=abc');
    expect(m.hasEmail).toBe(false);
  });
  test('a helper with only an email: no text; share, and the email button', () => {
    const m = helperJobMessage({ event: EV, profile: {}, helperId: 'g-sam', code: 'def', appUrl: 'https://x.test/hostv2/' });
    expect(m.channel).toBe('share');
    expect(m.href).toBe(null);
    expect(m.hasEmail).toBe(true);
  });
});

describe('what a send records', () => {
  test('the link ledger: once per helper', () => {
    expect(helperLinkPatch(EV, 'g-maya')).toEqual({ helperLinkIds: ['g-maya'] });
    expect(helperLinkPatch({ ...EV, helperLinkIds: ['g-maya'] }, 'g-maya')).toEqual({});
  });
  test('the handoff: host-attested, by channel, never "sent"', () => {
    const p = helperHandoffPatch(EV, { helperId: 'g-maya', helperName: 'Maya Fenn' }, 'sms', '2026-11-26T13:00:00.000Z');
    // The ledger keys a send by its title (lib/sendLedger sendKey).
    const [[key, row]] = Object.entries(p.sendLedger);
    expect(key).toMatch(/maya fenn/i);
    expect(row).toMatchObject({ status: 'handed_off', attested: true, channel: 'sms', about: { kind: 'helper', id: 'g-maya' } });
  });
  test('a failed link says why, and that nothing was sent', () => {
    expect(helperMintWhy('signed-out', 'Maya')).toBe('Sign in to make Maya’s link. Nothing was sent.');
    expect(helperMintWhy('not-found', 'Maya')).toMatch(/^Maya’s job hasn’t saved to your plan yet/);
    expect(helperMintWhy('network', 'Maya')).toBe('Couldn’t make Maya’s link just now. Nothing was sent.');
  });
});

describe('the crew', () => {
  test('one row per helper: their jobs, and whether their link went out', () => {
    const rows = crewRows({ ...EV, helperLinkIds: ['g-sam'] });
    expect(rows.map((r) => [r.name, r.jobs, r.linkSent])).toEqual([
      ['Maya Fenn', ['Drinks and ice'], false],
      ['Sam Ortiz', ['Coats and parking'], true],
      ['Jo', ['Dishes in shifts'], false],
    ]);
    expect(rows[1].email).toBe(true);
    expect(rows[0].phone).toBe(true);
  });
  test('a helper’s own answer through their link rides on their row', () => {
    const rows = crewRows({ ...EV, helperLinkIds: ['g-maya', 'g-sam'] }, { 'g-maya': { state: 'confirmed' }, 'g-sam': { state: 'declined' } });
    expect(rows.map((r) => r.answer)).toEqual(['confirmed', 'declined', null]);
  });
});

// The helper's page lives in hostv2 (?helper=). publicAppUrl is the page the
// host is on, so from hostv4 a link built on it would open hostv4, which has no
// helper page. Measured: the deploy sets no REACT_APP_PUBLIC_APP_URL.
test('a helper link always opens hostv2, from either shell', () => {
  expect(helperPageBase('https://x.test/ngw-event-planner/hostv4/')).toBe('https://x.test/ngw-event-planner/hostv2/');
  expect(helperPageBase('https://x.test/ngw-event-planner/hostv2/')).toBe('https://x.test/ngw-event-planner/hostv2/');
});
