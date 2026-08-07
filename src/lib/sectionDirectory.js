// ─── sectionDirectory — the ONE named door list, for every viewport ──────────
//
// EXTRACTED 2026-08-07 from HostShellV2.jsx (the `sections` sheet, ~:12768).
// The list itself is unchanged; what changed is WHERE IT LIVES.
//
// WHY EXTRACT IT. VIEWPORT_PORT_RULING step 3 calls for a persistent section
// rail at tablet-land and above — the structure six of six leaders converge on.
// A rail needs the same rows the Sections sheet renders. Rebuilding that list
// beside the sheet would create a second nav that drifts from the first: add a
// door to one, forget the other, and the app quietly has two answers to "what
// is in my plan". 01_PRODUCT_ARCHITECTURE_GUARDRAILS calls that out by name
// (Duplicate Surface Rule), and the sheet's own comment already claims to be
// "the guaranteed, labeled door to EVERY surface" — a claim only one list can
// keep.
//
// So the rail is not a new surface. It is the SAME directory, projected at a
// viewport where it can stay on screen. The sheet keeps rendering it below
// 1024; the rail renders it above. Both call this function.
//
// PURE AND INJECTED. Every input is plain data the shell already computes
// (`event`, `travel`, `crab`, `outdoor`), so this is testable without a render
// — the same reason responsiveSurface.js is a function rather than an inline
// condition. Layout and nav policy scattered through a 16k-line JSX file cannot
// be pinned by a test, and the failure mode is silent.

import { moneyDatesFor } from './moneyDates';

/**
 * sectionGroups({ event, travel, crab, outdoor }) -> [{ title, rows: [{k, label, sub}] }]
 *
 * `k` is the sheet kind the row routes to. The CALLER owns routing — `lodging`
 * goes through the cockpit and `ask` resets its input, and those are shell
 * concerns, deliberately not encoded here.
 *
 * The CORE EIGHT always have a door, on-track or not. That is the whole point of
 * the directory: before it existed, checklist / decisions / vendors and the rest
 * had no visible entry when the event was calm. Conditional groups
 * (travel / crab / cost-share / rain) appear only when the event actually has
 * them, because a door to an empty surface would be its own kind of lie.
 */
export function sectionGroups(state) {
  // `state || {}` rather than a default parameter: a default only covers
  // `undefined`, so destructuring a NULL state would throw. Nav policy must
  // never be the thing that crashes a render.
  const { event, travel, crab, outdoor } = (state || {});
  const ev = event || {};

  return [
    { title: 'Your plan', rows: [
      { k: 'guests', label: 'Guests', sub: 'Who’s coming, and what they need' },
      { k: 'food', label: 'The spread & shopping', sub: 'The menu and the store run' },
      { k: 'budget', label: 'Your money', sub: 'Planned, spoken for, and spent' },
      { k: 'vendors', label: 'People you’re hiring', sub: 'Bookings, deposits, day-of arrival' },
      { k: 'space', label: 'Space, seats & helpers', sub: 'Tables, chairs, rentals, who’s helping' },
      { k: 'seating', label: 'Who sits where', sub: 'The floor plan' },
      { k: 'tasks', label: 'Your checklist', sub: 'Every step, in the order it matters' },
      { k: 'decisions', label: 'Calls to make', sub: 'Open choices the plan is waiting on' },
    ] },
    { title: 'Keep it on track', rows: [
      { k: 'risks', label: 'What could go wrong', sub: 'The risks the plan is watching' },
      ...(outdoor ? [{ k: 'rain', label: 'If it rains', sub: 'Your weather backup' }] : []),
      // Money-Safe Date Chain: in elegant mode this Sections row is the travel
      // wayfinding, so a closing money deadline surfaces HERE — the one fact
      // that can cost real dollars this week leads the sub.
      // ── A SHORTLIST MUST HAVE A DOOR (click-through audit 2026-07-28) ──
      // This row was gated on travel.relevant ALONE. But a host can build a
      // rental shortlist — or pick a house — on an event the travel engine
      // doesn't consider a travel event, and then the only way back to those
      // houses is the one row on the ask board that raised them. Given the pick
      // now moves real money into `committed`, a surface holding thousands of
      // dollars cannot be reachable by one transient row. Her own saved houses
      // always get a door.
      ...((travel && travel.relevant) || (ev.lodgingOptions || []).length > 0 || ev.lodging ? [(() => {
        const md = moneyDatesFor(ev);
        const due = md.relevant ? md.rows.filter((r) => !r.passed && r.daysLeft <= 14) : [];
        const shortlist = (ev.lodgingOptions || []).length;
        return { k: 'lodging', label: 'Travel & where everyone stays',
          sub: due.length ? due[0].label.toLowerCase() + ' in ' + due[0].daysLeft + (due[0].daysLeft === 1 ? ' day' : ' days')
            : shortlist ? shortlist + (shortlist === 1 ? ' place on your shortlist' : ' places on your shortlist')
            : 'Lodging, rides, arrivals' };
      })()] : []),
      // ── TWO SURFACES THAT HAD NO DOOR (competitive-read audit, 2026-07-30) ──
      // The directory claims to be "a door to EVERY surface", but it carried
      // exactly one travel row — routing to `lodging` — while its sub advertised
      // "Lodging, rides, arrivals". The `air` and `ground` sheets both exist,
      // both are titled, and both RAISE through surfaceRegistry — so on a calm
      // event, where nothing is raised, neither could be reached at all. Same
      // class as the shortlist-without-a-door finding: a surface reachable only
      // from a transient worry row is not reachable.
      ...(travel && travel.relevant && travel.air ? [(() => {
        const unset = (travel.air.roster || []).filter(r => r && !r.arriveDate).length;
        const conflicts = (travel.air.conflicts || []).length;
        return { k: 'air', label: 'Getting here',
          sub: conflicts ? conflicts + (conflicts === 1 ? ' arrival clashes' : ' arrivals clash')
            : unset ? unset + (unset === 1 ? ' hasn’t said when' : ' haven’t said when')
            : 'Flights and arrival times' };
      })()] : []),
      ...(travel && travel.relevant && travel.ground ? [(() => {
        const need = (travel.ground.needRide || []).length;
        const unmatched = (travel.ground.unmatched || []).length;
        return { k: 'ground', label: 'Getting around',
          sub: unmatched ? unmatched + (unmatched === 1 ? ' still needs a ride' : ' still need rides')
            : need ? need + (need === 1 ? ' asked for a ride' : ' asked for rides')
            : 'Rides, pickups, who drives' };
      })()] : []),
      ...(crab && crab.relevant ? [{ k: 'crabs', label: 'The crab order', sub: 'Bushels, pickers, the crab house' }] : []),
      ...(ev.costSharing ? [{ k: 'costshare', label: 'Who pays for what', sub: 'Splitting the cost' }] : []),
    ] },
    { title: 'More', rows: [
      { k: 'meaning', label: 'Make it yours', sub: 'The moments that make it personal' },
      { k: 'ask', label: 'Ask the Boss', sub: 'A question, answered from your numbers' },
      { k: 'pass', label: 'The One-Event Pass', sub: '$39 · one event, no subscription' },
      { k: 'settings', label: 'You & your account', sub: 'Your name, area, what it remembers' },
    ] },
  ];
}

/** Total number of doors — the Sections hero's star, and a real derived number. */
export function sectionDoorCount(state) {
  return sectionGroups(state).reduce((n, g) => n + g.rows.length, 0);
}
