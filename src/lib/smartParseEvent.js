// smartParseEvent — the "What are we planning?" free-text parser (V2's
// "Say it like you'd text a friend" input). Extracted from HostShellV2.jsx
// into a shared, pure, testable function — every extraction here used to be
// unverifiable except by hand in a live browser tab; this file gets real
// unit test coverage instead.
//
// Every signal here is a REAL resolver reading the actual text — nothing is
// invented. Where the text is ambiguous (a month+year with no day, a season,
// a bare "next month"), the parser surfaces a `monthYear` OPTIONS signal for
// the host to pick a real day from (see HostShellV2.jsx's date editor) rather
// than guessing a specific day and silently committing it.

import { ALL_PLAYBOOKS } from './playbooks';
import { matchVacationArea } from './vacationAreas';
import { resolveCanonicalType } from './eventTaxonomyAdapter';
import { parseVenueLocation } from './cityText';

// Occasion choices = the REAL playbook catalog: every type the engine ships a
// full playbook for, minus the business types a host never plans.
export const HOST_TYPES = ALL_PLAYBOOKS
  .map(pb => pb && pb.type)
  .filter(t => t && !/board meeting|conference|team retreat/i.test(t));

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
// Each season's canonical anchor month — a reasonable single month to suggest
// Saturdays from (meteorological seasons, not exact solstice dates).
const SEASON_MONTH = { winter: 0, spring: 3, summer: 6, fall: 9, autumn: 9 };

