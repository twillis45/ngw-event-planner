// ─── DON'T ASK THE HOST FOR WHAT SHE ALREADY TOLD US (owner, 11/21/2026) ─────
//
// "Don't keep asking host for the same information." Single source for every
// fact. A playbook call counted as answered only when it was picked, or when a
// BOOKED vendor answered it (playbooks.decisionSettledByData). Every call that
// restates one of the event's own fields — the budget she typed, the count she
// gave, the venue she named, the start time she said — asked again.
//
// This file reads those fields and nothing else. Two answers:
//
//   settledFromFacts(event, d)  the field answers the WHOLE call:
//                               { pick, because }, `pick` an authored option
//                               (or null when the fact answers the call without
//                               naming an option), `because` the fact itself.
//   knownPartOf(event, d)       the field answers PART of it, and the rest is a
//                               smaller question: { pick, known, ask, options,
//                               metDependents, step }. The call stays open and
//                               asks ONLY the missing part; `pick` is the band
//                               the known part implies, which the plan runs on.
//
// Rules here only read a fact the host gave. A playbook-typical headcount, a
// derived start time and a venue we could not classify settle nothing.
//
// PURE: no I/O, no clock, no storage. A LEAF: it imports no playbook module, so
// playbooks/index.js and choiceProvenance.js can both read it.
import { guestCountFor, SOURCE_PLAYBOOK_TYPICAL } from './guestCountFor';
import { venueFor, isHomeVenueName } from './venueFor';
import { parseStartMinutes, eventClock } from './eventWhen';
import { dietTagFor } from './dietRows';

const opts = (d) => (d && Array.isArray(d.options) ? d.options.map(String) : []);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fromPlan = (s) => `From your plan: ${s}`;

// ── The host's own headcount ────────────────────────────────────────────────
// The count is hers when she typed it, picked it, locked it or built a list;
// never when the app substituted the playbook's typical.
export function hostHeadcount(event) {
  const g = guestCountFor(event);
  if (!g || !g.count || g.source === SOURCE_PLAYBOOK_TYPICAL) return null;
  return g.count;
}

// "Intimate (≤50)", "Mid (50–120)", "Grand (250+)", "~45 (typical)",
// "12 (small)", "A large homegoing (~120+)" → [lo, hi]. null when an option
// carries no number, so a band list we cannot read settles nothing.
function bandOf(option) {
  const s = String(option);
  const range = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return [Number(range[1]), Number(range[2])];
  const upTo = s.match(/(?:≤|<=|under\s+|up to\s+)(\d+)/i);
  if (upTo) return [0, Number(upTo[1])];
  const plus = s.match(/(\d+)\s*\+/);
  if (plus) return [Number(plus[1]), Infinity];
  const one = s.match(/(\d+)/);
  return one ? [Number(one[1]), Number(one[1])] : null;
}
export function bandFor(options, n) {
  const bands = (options || []).map(bandOf);
  if (!n || !bands.length || bands.some((b) => !b)) return null;
  let best = null; let bestGap = Infinity;
  bands.forEach(([lo, hi], i) => {
    const gap = n < lo ? lo - n : n > hi ? n - hi : 0;
    if (gap < bestGap) { best = options[i]; bestGap = gap; }
  });
  return best;
}

