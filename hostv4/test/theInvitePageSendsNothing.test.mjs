// THE INVITE PAGE SENDS NOTHING (owner, 11/25/2026: "start the invite and send
// flow"). Sending needs the plan's reply link, which needs the plan in an
// account; until hostv4 signs in, its invite page writes, previews and saves,
// and its one button opens the current app to send. This fails if the page
// gains a way to send, or builds its edits anywhere but the shared builders.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import InvitePage from '../src/InvitePage.jsx';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'InvitePage.jsx'), 'utf8');
const ev = { id: 'e1', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: '2027-01-04', startTime: '15:00', startTimeSource: 'derived', guests: [] };
const html = renderToStaticMarkup(createElement(InvitePage, { ev, save: () => true, nav: null, status: null }));

describe('the invite page sends nothing', () => {
  it('imports nothing that sends: no email, no reply link, no account write', () => {
    const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports.filter((p) => /inviteBatch|\/api\/|rsvp|supabase|comm/i.test(p))).toEqual([]);
    expect(src).not.toMatch(/sendInvite|fetch\(|navigator\.share/);
  });
  it('changes a plan only through the shared builders', () => {
    expect(src).toMatch(/from '@app\/lib\/guestEdits'/);
    expect(src).toMatch(/saveDraftEdit/);
    expect(src).not.toMatch(/patchSavedEvent|saveCustomEvents|localStorage\.setItem/);
  });
  it('names what is missing before it can go out, and its one button opens the current app', () => {
    expect(html).toContain('data-gap="time"');
    expect(html).toContain('Not confirmed');
    const buttons = html.match(/class="primary"[^>]*>[^<]*/g) || [];
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toContain('href="../hostv2/"');
    expect(buttons[0]).toContain('Send it from the current app');
  });
  it('the words carry the reply link’s place, never a made-up link', () => {
    expect(html).toContain('[your reply link goes here]');
  });
});
