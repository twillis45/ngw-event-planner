// THE GUESTS BUTTON FOLLOWS THE PLAN (owner, 11/25/2026: lock the count is "the
// Guests page's bottom button after the reply-by date, and nowhere else"). One
// button, by state: review the invite until it's out, then nudge whoever has
// not replied, and once the reply-by date passes, lock the count.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GuestsPage from '../src/GuestsPage.jsx';

const day = (n) => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const answered = { id: 'e1', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: day(30), guestEstimate: 20, guestMode: 'list', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'adults_only' };
const guests = [
  { id: 'g1', name: 'Ada Pine', rsvp: 'Yes', invitedAt: day(-10), email: 'ada@example.test' },
  { id: 'g2', name: 'Bo Lee', rsvp: '', invitedAt: day(-10), email: 'bo@example.test' },
  { id: 'g3', name: 'Cy Ng', rsvp: '', invitedAt: day(-10), phone: '5555550123' },
];
const button = (ev) => {
  const html = renderToStaticMarkup(createElement(GuestsPage, { ev, save: () => true, sample: false, nav: null, status: null, onInvite: () => {} }));
  const b = html.match(/<div class="action">(?:<button|<a)[^>]*>([^<]*)/);
  return b ? b[1].replace(/&#x27;|’/g, '’') : null;
};

describe('the Guests button follows the plan', () => {
  it('reviews the invite until it is out', () => {
    expect(button({ ...answered, rsvpDeadline: day(10), guests: guests.map(({ invitedAt, ...g }) => g) })).toBe('Review your invite');
  });
  it('nudges whoever has not replied, before the reply-by date', () => {
    expect(button({ ...answered, rsvpDeadline: day(10), invitesSentAt: day(-10), guests })).toBe('Nudge the 2 who haven’t replied');
    expect(button({ ...answered, rsvpDeadline: day(10), invitesSentAt: day(-10), guests: guests.slice(0, 2) })).toBe('Nudge the one who hasn’t replied');
  });
  it('locks the count once the reply-by date has passed, and not before', () => {
    expect(button({ ...answered, rsvpDeadline: day(-1), invitesSentAt: day(-10), guests })).toBe('Lock the count');
    expect(button({ ...answered, rsvpDeadline: day(0), invitesSentAt: day(-10), guests })).not.toBe('Lock the count');
  });
  it('once locked, the button moves on', () => {
    const b = button({ ...answered, rsvpDeadline: day(-1), invitesSentAt: day(-10), guests, guestMode: 'count', guestCount: 14 });
    expect(b).not.toBe('Lock the count');
  });
  it('nobody left to nudge and nothing to lock: no button', () => {
    expect(button({ ...answered, rsvpDeadline: day(10), invitesSentAt: day(-10), guests: [guests[0]] })).toBe(null);
  });
});
