// ─── Guest itinerary — ONE schedule, projected for guests ────────────────────
// (Destination + Multi-Day program, Slice A, 2026-07-27.)
//
// The host's run-of-show is operational truth (grill on at 11:30, owners,
// setup). Guests need the PROGRAM: what's happening, which day, roughly when.
// This module builds that projection from, in order of authority:
//   1. event.itinerary — the host's own edited rows (host-owned once touched)
//   2. the playbook's authored multi-day agenda (schedules.agenda "Day N ..."
//      rows — written for Team Retreat in 2026 and never consumed until now)
//   3. a PROPOSED arc for the flagship reunion shape (McCoy, *Generations*/ASA:
//      arrival evening → the cookout as the climax → worship + farewell close),
//      offered only when the event actually spans multiple days — propose,
//      never silently commit (the host edits or clears it like any proposal).
//
// HONESTY: day-part SLOTS only ("Saturday afternoon"), never an invented clock
// time — the same never-paint-a-fake-clock ruling as The Day board. A time
// renders only when the HOST typed one on their own row.

import { spanNights } from './dates';

const SLOTS = ['morning', 'midday', 'afternoon', 'evening', 'night'];
const SLOT_RANK = SLOTS.reduce((m, s, i) => ((m[s] = i + 1), m), {});

