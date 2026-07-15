// ─── Wave-6: the ONE lead reader covers the FULL runtime vocabulary ───────────
//
// The stored timeline schema writes TitleCase labels from App.js's 19-key PHASE_OFFSET
// table plus positive offsetDays; playbookChecklist writes taskPhaseLabel's prose plus
// leadDays. taskLeadDays must resolve EVERY one of them — a label that resolves to null
// is a task that can never be overdue, which is how this bug family started.

import { taskLeadDays } from '../taskLead';
import { ALL_PLAYBOOKS, playbookChecklist } from '../playbooks';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };

// Verbatim mirror of App.js PHASE_OFFSET (~:1833) — App.js is not importable from
// tests. If a key is added there without teaching lib/taskLead, this test trips.
const APP_PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out': -182,  '5 Months Out': -152,  '4 Months Out': -121,
  '3 Months Out': -91,   '2 Months Out': -61,   '1 Month Out':  -30,
  '3 Weeks Out':  -21,   '2 Weeks Out':  -14,   '10 Days Out':  -10,
  'Week Of':      -7,    '5 Days Out':   -5,    '4 Days Out':   -4,
  '3 Days Out':   -3,    '2 Days Out':   -2,    'Day Before':   -1,
  'Event Day':     0,
};

describe("every key App.js's PHASE_OFFSET table holds resolves to a finite lead", () => {
  test.each(Object.entries(APP_PHASE_OFFSET))('%s', (week, offset) => {
    const lead = taskLeadDays({ week });
    expect(Number.isFinite(lead)).toBe(true);
    // Within 1 day of the table's own claim ('1 Month Out' is -31 in the prose table
    // vs -30 in PHASE_OFFSET — the label's own imprecision, documented in taskLead.js).
    expect(Math.abs(lead - offset)).toBeLessThanOrEqual(1);
  });
});

describe('every label playbookChecklist emits resolves — WITHOUT its leadDays crutch', () => {
  test('across all playbooks, the prose week alone carries a finite lead', () => {
    const seen = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const ev = { id: 'e', type: pb.type, date: inDays(45), guestCount: 12, guestMode: 'count' };
      for (const row of playbookChecklist(ev) || []) {
        if (!row.week) continue; // a task with no when has no label claim to check
        seen.add(row.week);
        const labelOnly = { week: row.week }; // strip leadDays/when — the label must stand alone
        const lead = taskLeadDays(labelOnly);
        expect({ pb: pb.type, week: row.week, finite: Number.isFinite(lead) })
          .toEqual({ pb: pb.type, week: row.week, finite: true });
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(3); // non-vacuous: real vocabulary was exercised
  });
});

describe('the stored schema: offsetDays is the 2nd-priority lead source', () => {
  test('positive offsetDays flips sign', () => {
    expect(taskLeadDays({ offsetDays: 5 })).toBe(-5);
    expect(taskLeadDays({ offsetDays: 0 })).toBe(0); // +0, never -0
  });
  test('an authored leadDays still wins over offsetDays', () => {
    expect(taskLeadDays({ leadDays: -3, offsetDays: 5 })).toBe(-3);
  });
  test('offsetDays wins over the TitleCase label it was bucketed into', () => {
    // Stored rows keep the exact milestone timing; the label is a display bucket.
    expect(taskLeadDays({ week: 'Week Of', offsetDays: 10 })).toBe(-10);
  });
  test('a non-numeric offsetDays falls through instead of poisoning the lead', () => {
    expect(taskLeadDays({ offsetDays: null, week: '5 Days Out' })).toBe(-5);
    expect(taskLeadDays({ offsetDays: '5', week: '5 Days Out' })).toBe(-5); // strings are not trusted
  });
});

describe('generic day/week/month regexes keep future labels from regrowing dead spots', () => {
  test.each([
    ['6 days out', -6],
    ['9 days out', -9],
    ['1 day out', -1],
    ['4 weeks out', -28],
    ['1 week out', -7],
    ['7 months out', -210],
  ])('%s → %i', (week, lead) => {
    expect(taskLeadDays({ week })).toBe(lead);
  });

  test('an unknown label is still null, NOT zero', () => {
    expect(taskLeadDays({ week: 'whenever' })).toBeNull();
    expect(taskLeadDays({ week: 'out' })).toBeNull();
  });
});
