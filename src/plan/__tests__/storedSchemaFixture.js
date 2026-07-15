// ─── STORED timeline schema fixture (wave-6) ──────────────────────────────────
//
// Events created from a playbook persist their timeline via App.js's
// playbookTimelineEntries (creation ~:12030, app-wide backfill ~:45940). Each stored
// row carries:
//   week:       TitleCase label from the FULL 19-key PHASE_OFFSET vocabulary
//               ('5 Days Out', '3 Weeks Out', '10 Days Out', 'Event Day', …)
//   offsetDays: POSITIVE days-before-event, straight from the playbook milestone
//   …and NO leadDays. That is the schema every reader must be able to read.
//
// App.js is not importable from tests (46k-line component module), so this helper
// mirrors its conversion exactly. PHASE_OFFSET below is a verbatim mirror of
// App.js ~:1833 — if that table changes, the taskLeadVocabulary test (which asserts
// every key resolves in lib/taskLead) is the tripwire.

export const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out': -182,  '5 Months Out': -152,  '4 Months Out': -121,
  '3 Months Out': -91,   '2 Months Out': -61,   '1 Month Out':  -30,
  '3 Weeks Out':  -21,   '2 Weeks Out':  -14,   '10 Days Out':  -10,
  'Week Of':      -7,    '5 Days Out':   -5,    '4 Days Out':   -4,
  '3 Days Out':   -3,    '2 Days Out':   -2,    'Day Before':   -1,
  'Event Day':     0,
};

// Verbatim mirror of App.js offsetDaysToPhase (~:2972).
export const offsetDaysToPhase = (offsetDays) => {
  const target = -(Number(offsetDays) || 0);
  let best = 'Week Of', bestDist = Infinity;
  for (const [week, off] of Object.entries(PHASE_OFFSET)) {
    const d = Math.abs(target - off);
    if (d < bestDist) { bestDist = d; best = week; }
  }
  return best;
};

// Mirror of playbookTimelineEntries' row shape (App.js ~:2995) + the id/done fields
// the creation path adds (~:12036). Deliberately NO leadDays — that's the point.
export function storedTimelineFromPlaybook(playbook) {
  return (playbook.milestones || [])
    .filter((m) => m && m.id !== 'event' && m.category !== 'event' && m.name)
    .map((m, i) => ({
      id: `st-${i}`,
      week: offsetDaysToPhase(m.offsetDays),
      offsetDays: typeof m.offsetDays === 'number' ? m.offsetDays : null,
      task: m.name,
      owner: m.owner === 'host' ? 'Host' : (m.owner || ''),
      notes: '',
      milestoneId: m.id,
      done: false,
    }));
}

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const inDays = (n) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d);
};

// Jest requires at least one test in files it discovers — this file is a fixture module (same convention as f4AssembleRevealFixtures).
test('fixture module loads', () => { expect(true).toBe(true); });
