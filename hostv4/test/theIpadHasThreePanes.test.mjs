// THE IPAD HAS THREE PANES (UX_13; owner 11/25/2026: "Top of pane", three
// panes, "keep shortcuts"; renders approved before the build). Measured:
//   - the layout by width: phone to 600, compact to 1023, split from 1024;
//   - split Guests renders the list pane with its one action in it, and the
//     guest beside it (the first name when none is picked), with the shortcuts;
//   - the phone is unchanged: no panes, the guest stays a sheet;
//   - a shortcut never fires while she types in a field.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GuestsPage from '@app/guestsKit/GuestsPage.jsx';
import { layoutFor, typingIn } from '@app/guestsKit/layout.js';

const ev = { id: 'e1', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: '2027-01-04', guestEstimate: 25, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only', rsvpDeadline: '2026-12-20',
  guests: [{ id: 'g1', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'g2', name: 'Bo Lee', rsvp: '' }] };
const render = (layout) => renderToStaticMarkup(createElement(GuestsPage, { ev, save: () => true, sample: false, nav: null, status: null, onInvite: () => {}, onUpdates: () => {}, layout }));

describe('the iPad has three panes', () => {
  it('chooses the layout by width', () => {
    expect([390, 600, 601, 820, 1023, 1024, 1180, 1366].map(layoutFor)).toEqual(['phone', 'phone', 'compact', 'compact', 'compact', 'split', 'split', 'split']);
  });
  it('split: the list pane holds its one action; the first guest shows beside it, with the shortcuts', () => {
    const html = render('split');
    expect(html).toContain('class="gsplit split"');
    const list = html.slice(html.indexOf('class="listpane"'), html.indexOf('class="gdetail"'));
    expect((list.match(/class="primary"/g) || []).length).toBe(1);
    expect(html).toMatch(/class="gdetail"[^>]*>.*<h2 class="dhead">Ada Pine<\/h2>/);
    expect(html).toContain('data-keys');
    expect(html).toContain('aria-selected="true"');
  });
  it('compact: one pane until a guest is opened', () => {
    const html = render('compact');
    expect(html).toContain('class="gsplit compact"');
    expect(html).not.toContain('class="gdetail');
  });
  it('phone: unchanged, no panes', () => {
    const html = render('phone');
    expect(html).not.toContain('gsplit');
    expect(html).not.toContain('data-keys');
  });
  it('a shortcut never fires in a field', () => {
    expect(['INPUT', 'SELECT', 'TEXTAREA'].every((t) => typingIn({ tagName: t }))).toBe(true);
    expect(typingIn({ tagName: 'BUTTON' })).toBe(false);
    expect(typingIn(null)).toBe(false);
  });
});
