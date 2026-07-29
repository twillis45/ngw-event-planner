// ─── Task routing — every checklist step lands on its actual item ────────────
// (Routing audit 2026-07-27, host report "checklist tasks don't go to the
// actual item".) Two producers, ONE authority: every route here is a plain
// route object resolveRoute understands, swept by ctaSourceOfTruth — never a
// hand-held setSheet that bypasses the resolver (the old checklistActionFor's
// exact defect, alongside its keyword-missed rows getting nothing at all).

import { isVendorBooked } from './workstreams';
import { venueFor } from './venueFor';

// The first vendor row still needing the host — the row-level rule the
// Vendors deep-link doctrine requires (not the sheet top).
const firstUndoneVendorRoute = (event) => {
  const vs = ((event && event.vendors) || []).filter((v) => v && String(v.name || '').trim());
  const undone = vs.find((v) => !isVendorBooked(v)
    || (Number(v.depositAmt) > 0 && !v.depositPaid) || v.coiStatus === 'required');
  const target = undone || vs[0];
  return target ? { tab: 'Vendors', vendorId: target.id } : { tab: 'Vendors', focusField: 'vendor-add' };
};

/**
 * Canonical milestone/task route producer (moved from CommandCenter.jsx so the
 * V2 shell can use it without dragging the planner bundle along).
 * FIELD-DRIFT FIX: the fallback used to emit `timelineId` while resolveRoute
 * and routeUpNext read `taskId` — it passed the audit yet dropped the focus.
 * Both names ride now so every reader lands on the exact row.
 */
