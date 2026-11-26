// The live-check session, 11/26/2026 (live 2981924): signed out, the Updates
// page still asked the server for announcements, guest-threads and
// invite-opens, three 401s, and showed three "sign in" lines. A plan that never
// reached an account has nothing to read there, so Updates says so once and
// asks for nothing; a plan on an account is unchanged.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UpdatesPage from '../src/UpdatesPage.jsx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(path.resolve(here, p), 'utf8');

describe('updates wait for an account', () => {
  it('a plan never on an account: one line and the way to sign in, no sections', () => {
    const html = renderToStaticMarkup(createElement(UpdatesPage, { ev: { id: 'never-synced' }, nav: null, status: null }));
    expect(html).toContain('data-updates-signed-out');
    expect(html).toContain('Open the current app');
    expect(html).not.toContain('Post an update');
    expect(html).not.toContain('Questions');
  });
  it('the page decides by the plan being on an account', () => {
    expect(src('../src/UpdatesPage.jsx')).toMatch(/getLastSyncTime\(ev\.id\)/);
  });
  it('no caller passing no plan makes a request', () => {
    expect(src('../../src/lib/guestUpdatesKit.js')).toMatch(/isAnnouncementsApiConfigured\(\) && eventId\) load\(\)/);
    expect(src('../src/UpdatesPage.jsx')).toMatch(/if \(!isGuestMessagesApiConfigured\(\) \|\| !eventId\) return undefined;/);
  });
});
