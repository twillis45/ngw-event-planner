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
import { matchLandmark } from './knowledge/landmarkGazetteer';
import { resolveCanonicalType, GENERIC_GATHERING_WORDS } from './eventTaxonomyAdapter';
import { parseVenueLocation, resolveSpokenCity, US_STATE_NAME_TO_ABBR } from './cityText';
import { resolveHoliday } from './holidayDates.mjs';
// ── EVERY DATE THIS PARSER EMITS IS A LOCAL CALENDAR DATE ───────────────────
//
// It used `toISOString().slice(0, 10)` at THIRTEEN sites, four of them behind
// `setHours(12)` — the noon trick, which is safe only while the UTC offset is
// inside +/-12 and slides a day beyond it. The other nine had no guard at all.
//
// MEASURED 2026-09-26 at TZ=Pacific/Kiritimati (UTC+14): this parser's own suite
// plus parseCorpusGolden, howPeopleActuallyWriteIt, guestCountNouns,
// dateSpanIntake, vidaIntakeParse and destinationBarePlace all failed on dates
// one day off. A host who says "tomorrow" means a day on THEIR calendar, which
// is what `localISO` returns; `toISOString()` answers in UTC.
//
// The `setHours(12)` calls are left alone. They are no longer load-bearing for
// the formatting, and removing them would be a second change riding along.
import { localISO } from './dates';

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
  // ONE resolver, used for the real parse AND for the "was this a guess?"
  // re-run below. The first version of typeBasis called resolveCanonicalType
  // alone and marked "Pupusa Gathering", "Ethiopian Coffee Ceremony" and
  // "Repast" as guesses — all three are found by the SECOND step, so comparing
  // against only the first said "guess" about types the host had named exactly.
  const _resolveType = (text) => {
    let out = null;
    try { const c = resolveCanonicalType(text); if (c && HOST_TYPES.includes(c)) out = c; } catch { out = null; }
    if (!out) {
      const hit = HOST_TYPES.find(ht => text.toLowerCase().includes(ht.toLowerCase().replace(' party', '')));
      if (hit && hit.length > 3) out = hit;
    }
    return out;
  };
  const type = _resolveType(t);

  // ── WAS THAT TYPE A GUESS? ───────────────────────────────────────────────
  //
  // MEASURED 2026-09-23: delete ONE character from the type word and 35 of 45
  // playbook types resolve to Birthday. "Graduaton party", "Bridl Shower",
  // "Retiement Party" — every one lands on a birthday playbook with a birthday
  // checklist, birthday risks and birthday food, stated with no hedge at all.
  //
  // The cause is a deliberate last-resort rule: any text containing "party" (or
  // celebration / bash / soiree / fiesta / shindig) maps to Birthday. That is a
  // reasonable catch-all for a host who genuinely just says "a party". It is
  // not reasonable as a silent answer to a typo.
  //
  // So the rule stays and the GUESS IS DECLARED. Decided by the same technique
  // unusedClauses uses: strip the generic words and re-resolve. If the type
  // survives, something specific named it; if it evaporates, the catch-all is
  // the only thing holding it up.
  // The SAME list the taxonomy's fallback rule uses — imported, never copied.
  // A private copy drifted within one commit of being written.
  const _GENERIC_PARTY_WORDS = new RegExp(GENERIC_GATHERING_WORDS.source + '|\\bparties\\b', 'gi');
  let typeBasis = null;
  if (type) {
    let specific = null;
    try { specific = _resolveType(t.replace(_GENERIC_PARTY_WORDS, ' ')); } catch { specific = null; }
    typeBasis = specific === type ? 'named' : 'generic';
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
    'headcount', 'head count',
    'adults', 'kids', 'children', 'grandkids', 'teens',
    'cousins', 'relatives', 'family members', 'siblings', 'aunts', 'uncles', 'nieces', 'nephews',
    'coworkers', 'colleagues', 'classmates', 'teammates', 'neighbors', 'neighbours',
    'students', 'staff', 'employees', 'players', 'members',
    'guys', 'girls', 'gals', 'ladies', 'dudes', 'bridesmaids', 'groomsmen',
  ].join('|');
  const gm = t.match(/(?:for|about|around|~)\s*(\d{1,3})\b/i)
    || t.match(new RegExp(`\\b(\\d{1,3})\\s*(?:${COUNT_NOUNS})\\b`, 'i'))
    // "12 of us", "20 of them" — the count with no noun at all.
    || t.match(/\b(\d{1,3})\s+of\s+(?:us|them)\b/i)
    // HOW PEOPLE ACTUALLY HEDGE A NUMBER (measured 2026-09-23 against a corpus
    // of real phrasings). "20ish" and "20 or so" are a count with an
    // approximation marker glued on, and both returned NOTHING — the host said
    // a number out loud and the plan sized itself to the playbook typical
    // instead. The marker does not change the number; it is already an
    // estimate, and the app already shows a likely-attendance band around it.
    || t.match(/\b(\d{1,3})\s*(?:ish|-ish)\b/i)
    || t.match(/\b(\d{1,3})\s+or\s+so\b/i);
  if (gm) guests = parseInt(gm[1], 10);

  // ── A COUPLE IS TWO PEOPLE (2026-09-25) ───────────────────────────
  //
  // Host-reported, with the string that failed: "50th birthday nov 2027 8
  // couples 5 nights Disneyland ...". It parsed guests as NULL, so a sixteen-
  // person trip sized itself to the Birthday playbook's typical — a number the
  // host never said, standing in for one they did. That is the exact defect the
  // COUNT_NOUNS list above was widened to fix; "couples" is the same failure in
  // a different word.
  //
  // It is NOT in COUNT_NOUNS because those are one-for-one: 20 cousins is 20
  // people. A pair noun is a MULTIPLIER, and folding it into that list would
  // have counted eight.
  //
  // Only consulted when no one-for-one count matched, so "16 guests, 8 couples"
  // reads sixteen and never thirty-two.
  if (guests === null) {
    const PAIR_NOUNS = 'couples|pairs|duos';
    const pm = t.match(new RegExp(`\\b(\\d{1,3})\\s*(?:${PAIR_NOUNS})\\b`, 'i'));
    if (pm) guests = parseInt(pm[1], 10) * 2;
  }

  // ── DOZENS ────────────────────────────────────────────────────────────────
  // "a dozen", "half a dozen", "a couple dozen" are counts, not slang for
  // "some" — a host who writes them has a number in mind and it is exact.
  // Only consulted when no digit form matched, so "20 people, a dozen chairs"
  // can never be read as twelve guests.
  if (guests === null) {
    // "half a dozen" — the quantifier can sit TWO words out, and an earlier
    // version matched the trailing "a dozen" and returned 12 for six people.
    const dz = t.match(/\b(?:(half|a|one|two|three|couple|few)\s+(?:of\s+)?(?:a\s+)?)?dozen\b/i);
    if (dz) {
      const word = (dz[1] || 'a').toLowerCase();
      const mult = { half: 0.5, a: 1, one: 1, two: 2, couple: 2, few: 3, three: 3 }[word];
      if (mult) guests = Math.round(12 * mult);
    }
  }

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
  //
  // "1.5k" USED TO PARSE AS $1 (found 2026-09-23 auditing how people really
  // write). The capture was (\d[\d,]*) — no decimal point — so it took the "1",
  // then the (k)? could not match because a "." stood in the way, and a host who
  // said fifteen hundred dollars was recorded as having one dollar. A WRONG
  // number, not a missing one, which is the worse failure.
  //
  // Money words added with it: "grand" is unambiguous in this position, and so
  // is "k". A bare "g" is NOT added — "5G" is a phone network as often as it is
  // five thousand dollars, and a wrong budget is what this whole comment is
  // about. The verb forms ("spend about 2k", "under 3 grand", "up to $4000")
  // REQUIRE a money marker — a currency sign, k, or grand — so that "about 45
  // people" can never be read as a budget of 45.
  const _NUM = '(\\d[\\d,]*(?:\\.\\d+)?)';
  const _MULT = '(k|grand)?';
  const bm = t.match(new RegExp(`\\$\\s*${_NUM}\\s*${_MULT}\\b`, 'i'))
    || t.match(new RegExp(`budget\\s*(?:of|:)?\\s*\\$?\\s*${_NUM}\\s*${_MULT}\\b`, 'i'))
    || t.match(new RegExp(`\\b${_NUM}\\s*${_MULT}\\s*budget\\b`, 'i'))
    || t.match(new RegExp(
      `\\b(?:spend(?:ing)?|under|up\\s+to|max(?:imum)?|around|about|no\\s+more\\s+than)\\s*`
      + `\\$?\\s*${_NUM}\\s*(k|grand)\\b`, 'i'))
    // A bare "3 grand" with no verb at all. "grand" is money and nothing else
    // in this context, so it needs no framing. A bare "5k" deliberately does
    // NOT get the same treatment — "the 5k" is a road race, and this parser has
    // already shipped one wrong budget.
    || t.match(new RegExp(`\\b${_NUM}\\s*(grand)\\b`, 'i'));
  if (bm) {
    let n = parseFloat(bm[1].replace(/,/g, ''));
    if (bm[2]) n *= 1000;
    n = Math.round(n);
    if (Number.isFinite(n) && n > 0) budget = n;
  }

  // ── Date ────────────────────────────────────────────────────────────────
  let date = null;
  // Relative forms first — "today", "tonight", "in 2 weeks", "tomorrow", "next saturday".
  // "Today"/"tonight" is the most literal date a host can say — same-day plans
  // ("BBQ at my brother's house today at 3pm") were falling through every
  // branch below to "no date yet", which is worse than not asking: the host
  // DID say the date, in the one form the parser didn't recognize.
  const rel = t.match(/\bin\s+(\d+)\s+(day|week|month)s?\b/i);
  if (/\btoday\b|\btonight\b/i.test(t)) {
    const d = new Date(now); d.setHours(12); date = localISO(d);
  } else if (rel) {
    const d = new Date(now); const n = parseInt(rel[1], 10);
    if (rel[2].toLowerCase() === 'day') d.setDate(d.getDate() + n);
    else if (rel[2].toLowerCase() === 'week') d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    d.setHours(12); date = localISO(d);
  } else if (/\btomorrow\b/i.test(t)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(12); date = localISO(d);
  } else {
    const wd = t.match(/\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
    if (wd) {
      const d = new Date(now); const target = DAYS.indexOf(wd[1].toLowerCase());
      let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7;
      d.setDate(d.getDate() + add); d.setHours(12); date = localISO(d);
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
        date = localISO(start);
        endDate = localISO(end);
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
          date = localISO(start);
          endDate = localISO(end);
        }
      }
    }
  }
  // The trailing year is captured here for the SAME reason it is in the range
  // matcher above: without it "June 12, 2028" resolved to the current year,
  // failed the past check, and was bumped to 2027 — replacing a date the host
  // stated correctly with a wrong one. Four digits only, so "June 12, 20
  // cousins" can never read the headcount as a year.
  // ── "THE 14TH OF JUNE" — DAY BEFORE MONTH ────────────────────────────────
  // Measured 2026-09-23 against how people actually write: this returned NO
  // DATE. It is an ordinary English way to say a date, and it is the dominant
  // way in most of the world. The month-first matcher below cannot see it
  // because the number comes first.
  //
  // Requires the ordinal or the word "of" — a bare "14 June" is admitted, but
  // "20 people June 14" must never read the 20 as a day, so the day half is
  // capped at 31 and an intervening word is not allowed.
  const dmOf = date ? null : t.match(
    /\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s*(\d{4}))?\b/i);
  if (dmOf && Number(dmOf[1]) >= 1 && Number(dmOf[1]) <= 31) {
    const saidY = dmOf[3] ? parseInt(dmOf[3], 10) : null;
    const cand = new Date(saidY || now.getFullYear(),
      MONTHS.indexOf(dmOf[2].slice(0, 3).toLowerCase()), parseInt(dmOf[1], 10), 12);
    if (!saidY && cand < now) cand.setFullYear(cand.getFullYear() + 1);
    date = localISO(cand);
  }

  const dm = date ? null : t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
  if (dm) {
    const saidY = dm[3] ? parseInt(dm[3], 10) : null;
    const cand = new Date(saidY || now.getFullYear(), MONTHS.indexOf(dm[1].slice(0, 3).toLowerCase()), parseInt(dm[2], 10), 12);
    if (!saidY && cand < now) cand.setFullYear(cand.getFullYear() + 1);
    date = localISO(cand);
  } else if (!date) {
    const sm2 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (sm2) {
      const y = sm2[3] ? (sm2[3].length === 2 ? 2000 + Number(sm2[3]) : Number(sm2[3])) : now.getFullYear();
      const cand = new Date(y, Number(sm2[1]) - 1, Number(sm2[2]), 12);
      if (!sm2[3] && cand < now) cand.setFullYear(cand.getFullYear() + 1);
      if (!isNaN(cand)) date = localISO(cand);
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
      endDate = localISO(e);
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
        endDate = localISO(e);
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
  // ── A NAMED HOLIDAY IS AN EXACT DATE ────────────────────────────────────
  // Found by a systematic field sweep, 2026-09-23: "thanksgiving 2027",
  // "juneteenth 2027", "labor day weekend 2027", "christmas eve 2027", "new
  // years eve 2027" and "mothers day 2027" all returned NO DATE. People plan
  // around holidays constantly, and each of those hosts typed the single most
  // important fact and watched it disappear.
  //
  // These are computed, not guessed — a fixed calendar date or a published rule
  // ("the fourth Thursday in November") — which is why this may set an exact
  // `date` where the season handler below only offers a month. It runs AFTER
  // every explicit form, so a host who wrote both a holiday and a real date
  // keeps the date they wrote.
  if (!date) {
    const hol = resolveHoliday(t, now);
    if (hol) date = hol.date;
  }
  // Season ("this fall", "next summer") — wider than a month, but still just
  // OPTIONS from the season's anchor month, never a guessed exact date.
  if (!date && !monthYear) {
    // "summer 2027" — a season with the year said outright — resolved to
    // NOTHING, because this only read the relative forms. A host who names the
    // year is being MORE specific than one who says "next summer", and was
    // getting less for it.
    const seasM = t.match(/\b(next|this)\s+(winter|spring|summer|fall|autumn)\b/i)
      || t.match(/\b(winter|spring|summer|fall|autumn)\s+(20\d{2})\b/i)
      || t.match(/\b(20\d{2})\s+(winter|spring|summer|fall|autumn)\b/i);
    if (seasM) {
      const parts = seasM.slice(1).filter(Boolean).map((x) => String(x).toLowerCase());
      const season = parts.find((x) => SEASON_MONTH[x] !== undefined);
      const saidYear = parts.find((x) => /^20\d{2}$/.test(x));
      const rel = parts.find((x) => x === 'next' || x === 'this');
      if (season) {
        const seasonLabel = season === 'autumn' ? 'Fall' : season[0].toUpperCase() + season.slice(1);
        const month = SEASON_MONTH[season];
        const year = saidYear ? Number(saidYear)
          : now.getFullYear() + (rel === 'next' ? 1 : 0);
        monthYear = { year, month, label: seasonLabel + ' ' + year };
      }
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
    })()
    // ── THE HONOREE IS USUALLY A RELATIONSHIP, NOT A NAME ──────────────────
    // Found by a systematic field sweep, 2026-09-23: only a CAPITALISED name
    // resolved, so "birthday party for mom" and "birthday for my grandmother"
    // carried no honoree at all — and most milestone birthdays are thrown for
    // exactly those people, written exactly that way. The honoree reaches the
    // event name and the invite, so losing it loses whose party it is.
    //
    // Capitalised to match the name form's output ("Mom", not "mom"), and the
    // possessive "my" is dropped so the label reads "for Mom" rather than
    // "for my mom".
    || (() => {
      const m = t.match(/\b(?:for|honoring|celebrating)\s+(?:my\s+|our\s+)?((?:great[\s-]*)?(?:grand)?(?:mom|mommy|mama|momma|mother|dad|daddy|father|pop|pops|ma|grandma|granny|grandmother|grandad|granddad|grandpa|grandfather|auntie|aunt|uncle|sister|brother|cousin|wife|husband|son|daughter|nephew|niece|godmother|godfather|bestie|best\s+friend|partner|fianc[ée]e?))\b/i);
      if (!m) return null;
      const word = m[1].replace(/\s+/g, ' ').toLowerCase();
      return [m[0], word.charAt(0).toUpperCase() + word.slice(1)];
    })();
  // "AT MY HOUSE" WAS NOT IN THIS LIST. Found by a systematic field sweep,
  // 2026-09-23: the pattern carried `my place`, `our house` and `the house` and
  // somehow never the commonest phrasing of all. venueKind drives the whole
  // home-versus-booked-venue lane, so a host hosting at home was being routed as
  // if they still had a venue to find.
  //
  // A RELATIVE'S HOME IS STILL A HOME — "at mom's house", "at my sister's
  // place" need no venue booking, which is the distinction venueKind exists to
  // draw. The possessive form is required, so a bare "the club" or "the hall"
  // cannot slip in.
  const home = /backyard|back\s?yard|at home|my (?:place|house|home|crib|spot)|our (?:house|home|place)|the (?:house|crib)/i.test(t)
    || /\b(?:at|in)\s+(?:my\s+)?(?:mom|mama|momma|mother|dad|father|pop|grandma|granny|grandmother|grandad|grandpa|auntie|aunt|uncle|sister|brother|cousin|parents?|folks)(?:['’]?s)?\s+(?:house|place|home|yard|backyard)\b/i.test(t);
  // Venue phrase kept VERBATIM — "my brother's backyard" is the venue, not a
  // generic "Backyard". Guests read this in invites and rain notes.
  const vm = t.match(/\b(?:in|at)\s+((?:my|our|his|her|their)\s+[a-z]+(?:['’]s)?\s+(?:backyard|back\s?yard|house|place|yard|home|garden|farm|cabin|lake house))\b/i)
    || t.match(/\b(?:in|at)\s+(the\s+(?:park|beach|clubhouse|pavilion|community center))\b/i)
    // ── THE ROOMS PEOPLE ACTUALLY RENT ────────────────────────────────────
    // The 80th-birthday drive typed "at the church hall in Baltimore" and the
    // hall vanished — only the city survived. These are the ordinary rented
    // rooms for a repast, a milestone birthday, a reunion: the church hall, the
    // fire hall, the VFW, the rec center, the lodge. Kept verbatim, because
    // guests read this line in the invite.
    || t.match(/\b(?:in|at)\s+((?:the\s+|a\s+)?(?:church|fellowship|banquet|fire|legion|social|event|reception|dining|great)\s+(?:hall|room|space|center|centre))\b/i)
    || t.match(/\b(?:in|at)\s+((?:the\s+|a\s+)?(?:vfw|elks?\s*lodge|masonic\s*(?:temple|lodge)|rec(?:reation)?\s*center|senior\s*center|banquet\s*facility|ballroom|event\s*space|country\s*club))\b/i);
  const venuePhrase = vm ? vm[1].charAt(0).toUpperCase() + vm[1].slice(1) : '';

  // ── Milestone number ("80th birthday", "50th anniversary") ──────────────
  // A real signal that used to be silently discarded — carried into the event
  // NAME by the caller rather than invented as a new standalone field.
  const msm = t.match(/\b(\d{1,3}(?:st|nd|rd|th))\s+(?:birthday|anniversary)\b/i);
  // "she's turning 80", "mom turns 40 in June" — the same milestone said as a
  // verb rather than an ordinal. It was dropped entirely; the sweep found it.
  // The ordinal suffix is derived, not guessed: 1st/2nd/3rd/nth by the ordinary
  // English rule, including the 11th/12th/13th exceptions.
  const turnM = msm ? null : t.match(/\bturn(?:s|ing)\s+(\d{1,3})\b/i);
  const _ord = (n) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  };
  const milestone = msm ? msm[1].toLowerCase()
    : (turnM ? _ord(parseInt(turnM[1], 10)) : null);

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
  // BACK OFF A WORD AT A TIME (live-drive find 2026-08-03). The state group was
  // unbounded, so any capitalised word that merely FOLLOWED the state was pulled
  // into it: "in Santa Fe, New Mexico June 17-21 2028" parsed the state as
  // "New Mexico June", parseVenueLocation rightly refused it, and the town was
  // dropped entirely — while "…New Mexico in June of 2028" parsed fine. Same
  // city, different neighbouring word.
  //
  // A simple cap does not fix it ("Austin, Texas June" is two words and still
  // wrong), so try the LONGEST state candidate first and shorten until one
  // resolves. The strict gate is untouched: if no candidate is a real state,
  // this still returns null rather than guessing.
  const tryLoc = (city, stateText) => {
    const words = String(stateText || '').trim().split(/\s+/).filter(Boolean);
    for (let n = words.length; n >= 1; n -= 1) {
      try {
        const r = parseVenueLocation(city + ', ' + words.slice(0, n).join(' '));
        if (r) return r;
      } catch { /* shorter candidate next */ }
    }
    return null;
  };
  const l3 = t.match(/\b(?:in|at)\s+([A-Z][\w.'’-]*(?:\s+[\w.'’-]+){0,4}?),\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
  const loc3 = l3 ? tryLoc(l3[2], l3[3]) : null;
  const venueAt = loc3 && l3 ? l3[1].trim() : '';
  const lm = t.match(/\b(?:in|at)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
  const locSaid = loc3 || (lm ? tryLoc(lm[1], lm[2]) : null);
  // NOT EVERY HOST WRITES A PREPOSITION (live drive 2026-08-04). Both patterns
  // above require "in"/"at" before the town, so the perfectly ordinary
  // "80th birthday for Linda Stewart, 10 of us, Santa Fe, NM resort spa,
  // June 17-21" dropped the town entirely — and with it the whole destination
  // stack, because isDestination reads `loc`: the app answered "Local event"
  // for a five-day trip to a Santa Fe resort. Hosts list facts comma-separated
  // as often as they write sentences.
  //
  // So: scan the comma-separated segments for a City, ST pair anywhere in the
  // text. This invents NOTHING — every candidate goes through the same strict
  // parseVenueLocation gate, which requires a real state and refuses digits, so
  // "Linda Stewart, 10 of us" and "Vida Haynes, 10 people" are rejected on the
  // way past. Runs only when the prepositional forms found nothing.
  const locLoose = locSaid || (() => {
    const re = /([A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,3})\s*,\s*([A-Za-z][\w.'’-]*(?:\s+[A-Za-z][\w.'’-]*){0,3})/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const r = tryLoc(m[1].trim(), m[2].trim());
      if (r) return r;
      // ── A FAILED CANDIDATE MUST NOT SWALLOW THE REAL ONE (2026-09-17) ────
      // On a miss, lastIndex sat after the whole match — including the STATE
      // half — so the very next pair was never tried. "…, 8100 Ryan Way,
      // Greenbelt, MD" matched "Ryan Way, Greenbelt" first, failed the state
      // gate (correctly), and resumed at ", MD" with no city in front of it:
      // the town was dropped from an ordinary sentence, taking weather, the
      // venue check and the home comparison with it. Any comma phrase sitting
      // in front of the town did this — a street line is just the common case.
      // Resuming after the CITY half lets "Greenbelt, MD" be tried on the next
      // pass. lastIndex still advances by at least one character each time, so
      // this terminates.
      re.lastIndex = m.index + m[1].length;
    }
    return null;
  })();
  // NO COMMA BEFORE THE STATE (live drive 2026-08-05): "Santa Fe NM, resort
  // spa" reads fine to a host but has no comma between city and abbreviation
  // — every pattern above requires one, so the whole destination stack was
  // silently dropped for phrasing this ordinary. A bare two-letter state
  // abbreviation glued straight onto the city is unambiguous on its own (it
  // still goes through parseVenueLocation's real state gate), so try it only
  // after the comma-bearing forms have had their chance.
  //
  // ── LOWER CASE IS A KNOWN LIMIT, AND THE FIX WAS TRIED AND REJECTED ──────
  // "baltimore md" resolves to NOTHING while "Baltimore MD" resolves fine, and
  // people text in lower case constantly — the 2026-09-23 drive corpus hit it
  // twice. It looks like a one-character fix (/i) and is not.
  //
  // A dozen state codes are also ordinary English words — ok, hi, me, in, or,
  // la, pa, id, oh, de, co. MEASURED with the relaxation in place, gated to
  // inputs carrying no capitals at all:
  //
  //     "cookout june 14, 20 people, food is on me"
  //        -> city "food is on", state ME
  //     "bday party 6/14/27 abt 45 ppl baltimore md"
  //        -> city "ppl baltimore"
  //
  // A wrong city moves weather, market, venue and the whole travel lane. This
  // parser has already shipped one wrong budget today; it is not shipping a
  // wrong town to save a host the shift key. The strict form stands, the limit
  // is recorded, and the host is asked for the town instead of guessed at.
  const locBare = locLoose || (() => {
    const re = /\b([A-Z][a-zA-Z.'’-]+(?:\s+[A-Z][a-zA-Z.'’-]+){0,2})\s+([A-Z]{2})\b(?!\.\w)/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const r = tryLoc(m[1].trim(), m[2]);
      if (r) return r;
    }
    return null;
  })();

  // ── LOWER CASE, SOLVED BY VALIDATING THE CITY INSTEAD OF THE STATE ───────
  //
  // OWNER RULING 2026-09-26: "we will need lowercase states." The rejection
  // recorded above stands as a rejection OF THE FIX THAT WAS TRIED — a bare
  // `/i` — and its two measured failures are the specification for this one:
  //
  //     "cookout june 14, 20 people, food is on me"  ->  city "food is on"
  //     "bday party 6/14/27 abt 45 ppl baltimore md" ->  city "ppl baltimore"
  //
  // BOTH FAILURES ARE THE CITY HALF, NOT THE STATE. `parseVenueLocation` was
  // never the problem: measured today it already accepts "baltimore, md",
  // "greenbelt, md" and even "asheville, north carolina". What a lowercase
  // match loses is the capital letter that used to mark where the city STARTS,
  // so the capture swallows whatever words precede it. Relaxing the state was
  // never going to work; validating the city is.
  //
  // TIER A — THE CITY VOUCHES FOR THE STATE. Shorten the captured phrase from
  // the LEFT, longest first, and keep the first sub-phrase the curated usCities
  // whitelist knows. "ppl baltimore" becomes Baltimore; "food is on" resolves at
  // no length and the match is dropped whole. Because the city is vouched for,
  // the abbreviation is accepted anywhere in the sentence — including the
  // fourteen that are also English words, since "or" after a real city is a
  // state and not a conjunction.
  //
  // TIER B — NO KNOWN CITY, SO THE SENTENCE MUST DELIMIT IT. The whitelist is
  // ~240 metros; "silver spring md" and "greenbelt md" are not in it and are
  // exactly what a host types. Three conditions together, and they are the
  // reason "in the park or the hall" cannot become Park, OR:
  //
  //   1. the abbreviation is NOT an ordinary English word. Checked against
  //      /usr/share/dict/words (web2) on 2026-09-26 — deliberately the most
  //      PERMISSIVE list available, because over-listing is the safe direction
  //      here: it only pushes more abbreviations up to Tier A. 23 of 50 are in
  //      it, which leaves md, tx, ny, nj, fl, va, nc, sc, ct, il and the rest
  //      usable structurally.
  //   2. something DELIMITS the start of the city — a location preposition
  //      ("in silver spring md") or a comma ("silver spring, md"). This is what
  //      kills "abt 45 ppl greenbelt md": nothing says where the town begins,
  //      so the town is not guessed at. It is also why Tier B can safely take a
  //      multi-word city, which a "just use the last word" rule could not —
  //      that rule reads "silver spring md" as Spring, MD.
  //   3. the abbreviation ends its clause. A state is the last thing in a
  //      place phrase; a conjunction is not.
  //
  // Everything still goes through `tryLoc` -> parseVenueLocation, so the real
  // state gate is untouched and no state is invented that a host did not type.
  //
  // ORDER MATTERS: this runs only after every capitalised form has failed, so a
  // host who does use the shift key gets the identical answer she got before.
  const _ST_IS_ALSO_A_WORD = new Set(['al', 'ak', 'ar', 'ca', 'de', 'ga', 'hi', 'id', 'in',
    'la', 'me', 'ma', 'mi', 'mo', 'ne', 'oh', 'ok', 'or', 'pa', 'ut', 'wa', 'wi', 'wy']);
  const _titleCase = (v) => String(v || '').replace(/\b[a-z]/g, (c) => c.toUpperCase());
  // Longest-first from the LEFT: the whitelist decides where the town begins.
  const _cityTail = (phrase) => {
    const w = String(phrase || '').trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < w.length; i += 1) {
      const hit = resolveSpokenCity(w.slice(i).join(' '));
      if (hit) return hit.city;
    }
    return null;
  };
  const locLower = locBare || (() => {
    // TIER A — anywhere in the sentence, because a known city is the anchor.
    const reA = /\b([a-z][a-z.'’-]*(?:\s+[a-z][a-z.'’-]*){0,3})[\s,]+([a-z]{2})\b(?!\.\w)/g;
    let m;
    while ((m = reA.exec(t)) !== null) {
      const city = _cityTail(m[1]);
      if (city) { const r = tryLoc(city, m[2]); if (r) return r; }
      reA.lastIndex = m.index + m[1].length;   // resume after the city half
    }
    // TIER B — delimited, clause-final, and never an English word.
    // Clause-final, OR followed by something that plainly starts a NEW fact —
    // a month or a number. "in greenbelt md aug 3 2027" is how hosts write it,
    // and a conjunction is not followed by a date. Safe here and nowhere else:
    // Tier B has already excluded every abbreviation that is an English word.
    const _ENDS = '(?=\\s*(?:[,.;]|$|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\\d))';
    const reB = new RegExp("(?:\\b(?:in|at|near)\\s+|,\\s*)([a-z][a-z.'’-]*(?:\\s+[a-z][a-z.'’-]*){0,2})[\\s,]+([a-z]{2})\\b" + _ENDS, 'g');
    while ((m = reB.exec(t)) !== null) {
      if (_ST_IS_ALSO_A_WORD.has(m[2])) continue;
      const r = tryLoc(_titleCase(m[1]), m[2]);
      if (r) return r;
    }
    // TIER C — the full state NAME, spelled out and lower case. Measured today:
    // parseVenueLocation already reads "asheville, north carolina" perfectly;
    // only the capitalised capture above could reach it. A spelled-out state
    // name after a comma is not ambiguous the way a two-letter code is — there
    // is no English sentence where "…, north carolina," is a conjunction — so
    // this needs no word-collision guard, just the same strict gate.
    const reC = new RegExp('(?:\\b(?:in|at|near)\\s+|,\\s*)([a-z][a-z.\'’-]*(?:\\s+[a-z][a-z.\'’-]*){0,2})\\s*,\\s*('
      + Object.keys(US_STATE_NAME_TO_ABBR).map((n) => n.toLowerCase()).join('|') + ')\\b', 'g');
    while ((m = reC.exec(t)) !== null) {
      const r = tryLoc(_titleCase(m[1]), m[2]);
      if (r) return r;
    }
    return null;
  })();

  // ── THE STREET LINE (2026-09-17) ─────────────────────────────────────────
  // parseVenueLocation refuses any string containing digits (cityText.js), and
  // that is correct for a "City, ST" resolver — but it means a host who gives a
  // real address gets the one fact she was most specific about thrown away, and
  // then gets asked for it again in a separate field. venueAddress already
  // exists on the event and already feeds the invite and the rain note; nothing
  // ever filled it from what she typed.
  //
  // Matched narrowly: a house number, up to four street words, and a real
  // street-type suffix. The suffix requirement is what keeps this from reading
  // "5 people" or "20 guests" or "Aug 2" as an address — a number alone is
  // never enough. Unit/apartment tails are kept when written plainly.
  const STREET_SUFFIX = '(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|way|ct|court|blvd|boulevard|pl|place|ter|terrace|cir|circle|pkwy|parkway|hwy|highway|trl|trail|loop|run|row|walk|path)';
  // TWO GUARDS, both found on the live seed "this Sunday at 1 pm at 8100 Ryan Way"
  // (2026-09-17). Without them the house number matched the "1" of "1 pm" and the
  // lazy street-word run walked straight through the second "at", yielding the
  // address "1 pm at 8100 Ryan Way" — which then rode into the invite guests read
  // and into a Google Maps link that resolves nowhere.
  //   1. a number followed by am/pm is a TIME, never a house number;
  //   2. a street-word run may not cross a connective (at/on/in/from/to/for/and)
  //      or a bare time token — real street names do not contain them, and
  //      allowing it lets the match start arbitrarily far to the left.
  const NOT_STREET_WORD = '(?!(?:at|on|in|from|to|for|and|am|pm)\\b)';
  const addrM = t.match(new RegExp(
    `\\b(\\d{1,6}[A-Za-z]?(?!\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)\\b)\\s+(?:${NOT_STREET_WORD}[A-Za-z0-9.'’-]+\\s+){0,4}?${STREET_SUFFIX}\\.?)` +
    `((?:\\s*,?\\s*(?:apt|apartment|unit|suite|ste|#)\\s*[\\w-]+)?)\\b`, 'i'));
  const venueAddress = addrM ? (addrM[1] + (addrM[2] || '')).replace(/\s+/g, ' ').trim() : '';

  // ── A BARE ZIP IS UNAMBIGUOUS (2026-09-18) ───────────────────────────────
  // "Cookout in 20770 for 30" resolved to NOTHING. parseVenueLocation has
  // accepted a bare 5-digit ZIP since the day it was written — the ZIP is the
  // one location form that names exactly one place with no state to guess — but
  // every pattern above requires a "City, ST" SHAPE, so the parser never once
  // handed it a ZIP. The gate was fine; nothing was knocking on it.
  //
  // Narrow on purpose: only after a locative preposition, so "budget 15000",
  // "for 20000", "$12,500" and a bare year can never be read as a town. And
  // never a number the street parser already claimed as a HOUSE NUMBER — "at
  // 20770 Main St" is an address, not a ZIP, and venueAddress (computed right
  // above) is what says so.
  // ── THE STATE SPELLED OUT, WITH NO COMMA (drive 2026-09-23) ──────────────
  // The 2026-08-05 drive above fixed "Santa Fe NM". It did not fix "Santa Fe
  // New Mexico", and people write it that way constantly. MEASURED on the
  // Santa Fe 80th: the host typed "in Santa Fe New Mexico" and the parse screen
  // asked "Which town?" — the one thing she had been most explicit about.
  // "Austin Texas" and "Baltimore Maryland" failed identically, so this was
  // never about Santa Fe.
  //
  // NARROWER than locBare on purpose: it requires a locative preposition. A
  // bare two-letter abbreviation is unambiguous glued to a town; a spelled-out
  // name is a common word ("...in Washington", "New York") and needs the
  // preposition to be a location claim rather than a coincidence. Longest names
  // first so "New Mexico" is never read as "Mexico" or "New".
  const locName = locLower || (() => {
    const names = Object.keys(US_STATE_NAME_TO_ABBR)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(
      `\\b(?:in|at|near|around)\\s+([A-Z][a-zA-Z.'\u2019-]+(?:\\s+[A-Z][a-zA-Z.'\u2019-]+){0,2}?)\\s+(${names.join('|')})\\b`,
      'i');
    const m = t.match(re);
    if (!m) return null;
    return tryLoc(m[1].trim(), m[2].trim());
  })();

  const locZip = locName || (() => {
    const m = t.match(/\b(?:in|at|near|around|zip|zipcode)\s+(\d{5})(?:-\d{4})?\b/i);
    if (!m) return null;
    if (venueAddress && venueAddress.includes(m[1])) return null;
    try { return parseVenueLocation(m[1]); } catch { return null; }
  })();
  const loc = locZip;

  // ── Destination modifier — a real signal, surfaced as a SUGGESTION ───────
  // (the host confirms/edits it via a real toggle, same "suggest don't
  // invent" pattern as the guest-count typical and the month+year date
  // options) never silently committed as a fact from wording alone.
  // Vacation AREAS (host ask 2026-07-27): "Deep Creek Lake" is not a City, ST —
  // the strict gate is right to reject it — but it IS a destination with a
  // recognizable name and a real hub town. The curated registry supplies all
  // three facts honestly; the hub town (not the area) anchors weather/maps.
  const area = matchVacationArea(t);

  // ── THE PARK, NOT THE TOWN IT SITS IN (2026-09-25) ───────────────────────
  // Same shape of loss as the vacation area above, one step further out.
  // MEASURED: "50th birthday nov 2027 8 couples 5 nights Disneyland" parsed to
  // isDestination false, venueCity null — eight couples, five nights, answered
  // "Local event" — while the same sentence with "in Anaheim" flagged
  // correctly. Hosts name the park; the park is the most specific fact in the
  // sentence and it was the one fact thrown away.
  //
  // The gazetteer carries city + state off the operator's own published
  // address, and REFUSES an ambiguous bare brand ("Six Flags", "Busch
  // Gardens") rather than guessing one of its locations — see
  // knowledge/landmarkGazetteer.js for the sources and the refusals.
  const landmark = matchLandmark(t);

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
  const travelSaid = TRAVEL_STRONG.test(t) || !!area || !!landmark;

  // A bare place name after travel phrasing — "weekend trip to Asheville".
  // parseVenueLocation deliberately refuses a city with no state (a guessed
  // state is worse than asking), and that strict gate is right for COMMITTING a
  // location. But the destination flag does not need a state: it needs to know
  // the place is not home. Captured for that comparison only; it never becomes
  // venueCity.
  const awayM = t.match(/\b(?:trip|getaway|retreat|flying|driving|heading|going|traveling|traveling)\s+(?:up\s+|down\s+|out\s+|back\s+|over\s+)?to\s+([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,2})\b/);
  const awayPlace = awayM ? awayM[1].trim() : '';

  // WEAK signal — a city was parsed at all. On its own this over-fires: a
  // gathering "in Annapolis, MD" hosted BY someone in Annapolis was being
  // flagged as a destination event purely because a city resolved. The host's
  // own area is the missing half of the comparison; it already exists on the
  // profile ("Your area"), and eventGeoQuery reads it — the parser simply was
  // never handed it. With it, the weak signal only counts when the place
  // differs from home, which removes false positives as well as adding misses.
  // A BARE "in <City>" WITH NO STATE (live probe, 2026-08-03).
  // The comment above states the rule correctly — "the destination flag does not
  // need a state: it needs to know the place is not home" — but the only
  // stateless path was `awayPlace`, which requires a travel verb followed by
  // "to". So "Family reunion in Asheville Aug 3 to Aug 7 2027, 24 people"
  // produced placeName '' → placeAway false → isDestination FALSE, on a
  // five-day event with a named city. That silently removed the entire
  // destination stack: the lodging axis, kitchenConsequence, the reveal's
  // lodging stage and foodSpanNote are all gated on isDestination === true.
  //
  // Captured for the home comparison ONLY, exactly like awayPlace — it never
  // becomes venueCity, because committing a city without a state is still the
  // thing parseVenueLocation rightly refuses to do.
  //
  // Guarded against the obvious false friends: "in June", "in Saturday" and
  // bare years are not places.
  const NOT_A_PLACE = /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|the|our|my|zoom)$/i;
  //
  // The multi-word capture must be TRIMMED, not just head-checked. "Reunion in
  // Annapolis Aug 3" matches "Annapolis Aug" — two capitalised words — and
  // "annapolisaug" never equals the host's "annapolis", so a hometown event
  // read as a destination. Same over-capture that made the venue parser read
  // "New Mexico June" as a state. Trailing non-place words are dropped.
  const inM = t.match(/\bin\s+([A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,2})\b/);
  const trimPlace = (raw) => {
    const words = String(raw || '').trim().split(/\s+/).filter(Boolean);
    while (words.length && NOT_A_PLACE.test(words[words.length - 1])) words.pop();
    if (!words.length || NOT_A_PLACE.test(words[0])) return '';
    return words.join(' ');
  };
  const spokenPlace = inM ? trimPlace(inM[1]) : '';

  // ── A HOST TYPING FAST DOES NOT CAPITALISE (2026-09-26) ───────────────────
  //
  // The capture above requires an initial capital, so measured on the pinned
  // corpus: "birthday in Chicago june 14" resolved the town and "birthday in
  // miami june 14" returned venueCity null. Same sentence, same city, one
  // shift key. The town is what gates weather, the shopping list, lodging
  // search and maps, so a host who lowercases loses all four.
  //
  // WHY A SECOND PASS RATHER THAN DROPPING THE [A-Z]. That capital is doing
  // two jobs, and only one of them is finding a city. `placeName` below feeds
  // the DESTINATION gate off the raw captured words whether or not they
  // resolve, so the capital is also a cheap proper-noun test standing between
  // "in the backyard" and a fabricated destination event. Loosening it in
  // place would have admitted every lowercase noun after "in" to that gate.
  //
  // So the lowercase pass is whitelist-ONLY: it exists purely to be handed to
  // resolveSpokenCity, which admits a name solely by membership in the curated
  // usCities list and invents no state. A word that is not a known city
  // resolves to nothing and reaches nothing — the loosening cannot produce a
  // place the strict path would have refused, only recover one it dropped for
  // want of a capital letter.
  //
  // TWO-LETTER STATE ABBREVIATIONS ARE DELIBERATELY NOT PART OF THIS, and that
  // is not an oversight. Thirteen of the fifty are ordinary lowercase English
  // words — al co de hi id in la me ma ne ok or pa — so a case-insensitive
  // abbreviation match turns "in the park or the hall" into Park, OR. The
  // capital letter is the only thing separating a state from a conjunction
  // there, and it stays. "in Austin TX" resolves the state; "in austin tx"
  // recovers the CITY through the whitelist below and leaves the state for the
  // host, which is this file's standing rule anyway: never invent a state.
  const inLowerM = t.match(/\bin\s+([a-z][\w.'’-]+(?:\s+[a-z][\w.'’-]+){0,2})\b/);

  // ── AND THE SAME LOSS ON "trip to" / "flying to" ─────────────────────────
  //
  // Measured in the same sweep: "trip to Nashville" carried the town and "trip
  // to nashville" did not, while "flying to denver" lost the town AND flipped
  // isDestination to false — deleting the entire travel stack (lodging,
  // transport, the reveal's lodging stage) that this file's own header calls
  // the costlier failure, over a shift key.
  const awayLowerM = t.match(new RegExp(
    '\\b(?:trip|getaway|retreat|flying|driving|heading|going|traveling)\\s+'
    + '(?:up\\s+|down\\s+|out\\s+|back\\s+|over\\s+)?to\\s+([a-z][\\w.\'’-]+(?:\\s+[a-z][\\w.\'’-]+){0,2})\\b'));

  // A trailing word the whitelist cannot use must not sink the town with it:
  // "in austin tx" and "to nashville aug 3" both carry the city in the FIRST
  // word(s). Try the longest phrase first so "las vegas" and "winston salem"
  // win over their own first words, then shorten. Whitelist-gated at every
  // step, so a shorter prefix can no more invent a place than the full phrase.
  const resolveLoose = (raw) => {
    const words = trimPlace(raw).split(/\s+/).filter(Boolean);
    for (let n = words.length; n > 0; n -= 1) {
      const hit = resolveSpokenCity(words.slice(0, n).join(' '));
      if (hit) return hit;
    }
    return null;
  };

  // ── THE TOWN SHE NAMED, CARRIED (2026-09-18) ─────────────────────────────
  // Both captures above end with the same sentence — "it never becomes
  // venueCity" — and that was measured as a real loss, not a safe default:
  // "Reunion in Asheville Aug 3 to Aug 7 2027" and "Bachelorette weekend trip
  // to Nashville" flagged isDestination correctly and then reported venueCity
  // '', so weather, the shopping list, lodging search and maps all had nothing
  // to anchor on for an event whose town was typed in the first sentence.
  //
  // WHAT CHANGED IS ONLY THE CITY HALF. resolveSpokenCity (cityText.js) admits
  // a name ONLY if it is in the curated usCities whitelist, and it returns
  // state: null ALWAYS — so the rule those comments were really protecting
  // ("committing a city without a state is the thing parseVenueLocation rightly
  // refuses") still holds exactly: no state is invented here, and the strict
  // gate is untouched and still refuses bare cities everywhere it runs.
  //
  // The town is a PRE-FILL, not a commitment: HostShellV2 (~1382) shows it in
  // the editable town field, and its creation seam (~6558) still runs the field
  // through parseVenueLocation, so a state-less town is offered to the host to
  // complete rather than written to the event behind her. Her word, visible and
  // editable, beats an empty field she has to retype.
  //
  // "in <Town>" and "trip to <Town>" only — never a bare "at <X>", which in
  // host speech names a VENUE ("at Hilton", "at the clubhouse"), not a town.
  // THE CAPITALISED PATHS GET THE SAME SHORTENING, because they had the same
  // bug and it was louder there: "reunion flying to Denver Aug 3 2027" carried
  // NO city, while the lowercase spelling of that sentence carried Denver — the
  // capture took "Denver Aug" and the whitelist, correctly, does not know it.
  // One resolver for all four captures, so a trailing word cannot sink a town
  // on one path and not another.
  const spokenCity = loc ? null
    : (resolveLoose(spokenPlace) || resolveLoose(awayPlace)
      || (inLowerM ? resolveLoose(inLowerM[1]) : null)
      || (awayLowerM ? resolveLoose(awayLowerM[1]) : null));

  const normCity = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const homeCity = normCity(opts.homeCity);
  // A lowercase town only reaches placeName once the WHITELIST has vouched for
  // it — never the raw captured words, which is what keeps "in the backyard"
  // out of the destination gate.
  const placeName = (loc && loc.city) || awayPlace || spokenPlace
    || (spokenCity && spokenCity.city) || '';
  // WITH NO KNOWN HOME, A BARE RESOLVED CITY STILL FLAGS — this is deliberate,
  // tested "prior behaviour" (destinationDetection.test.js, destinationBarePlace
  // .test.js): a miss here silently deletes the whole travel stack (lodging,
  // transport, the reveal's lodging stage), which this file's own header calls
  // the costlier failure. That tradeoff is intentional and stays.
  //
  // Live-drive find (2026-09-13): it over-fires for a NAMED PRIVATE HOME —
  // "Backyard BBQ at my brother's house in Greenbelt, MD" (no signed-in
  // profile) flagged a destination event purely because a city+state resolved,
  // which blends the budget band toward travel_led (home_hosted $30-120/head
  // times a multiple) for a plan that never left town. The text ALREADY says
  // whose home it is (`home`/`venuePhrase` below) — that is a real signal the
  // bare-city cases in the tests above never have ("in Savannah, Georgia" names
  // no one's house). So the carve-out is narrow: a named private home only
  // counts as away when we can actually compare it to a KNOWN home city; with
  // no profile, it stays local, exactly like the other `home` cases just above.
  // A bare city with no named home venue keeps the old fire-by-default rule.
  const namedPrivateHome = home || !!venuePhrase;
  const placeAway = !!placeName && (
    namedPrivateHome ? (!!homeCity && normCity(placeName) !== homeCity)
                      : (!homeCity || normCity(placeName) !== homeCity)
  );
  // `spokenCity` is in this list so that CASE CANNOT CHANGE THE ANSWER. Without
  // it, "in Chicago" flagged a destination and "in miami" — city resolved, same
  // sentence shape — did not, which is the same defect one layer down. It is
  // the whitelist-vouched city, never the raw captured words, so nothing
  // reaches this gate that resolveSpokenCity has not already admitted.
  const isDestination = travelSaid
    || ((!!loc || !!awayPlace || !!spokenPlace || !!spokenCity) && placeAway);

  // Why it was decided, for the "· heard" chip and any later explanation. Never
  // a silent commit: the host still confirms via the toggle.
  // A NAMED PARK IS ITS OWN REASON. It is not the host's own travel wording
  // ('travel-language') and it is emphatically not the bare-city guess
  // ('place-named', which HostShellV2 ~1613 deliberately declines to commit) —
  // it is a published fact about a place nobody lives. Reported as itself so
  // the chip can say what was actually heard.
  const destinationBasis = !isDestination ? null
    : (landmark && !TRAVEL_STRONG.test(t) && !area) ? 'landmark-named'
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
  // SAID beats DERIVED when both are true (2026-08-06). This read `endDate ?
  // 'multi-day-span' : 'said-so'`, so a host who wrote the word "overnight" AND
  // gave a span was recorded as having it inferred from her dates — the app
  // forgetting something she actually told it. The basis names where the fact
  // CAME from, and the strongest source wins.
  const overnightBasis = !overnight ? null : (saidOvernight ? 'said-so' : 'multi-day-span');

  // ── HOW LONG, NOT JUST WHETHER (2026-09-25) ──────────────────────
  //
  // Measured on the host's failing string and six variants: a span appeared
  // ONLY from explicit dates. Every natural duration phrase was discarded —
  //
  //   "5 nights in Anaheim"   → overnight: true, and nothing else
  //   "5 days in Anaheim"     → NOTHING, not even overnight
  //   "5-day trip to Anaheim" → NOTHING
  //   "weekend in Anaheim"    → NOTHING
  //   "Nov 12-16 2027"        → date + endDate ✓
  //
  // The whole multi-day system hangs off date+endDate (lib/dates spanNights),
  // and foodSpan uses it to say "sized for the main gathering, not all 5 days".
  // A host who says "5 nights" is telling us precisely that, and we threw it
  // away.
  //
  // NIGHTS IS THE STORED UNIT because that is what spanNights computes and what
  // lodging counts. "5 days" is four nights; "a long weekend" is deliberately
  // NOT guessed, because it means three nights to some hosts and two to others
  // and inventing one would put a wrong date on a plan.
  const nights = (() => {
    const explicit = t.match(/\b(\d{1,2})\s*(?:-|\s)?\s*nights?\b/i);
    if (explicit) return parseInt(explicit[1], 10);
    const dayForm = t.match(/\b(\d{1,2})\s*(?:-|\s)?\s*days?\b/i);
    if (dayForm) {
      const d = parseInt(dayForm[1], 10);
      return d > 1 ? d - 1 : 0;     // 5 days is 4 nights
    }
    // A plain "weekend" is two nights by near-universal use. "Long weekend" is
    // ambiguous and is left alone rather than guessed.
    if (/\blong\s+weekend\b/i.test(t)) return null;
    if (/\bweekend\b/i.test(t)) return 2;
    return null;
  })();

  // ── WHAT KIND OF ROOF, NOT JUST THAT THERE IS ONE (2026-09-25) ────────────
  //
  // Host: "If parser mentions an accommodation it should know. Airbnb Arbor
  // etc." The words were already half-read — `saidOvernight` above matches
  // airbnb/vrbo/hotel/cabin and sets `overnight: true`. It throws away WHICH,
  // and which is the part that decides something.
  //
  // `lodgingIntel.kitchenSignal` is three-valued (kitchen true / false / NOT
  // TOLD) and `foodSpanNote` branches hard on it: a rental with a kitchen keeps
  // the shopping list and says "the other meals are still yours to plan"; a
  // hotel withholds the list entirely, because a grocery list is not the plan
  // for a hotel stay. Today a host who types "airbnb" lands in NOT TOLD and
  // gets neither. That module's own comment names this hole: "a host who books
  // a hotel by phone and types the name reaches `kitchen === null`
  // permanently."
  //
  // NO SECOND SOURCE OF TRUTH. This emits a KIND, not a kitchen boolean. The
  // creation flow writes it to `foodChoices.dest_lodging`, which is the field
  // kitchenSignal already reads first and trusts most ("told beats inferred").
  // Deciding the kitchen here would put a second answer next to the one the
  // host can give on the lodging surface, and those two would drift.
  //
  // AMBIGUOUS WORDS ARE REFUSED, not guessed. "Suite" and "lodge" and "resort"
  // can each be either — plenty of suites have kitchenettes and plenty of
  // resorts are condos — and a wrong guess here silently withholds a shopping
  // list from a host who needs one. Only words that settle it appear below.
  const lodgingKind = (() => {
    // Rental platforms and dwelling words: a kitchen comes with the building.
    if (/\bairbnb\b|\bvrbo\b|\bhomeaway\b|\bhouse\s+rental\b|\brental\s+house\b|\bbeach\s+house\b|\blake\s+house\b|\bcabins?\b|\bvillas?\b|\bcondos?\b|\bcottages?\b/i.test(t)) return 'rental';
    // A room block IS a hotel — that is what a block is (lodgingIntel says so).
    if (/\bhotels?\b|\bmotels?\b|\broom\s+block\b/i.test(t)) return 'hotel';
    return null;
  })();

  // NO endDate IS DERIVED HERE, deliberately. The date block above ALREADY
  // turns a duration into an endDate whenever a start date resolved (see
  // "Duration form" there) — I wrote that derivation a second time before
  // reading far enough, which would have been two places computing one fact,
  // the exact defect this file's own comments warn about elsewhere.
  //
  // What was genuinely missing is the case with NO start day: "nov 2027 … 5
  // nights" has a month and no date, so that block cannot fire and the
  // duration was dropped on the floor. `nights` now carries it out of the
  // parser so the creation flow can apply it the moment a real date is picked.
  // Inventing a day from a month to make a span would be worse than waiting.

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

  // ── THE CLOCK SHE ACTUALLY SAID (2026-09-17) ─────────────────────────────
  // The bucket above is deliberately coarse, and the comment explaining why is
  // right: the app must never INVENT an hour. That was the 15:00 bug — a time
  // shown as fact and sent to a caterer that nobody chose (see lib/startTime.js).
  //
  // But "never invent" is not "never listen". startTime.js's own tier 2 is THE
  // HOST'S OWN WORD, and `startTimeIsConfirmed` exists precisely to separate a
  // time the host owns from a derived proposal. A host who types "Sunday at
  // 1pm" HAS decided; dropping it on the floor and then proposing an hour back
  // to her is the app ignoring the strongest signal it will ever get about when
  // the event starts. "BBQ at my brother's house today at 3pm" is already in
  // this file's own date comment as a real host sentence — the date was rescued
  // then, the "3pm" was not.
  //
  // So: extracted ONLY when said, never derived from the bucket, and always
  // with a basis the UI can be honest about — the same three-state treatment
  // overnightBasis and destinationBasis already get in this file.
  //   'said-exact'       — "1pm", "6:30 PM": the meridiem is on the page.
  //   'said-with-bucket' — "afternoon at 1": the host's own bucket disambiguates.
  //   'said-hour-only'   — "at 1" alone: the NUMBER is hers, the half of the day
  //                        is a reading of it, so it is marked as the weakest.
  const startTimeParsed = (() => {
    // "at 1", "at 1:30", "at 1pm", "1:30pm", "kickoff at 1", "doors at 6:30".
    // Anchored on a preposition/cue or an explicit meridiem so it cannot eat a
    // guest count ("for 20"), a budget ("$3,000") or a date ("Aug 2").
    const m = t.match(/\b(?:at|from|starts?(?:\s+at)?|kick(?:s)?\s*off(?:\s+at)?|doors(?:\s+(?:at|open(?:\s+at)?))?)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?\b/i)
           || t.match(/\b(\d{1,2})(?::(\d{2}))\s*([ap])\.?m?\.?\b/i)
           || t.match(/\b(\d{1,2})\s*([ap])\.m?\.?\b/i)
           || t.match(/\b(\d{1,2})\s*([ap])m\b/i)
           || t.match(/\b(?:at|from|starts?(?:\s+at)?|kick(?:s)?\s*off(?:\s+at)?|doors(?:\s+(?:at|open(?:\s+at)?))?)\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:guests?|people|ppl|folks))/i);
    // NOON AND MIDNIGHT ARE EXACT TIMES. Found by the same sweep: "at noon"
    // produced startTime null and timeOfDay "afternoon" — the host named an
    // exact hour and the app downgraded it to a vague part of the day, then
    // asked them for the time it had just been told. "Half past six" is here for
    // the same reason: it is a stated clock time, not a hedge.
    const wordTime = t.match(/\b(?:at\s+)?(noon|midday|midnight)\b/i);
    if (wordTime) {
      const w = wordTime[1].toLowerCase();
      return { startTime: w === 'midnight' ? '12:00 AM' : '12:00 PM', startTimeBasis: 'said-exact' };
    }
    // The hour after "half past" is a WORD at least as often as a digit — the
    // first version of this only read digits and missed the phrasing it was
    // written for.
    const _HOURWORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
      seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
    // THE MERIDIEM IS OPTIONAL HERE, and the first version wrongly required it.
    // "dinner at 6:30" already resolves to 6:30 PM through the grading below —
    // the word "dinner" supplies the bucket — so refusing "dinner at half past
    // six" in the same sentence was inconsistent rather than careful. It feeds
    // the shared grading instead of returning its own verdict, so it is read
    // exactly as the digit form beside it would be, basis and all.
    const halfPast = t.match(
      /\b(?:at\s+)?half\s+past\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*([ap])?\.?m?\.?\b/i);
    let forced = null;
    if (halfPast) {
      const raw = halfPast[1].toLowerCase();
      const hh = /^\d+$/.test(raw) ? parseInt(raw, 10) : _HOURWORD[raw];
      if (hh) forced = { h: hh, min: 30, mer: (halfPast[2] || '').toLowerCase() };
    }
    if (!m && !forced) return null;
    // The meridiem is whichever capture group came back as a/p — the shapes
    // above put it in different slots, so find it rather than index blindly.
    const groups = m ? m.slice(1).filter((g) => g != null) : [];
    const mer = forced ? forced.mer : (groups.find((g) => /^[ap]$/i.test(g)) || '').toLowerCase();
    const nums = groups.filter((g) => /^\d+$/.test(g));
    let h = forced ? forced.h : parseInt(nums[0], 10);
    const min = forced ? forced.min : (nums.length > 1 ? parseInt(nums[1], 10) : 0);
    if (!(h >= 1 && h <= 24) || !(min >= 0 && min <= 59)) return null;
    let basis;
    if (mer) {
      if (mer === 'p' && h < 12) h += 12;
      if (mer === 'a' && h === 12) h = 0;
      basis = 'said-exact';
    } else if (h > 12) {
      basis = 'said-exact';                         // 24-hour clock needs no reading
    } else if (timeOfDay === 'afternoon' || timeOfDay === 'evening' || timeOfDay === 'night' || timeOfDay === 'late') {
      if (h < 12) h += 12;
      basis = 'said-with-bucket';
    } else if (timeOfDay === 'morning') {
      basis = 'said-with-bucket';
    } else {
      // No meridiem, no bucket. A gathering at "1" is 1 PM, not 1 AM — but that
      // is a READING, so it says so rather than passing as something she typed.
      if (h >= 1 && h <= 6) h += 12;
      basis = 'said-hour-only';
    }
    if (h === 24) h = 0;
    const h12 = h % 12 || 12;
    return { startTime: `${h12}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`, startTimeBasis: basis };
  })();

  // ── Secondary type — a DUAL / compound event ("retirement AND 50th birthday") ─
  // The primary `type` is the resolved one; if the text clearly names a SECOND
  // occasion, carry it so the caller can build a compound event instead of silently
  // dropping half of it. A "Nth birthday/anniversary" milestone names that type even
  // on its own. Only ever a type the host actually said — never invented.
  let secondaryType = null;
  if (type) {
    // A SECOND OCCASION IS JOINED, NOT ADJACENT (2026-08-17). This was bare
    // substring inclusion, so "retirement dinner for 30" matched Dinner Party as
    // a second occasion and the reveal named the event "My Retirement & Dinner"
    // — the FIRST thing a new host reads about their own event, and wrong.
    // "dinner" there is a descriptor of the retirement, not a second party.
    //
    // This block's own comment already states the rule: fire only when the text
    // "clearly names a SECOND occasion". A conjunction is what makes it clear —
    // "retirement AND 50th birthday" is two, "retirement dinner" is one. Adjacency
    // never was evidence, so the match now requires a joiner between the two.
    const lower = t.toLowerCase();
    const JOINED = (key) => new RegExp(
      '(?:\\band\\b|&|\\+|,|\\bplus\\b|\\bslash\\b|/)\\s*(?:a\\s+|an\\s+|the\\s+)?' + key
      + '|' + key + '\\s*(?:\\band\\b|&|\\+|,|\\bplus\\b|/)', 'i').test(lower);
    const mentioned = HOST_TYPES.filter((ht) => {
      const key = ht.toLowerCase().replace(' party', '');
      return key.length > 3 && lower.includes(key) && JOINED(key);
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
    type, typeBasis, secondaryType, theme, guests, budget, date, endDate, monthYear, milestone, nights, lodgingKind, isDestination, destinationBasis, travelMode, overnight, overnightBasis, timeOfDay,
    startTime: startTimeParsed ? startTimeParsed.startTime : null,
    startTimeBasis: startTimeParsed ? startTimeParsed.startTimeBasis : null,
    venueAddress: venueAddress || null,
    honoree: hm ? hm[1] : null,
    // A NAMED ROOM IS A BOOKED VENUE. The church-hall/VFW/rec-center forms added
    // 2026-09-23 produced a venue NAME with an empty venueKind, so the shell
    // kept treating a booked hall as "no venue yet" — the exact lane this field
    // exists to switch. A phrase carrying my/our is still a home.
    venueKind: home || /\bmy|our\b/i.test(venuePhrase) ? 'home'
      : (lodging || venueAt || venuePhrase ? 'venue' : ''),
    venue: venuePhrase || venueAt || (home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : (area ? area.label : '')),
    // Order is strongest-first: a said "City, ST" or ZIP, then a curated
    // vacation area's real hub town, then a named landmark's published city
    // (it carries a real state, so it outranks the next one), then the bare
    // town she named — which carries NO state, because none was said
    // (resolveSpokenCity, cityText.js).
    venueCity: loc ? (loc.zip || loc.city)
      : (area ? area.hubTown : (landmark ? landmark.city : (spokenCity ? spokenCity.city : null))),
    venueState: loc ? (loc.state || null)
      : (area ? area.state : (landmark ? landmark.state : null)),
    vacationArea: area ? area.id : null,
    // "No kids." / "adults only" → the invite policy InviteV2 + doItForMe already
    // consume; never invented — only when the host said it.
    // Widened 2026-09-23 by the field sweep: "21 and up" and "grown folks only"
    // are how an adults-only event is actually announced, and "kid friendly"
    // without the hyphen missed a rule written only for the hyphenated form.
    kidsPolicy: /\bno\s+(?:kids|children|littles)\b|\badults?[\s-]only\b|\b21\s*(?:\+|and\s+(?:up|over))\b|\bgrown\s*folks?\s+only\b/i.test(t) ? 'adults_only'
      : /\bkids?\s+(?:are\s+)?welcome\b|\bfamily[\s-]?friendly\b|\bkid[\s-]?friendly\b|\bbring\s+(?:the\s+)?(?:kids|children|littles|whole\s+family)\b/i.test(t) ? 'kids_welcome' : null,
  };
}

// ─── WHAT THE APP DID NOT USE ───────────────────────────────────────────────
//
// Found driving an 80th birthday from the cold open, 2026-09-23. The host typed:
//
//   "Mom's 80th birthday party on June 14 2027, about 45 people, at the church
//    hall in Baltimore, sit-down lunch, she uses a walker"
//
// and THREE of those facts vanished without a word: the walker, the sit-down
// lunch, and the church hall. Not misparsed — dropped in silence. For an 80th
// birthday, mobility is the constraint that decides venue access, seating and
// where the cake table goes, and the plan never mentioned it.
//
// The fix is NOT a walker parser. Adding one extractor leaves the next dropped
// fact just as silent. The fix is for the app to say what it did not use, so
// the host can carry it themselves instead of assuming the app has it.
//
// ── HOW "DID NOT USE" IS DECIDED: EXACTLY, NOT BY GUESSING ──────────────────
//
// Re-parse the sentence with one clause removed. If all 25 fields come back
// IDENTICAL, that clause provably contributed nothing — no heuristic about
// which words "look like" a venue, no keyword list to fall behind the parser.
// It is the parser's own behaviour used as the measurement.
//
// This matters because an over-eager version of this feature would be worse
// than the bug: telling a host "I didn't catch 'about 45 people'" when it did
// would destroy the trust the disclosure exists to protect.
const _CLAUSE_SPLIT = /\s*(?:,|\band\b|;)\s*/i;

// Words that carry no meaning alone, so a phrase made only of them is noise
// rather than a fact we dropped.
const _FILLER = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with',
  'is', 'are', 'be', 'it', 'we', 'i', 'my', 'our', 'us', 'plus', 'also',
]);

