// ─── CHECKLIST ROUTE RESOLUTION — every emittable CTA resolves ───────────────
// The board-matrix checklist probe's FIRST CATCH (2026-07-27): taskRoute emitted
// `{ stage: 'day' }` — a shape resolveRoute never understood — so every
// "See the day plan" CTA on every event dead-tapped into the toast fallback.
// The route-mapping audit's warning made literal: the nav gate proved routes
// RESOLVE, but nothing proved the routes the checklist actually EMITS are in
// the resolver's vocabulary.
//
// This sweep closes the class the way the gate lesson demands (span every
// producer path, not one example): EVERY playbook's checklist rows, through the
// real checklistRouteFor, against the real resolveRoute — an emitted route that
// resolves to null is a shipped dead tap and fails here.
const { resolveRoute } = require('../lib/routeResolver');
const { checklistRouteFor } = require('../lib/taskRoute');
const { ALL_PLAYBOOKS, playbookChecklist } = require('../lib/playbooks');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };

// A minimal but real event per type; vendors present so the first-undone-vendor
// branch exercises its row-level route rather than the add-vendor fallback.
const eventFor = (type, daysOut) => ({
  id: 'route-sweep', type, date: iso(daysOut), guests: 24,
  vendors: [{ id: 'rs-v1', name: 'Sweep Vendor', category: 'Catering', status: 'Deposit Paid', cost: 900, depositAmt: 200, depositPaid: true, contractSigned: false }],
});

describe('every checklist CTA route resolves', () => {
  // Two horizons: far out (full checklist) and T-1 (day-before/day-of rows
  // surface — where the stage:'day' class lived).
  for (const daysOut of [30, 1]) {
    test(`all playbooks at T-${daysOut}`, () => {
      const dead = [];
      for (const pb of ALL_PLAYBOOKS) {
        const type = pb.label || pb.type || pb.id;
        const ev = eventFor(type, daysOut);
        let rows = [];
        try { rows = playbookChecklist(ev) || []; } catch { rows = []; }
        for (const t of rows) {
          const task = typeof t === 'string' ? t : t.task;
          const meta = typeof t === 'object' ? { week: t.week, category: t.category, taskId: t.id } : {};
          let hit = null;
          try { hit = checklistRouteFor(task, meta, ev); } catch (e) { dead.push(`${type} · "${String(task).slice(0, 50)}" THREW: ${e.message}`); continue; }
          if (!hit) continue; // no CTA is an honest choice (real-world-only work)
          if (!resolveRoute(hit.route)) {
            dead.push(`${type} · "${String(task).slice(0, 50)}" → ${JSON.stringify(hit.route)} resolves NULL`);
          }
        }
      }
      expect(dead).toEqual([]);
    });
  }
});
