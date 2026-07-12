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
  const bm = t.match(/\$\s*([\d,]+)\s*(k)?\b/i)
    || t.match(/\b([\d,]+)\s*(k)?\s*budget\b/i)
    || t.match(/budget\s*(?:of|:)?\s*\$?\s*([\d,]+)\s*(k)?\b/i);
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
  const isDestination = /\bdestination\b|\bfly (?:in|out)\b|\bout[- ]of[- ]town\b/i.test(t) || !!loc;

  return {
    type, guests, budget, date, monthYear, milestone, isDestination,
    honoree: hm ? hm[1] : null,
    venueKind: home || /\bmy|our\b/i.test(venuePhrase) ? 'home' : '',
    venue: venuePhrase || (home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : ''),
    venueCity: loc ? (loc.zip || loc.city) : null,
    venueState: loc ? (loc.state || null) : null,
  };
}