/**
 * The clauses the parser did NOT use — what to tell the host it ignored.
 *
 * ── IT WENT SILENT EXACTLY WHEN A HOST TYPED NATURALLY (2026-09-25) ─────────
 *
 * Host-reported string: "50th birthday nov 2027 8 couples 5 nights Disneyland
 * 2 excursions airbnb accomodations". This returned [] — a clean bill of
 * health — while the parser had dropped five facts on the floor.
 *
 * The cause was one line. Clauses were split on commas, "and" or semicolons;
 * that sentence has none of them, so it was ONE clause and the function bailed
 * at "nothing to compare against". Add commas to the identical words and it
 * correctly reported ["8 couples","5 nights","Disneyland","2 excursions"]. The
 * self-knowledge was intact and gated on punctuation the host never typed.
 *
 * WHY THIS MATTERS MORE THAN THE PARSE ITSELF. A reference scan of Google
 * Maps, Airbnb, TripIt, Joy, Evite and Punchbowl (9/25/2026) found that NO
 * leader extracts a place from a sentence either — Google Maps typed with this
 * exact sentence returns zero predictions. What every leader does instead is
 * refuse OUT LOUD and name a recovery: "Add a missing place to Google Maps",
 * Joy's "add it to Google Maps first, then come back", TripIt emailing you
 * that it could not read your forward. Refusing is not the failure. Refusing
 * silently is, and that is what we shipped.
 *
 * THE FALLBACK IS PER-WORD, not a smarter sentence splitter. Removing one word
 * and re-parsing asks the only question that matters — did this word change
 * what we understood — and needs no grammar. Adjacent unused words are merged
 * back into phrases so the host reads "2 excursions", not "2" and "excursions".
 * Short strings only, so N re-parses is cheap.
 */
