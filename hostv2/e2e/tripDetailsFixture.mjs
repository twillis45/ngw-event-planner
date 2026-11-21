// Shared by the trip-details specs (owner pick, 11/21/2026): the Group Trip
// seed, and the lit-primary measure oneLitButtonPerSheet uses.
import { dateIn } from './fixtures.mjs';

export const STEP = 'Send everyone the trip details: the dates, the address, the few things everyone does together, and what each person owes';
export const tripEvent = (id, extra = {}) => ({
  id, name: 'Nashville Weekend', type: 'Group Trip', date: dateIn(40), endDate: dateIn(42),
  createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
  venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
  guestMode: 'list', guestEstimate: 4, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Ana Ruiz' }, { id: 'g2', name: 'Ben Ode' }, { id: 'g3', name: 'Cam Lee' }, { id: 'g4', name: 'Dee Fox' }],
  lodging: { hotelName: 'The Gulch House', from: 'typed off the confirmation' },
  vendors: [
    { id: 'v1', name: 'Pinewood Social bowling', category: 'Activity', status: 'Booked' },
    { id: 'v2', name: 'Biscuit Love brunch', category: 'Restaurant', status: 'Inquired' },
  ],
  costSplit: { people: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cam' }, { id: 'd', name: 'Dee' }],
    expenses: [{ id: 'x1', who: 'a', what: 'the house', amount: 1200 }] },
  budget: [], foodChoices: {},
  timeline: [{ id: `pbt-${id}-t_details`, task: STEP, leadDays: 35, week: '5 weeks out', done: false, owner: '', category: 'planning', phase: 'guest' }],
  ...extra,
});

// Runs in the page: the lit primaries the open sheet renders (oneLitButtonPerSheet's measure).
export const litButtons = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const sh = [...document.querySelectorAll('.sheet')].pop();
  return [...sh.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => (e.innerText || '').trim());
};

