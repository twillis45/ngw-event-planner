// ─── THE DAY STAGE, SEEDED AROUND ITS CLOCK (cohesion batch A, 11/24/2026) ───
//
// Shared by the rule 4 (host words) and rule 13 (fits the moment) sweeps.
// Two events, both made up:
//   • OWN: the host's own plan (a retirement that is also a 60th, so the
//     two-milestone grounding line renders), with a timed run of show, steps
//     both past their window and due on the day, and vendors not yet confirmed.
//   • WANDA: the built-in sample the cohesion audit captured.
// Each is opened with the browser clock fixed at a named moment: the day
// before, the event day before the first cue, the event day during a cue, and
// two days after. Nothing is sent or signed in to; the fixture's route guard
// answers the mock API.
import { readFileSync } from 'node:fs';
import { settled, goToStage } from './fixtures.mjs';

export const DAY = '2027-03-20';

export const OWN = {
  id: 'cohesion-a-own', name: 'Jordan Avery’s 60th & Retirement', honoree: 'Jordan Avery',
  type: 'Retirement Party', secondaryType: 'Birthday', milestoneBirthday: 60,
  createdAt: '2027-01-02', date: DAY, startTime: '18:00', startTimeSource: 'host',
  venue: 'Elm Court Hall', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 40, guestEstimate: 40, guestCountSource: 'host',
  guests: [], budget: [{ id: 'b-food', category: 'Food', budgeted: 1200, actual: 0 }],
  vendors: [
    { id: 'v-cat', name: 'Maple Street Catering', category: 'Catering', status: 'Booked', cost: 1100, budgetCategory: 'Food', arrivalTime: '16:30' },
    { id: 'v-dj', name: 'DJ Riley Park', category: 'DJ', status: 'Booked', cost: 400, arrivalTime: '17:00' },
  ],
  timeline: [
    { id: 'own-t1', week: 'Week of Feb 22', task: 'Order the memory-table photo prints', done: false },
    { id: 'own-t2', week: 'Week of Mar 15', task: 'Confirm the final headcount with the caterer', done: false },
  ],
  ros: [
    { id: 'own-ros-1', time: '6:00 PM', label: 'Doors open — guests arrive' },
    { id: 'own-ros-2', time: '6:30 PM', label: 'Jordan arrives' },
    { id: 'own-ros-3', time: '7:00 PM', label: 'Dinner' },
    { id: 'own-ros-4', time: '8:00 PM', label: 'Toasts and cake' },
  ],
};

export const EVENTS = [
  { label: 'own plan', custom: OWN },
  { label: 'Wanda sample', id: 'ev-x-wanda' },
];

// The named moments, local time. `during` sits inside the 7:00 PM dinner cue.
export const MOMENTS = {
  dayBefore: '2027-03-19T12:00:00',
  dayBeforeFirstCue: '2027-03-20T17:00:00',
  during: '2027-03-20T19:10:00',
  twoDaysAfter: '2027-03-22T11:00:00',
};

export const boot = async (page, ev, at, theme = 'light') => {
  await page.clock.setFixedTime(new Date(at));
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    if (e.custom) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e.custom]));
      localStorage.setItem('ngw-hostv2-last-event', e.custom.id);
    } else {
      localStorage.setItem('ngw-hostv2-last-event', e.id);
    }
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [ev, theme]);
  await page.goto(`?elegant=1&theme=${theme}`);
  await settled(page);
  await page.waitForTimeout(500);
};

export const openStage = async (page, label) => {
  await goToStage(page, label);
  await settled(page);
  await page.waitForTimeout(500);
};

// The host-words list, read from the one file the engine test also reads.
const RAW = JSON.parse(readFileSync(new URL('../../src/lib/hostWords.json', import.meta.url), 'utf8'));
export const HOST_WORDS = [...RAW.banned, RAW.brokenTemplate].map((b) => ({ word: b.word, re: b.re, flags: b.flags == null ? 'i' : b.flags }));
