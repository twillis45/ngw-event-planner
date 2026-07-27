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
  const gm = t.match(/(?:for|about|around|~)\s*(\d{1,3})\b/i) || t.match(/\b(\d{1,3})\s*(?:people|guests|ppl|folks|friends|pickers)\b/i);
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
    const rng = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|—|to|through|thru)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (rng) {
      const m1 = MONTHS.indexOf(rng[1].slice(0, 3).toLowerCase());
      const m2 = rng[3] ? MONTHS.indexOf(rng[3].slice(0, 3).toLowerCase()) : m1;
      const start = new Date(now.getFullYear(), m1, parseInt(rng[2], 10), 12);
      if (start < now) start.setFullYear(start.getFullYear() + 1);
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
  }
  const dm = date ? null : t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (dm) {
    const cand = new Date(now.getFullYear(), MONTHS.indexOf(dm[1].slice(0, 3).toLowerCase()), parseInt(dm[2], 10), 12);
    if (cand < now) cand.setFullYear(cand.getFullYear() + 1);
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
  const hm = t.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)[’']s\b/);
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
  const lm = t.match(/\b(?:in|at)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
  const loc = lm ? (() => { try { return parseVenueLocation(lm[1] + ', ' + lm[2]); } catch { return null; } })() : null;

  // ── Destination modifier — a real signal, surfaced as a SUGGESTION ───────
  // (the host confirms/edits it via a real toggle, same "suggest don't
  // invent" pattern as the guest-count typical and the month+year date
  // options) never silently committed as a fact from wording alone.
  // Vacation AREAS (host ask 2026-07-27): "Deep Creek Lake" is not a City, ST —
  // the strict gate is right to reject it — but it IS a destination with a
  // recognizable name and a real hub town. The curated registry supplies all
  // three facts honestly; the hub town (not the area) anchors weather/maps.
  const area = matchVacationArea(t);
  const isDestination = /\bdestination\b|\bfly (?:in|out)\b|\bout[- ]of[- ]town\b/i.test(t) || !!loc || !!area;

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

  return {
    type, secondaryType, theme, guests, budget, date, endDate, monthYear, milestone, isDestination, timeOfDay,
    honoree: hm ? hm[1] : null,
    venueKind: home || /\bmy|our\b/i.test(venuePhrase) ? 'home' : '',
    venue: venuePhrase || (home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : (area ? area.label : '')),
    venueCity: loc ? (loc.zip || loc.city) : (area ? area.hubTown : null),
    venueState: loc ? (loc.state || null) : (area ? area.state : null),
    vacationArea: area ? area.id : null,
  };
}