// ── Where it is, and what kind of place that is ─────────────────────────────
// Read from the venue name the host gave. Order matters: a "courthouse" is not
// a hall, a "beer garden" is a bar before it is a garden.
const KIND_WORDS = [
  ['courthouse', /\b(courthouse|city hall|registry office|county clerk)\b/i],
  // "café" ends in a letter that \b does not count as a word letter, so it is
  // matched on its own: with a trailing \b, "La Plazuela Café" was no kind.
  ['restaurant', /\b(restaurant|bistro|grill|kitchen|cafe|trattoria|steakhouse|tavern|brasserie|osteria|diner|eatery|cantina|taqueria|pizzeria|chophouse|supper club|ale\s?house)\b|\bcafé(?![\p{L}\p{N}_])/iu],
  ['bar', /\b(bar|pub|brewery|brewing|taproom|winery|lounge|beer garden)\b/i],
  ['hotel', /\b(hotel|resort|marriott|hilton|hyatt|westin|sheraton)\b/i],
  // Not a VFW or Legion post: whether one is a hall, a bar or a restaurant room
  // is the guess the 11/15/2026 ruling refused, so it is asked.
  ['hall', /\b(hall|ballroom|banquet|salon|salón|clubhouse|community center|civic center|parish)\b/i],
  ['park', /\b(park|pavilion)\b/i],
  ['beach', /\b(beach|coast|shore)\b/i],
  ['office', /\b(office|headquarters|workplace)\b/i],
  ['backyard', /\b(back\s?yard|yard|garden|patio|lawn)\b/i],
];
const BACKYARD_WORDS = /\b(back\s?yard|yard|garden|patio|deck|lawn|outside|outdoors?)\b/i;

// The kind a place's name or description says ("Coyote Grill" → restaurant,
// "community hall" → hall), or null when the words say none. The one reader:
// the venue calls (venueKindOf) and the dinner's money (tripFood) both ask it.
export function placeKindOfName(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const hit = KIND_WORDS.find(([, re]) => re.test(n));
  return hit ? hit[0] : null;
}

export function venueKindOf(event) {
  const vf = (() => { try { return venueFor(event); } catch (_e) { return null; } })();
  if (!vf || !vf.isSet) return null;
  const name = String(vf.name || '').trim();
  if (/^(tbd|tba)$/i.test(name)) return null;
  if (vf.isHome || isHomeVenueName(name)) {
    return { name, kind: BACKYARD_WORDS.test(name) ? 'backyard' : 'home', isHome: true, line: vf.displayLine || name };
  }
  return { name, kind: placeKindOfName(name), isHome: false, line: vf.displayLine || name };
}

// The option(s) of a place call that name this kind of place.
const KIND_OPTION = {
  home: (o) => /\bhome\b|\bhouse\b/i.test(o) && !/relative|office/i.test(o),
  backyard: (o) => /back\s?yard|\byard\b|\boutdoor/i.test(o) && !/indoor/i.test(o),
  restaurant: (o) => /restaurant/i.test(o),
  bar: (o) => /\bbar\b|brewery|rooftop/i.test(o),
  hotel: (o) => /hotel|resort/i.test(o),
  hall: (o) => /\bhall\b|clubhouse|salón|banquet/i.test(o),
  park: (o) => /\bpark\b/i.test(o),
  beach: (o) => /beach|coast/i.test(o),
  courthouse: (o) => /courthouse/i.test(o),
  office: (o) => /office|workplace/i.test(o),
};
const optionForKind = (options, kind) => {
  const test = KIND_OPTION[kind];
  if (!test) return null;
  let hits = options.filter(test);
  // At home, the plain home option before the one that also says "indoor".
  if (kind === 'home' && hits.length > 1) hits = hits.filter((o) => !/indoor|rented/i.test(o));
  if (kind === 'backyard' && !hits.length) return optionForKind(options, 'home');
  return hits.length === 1 ? hits[0] : null;
};

// The calls that ask where the event is.
const PLACE_CALLS = new Set(['venue', 'venue_type', 'venue-setting', 'location', 'place']);
// An indoor/outdoor call is known by its OPTIONS, never its label (a label is
// copy: whichLabelsAreLoadBearing.test.js) — one says indoor, another outside.
const asksInOrOut = (d) => { const o = opts(d); return o.some((x) => /\bindoor/i.test(x) && !/backup/i.test(x)) && o.some((x) => /\boutdoor|back\s?yard/i.test(x)); };
// Options that are a kind of place (not "Destination", a distance).
const isPlaceOption = (o) => Object.values(KIND_OPTION).some((t) => t(o)) || /venue|room|space|estate|property|tent/i.test(o);

