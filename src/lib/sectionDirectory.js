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

import { BRAND } from './brand';
import { moneyDatesFor } from './moneyDates';
import { spanNights } from './dates';
import { formatPassPrice, PASS_PRICE_CENTS } from './passPrice';

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
// ─── THE DOOR THAT STILL CARRIED THE OLD NAME ───────────────────────────────
// This read 'Ask the Boss' until 2026-09-23 — a leftover from Event Boss, live
// on the rail, the sheet title, two nav rows and the command palette, in an app
// that had already been renamed. The rename swept `Event Boss` and never saw
// `the Boss`, because the guard that proved the sweep read src/App.js only and
// matched the two-word string exactly: the right check against the wrong
// population, and the wrong half of the product.
//
// Derived from BRAND rather than retyped, so the next rename does not have to
// find this line again. `short` is the running-prose form, which is what a
// button label is.
export const ASK_LABEL = `Ask ${BRAND.short}`;

// ONE NAME FOR THE LODGING DOOR AND ITS SHEET (cohesion G3, owner 11/24/2026):
// the door said "Travel & where everyone stays" and the sheet's title said
// "Where everyone stays". The shell's title reads this too.
export const LODGING_LABEL = 'Travel & where everyone stays';

export function sectionGroups(state) {
  // `state || {}` rather than a default parameter: a default only covers
  // `undefined`, so destructuring a NULL state would throw. Nav policy must
  // never be the thing that crashes a render.
  // `passCents`: the device's pass price (lib/passPrice; G86 price test).
  // Absent → $39; null → not yet known, so the row names no price.
  const { event, travel, crab, outdoor, passCents = PASS_PRICE_CENTS } = (state || {});
  const ev = event || {};

  return [
    { title: 'Your plan', rows: [
      { k: 'venue', label: 'Venue', sub: 'The place, address, and town' },
      // "Guests & invite" (owner, 11/24/2026): the invite lives behind this door,
      // and the menu now says so. Same door, same sheet.
      { k: 'guests', label: 'Guests & invite', sub: 'Who’s coming, and what they need' },
      { k: 'food', label: 'The spread & shopping', sub: 'The menu and the store run' },
      { k: 'budget', label: 'Your money', sub: 'Planned, spoken for, and spent' },
      { k: 'vendors', label: 'People you’re hiring', sub: 'Bookings, deposits, day-of arrival' },
      { k: 'space', label: 'Space, seats & helpers', sub: 'Tables, chairs, rentals, who’s helping' },
      // THE FURNITURE-LABEL DEFECT (2026-08-08 drive, fixed 2026-08-21): a
      // five-day trip's day-by-day program rendered inside "Space, seats &
      // helpers / Tables, chairs, rentals" — a full drive missed it entirely.
      // Span-gated door with a name that says what it opens. 'days' is a
      // VIRTUAL kind: goToSection routes it to the space sheet focused on the
      // program block — one surface, two honest doors, no duplicate render.
      ...(spanNights(ev) >= 1 ? [{ k: 'days', label: 'Your days', sub: 'The plan, day by day' }] : []),
      { k: 'seating', label: 'Who sits where', sub: 'The floor plan' },
      { k: 'tasks', label: 'Your checklist', sub: 'Every step, in the order it matters' },
      // CALENDAR (owner, 11/16/2026: week and month toggle): the checklist and
      // vendor dates by date — a view, nothing typed in twice.
      { k: 'calendar', label: 'Calendar', sub: 'Your steps and vendor dates, by week or month' },
      { k: 'decisions', label: 'Calls to make', sub: 'Open choices the plan is waiting on' },
    ] },
    { title: 'Keep it on track', rows: [
      { k: 'risks', label: 'What could go wrong', sub: 'The risks the plan is watching' },
      ...(outdoor ? [{ k: 'rain', label: 'If it rains', sub: 'Your weather backup' }] : []),
      // MESSAGES (owner, 11/20/2026): read-only — what went out, to whom, how,
      // and its real status. Always a door: "did that go out?" is asked of a
      // calm event as much as a busy one, and the empty sheet says so honestly.
      { k: 'messages', label: 'Messages', sub: 'What you’ve sent, and what came of it' },
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
        return { k: 'lodging', label: LODGING_LABEL,
          sub: due.length ? due[0].label.toLowerCase() + ' in ' + due[0].daysLeft + (due[0].daysLeft === 1 ? ' day' : ' days')
            : shortlist ? shortlist + (shortlist === 1 ? ' place on your shortlist' : ' places on your shortlist')
            // Her own list of who stays where (Wanda audit P0-5).
            : (Array.isArray(ev.lodging) && ev.lodging.length) ? ev.lodging.length + (ev.lodging.length === 1 ? ' stay listed' : ' stays listed')
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
      // A TRIP GETS THE DOOR TOO (round 2, 11/16/2026): the sheet is where cost
      // sharing is SET UP for a destination event, but the door showed only once
      // it was already on, and the only other way in is missing from the
      // default layout, so no trip host could reach it.
      ...(ev.costSharing || (travel && travel.relevant) ? [{ k: 'costshare', label: 'Who pays for what', sub: 'Splitting the cost' }] : []),
      // SPLIT THE COSTS (owner, 11/16/2026: "free, just the math"): every
      // event that isn't a trip gets the friends' split; a trip keeps its own.
      ...(!(ev.costSharing || (travel && travel.relevant)) ? [{ k: 'split', label: 'Split the costs', sub: 'Who paid for what, and who owes whom' }] : []),
    ] },
    { title: 'More', rows: [
      { k: 'meaning', label: 'Make it yours', sub: 'The moments that make it personal' },
      // FAMILY LINK (owner, 11/16/2026): a view-only link to the plan.
      { k: 'family', label: 'Share with family', sub: 'A view-only link to the plan' },
      // PER-EVENT CO-HOST (owner, 11/16/2026): plan this one event with someone.
      { k: 'cohosts', label: 'Co-hosts', sub: ev._cohostOf ? 'You’re co-hosting this event' : 'Plan this event with someone' },
      { k: 'ask', label: ASK_LABEL, sub: 'A question, answered from your numbers' },
      { k: 'pass', label: 'The One-Event Pass', sub: formatPassPrice(passCents) ? formatPassPrice(passCents) + ' · one event, no subscription' : 'One event, no subscription' },
      // ONE NAME FOR THIS DESTINATION (host ruling, 2026-08-15). It read
      // "You & settings" on the phone row and "You & your account" everywhere
      // else — same sheet, two names, so a host could not tell they were the
      // same place. "You & settings" won.
      { k: 'settings', label: 'You & settings', sub: 'Your name, area, what it remembers' },
    ] },
  ];
}

/** Total number of doors — the Sections hero's star, and a real derived number. */
export function sectionDoorCount(state) {
  return sectionGroups(state).reduce((n, g) => n + g.rows.length, 0);
}
