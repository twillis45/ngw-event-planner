// ─── eventPool — the shared event data layer (extracted from HostShellV2) ─────
//
// WHY THIS FILE EXISTS (perf / code-split): the public invite page (InviteV2)
// only needs the event POOL and the artwork resolver to answer an ?rsvp=CODE
// link — not the 8,500-line host shell. It used to import ALL_SAMPLES /
// eventArtworkFile straight from HostShellV2.jsx, which forced every guest to
// download the entire host bundle just to say yes. Pulling the pool machinery
// into this small module lets main.jsx lazy-load HostShellV2 for the host path
// while the invite path pulls only this (+ its data), a real guest-perf win.
//
// One truth: the host shell imports these SAME symbols from here, so the invite
// and the host resolve every event against the exact same pool + patch layers.

import { ALL_PLAYBOOKS, playbookTypicalGuests, playbookChecklist } from '@app/lib/playbooks';
import { ARTWORK_MARKS } from '@app/lib/artworkMarks';
import { isRealHostEvent } from '@app/lib/welcomeGate';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

// My Crab Feast: prefer the user's REAL event from the app's own storage
// (same-origin on the deployed site — the production app writes 'ngw-events');
// otherwise construct one from the Crab Feast playbook's real defaults.
export let APP_EVENTS = [];
try { APP_EVENTS = JSON.parse(localStorage.getItem('ngw-events')) || []; } catch { APP_EVENTS = []; }

export const LS_PATCH = id => 'ngw-hostv2-patch-' + id;
// Legacy single-slot key (one custom event, id 'custom'). Read-only now —
// folded into LS_CUSTOMS below once, then left intact (never destroyed) so
// nothing that still reads it loses data.
export const LS_CUSTOM = 'ngw-hostv2-custom-event';
// The multi-event store: EVERY event created in this shell, as an array.
// Each stores itself whole (no LS_PATCH layer — that's for sample/app bases).
export const LS_CUSTOMS = 'ngw-hostv2-custom-events';
// Last event the host was on — creation and switching write it, boot reads it,
// so a reload lands back on the event they were working, not the first sample.
export const LS_LAST_EVENT = 'ngw-hostv2-last-event';
// Unique id for a created event — prefixed so it can never collide with sample
// ids ('ev-*', 'test-*', 'my-crab-feast'), demo seeds ('demo-*'), or the app's
// own 6-char uid() ids.
export const mintEventId = () => 'cust-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
// Unicode-safe base64 (handles ✓, em-dashes, accents in brief data) — the
// SAME fallback encoding legacy's VendorBriefModal uses (App.js) when the
// vendor-brief API isn't configured or minting fails. Kept as a fallback
// here too: sharing a brief must never break because a backend is down.
export const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
// The legacy slot's one event gets this DETERMINISTIC id when folded in, so
// the fold is idempotent without a separate marker key (re-running it can
// never duplicate the event).
export const LEGACY_CUSTOM_ID = 'cust-legacy';

// Load the multi-event store; fold the legacy single-slot event in ONCE.
export function loadCustomEvents() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(LS_CUSTOMS)) || []; } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  list = list.filter(e => e && e.id);
  try {
    if (!list.some(e => e.id === LEGACY_CUSTOM_ID)) {
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem(LS_CUSTOM)) || null; } catch { legacy = null; }
      if (legacy && typeof legacy === 'object' && String(legacy.name || '').trim()) {
        // 'custom' was a slot name, not a real id — the store needs one per
        // event. Carry the id-keyed side records (guest-reply outbox, weather
        // seen/notify flags) along so nothing keyed to the old id is orphaned.
        for (const mk of ['ngw-rsvp-queue-', 'ngw-hostv2-wxseen-', 'ngw-hostv2-wxnotify-']) {
          try {
            const v = localStorage.getItem(mk + 'custom');
            if (v !== null && localStorage.getItem(mk + LEGACY_CUSTOM_ID) === null) localStorage.setItem(mk + LEGACY_CUSTOM_ID, v);
          } catch { /* private mode */ }
        }
        list = [...list, { ...legacy, id: LEGACY_CUSTOM_ID }];
        localStorage.setItem(LS_CUSTOMS, JSON.stringify(list));
        // The old build never wrote a last-event pointer, so a reload dropped
        // the host onto the first sample. Their own event is the right landing.
        if (localStorage.getItem(LS_LAST_EVENT) === null) localStorage.setItem(LS_LAST_EVENT, LEGACY_CUSTOM_ID);
      }
    }
  } catch { /* private mode — the fold retries next load; this session still sees the list built above */ }
  return list;
}
export const CUSTOM_EVENTS_AT_LOAD = loadCustomEvents();
export const isStoredCustomId = id => CUSTOM_EVENTS_AT_LOAD.some(e => e.id === id);

