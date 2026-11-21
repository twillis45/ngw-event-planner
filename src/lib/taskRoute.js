// ─── Task routing — every checklist step lands on its actual item ────────────
// (Routing audit 2026-07-27, host report "checklist tasks don't go to the
// actual item".) Two producers, ONE authority: every route here is a plain
// route object resolveRoute understands, swept by ctaSourceOfTruth — never a
// hand-held setSheet that bypasses the resolver (the old checklistActionFor's
// exact defect, alongside its keyword-missed rows getting nothing at all).

import { isVendorBooked } from './workstreams';
import { venueFor } from './venueFor';
import { showsReplyTracking } from './guestMode';
import { stepCalls, getPlaybook } from './playbooks';
import { DATE_POLL_ROW } from './datePoll';
import { GIFT_LOG_ROW } from './giftLog';
import { BORROWED_ROW } from './borrowedList';

// The first vendor row still needing the host — the row-level rule the
// Vendors deep-link doctrine requires (not the sheet top).
const firstUndoneVendorRoute = (event) => {
  const vs = ((event && event.vendors) || []).filter((v) => v && String(v.name || '').trim());
  const undone = vs.find((v) => !isVendorBooked(v)
    || (Number(v.depositAmt) > 0 && !v.depositPaid) || v.coiStatus === 'required');
  const target = undone || vs[0];
  return target ? { tab: 'Vendors', vendorId: target.id } : { tab: 'Vendors', focusField: 'vendor-add' };
};

// The same row-level rule over the vendors of one kind (the baker and the
// florist), so a step about them opens their own row, never the DJ's. None of
// that kind yet: add one.
const kindVendorRoute = (event, re) => {
  const vs = ((event && event.vendors) || []).filter((v) => v && String(v.name || '').trim() && re.test(`${v.category || ''} ${v.name || ''}`));
  return firstUndoneVendorRoute({ vendors: vs });
};

// A row's call, by the ids its playbook actually has (11/21/2026): a slideshow
// or meaning-moment row opened Calls to make on `tribute` for Anniversary and
// Juneteenth, which have no such call, so the sheet opened on nothing. The
// first id the event's playbook has wins; with no event, the first id (the
// long-standing `tribute`); with none of them, the rule does not fire.
const ownCall = (event, ids) => {
  if (!event) return ids[0];
  const pb = (() => { try { return getPlaybook(event.type); } catch (_e) { return null; } })();
  const have = new Set(((pb && pb.decisions) || []).map((d) => d && d.id));
  return ids.find((id) => have.has(id)) || null;
};
const CALL_LABEL = { tribute: 'Plan the tribute', slideshow: 'Plan the slideshow', meaning: 'Plan the meaning moment' };
const callHit = (id) => ({ label: CALL_LABEL[id], route: { tab: 'Decisions', decisionId: id } });

/**
 * Canonical milestone/task route producer (moved from CommandCenter.jsx so the
 * V2 shell can use it without dragging the planner bundle along).
 * FIELD-DRIFT FIX: the fallback used to emit `timelineId` while resolveRoute
 * and routeUpNext read `taskId` — it passed the audit yet dropped the focus.
 * Both names ride now so every reader lands on the exact row.
 */
