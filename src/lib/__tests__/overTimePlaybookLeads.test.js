// ─── Wave-5 over-time: playbook date/lead honesty ─────────────────────────────
//
// 2026-07-15. Three small leaks in the lead pipeline:
//   1. playbookMilestones built a LOCAL midnight and formatted it with
//      toISOString().slice — a day early east of Greenwich. Now decisionDueDate's
//      local formatter, same as the decision board.
//   2. The derived fa-caterer task persisted only prose `week` — the one generated
//      row without a numeric leadDays, so readers fell back to the lossy label.
//   3. decisionIntelligence kept a SECOND private /T-(\d+)d/ parser after
//      lib/taskLead became the one lead reader. It now delegates (sign-flipped).

import { ALL_PLAYBOOKS, playbookChecklist, playbookMilestones } from '../playbooks';
import { taskLeadDays } from '../taskLead';
import { resolveDecisions } from '../experience/decisionIntelligence';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };

describe('playbookMilestones dueDate is a LOCAL calendar date', () => {
  const withMilestones = ALL_PLAYBOOKS.filter((pb) => Array.isArray(pb.milestones) && pb.milestones.length);

  test('there are playbooks with milestones to check', () => {
    expect(withMilestones.length).toBeGreaterThan(0);
  });

  test('every dueDate equals event date − offsetDays computed in LOCAL time', () => {
    const eventDate = '2026-08-15';
    for (const pb of withMilestones) {
      const ms = playbookMilestones({ id: 'e', type: pb.type, date: eventDate });
      for (const m of ms) {
        // The expectation is built the LOCAL way — in a UTC+ zone the old
        // toISOString path returned the previous day and this fails.
        const d = new Date(eventDate + 'T00:00:00');
        d.setDate(d.getDate() - m.offsetDays);
        expect({ pb: pb.type, id: m.id, dueDate: m.dueDate })
          .toEqual({ pb: pb.type, id: m.id, dueDate: iso(d) });
      }
    }
  });

  test('no date on the event → no invented dueDate', () => {
    const pb = withMilestones[0];
    for (const m of playbookMilestones({ id: 'e', type: pb.type })) {
      expect(m.dueDate).toBeNull();
    }
  });
});

describe('the derived fa-caterer task carries its numeric lead', () => {
  // Mirror the module's own food-approach lever (FOOD_APPROACH_DECISIONS +
  // CATERER_OPTION_RE are private): find a type whose lever decision offers a
  // caterer-ish option, pick it, and check the derived task.
  const LEVER_IDS = ['sourcing', 'help', 'food_style', 'menu'];
  const CATERER_RE = /cater|private chef|\bchef\b|drop-?off|order(ed|-in)?\b|pizza|tray|takeout|take-?out|restaurant/i;

  test('every generated fa-caterer row persists leadDays = -7, readable by taskLead', () => {
    const found = [];
    for (const pb of ALL_PLAYBOOKS) {
      const lever = LEVER_IDS
        .map((id) => (pb.decisions || []).find((d) => d && d.id === id))
        .find((d) => d && Array.isArray(d.options) && d.options.some((o) => CATERER_RE.test(String(o))));
      if (!lever) continue;
      const pick = lever.options.find((o) => CATERER_RE.test(String(o)));
      const ev = { id: 'e', type: pb.type, date: inDays(30), guestCount: 20, guestMode: 'count', foodChoices: { [lever.id]: pick } };
      const row = (playbookChecklist(ev) || []).find((r) => String(r.id).endsWith('fa-caterer'));
      if (!row) continue; // this playbook authors its own caterer task — branch deduped
      found.push(pb.type);
      expect({ pb: pb.type, leadDays: row.leadDays, read: taskLeadDays(row) })
        .toEqual({ pb: pb.type, leadDays: -7, read: -7 });
    }
    // The branch must actually fire somewhere, or this suite is checking air.
    expect(found.length).toBeGreaterThan(0);
  });
});

describe('decisionIntelligence timing runs through the one lead reader', () => {
  test('a decision timed inside the phase window outranks one far outside it', () => {
    const playbook = {
      decisions: [
        { id: 'far', label: 'Order far ahead', when: 'T-90d', blocks: ['food'] },
        { id: 'near', label: 'Final headcount to caterer', when: 'T-7d', blocks: ['food'] },
      ],
    };
    // preparation phase window is 1–7 days out: T-7d matches, T-90d does not.
    const ranked = resolveDecisions(playbook, { role: 'host', phase: 'preparation' });
    expect(ranked[0].id).toBe('near');
  });

  test("'T0' still reads as day-of (matches the setup window)", () => {
    const playbook = {
      decisions: [
        { id: 'dayof', label: 'Rain call', when: 'T0', blocks: ['logistics'] },
        { id: 'early', label: 'Book venue', when: 'T-60d', blocks: ['logistics'] },
      ],
    };
    const ranked = resolveDecisions(playbook, { role: 'coordinator', phase: 'setup' });
    expect(ranked[0].id).toBe('dayof');
  });

  test('undated decisions stay always-relevant (null lead, not zero)', () => {
    const playbook = { decisions: [{ id: 'loose', label: 'Theme?', when: '', blocks: ['guests'] }] };
    const ranked = resolveDecisions(playbook, { role: 'host', phase: 'planning' });
    expect(ranked.map((d) => d.id)).toContain('loose');
  });
});