// ── Indoors or outside: ONE store, event.indoorOutdoor ──────────────────────
// What a picked option says about it, or null when it says nothing. The Space
// sheet's chips and the calls that ask it write the same field.
export function indoorOutdoorOfOption(option) {
  const o = String(option || '');
  if (/outdoor with indoor|indoor backup|both/i.test(o)) return 'both';
  if (/\bindoor/i.test(o)) return 'indoor';
  if (/back\s?yard|\boutdoor|\bpark\b|beach|tent/i.test(o)) return 'outdoor';
  return null;
}
export function indoorOutdoorPatch(decisionId, option) {
  if (!PLACE_CALLS.has(String(decisionId || ''))) return null;
  const v = indoorOutdoorOfOption(option);
  return v ? { indoorOutdoor: v } : null;
}
const optionForInOut = (options, io, place) => {
  const hits = options.filter((o) => indoorOutdoorOfOption(o) === io);
  if (hits.length <= 1) return hits[0] || null;
  const yard = (o) => /back\s?yard|\byard\b/i.test(o);
  if (io === 'outdoor' && place && place.isHome) return hits.find(yard) || null;
  if (io === 'outdoor') { const away = hits.filter((o) => !yard(o)); return away.length === 1 ? away[0] : null; }
  return null;
};

function placeCall(event, d) {
  const options = opts(d);
  // A how-far call (Team Retreat: local, regional, destination) is answered by
  // travel she stated, not by the venue's name: everyone flying is a destination.
  if (options.some((o) => /^destination/i.test(o)) && options.some((o) => /^local/i.test(o))) {
    const pick = event.isDestination === true && event.travelMode === 'fly' ? options.find((o) => /^destination/i.test(o)) : null;
    return pick ? { settled: { pick, because: fromPlan('everyone is flying in') } } : null;
  }
  const place = venueKindOf(event);
  // Where you SIT inside a restaurant (Client Dinner) is not answered by the
  // restaurant's name; it is the one part asked.
  const seats = options.filter((o) => /dining room|section of|chef.s table|main dining/i.test(o) && !/company|office/i.test(o));
  if (seats.length >= 3) {
    if (!place || place.isHome || (place.kind && place.kind !== 'restaurant')) return null;
    return { partial: { pick: null, known: place.name, metDependents: true, ask: `Where do you sit at ${place.name}?`, options: seats } };
  }
  // Her indoors/outside answer is the one that call asks first.
  const io = event.indoorOutdoor;
  if (asksInOrOut(d) && (io === 'indoor' || io === 'outdoor' || io === 'both')) {
    const pick = optionForInOut(options, io, place);
    if (pick) return { settled: { pick, because: fromPlan(io === 'indoor' ? 'indoors' : io === 'outdoor' ? 'outside' : 'indoors and outside') } };
  }
  if (!place) return null;
  // An indoor/outdoor call answered by the kind of place: a hall is indoors, a
  // park is outside. At home it is either, so home alone answers nothing here.
  if (asksInOrOut(d) && place.kind && place.kind !== 'home') {
    const kindIo = ['backyard', 'park', 'beach'].includes(place.kind) ? 'outdoor' : 'indoor';
    const pick = optionForInOut(options, kindIo, place);
    // Not a restatement of the venue row: this call's answer is in or out.
    if (pick) return { settled: { pick, because: fromPlan(`${place.isHome ? 'your place' : place.name} · ${kindIo === 'outdoor' ? 'outside' : 'indoors'}`) } };
  }
  // A wedding's venue call is about how much the place provides, not its kind.
  if (options.some((o) => /full-service/i.test(o))) {
    const pick = place.isHome ? options.find((o) => /estate|backyard/i.test(o))
      : place.kind === 'hotel' ? options.find((o) => /hotel|resort/i.test(o))
        : place.kind === 'restaurant' ? options.find((o) => /full-service/i.test(o)) : null;
    if (pick) return { settled: { pick, because: fromPlan(place.line) } };
    return { partial: {
      pick: null, known: place.name, metDependents: false,
      ask: `Is ${place.name} full-service?`,
      options: options.filter((o) => /full-service|blank-canvas/i.test(o)),
    } };
  }
  const pick = place.kind ? optionForKind(options, place.kind) : null;
  if (pick) return { settled: { pick, because: place.isHome ? 'Your place' : fromPlan(place.line) } };
  if (place.isHome) return null;
  // Named, but we cannot tell what kind of place it is: ask just that.
  const rest = options.filter((o) => isPlaceOption(o) && !KIND_OPTION.home(o) && !/relative/i.test(o));
  if (rest.length < 2) return null;
  return { partial: {
    pick: null, known: place.name, metDependents: false,
    ask: asksInOrOut(d) ? `Is ${place.name} indoors or outside?` : `What kind of place is ${place.name}?`, options: rest,
  } };
}

