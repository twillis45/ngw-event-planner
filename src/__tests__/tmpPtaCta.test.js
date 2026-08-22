// TEMPORARY — DELETE. Lists PTA checklist rows without a CTA.
const { resolveRoute } = require('../lib/routeResolver');
const { checklistRouteFor } = require('../lib/taskRoute');
const { playbookChecklist } = require('../lib/playbooks');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
const EV = { id: 'dest', type: 'PTA / Booster Fundraiser', date: iso(45), guests: 250, venueCity: 'McHenry', venueState: 'MD' };

test('list rows without CTA', () => {
  const rows = playbookChecklist(EV) || [];
  const misses = [];
  for (const t of rows) {
    const task = typeof t === 'string' ? t : t.task;
    const hit = checklistRouteFor(task, { week: t.week, category: t.category }, EV);
    const k = hit ? (hit.href ? 'external' : (resolveRoute(hit.route) || {}).kind) : null;
    if (!k) misses.push(task);
  }
  console.log('PTA_ROWS', rows.length, 'NO_CTA', misses.length, JSON.stringify(misses, null, 1));
});
