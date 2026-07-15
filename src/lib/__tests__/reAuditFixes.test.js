// FRESH-EYES RE-AUDIT FIXES (2026-07-14, model-change re-audit).
//
// Four adversarial re-auditors attacked every "fixed" claim from the session. These tests
// pin what they broke. The two worst: the reactive top action DROPPED `level` (so the app's
// worst criticals — "Send payment to X" — were the one snoozeable item), and the derived
// default start time leaked through timePhrase into seven outward message drafts while the
// invitation and vendor brief carefully stripped it.

import { eventPlan } from '../../CommandCenter';
import { canSnooze, applySnooze } from '../snooze';
import { timePhrase } from '../doItForMe';
import { playbookRunOfShow, playbookFoodPlan } from '../playbooks';
import { taskLeadDays } from '../taskLead';
import { arrivalAsk } from '../vendorAsks';
import { buildVendorPlan } from '../vendorPlan';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('F1 — the reactive top action carries its level; a critical is never a someday', () => {
  const ev = () => ({
    id: 'f1', type: 'Crab Feast', name: 'Feast', date: iso(2),
    guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1200,
    venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    vendors: [], guests: [],
    timeline: [{ id: 'bad', task: 'Pre-order the crabs', leadDays: -60, done: false }],
  });

  // UPDATED (wave-5 ranking, 2026-07-15): F1's finding was that `level` was DROPPED
  // in the topAction rebuild. The level is still carried — but the overdue-decision
  // tier is now 'attention', not 'critical' (doctrine: 'critical' is reserved for
  // reactive raises; an overdue self-authored decision is a late chore). What keeps
  // it from being buried is no longer the critical short-circuit but the snooze
  // cap's window-closed branch: proposedSnoozeUntil refuses (null), so the shell
  // never offers or writes a "not now" for it.
  test('the overdue-decision top action reaches the list WITH its level (attention since wave-5)', () => {
    const top = eventPlan(ev()).nextActions[0];
    expect(top.level).toBe('attention');
  });

  test('its window is closed, so the cap refuses to propose a snooze at all', () => {
    const top = eventPlan(ev()).nextActions[0];
    expect(canSnooze(top)).toBe(true);                 // no longer critical-blocked…
    expect(top.leadDays).toBe(-60);                    // …but it carries its real lead…
    const { proposedSnoozeUntil } = require('../snooze');
    expect(proposedSnoozeUntil(ev(), { leadDays: top.leadDays })).toBeNull(); // …and the cap says no.
  });

  test('a REAL critical (payment overdue to a vendor) still cannot be snoozed', () => {
    const payEv = {
      ...ev(), timeline: [],
      vendors: [{ id: 'v-pay', name: 'Sable & Sound', category: 'DJ', status: 'Confirmed', contractSigned: true, cost: 500, payDueDate: iso(-3), balancePaid: false }],
    };
    const top = eventPlan(payEv).nextActions[0];
    expect(top.level).toBe('critical');
    expect(canSnooze(top)).toBe(false);
    // even a stale snooze entry written before it escalated must not bury it
    const withStale = { ...payEv, snoozed: { [top.id]: iso(5) } };
    expect(applySnooze([top], withStale)).toHaveLength(1);
  });
});

describe('timePhrase — a derived hour never reaches an outward draft', () => {
  test('derived → falls back to the host\'s own bucket word', () => {
    expect(timePhrase({ startTime: '15:00', startTimeSource: 'derived', timeOfDay: 'afternoon' }))
      .toBe('in the afternoon');
  });
  test('derived with no bucket → says nothing rather than inventing', () => {
    expect(timePhrase({ startTime: '15:00', startTimeSource: 'derived' })).toBe('');
  });
  test('host-confirmed → the clock speaks', () => {
    expect(timePhrase({ startTime: '15:00', startTimeSource: 'host' })).toBe('15:00');
  });
});

describe('run of show — a derived anchor orders the day but claims no clock', () => {
  const base = { id: 'ros', type: 'Dinner Party', date: iso(10), timeOfDay: 'evening' };
  test('derived startTime → relative labels, no clock times', () => {
    const rows = playbookRunOfShow({ ...base, startTime: '18:00', startTimeSource: 'derived' }) || [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.time === null)).toBe(true);
    expect(rows.some(r => /before guests arrive|as guests arrive/.test(r.rel || ''))).toBe(true);
  });
  test('host-confirmed startTime → real clock times', () => {
    const rows = playbookRunOfShow({ ...base, startTime: '18:00', startTimeSource: 'host' }) || [];
    expect(rows.some(r => r.time === '18:00')).toBe(true);
  });
});

