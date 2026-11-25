// THE INVITE SENDS ONE WAY (owner, 11/25/2026: "Use the hostv2 sign-in for
// sending in hostv4"). hostv4 sends the invite only through the steps hostv2
// sends with (lib/inviteSend, lib/inviteBatch), on the account hostv2 signed
// in. This fails if the invite page or its send sheet reaches the network any
// other way, builds its own record of a send, or offers to send an invite
// that is missing the day, the time or the place.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import InvitePage from '../src/InvitePage.jsx';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const read = (f) => readFileSync(join(dir, f), 'utf8');
const imports = (src) => [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
const page = read('InvitePage.jsx');
const sheet = read('SendSheet.jsx');
const missing = { id: 'e1', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: '2027-01-04', startTime: '15:00', startTimeSource: 'derived', guests: [] };
const render = (ev) => renderToStaticMarkup(createElement(InvitePage, { ev, save: () => true, nav: null, status: null }));

describe('the invite sends one way', () => {
  it('the page itself reaches no network: sending is the send sheet', () => {
    expect(imports(page).filter((p) => /api|rsvp|supabase|comm|inviteSend|inviteBatch/i.test(p))).toEqual([]);
    expect(page).not.toMatch(/fetch\(/);
  });
  it('the send sheet sends only through the shared steps', () => {
    const net = imports(sheet).filter((p) => /api\/|commApi|rsvp|supabase|inviteSend|inviteBatch/i.test(p));
    expect(net.sort()).toEqual(['@app/lib/commApi', '@app/lib/inviteBatch', '@app/lib/inviteSend', '@app/lib/supabaseClient']);
    expect(sheet).not.toMatch(/fetch\(|createMessage|\.from\(|\.insert\(|\.update\(/);
    // supabase is read for the session only.
    expect([...sheet.matchAll(/supabase\.(\w+)/g)].map((m) => m[1]).every((x) => x === 'auth')).toBe(true);
    expect(sheet).toMatch(/getSession\(\)/);
    expect(sheet).not.toMatch(/signIn|signUp|signOut/);
  });
  it('every send is recorded through the shared edits, never a hand-built patch', () => {
    expect(sheet).toMatch(/invitesReachedEdit\(/);
    expect(sheet).toMatch(/inviteSentFields\(/);
    expect(sheet).not.toMatch(/invitesSentAt:/);
    expect(sheet).not.toMatch(/patchSavedEvent|saveCustomEvents|localStorage/);
  });
  it('an invite missing the day, the time or the place offers no send: its button adds them in the current app', () => {
    const html = render(missing);
    expect(html).toContain('data-gap="time"');
    const buttons = html.match(/class="primary"[^>]*>[^<]*/g) || [];
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toContain('href="../hostv2/"');
    expect(html).not.toContain('data-open-send');
  });
  it('a ready invite’s one button opens the send sheet', () => {
    const html = render({ ...missing, name: 'Rosa’s Party', startTimeSource: 'host', venueKind: 'venue', venue: 'Elm Hall', venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA' });
    const buttons = html.match(/class="primary"[^>]*>[^<]*/g) || [];
    expect(buttons.length, html.match(/data-gap="\w+"/g)).toBe(1);
    expect(buttons[0]).toContain('data-open-send');
    expect(buttons[0]).toContain('Send the invite');
  });
  it('the words carry the reply link’s place, never a made-up link', () => {
    expect(render(missing)).toContain('[your reply link goes here]');
  });
});