export function milestoneActionRoute(label, event, timelineId) {
  const s = String(label || '').toLowerCase();
  const DOMAINS = [
    { re: /guest|invite|rsvp|head\s?count|\bseat\b/, route: () => ({ tab: 'Guests', focusField: 'guests-entry' }) },
    { re: /budget|deposit|payment|\bpay\b|\bcost|spend|quote|invoice/, route: () => ({ tab: 'Budget', focusField: 'hsp-budget' }) },
    { re: /vendor|cater|venue|photograph|\bdj\b|florist|rental|baker|bartend|\bbook\b/, route: () => firstUndoneVendorRoute(event) },
    { re: /food|menu|shop|grocer|drink|supplies|seating/, route: () => ({ tab: 'Planning', focusField: 'food-plan' }) },
    // Families the old V2-only keyword router had that this one lacked
    // (audit gap 2): weather → the rain plan; physical space/helpers → the
    // space sheet. Both are real resolver targets, not sheet-top guesses.
    { re: /\bforecast|weather|rain\b/, route: () => ({ tab: 'Event Details', focusField: 'rain-plan' }) },
    { re: /\bcanop|tent|chairs|tables?|shade\b|helper|point person|in charge/, route: () => ({ tab: 'Event Details', focusField: 'space' }) },
  ];
  const hits = DOMAINS.map((d) => ({ d, at: s.search(d.re) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
  if (hits.length) return hits[0].d.route();
  return { tab: 'Timeline', taskId: timelineId, timelineId };
}

/**
 * The checklist row's deep link: the host-tuned voice of the old V2 keyword
 * router, re-seated on resolver routes (row-level where the registry supports
 * it), with milestoneActionRoute as the fallback so a keyword miss still lands
 * somewhere real. Returns { label, route } or null (day-before kitchen prep
 * is real-world work with no app surface — honest check-off, no CTA).
 */
export function checklistRouteFor(task, meta = {}, event = null) {
  const t = String(task || '').toLowerCase();
  const wk = String((meta && meta.week) || '').toLowerCase();
  const dayOf = (meta && meta.category) === 'event-day' || /day of\b|day-of/.test(wk);
  if (dayOf || /\bfire[s]? the pit|light the pit|set up (the )?canop|set out (foil|to-go)|\bserved?\b|bless the food|scrape the grill|pack (up|leftovers|the)|fold (the )?canopies|works batches\b/.test(t))
    // The resolver's day-stage vocabulary — `{ stage: 'day' }` was a shape
    // resolveRoute never understood (no tab, no focusField → null), so EVERY
    // "See the day plan" CTA dead-tapped into the toast fallback. Caught by the
    // board-matrix checklist probe's first run (2026-07-27).
    return { label: 'See the day plan', route: { tab: 'Event Day Schedule' } };
  // ── COVERAGE WAVE (host ask 2026-07-28, probe: 79% of rows had a CTA) ──────
  // These land ABOVE the kitchen-prep null because none of them is ever a
  // cooking row — "prep the name tags" is guest-list work, and the /prep/ rule
  // below was swallowing it. Each destination is real resolver vocabulary.
  if (/run[- ]of[- ]show|order of events|write the run\b/.test(t))
    return { label: 'Build the day', route: { tab: 'Event Day Schedule' } };
  if (/every household|households\b|contact for each|sign-?in sheet|contact[- ]update|name tags?/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  // Permits, alcohol rules, sound ordinances are PLACE facts — the house-rules note.
  if (/\bpermit\b|alcohol rule|amplified[- ]sound|noise ordinance/.test(t))
    return { label: 'Open the place rules', route: { focusField: 'house-rules' } };
  if (/safe[- ]rides?|designated[- ]driver|rideshare code/.test(t))
    return { label: 'Open rides', route: { focusField: 'ground' } };
  // A per-person share is a MONEY agreement, not a vendor booking.
  if (/per[- ]person\b.{0,40}(number|cost|amount|budget)|who pays|we cover the\b/.test(t))
    return { label: 'Open your money', route: { tab: 'Budget', focusField: 'hsp-budget' } };
  // Watchers, chaperones and house rules are the helper/place assignments.
  if (/chaperones?|floor watchers?|door watch|assign .{0,14}(door|bar|floor)|house rules/.test(t))
    return { label: 'Assign it', route: { tab: 'Event Details', focusField: 'space' } };

  // The agenda / daily flow IS the day board — several conference and retreat
  // rows were falling through to nothing.
  if (/\bagenda\b|daily flow|order across nights/.test(t))
    return { label: 'Build the day', route: { tab: 'Event Day Schedule' } };
  // THE ACT BEATS THE INVENTORY (found live on the hero, 2026-07-28). Venue rows
  // are written as "reserve the pavilion and confirm what it includes (tables,
  // grills, power, parking)" — the trailing list is what you CHECK once you have
  // the space, not the job. Matching /parking/ first sent a booking row to the
  // parking note, and once the hero stopped saying "Do this" the button read
  // "Open the parking note" on a row about reserving a pavilion. A leading
  // reserve/book verb wins; a row that is only about parking still lands here.
  const RESERVES_A_SPACE = /\b(reserve|book|secure|lock in)\b[^.;]{0,40}\b(hall|space|room|pavilion|shelter|site|center|centre|venue|park)\b/;
  if (/\bparking\b/.test(t) && !RESERVES_A_SPACE.test(t))
    return { label: 'Open the parking note', route: { focusField: 'parking-notes' } };
  // Crabs have their own planning surface in the resolver's vocabulary.
  if (/\bcrabs?\b|crab house|crawfish/.test(t))
    return { label: 'Open the crab plan', route: { focusField: 'crab-plan' } };
  // ── THE GETTING-HERE BRIEF IS TRAVEL, NOT THE GUEST LIST ──────────────────
  // Host report 2026-07-28: "Send guests the getting-here info — airport, hotel,
  // transport, cutoff dates" landed on Open guests. No specific rule matched it,
  // so it fell through to milestoneActionRoute, whose FIRST domain is
  // /guest|invite|rsvp|.../ — and the bare word "guests" in "Send guests…" won.
  // That is the fall-through-catch trap the routing audit already recorded:
  // a broad domain matcher silently eats a task that is about something else
  // entirely. The word "guests" here names the AUDIENCE, not the destination.
  //
  // Two shapes, both landing on Travel & where everyone stays:
  //   · the brief itself — "getting-here info", "travel details", "how to get here"
  //   · a task naming the airport ALONGSIDE lodging or transport, which is the
  //     trip brief by description even when it isn't called one
  if (/getting[- ]here|travel (info|details|brief|plan)\b|how to get (here|there)|arrival info/.test(t)
    || (/\bairport\b/.test(t) && /\b(hotel|lodging|transport|shuttle|stay)\b/.test(t)))
    return { label: 'Open travel & stays', route: { tab: 'Travel' } };

  // A row that is ONLY about the airport lands on the airports card. Found while
  // fixing the above: "Add the nearest airport" / "Note the airport code" routed
  // to NOTHING — milestoneActionRoute has no air domain, so they fell to the
  // Timeline self-route and were nulled out. The app has an airports card and a
  // 119-airport table; these rows had no way to reach either.
  if (/\bairports?\b|\bflight|\bterminal\b|airport code/.test(t))
    return { label: 'Open the airports', route: { focusField: 'air' } };

  // ── PAPERWORK LANDS ON THE PAPERWORK (click-through audit 2026-07-28) ──────
  // "Collect all vendor COIs for M-NCPPC" routed to { tab:'Vendors', vendorId }
  // with NO vendorSection — so it resolved to the vendor CARD TOP. Driven live,
  // the host arrived at arrival times and the agreed fee, with the insurance
  // block nowhere in sight, on a task that is about exactly one thing.
  // resolveRoute has carried vendorSection ('payment' | 'documents') since it
  // was written; this route simply never named one. Row-level CTA rule: route to
  // the field, not the surface that contains it.
  if (/\bcois?\b|certificates? of insurance|\binsurance\b|\bliability\b/.test(t)) {
    const r = firstUndoneVendorRoute(event);
    return { label: 'Open the paperwork', route: { ...r, vendorSection: 'documents' } };
  }
  if (/room block/.test(t))
    return { label: 'Open the stay', route: { focusField: 'lodging' } };
  if (/gift log|who-gave-what/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  if (/meaning moment/.test(t))
    return { label: 'Plan the tribute', route: { tab: 'Decisions', decisionId: 'tribute' } };
  if (/\bkeynotes?\b|\bav\b\/?|production rider|av rider/.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };

  // MONEY + VENDOR ROWS RUN BEFORE THE KITCHEN NULL (false-null found by the
  // coverage probe 2026-07-28): "Give caterer FINAL headcount; pay remaining
  // vendor balances; prep tip envelopes" was killed by the /prep/ rule below —
  // a vendor-money row silently lost its CTA because it ended in a prep verb.
  if (/\bcaterer\b|vendor balance|remaining balance|pay (remaining|the) /.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };

  if (/\b(marinate|season the|slow-cook|cook the|make-ahead|prep)\b/.test(t))
    return null;
  // Signage, badges and swag are a supply run like decor.
  if (/\bsignage\b|\bbadges?\b|lanyards?|\bswag\b/.test(t))
    return { label: 'Open the list', route: { tab: 'Planning', focusField: 'food-plan' } };
  // Catering orders written in trade shorthand (BEO / plated / buffet) and the
  // "what are we serving" decision both belong on the food plan.
  if (/\bbeos?\b|plated|buffet|decide the main|who cooks/.test(t))
    return { label: 'Map the spread', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/reserve (the )?[a-z ]{0,18}(hall|space|room|pavilion|center|centre)\b/.test(t))
    return { label: 'Open the details', route: { tab: 'Event Details' } };
  // Supply runs — decor, favors, paper goods, drink stock — get bought off the
  // SAME list as the food. Below the kitchen null on purpose: a row that leads
  // with cooking ("Prep make-ahead bites; assemble favors") stays honest-CTA-less.
  if (/\b(decor|favou?rs?|balloons?|banner|backdrop|yard sign|paper goods|mixers?|liquor|alcohol|champagne|non-perishables|prizes|goodie bags?|party supplies|centerpieces?|prints)\b/.test(t))
    return { label: 'Open the list', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/\b(proteins?|buns|produce|condiments)\b/.test(t))
    return { label: 'Open the list', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/\b(buys?|groceries|drinks|soda|water|ice\b|disposable|foil|to-go|trash|recycl|fuel|charcoal|napkins|cups|plates|shopping)\b/.test(t))
    return { label: 'Open the list', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/\btribute\b|\bspeeches?\b|\bslideshow\b|\bmontage\b|\bopen mic\b|\beulog|line\b.{0,24}\bspeakers?\b/.test(t))
    return { label: 'Plan the tribute', route: { tab: 'Decisions', decisionId: 'tribute' } };
  // GROUNDED DESTINATIONS (host ask 2026-07-28: every row lands somewhere real).
  // The CVB task's destination is EXTERNAL by design (spec 8c1a72a7: generic
  // cities get the search deep-link, built from the EVENT's own town — the
  // constitution accessor, never a raw field). Arrivals/ground rows land on
  // their own sheets via the resolver's air/ground vocabulary.
  if (/visitors bureau|convention .{0,3}visitors|\bcvb\b/i.test(t)) {
    const vf = venueFor(event || {});
    const q = [vf.city, vf.state, 'convention visitors bureau'].filter(Boolean).join(' ');
    return { label: 'Find the visitors bureau', href: 'https://www.google.com/search?q=' + encodeURIComponent(q) };
  }
  if (/arrivals?\s*\/?\s*departures|arrivals grid|flying in when/i.test(t))
    return { label: 'Open arrivals', route: { focusField: 'air' } };
  if (/ground[- ]transport|shuttle|rideshare coverage|self-drive/i.test(t))
    return { label: 'Open rides', route: { focusField: 'ground' } };
  // "Send the invites" is a SEND, not a headcount edit — it lands on the
  // share-and-invite block (guests-invites anchor), not the count stepper. Sits
  // above the generic guest-comms rule so it wins the more-specific match; the
  // chase/rsvp/headcount rows still land on the count entry below.
  if (/send\s+(the\s+|out\s+)?invit/i.test(t))
    return { label: 'Open the invite', route: { focusField: 'guests-invites' } };
  if (/chase non-?responders|lock the count/i.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  if (/\b(dj|playlist|band|speaker|photographer|caterer|book the|rent(al)?|hire)\b/.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };
  if (/\b(forecast|weather|rain plan|shade\/rain)\b/.test(t))
    return { label: 'Plan for weather', route: { tab: 'Event Details', focusField: 'rain-plan' } };
  if (/\b(spread the word|group text|flyer|invite|rsvp|headcount|who is coming|firm the (head)?count)\b/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  if (/\b(spread|menu|dish(es)?|mac|potato salad|beans|greens|cornbread|slaw|dessert|meat|ribs|assign each|bringing what|claimed|potluck)\b/.test(t))
    return { label: 'Map the spread', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/\b(canop|chairs|tables?|seating|shade|spades table|tent)\b/.test(t))
    return { label: 'Open the space list', route: { tab: 'Event Details', focusField: 'space' } };
  if (/\b(grill master|name the|point person|in charge|backup|helper)\b/.test(t))
    return { label: 'Assign it', route: { tab: 'Event Details', focusField: 'space' } };
  // Keyword miss → the canonical domain families, so no step is a dead row.
  const fallback = milestoneActionRoute(task, event, meta && meta.taskId);
  if (fallback && fallback.tab === 'Timeline') return null; // self-route on the tasks sheet = no CTA
  const LABELS = { Guests: 'Open guests', Budget: 'Open your money', Vendors: 'Line them up', Planning: 'Map the spread', 'Event Details': 'Open the details' };
  return fallback ? { label: LABELS[fallback.tab] || 'Open it', route: fallback } : null;
}