export function unusedClauses(text, opts = {}) {
  const t = String(text || '').trim();
  if (t.length < 12) return [];
  let full;
  try { full = parseSmartEventText(t, opts); } catch { return []; }
  const same = (a, b) => {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
    return true;
  };
  const unchanged = (without) => {
    if (!without || without === t) return false;
    let p;
    try { p = parseSmartEventText(without, opts); } catch { return false; }
    return same(p, full);
  };

  // ── A CLAUSE THE PLAN STILL CARRIES IS REDUNDANCY, NOT A MISS ─────────────
  //
  // MEASURED 2026-09-26, on the most ordinary US date format there is:
  //
  //   "birthday party on June 14, 2027, 30 people, in Austin TX"  ->  ["2027"]
  //
  // The host was told the YEAR did not make it into the plan while the plan's
  // date was 2027-06-14. Removing "2027" genuinely changes nothing — June 14
  // already resolves to the next June 14, which IS 2027 — so the
  // unchanged-output test is satisfied and the host-facing sentence is still
  // false. Four date shapes were probed ("November, 2027", "nov, 2027",
  // "June 14, 2027", "May 2, 2027") and all four reported it.
  //
  // This is the ruling the per-word branch below already makes for
  // "accomodations" sitting beside "airbnb" — a fact we honoured is not a fact
  // we dropped — applied to whole clauses. Contributing nothing to the OUTPUT
  // and being absent FROM the output are different questions, and only the
  // second one licenses the sentence "the plan won't know about it".
  //
  // It can only ever remove reports, which is the direction this function is
  // deliberately biased in: a miss we stay quiet about costs the host one fact,
  // a false alarm costs them the belief that the list means anything.
  const carried = JSON.stringify(full || {}).toLowerCase();
  const alreadyInThePlan = (clause) => {
    const toks = String(clause).toLowerCase().match(/[a-z0-9]+/g) || [];
    if (!toks.length) return false;
    // Short connective words carry no fact, so they cannot keep a clause alive
    // ("on", "in", "at"); every token that DOES carry one must be in the parse.
    return toks.every((tk) => ((tk.length > 2 || /^\d+$/.test(tk)) ? carried.includes(tk) : true));
  };

  // Punctuated input keeps the original clause reading — a host who wrote
  // commas told us where the boundaries are, and that beats guessing them.
  const clauses = t.split(_CLAUSE_SPLIT).map((c) => c.trim()).filter((c) => c.length > 2);
  if (clauses.length >= 2) {
    const out = [];
    for (const c of clauses) {
      if (unchanged(t.split(c).join(' ').replace(/\s{2,}/g, ' ').trim())
        && !alreadyInThePlan(c)) out.push(c);
    }
    return out;
  }

  // No punctuation to go on: ask the question per word instead.
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 3) return [];
  const used = words.map((_, i) => !unchanged(
    words.slice(0, i).concat(words.slice(i + 1)).join(' ').trim(),
  ));

  // ── A LONE WORD BESIDE A USED ONE IS REDUNDANCY, NOT A MISS ───────────────
  //
  // Measured while building this: "cookout in the backyard for 20 people"
  // reported ["people"]. Removing "people" changes nothing BECAUSE "for 20"
  // already matched the count — the word is half of a fact we used, and the
  // per-word test cannot see that from one removal. Telling a host we ignored
  // "people" there is crying wolf in the exact mechanism meant to earn trust.
  //
  // Same shape on the reported sentence: "accomodations" sits beside "airbnb",
  // which we DID read as the lodging kind. The word is redundant, not dropped.
  //
  // So a single-word run is only reported when it stands alone — neither
  // neighbour was used. A run of two or more words is reported regardless,
  // because "2 excursions" being individually AND jointly removable is exactly
  // what a genuinely unread fact looks like.
  //
  // This under-reports on purpose. A miss we stay quiet about costs the host
  // one fact; a false alarm costs them the belief that the list means anything.
  const out = [];
  let run = [];
  let runStart = -1;
  const flush = (endExclusive) => {
    if (!run.length) { runStart = -1; return; }
    const meaty = run.some((w) => {
      const bare = w.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return bare.length > 2 && !_FILLER.has(bare);
    });
    const leftUsed = runStart > 0 && used[runStart - 1];
    const rightUsed = endExclusive < words.length && used[endExclusive];
    const standsAlone = !leftUsed && !rightUsed;
    const phrase = run.join(' ');
    if (meaty && (run.length > 1 || standsAlone) && !alreadyInThePlan(phrase)) out.push(phrase);
    run = []; runStart = -1;
  };
  for (let i = 0; i < words.length; i += 1) {
    if (used[i]) { flush(i); }
    else { if (!run.length) runStart = i; run.push(words[i]); }
  }
  flush(words.length);
  return out;
}
