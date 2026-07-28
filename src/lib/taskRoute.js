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
  if (/\b(marinate|season the|slow-cook|cook the|make-ahead|prep)\b/.test(t))
    return null;
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