export function milestoneActionRoute(label, event, timelineId) {
  // A GUEST AS A UNIT OF MEASURE IS NOT GUEST WORK (11/20/2026). "Order the
  // turkey — about a pound and a half per guest" opened the guest list: no
  // rule above named a turkey, and the earliest domain word here was the
  // "guest" in a portion rate. Rates and sizing phrases ("per guest",
  // "~10-12 bites/guest", "size for headcount", "counted to the headcount")
  // say how MUCH, not who; they are dropped before the domains are read.
  // ("a guest book" and "each guest" are left alone: those are guest work.)
  const s = String(label || '').toLowerCase()
    .replace(/\bper\s+(?:guest|person|head)s?\b|\/(?:guest|person)s?\b/g, ' ')
    .replace(/\b(?:size[ds]?|sized|counted|count)\s+(?:for|to|against)\s+(?:the\s+)?(?:final\s+)?head\s?count\b/g, ' ');
  // WHOLE WORDS (11/20/2026): bare substrings sent "vegetable" to the tables
  // list, "content"/"intent" to tents, "costume" to the budget and "workshop"
  // to the food plan — the same collision class as "Holi-day party".
  const DOMAINS = [
    { re: /\b(?:guests?|invit\w*|rsvps?|head\s?counts?|seat)\b/, route: () => ({ tab: 'Guests', focusField: 'guests-entry' }) },
    { re: /\b(?:budget\w*|deposits?|payments?|pay|costs?|spend\w*|quotes?|invoices?)\b/, route: () => ({ tab: 'Budget', focusField: 'hsp-budget' }) },
    { re: /\b(?:vendors?|cater\w*|venues?|photograph\w*|dj|florists?|rentals?|baker\w*|bartend\w*|book)\b/, route: () => firstUndoneVendorRoute(event) },
    { re: /\b(?:food|menus?|shop\w*|grocer\w*|drinks?|supplies|seating)\b/, route: () => ({ tab: 'Planning', focusField: 'food-plan' }) },
    // Families the old V2-only keyword router had that this one lacked
    // (audit gap 2): weather → the rain plan; physical space/helpers → the
    // space sheet. Both are real resolver targets, not sheet-top guesses.
    { re: /\b(?:forecast\w*|weather|rain)\b/, route: () => ({ tab: 'Event Details', focusField: 'rain-plan' }) },
    { re: /\b(?:canop\w*|tents?|chairs|tables?|shade|helpers?|point person|in charge)\b/, route: () => ({ tab: 'Event Details', focusField: 'space' }) },
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
  // THE CHASE STEP OPENS THE NUDGE (owner ruling, 11/20/2026): without a
  // reply-by date set, this step is the nudge's prompt. Only where replies are
  // tracked; a headcount-only event is never nudged and falls through.
  if (/\bchase\b[^;]{0,30}\b(non-?responders|rsvps?|repl)/.test(t) && event && showsReplyTracking(event))
    return { label: 'Open the nudge', route: { tab: 'Guests', focusField: 'rsvp-nudge' } };
  // THE DATE POLL ASKS ON THE INVITE (owner pick B, 11/21/2026): Group Trip's
  // "Offer two or three date ranges…" and Team Retreat's "Poll the team…"
  // open Date & time on "Dates to offer"; guests tick ranges on the invite.
  if (DATE_POLL_ROW.test(t)) return { label: 'Ask on the invite', route: { focusField: 'date-options' } };
  // THE GIFT LOG LIVES ON THE GUEST ROWS (owner pick A, 11/21/2026): Birthday's
  // cash, mailed-gift and go-through-the-gifts rows open After › Thank-yous & gifts.
  if (GIFT_LOG_ROW.test(t)) return { label: 'Log gifts and cash', route: { focusField: 'after-gifts' } };
  // THE BORROWED LIST (owner pick B, 11/21/2026): every "return the borrowed /
  // what family lent" row opens "Borrowed · N of M back" on Space.
  if (BORROWED_ROW.test(t)) return { label: 'Open the borrowed list', route: { focusField: 'space-borrowed' } };
  const wk = String((meta && meta.week) || '').toLowerCase();
  const dayOf = (meta && meta.category) === 'event-day' || /day of\b|day-of/.test(wk);
  // THE ROW'S OWN CATEGORY OUTRANKS A DAY-OF WORD (11/20/2026). The engine
  // stamps every row 'event-day' or 'planning'; the keyword list below is for
  // rows that carry neither (host-added, legacy). It was also overriding
  // 'planning': "Invite everyone with the date, the serve time…" and "Write the
  // oven map: back-plan from serve time…" both opened the day-of schedule,
  // because "serve" in "serve time" is a noun, not the act of serving.
  const planningRow = (meta && meta.category) === 'planning';
  if (dayOf || (!planningRow && /\bfire[s]? the pit|light the pit|set up (the )?canop|set out (foil|to-go)|\bserved?\b(?! time)|bless the food|scrape the grill|pack (up|leftovers|the)|fold (the )?canopies|works batches\b/.test(t)))
    // The resolver's day-stage vocabulary — `{ stage: 'day' }` was a shape
    // resolveRoute never understood (no tab, no focusField → null), so EVERY
    // "See the day plan" CTA dead-tapped into the toast fallback. Caught by the
    // board-matrix checklist probe's first run (2026-07-27).
    return { label: 'See the day plan', route: { tab: 'Event Day Schedule' } };
  // ── COVERAGE WAVE (host ask 2026-07-28, probe: 79% of rows had a CTA) ──────
  // These land ABOVE the kitchen-prep null because none of them is ever a
  // cooking row — "prep the name tags" is guest-list work, and the /prep/ rule
  // below was swallowing it. Each destination is real resolver vocabulary.
  // The oven map is the day's own timetable — the run of show carries its
  // turkey-in and side-rotation rows (11/20/2026: it was reaching the day
  // plan only by the "serve" in "serve time", which no longer counts).
  if (/run[- ]of[- ]show|order of events|write the run\b|oven map\b/.test(t))
    return { label: 'Build the day', route: { tab: 'Event Day Schedule' } };
  if (/every household|households\b|contact for each|sign-?in sheet|contact[- ]update|name tags?/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  // Permits, alcohol rules, sound ordinances are PLACE facts — the house-rules note.
  if (/\bpermit\b|alcohol rule|amplified[- ]sound|noise ordinance/.test(t))
    return { label: 'Open the place rules', route: { focusField: 'house-rules' } };
  if (/safe[- ]rides?|designated[- ]driver|rideshare code/.test(t))
    return { label: 'Open rides', route: { focusField: 'ground' } };
  // A per-person share is a MONEY agreement, not a vendor booking.
  // ATTIRE is bought from someone, and Vendors is where a host tracks who they
  // are buying from and what is owed. Ordering a gown with a six-week alteration
  // runway is vendor work in everything but name.
  if (/\b(dress|gown|attire|tux(edo)?|suit|ballgown|damas|chambelan)\b.{0,40}\b(order|buy|choose|alterations?|fitting)|\b(order|schedule)\b.{0,30}\b(dress|gown|attire|alterations?)\b/i.test(t))
    return { label: 'Open your vendors', route: { tab: 'Vendors' } };
  // COLLECTING PHOTOS OR NOTES FROM PEOPLE is an ask made of the guest list, and
  // the roster is where those people are. The album itself lives elsewhere; the
  // asking does not.
  if (/(ask|invite)\b.{0,50}\b(send|share|submit|drop)\b.{0,30}(photos?|memor|notes?)|shared (photo|album).{0,30}(drop|link)|photo\/notes drop/i.test(t))
    return { label: 'Open your guest list', route: { tab: 'Guests' } };
  // SHARING THE PHOTOS IN ONE ALBUM LINK IS THE RECAP'S ALBUM FIELD (owner pick,
  // 11/21/2026, "Combine A + B line"). Halloween's and NYE's "Share the …
  // photos in one album link" had no button. The invite recap already holds a
  // "Photo album link" that guests see when they reopen the invite, so the row
  // opens After on that field. A saved link is the step done (taskEngine).
  if (/^share\b[^.;]{0,80}\bin one album link\b/.test(t))
    return { label: 'Add the album link', route: { focusField: 'after-album' } };
  // THE EVENT HASHTAG LIVES IN MAKE IT YOURS (11/21/2026). Sweet 16's "Set up
  // the social moment: custom hashtag + photo-booth frame/filter" had no
  // button; the hashtag is set beside the invite's own words.
  if (/\bhashtag\b/.test(t))
    return { label: 'Pick the hashtag', route: { focusField: 'meaning-hashtag' } };
  // SHARING THE PLACE AND TIME IS THE SHARE LINK (11/21/2026). Repast's "Share
  // the repast place and time — on the program, at the service…" had no
  // button; the guest list's Share & invite block carries both.
  if (/^share\b[^.;:]{0,30}\bplace and time\b/.test(t))
    return { label: 'Open share & invite', route: { focusField: 'guests-invites' } };
  // VOWS, READINGS AND WHO SPEAKS are the ceremony's own content, and the run of
  // show is the surface that holds the order of the day.
  if (/\b(vows?|reading\(s\)|readings?)\b.{0,40}\b(write|writes|practice|choose|assign)|\bwrite (their|your) vows\b/i.test(t))
    return { label: 'Open the day', route: { tab: 'Event Day Schedule' } };
  // POST-EVENT THANK-YOUS route to the roster, because that is where the
  // thank-you state actually lives -- per-guest flags on the same rows (the
  // After stage reads "N of M sent" off them). Not a courtesy destination: the
  // host marks the thank-you there, so the CTA does what it says.
  if (/thank (the|them|everyone|people|your)|thank[- ]?you|write the notes\b/i.test(t))
    return { label: 'Open your guest list', route: { tab: 'Guests' } };
  // LINKS FOR STEPS THAT NAME A REAL SCREEN (owner, 11/18/2026: "make sure
  // check boxes link to all places"). Of 179 rows with no link, most are real
  // kitchen or house work with no screen (cook, fry, sweep) and stay honest
  // check-offs. These name a place the app has: the money agreement, the date,
  // the volunteer shifts, the friend who owns the main dish.
  // THE REST OF EACH SHARE IS THE COST SPLIT (11/21/2026). Group Trip's
  // "Collect the rest of each person's share" had no button; Split the costs
  // holds each person's share and who still owes whom.
  if (/\bcollect the rest of each person'?s share\b/.test(t))
    return { label: 'Split the costs', route: { focusField: 'cost-split' } };
  if (/how money works|money rule|shared receipts|settle up|final tally|\btreasurer\b/.test(t))
    return { label: 'Open your money', route: { tab: 'Budget', focusField: 'hsp-budget' } };
  if (/\b(pick|choose|set) the date\b/.test(t))
    return { label: 'Set the date', route: { tab: 'Event Details', focusField: 'event-date' } };
  if (/\bshifts?\b/.test(t))
    return { label: 'Assign it', route: { tab: 'Event Details', focusField: 'space' } };
  if (/\bown the main\b/.test(t))
    return { label: 'Map the spread', route: { tab: 'Planning', focusField: 'food-plan' } };
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
  // THE WALK-THROUGH IS THE PLACE, NOT THE PARKING (owner screenshot, 11/18/2026:
  // "Should parking note be here"). Friendsgiving's "walk the kitchen with
  // whoever lives there: oven size, refrigerator space, serving dishes, and
  // parking" opened the parking note — parking is the last of four things to
  // check. A walk / tour / check of a place whose list includes parking lands
  // on the place sheet, where the parking note is one of its notes.
  if (/\b(walk|tour|visit|check)\b[^.;]{0,60}:\s*[^.;]*,[^.;]*\bparking\b/.test(t))
    return { label: 'Open the place notes', route: { tab: 'Event Details', focusField: 'space' } };
  // Restrooms are a fact about the place, like parking (11/20/2026: this row
  // reached the place sheet only because "portable" contains "table").
  if (/\brestrooms?\b|\bporta-?pott/.test(t))
    return { label: 'Open the place notes', route: { tab: 'Event Details', focusField: 'space' } };
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
  // SENDING THE TRIP DETAILS IS A DRAFT (owner pick "Yes, combined",
  // 11/21/2026): Group Trip's "Send everyone the trip details…" had no button.
  // It opens the draft sheet on doItForMe.draftTripDetails, built from the
  // dates, the booked stay, the booked plans and the split.
  // CONFIRMING EVERY BOOKING IS THE RECONFIRM SWEEP (owner pick "A: Reconfirm
  // each booking", 11/21/2026): the stay and every booked vendor, one sheet.
  if (/^confirm every (?:reservation|booking)\b/.test(t))
    return { label: 'Reconfirm each booking', route: { focusField: 'reconfirm-sweep' } };
  // A SHORT NOTE TO THE WHOLE GROUP IS AN UPDATE TO EVERYONE (11/21/2026).
  // "Send a short list of house norms, including the booking site's rule
  // against parties at a rental" opened People you're hiring: "rental" is a
  // rentals vendor in the rule below. Updates to everyone, on the Guest list,
  // posts the host's own words on every guest's invite.
  // Team Retreat's "Send arrival instructions, on-site contact numbers, and
  // the day-1 schedule" is the same note to everyone (11/21/2026).
  if (/^(?:send|share|post)\b[^.;:]{0,30}\b(?:norms|ground rules|arrival instructions)\b/.test(t))
    return { label: 'Open updates to everyone', route: { tab: 'Guests', focusField: 'guests-updates' } };
  if (/^(?:send|share)\b[^.;:]{0,20}\btrip details\b/.test(t))
    return { label: 'Draft the trip details', route: { focusField: 'draft-trip-details' } };
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
  // A STAY IS BOOKED WHERE EVERYONE STAYS (11/21/2026). Group Trip's "Book the
  // place: check its cancellation policy…" opened the add-a-vendor field (the
  // vendor rule's "book the"), and "Before you pay, search the listing's
  // address…" opened Your money (the domain fallback read "pay"). Booking a
  // rental, and checking its listing, is the stay's own work.
  if (/^(?:book|reserve|rent)\s+(?:the|a|your)\s+(?:place|house|rental|cabin|condo|villa|stay)\b(?!\s+for\b)|\bthe listing(?:'s)?\b/.test(t))
    return { label: 'Open where everyone stays', route: { tab: 'Travel' } };
  if (/gift log|who-gave-what/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  if (/meaning moment/.test(t)) { const id = ownCall(event, ['meaning', 'tribute']); if (id) return callHit(id); }
  // Wedding's vision brief (11/21/2026): its answer is the style call, "Style +
  // formality (the design brief)", so the step opens that call.
  if (/\bvision brief\b/.test(t))
    return { label: 'Pick the style', route: { tab: 'Decisions', decisionId: 'vision' } };
  if (/\bkeynotes?\b|\bav\b\/?|production rider|av rider/.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };

  // MONEY + VENDOR ROWS RUN BEFORE THE KITCHEN NULL (false-null found by the
  // coverage probe 2026-07-28): "Give caterer FINAL headcount; pay remaining
  // vendor balances; prep tip envelopes" was killed by the /prep/ rule below —
  // a vendor-money row silently lost its CTA because it ended in a prep verb.
  // THE CAKE AND FLOWER DELIVERIES ARE THE BAKER'S AND THE FLORIST'S ROWS
  // (11/21/2026). Quinceañera's "confirm cake and flower delivery windows" had
  // no button: the vendor rule knows "baker" and "florist", not "cake".
  // A row that buys the flowers or picks up the cake is shopping ("Fresh food,
  // florals, garnish; pick up the cake (or schedule delivery)"), so the rule
  // needs the confirm.
  if (/\bconfirm\b[^.;]{0,20}\b(?:cakes?|flowers?|florals?)\b[^.;]{0,30}\bdeliver/.test(t))
    return { label: 'Check the delivery times', route: kindVendorRoute(event, /\b(?:cakes?|bak\w*|pastr\w*|flor\w*|flowers?)\b/i) };
  if (/\bcaterer\b|vendor balance|remaining balance|pay (remaining|the) /.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };

  // ORDERING THE MAIN DISH IS SHOPPING (11/20/2026): "Order the turkey — about
  // a pound and a half per guest…" opened the guest list. Ordering or
  // reserving the bird, the ham, the cake or the pies is a line on the list.
  if (/^(?:order|reserve|pre-?order|buy)\b[^.;:—]{0,24}\b(?:turkey|bird|ham|roast|brisket|cake|pies?)\b/.test(t))
    return { label: 'Open the list', route: { tab: 'Planning', focusField: 'food-plan' } };
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
  if (/\btribute\b|\bspeeches?\b|\bslideshow\b|\bmontage\b|\bopen mic\b|\beulog|line\b.{0,24}\bspeakers?\b/.test(t)) {
    const id = ownCall(event, ['tribute', 'slideshow', 'meaning']);
    if (id) return callHit(id);
  }
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
  // A row that LEADS with the verb "invite" is the same send ("Invite everyone
  // with the date, the serve time…" — 11/20/2026, it opened the day plan and,
  // once that was fixed, would have fallen to the guest COUNT below).
  if (/send\s+(the\s+|out\s+)?invit|^invite\b/i.test(t))
    return { label: 'Open the invite', route: { focusField: 'guests-invites' } };
  if (/chase non-?responders|lock the count/i.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  // BUILDING A PLAYLIST IS NOT HIRING ONE (11/20/2026, seasonal leftovers).
  // "Build a 4-hour festive playlist … or brief the DJ" opened the vendor
  // sheet's add-a-vendor field, because "playlist" sits in the vendor rule
  // below. The app has no music surface, so a row that LEADS with making the
  // playlist is an honest check-off with no button. A row that leads with the
  // DJ ("Book the DJ or build the playlist", "Brief DJ on theme") is still
  // vendor work and falls through to the rule below.
  if (/^(?:build|make|create|curate)\b[^.;]{0,30}\bplaylist\b/.test(t))
    return null;
  // A DINNER RESERVATION IS A BOOKING, NOT FURNITURE (11/21/2026). "Reserve
  // the group dinners. A table for the whole group needs a booking" opened the
  // Space list, because "table" is the space rule's word below. Reservations
  // are tracked with the people you're hiring (and reconfirmed from there).
  // Below the hall rule above, so "Reserve the fellowship hall (or
  // restaurant)" is still the venue.
  if (/\b(?:reserve|book)\b[^.;]{0,30}\b(?:dinners?|brunch(?:es)?|lunch(?:es)?|restaurants?)\b/.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };
  if (/\b(dj|playlist|band|speaker|photographer|caterer|book the|rent(al)?|hire)\b/.test(t))
    return { label: 'Line them up', route: firstUndoneVendorRoute(event) };
  if (/\b(forecast|weather|rain plan|shade\/rain)\b/.test(t))
    return { label: 'Plan for weather', route: { tab: 'Event Details', focusField: 'rain-plan' } };
  if (/\b(spread the word|group text|flyer|invite|rsvp|headcount|who is coming|firm the (head)?count)\b/.test(t))
    return { label: 'Open guests', route: { tab: 'Guests', focusField: 'guests-entry' } };
  if (/\b(spread|menu|dish(es)?|appetizers?|mac|potato salad|beans|greens|cornbread|slaw|dessert|meat|ribs|assign each|bringing what|claimed|potluck)\b/.test(t))
    return { label: 'Map the spread', route: { tab: 'Planning', focusField: 'food-plan' } };
  if (/\b(canop\w*|chairs|tables?|seating|shade|spades table|tents?)\b/.test(t))
    return { label: 'Open the space list', route: { tab: 'Event Details', focusField: 'space' } };
  // "Name a buddy for the groom + a sober point-person" (11/21/2026): the
  // hyphen and "Name a" both missed this rule, so the row had no button.
  if (/\b(grill master|name the|name a|point[- ]person|in charge|backup|helper)\b/.test(t))
    return { label: 'Assign it', route: { tab: 'Event Details', focusField: 'space' } };
  // A STEP THAT IS A CALL is made on Calls to make (11/21/2026): "Decide whose
  // midnight it is…" had no button though midnight_model sits right there.
  // The authored `answeredBy` link (playbooks.stepCalls), never a keyword guess.
  const calls = (() => { try { return stepCalls(event, { id: meta && meta.taskId, task }); } catch (_e) { return []; } })();
  if (calls.length) return { label: 'Make the call', route: { tab: 'Decisions', decisionId: calls[0] } };
  // Keyword miss → the canonical domain families, so no step is a dead row.
  const fallback = milestoneActionRoute(task, event, meta && meta.taskId);
  if (fallback && fallback.tab === 'Timeline') return null; // self-route on the tasks sheet = no CTA
  const LABELS = { Guests: 'Open guests', Budget: 'Open your money', Vendors: 'Line them up', Planning: 'Map the spread', 'Event Details': 'Open the details' };
  return fallback ? { label: LABELS[fallback.tab] || 'Open it', route: fallback } : null;
}