// Created events cloud-save into the same store 'ngw-events' hydrates from —
// exclude them here so a synced copy never doubles as an "app" event.
export const appCrab = APP_EVENTS.find(e => e && !isStoredCustomId(e.id) && /crab/i.test(String(e.name || '') + ' ' + String(e.type || '')));
// Every OTHER real event adopts too (activation: your actual events, right
// here) — read-only base with the V2 patch overlay; demo/seed rows excluded.
// (isRealHostEvent — lib/welcomeGate — is the ONE definition of "the host's
// own event"; the first-run welcome gate reads the same predicate.)
export const REAL_EVENTS = APP_EVENTS.filter(e => e !== appCrab && isRealHostEvent(e) && !isStoredCustomId(e.id))
  .sort((a, b) => {
    // upcoming first (soonest on top), then past by recency — the sheet
    // shows what matters without a cap
    const da = a.date ? new Date(a.date + 'T12:00:00') - new Date() : Infinity;
    const db = b.date ? new Date(b.date + 'T12:00:00') - new Date() : Infinity;
    const fa = da >= 0 ? da : Infinity - 1, fb = db >= 0 ? db : Infinity - 1;
    if (da >= 0 || db >= 0) return fa - fb;
    return db - da;
  });
const inThreeWeeks = (() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toISOString().slice(0, 10); })();
export const MY_CRAB_FEAST = appCrab || {
  id: 'my-crab-feast', rsvpCode: 'crab',
  name: 'My Crab Feast', type: 'Crab Feast',
  date: inThreeWeeks, venue: 'Backyard',
  guestEstimate: playbookTypicalGuests('Crab Feast') || 18,
  budget: [], guests: [], vendors: [],
};

export const ROSTER_IDS = ['ev-x-retirement-party', 'ev-x-birthday', 'ev-x-graduation', 'ev-dmv-wedding'];
// ── Intelligence/attention test events (host request, 2026-07-08): one on the
// day itself and one two days out — the windows where dayBefore, live-day ros,
// weather phase impact, shopping urgency, and compression all fire. Built from
// real playbooks with realistic mid-flight state; dates computed at load so
// they're ALWAYS day-of / +2d.
const mkDate = (plus) => { const d = new Date(); d.setDate(d.getDate() + plus); d.setHours(12); return d.toISOString().slice(0, 10); };
const mkTest = (id, name, typeRe, plus, extras) => {
  const pb = ALL_PLAYBOOKS.find(p => p && typeRe.test(p.type)) || ALL_PLAYBOOKS.find(p => /get.?together/i.test(p.type));
  const type = pb ? pb.type : 'Get-Together';
  const typical = playbookTypicalGuests(type) || 14;
  const stub = { id, type, date: mkDate(plus), guestEstimate: typical };
  // Canonical checklist (choice/caterer gates, computed offsets) — half done.
  const rows = (() => { try { return playbookChecklist(stub) || []; } catch { return []; } })();
  return {
    id, rsvpCode: id, name,
    type,
    date: stub.date,
    venue: 'Backyard', venueKind: 'home',
    guestMode: 'count', guestEstimate: typical,
    totalBudget: 400,
    budget: [], vendors: [],
    guests: [
      { id: id + '-g1', name: 'Denise & Ray', rsvp: 'Yes' },
      { id: id + '-g2', name: 'The Okafors', rsvp: 'Yes' },
      { id: id + '-g3', name: 'Marcus', rsvp: 'Maybe' },
      { id: id + '-g4', name: 'Aunt Cee', rsvp: '' },
    ],
    // Realistic mid-flight: early steps done, day-adjacent steps open.
    timeline: rows.map((r, i) => ({ id: r.id, week: r.week || '', task: r.task || '', done: i < Math.ceil(rows.length / 2), owner: '', category: r.category || '' })),
    ...extras,
  };
};
export const TEST_DAY_OF = mkTest('test-day-of', 'Test — Cookout (day of)', /^the cookout$|^cookout$/i, 0, {
  rainPlan: '', // day-of with NO backup: the rain essential + weather pill must both fire
});
export const TEST_TWO_DAYS = mkTest('test-two-days', 'Test — Game Night (in 2 days)', /game night/i, 2, {});

// Exported for the public invite page (InviteV2) — it resolves rsvpCode links
// against the SAME pool + patch layers the host shell reads (one truth).
// Includes the created-event store (load-time read — fresh on every invite
// page load) so every created event's invite link resolves, not just one.
export const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV, MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS, ...REAL_EVENTS, ...CUSTOM_EVENTS_AT_LOAD];

export const ROSTER = [...ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean), MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];
export const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

// Boot on the last event the host was working when it still exists on this
// device; otherwise the first roster sample, exactly as before.
export const BOOT_EVENT_ID = (() => {
  try {
    const id = localStorage.getItem(LS_LAST_EVENT);
    if (id && ALL_SAMPLES.some(e => e && e.id === id)) return id;
  } catch { /* private mode */ }
  return FALLBACK ? FALLBACK.id : null;
})();

// The event's registered artwork mark (ARTWORK_MARKS registry — real PD
// artwork only). ONE resolver shared by the invite and the host's crest
// control; returns the filename or null when the type has no mark.
export function eventArtworkFile(event) {
  const t = String((event && event.type) || '') + ' ' + String((event && event.name) || '');
  const key = /crab/i.test(t) ? 'crab' : /fish\s*fry|catfish/i.test(t) ? 'fish' : null;
  return key ? (ARTWORK_MARKS[key] || null) : null;
}