/** "Day 2 afternoon" → { day: 2, slot: 'afternoon' }; null when not day-anchored. */
export function parseAgendaWhen(when) {
  const m = String(when || '').trim().match(/^day\s*(\d{1,2})\s*(morning|midday|afternoon|evening|night)?$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return { day, slot: m[2] ? m[2].toLowerCase() : null };
}

/** Weekday label for day N of the event ("Friday" for day 1 of a Fri start). */
export function dayLabelFor(event, dayIndex) {
  const start = event && event.date ? String(event.date).slice(0, 10) : null;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return `Day ${dayIndex}`;
  const d = new Date(start + 'T12:00:00');
  d.setDate(d.getDate() + (dayIndex - 1));
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// The flagship reunion arc — PROPOSED, with its grounding attached. Slots only.
// WEEKDAY-AWARE (host catch, 2026-07-27): the worship service is not "day 3" —
// it is THE SUNDAY of the trip, and it is only proposed when the span actually
// contains one (a Wed–Fri reunion must never be handed a Friday church
// service). The cookout prefers the Saturday, else the middle day.
const weekdayOfDay = (ev, dayIndex) => {
  const start = ev && ev.date ? String(ev.date).slice(0, 10) : null;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const d = new Date(start + 'T12:00:00');
  d.setDate(d.getDate() + (dayIndex - 1));
  return d.getDay(); // 0 = Sunday, 6 = Saturday
};
function reunionArc(ev, days) {
  const dayOn = (wd) => {
    for (let i = 1; i <= days; i += 1) if (weekdayOfDay(ev, i) === wd) return i;
    return null;
  };
  const rows = [{ day: 1, slot: 'evening', title: 'Meet & greet', note: 'everyone lands, keep it easy', anchor: true }];
  const saturday = dayOn(6);
  const cookoutDay = (saturday && saturday > 1) ? saturday : Math.min(days, Math.max(2, Math.ceil(days / 2)));
  rows.push({ day: cookoutDay, slot: 'afternoon', title: 'The cookout — the big gathering', note: 'the day everyone came for', anchor: true });
  const sunday = dayOn(0);
  if (sunday && sunday !== cookoutDay) {
    rows.push({ day: sunday, slot: 'morning', title: 'Worship service', note: 'optional — the traditional close', anchor: false });
  }
  if (days > cookoutDay) {
    rows.push({ day: days, slot: 'midday', title: 'Farewell brunch & goodbyes', note: null, anchor: true });
  }
  return rows;
}
const REUNION_ARC_PROVENANCE = {
  tier: 'researched',
  note: 'The documented reunion weekend arc: arrival evening, the shared meal as the climax, worship on the Sunday + farewell close (McCoy, Generations/ASA; reunion-planning consensus, research dossier 2026-07-26).',
};

// ── The structural arc — true of ANY multi-day hosted event ──────────────────
//
// Deliberately CONTENTLESS. It names only what a span itself implies: people
// arrive, the thing everyone came for happens, people leave. It does not know
// what to do in Santa Fe, and it must not pretend to — per-destination activity
// content is a research gap (zero `activities:` keys across 39 playbooks), and
// filling it from a language model would be exactly the invented intelligence
// this codebase forbids. The host gets a real skeleton to edit, plus the honest
// admission that the middle is theirs to fill.
//
// The main day prefers the Saturday when the span contains one — same
// weekday-aware rule as the reunion arc, for the same reason.
function structuralArc(ev, days) {
  const rows = [{
    day: 1, slot: 'evening', anchor: true,
    title: 'Everyone arrives',
    note: days > 1 ? 'keep the first night easy — people are travelling' : null,
  }];

  let mainDay = null;
  for (let i = 1; i <= days; i += 1) { if (weekdayOfDay(ev, i) === 6 && i > 1) { mainDay = i; break; } }
  if (!mainDay) mainDay = Math.min(days, Math.max(2, Math.ceil(days / 2)));
  if (days === 1) mainDay = 1;

  rows.push({
    day: mainDay, slot: 'afternoon', anchor: true,
    title: 'The main event',
    note: 'the day everyone came for',
  });

  if (days > mainDay) {
    rows.push({ day: days, slot: 'midday', anchor: true, title: 'Goodbyes and departures', note: null });
  }
  return rows;
}

// THE DAYS THE ARC DOES NOT COVER ARE THE POINT.
//
// The three anchors are the same three whatever the span, so a 5-day trip came
// back as a 3-row plan and the two unplanned days simply were not mentioned —
// the surface under-told the very thing the host is paying for. A guest is in
// Santa Fe on the Sunday whether or not we have a row for it.
//
// Naming the gap is the honest move, and it belongs in the PROVENANCE rather
// than in filler rows: these rows are a proposal the host accepts with "Use this
// plan", and accepted rows go to the INVITE. A guest reading "Nothing planned
// yet" on their itinerary would be worse than a short one.
function structuralArcProvenance(ev, days, rows) {
  const covered = new Set(rows.map((r) => r.day));
  const openDays = [];
  for (let i = 1; i <= days; i += 1) if (!covered.has(i)) openDays.push(i);

  const base = 'The shape of a multi-day event, not a recommendation about this one: '
    + 'guests arrive, the main day anchors the trip, everyone leaves.';

  let gap = '';
  if (openDays.length) {
    const labels = openDays.map((d) => dayLabelFor(ev, d));
    const named = labels.length === 1 ? labels[0]
      : labels.length === 2 ? `${labels[0]} and ${labels[1]}`
        : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    gap = ` ${named} ${openDays.length === 1 ? 'has' : 'have'} nothing on `
      + `${openDays.length === 1 ? 'it' : 'them'} yet — `
      + `${openDays.length === 1 ? 'a whole day' : `${openDays.length} whole days`} `
      + 'your guests are here for.';
  }

  const tail = ' We hold no researched activity content for this destination yet,'
    + ' and will not invent any.';

  return { tier: 'structural', note: base + gap + tail, openDays };
}

const normRow = (r) => {
  if (!r) return null;
  const day = Math.max(1, Math.round(Number(r.day) || 1));
  const slot = SLOTS.includes(String(r.slot || '').toLowerCase()) ? String(r.slot).toLowerCase() : null;
  const title = String(r.title || r.what || '').trim();
  if (!title) return null;
  return {
    day, slot,
    time: String(r.time || '').trim() || null, // only ever host-typed
    title,
    note: String(r.note || '').trim() || null,
    anchor: !!r.anchor,
  };
};

const sortRows = (rows) => [...rows].sort((a, b) =>
  (a.day - b.day) || ((a.slot ? SLOT_RANK[a.slot] : 99) - (b.slot ? SLOT_RANK[b.slot] : 99)));

/**
 * The guest-facing program. Returns { relevant, source, rows, provenance }.
 * getPlaybook is injected to keep this module playbook-import-free (the invite
 * bundle loads it; same constitution as eventWhen/venueFor).
 */
export function guestItinerary(event, getPlaybook) {
  const ev = event || {};

  // 1 · host-owned rows win outright
  if (Array.isArray(ev.itinerary) && ev.itinerary.length) {
    const rows = sortRows(ev.itinerary.map(normRow).filter(Boolean));
    if (rows.length) return { relevant: true, source: 'host', rows, provenance: null };
  }

  // 2 · authored playbook agenda ("Day N ..." rows only — T-offset rows are crew)
  const pb = (() => { try { return getPlaybook ? getPlaybook(ev.type) : null; } catch { return null; } })();
  const agenda = pb && pb.schedules && Array.isArray(pb.schedules.agenda) ? pb.schedules.agenda : [];
  // W1.3 (2026-08-21): a conditionally multi-day type (Reunion) gates its
  // weekend agenda rows with whenChoice — the same {id, in} vocabulary
  // playbookChecklist's choiceShown() uses, re-read locally because this
  // module must stay playbook-corpus-import-free (see the module header /
  // DEST_LODGING_OPTIONS leaf lesson). Pick falls back to the decision's
  // authored default; an ungated row always shows, so Team Retreat's
  // always-on agenda is untouched. Reword choiceShown and this together.
  const agendaShown = (r) => {
    const g = r && r.whenChoice;
    if (!g || !g.id) return true;
    const picks = (ev.foodChoices && typeof ev.foodChoices === 'object') ? ev.foodChoices : {};
    const dec = pb && Array.isArray(pb.decisions) ? pb.decisions.find((d) => d && d.id === g.id) : null;
    const v = picks[g.id] || (dec && dec.default) || null;
    return v == null ? true : (Array.isArray(g.in) ? g.in : []).includes(v);
  };
  const authored = agenda
    .filter(agendaShown)
    .map((r) => {
      const at = parseAgendaWhen(r && r.when);
      return at ? normRow({ ...at, title: r.what }) : null;
    })
    .filter(Boolean);
  if (authored.length) {
    return {
      relevant: true, source: 'playbook', rows: sortRows(authored),
      provenance: { tier: 'authored', note: `${ev.type}'s own multi-day plan.` },
    };
  }

  // 3 · a PROPOSED arc for any event that actually spans days.
  //
  // This used to read `ev.type === 'Reunion'` and nothing else, so 38 of 39
  // playbooks produced no programme at all: a five-day destination birthday came
  // back `relevant: false` and the host saw nothing. The gate is now the SPAN,
  // not the type — if an event runs multiple days it has an arc, because arriving,
  // gathering and leaving are properties of a span rather than facts about
  // reunions. Reunion keeps its researched overlay on top.
  if (spanNights(ev) >= 1) {
    const days = spanNights(ev) + 1;
    const isReunion = String(ev.type || '') === 'Reunion';
    const rows = (isReunion ? reunionArc(ev, days) : structuralArc(ev, days)).map(normRow).filter(Boolean);
    if (rows.length) {
      const sorted = sortRows(rows);
      return {
        relevant: true,
        source: 'proposed',
        rows: sorted,
        provenance: isReunion ? REUNION_ARC_PROVENANCE : structuralArcProvenance(ev, days, sorted),
      };
    }
  }

  return { relevant: false, source: null, rows: [], provenance: null };
}