export function parseSmartEventText(text, opts = {}) {
  const t = String(text || '');
  const now = opts.now instanceof Date && !isNaN(opts.now) ? opts.now : new Date();

  // ── Type ────────────────────────────────────────────────────────────────
  let type = null;
  try { const c = resolveCanonicalType(t); if (c && HOST_TYPES.includes(c)) type = c; } catch { type = null; }
  if (!type) {
    const hit = HOST_TYPES.find(ht => t.toLowerCase().includes(ht.toLowerCase().replace(' party', '')));
    if (hit && hit.length > 3) type = hit;
  }

  // ── Guests ──────────────────────────────────────────────────────────────
  let guests = null;
  // The counting noun is whatever word the host reaches for, and the original
  // list held six. "20 cousins flying in" therefore parsed as NO count and the
  // plan silently sized to the reunion typical (~50) — a number the host never
  // said, standing in for one they did. Kinship and group words are how people
  // actually count a room, so they are all here.
  //
  // Deliberately NOT open-ended (\d+ \w+ would read "20 minutes" and "2028 in
  // Asheville" as guest counts). Every noun below is a word for PEOPLE.
  const COUNT_NOUNS = [
    'people', 'guests', 'ppl', 'folks', 'friends', 'pickers', 'attendees', 'heads',
    'adults', 'kids', 'children', 'grandkids', 'teens',
    'cousins', 'relatives', 'family members', 'siblings', 'aunts', 'uncles', 'nieces', 'nephews',
    'coworkers', 'colleagues', 'classmates', 'teammates', 'neighbors', 'neighbours',
    'students', 'staff', 'employees', 'players', 'members',
  ].join('|');
  const gm = t.match(/(?:for|about|around|~)\s*(\d{1,3})\b/i)
    || t.match(new RegExp(`\\b(\\d{1,3})\\s*(?:${COUNT_NOUNS})\\b`, 'i'))
    // "12 of us", "20 of them" — the count with no noun at all.
    || t.match(/\b(\d{1,3})\s+of\s+(?:us|them)\b/i);
  if (gm) guests = parseInt(gm[1], 10);

  // ── Budget — "$3,000", "$3k budget", "budget of $5000", "2500 budget" ────
  // Only ever the first real number found; never averaged from a range, never
  // invented when absent.
  let budget = null;
  // Order matters: the EXPLICIT "budget 5000" / "budget of $5k" form is tried BEFORE the loose
  // "5000 budget" form. Otherwise a date year sitting just before the word budget — "March 20
  // 2027, budget 5000" — is swallowed by /([\d,]+)\s*budget/ (the comma is inside [\d,]+, the
  // space is \s*), so the year 2027 became the budget instead of the 5000 that follows. Host
  // report 2026-07-16: create-flow parsed "$2,027" for "budget 5000".
  // (\d[\d,]*) — a budget number must START with a digit, never a bare comma; otherwise the
  // budget-first pattern matched "budget," in "5000 budget, 40 people" (comma-only capture →
  // NaN) and short-circuited the number-first pattern.
  const bm = t.match(/\$\s*(\d[\d,]*)\s*(k)?\b/i)
    || t.match(/budget\s*(?:of|:)?\s*\$?\s*(\d[\d,]*)\s*(k)?\b/i)
    || t.match(/\b(\d[\d,]*)\s*(k)?\s*budget\b/i);
  if (bm) {
    let n = parseInt(bm[1].replace(/,/g, ''), 10);
    if (bm[2]) n *= 1000;
    if (Number.isFinite(n) && n > 0) budget = n;
  }

  // ── Date ────────────────────────────────────────────────────────────────
  let date = null;
  // Relative forms first — "in 2 weeks", "tomorrow", "next saturday".
  const rel = t.match(/\bin\s+(\d+)\s+(day|week|month)s?\b/i);
  if (rel) {
    const d = new Date(now); const n = parseInt(rel[1], 10);
    if (rel[2].toLowerCase() === 'day') d.setDate(d.getDate() + n);
    else if (rel[2].toLowerCase() === 'week') d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    d.setHours(12); date = d.toISOString().slice(0, 10);
  } else if (/\btomorrow\b/i.test(t)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(12); date = d.toISOString().slice(0, 10);
  } else {
    const wd = t.match(/\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
    if (wd) {
      const d = new Date(now); const target = DAYS.indexOf(wd[1].toLowerCase());
      let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7;
      d.setDate(d.getDate() + add); d.setHours(12); date = d.toISOString().slice(0, 10);
    }
  }
  // ── Date RANGE — "June 12–14", "June 12 to 14", "June 30 to July 2" ─────
  // Tried BEFORE the single "Mon D" matcher, which would otherwise eat the first
  // half and silently DROP the "–14" (the range end vanished — a data-honesty
  // defect, board-confirmed 2026-07-26). endDate is only ever emitted when the
  // host actually said a range; same never-invent rule as everything else here.
  let endDate = null;
  if (!date) {
    // "the" before the end day ("June 12 through the 14th") is ordinary speech and
    // used to break the match, leaving the start parsed and the span dropped.
    // A trailing YEAR is now captured: it was matched by nothing, so "June 12-14,
    // 2028" parsed as the CURRENT year, failed the past check, and was bumped to
    // 2027 — a stated fact silently replaced with a wrong one, which is worse
    // than not hearing it. An explicit year is authoritative and never bumped.
    const rng = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|—|to|through|thru)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
    if (rng) {
      const m1 = MONTHS.indexOf(rng[1].slice(0, 3).toLowerCase());
      const m2 = rng[3] ? MONTHS.indexOf(rng[3].slice(0, 3).toLowerCase()) : m1;
      const saidYear = rng[5] ? parseInt(rng[5], 10) : null;
      const start = new Date(saidYear || now.getFullYear(), m1, parseInt(rng[2], 10), 12);
      if (!saidYear && start < now) start.setFullYear(start.getFullYear() + 1);
      const end = new Date(start.getFullYear(), m2, parseInt(rng[4], 10), 12);
      // Year-straddling ranges ("Dec 30 – Jan 2") bump the end year — but ONLY
      // when a second month was explicitly said; a same-month backwards "range"
      // ("June 14-12") is noise and must fail the end>start check, not get
      // rescued into next year.
      if (end < start && rng[3] && m2 !== m1) end.setFullYear(end.getFullYear() + 1);
      // A same-month "range" running backwards ("June 14-12") is noise, not a span.
      if (!isNaN(start) && !isNaN(end) && end > start) {
        date = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
      }
    }
    // Numeric ranges — "11/13-11/16", "11/13/2026 - 11/16/2026" (host live
    // report 2026-07-27: the numeric form parsed its start and silently
    // DROPPED the end — the same data-honesty defect the word-month range
    // fixed). Both sides must be full M/D; a bare "-16" tail stays unheard
    // (ambiguous against times and phone digits).
    if (!date) {
      const nrng = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:-|–|—|to|through|thru)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i);
      if (nrng) {
        const y1 = nrng[3] ? (nrng[3].length === 2 ? 2000 + Number(nrng[3]) : Number(nrng[3])) : now.getFullYear();
        const start = new Date(y1, Number(nrng[1]) - 1, Number(nrng[2]), 12);
        if (!nrng[3] && start < now) start.setFullYear(start.getFullYear() + 1);
        const y2 = nrng[6] ? (nrng[6].length === 2 ? 2000 + Number(nrng[6]) : Number(nrng[6])) : start.getFullYear();
        const end = new Date(y2, Number(nrng[4]) - 1, Number(nrng[5]), 12);
        // Dec→Jan straddle bumps the end year ONLY on an explicit earlier end
        // month with no typed year; "11/16-11/13" stays noise, never rescued.
        if (!nrng[6] && end < start && Number(nrng[4]) < Number(nrng[1])) end.setFullYear(end.getFullYear() + 1);
        if (!isNaN(start) && !isNaN(end) && end > start) {
          date = start.toISOString().slice(0, 10);
          endDate = end.toISOString().slice(0, 10);
        }
      }
    }
  }
  // The trailing year is captured here for the SAME reason it is in the range
  // matcher above: without it "June 12, 2028" resolved to the current year,
  // failed the past check, and was bumped to 2027 — replacing a date the host
  // stated correctly with a wrong one. Four digits only, so "June 12, 20
  // cousins" can never read the headcount as a year.
  const dm = date ? null : t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
  if (dm) {
    const saidY = dm[3] ? parseInt(dm[3], 10) : null;
    const cand = new Date(saidY || now.getFullYear(), MONTHS.indexOf(dm[1].slice(0, 3).toLowerCase()), parseInt(dm[2], 10), 12);
    if (!saidY && cand < now) cand.setFullYear(cand.getFullYear() + 1);
    date = cand.toISOString().slice(0, 10);
  } else if (!date) {
    const sm2 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (sm2) {
      const y = sm2[3] ? (sm2[3].length === 2 ? 2000 + Number(sm2[3]) : Number(sm2[3])) : now.getFullYear();
      const cand = new Date(y, Number(sm2[1]) - 1, Number(sm2[2]), 12);
      if (!sm2[3] && cand < now) cand.setFullYear(cand.getFullYear() + 1);
      if (!isNaN(cand)) date = cand.toISOString().slice(0, 10);
    }
  }
  // "The weekend of June 12" — extremely common for a trip, and it was parsing
  // the start and dropping the span entirely. It means a block of days, so the
  // span is real and the host said it.
  //
  // NEVER MOVES THE STATED DAY. "Weekend of the 12th" where the 12th is a
  // Saturday could be read as Fri-Sun, but shifting the start BACKWARD would
  // invent a day the host did not say. We only extend FORWARD to the Sunday of
  // that same weekend: Fri -> Sun, Sat -> Sun, and a stated Sunday stays a
  // single day. Understating a span is recoverable; inventing a date is not.
  //
  // ONLY when the stated day is itself part of a weekend. Running blindly
  // forward to the next Sunday turned "the weekend of June 12, 2028" — a MONDAY
  // — into a six-day span, which is a fabricated event length. A weekday date
  // with "weekend of" is genuinely ambiguous (the weekend before? after?), so it
  // stays a single day and the host says which. Understating a span is
  // recoverable; inventing five extra days is not.
  if (date && !endDate && /\bweekend\s+of\b/i.test(t)) {
    const s = new Date(date + 'T12:00:00');
    const dow = s.getDay();                       // 0 Sun … 6 Sat
    if (dow === 5 || dow === 6) {                 // Friday or Saturday
      const e = new Date(s);
      e.setDate(e.getDate() + (7 - dow));         // forward to that Sunday
      endDate = e.toISOString().slice(0, 10);
    }
    // Sunday -> already the last day. Mon-Thu -> not a weekend; do not guess.
  }
  // Duration form — "3-day reunion", "2 nights" — only meaningful once a start
  // date resolved, and never from the relative "in N days" form (rel), whose
  // "N days" phrase would otherwise read as a duration.
  if (date && !endDate && !rel) {
    const dur = t.match(/\b(\d{1,2})\s*-?\s*(night|day)s?\b/i);
    if (dur) {
      const n = parseInt(dur[1], 10);
      const nights = dur[2].toLowerCase() === 'night' ? n : n - 1;
      if (nights > 0 && nights <= 30) {
        const e = new Date(date + 'T12:00:00');
        e.setDate(e.getDate() + nights);
        endDate = e.toISOString().slice(0, 10);
      }
    }
  }
  // Month + year, no day ("June of 2028", "June 2028") — a real signal the
  // host gave, but never precise enough to silently commit as their actual
  // date. We never invent a day for them — same as the type picker offers
  // OPTIONS rather than guessing one occasion, `monthYear` surfaces a few real
  // Saturdays in that month as tappable date OPTIONS; `date` stays null until
  // the host picks or types one.
  let monthYear = null;
  if (!date) {
    const my = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(?:of\s+)?(\d{4})\b/i);
    if (my) {
      const year = parseInt(my[2], 10);
      const month = MONTHS.indexOf(my[1].slice(0, 3).toLowerCase());
      if (!isNaN(year) && month >= 0) monthYear = { year, month, label: MONTH_LABEL[month] + ' ' + year };
    }
  }
  // Bare "next month" / "this month" (no month name given) — same
  // never-invent-a-day principle, reusing the exact same monthYear shape.
  if (!date && !monthYear) {
    if (/\bnext\s+month\b/i.test(t)) {
      const y = now.getFullYear(); const m = now.getMonth() + 1;
      const year = m > 11 ? y + 1 : y; const month = m > 11 ? 0 : m;
      monthYear = { year, month, label: MONTH_LABEL[month] + ' ' + year };
    } else if (/\bthis\s+month\b/i.test(t)) {
      monthYear = { year: now.getFullYear(), month: now.getMonth(), label: MONTH_LABEL[now.getMonth()] + ' ' + now.getFullYear() };
    }
  }
  // Season ("this fall", "next summer") — wider than a month, but still just
  // OPTIONS from the season's anchor month, never a guessed exact date.
  if (!date && !monthYear) {
    const seasM = t.match(/\b(next|this)\s+(winter|spring|summer|fall|autumn)\b/i);
    if (seasM) {
      const season = seasM[2].toLowerCase();
      const seasonLabel = season === 'autumn' ? 'Fall' : season[0].toUpperCase() + season.slice(1);
      const month = SEASON_MONTH[season];
      const year = now.getFullYear() + (seasM[1].toLowerCase() === 'next' ? 1 : 0);
      monthYear = { year, month, label: seasonLabel + ' ' + year };
    }
  }

  // ── Honoree + venue ─────────────────────────────────────────────────────
  const hm = t.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)[’']s\b/)
    // "for Vida", "honoring Marcus" — the honoree named without a possessive
    // (host report 2026-07-27: "Birthday celebration for Vida" dropped the name).
    // Months/weekdays/pronouns/articles are excluded so "for November" or
    // "for My friends" never invents an honoree; "for Mom" stays valid.
    || (() => {
      const m = t.match(/\b(?:for|honoring|celebrating)\s+([A-Z][a-zA-Z]+)\b/);
      if (!m) return null;
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|My|Our|The|A|An|Me|Us|Him|Her|Them|Everyone|Family|Friends)$/i.test(m[1])) return null;
      return m;
    })();
  const home = /backyard|back\s?yard|at home|my place|our (house|home)|the house/i.test(t);
  // Venue phrase kept VERBATIM — "my brother's backyard" is the venue, not a
  // generic "Backyard". Guests read this in invites and rain notes.
  const vm = t.match(/\b(?:in|at)\s+((?:my|our|his|her|their)\s+[a-z]+(?:['’]s)?\s+(?:backyard|back\s?yard|house|place|yard|home|garden|farm|cabin|lake house))\b/i)
    || t.match(/\b(?:in|at)\s+(the\s+(?:park|beach|clubhouse|pavilion|community center))\b/i);
  const venuePhrase = vm ? vm[1].charAt(0).toUpperCase() + vm[1].slice(1) : '';

  // ── Milestone number ("80th birthday", "50th anniversary") ──────────────
  // A real signal that used to be silently discarded — carried into the event
  // NAME by the caller rather than invented as a new standalone field.
  const msm = t.match(/\b(\d{1,3}(?:st|nd|rd|th))\s+(?:birthday|anniversary)\b/i);
  const milestone = msm ? msm[1].toLowerCase() : null;

  // ── City + state ("in Santa Fe, New Mexico") ─────────────────────────────
  // Routed through the SAME parseVenueLocation the manual "Which town?" field
  // already uses, so a two-word city and a full state name both resolve
  // correctly. A bare city with no state is deliberately NOT accepted here
  // either (same strict gate the manual field uses — a guessed state would be
  // worse than asking).
  // Three comma parts FIRST — "at City Park, New Orleans, LA" (live-drive find
  // 2026-07-27: the 2-part gate swallowed "City Park, New Orleans" as
  // city+state, the strict state gate refused it, and BOTH the venue and the
  // town were dropped). Part 1 is the venue VERBATIM; parts 2+3 go through the
  // same strict parseVenueLocation gate, so "at the park, food, and games"
  // can never invent a location ("games" is not a state).
  const l3 = t.match(/\b(?:in|at)\s+([A-Z][\w.'’-]*(?:\s+[\w.'’-]+){0,4}?),\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
  const loc3 = l3 ? (() => { try { return parseVenueLocation(l3[2] + ', ' + l3[3]); } catch { return null; } })() : null;
  const venueAt = loc3 && l3 ? l3[1].trim() : '';
  const lm = t.match(/\b(?:in|at)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
  const loc = loc3 || (lm ? (() => { try { return parseVenueLocation(lm[1] + ', ' + lm[2]); } catch { return null; } })() : null);

  // ── Destination modifier — a real signal, surfaced as a SUGGESTION ───────
  // (the host confirms/edits it via a real toggle, same "suggest don't
  // invent" pattern as the guest-count typical and the month+year date
  // options) never silently committed as a fact from wording alone.
  // Vacation AREAS (host ask 2026-07-27): "Deep Creek Lake" is not a City, ST —
  // the strict gate is right to reject it — but it IS a destination with a
  // recognizable name and a real hub town. The curated registry supplies all
  // three facts honestly; the hub town (not the area) anchors weather/maps.
  const area = matchVacationArea(t);

  // ── What isDestination ACTUALLY means ────────────────────────────────────
  // Read the decisions it gates: "How many guests are traveling in", "How are
  // guests staying", "Are you providing group transport". The flag is about
  // GUESTS TRAVELLING, not about the host leaving home. That distinction sets
  // the two rules below.
  //
  // STRONG signals — explicit travel language, or a named vacation area. These
  // stand on their own and are never suppressed by the home comparison: "18
  // people flying in" is a travel event even when the party is in your own town.
  //
  // The old pattern was `fly (?:in|out)`, which required the bare stem and so
  // missed the ordinary gerund — "flying in" did not match, and one missed
  // boolean silently removes the entire travel stack (travelPlan returns
  // relevant:false, destinationDecisionsFor returns [], the destination tasks
  // and vendor categories never layer on). Stems and travel nouns now count.
  const TRAVEL_STRONG = new RegExp([
    '\\bdestination\\b',
    '\\bout[- ]of[- ]town\\b', '\\boutta town\\b',
    '\\bflights?\\b',
    '\\b(?:fly|flies|flying|flew)\\s+(?:in|out|into|down|up|over)\\b',
    '\\b(?:travel|travels|travell?ing)\\s+(?:in|out|from|down|up|over)\\b',
    '\\bcoming\\s+in\\s+from\\b', '\\bin\\s+town\\s+for\\b',
    '\\b(?:weekend|day|road)\\s+trip\\b', '\\btrip\\s+to\\b',
    '\\bgetaway\\b', '\\bretreat\\b',
    '\\bdriv(?:e|ing)\\s+(?:up|down|out|in)\\b',
  ].join('|'), 'i');
  const travelSaid = TRAVEL_STRONG.test(t) || !!area;

  // A bare place name after travel phrasing — "weekend trip to Asheville".
  // parseVenueLocation deliberately refuses a city with no state (a guessed
  // state is worse than asking), and that strict gate is right for COMMITTING a
  // location. But the destination flag does not need a state: it needs to know
  // the place is not home. Captured for that comparison only; it never becomes
  // venueCity.
  const awayM = t.match(/\b(?:trip|getaway|retreat|flying|driving|heading|going|traveling|travelling)\s+(?:up\s+|down\s+|out\s+|back\s+|over\s+)?to\s+([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,2})\b/);
  const awayPlace = awayM ? awayM[1].trim() : '';

  // WEAK signal — a city was parsed at all. On its own this over-fires: a
  // gathering "in Annapolis, MD" hosted BY someone in Annapolis was being
  // flagged as a destination event purely because a city resolved. The host's
  // own area is the missing half of the comparison; it already exists on the
  // profile ("Your area"), and eventGeoQuery reads it — the parser simply was
  // never handed it. With it, the weak signal only counts when the place
  // differs from home, which removes false positives as well as adding misses.
  const normCity = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const homeCity = normCity(opts.homeCity);
  const placeName = (loc && loc.city) || awayPlace || '';
  const placeAway = !!placeName && (!homeCity || normCity(placeName) !== homeCity);
  const isDestination = travelSaid || ((!!loc || !!awayPlace) && placeAway);

  // Why it was decided, for the "· heard" chip and any later explanation. Never
  // a silent commit: the host still confirms via the toggle.
  const destinationBasis = !isDestination ? null
    : travelSaid ? 'travel-language'
    : (homeCity ? 'place-differs-from-your-area' : 'place-named');

  // ── The two axes that actually pick the destination decisions ────────────
  // One boolean cannot separate a staycation from a fly-in wedding, yet it gates
  // the same four rows for both. What decides them is narrower:
  //   overnight -> lodging ("How are guests staying")
  //   mode      -> transport ("Are you providing group transport"), airport runs
  // Both are HINTS ONLY. They pre-select the intake questions; they never commit,
  // because a guess here silently adds or removes whole decisions. null means
  // "not heard" — the host answers, and their answer wins.

  // Mode, strictly from what was said. Never inferred from distance: we hold no
  // city coordinates (usCitiesFull is names only), so any mileage would be made up.
  const saidFly = /\bflights?\b|\b(?:fly|flies|flying|flew)\b|\bairports?\b|\blanding\b/i.test(t);
  const saidDrive = /\bdriv(?:e|es|ing)\b|\broad\s+trip\b|\bcaravan\b|\bcarpool\b/i.test(t);
  const travelMode = (saidFly && saidDrive) ? 'mixed' : saidFly ? 'fly' : saidDrive ? 'drive' : null;

  // Overnight. A multi-day span is the strongest honest signal there is — if the
  // plan runs across days, people are sleeping somewhere. Lodging words say it
  // outright. A staycation is local AND overnight, which is exactly the case the
  // single boolean could not express.
  const saidOvernight = /\bovernight\b|\bnights?\b|\bstaycation\b|\bstay(?:ing|cation)?\s+over\b|\bhotels?\b|\bairbnb\b|\bvrbo\b|\brentals?\b|\blodging\b|\broom\s+block\b|\bcabins?\b/i.test(t);
  const overnight = (endDate || saidOvernight) ? true : null;
  const overnightBasis = !overnight ? null : (endDate ? 'multi-day-span' : 'said-so');

  // TIME OF DAY — the coarse word the host actually said. This used to be dropped entirely,
  // so "cookout in the afternoon" created an event with NO time signal at all, and the
  // grounded start-time default (which needs a bucket OR a forecast to propose from) had
  // nothing to work with — the one thing the host told us about WHEN was thrown away. This is
  // the BUCKET, never a clock: "afternoon", not "3:00 PM". eventWhen/startTime turn it into a
  // proposed hour later, which the host still owns. Order matters — check "late" and specific
  // words before the generic ones so "late morning" doesn't match "morning".
  const timeOfDay = (() => {
    if (/\blate night\b/i.test(t)) return 'late';
    if (/\bmorning\b|\bbrunch\b|\bam\b/i.test(t)) return 'morning';
    if (/\bafternoon\b|\bmidday\b|\bnoon\b/i.test(t)) return 'afternoon';
    if (/\bevening\b|\bsunset\b|\bdinner\b/i.test(t)) return 'evening';
    if (/\bnight\b|\bpm party\b/i.test(t)) return 'night';
    return null;
  })();

  // ── Secondary type — a DUAL / compound event ("retirement AND 50th birthday") ─
  // The primary `type` is the resolved one; if the text clearly names a SECOND
  // occasion, carry it so the caller can build a compound event instead of silently
  // dropping half of it. A "Nth birthday/anniversary" milestone names that type even
  // on its own. Only ever a type the host actually said — never invented.
  let secondaryType = null;
  if (type) {
    const mentioned = HOST_TYPES.filter((ht) => {
      const key = ht.toLowerCase().replace(' party', '');
      return key.length > 3 && t.toLowerCase().includes(key);
    });
    const milestoneType = /\d{1,3}(?:st|nd|rd|th)\s+birthday/i.test(t) ? 'Birthday'
      : /\d{1,3}(?:st|nd|rd|th)\s+anniversary/i.test(t) ? 'Anniversary'
        : (/\bbirthday\b/i.test(t) ? 'Birthday' : null);
    const others = [...new Set([...mentioned, ...(milestoneType ? [milestoneType] : [])])]
      .filter((x) => x && x !== type && HOST_TYPES.includes(x));
    if (others.length) secondaryType = others[0];
  }

  // ── Theme ("black and gold theme", "theme is X", "X-themed") ─────────────────
  // A real signal the host said; carried so the caller can seed the event's theme
  // instead of dropping it. Captured as the raw phrase, never invented.
  let theme = null;
  const thm = t.match(/\b([a-z][a-z\s&/-]{1,28}?)[- ]themed?\b/i)
    || t.match(/\btheme\s*(?:is|:)?\s*([a-z][a-z\s&/-]{1,28}?)(?:[,.]|$)/i);
  if (thm && thm[1]) {
    const raw = thm[1].trim().replace(/\s+/g, ' ');
    if (raw && !/^the$/i.test(raw)) theme = raw;
  }

  // ── Per-person money — "$200 a person", "per head", "each", "pp" ─────────────
  // The amount the host typed is per-guest, not the total; multiply by the parsed
  // count so budget means what they meant (host report 2026-07-27: "$200 a person
  // for the rental house" for 10 people parsed as a $200 TOTAL budget).
  if (budget != null && guests
    && /\$?\s*\d[\d,]*\s*k?\s*(?:(?:a|per)\s+(?:person|head|guest|adult)|each\b|pp\b)/i.test(t)) {
    budget = budget * guests;
  }

  // ── Rented roof — Airbnb/VRBO/cabin/lake house is a VENUE, not home ──────────
  // venueKind '' falls back to 'home' downstream (doItForMe atHome), which is
  // exactly wrong for a destination rental; 'venue' is the consumed vocabulary.
  const lodging = /\b(airbnb|vrbo|lake\s*house|beach\s*house|cabin|rental\s+(?:house|home|condo)|rent(?:ed|ing)?\s+(?:an?\s+)?(?:airbnb|vrbo|house|cabin|condo))\b/i.test(t);

  return {
    type, secondaryType, theme, guests, budget, date, endDate, monthYear, milestone, isDestination, destinationBasis, travelMode, overnight, overnightBasis, timeOfDay,
    honoree: hm ? hm[1] : null,
    venueKind: home || /\bmy|our\b/i.test(venuePhrase) ? 'home' : (lodging || venueAt ? 'venue' : ''),
    venue: venuePhrase || venueAt || (home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : (area ? area.label : '')),
    venueCity: loc ? (loc.zip || loc.city) : (area ? area.hubTown : null),
    venueState: loc ? (loc.state || null) : (area ? area.state : null),
    vacationArea: area ? area.id : null,
    // "No kids." / "adults only" → the invite policy InviteV2 + doItForMe already
    // consume; never invented — only when the host said it.
    kidsPolicy: /\bno\s+(?:kids|children)\b|\badults?[\s-]only\b/i.test(t) ? 'adults_only'
      : /\bkids?\s+(?:are\s+)?welcome\b|\bfamily[\s-]friendly\b/i.test(t) ? 'kids_welcome' : null,
  };
}
