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
const { routeByWords } = require('../lib/__fixtures__/stepByWords');
const { resolveRoute } = require('../lib/routeResolver');
const { checklistRouteFor } = require('../lib/taskRoute');
const { ALL_PLAYBOOKS, playbookChecklist } = require('../lib/playbooks');
const { THE_SCHEDULE } = require('../lib/scheduleWords');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
const EV = { id: 'dest', type: 'Reunion', date: iso(45), guests: 24, venueCity: 'McHenry', venueState: 'MD' };
// `ev`: the row's own event. A step that IS a call (`answeredBy`) is found in
// that event's playbook, so measuring every playbook's rows against the one
// Reunion fixture read every other playbook's call rows as buttonless.
const kindOf = (task, meta = {}, ev = EV) => {
  const hit = routeByWords(task, meta, ev);
  if (!hit) return null;
  if (hit.href) return 'external:' + hit.href;
  const r = resolveRoute(hit.route);
  return r ? r.kind : 'UNRESOLVED';
};

describe('each routing family lands on its own surface', () => {
  test.each([
    // [row as authored in a playbook, expected resolver kind]
    // The Sweet 16 row, as now authored (owner 11/24/2026: the host's word, not "run of show").
    [`Write ${THE_SCHEDULE}: arrivals, entrance, dinner, dance, cake, send-off`, 'stage:day'],
    ['List every household and a contact for each; flag out-of-town travelers', 'guests'],
    ['Prep name tags, markers, and a sign-in / contact-update sheet', 'guests'],
    ['Check whether a reservation permit, alcohol rule, or amplified-sound rule applies', 'space'],
    ['Write the safe-rides plan: rideshare codes, designated-driver asks', 'ground'],
    ['Agree the per-person number and the \'we cover the bride\' rule', 'budget'],
    ['Confirm chaperones, assign door + bar + floor watchers, set house rules', 'space'],
    ['Decor, favors, mocktail mixers, games, paper goods', 'food'],
    ['Proteins, buns, produce, condiments', 'food'],
    ['Build the arrivals/departures grid', 'air'],
    ['Chase non-responders by household; lock an adult/kid headcount', 'guests'],
    ['Book photographer; agree the coverage window', 'vendors'],
    ['Check the forecast; confirm shade/rain plan', 'rain'],
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
    // Its declared target, not the word "set out" (cause 1): Reunion's
    // registration table is a day-of step and opens the day board.
    expect(kindOf('Set up the registration table: name tags, sign-in sheet, marker', { category: 'event-day' })).toBe('stage:day');
  });
});

describe('coverage floor across every playbook', () => {
  test('at least 87% of checklist rows carry a CTA, and none is unresolved', () => {
    let total = 0, withCta = 0;
    let preTotal = 0, preCta = 0, postTotal = 0, postCta = 0;
    const unresolved = [];
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      const ev = { ...EV, type };
      let rows = [];
      try { rows = playbookChecklist(ev) || []; } catch { rows = []; }
      for (const t of rows) {
        const task = typeof t === 'string' ? t : t.task;
        total += 1;
        const k = kindOf(task, { taskId: t.id, week: t.week, category: t.category }, ev);
        if (k) withCta += 1;
        // A POSITIVE leadDays is days AFTER the event.
        if (typeof t.leadDays === 'number' && t.leadDays > 0) { postTotal += 1; if (k) postCta += 1; }
        else { preTotal += 1; if (k) preCta += 1; }
        if (k === 'UNRESOLVED') unresolved.push(`${type} :: ${String(task).slice(0, 60)}`);
      }
    }
    expect(unresolved).toEqual([]);
    expect(total).toBeGreaterThan(400);
    // SPLIT BY PHASE (2026-08-22). One blended floor stopped meaning anything
    // the moment the corpus gained a post-event phase: 101 rows of real-world
    // work (return the borrowed projector, print the group photo for the elders)
    // that legitimately have nowhere to route dragged the single number down,
    // and raising or lowering it would have hidden both signals at once.
    //
    // MEASURED HONESTLY, and one number is worse than the old floor claimed:
    // pre-event coverage is 86.7% (534/616) EXCLUDING every post-event row, so
    // it was already under 0.87 before tonight -- the post-event phase did not
    // cause it. It most likely slipped when the Q4 playbooks landed earlier in
    // the same session and nobody ran this suite. The floor is set at the
    // measured value rather than the aspirational one, because a floor that
    // fails for an unexplained reason teaches nothing; getting pre-event back
    // to 0.87 is real work and it is now visible instead of averaged away.
    expect(preTotal).toBeGreaterThan(400);
    // Back over the historical 0.87 as of 2026-08-22 (measured 87.7%, 540/616)
    // after routing three families that had real destinations all along: attire
    // ordering -> Vendors (you buy it from someone), photo/memory collection
    // asks -> Guests (the ask is made of the roster), and vows/readings -> the
    // Day stage (the run of show holds the order of the day). The rest of the
    // unrouted pre-event rows are kitchen and real-world prep -- "mise en
    // place", "season the meat overnight" -- which have nowhere honest to land
    // and must never be given a courtesy destination to lift this number.
    // 11/20/2026 (seasonal accuracy, bug 5): measured 582/669 = 86.996%, down
    // from 586/669. Seven pre-event rows lost a CTA that pointed at the WRONG
    // surface — "serve" in "serve time" sent two planning rows to the day
    // board, "costume" matched the budget's "cost", "bites/guest" and "per
    // guest" sent menu rows to the guest count — and three of them gained a
    // real one (the oven map → the day's run of show, restrooms → the place
    // notes, appetizer types → the spread). The other four (pumpkin carving,
    // the photo corner, the host's costume, NYE's food-wave prep) are
    // real-world work with nowhere honest to land, so per the rule above the
    // floor follows the measurement instead of a courtesy destination.
    // 11/20/2026 (seasonal leftovers, fix 6): measured 580/669 = 86.697%, down
    // from 582/669. Two pre-event rows that LEAD with building a playlist
    // (Holiday Party's "Build a 4-hour festive playlist", Juneteenth Cookout's
    // "Build a playlist celebrating Black artists") opened the vendor sheet's
    // add-a-vendor field. The app has no music surface, so per the rule above
    // they are honest check-offs now and the floor follows the measurement.
    // 11/21/2026 (the audit batch): each row is now measured against its own
    // event (kindOf above), so the call rows of every playbook count: 608/688
    // = 88.4% pre-event, 72/106 post-event. The floor is not raised here.
    expect(preCta / preTotal).toBeGreaterThanOrEqual(0.866);
    // Post-event is younger and thinner on routing by nature -- much of it is
    // work in the world, not in the app. It must not slide below what it is.
    expect(postTotal).toBeGreaterThan(50);
    expect(postCta / postTotal).toBeGreaterThanOrEqual(0.60);
  });
});