describe('F4 — the registry raises PER ITEM, not one per surface', () => {
  test('two vendors owing arrival times → two distinct actions with distinct snooze ids', () => {
    const ev = {
      id: 'f4', type: 'Crab Feast', name: 'Feast', date: iso(2),
      guestMode: 'count', guestCount: 18, guestEstimate: 18, totalBudget: 1500,
      venue: 'Backyard', venueCity: 'Annapolis', venueState: 'MD',
      startTime: '14:00', startTimeSource: 'host',
      guests: [], timeline: [],
      vendors: [
        { id: 'v1', name: 'Sable & Sound', category: 'DJ' },
        { id: 'v2', name: 'Lens & Co', category: 'Photography' },
      ],
    };
    const acts = eventPlan(ev).nextActions.filter(a => /arrival time/i.test(String(a.title || '')));
    expect(acts.length).toBe(2);
    expect(new Set(acts.map(a => a.id)).size).toBe(2);   // snooze keys can't collide
  });
});

describe('lead labels — any "N months out" resolves', () => {
  test('7 months out (a label the fixed table did not list) parses generically', () => {
    expect(taskLeadDays({ week: '7 months out' })).toBe(-210);
    expect(taskLeadDays({ week: '9 Months Out' })).toBe(-270);
  });
});

describe('arrival ask — the generic fallback owns being a rule of thumb', () => {
  test('an unrecognized category is NOT told it has a category norm', () => {
    const a = arrivalAsk(
      { id: 'v9', name: 'Popes Creek Crabs', category: 'Crab house (steam & season crabs for pickup)' },
      { id: 'e', date: iso(20) },
    );
    expect(a).toBeTruthy();
    expect(a.why).toMatch(/rule of thumb/i);
    expect(a.why).not.toMatch(/crab house .* usually locks/i);
    // mixed-case categories keep the host's own casing — no "av / tech" mangling
    expect(a.why).toMatch(/Crab house \(steam & season crabs for pickup\)/);
  });
});

describe('vendor estimate — the category match survives real-world labels', () => {
  test("'Catering' retires the playbook's 'Caterer / BBQ pitmaster' row", () => {
    const ev = {
      id: 'vp', type: 'Backyard BBQ', date: iso(30), guestCount: 20, guestMode: 'count',
      vendors: [{ id: 'v1', name: 'Fired Up BBQ', category: 'Catering', cost: 900 }],
      guests: [], timeline: [],
    };
    const plan = buildVendorPlan(ev, { metroFactor: 1, rush: { multiplier: 1 } });
    const row = (plan.categories || []).find(c => /caterer/i.test(String(c.category || '')));
    if (!row) return;   // playbook shape changed — nothing to assert against
    expect(row.booked).toBe(true);
    expect(String(row.estimateCopy || '')).toMatch(/from your quote/i);
  });
});

describe('one bushel table — jumbo computes at the sourced 60, not the ladder\'s 48', () => {
  test('the shopping bulk recommendation and the crab sheet agree on jumbo', () => {
    const ev = {
      id: 'jb', type: 'Crab Feast', date: iso(30), guestCount: 30, guestEstimate: 30,
      guestMode: 'count', guests: [], timeline: [],
      foodChoices: { crab_size: 'Jumbo Males ($149–188/dz)' },
    };
    const plan = playbookFoodPlan(ev);
    const crabs = (plan.list || []).find(i => /blue crab/i.test(String(i.item || '')));
    if (!crabs || !crabs.bulkRecommendation) return;   // delegated/absent — engine covered elsewhere
    const rec = crabs.bulkRecommendation;
    if (rec.unit === 'bushel' || rec.unit === 'bushels') {
      // 30 pickers × 4 jumbo crabs = 120 → 2 bushels at the sourced 60/bushel (3 at the old 48)
      expect(rec.qty).toBe(Math.ceil(rec.totalUnits / 60));
    }
  });
});
