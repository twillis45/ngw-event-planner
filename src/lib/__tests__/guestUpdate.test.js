// GUEST-UPDATE-1 — guest-safe update draft contract. Conservative, editable,
// bracketed unknowns, structurally leak-free.

import { draftGuestUpdate } from '../doItForMe';
import { buildVendorBriefPayload } from '../vendorBrief';

const BANNED = /load-in|load in|power|catering setup|\bCOI\b|insurance|payment|deposit|budget|planner|internal|private|invoice|contract/i;
const TYPES = ['general', 'parking', 'rain', 'time', 'location', 'arrival'];

const ev = (over = {}) => ({
  id: 'e-gu', recordKind: 'host_event', name: 'Army Retirement Celebration', type: 'Retirement Party',
  date: '2026-08-01', venueKind: 'venue', venue: 'VFW Post 3150', venueCity: 'Alexandria',
  guestMode: 'count', guestCount: 60, guests: [], budget: [], timeline: [],
  vendors: [{ id: 'v1', name: 'Capital Rotisserie Catering', category: 'Catering', contact: 'dana@rotisserie.com', phone: '555-0100', cost: 1800, depositAmt: 500 }],
  ...over,
});

test('1+2 · general update uses the event name; degrades gracefully without one', () => {
  expect(draftGuestUpdate(ev()).body).toContain('for Army Retirement Celebration');
  const anon = draftGuestUpdate(ev({ name: '' }));
  expect(anon.body).toMatch(/^Hi everyone — a quick event update\./);
  expect(anon.subject).toBe('Event update');
});

test('3+4 · parking uses parkingNotes only when present, bracketed prompt otherwise', () => {
  const withNotes = draftGuestUpdate(ev({ parkingNotes: 'Lot behind the post; overflow on Fayette St.' }), { type: 'parking' });
  expect(withNotes.body).toContain('Lot behind the post; overflow on Fayette St.');
  const without = draftGuestUpdate(ev(), { type: 'parking' });
  expect(without.body).toContain('[Add parking details here]');
  expect(without.body).not.toMatch(/parking is available|free parking/i);
});

test('5+6 · rain uses the saved plan verbatim and never claims rain is confirmed', () => {
  const d = draftGuestUpdate(ev({ rainPlan: 'Move the ceremony into the main hall.' }), { type: 'rain' });
  expect(d.body).toContain('We’re still on.');
  expect(d.body).toContain('Move the ceremony into the main hall.');
  expect(d.body).not.toMatch(/rain is confirmed|will rain/i);
  expect(draftGuestUpdate(ev(), { type: 'rain' }).body).toContain('[Add the backup plan here]');
});

test('7 · location uses venue + city only when present', () => {
  expect(draftGuestUpdate(ev(), { type: 'location' }).body).toContain('The event is at VFW Post 3150 in Alexandria.');
  expect(draftGuestUpdate(ev({ venue: '', venueCity: '' }), { type: 'location' }).body).toContain('[Add the location here]');
});

test('8+9 · every type on every shape is structurally leak-free', () => {
  const shapes = [ev(), ev({ parkingNotes: 'Street parking', rainPlan: 'Garage' }), ev({ name: '', venue: '' })];
  shapes.forEach((e) => TYPES.forEach((type) => {
    const d = draftGuestUpdate(e, { type });
    const all = d.subject + ' ' + d.body;
    expect(all).not.toMatch(BANNED);
    expect(all).not.toMatch(/valet|shuttle|staff will|main entrance/i);
    expect(all).not.toContain('dana@rotisserie.com');
    expect(all).not.toContain('555-0100');
    expect(all).not.toContain('Capital Rotisserie');
  }));
});

test('13 · guest update content cannot reach the public vendor brief payload', () => {
  const e = ev({ rainPlan: 'Move the ceremony into the main hall.' });
  const payload = JSON.stringify(buildVendorBriefPayload(e.vendors[0], e, [], null));
  expect(payload).not.toContain('Hi everyone');
  expect(payload).not.toContain('[Add the update here]');
});
