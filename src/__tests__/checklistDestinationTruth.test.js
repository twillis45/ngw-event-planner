// ─── CHECKLIST DESTINATIONS — the RIGHT sheet, not merely a real one ─────────
//
// Host ask 2026-07-28: "have we created the CTAs and tested good destinations
// for checklist?" The existing sweep (checklistRouteResolution) proves every
// emitted route RESOLVES — the route-mapping audit's own warning was that a
// resolve gate proves "a real sheet", never "the RIGHT sheet" (resolveRoute's
// fall-through catches silently land Planning→tasks, Event-Details→Venue).
//
// This pins the destination KIND for representative rows of every routing
// family, so a regex widened later can't quietly re-point a row at the wrong
// surface. Plus a coverage floor: the 2026-07-28 probe measured 83% of all
// playbook rows carrying a CTA (402/486) — rows without one are real-world
// work (kitchen prep), which stays honest, but the floor must not slide back.
// After the same-day coverage wave it stands at 87% (423/486).
const { resolveRoute } = require('../lib/routeResolver');
const { checklistRouteFor } = require('../lib/taskRoute');
const { ALL_PLAYBOOKS, playbookChecklist } = require('../lib/playbooks');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
const EV = { id: 'dest', type: 'Reunion', date: iso(45), guests: 24, venueCity: 'McHenry', venueState: 'MD' };
const kindOf = (task, meta = {}) => {
  const hit = checklistRouteFor(task, meta, EV);
  if (!hit) return null;
  if (hit.href) return 'external:' + hit.href;
  const r = resolveRoute(hit.route);
  return r ? r.kind : 'UNRESOLVED';
};

describe('each routing family lands on its own surface', () => {
  test.each([
    // [row as authored in a playbook, expected resolver kind]
    ['Write the run-of-show: arrivals, entrance, dinner, dance, cake, send-off', 'stage:day'],
    ['List every household and a contact for each; flag out-of-town travelers', 'guests'],
    ['Prep name tags, markers, and a sign-in / contact-update sheet', 'guests'],
    ['Check whether a reservation permit, alcohol rule, or amplified-sound rule applies', 'space'],
    ['Write the safe-rides plan: rideshare codes, designated-driver asks', 'ground'],
    ['Agree the per-person number + "we cover the bride" rule in writing', 'budget'],
    ['Confirm chaperones, assign door + bar + floor watchers, set house rules', 'space'],
    ['Decor, favors, mocktail mixers, games, paper goods', 'food'],
    ['Proteins, buns, produce, condiments', 'food'],
    ['Build the arrivals/departures grid', 'air'],
    ['Chase non-responders by household; lock an adult/kid headcount', 'guests'],
    ['Book the photographer; agree the coverage window', 'vendors'],
    ['Check the forecast; confirm a rain plan', 'rain'],
    ['Reserve any tents, extra tables/chairs, or a bounce house', 'space'],
  ])('"%s" → %s', (task, expected) => {
    expect(kindOf(task)).toBe(expected);
  });

  test('the visitors-bureau row keeps its EXTERNAL destination, city-scoped', () => {
    const k = kindOf('Call the destination’s visitors bureau — it’s free');
    expect(k).toMatch(/^external:https:\/\//);
    expect(k).toMatch(/McHenry/);
  });

  test('real-world kitchen work still honestly has NO CTA', () => {
    expect(kindOf('Mise en place: chop, marinate, portion, label containers')).toBe(null);
    expect(kindOf('Cook anything that’s better reheated (braises, stews, soups)')).toBe(null);
  });

  test('a day-of row goes to the day board, never a planning sheet', () => {
    expect(kindOf('Set out the to-go containers', { category: 'event-day' })).toBe('stage:day');
  });
});

describe('coverage floor across every playbook', () => {
  test('at least 87% of checklist rows carry a CTA, and none is unresolved', () => {
    let total = 0, withCta = 0;
    const unresolved = [];
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      const ev = { ...EV, type };
      let rows = [];
      try { rows = playbookChecklist(ev) || []; } catch { rows = []; }
      for (const t of rows) {
        const task = typeof t === 'string' ? t : t.task;
        total += 1;
        const k = kindOf(task, { week: t.week, category: t.category });
        if (k) withCta += 1;
        if (k === 'UNRESOLVED') unresolved.push(`${type} :: ${String(task).slice(0, 60)}`);
      }
    }
    expect(unresolved).toEqual([]);
    expect(total).toBeGreaterThan(400);
    expect(withCta / total).toBeGreaterThanOrEqual(0.87);
  });
});