// ── The host's own clock ────────────────────────────────────────────────────
export function hostStartMinutes(event) {
  if (!event || !event.startTime || event.startTimeSource === 'derived') return null;
  return parseStartMinutes(event.startTime);
}
// What her clock says about the MEAL and about ARRIVALS (lib/eventWhen.eventClock,
// cause 5). A serve-anchored event's typed time is the meal; an older event with
// no stamp keeps the one meaning it always had.
export function hostServeMinutes(event) {
  if (hostStartMinutes(event) == null) return null;
  const c = eventClock(event);
  return c.serveMin != null ? c.serveMin : c.typedMin;
}
export function hostArrivalMinutes(event) {
  if (hostStartMinutes(event) == null) return null;
  return eventClock(event).arrivalMin;
}
export function timeOfDayFromMinutes(min) {
  if (min == null) return null;
  if (min < 12 * 60) return 'morning';
  if (min < 17 * 60) return 'afternoon';
  if (min < 21 * 60) return 'evening';
  return 'night';
}
// The bucket the budget's time-of-day factor reads: the host's own clock when
// she gave one, else the word she said. ONE reader for both shells' estimates.
// undefined (not null) when neither: estimateTotalRange defaults its parameter.
export function timeOfDayFor(event) {
  const fromClock = timeOfDayFromMinutes(hostStartMinutes(event));
  return fromClock || (event && event.timeOfDay) || undefined;
}
const clockLabel = (min) => {
  const h = Math.floor(min / 60); const m = min % 60;
  return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
// "Early afternoon, around 1 or 2" → its hours (13, 14); "Evening, 6 or later" → 18+.
function hoursOf(option) {
  const s = String(option);
  const nums = (s.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  const pm = !/\bam\b|morning|brunch/i.test(s);
  const hrs = nums.map((n) => (pm && n < 12 ? n + 12 : n));
  return /or later|\+/.test(s) ? [hrs[0], 24] : [Math.min(...hrs), Math.max(...hrs)];
}
function serveTimeCall(event, d) {
  const min = hostServeMinutes(event);
  if (min == null) return null;
  const options = opts(d);
  const bands = options.map(hoursOf);
  if (bands.some((b) => !b)) return null;
  const h = min / 60;
  let best = null; let bestGap = Infinity;
  bands.forEach(([lo, hi], i) => {
    const gap = h < lo ? lo - h : h > hi + 0.99 ? h - hi : 0;
    if (gap < bestGap) { best = options[i]; bestGap = gap; }
  });
  return best && bestGap <= 1 ? { settled: { pick: best, because: fromPlan(clockLabel(min)) } } : null;
}
// Housewarming: a clock says when, not whether people drop in all afternoon.
function windowCall(event, d) {
  const min = hostArrivalMinutes(event);
  if (min == null) return null;
  const options = opts(d);
  const fixed = options.find((o) => /fixed start/i.test(o) && (min < 17 * 60 ? /afternoon/i : /evening/i).test(o));
  const openHouse = options.find((o) => /open house/i.test(o));
  if (!fixed || !openHouse) return null;
  return { partial: {
    pick: fixed, known: clockLabel(min), metDependents: true,
    ask: `Do guests arrive at ${clockLabel(min)}, or drop in all afternoon?`,
    options: [fixed, openHouse],
  } };
}

// ── Vendors she said are booked ─────────────────────────────────────────────
const BOOKED = /^(booked|contracted|deposit paid|confirmed|paid)$/i;
const bookedDj = (event) => ((event && Array.isArray(event.vendors)) ? event.vendors : [])
  .find((v) => v && !v.isInformal && BOOKED.test(String(v.status || '').trim()) && /^dj$|\bdj\b/i.test(String(v.category || ''))) || null;
function musicCall(event, d) {
  const dj = bookedDj(event);
  if (!dj) return null;
  const options = opts(d);
  const pick = options.find((o) => /^dj$/i.test(o.trim()))
    || options.find((o) => /\b(hire[d]?|hiring)\b.*\bdj\b|\bdj\b.*\bmc\b|^hire a dj/i.test(o))
    || null;
  return pick ? { settled: { pick, because: `${String(dj.name || '').trim() || 'Your DJ'} — booked` } } : null;
}

// ── Lodging and overnight ───────────────────────────────────────────────────
function lodgingCall(event, d) {
  const style = String(event.lodgingStyle || '').toLowerCase();
  if (/airbnb|vrbo|rental|house|cabin|villa/.test(style)) {
    const pick = opts(d).find((o) => /airbnb/i.test(o));
    if (pick) return { settled: { pick, because: fromPlan(`staying at ${/airbnb/.test(style) ? 'an Airbnb' : 'a rental'}`) } };
  }
  // A local party with a few staying the night ("3 staying overnight" at a
  // Thanksgiving) has no room block or rental to choose: she said who stays.
  // No option is claimed for her.
  const n = Number(event.overnightCount) || 0;
  if (event.isDestination !== true && event.guestsStayOvernight === true && n > 0) {
    return { settled: { pick: null, because: fromPlan(`${n} staying overnight`), noDefault: true } };
  }
  return null;
}
function overnightCall(event, d) {
  if (event.guestsStayOvernight !== true) return null;
  const n = Number(event.overnightCount) || 0;
  const options = opts(d);
  if (!n) return null;
  const pick = n <= 3 ? options.find((o) => /one or two/i.test(o)) : options.find((o) => /full house/i.test(o));
  return pick ? { settled: { pick, because: fromPlan(`${n} staying overnight`) } } : null;
}

// ── Theme ───────────────────────────────────────────────────────────────────
const words = (s) => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
function themeCall(event, d) {
  const theme = String(event.theme || '').trim();
  if (!theme) return null;
  const said = new Set(words(theme).filter((w) => w.length > 2));
  const options = opts(d);
  const pick = options.find((o) => words(o).some((w) => said.has(w) || said.has(w.replace(/s$/, ''))))
    || null;
  // A theme she named that no option names is still her answer: it settles the
  // call without our putting words in her mouth (no option is claimed).
  return { settled: { pick, because: fromPlan(theme), noDefault: !pick } };
}

// ── Headcount and budget ────────────────────────────────────────────────────
const COUNT_CALLS = new Set(['guestcount', 'guest_count', 'headcount']);
function countCall(event, d) {
  const n = hostHeadcount(event);
  if (!n) return null;
  const pick = bandFor(opts(d), n);
  if (!pick) return null;
  // Sweet 16's count also asks how many are adults (its `guest_count` is the
  // only one in the corpus), so her count answers half of it.
  if (d.id === 'guest_count') {
    return { partial: {
      pick, known: `${n} guests`, metDependents: true,
      ask: `How many of the ${n} are adults?`,
      options: ['A few (under 5)', '5 to 10', 'More than 10'],
      step: `Count the adults among the ${n}`,
    } };
  }
  return { settled: { pick, because: fromPlan(`${n} guests`) } };
}
function budgetCall(event, d) {
  const total = Number(event.totalBudget) || 0;
  if (!(total > 0)) return null;
  // "$25k–$50k" reads as 25000–50000.
  const numeric = opts(d).map((o) => o.replace(/(\d+)k\b/gi, (_m, k) => String(Number(k) * 1000)).replace(/\$/g, ''));
  const hit = bandFor(numeric, total);
  const band = hit ? opts(d)[numeric.indexOf(hit)] : null;
  if (!band) return null;
  // Wedding's budget (the only `budget` call in the corpus) also asks who pays.
  if (d.id === 'budget') {
    return { partial: {
      pick: band, known: money(total), metDependents: true,
      ask: 'Who pays?',
      options: ['The couple', 'Family is helping', 'Split between the families'],
      step: 'Agree who pays',
    } };
  }
  return { settled: { pick: band, because: fromPlan(money(total)) } };
}

// ── Group travel ────────────────────────────────────────────────────────────
function travelMixCall(event, d) {
  if (event.isDestination !== true || event.travelMode !== 'fly') return null;
  const pick = opts(d).find((o) => /most guests are traveling/i.test(o));
  return pick ? { settled: { pick, because: fromPlan('everyone is flying in') } } : null;
}

// ── When the ceremony happens (Wanda audit P1-1, 11/22/2026) ────────────────
// A two-milestone event asks whether its ceremony comes before, during or
// after the celebration. Her own run of show answers it when one of HER rows
// names the ceremony: first row → before, last → after, between → during.
// Only the stored rows she wrote count (`event.ros`), never the playbook's
// suggested beats. The call's shape is the blocker's (assembleRevealEngines).
export const CEREMONY_TIMING_CALL = { id: 'ceremonyTiming', options: ['before', 'during', 'after'] };
const CEREMONY_WORD = /\b(ceremony|presentation)\b/i;
const NOT_A_NAME = new Set(['the', 'a', 'an', 'her', 'his', 'their', 'our', 'my', 'your', 'official', 'formal', 'army', 'navy']);
function ceremonyCall(event) {
  const rows = (Array.isArray(event.ros) ? event.ros : [])
    .map((r) => ({ r, m: parseStartMinutes(r && r.time) }))
    .filter((x) => x.r && x.m != null && String(x.r.label || '').trim())
    .sort((a, b) => a.m - b.m);
  if (rows.length < 2) return null;
  const at = rows.findIndex((x) => CEREMONY_WORD.test(String(x.r.label)));
  if (at < 0) return null;
  const pick = at === 0 ? 'before' : at === rows.length - 1 ? 'after' : 'during';
  const row = rows[at].r;
  return { settled: { pick, because: fromPlan(`${String(row.label).trim()} at ${String(row.time).trim()}`) } };
}
// The event's own name for its ceremony ("retirement presentation"), read from
// her rows, then her own words about the event; "ceremony" when she never
// named it. Lower case, for use inside a sentence.
export function ceremonyName(event) {
  const ev = event || {};
  const texts = [...(Array.isArray(ev.ros) ? ev.ros.map((r) => r && r.label) : []), ev.meaning, ev.story, ev.name];
  for (const t of texts) {
    const m = /\b([a-z]+)\s+(ceremony|presentation)\b/i.exec(String(t || '')) || null;
    if (m) return (NOT_A_NAME.has(m[1].toLowerCase()) ? m[2] : `${m[1]} ${m[2]}`).toLowerCase();
    if (CEREMONY_WORD.test(String(t || ''))) return String(t).match(CEREMONY_WORD)[1].toLowerCase();
  }
  return 'ceremony';
}

function readCall(event, d) {
  if (!event || !d || !d.id) return null;
  const id = String(d.id);
  if (!opts(d).length) return null;
  if (id === CEREMONY_TIMING_CALL.id) return ceremonyCall(event);
  if (id === 'budget') return budgetCall(event, d);
  if (COUNT_CALLS.has(id)) return countCall(event, d);
  if (PLACE_CALLS.has(id)) return placeCall(event, d);
  if (id === 'serve_time') return serveTimeCall(event, d);
  if (id === 'window') return windowCall(event, d);
  if (id === 'music' || id === 'music_source') return musicCall(event, d);
  if (id === 'dest_lodging') return lodgingCall(event, d);
  if (id === 'overnight_guests') return overnightCall(event, d);
  if (id === 'theme' || id === 'theme_colors') return themeCall(event, d);
  if (id === 'dest_travelmix') return travelMixCall(event, d);
  if (id === 'cooklocation') return spotCall(event, d);
  return null;
}

// WHERE THE FRYER GOES, read from the place she named (audit 2 lane A P1-4):
// a Fish Fry at "Church lot, Annapolis, MD" proposed "Backyard / driveway".
// An option answers when the venue's name holds one of its own place words
// ("church lot", "backyard"); otherwise nothing is settled.
function spotCall(event, d) {
  const place = venueKindOf(event);
  if (!place || !place.name) return null;
  const name = String(place.name).toLowerCase();
  const hits = opts(d).filter((o) => o.split('/').map((w) => w.trim().toLowerCase()).some((w) => w.length >= 4 && name.includes(w)));
  return hits.length === 1 ? { settled: { pick: hits[0], because: place.isHome ? 'Your place' : fromPlan(place.line) } } : null;
}

export function settledFromFacts(event, d) {
  try { const r = readCall(event, d); return (r && r.settled) || null; } catch (_e) { return null; }
}
export function knownPartOf(event, d) {
  try { const r = readCall(event, d); return (r && r.partial && r.partial.options && r.partial.options.length) ? r.partial : null; } catch (_e) { return null; }
}

// ── The allergy question, asked about what is not yet known ─────────────────
// "One guest has a nut allergy" prefills the steppers (heardFacts); the
// question is then whether anyone ELSE has one, not who has one.
// HER OWN DIET CALL IS HEARD TOO (audit 2 P1-2, 11/22/2026). Crab Feast's
// "Who can't eat shellfish…?" and Dinner Party's diet call are answered in
// diet tags; she then got "Who has a food allergy?", the same question again.
// A tag names a need without saying that's everyone (dietaryResolved stays
// false: theChipsReachTheSpread), so the follow-up asks about everyone ELSE.
const ALLERGY_TAG = /allerg|shellfish|gluten|dairy/i;
const chipTags = (event) => {
  const fc = (event && event.foodChoices && typeof event.foodChoices === 'object') ? event.foodChoices : {};
  const out = [];
  for (const [k, v] of Object.entries(fc)) {
    if (!/^dietary(_|$)/.test(k)) continue;
    for (const x of (Array.isArray(v) ? v : String(v == null ? '' : v).split(','))) {
      const t = dietTagFor(x);
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
};
export function allergyAsk(event) {
  const dc = (event && event.dietCounts && typeof event.dietCounts === 'object') ? event.dietCounts : {};
  const known = Object.entries(dc).filter(([k, n]) => ALLERGY_TAG.test(k) && Number(n) > 0);
  const named = chipTags(event).filter((t) => !known.some(([k]) => k === t));
  if (!known.length && !named.length) return 'Who has a food allergy?';
  const said = [...known.map(([k, n]) => `${n} ${k.toLowerCase()}`), ...named.map((t) => t.toLowerCase())].join(', ');
  return `Anyone besides the ${said}?`;
}

// ── A deliberate confirm reads as one ───────────────────────────────────────
// Birthday's "Confirm guest count" is a real step near the day (the count
// moves), so it stays — but with her number in it, one tap, not a blank ask.
export function confirmAskFor(event, d) {
  if (!d || !COUNT_CALLS.has(String(d.id)) || opts(d).length) return null;
  const n = hostHeadcount(event);
  return n ? `Confirm ${n} guests` : null;
}
