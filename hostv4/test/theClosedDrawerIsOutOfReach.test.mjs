// The rotation matrix, 11/26/2026 (live 2981924, WebKit): in the compact layout
// (an iPad held upright, a phone turned sideways) the closed places drawer is
// only slid off screen, so Tab and VoiceOver still walk through its buttons.
// Closed, it is inert; open, or on the split layout, it is reachable.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Sidebar from '../src/Sidebar.jsx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

const ev = { id: 'e1', name: 'Test dinner', guestEstimate: 12, guests: [] };
const render = (hidden) => renderToStaticMarkup(createElement(Sidebar, { ev, date: 'Thursday', tabs: [], here: null, onTab: () => {}, onGuests: () => {}, onClose: () => {}, hidden }));

describe('the closed drawer is out of reach', () => {
  it('is inert while closed', () => {
    expect(render(true)).toMatch(/<aside class="side"[^>]*\binert=""/);
  });
  it('is reachable when open or beside the page', () => {
    expect(render(false)).not.toMatch(/\binert/);
  });
  it('the shell hides it only in compact with the drawer closed', () => {
    const src = readFileSync(path.resolve(here, '../src/HostShellV4.jsx'), 'utf8');
    expect(src).toMatch(/hidden=\{layout === 'compact' && !sideOpen\}/);
  });
});
