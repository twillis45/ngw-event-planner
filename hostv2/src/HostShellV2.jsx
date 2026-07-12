// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production engines: eventPlan() (CommandCenter.jsx), identityStatement()
// (lib/eventIdentity), real sample events, real budget + run-of-show data.
// Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { eventPlan, applicableReadinessAxes } from '@app/CommandCenter';
import { buildCrabProcurement } from '@app/lib/procurement';
import { buildAssembleRevealStages, unresolvedBlockerStages } from '@app/lib/assembleRevealEngines';
import { buildExperienceContext } from '@app/lib/experienceContext';
import { deriveHelperResponsibilities, helperStatusLine, guestHelperRoles } from '@app/lib/helperResponsibility';
import { buildCrabPlan, defaultCountPerUnit, lineCrabCount, recommendCrabOrder } from '@app/lib/crabPlan';
import { buildVendorPlan } from '@app/lib/vendorPlan';
import { METRO_MARKETS, METRO_TIER_LABEL, getMetroFactor, getRushFactor } from '@app/lib/vendorEstimator';
import { positiveAttention } from '@app/lib/positiveAttention';
import { showsReplyTracking } from '@app/lib/guestMode';
import { isLikelyOutdoor, suggestRainPlan, guestRainMessage, weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus, weatherLogistics, isWeatherConfigured, geocodeVenue, getEventWeatherRisk } from '@app/lib/weather';
import { playMessageChime, notifyMessageArrival, setMessageSoundMuted, primeMessageSound } from '@app/lib/notificationSound';
import { draftInvite, draftShoppingList, draftVendorOutreach, draftThankYou, draftRsvpChase, draftHelperBrief, draftHelperConfirm, draftVendorReconfirm, hasToastMaterial, draftToast, draftGuestUpdate, draftParkingInstructions, draftDietaryNote, draftRecap, draftDayBeforeDetails, draftVendorPaymentReminder, draftLodgingNote, draftRidesNote, draftGettingHereNote, draftGuestBrief, timePhrase } from '@app/lib/doItForMe';
import { buildTravelPlan, nextLodgingStatus, LODGING_STATUS_LABEL, rideStatusOf, nextRideStatus, rideFieldsFor, RIDE_STATUS_LABEL, arrivalClusters } from '@app/lib/travelPlan';
import { buildSeatingPlan, assignGuestToTable, unassignGuest, autoAssignByGroup, renameTable, clampTableCount, MEAL_SHORT } from '@app/lib/seatingPlan';
import { costSharingSummary } from '@app/lib/costSharing';
import { DAY_COMPLETE_COPY } from '@app/lib/dayOfCopy';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor , taskTimeStatus } from '@app/lib/dates';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { setLesson, getLesson } from '@app/lib/eventMemory';
import { purgeStaleOutbox, fetchEventRsvps, isRsvpApiConfigured } from '@app/lib/api/rsvp';
import { effectiveDone } from '@app/lib/taskEngine';
import Papa from 'papaparse';
import QRCode from 'qrcode';
import { PLATFORMS, transformRows, validateRows, computeMergeSummary, applyMerge, toCSV, COLUMNS, exportFileSlug } from '@app/lib/csvParsers';
import { GUEST_IMPORT_BATCHES_KEY, newImportBatchId, computeImportAuditMeta, makeImportBatch, undoLastImportBatch, loadImportBatches, persistImportBatches, MAX_PERSISTED_BATCHES, PLATFORM_LABELS, fmtBatchTs } from '@app/lib/importHistory';
import { downloadCSV } from '@app/lib/download';
import { deriveEventPhaseProgress } from '@app/lib/phaseProgress';
import { deriveEventCompressionSummary } from '@app/lib/workflowCompression';
import { buildDayBeforePlan } from '@app/lib/dayBefore';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { estimateTotalRange } from '@app/lib/budgetEstimator';
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan, effectiveRos, classifyRos, hostIsCooking, guestCountResolved, attendanceBand, attendanceBandLabel, playbookDecisionBoard, playbookDecisionOptions, playbookCapacity, playbookRisks, supplyRetailLinks, playbookHeartMoments, playbookChecklist, playbookContingencyForWeather, crabPriceLadder, playbookOpenDecisionAffects, playbookTypicalGuests, normalizeAlternative } from '@app/lib/playbooks';
import { buildReturnSnapshot, readReturnSnapshot, writeReturnSnapshot, deriveReturnNarration, narrationDuplicatesTelling } from '@app/lib/returnNarration';
import { makeRecord, appendDecision, latestRationaleForSubject } from '@app/lib/decisionMemory';
import { computeDayAlerts } from '@app/lib/dayAlerts';
import { getVendorCOIState, coiNextAction } from '@app/lib/vendorIntelligence';
import { EVENT_TAXONOMY, resolveCanonicalType } from '@app/lib/eventTaxonomy.mjs';
import { ARTWORK_MARKS } from '@app/lib/artworkMarks';
import { isPlausibleCityText, parseVenueLocation } from '@app/lib/cityText';
import { foodShopItems } from '@app/lib/foodShopItems';
import { eventGeoQuery } from '@app/lib/eventGeoQuery';
import { parseSmartEventText, HOST_TYPES } from '@app/lib/smartParseEvent';
import { shouldShowWelcome, isRealHostEvent, LS_WELCOMED } from '@app/lib/welcomeGate';
import { isFoodPricesConfigured, getFoodPriceFactor } from '@app/lib/foodPrices';
import { quickAccountabilityForVendor, inferPromisesFromVendor } from '@app/lib/vendorAccountability/derive';
import { deriveVendorPromiseConflicts } from '@app/lib/vendorAccountability/conflicts';
import { buildBudgetRecoveryPlan } from '@app/lib/budgetRecovery';
import { pickDroppableBudgetRow } from '@app/lib/budgetSwap';
import { eventContextNudge } from '@app/lib/eventContextNudges';
import { derivePlaceIntelligence } from '@app/lib/placeIntelligence';
import { budgetHeroCopy } from '@app/lib/budgetCopy';
import { rosOverlapCount } from '@app/lib/rosOverlap';
import { suggestableMoments, buildMomentSegment } from '@app/lib/momentLibrary';
import { vendorMemoryFor, summarizeVendorMemory } from '@app/lib/eventMemory';
import { taskUrgencyChip } from '@app/lib/workflowCompression';
import { buildPayLink, getSuggestedPayMethod } from '@app/lib/payLinks';
import { attendanceAdjustment, summarizeHostIntel, clearAllMemory, applyReconciliation, isReconciled } from '@app/lib/hostIntel';
import { confidencePersona, confidenceFor } from '@app/lib/confidenceGrammar';
import { isSupabaseConfigured, supabase, authRedirectUrl } from '@app/lib/supabaseClient';
import { loadProfile as cloudLoadProfile, saveProfile as cloudSaveProfile } from '@app/lib/api/profile';
import { loadEvents as cloudLoadEvents, saveEvent as cloudSaveEvent } from '@app/lib/api/events';
import { recordSaveResult, flushPendingEvents as flushSync, installOnlineFlush, getEventSyncStatus, SYNC_STATUS, SYNC_STATUS_LABEL, getLastSyncTime, getPendingCount, markEventSynced } from '@app/lib/api/syncState';
import { buildVendorBriefPayload } from '@app/lib/vendorBrief';
import { mintVendorBriefLink, isVendorBriefApiConfigured } from '@app/lib/api/vendorBrief';
import { mergeGuestReplies } from '@app/lib/guestMerge';
import { parseMin } from '@app/lib/dayAlerts';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

// My Crab Feast: prefer the user's REAL event from the app's own storage
// (same-origin on the deployed site — the production app writes 'ngw-events');
// otherwise construct one from the Crab Feast playbook's real defaults.
let APP_EVENTS = [];
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
const LS_LAST_EVENT = 'ngw-hostv2-last-event';
// Unique id for a created event — prefixed so it can never collide with sample
// ids ('ev-*', 'test-*', 'my-crab-feast'), demo seeds ('demo-*'), or the app's
// own 6-char uid() ids.
const mintEventId = () => 'cust-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
// Unicode-safe base64 (handles ✓, em-dashes, accents in brief data) — the
// SAME fallback encoding legacy's VendorBriefModal uses (App.js) when the
// vendor-brief API isn't configured or minting fails. Kept as a fallback
// here too: sharing a brief must never break because a backend is down.
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
// The legacy slot's one event gets this DETERMINISTIC id when folded in, so
// the fold is idempotent without a separate marker key (re-running it can
// never duplicate the event).
const LEGACY_CUSTOM_ID = 'cust-legacy';

// Load the multi-event store; fold the legacy single-slot event in ONCE.
function loadCustomEvents() {
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
const CUSTOM_EVENTS_AT_LOAD = loadCustomEvents();
const isStoredCustomId = id => CUSTOM_EVENTS_AT_LOAD.some(e => e.id === id);

// Created events cloud-save into the same store 'ngw-events' hydrates from —
// exclude them here so a synced copy never doubles as an "app" event.
const appCrab = APP_EVENTS.find(e => e && !isStoredCustomId(e.id) && /crab/i.test(String(e.name || '') + ' ' + String(e.type || '')));
// Every OTHER real event adopts too (activation: your actual events, right
// here) — read-only base with the V2 patch overlay; demo/seed rows excluded.
// (isRealHostEvent — lib/welcomeGate — is the ONE definition of "the host's
// own event"; the first-run welcome gate reads the same predicate.)
const REAL_EVENTS = APP_EVENTS.filter(e => e !== appCrab && isRealHostEvent(e) && !isStoredCustomId(e.id))
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
const MY_CRAB_FEAST = appCrab || {
  id: 'my-crab-feast', rsvpCode: 'crab',
  name: 'My Crab Feast', type: 'Crab Feast',
  date: inThreeWeeks, venue: 'Backyard',
  guestEstimate: playbookTypicalGuests('Crab Feast') || 18,
  budget: [], guests: [], vendors: [],
};

const ROSTER_IDS = ['ev-x-retirement-party', 'ev-x-birthday', 'ev-x-graduation', 'ev-dmv-wedding'];
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
    timeline: rows.map((r, i) => ({ id: r.id, week: r.week || '', task: r.task || '', done: i < Math.ceil(rows.length / 2), owner: '' })),
    ...extras,
  };
};
const TEST_DAY_OF = mkTest('test-day-of', 'Test — Cookout (day of)', /^the cookout$|^cookout$/i, 0, {
  rainPlan: '', // day-of with NO backup: the rain essential + weather pill must both fire
});
const TEST_TWO_DAYS = mkTest('test-two-days', 'Test — Game Night (in 2 days)', /game night/i, 2, {});

// Exported for the public invite page (InviteV2) — it resolves rsvpCode links
// against the SAME pool + patch layers the host shell reads (one truth).
// Includes the created-event store (load-time read — fresh on every invite
// page load) so every created event's invite link resolves, not just one.
export const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV, MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS, ...REAL_EVENTS, ...CUSTOM_EVENTS_AT_LOAD];

const ROSTER = [...ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean), MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];
const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

// Boot on the last event the host was working when it still exists on this
// device; otherwise the first roster sample, exactly as before.
const BOOT_EVENT_ID = (() => {
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

const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

const REDUCE_MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Count-up micro-motion: numbers settle into place (ease-out cubic, no bounce).
function useCountUp(target, dur = 650, enabled = true) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    // Audit finding (2026-07-11): with no gate, this settles in under the
    // opaque boot splash and completes unseen — the one entrance motion the
    // daily-boot path had is invisible every day. Holding while disabled
    // (splash still up) leaves `prev.current` at its pre-boot value, so the
    // very next enabled run counts up from there — the reveal the splash's
    // fade was supposed to hand off to, now actually visible.
    if (!enabled) return undefined;
    const from = prev.current; prev.current = target;
    if (REDUCE_MOTION || target === null || target === undefined || isNaN(target) || from === target) { setV(target); return; }
    const start = typeof from === 'number' && !isNaN(from) ? from : 0;
    const t0 = performance.now(); let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    // rAF pauses in background tabs — without a floor the count freezes at
    // its previous value until the tab refocuses. Hidden → land instantly;
    // visible → a timeout backstop guarantees the final value regardless.
    if (typeof document !== 'undefined' && document.hidden) { setV(target); return; }
    raf = requestAnimationFrame(tick);
    const settle = setTimeout(() => setV(target), dur + 120);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, dur, enabled]);
  return v;
}


const kidsTotal = (gs) => (gs || []).reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
// ENGINE precedence (guestCountResolved): the CONFIRMED count wins, then the
// estimate, then the roster. (Audit fix: V2 wrote guestCount from the
// confirm-count panel but never read it back — tiles kept the old estimate.)
const guestNumber = e => Number(e.guestCount) || Number(e.guestEstimate) || (e.guests || []).length || 0;

const DOMAIN_LENS = { guests: 'Guests', budget: 'Budget', food: 'Food', vendors: 'Vendors', date: 'Plan', start: 'Guests' };

function describeRoute(route) {
  if (!route || !route.tab) return null;
  const bits = [route.tab];
  if (route.planningView) bits.push(route.planningView);
  if (route.foodFocus) bits.push('food line “' + route.foodFocus + '”');
  if (route.focusField) bits.push('field “' + route.focusField + '”');
  if (route.vendorId) bits.push('vendor ' + route.vendorId);
  if (route.taskId) bits.push('task ' + route.taskId);
  return bits.join(' → ');
}

// Occasion choices = the REAL playbook catalog (single source: HOST_TYPES and
// the free-text parser both live in lib/smartParseEvent now).

// Shelves: group the catalog by the taxonomy's REAL parent categories.
const TYPE_GROUPS = (() => {
  const groups = new Map();
  for (const t of HOST_TYPES) {
    const parent = (EVENT_TAXONOMY[t] && EVENT_TAXONOMY[t].parent) || 'More occasions';
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(t);
  }
  return [...groups.entries()];
})();

// Dietary tag vocabulary — was 3 separately-hand-typed 6-item copies inline
// (found in the 2026-07-11 food-plan audit) vs. legacy's 12-tag DIET_TAGS
// (App.js:2614). Consolidated to one list, corrected to 'Shellfish' (not
// legacy's 'Shellfish allergy' — the engine's own DIET_KEYWORDS table, lib/
// playbooks/index.js:1798, keys on 'Shellfish', so legacy's own guest-facing
// label silently never flags a shellfish line; that's a pre-existing legacy
// bug, not parity worth reproducing). The tags without a DIET_KEYWORDS entry
// (Egg/Soy allergy, Diabetic-friendly) still count toward headcount tracking
// — same honest limit legacy has for those.
const DIET_TAGS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Shellfish', 'Halal', 'Kosher', 'Alcohol-free', 'Egg allergy', 'Soy allergy', 'Diabetic-friendly'];
// Guest free-text "needs" → a DIET_TAG, so a per-guest RSVP note ("gluten
// free please") can be merged into dietCounts without retyping (parity:
// App.js:10831, tagFor).
const dietTagFor = (s) => {
  const t = String(s || '').trim().toLowerCase();
  if (!t) return null;
  return DIET_TAGS.find((tag) => {
    const tl = tag.toLowerCase();
    return tl === t || tl.startsWith(t) || (t.length > 2 && tl.startsWith(t.replace(/ (allergy|free)$/, '')));
  }) || null;
};

// Ros cue times are internal 24h "HH:MM" strings (playbookRunOfShow) — never
// host copy. This turns "23:40" into "11:40 PM"; anything that isn't a bare
// 24h clock (a host-typed "4:00 PM", a worded time) passes through untouched.
// timePhrase (lib/doItForMe) is NOT this: it answers "when is the event"
// (startTime / part-of-day), not "format this clock string".
const fmt12h = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  if (!m) return String(t || '').trim();
  const h = Number(m[1]);
  if (h > 23) return String(t).trim();
  return (h % 12 || 12) + ':' + m[2] + (h >= 12 ? ' PM' : ' AM');
};

// ── Sheet hero (host request 2026-07-11) — the ONE pattern every count-bearing
// sheet opens with: eyebrow, 38px star, warm honest mega-sub, optional grounding.
// Markup matches the food/vendors/guests heroes exactly; figures always come
// from the caller's real engine reads — this renders, it never derives.
function SheetHero({ eyebrow, star, tone, sub, grounding }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'danger' ? 'var(--danger)' : 'var(--ink)';
  return (
    <div style={{ padding: '2px 0 14px' }}>
      <div className="eyebrow">{eyebrow}</div>
      <div style={{ fontSize: 'var(--t-hero-star)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, margin: '6px 0 6px', fontVariantNumeric: 'tabular-nums', color }}>
        {star}
      </div>
      {sub ? <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)', margin: grounding ? '0 0 8px' : 0, minHeight: 0 }}>{sub}</p> : null}
      {grounding ? <p className="grounding" style={{ margin: 0 }}>{grounding}</p> : null}
    </div>
  );
}

export default function HostShellV2() {
  const [stage, setStage] = useState('plan');
  const [eventId, setEventId] = useState(BOOT_EVENT_ID);
  // EVERY event created here (array — creating a second never overwrites the
  // first). Each stores itself whole; edits land directly on the array entry.
  const [customs, setCustoms] = useState(CUSTOM_EVENTS_AT_LOAD);
  const isCustomEventId = (id) => customs.some(c => c && c.id === id);
  const activeCustom = customs.find(c => c && c.id === eventId) || null;
  // First-run welcome (one-time): a brand-new host — nothing real in
  // 'ngw-events', no V2-created event, never welcomed — gets ONE calm screen
  // of orientation instead of cold-landing inside a sample event. Decision
  // logic lives in lib/welcomeGate (pure, unit-tested); clearing LS_WELCOMED
  // re-arms it for a host who still has no real events.
  const [welcome, setWelcome] = useState(() => {
    // ?welcome=1 forces the gate for review on any device (host request:
    // "make sure the splash gets me here" — on a device with stored events
    // or the welcomed flag, the gate is otherwise correctly suppressed, so
    // this is the only way to watch splash → welcome end-to-end there).
    try { if (new URLSearchParams(window.location.search).has('welcome')) return true; } catch { /* ancient browser — fall through */ }
    let seen = false; try { seen = localStorage.getItem(LS_WELCOMED) === '1'; } catch { seen = false; }
    return shouldShowWelcome({ appEvents: APP_EVENTS, customEvent: CUSTOM_EVENTS_AT_LOAD[0] || null, welcomed: seen });
  });
  const dismissWelcome = (dest) => {
    try { localStorage.setItem(LS_WELCOMED, '1'); } catch { /* private mode — shows again next load, never blocks */ }
    setWelcome(false);
    if (dest === 'create') setStage('create');
  };
  // ── Boot splash: Event Boss DARK CARBON (R13 prototype, host-directed
  // 2026-07-11 — supersedes the R11b carve). 'up' → 'leaving' (200ms fade,
  // app interactive) → 'gone' (unmounted). The app renders BENEATH it the
  // whole time — the splash only ever delays what the host sees, never what
  // exists. Any tap ends it early. It lives in this component only, so the
  // ?rsvp= / ?vendor= public paths (routed in main.jsx before this shell
  // mounts) can never show it.
  // Audit finding (2026-07-11): no leader shows a multi-second brand film on
  // EVERY cold boot — Apple's HIG explicitly rejects launch-screen theater;
  // Arc/Family run their long choreography once. So: full ~4.95s
  // choreography only the first time this browser has ever booted the app;
  // every boot after gets a short ~1.2s settled hold (.splash-quick pins the
  // entrance to its resolved end-state — same asset the reduced-motion path
  // already builds — while the glow drift and dot breathe keep running, so
  // it reads as "the mark, briefly" rather than a hard freeze-frame).
  // Reduced motion overrides both: always the 400ms still frame.
  const LS_SPLASH_SEEN = 'ngw-v2-splash-seen';
  const [splash, setSplash] = useState('up');
  const splashTimer = useRef(null);
  const endSplash = () => setSplash(s => {
    if (s !== 'up') return s;
    try { localStorage.setItem(LS_SPLASH_SEEN, '1'); } catch { /* private mode — full film every time, never blocks */ }
    return 'leaving';
  });
  // ?splashhold keeps it up indefinitely for design review (any tap still
  // skips) — pairs with ?welcome for end-to-end boot review. ?splashfull
  // forces the first-boot-length film even on a return boot (same review
  // need, opposite direction from splashhold). Read once at component scope
  // so both the dismiss timer and the render's CSS class agree.
  let splashHold = false, splashForceFull = false;
  try {
    const q = new URLSearchParams(window.location.search);
    splashHold = q.has('splashhold');
    splashForceFull = q.has('splashfull');
  } catch { /* leave both false */ }
  const splashSeenBefore = (() => {
    try { return localStorage.getItem(LS_SPLASH_SEEN) === '1'; } catch { return false; }
  })();
  const splashQuick = splashSeenBefore && !splashForceFull;
  useEffect(() => {
    if (splash === 'up') {
      let reduced = false;
      try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { reduced = false; }
      splashTimer.current = setTimeout(endSplash, splashHold ? 600000 : reduced ? 400 : splashQuick ? 1200 : 4750);
    } else if (splash === 'leaving') {
      splashTimer.current = setTimeout(() => setSplash('gone'), 220);
    }
    return () => clearTimeout(splashTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splash]);
  // Belt-and-suspenders skip: the .splash div's own onPointerDown/onClick are
  // correct, but live testing (host reports + automated coordinate clicks)
  // found real taps don't reliably reach them — some hit-testing/stacking path
  // lets a tap land without triggering them, even though a raw DOM .click()
  // always works. A WINDOW-level CAPTURE listener fires before anything else
  // on the page can intercept the event, so skip works regardless of what
  // actually received it. Keydown too, cheaply, while we're here. Scoped to
  // splash==='up' only — nothing to skip once it's already leaving/gone.
  useEffect(() => {
    if (splash !== 'up') return undefined;
    const onSkip = () => endSplash();
    // Keys: skip on real keys only (ignore bare modifiers — Cmd+L etc.
    // shouldn't consume the brand beat) and eat the keystroke so it can't
    // simultaneously act on anything beneath.
    const onKey = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault();
      endSplash();
    };
    window.addEventListener('pointerdown', onSkip, true);
    window.addEventListener('click', onSkip, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onSkip, true);
      window.removeEventListener('click', onSkip, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [splash]);
  // The overlay element — rendered inside .stagewrap in BOTH shell returns
  // (welcome gate and main shell) so a re-render across that boundary can't
  // drop it mid-beat. Markup is the Dark Carbon stage: drifting glow layer,
  // neumorphic wordmark (no gloss inlay — that was the R11b carve's device),
  // the period bead that drops in last, caps, two-line tagline.
  const splashEl = splash !== 'gone' ? (
    <div
      className={'splash' + (splash === 'leaving' ? ' splash-leaving' : '') + (splashQuick ? ' splash-quick' : '')}
      /* both handlers, idempotent state guard: pointerdown answers a real
         finger/mouse instantly; click catches synthetic + assistive input
         that never emits pointer events (found live: automated clicks
         skipped pointerdown entirely) */
      onPointerDown={endSplash}
      onClick={endSplash}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); endSplash(); } }}
      /* Exposed to AT as a real actionable control, not hidden: the app
         beneath is now inert while this is up, so a screen-reader user's
         first stop is a named, activatable "skip intro" — not silence
         over content they can't perceive yet. */
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
    >
      <div className="sp-glow" />
      <div className="sp-stack">
        <div className="sp-carv sp-l1">Event</div>
        <div className="sp-l2row">
          <div className="sp-carv sp-l2">Boss</div>
          <span className="sp-dot" />
        </div>
      </div>
      <div className="sp-caps">EVENT BOSS</div>
      <div className="sp-line">the details are ours.<br />the day is yours.</div>
    </div>
  ) : null;
  const [patch, setPatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PATCH(BOOT_EVENT_ID))) || {}; } catch { return {}; }
  });
  const [toastMsg, setToastMsg] = useState(null);
  // Money-move undo (Sprint 1): a toast can carry ONE inline action — a
  // single-level snapshot restore of just the fields the write changed. Not a
  // history system; only money-moving writes (the budget number) set it.
  const [toastAction, setToastAction] = useState(null); // { label, fn } | null
  const [handledOpen, setHandledOpen] = useState(false);
  const toastTimer = useRef(null);
  const appRef = useRef(null);

  // Create — ONE smart input; the real resolvers parse it. Form fields exist
  // only as corrections layered over the parse (host-shell logic, not a form).
  const [smartText, setSmartText] = useState('');
  const [fName, setFName] = useState('');
  const [fCity, setFCity] = useState(''); // town for weather + maps, asked at creation
  const [fType, setFType] = useState(null);
  const [fDate, setFDate] = useState('');
  const [fGuests, setFGuests] = useState(null);
  const [fBudget, setFBudget] = useState(null);
  const [fIsDestination, setFIsDestination] = useState(null);
  const [createEdit, setCreateEdit] = useState(null); // which correction editor is open
  // "Change an answer" re-runs assemble over the SAME event — this holds its
  // id so the correction replaces it in the store instead of appending a
  // duplicate. Cleared on consume and whenever the host switches events.
  const redoEventId = useRef(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [venueDraft, setVenueDraft] = useState('');
  const [venueErr, setVenueErr] = useState(null);
  // Venue validation: a real place has letters and substance — not "", "1",
  // or stray digits. Same gate the address row uses.
  const validPlace = (v) => {
    const t = String(v || '').trim();
    if (/^\d{5}(-\d{4})?$/.test(t)) return true; // a ZIP is a real place
    return t.length >= 3 && /[a-zA-Z]/.test(t) && !/^\d+$/.test(t);
  };
  const [cityDraft, setCityDraft] = useState('');
  const [addrSugs, setAddrSugs] = useState([]);
  const [pendingCity, setPendingCity] = useState('');
  const addrTimer = useRef(null);
  useEffect(() => {
    // Google Places upgrades this input automatically when a key is present
    // (localStorage 'ngw-google-places-key') — until then OSM answers.
    try {
      const k = localStorage.getItem('ngw-google-places-key') || process.env.REACT_APP_GOOGLE_MAPS_KEY;
      if (k && !window.google) {
        const sc = document.createElement('script');
        sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(k) + '&libraries=places';
        document.head.appendChild(sc);
      }
    } catch {}
  }, []);
  const fetchAddrSugs = (q) => {
    clearTimeout(addrTimer.current);
    const query = String(q || '').trim();
    if (query.length < 3) { setAddrSugs([]); return; }
    addrTimer.current = setTimeout(async () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          const svc = new window.google.maps.places.AutocompleteService();
          svc.getPlacePredictions({ input: query, componentRestrictions: { country: 'us' } }, (preds) => {
            setAddrSugs((preds || []).slice(0, 5).map(p => ({ label: p.description, city: '' })));
          });
          return;
        }
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=' + encodeURIComponent(query));
        const j = await r.json();
        setAddrSugs((Array.isArray(j) ? j : []).map(x => {
          const a = x.address || {};
          const city = a.city || a.town || a.village || a.hamlet || '';
          const short = String(x.display_name || '').split(',').slice(0, 3).join(',');
          return { label: short, city: city + (a.state ? ', ' + a.state : '') };
        }));
      } catch { setAddrSugs([]); }
    }, 380);
  };
  const pickAddr = (sug) => {
    setVenueDraft(sug.label);
    setPendingCity(sug.city || '');
    setAddrSugs([]);
  };
  const saveVenue = () => {
    if (!validPlace(venueDraft)) { setVenueErr('Give guests a real place — a name or an address, not just a number.'); return; }
    const v = venueDraft.trim();
    // pendingCity comes from the address-autocomplete pick (already "City, ST"
    // when Nominatim returned a state) — same strict gate as saveCity so a
    // bare-city result never slips through this second write path either.
    const parsedCity = pendingCity ? parseVenueLocation(pendingCity) : null;
    patchEvent({
      venue: v,
      venueKind: /backyard|house|home|yard|place|garden/i.test(v) ? 'home' : (event.venueKind || ''),
      ...(parsedCity
        ? (parsedCity.zip ? { venueCity: parsedCity.zip } : { venueCity: parsedCity.city, venueState: parsedCity.state })
        : {}),
    }, 'Venue on the plan — invites, maps, and the rain note now carry it.');
    setVenueErr(null); setVenueDraft(''); setPendingCity(''); setAddrSugs([]);
  };
  // At-home venues resolve the ORIGINAL's venue blocker via venueCity (the
  // same field weather geocoding reads) — so home events get a city ask.
  const needsCity = () => event.venueKind === 'home' && !String(event.venueCity || '').trim();
  const saveCity = () => {
    const c = cityDraft.trim();
    // Bare-city geocoding is genuinely ambiguous — "Springfield", "Arlington",
    // and dozens of other US city names exist in multiple states, and the
    // weather geocode (limit=1) will silently resolve to the wrong one with
    // no error. Require "City, ST" or a ZIP; reject a bare city outright
    // rather than accept something the app can't actually locate.
    const parsed = parseVenueLocation(c);
    if (!parsed) { toast('Add the state or ZIP too — “Annapolis, MD” or “21401” — a city name alone could be in any state.'); return; }
    patchEvent(
      parsed.zip ? { venueCity: parsed.zip } : { venueCity: parsed.city, venueState: parsed.state },
      'City noted — weather and the venue check now line up.'
    );
    setCityDraft('');
  };
  // Voice input (Web Speech API) — the browser's own recognizer; nothing fake.
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  // continuous:true (below) means the browser's own endpointer no longer ends
  // the session on a pause — good for not cutting hosts off mid-sentence, but
  // it also means nothing stops a genuinely forgotten open mic. A soft idle
  // timer is the app-level backstop: resets on every real result, only fires
  // after real silence, never mid-sentence.
  const VOICE_IDLE_MS = 20000;
  const voiceIdleTimer = useRef(null);
  const clearVoiceIdleTimer = () => { if (voiceIdleTimer.current) { clearTimeout(voiceIdleTimer.current); voiceIdleTimer.current = null; } };
  const startVoice = () => {
    if (!SpeechRec) { toast('Voice input isn’t available in this browser — type it instead.'); return; }
    try {
      const r = new SpeechRec();
      recogRef.current = r;
      // continuous: true — non-continuous mode ends the session on the browser's
      // OWN first-pause detection (its endpointer), not an app timer; a host
      // pausing mid-sentence ("crab feast for... twenty... in the backyard")
      // was getting cut off before finishing. "tap to stop" only makes sense
      // once the app, not the browser, decides when listening ends.
      r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (ev) => {
        clearVoiceIdleTimer();
        voiceIdleTimer.current = setTimeout(() => { toast('Stopped listening — quiet for a while.'); stopVoice(); }, VOICE_IDLE_MS);
        const text = Array.from(ev.results).map(x => x[0] && x[0].transcript).join(' ').trim();
        if (text) { setSmartText(text); setFType(null); setCreateEdit(null); }
      };
      r.onend = () => { clearVoiceIdleTimer(); setListening(false); };
      r.onerror = () => { clearVoiceIdleTimer(); setListening(false); toast('Couldn’t hear that — try again or type it.'); };
      setListening(true);
      r.start();
      voiceIdleTimer.current = setTimeout(() => { toast('Stopped listening — quiet for a while.'); stopVoice(); }, VOICE_IDLE_MS);
      feedback('act');
    } catch { setListening(false); toast('Voice input didn’t start — type it instead.'); }
  };
  const stopVoice = () => { clearVoiceIdleTimer(); try { recogRef.current && recogRef.current.stop(); } catch {} setListening(false); };
  const [revealed, setRevealed] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // choreography: 0 thinking → 5 done
  const revealTimers = useRef([]);
  const clearRevealTimers = () => { revealTimers.current.forEach(clearTimeout); revealTimers.current = []; };
  useEffect(() => clearRevealTimers, []);
  const [typeOpen, setTypeOpen] = useState(false);   // occasion browser: collapsed until asked
  const [typeQuery, setTypeQuery] = useState('');

  // Type-ahead over the catalog, backed by the REAL alias resolver — "bbq",
  // "crab boil", "40th" all resolve through the taxonomy's own regexes.
  const typeMatches = typeQuery.trim() ? (() => {
    const q = typeQuery.trim().toLowerCase();
    let canon = null;
    try { canon = resolveCanonicalType(typeQuery); } catch { canon = null; }
    const list = HOST_TYPES.filter(t => t.toLowerCase().includes(q));
    if (canon && HOST_TYPES.includes(canon) && !list.includes(canon)) list.unshift(canon);
    return list;
  })() : null;

  const pickType = (t) => {
    setFType(t); setFBudget(null); setTypeOpen(false); setTypeQuery('');
  };

  // Smart parse — extracted to lib/smartParseEvent (single, unit-tested
  // source: every extraction here used to be verifiable only by hand in a
  // live browser tab).
  const parsed = useMemo(() => parseSmartEventText(smartText), [smartText]);

  // Effective values: manual correction wins, then the parse, then the
  // playbook's own typical (host-shell defaulting — never a blank form).
  const effType = fType || parsed.type || null;
  const pbTypical = effType ? playbookTypicalGuests(effType) : null;
  const effGuests = (fGuests ?? parsed.guests) ?? pbTypical;
  const effDate = fDate || parsed.date || '';
  const effName = fName || parsed.honoree || '';
  // A real "in Santa Fe, New Mexico" match pre-fills the town field the same
  // way a typical guest count pre-fills — visible, editable, never silently
  // final until "Put my plan together."
  const effCityText = fCity.trim() || (parsed.venueCity ? (parsed.venueState ? parsed.venueCity + ', ' + parsed.venueState : parsed.venueCity) : '');
  const effBudget = fBudget ?? parsed.budget ?? null;
  const effIsDestination = fIsDestination ?? !!parsed.isDestination;
  const dstatC = eventDateStatus(effDate || null);
  const expectC = expectedFromPlanned(effGuests, effType, (() => { try { return effType ? getPlaybook(effType) : null; } catch { return null; } })());

  // Created events resolve from LIVE state first (the ALL_SAMPLES copy is a
  // load-time snapshot); they store themselves whole, so no patch overlay.
  const base = activeCustom || ALL_SAMPLES.find(e => e.id === eventId) || hydratedEvents.find(e => e.id === eventId) || FALLBACK;
  const event = useMemo(() => ({ ...(base || FALLBACK), ...(activeCustom ? {} : patch) }), [base, patch, activeCustom]);

  // ── Regional price factor (queue item 3) — the production pipeline:
  // getFoodPriceFactor via the API base (BLS regional). State comes ONLY from
  // an explicit ', XX' in venueCity — never guessed. Neutral 1.0 otherwise.
  const [foodPP, setFoodPP] = useState({ priceFactor: 1, priceContext: null });
  useEffect(() => {
    let dead = false;
    const m = /,\s*([A-Za-z]{2})\s*$/.exec(String(event.venueCity || ''));
    const state = (m ? m[1].toUpperCase() : null) || (profile && profile.state ? String(profile.state).toUpperCase() : null);
    if (!isFoodPricesConfigured() || !state) { setFoodPP({ priceFactor: 1, priceContext: null }); return undefined; }
    (async () => {
      try {
        const d = await getFoodPriceFactor({ state });
        if (!dead) setFoodPP({ priceFactor: d.factor || 1, priceContext: d.factor !== 1 ? (d.regionLabel + (d.month ? ' · ' + d.month : '') + ' · ' + d.source) : null });
      } catch { if (!dead) setFoodPP({ priceFactor: 1, priceContext: null }); }
    })();
    return () => { dead = true; };
  }, [event.id, event.venueCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Experience Context (PC-1 canonical): unlocks blockers + continuity ──
  // ── The production profile (ngw-profile — the SAME key the original app +
  // Supabase studio_settings hydrate). Host name signs the drafts,
  // hostIntelligence feeds attendance learning. V2 writes MERGE-ONLY so every
  // production field it doesn't know about survives untouched; the original
  // app's own debounced cloud save picks the changes up next time it runs.
  const [profile, setProfileState] = useState(() => { try { return JSON.parse(localStorage.getItem('ngw-profile')) || null; } catch { return null; } });
  // ── Session (the SAME Supabase client + storage the original app uses —
  // signing in anywhere on this origin signs in everywhere on it).
  const [session, setSession] = useState(null);
  const [hydratedEvents, setHydratedEvents] = useState([]); // real events pulled from cloud that weren't on this device at load
  const [authBusy, setAuthBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    let dead = false;
    // On sign-in, pull the cloud profile (studio_settings) into localStorage +
    // state — cloud wins, so a fresh device inherits the host's real identity.
    const hydrate = () => {
      cloudLoadProfile().then(p => { if (!dead && p) setProfileState(p); }).catch(() => {});
      // Pull cloud events into ngw-events; if any are new to this device, nudge.
      cloudLoadEvents().then(evs => {
        if (dead || !Array.isArray(evs)) return;
        // SYNC-HONESTY-1: a successful cloud pull is real evidence every
        // returned event is in the cloud — stamp them synced. Sign-in is also
        // the moment any writes queued while offline/signed-out become
        // flushable, so retry the queue right here rather than waiting for
        // the 'online' event (which won't fire — the connection never dropped).
        try { markEventSynced(evs.map(e => e && e.id).filter(Boolean)); } catch { /* stamping is best-effort, never blocks hydration */ }
        flushSync().then(res => {
          if (!dead && res && res.flushed > 0) {
            toast(res.flushed + (res.flushed === 1 ? ' change' : ' changes') + ' synced to your account.');
          }
        }).catch(() => {});
        const known = new Set((APP_EVENTS || []).map(e => e && e.id));
        // Events created in THIS shell already live in its own store — their
        // cloud copies must not come back as a second "synced" row. Read the
        // store fresh: sign-in can happen after a creation this session.
        try { (JSON.parse(localStorage.getItem(LS_CUSTOMS)) || []).forEach(e => { if (e && e.id) known.add(e.id); }); } catch { /* unreadable — worst case a duplicate row, never data loss */ }
        const fresh = evs.filter(e => e && e.id && !known.has(e.id)
          && String(e.recordKind || 'host_event') === 'host_event' && !/^demo-/.test(String(e.id)) && String(e.name || '').trim());
        if (fresh.length) setHydratedEvents(fresh);
        // Welcome-gate re-eval (engine-gap NEW-5): shouldShowWelcome was
        // decided ONCE at load, before the cloud could answer — so a signed-in
        // host on a fresh device got welcomed as brand-new. The moment
        // hydration lands anything genuinely theirs (same isRealHostEvent
        // predicate the load-time gate uses), the welcome stands down. The
        // ngw-v2-welcomed flag is left alone: real events, not the flag, end
        // the welcome here — and loadEvents already persisted them locally,
        // so the load-time gate agrees on the next visit.
        if (evs.some(isRealHostEvent)) setWelcome(false);
      }).catch(() => {});
    };
    supabase.auth.getSession().then(({ data }) => {
      const s = data && data.session ? data.session : null;
      if (!dead) { setSession(s); if (s) hydrate(); }
    }).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!dead) { setSession(s || null); if (s) hydrate(); } });
    return () => { dead = true; try { sub && sub.subscription && sub.subscription.unsubscribe(); } catch { /* gone */ } };
  }, []);
  // SYNC-HONESTY-1: when the connection comes back, retry anything queued
  // while offline. installOnlineFlush is a no-op when nothing's queued.
  useEffect(() => installOnlineFlush(res => {
    if (res && res.flushed > 0) toast(res.flushed + (res.flushed === 1 ? ' change' : ' changes') + ' synced to your account.');
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sendMagicLink = async () => {
    const em = authEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('A real email address — the sign-in link goes there.'); return; }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: authRedirectUrl() } });
      if (error) throw error;
      setAuthSent(true);
    } catch { toast('Couldn’t send the link — try again in a minute.'); }
    setAuthBusy(false);
  };

  const patchProfile = (fields, msg) => {
    let next = null;
    try {
      const cur = JSON.parse(localStorage.getItem('ngw-profile')) || {};
      next = { ...cur, ...fields };
      localStorage.setItem('ngw-profile', JSON.stringify(next));
    } catch { next = { ...(profile || {}), ...fields }; }
    setProfileState(next);
    // Push to the cloud when signed in — no longer dependent on the main app's
    // debounced save. Fire-and-forget; saveProfile already wrote localStorage.
    if (next && session) { try { cloudSaveProfile(next); } catch { /* offline — localStorage holds it */ } }
    if (msg) toast(msg);
  };
  const ctx = useMemo(() => { try { return buildExperienceContext(event, profile, 1); } catch { return null; } }, [event, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── THE REAL ENGINE ──
  const plan = useMemo(() => {
    try { return eventPlan(event, ctx); }
    catch (err) { return { _error: String(err), nextActions: [], progress: { done: 0, total: 0 }, handled: [], vendorReadinessRollup: null }; }
  }, [event, ctx]);

  // Blockers (the Reveal's own stage builder, ongoing view), decision board,
  // capacity, helpers, risks, and the wins — all production functions.
  const blockers = useMemo(() => { try { return unresolvedBlockerStages(ctx) || []; } catch { return []; } }, [ctx]);
  const venueBlockerShown = blockers.some(b => /venue/i.test(String(b && b.title || '')));
  useEffect(() => {
    try {
      console.debug('[v2ctx]', event.id, 'ctx:', !!ctx, '· identity:', ctx && ctx.eventIdentity && ctx.eventIdentity.primaryEventType,
        '· blockers:', blockers.length, '· priority:', plan && plan.planningState && plan.planningState.currentPriority, '· compound:', ctx && ctx.compound, '· reasoning:', ctx && ctx.reasoning, '· activeRisks:', ctx && (ctx.activeRisks || []).length);
    } catch {}
  }, [event.id, ctx, blockers, plan]);
  const decisionBoard = useMemo(() => { try { return playbookDecisionBoard(event) || { open: [], locked: [] }; } catch { return { open: [], locked: [] }; } }, [event]);
  const capacity = useMemo(() => { try { return playbookCapacity(event); } catch { return null; } }, [event]);
  // deriveHelperResponsibilities returns { helpers, responsibilities } — the
  // rows we render are the responsibilities (helperName/label/status); the
  // deduped helpers list is the "N helping" people count.
  const helperData = useMemo(() => {
    try { return deriveHelperResponsibilities(event) || { helpers: [], responsibilities: [] }; }
    catch { return { helpers: [], responsibilities: [] }; }
  }, [event]);
  const helpers = helperData.responsibilities || [];
  const helperPeople = helperData.helpers || [];
  const risks = useMemo(() => { try { return playbookRisks(event); } catch { return null; } }, [event]);
  // RECON (2026-07-11): the ONE risk count — exactly the rows the risks sheet
  // renders (ctx.activeRisks, already riskStatus-filtered, + the playbook's
  // authored risks). Quiet index row and the sheet hero both read this, so the
  // number on the way in always equals the rows on arrival.
  const riskCount = ((ctx && ctx.activeRisks) || []).length + ((risks && risks.items) || []).length;
  // The essentials rail (phaseProgress), tight-timeline summary, and the
  // playbook's heart moments — the last of the audit list.
  const phaseCues = useMemo(() => { try { return deriveEventPhaseProgress(event); } catch { return null; } }, [event]);
  const compression = useMemo(() => { try { return deriveEventCompressionSummary(event, daysUntil); } catch { return null; } }, [event]);
  const heartMoments = useMemo(() => { try { return playbookHeartMoments(event) || []; } catch { return []; } }, [event]);
  const crab = useMemo(() => { try { return buildCrabPlan(event); } catch { return { relevant: false }; } }, [event]);
  // DESTINATION-2 slice 1 — the shared travel engine (lib/travelPlan): lodging
  // grid + per-row staleness. relevant:false unless event.isDestination — the
  // same Phase 1 flag the vendor plan and dest_* decisions already read.
  const travel = useMemo(() => { try { return buildTravelPlan(event); } catch { return { relevant: false }; } }, [event]);
  // Sprint 1 seating — the shared engine (lib/seatingPlan, extracted verbatim
  // from the legacy Seating tab): tables are a COUNT, only rsvp==='Yes' guests
  // seat, and there is no per-table capacity in the data — none is shown.
  const seating = useMemo(() => {
    try { return buildSeatingPlan(event); }
    catch { return { enabled: false, hasRoster: false, tableCount: 0, tables: [], confirmed: [], unassigned: [], dietChips: [], totals: { confirmed: 0, seated: 0, unassigned: 0, tableCount: 0, avgPerTable: null, tablesEven: false, allSeated: false } }; }
  }, [event]);
  const rushFactor = useMemo(() => { try { return getRushFactor(event.date); } catch { return { multiplier: 1, label: null, explanation: null }; } }, [event.date]);
  const metroMkt = event.metroMarket ? METRO_MARKETS.find(m => m.id === event.metroMarket) : null;
  const vendorPlan = useMemo(() => {
    try {
      return buildVendorPlan(event, {
        metroFactor: getMetroFactor(event.metroMarket),
        metroLabel: metroMkt ? metroMkt.label : null,
        rush: rushFactor,
      });
    } catch { return { relevant: false, categories: [] }; }
  }, [event, rushFactor, metroMkt]);
  // Captain White's July 2026 reference ladder — from the playbook's verified
  // knowledge. Shown as REFERENCE; a price only counts when the host taps it
  // in (CRAB-PRICING-1 hard rule: no fake market prices).
  const crabLadder = useMemo(() => { try { return crabPriceLadder(); } catch { return null; } }, []);

  // A timeline step counts as handled once real event state proves it, not just when
  // the host taps it — the SAME derive-don't-store predicate the checklist already
  // shows (taskEngine.effectiveDone: date/venue/budget/guest-count/vendor/food-plan),
  // extended with the one signal that needs the live priced spread: a buy/shop step
  // closes once every active line is actually bought. General by subject-matching,
  // not any one label — so a resolved decision drops out of "Coming up" everywhere
  // it applies, the same way it already does in the checklist's "tap to confirm" tag.
  const isTimelineStepResolved = (t) => {
    if (!t) return false;
    try { if (effectiveDone(event, t)) return true; } catch {}
    // DESTINATION-2 slice 3: "Build the arrivals/departures grid" (dest_t_grid)
    // resolves once the grid actually holds real entries — a roster traveler
    // with flight info on the board. Same derive-don't-store predicate as the
    // buy/shop branch below: subject-matched, proven by event state, never a
    // second stored flag. Headcount mode never resolves it (no honest entries).
    if (/arrivals?\s*\/\s*departures/i.test(String(t.task || ''))) {
      try {
        return !!(travel.relevant && travel.rosterMode
          && (travel.air.roster || []).some(r => r.hasFlightInfo));
      } catch { return false; }
    }
    if (/\b(buy|shop)\b|shopping/i.test(String(t.task || ''))) {
      try {
        const fp = playbookFoodPlan(event);
        const active = ((fp && fp.list) || []).filter(it => it && !it.skipped);
        if (!active.length) return false;
        const got = event.foodGot || {};
        return active.every(it => got[it.id] === true);
      } catch { return false; }
    }
    return false;
  };

  // "Coming up" — the human-intelligence layer for CALM states: name what's
  // next and WHEN IT'S DUE even when nothing is urgent. Sources: the decision
  // board's real due dates + undone checklist steps' T-offsets vs the date.
  const upNext = useMemo(() => {
    const out = [];
    try {
      (decisionBoard.open || []).forEach(r => {
        if (r && r.label) out.push({ label: 'Decide: ' + r.label, id: r.id || null, due: r.dueDate || null, days: r.daysOut != null ? r.daysOut : null, kind: 'call' });
      });
    } catch {}
    try {
      (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).forEach(t => {
        const m = /T-(\d+)\s*d/i.exec(String(t.week || ''));
        let due = null, dd = null;
        if (m && event.date) {
          const d0 = new Date(event.date + 'T12:00:00'); d0.setDate(d0.getDate() - parseInt(m[1], 10));
          due = d0.toISOString().slice(0, 10);
          try { dd = daysUntil(due); } catch { dd = null; }
        }
        const dte = (() => { try { return daysUntil(event.date); } catch { return null; } })();
        const status = m ? taskTimeStatus(parseInt(m[1], 10), dte) : 'unknown';
        out.push({ label: t.task, due, days: dd, taskId: t.id, kind: 'step', status });
      });
    } catch {}
    // DESTINATION-2: the group-rate deadline is a real dated obligation while
    // anyone still hasn't booked. Roster mode only — headcount mode has no
    // honest not-booked count (the engine returns null), so no row is claimed.
    try {
      if (travel.relevant && travel.lodging && travel.lodging.deadline && (travel.lodging.notBookedCount || 0) > 0) {
        let dd = null; try { dd = daysUntil(travel.lodging.deadline); } catch { dd = null; }
        out.push({
          label: 'Group rate ends — ' + travel.lodging.notBookedCount + ' of ' + travel.lodging.roster.length + ' haven’t booked a room yet',
          due: travel.lodging.deadline, days: dd, kind: 'lodging',
        });
      }
    } catch {}
    // DESTINATION-2 slice 2: a real ride gap is a dated obligation too — it
    // has to close by the event itself. Roster mode only (headcount mode has
    // no honest rider count), and only while no shuttle covers it: once the
    // dest_transport decision says yes, the gap is handled, not actionable.
    try {
      if (travel.relevant && travel.rosterMode && travel.ground
        && travel.ground.unmatched > 0 && travel.ground.transportProvided !== true) {
        const due = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
        let dd = null; if (due) { try { dd = daysUntil(due); } catch { dd = null; } }
        const n = travel.ground.unmatched;
        out.push({
          label: n === 1 ? '1 person still needs a ride back' : n + ' people still need a ride back',
          due, days: dd, kind: 'ground',
        });
      }
    } catch {}
    // DESTINATION-2 slice 3: a flight that misses part of the day is a dated
    // fact — due on the event itself. One row per conflicting guest, routed to
    // that exact arrivals-board row. Roster mode only; the engine only ever
    // claims a conflict it can read from real dates against the real event date.
    try {
      if (travel.relevant && travel.rosterMode && travel.air
        && (travel.air.conflicts || []).length > 0) {
        const due = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
        let dd = null; if (due) { try { dd = daysUntil(due); } catch { dd = null; } }
        travel.air.conflicts.forEach(c => {
          out.push({
            label: c.type === 'arrives_late'
              ? c.name + '’s flight lands after the day starts'
              : c.name + ' flies out before the day ends',
            due, days: dd, kind: 'air', guestId: c.guestId,
          });
        });
      }
    } catch {}
    return out
      .filter(x => x.days == null || x.days >= 0)
      .sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : 1))
      .slice(0, 3);
  }, [decisionBoard, event, travel]);
  const [crabAdd, setCrabAdd] = useState({ size: 'large', unit: 'dozen', qty: 1, price: '' });
  const [foodTune, setFoodTune] = useState(null); // per-item cost-structure panel
  const [choiceOpen, setChoiceOpen] = useState(null); // re-opened settled choice (auto-collapse)
  // ── T-72h reconfirm sweep ── staged drafting state: {} | {vendorId: 'drafting'|'ready'}
  const [sweepState, setSweepState] = useState({});
  const sweepTimers = useRef([]);
  useEffect(() => () => sweepTimers.current.forEach(clearTimeout), []);
  const [doneOpen, setDoneOpen] = useState(false); // completed-work fold in the checklist
  // Decision memory — capture WHY in the host's own words (lib/decisionMemory);
  // the settled row reads it back next time the subject comes up.
  const [whyOpen, setWhyOpen] = useState(null);
  const [whyText, setWhyText] = useState('');
  const saveWhy = (r) => {
    const text = whyText.trim();
    if (!text) { setWhyOpen(null); return; }
    const rec = makeRecord({
      eventId: event.id, subjectId: r.id, subjectLabel: r.label,
      decision: r.because || 'settled', rationale: text,
    }, new Date().toISOString());
    patchEvent({ decisionMemory: appendDecision(event, rec).decisionMemory },
      'Noted — next time this comes up, your own reasoning comes with it.');
    setWhyOpen(null); setWhyText('');
  };
  // Inline decision settle — ONE write path (event.foodChoices[id]), the same
  // single-source write the food plan's "Your choices" chips and legacy's
  // What-to-settle board use (App.js onSetChoice). The board re-derives from
  // the event on every change, so the row moves open → Settled on its own,
  // and travel/ground (lib/travelPlan transportDecision) read the same answer.
  // decisionMemory is NOT written here — that stays the host's own optional
  // "note why" on the settled row, exactly as before.
  const settleDecision = (r, opt) => {
    patchEvent({ foodChoices: { ...(event.foodChoices || {}), [r.id]: opt } },
      r.label + ': ' + opt + ' — settled.');
    setChoiceOpen(null);
    // A routed focus (Next up's "Decide:", the ground sheet's "Decide it" /
    // "Change the call") has done its job once the pick lands — clear it so
    // the now-settled row doesn't re-open its chips as if still asking.
    setSheet(s => (s && s.focus === r.id ? { ...s, focus: null } : s));
  };
  // Auto-hiding dock (real-device fix: the floating dock overlapped bottom
  // CTAs on tall phones) — hides on scroll-down, returns on scroll-up/top.
  const [dockHidden, setDockHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const onScroll = () => {
      const y = app.scrollTop;
      const delta = y - lastScrollY.current;
      if (y < 40) setDockHidden(false);
      else if (delta > 6) setDockHidden(true);
      else if (delta < -6) setDockHidden(false);
      lastScrollY.current = y;
    };
    app.addEventListener('scroll', onScroll, { passive: true });
    return () => app.removeEventListener('scroll', onScroll);
  }, []);
  const [tuneCost, setTuneCost] = useState(''); // lock-the-cost input in the tune panel
  // Bulk price-lock — parity with legacy's "Use typical prices for the other
  // N items →" (App.js ~11040-11060). ids just locked by the bulk action, kept
  // local (never persisted to the event) so a one-tap undo can unwind exactly
  // those writes without touching anything locked by hand before or after.
  const [bulkPriced, setBulkPriced] = useState(null);
  // Host-authored dish/item — closes the remove/add asymmetry legacy already fixed
  // (App.js ~10538-10570, ~11415-11457): a named line the host commits ("Aunt
  // Carol's potato salad", "extra ice — $15"), owner + cost both optional. Writes
  // the same event.foodAdd shape legacy writes, merged by the shared engine
  // (lib/playbooks/index.js ~2192-2210) — no engine change needed, single source
  // of truth between the two apps.
  const [foodAddOpen, setFoodAddOpen] = useState(false);
  const [foodAddName, setFoodAddName] = useState('');
  const [foodAddOwner, setFoodAddOwner] = useState('');
  const [foodAddCost, setFoodAddCost] = useState('');
  const [foodAddGroup, setFoodAddGroup] = useState(null); // Food/Drinks/Supplies override; null = auto-guess
  const [foodGroupsOpen, setFoodGroupsOpen] = useState({}); // spread accordion
  // Place-intelligence rows (Space sheet) — which one has its inline note
  // field open. Maps each row key to the exact event field
  // derivePlaceIntelligence (lib/placeIntelligence.js) already reads to flip
  // that row from "needs" to "handled" — same fields legacy's Event Details
  // tab writes, so filling one in here keeps both apps' readiness in sync.
  // 'rain' is deliberately absent: it already has a real editor (the rain
  // sheet) and routes there instead of a plain note.
  const [placeNoteOpen, setPlaceNoteOpen] = useState(null);
  const PLACE_NOTE_FIELD = { venue: 'venue', arrival: 'venueAddress', parking: 'parkingNotes', loadIn: 'loadInNotes', contact: 'venueContact', rules: 'houseRules' };
  const [shopStore, setShopStore] = useState(null); // shopping-run mode: 'I'm at X' filter (session-only)
  const [budgetFoldOpen, setBudgetFoldOpen] = useState(false); // budget editor folds once a number exists
  const [foodSect, setFoodSect] = useState({}); // dietary/choices/sourcing folds
  const [showMoreDiets, setShowMoreDiets] = useState(false); // dietary "other" fold (parity: App.js:10850)
  const [dietOtherOpen, setDietOtherOpen] = useState(false); // "+ Other" custom-diet name entry
  const [dietOtherName, setDietOtherName] = useState('');
  // MEANING CAPTURE — the raw fields the engines already read (single truth:
  // dayBefore's protect-the-moment, phaseProgress's moment item, the nudge
  // layer, and doItForMe's toast all DERIVE from these; V2 only writes them).
  const [meaningDraft, setMeaningDraft] = useState(null);
  const openMeaning = () => {
    setMeaningDraft({
      honoree: event.honoree || '',
      honoree_story: event.honoree_story || '',
      meaning_why: event.meaning_why || '',
      feeling_words: event.feeling_words || '',
      must_have_moment: event.must_have_moment || '',
    });
    setSheet({ kind: 'meaning' });
  };
  const hasMeaning = !!(String(event.must_have_moment || '').trim() || String(event.meaning_why || '').trim() || String(event.honoree_story || '').trim());
  const [lessonDraft, setLessonDraft] = useState('');
  // Seed the draft from the saved lesson whenever the event changes (getLesson
  // is the canonical reader; setLesson the writer — 200-char cap lives in lib).
  useEffect(() => { setLessonDraft(getLesson(event)); }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Event memory: the one persisted field the original uses (event.lessons).
  // Recall reads across the loaded events — a past event of the same type.
  const lastLesson = useMemo(() => {
    try {
      // Live created events replace their load-time ALL_SAMPLES snapshots.
      const pool = [...ALL_SAMPLES.filter(e => e && !isCustomEventId(e.id)), ...customs];
      const hit = pool.find(e => e && e.id !== event.id && e.type === event.type && String(e.lessons || '').trim() && isPastEvent(e));
      return hit ? { name: hit.name, lessons: String(hit.lessons).trim() } : null;
    } catch { return null; }
  }, [event.id, event.type, customs]);
  // ROW-LEVEL CTA RULE (Todd): a coming-up item lands on the exact field that
  // answers it — the crab order, the pickers count, the space list — never a
  // sheet top when a closer target exists.
  const routeUpNext = (u) => {
    const t = String(u.label || '');
    if (/pickers|light eaters/i.test(t)) { setSheet({ kind: 'crabs', focus: 'pickers' }); return; }
    if (/crab house|pre-?order|bushel|dozen|steam/i.test(t)) { setSheet({ kind: 'crabs', focus: 'order' }); return; }
    if (/rent or borrow|steamer pot|propane|tables|chairs|canopy/i.test(t)) { setSheet({ kind: 'space' }); return; }
    if (u.kind === 'lodging') { setSheet({ kind: 'lodging', focus: 'deadline' }); return; }
    if (u.kind === 'ground') { setSheet({ kind: 'ground', focus: 'riders' }); return; } // land on the rows that still need a ride
    if (u.kind === 'air') { setSheet({ kind: 'air', focus: u.guestId != null ? u.guestId : null }); return; } // land on the exact conflicted row
    if (u.kind === 'call') { setSheet({ kind: 'decisions', focus: u.id || null }); return; }
    setSheet({ kind: 'tasks', focus: u.taskId || null });
  };

  // ── Weather alerting (modern live-activity pill) ──
  // LIVE when configured: the production pipeline verbatim — geocodeVenue →
  // getEventWeatherRisk (proxy via the API base, or the OpenWeather key).
  // When NOT configured, the labeled sample drives the same engines. NEVER
  // both: a configured app shows live weather or nothing — a fabricated
  // fallback could contradict the real sky.
  const [liveWx, setLiveWx] = useState(null);
  useEffect(() => {
    let dead = false;
    setLiveWx(null);
    (async () => {
      try {
        if (!isWeatherConfigured() || !event.date) return;
        const out = isLikelyOutdoor(event.venue, event.notes);
        const past = isPastEvent(event);
        const d = daysUntil(event.date);
        if (!out || past || d == null || d < 0 || d > 14) return;
        // A bare home word ("Backyard") geocodes to junk — the town is the
        // real locator for at-home events; skip entirely when neither exists.
        const homeish = /^(backyard|back\s?yard|home|house|my place)$/i.test(String(event.venue || '').trim());
        // Appends the state the same way legacy's eventGeoQuery does — a bare
        // city geocode (limit=1) can silently resolve to the wrong same-named
        // city in another state; venueState/profile.state disambiguate it.
        // A ZIP is already unambiguous on its own, no state suffix needed.
        const withState = (city, state) => (city && !/^\d{5}$/.test(city) && state) ? `${city}, ${state}, US` : city;
        const q = withState(String(event.venueCity || '').trim(), String(event.venueState || '').trim())
          || (!homeish ? String(event.venue || '').trim() : '')
          || withState(String((profile && profile.city) || '').trim(), String((profile && profile.state) || '').trim()); // your usual area backs up a bare backyard
        if (!q) return;
        const coords = await geocodeVenue(q);
        if (dead || !coords) return;
        const wxr = await getEventWeatherRisk(coords.lat, coords.lon, event.date);
        if (!dead && wxr) setLiveWx(wxr);
      } catch { /* stay quiet — no forecast beats a wrong one */ }
    })();
    return () => { dead = true; };
  }, [event.id, event.date, event.venue, event.venueCity, event.venueState, event.notes]); // eslint-disable-line react-hooks/exhaustive-deps
  const wx = useMemo(() => {
    if (liveWx) return liveWx;
    if (isWeatherConfigured()) return null; // live mode: real data or nothing
    // Self-contained reads (this memo sits above the shared outdoor/days consts).
    const out = (() => { try { return isLikelyOutdoor(event.venue, event.notes); } catch { return false; } })();
    const past = (() => { try { return isPastEvent(event); } catch { return false; } })();
    const d = (() => { try { return daysUntil(event.date); } catch { return null; } })();
    // Same 14-day boundary as getEventWeatherRisk — no real forecast reaches
    // beyond it, so no alert may exist there either (even a sample one).
    if (!out || past || !event.date || d == null || d < 0 || d > 14) return null;
    return {
      kind: 'rain', risk: 'high', conditions: 'Rain', pop: 70,
      precipitation: 70, // the field weatherLogistics reads (getEventWeatherRisk's name)
      date: event.date,
      summary: 'Rain likely on your event day',
      rainWindow: { startHour: 14, endHour: 18, label: '2 PM\u20136 PM' },
      _sample: true,
    };
  }, [event, liveWx]);
  const wxImpact = useMemo(() => {
    if (!wx) return null;
    try { const im = weatherImpactByEventPhase(event, wx); return im && im.hasImpact ? im : null; } catch { return null; }
  }, [event, wx]);

  // ── Rain notes per audience — pure composition from what's on file (rain
  // plan, date, window, venue). Same facts, three jobs: guests get the call,
  // helpers get the shift, vendors get the question.
  const rainNoteFor = (who) => {
    const when = event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'the day';
    const win = wx && wx.rainWindow && wx.rainWindow.label ? ' — most likely ' + wx.rainWindow.label : '';
    const plan = String(event.rainPlan || '').trim();
    if (who === 'helpers') {
      return {
        subject: 'If the sky turns — ' + (event.name || when),
        body: ['Quick heads-up, crew —', '', 'Rain is in play for ' + when + win + '. If it comes, we shift to: ' + plan + '.',
          'That may mean moving setup earlier or under cover — I’ll text timing the moment it firms up.', '', 'Nothing changes yet. Just wanted you ahead of it.'].join('\n'),
      };
    }
    if (who === 'vendors') {
      return {
        subject: 'Weather heads-up for ' + when + (event.name ? ' — ' + event.name : ''),
        body: ['Hi —', '', 'Watching the forecast for ' + when + ': rain is possible' + win + '. Our backup is ' + plan + '.',
          'Does that change anything on your end — setup spot, cover, timing? Anything you need from us, say the word.', '', 'Thanks so much!'].join('\n'),
      };
    }
    return guestRainMessage(event, wx || null);
  };

  // ── Watch the sky — Notification API opt-in, per event. Fires on CHANGES
  // in live weather only (first read is the baseline; the sample never pings).
  const [wxNotify, setWxNotify] = useState(false);
  const [notifGranted, setNotifGranted] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  useEffect(() => {
    try { setWxNotify(localStorage.getItem('ngw-hostv2-wxnotify-' + event.id) === 'on'); } catch { setWxNotify(false); }
  }, [event.id]);
  const setWxNotifyPref = (on) => {
    setWxNotify(on);
    try { on ? localStorage.setItem('ngw-hostv2-wxnotify-' + event.id, 'on') : localStorage.removeItem('ngw-hostv2-wxnotify-' + event.id); } catch { /* private mode */ }
    if (!on) toast('Standing down — the sky is yours to watch again.');
  };
  const askWxNotify = async () => {
    if (typeof Notification === 'undefined') { toast('This browser can’t send notifications — the pill above stays your watch.'); return; }
    try {
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setNotifGranted(perm === 'granted');
      if (perm === 'granted') { setWxNotifyPref(true); toast('Watching the sky — you’ll get a ping the moment the forecast moves.'); }
      else toast('Notifications are blocked for this site — the weather pill still keeps watch here.');
    } catch { toast('Couldn’t ask for notification permission.'); }
  };
  useEffect(() => {
    if (!wxNotify || !liveWx || !notifGranted) return;
    const bucket = String(liveWx.risk || '') + '|' + (liveWx.rainWindow ? liveWx.rainWindow.label : 'day-level') + '|' + (liveWx.pop != null ? Math.round(Number(liveWx.pop) / 10) : '');
    const seenKey = 'ngw-hostv2-wxseen-' + event.id;
    let last = null; try { last = localStorage.getItem(seenKey); } catch { /* private mode */ }
    if (last === bucket) return;
    try { localStorage.setItem(seenKey, bucket); } catch { /* private mode */ }
    if (last == null) return; // baseline, not news
    try {
      new Notification('The sky moved — ' + (event.name || 'your event'), {
        tag: 'ngw-wx-' + event.id,
        body: (liveWx.summary || 'The forecast changed.')
          + (liveWx.rainWindow && liveWx.rainWindow.label ? ' Most likely ' + liveWx.rainWindow.label + '.' : '')
          + (String(event.rainPlan || '').trim() ? ' Your backup: ' + event.rainPlan + '.' : ' No backup named yet — worth picking one.'),
      });
    } catch { /* notification construction can throw on some platforms */ }
  }, [liveWx, wxNotify, notifGranted, event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [wxOpen, setWxOpen] = useState(false);

  useEffect(() => {
    if (!isCustomEventId(eventId)) { try { localStorage.setItem(LS_PATCH(eventId), JSON.stringify(patch)); } catch {} }
  }, [patch, eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { localStorage.setItem(LS_CUSTOMS, JSON.stringify(customs)); } catch {}
  }, [customs]);
  // Reload lands back where the host was — creation and switching both flow
  // through eventId, so ONE writer covers them.
  useEffect(() => {
    if (eventId) { try { localStorage.setItem(LS_LAST_EVENT, eventId); } catch {} }
  }, [eventId]);
  useEffect(() => { appRef.current?.scrollTo({ top: 0 }); }, [stage, eventId]);

  const switchEvent = (id) => {
    redoEventId.current = null; // moving to another event abandons any pending create correction
    setEventId(id); setHandledOpen(false); setStage('plan'); setEditor(null); setSheet(null); setDayIdx(0);
    if (!isCustomEventId(id)) { try { setPatch(JSON.parse(localStorage.getItem(LS_PATCH(id))) || {}); } catch { setPatch({}); } }
  };

  const toast = (msg, action) => {
    setToastMsg(msg);
    setToastAction(action || null);
    clearTimeout(toastTimer.current);
    // An actionable toast lingers a little longer — the host needs a beat to
    // read it AND decide; a plain notice keeps the original rhythm.
    toastTimer.current = setTimeout(() => { setToastMsg(null); setToastAction(null); }, action ? 6500 : 3400);
  };

  // ── Real lib functions, one per element ──
  const dstat = eventDateStatus(event.date);            // lib/dates — time intelligence
  const days = dstat.days;

  // ── T-72h reconfirm window ── named vendors only; the sweep exists inside
  // the last three days, and closes itself once every vendor has answered.
  const reconfirmables = useMemo(() => (event.vendors || []).filter(v => v && String(v.name || '').trim()), [event]);
  const sweepWindow = days != null && days >= 0 && days <= 3 && reconfirmables.length > 0 && !isPastEvent(event);
  const reconfirmedN = reconfirmables.filter(v => v.reconfirmed72 === true).length;
  const writeVendor = (id, patch, msg) => {
    const vs = (event.vendors || []).map(v => (v && v.id === id) ? { ...v, ...patch } : v);
    patchEvent({ vendors: vs }, msg);
  };
  // WAVE-B write path (a): booking status. The EXACT vocabulary every status
  // read expects (lib/vendorIntelligence header: 'Considering' | 'Quoted' |
  // 'Contracted' | 'Deposit Paid' | 'Confirmed', legacy 'Booked'/'Paid' read
  // as Confirmed). Tap the pill to move it forward — same one-tap cycle as
  // the lodging status rows; wraps back to Considering so a mis-tap is
  // recoverable in four more taps.
  const VENDOR_STATUS_LADDER = ['Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed'];
  const VENDOR_STATUS_MEANING = {
    'Considering': 'you’re still deciding',
    'Quoted': 'they’ve given you a price',
    'Contracted': 'the agreement is signed',
    'Deposit Paid': 'your deposit is in',
    'Confirmed': 'they’re locked in for your date',
  };
  const cycleVendorStatus = (v) => {
    const cur = (v.status === 'Booked' || v.status === 'Paid') ? 'Confirmed' : v.status;
    const next = VENDOR_STATUS_LADDER[(VENDOR_STATUS_LADDER.indexOf(cur) + 1) % VENDOR_STATUS_LADDER.length];
    writeVendor(v.id, { status: next },
      (v.name || v.category || 'This vendor') + ' → ' + next + ' — ' + VENDOR_STATUS_MEANING[next] + '.');
  };
  // WAVE-B write path (c): money. Draft buffer for the "what you agreed to
  // pay" field (commits on blur/Enter, Escape abandons); both money writes use
  // the budget editor's MONEY-MOVE UNDO pattern — snapshot just the field the
  // write changes, one inline restore on the toast. Single-level, in-memory.
  const [vendorCostDraft, setVendorCostDraft] = useState(null); // string | null — only while the field is being edited
  const commitVendorCost = (v) => {
    if (vendorCostDraft === null) return;
    const raw = String(vendorCostDraft).trim();
    setVendorCostDraft(null);
    const n = raw === '' ? '' : Math.max(0, Math.round(Number(raw) || 0));
    if (String(n) === String(v.cost ?? '')) return; // nothing changed — no write, no toast
    const prev = v.cost;
    const name = v.name || v.category || 'This vendor';
    writeVendor(v.id, { cost: n });
    toast(n ? name + ' — ' + fmt(n) + ' agreed. Payment tracking reads it now.' : name + ' — agreed price cleared.', {
      label: 'Undo',
      fn: () => writeVendor(v.id, { cost: prev === undefined ? '' : prev },
        Number(prev) > 0 ? name + ' back to ' + fmt(Number(prev)) + '.' : name + ' — no agreed price on file.'),
    });
  };
  const toggleVendorPaid = (v) => {
    const prev = !!v.balancePaid;
    const name = v.name || v.category || 'This vendor';
    writeVendor(v.id, { balancePaid: !prev });
    toast(!prev ? name + ' marked paid in full — payment reminders stop.' : name + ' marked not fully paid yet — the payment note is back.', {
      label: 'Undo',
      fn: () => writeVendor(v.id, { balancePaid: prev },
        name + (prev ? ' — back to paid in full.' : ' — back to not fully paid.')),
    });
  };
  // ── Vendor Brief (VB2, ported): mint a vendor-facing share link the SAME
  // way legacy's VendorBriefModal does — buildVendorBriefPayload's AUDITED
  // WHITELIST (lib/vendorBrief.js) is the ONLY thing that ever leaves the
  // host's hands; money/ops/private notes never enter the payload. Prefer a
  // short server-resolvable code (mintVendorBriefLink — VB2 Phase 1: the
  // backend rebuilds the brief live, so the link never goes stale); fall back
  // to the legacy frozen base64 snapshot when the API isn't configured or
  // minting fails — sharing must never break because a backend is down. The
  // resulting ?vendor=TOKEN link on THIS origin is caught by main.jsx's own
  // redirect to the one real public brief page (legacy App.js) — no second
  // brief surface is ever rendered here.
  const [vendorBrief, setVendorBrief] = useState(null); // { vendorId, url, qrDataUrl, minting, copied }
  useEffect(() => { setVendorBrief(null); }, [eventId]); // never carry a stale link across an event switch
  const shareVendorBrief = async (v) => {
    setVendorBrief({ vendorId: v.id, url: null, qrDataUrl: null, minting: true, copied: false });
    let code = null;
    try {
      if (isVendorBriefApiConfigured() && event.id && v.id) code = await mintVendorBriefLink(event.id, v.id);
    } catch { code = null; }
    const brief = buildVendorBriefPayload(v, event, ros, profile);
    const token = code || b64encode(JSON.stringify(brief));
    const url = window.location.origin + window.location.pathname + '?vendor=' + token;
    let qr = null;
    try { qr = await QRCode.toDataURL(url, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); } catch { qr = null; }
    setVendorBrief(b => (b && b.vendorId === v.id) ? { vendorId: v.id, url, qrDataUrl: qr, minting: false, copied: false } : b);
  };
  const copyVendorBriefLink = () => {
    if (!vendorBrief || !vendorBrief.url) return;
    navigator.clipboard?.writeText(vendorBrief.url).then(() => {
      setVendorBrief(b => b ? { ...b, copied: true } : b);
      setTimeout(() => setVendorBrief(b => b ? { ...b, copied: false } : b), 2000);
    }).catch(() => toast('Couldn’t copy on this browser — long-press the link to select it.'));
  };
  // HOST-APPROPRIATE-VENDOR-UI: creation adds only category + name — no
  // forced COI/contract/deposit fields. Those tracking fields only ever
  // populate from a later explicit host or engine action, never at creation,
  // so a friend-or-family "vendor" never starts life looking like a paid
  // booking with paperwork due.
  const addVendorCategory = (category, name) => {
    const v = { id: 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), category, name: name || '' };
    patchEvent({ vendors: [...(event.vendors || []), v] }, (name || category) + ' added — open it to add what you know.');
    setSheet(s => ({ ...s, focus: v.id }));
  };
  const runSweepDrafts = () => {
    sweepTimers.current.forEach(clearTimeout); sweepTimers.current = [];
    reconfirmables.forEach((v, i) => {
      if (v.reconfirmed72) return;
      sweepTimers.current.push(setTimeout(() => setSweepState(m => ({ ...m, [v.id]: 'drafting' })), 120 + i * 430));
      sweepTimers.current.push(setTimeout(() => setSweepState(m => ({ ...m, [v.id]: 'ready' })), 520 + i * 430));
    });
  };
  const spend = useMemo(() => {                          // lib/hostSpending — budget single-source
    try { return hostSpending(event, foodPP.priceFactor); } catch { return { total: 0, spent: 0, committed: 0 }; }
  }, [event]);
  const money = { planned: spend.total, committed: spend.committed, spent: spend.spent, lines: Array.isArray(event.budget) ? event.budget.length : 0 };
  // The HOST money breakdown — hostSpending's own plan-priced terms, shared by
  // the Budget sheet and After. NEVER planner category rows (Rule 4): the host
  // model is one number plus where the plan says it's going.
  const hostSpendRows = () => [
    { label: 'Food & drinks', est: spend.foodEstimate || 0, got: spend.foodBought || 0, kind: 'food' },
    { label: 'Supplies', est: spend.suppliesEstimate || 0, got: spend.suppliesBought || 0, kind: 'supplies' },
    ...(spend.hasCapacity ? [{ label: 'Seats, tables & space', est: spend.capacityEstimate || 0, got: spend.capacityBought || 0, kind: 'space' }] : []),
    ...(spend.crabEstimate ? [{ label: 'The crab order', est: spend.crabEstimate || 0, got: spend.crabBought || 0, kind: 'crabs' }] : []),
  ].filter(r => r.est > 0 || r.got > 0);
  const guests = guestNumber(event);
  // lib/attendanceModel — likely turnout, WITH the playbook's own attendance
  // overrides (a crab feast's turnout curve isn't a wedding's).
  const expect = expectedFromPlanned(guests, event.type, (() => { try { return getPlaybook(event.type); } catch { return null; } })());
  const rsvpBy = rsvpDeadlineFor(event);                  // lib/dates — reply-by date
  const actions = plan.nextActions || [];
  const handled = plan.handled || [];
  const rollup = plan.vendorReadinessRollup;

  // "Since you were last here" — lib/returnNarration, the original's exact
  // semantics: derive ONE line from the previous visit's snapshot (30-min gap
  // guard so reloads stay quiet), then stamp the fresh snapshot; the line
  // never re-tells what the hero already says.
  const [returnLine, setReturnLine] = useState(null);
  useEffect(() => {
    try {
      const prev = readReturnSnapshot(event.id);
      const n = deriveReturnNarration(event, prev);
      writeReturnSnapshot(event.id, buildReturnSnapshot(event));
      if (n.shouldShow && !narrationDuplicatesTelling(n.line,
        plan.nextActions && plan.nextActions[0] && plan.nextActions[0].title,
        phaseCues && phaseCues.nextCue && phaseCues.nextCue.label)) {
        setReturnLine(n);
      } else setReturnLine(null);
    } catch { setReturnLine(null); }
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lens, setLens] = useState('all');
  const lensSet = [...new Set(actions.map(a => DOMAIN_LENS[a.domain] || 'Plan'))];
  const show = a => lens === 'all' || (DOMAIN_LENS[a.domain] || 'Plan') === lens;

  // ── Actions that ACT: patch the real event, let the engine recompute ──
  const [editor, setEditor] = useState(null); // which card's inline editor is open
  const [customBudget, setCustomBudget] = useState(''); // host's own number, either surface
  const [guestDraft, setGuestDraft] = useState('');      // in-progress typed guest count, before commit
  const [sheet, setSheet] = useState(null);   // deep-link landing: {kind, focus}
  // ── DESTINATION-2 · Where everyone stays ── the stay-details form is local
  // state seeded from event.lodging each time the sheet opens; ONE explicit
  // save writes the whole card back through patchEvent (one toast, one write).
  // ── Sprint 1 · Who sits where ── tap-a-name-then-tap-a-table: one picked
  // guest held in local state; tapping a table writes the assignment through
  // the pure engine helpers (lib/seatingPlan), patchEvent persists. Rename
  // uses the same field-plus-save pattern as the city row. State resets each
  // time the sheet opens; a deep-linked guest's table starts expanded.
  const [seatPick, setSeatPick] = useState(null);           // guestId waiting for a table
  const [seatOpenTable, setSeatOpenTable] = useState(null); // expanded table number
  const [tableNameDraft, setTableNameDraft] = useState(null); // { num, value }
  const seatingSheetOpen = !!(sheet && sheet.kind === 'seating');
  useEffect(() => {
    if (!seatingSheetOpen) { setSeatPick(null); setSeatOpenTable(null); setTableNameDraft(null); return; }
    const focusG = sheet && sheet.focus != null
      ? (event.guests || []).find(g => g && String(g.id) === String(sheet.focus)) : null;
    setSeatOpenTable(focusG && focusG.table ? Number(focusG.table) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatingSheetOpen, event.id]);
  const seatGuestAt = (g, t) => {
    patchEvent({ guests: assignGuestToTable(event.guests || [], g.id, t.number) },
      (g.name || 'Guest') + ' → ' + t.label + '.');
    setSeatPick(null);
  };
  const unseatGuest = (g) => {
    patchEvent({ guests: unassignGuest(event.guests || [], g.id) },
      (g.name || 'Guest') + ' needs a seat again.');
    setSeatPick(null);
  };
  const stepTableCount = (delta) => {
    const next = clampTableCount(seating.tableCount + delta);
    if (next === seating.tableCount) return;
    // Shrinking can strand people on a table that no longer exists — they come
    // back to the needs-a-seat list in the same write, never invisible.
    let gs = event.guests || [];
    const bumped = gs.filter(g => g && Number(g.table) > next);
    bumped.forEach(g => { gs = unassignGuest(gs, g.id); });
    patchEvent({ tables: next, ...(bumped.length ? { guests: gs } : {}) },
      next + (next === 1 ? ' table' : ' tables') + ' now'
      + (bumped.length ? ' — ' + bumped.length + (bumped.length === 1 ? ' person needs' : ' people need') + ' a seat again' : '') + '.');
  };
  const saveTableName = (num) => {
    const raw = String((tableNameDraft && tableNameDraft.value) || '').trim();
    patchEvent({ tableNames: renameTable(event.tableNames, num, raw) },
      raw ? '“' + raw + '” it is.' : 'Back to “Table ' + num + '”.');
    setTableNameDraft(null);
  };
  const autoSeatByGroup = () => {
    const stillOpen = (gs) => gs.filter(g => g && g.rsvp === 'Yes' && !g.table).length;
    const before = stillOpen(event.guests || []);
    const gs = autoAssignByGroup(event.guests || [], seating.tableCount);
    const placed = before - stillOpen(gs);
    if (!placed) { toast('No one to place automatically — this works from each guest’s group, and nobody waiting has one.'); return; }
    // HONEST: the engine spreads guests one-by-one across tables (legacy
    // behavior, preserved) — it balances the room, it does NOT keep groups
    // together. The toast says what actually happened.
    patchEvent({ guests: gs },
      placed + (placed === 1 ? ' person' : ' people') + ' placed, spread evenly across the tables — groups don’t sit together this way. Tap a name, then a table, to adjust.');
  };
  const [lodgeForm, setLodgeForm] = useState(null);
  const lodgeSheetOpen = !!(sheet && sheet.kind === 'lodging');
  useEffect(() => {
    if (!lodgeSheetOpen) { setLodgeForm(null); return; }
    const lo = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
    const b = Array.isArray(lo.backupOptions) ? lo.backupOptions.filter(Boolean) : [];
    setLodgeForm({
      hotelName: lo.hotelName || '', rate: lo.rate != null ? String(lo.rate) : '',
      code: lo.code || '', deadline: lo.deadline || '',
      b1name: (b[0] && b[0].name) || '', b1note: (b[0] && b[0].note) || '',
      b2name: (b[1] && b[1].name) || '', b2note: (b[1] && b[1].note) || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lodgeSheetOpen, event.id]);
  const saveLodging = () => {
    const f = lodgeForm || {};
    const t = (v) => String(v || '').trim();
    const backups = [
      t(f.b1name) ? { name: t(f.b1name), note: t(f.b1note) || null } : null,
      t(f.b2name) ? { name: t(f.b2name), note: t(f.b2note) || null } : null,
    ].filter(Boolean);
    const rate = parseFloat(f.rate);
    patchEvent({
      lodging: {
        ...((event.lodging && typeof event.lodging === 'object') ? event.lodging : {}),
        hotelName: t(f.hotelName) || null,
        rate: Number.isFinite(rate) && rate > 0 ? rate : null,
        code: t(f.code) || null,
        deadline: t(f.deadline) || null,
        backupOptions: backups,
      },
    }, t(f.hotelName)
      ? 'Stay details saved — guests can get the where-to-stay note now.'
      : 'Stay details saved.');
  };
  // ── DESTINATION-3 · Who pays for what — form state mirrors lodgeForm:
  // seeded from event.costSharing when the sheet opens, cleared on close.
  const [csForm, setCsForm] = useState(null);
  const csSheetOpen = !!(sheet && sheet.kind === 'costshare');
  useEffect(() => {
    if (!csSheetOpen) { setCsForm(null); return; }
    const cs = (event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {};
    setCsForm({
      reason: cs.reason || '', cadence: cs.cadence || '',
      tiers: (Array.isArray(cs.tiers) ? cs.tiers.filter(Boolean) : []).map(t => ({
        label: t.label || '', amount: t.amount != null ? String(t.amount) : '', note: t.note || '',
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csSheetOpen, event.id]);
  const saveCostSharing = () => {
    const f = csForm || {};
    const t = (v) => String(v || '').trim();
    // Unlabeled tiers are dropped on save — same rule as the engine reader
    // (a tier the host can't name isn't a tier yet); amounts stay optional.
    const tiers = (f.tiers || []).map(x => {
      const amt = parseFloat(x.amount);
      return t(x.label)
        ? { label: t(x.label), amount: Number.isFinite(amt) && amt > 0 ? amt : null, note: t(x.note) || null }
        : null;
    }).filter(Boolean);
    patchEvent({
      costSharing: {
        ...((event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {}),
        mode: 'pooled-dues',
        reason: t(f.reason) || null,
        cadence: t(f.cadence) || null,
        tiers,
      },
    }, tiers.length
      ? 'Saved — ' + tiers.length + ' contribution tier' + (tiers.length === 1 ? '' : 's') + ' on record.'
      : 'Saved — add tiers when you know who chips in what.');
  };
  // Tap a roster row → cycle that guest's booking status. EVERY write stamps
  // updatedAt (ms epoch, Date.now() — the clock lib/travelPlan reads): the
  // engine's "just changed" flag depends on it.
  const cycleLodging = (row) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.lodging && typeof tr.lodging === 'object') ? tr.lodging : {};
    const next = nextLodgingStatus(cur.status);
    gs[idx] = { ...gs[idx], travel: { ...tr, lodging: { ...cur, status: next, updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + LODGING_STATUS_LABEL[next] + '.');
  };
  // ── DESTINATION-2 slice 2 · Getting around ── same explicit-save shape as
  // the stay card: local form seeded from event.groundTransport each open,
  // ONE save, one toast. The shuttle call itself is NOT stored here —
  // dest_transport (Phase 1's decision) owns it; this sheet only reads the
  // answer and routes to the real decision row.
  const [groundForm, setGroundForm] = useState(null);
  const groundSheetOpen = !!(sheet && sheet.kind === 'ground');
  useEffect(() => {
    if (!groundSheetOpen) { setGroundForm(null); return; }
    const gt = (event.groundTransport && typeof event.groundTransport === 'object') ? event.groundTransport : {};
    const p = Array.isArray(gt.pickupPoints) ? gt.pickupPoints.filter(Boolean) : [];
    setGroundForm({
      lastReturnNote: gt.lastReturnNote || '',
      p1name: (p[0] && p[0].name) || '', p1note: (p[0] && p[0].note) || '',
      p2name: (p[1] && p[1].name) || '', p2note: (p[1] && p[1].note) || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundSheetOpen, event.id]);
  const saveGround = () => {
    const f = groundForm || {};
    const t = (v) => String(v || '').trim();
    const points = [
      t(f.p1name) ? { name: t(f.p1name), note: t(f.p1note) || null } : null,
      t(f.p2name) ? { name: t(f.p2name), note: t(f.p2note) || null } : null,
    ].filter(Boolean);
    patchEvent({
      groundTransport: {
        ...((event.groundTransport && typeof event.groundTransport === 'object') ? event.groundTransport : {}),
        lastReturnNote: t(f.lastReturnNote) || null,
        pickupPoints: points,
      },
    }, 'Getting-around details saved.');
  };
  // Tap a ride-board row → cycle that guest's plan (not set → renting a car →
  // needs a ride → can offer a ride). EVERY write stamps updatedAt — the
  // engine's "just changed" flag reads it. Seats persist on the sub-object,
  // so a driver who cycles away and back keeps their count.
  const cycleRide = (row) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.ground && typeof tr.ground === 'object') ? tr.ground : {};
    const next = nextRideStatus(rideStatusOf(cur));
    gs[idx] = { ...gs[idx], travel: { ...tr, ground: { ...cur, ...rideFieldsFor(next), updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' → ' + RIDE_STATUS_LABEL[next] + '.');
  };
  const setRideSeats = (row, delta) => {
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (idx < 0) return;
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.ground && typeof tr.ground === 'object') ? tr.ground : {};
    const seats = Math.max(0, Math.round(Number(cur.seats) || 0) + delta);
    gs[idx] = { ...gs[idx], travel: { ...tr, ground: { ...cur, ...rideFieldsFor('offers_ride'), seats, updatedAt: Date.now() } } };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' — ' + (seats === 1 ? '1 seat' : seats + ' seats') + ' offered.');
  };
  // ── DESTINATION-2 slice 3 · Getting here ── same explicit-save shape as the
  // stay card: the airport-options form is local state seeded from
  // event.airportOptions each open (cap 3 — name, code, the honest tradeoff),
  // ONE save, one toast. Air roster rows don't tap-to-cycle — dates and times
  // need real inputs — so a row expands into a small inline editor instead
  // (flightEdit, one open at a time), committed by its own explicit save.
  const [airForm, setAirForm] = useState(null);
  const [flightEdit, setFlightEdit] = useState(null); // { guestId, name, airportCode, arriveDate, arriveTime, departDate, departTime }
  const airSheetOpen = !!(sheet && sheet.kind === 'air');
  useEffect(() => {
    if (!airSheetOpen) { setAirForm(null); setFlightEdit(null); return; }
    const ao = (Array.isArray(event.airportOptions) ? event.airportOptions : []).filter(Boolean);
    const g = (i, k) => (ao[i] && ao[i][k]) || '';
    setAirForm({
      a1name: g(0, 'name'), a1code: g(0, 'code'), a1note: g(0, 'note'),
      a2name: g(1, 'name'), a2code: g(1, 'code'), a2note: g(1, 'note'),
      a3name: g(2, 'name'), a3code: g(2, 'code'), a3note: g(2, 'note'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airSheetOpen, event.id]);
  const saveAirports = () => {
    const f = airForm || {};
    const t = (v) => String(v || '').trim();
    const options = [
      ['a1name', 'a1code', 'a1note'],
      ['a2name', 'a2code', 'a2note'],
      ['a3name', 'a3code', 'a3note'],
    ].map(([n, c, o]) => (t(f[n]) || t(f[c]))
      ? { name: t(f[n]) || null, code: t(f[c]) ? t(f[c]).toUpperCase() : null, note: t(f[o]) || null }
      : null).filter(Boolean);
    patchEvent({ airportOptions: options }, options.length
      ? 'Airport options saved — guests can get the getting-here note now.'
      : 'Airport options saved.');
  };
  // Save an arrivals-board row: clone guests → merge travel.air → stamp
  // updatedAt (ms epoch, Date.now() — the clock lib/travelPlan's "just
  // changed" flag reads) → ONE patchEvent. Empty fields save as null — the
  // board shows "hasn't told us yet", never an invented time.
  const openFlightEdit = (row) => setFlightEdit({
    guestId: row.guestId != null ? row.guestId : null, name: row.name,
    airportCode: row.airportCode || '', arriveDate: row.arriveDate || '', arriveTime: row.arriveTime || '',
    departDate: row.departDate || '', departTime: row.departTime || '',
  });
  const saveFlightEdit = () => {
    const fe = flightEdit; if (!fe) return;
    const t = (v) => String(v || '').trim();
    const gs = (event.guests || []).filter(Boolean).map(g => ({ ...g }));
    const idx = gs.findIndex(g => (fe.guestId != null && g.id === fe.guestId)
      || (fe.guestId == null && String(g.name || '').trim() === fe.name));
    if (idx < 0) { setFlightEdit(null); return; }
    const tr = (gs[idx].travel && typeof gs[idx].travel === 'object') ? gs[idx].travel : {};
    const cur = (tr.air && typeof tr.air === 'object') ? tr.air : {};
    gs[idx] = {
      ...gs[idx],
      travel: {
        ...tr,
        air: {
          ...cur,
          airportCode: t(fe.airportCode) ? t(fe.airportCode).toUpperCase() : null,
          arriveDate: t(fe.arriveDate) || null, arriveTime: t(fe.arriveTime) || null,
          departDate: t(fe.departDate) || null, departTime: t(fe.departTime) || null,
          updatedAt: Date.now(),
        },
      },
    };
    patchEvent({ guests: gs }, (gs[idx].name || 'Guest') + ' — flight info saved.');
    setFlightEdit(null);
  };
  const [spot, setSpot] = useState(null);     // attention system: spotlighted card key
  const spotTimer = useRef(null);
  // FOCUS MODE, prototype-grade: scroll the destination to center, dim the rest,
  // ring the target, release automatically (or on any tap).
  const spotlight = (key) => {
    setSpot(key);
    clearTimeout(spotTimer.current);
    // Linger long enough for a complete read and a decision (host request,
    // 2026-07-08) — a tap anywhere still releases it immediately.
    spotTimer.current = setTimeout(() => setSpot(null), 8000);
    requestAnimationFrame(() => {
      const el = document.getElementById('card-' + key);
      const app = appRef.current;
      if (el && app) {
        // Rect math relative to the scroller, un-scaled by the phone frame's
        // --fit transform (offsetTop resolves against the wrong ancestor here).
        const fit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit')) || 1;
        const delta = (el.getBoundingClientRect().top - app.getBoundingClientRect().top) / fit;
        const top = Math.max(0, app.scrollTop + delta - (app.clientHeight - el.getBoundingClientRect().height / fit) / 2);
        app.scrollTo({ top, behavior: REDUCE_MOTION ? 'instant' : 'smooth' });
      }
    });
  };
  const [dayIdx, setDayIdx] = useState(0);    // The Day: position in the run of show

  // Row-level landings inside the prototype — a route with a real destination
  // here opens the sheet on the exact row, instead of toasting.

  // ONE cultural nudge per surface, where the decision happens (the lib's own
  // timing doctrine) — never ambient on Plan. Dismiss uses the lib's field.
  const nudgeFor = (surface) => {
    let n = null; try { n = eventContextNudge(event, surface); } catch { n = null; }
    if (!n) return null;
    return (
      // flex-wrap + a real min-width floor: at the migrated type scale the two
      // .mini buttons otherwise crush the nudge text into a ~100px column —
      // wrapping drops the button pair onto its own line instead (same fix
      // as .frow's custom-item-name squeeze).
      <div className="later-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <span className="t" style={{ color: 'var(--muted)', fontWeight: 550, fontSize: 'var(--t-row-sub)', minWidth: 200 }}>{n.text}</span>
        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {n.route && <button className="mini" onClick={() => routeSheet(n.route)}>{n.actionLabel || 'Open'}</button>}
          <button className="mini" onClick={() => patchEvent({ contextNudges: { ...(event.contextNudges || {}), [n.id]: 'dismissed' } }, 'Noted.')}>Dismiss</button>
        </span>
      </div>
    );
  };

  const routeSheet = (route) => {
    if (!route || !route.tab) return false;
    if (route.tab === 'Vendors') { setSheet({ kind: 'vendors', focus: route.vendorId || null }); return true; }
    // Sprint 1 seating: legacy readiness items route tab:'Seating' — land on
    // the seating sheet, on the exact guest row when the route names one.
    if (route.tab === 'Seating' || /^seat/.test(String(route.focusField || ''))) {
      setSheet({ kind: 'seating', focus: route.guestId != null ? route.guestId : null });
      return true;
    }
    if (route.tab === 'Budget') { setSheet({ kind: 'budget', focus: null }); return true; }
    if (route.tab === 'Guests') { setSheet({ kind: 'guests', focus: null }); return true; }
    if (route.tab === 'Planning' && (route.foodFocus || /food/i.test(String(route.focusField || '')))) {
      const rowId = /^foodrow-(.+)$/.exec(String(route.focusField || ''));
      setSheet({ kind: 'food', focus: route.foodFocus || (rowId ? rowId[1] : null) }); return true;
    }
    if (route.focusField === 'rain-plan') { setSheet({ kind: 'rain' }); return true; }
    if (route.focusField === 'crab-plan') { setSheet({ kind: 'crabs' }); return true; }
    // DESTINATION-2 slice 2: ground routes land on the exact spot — a guest's
    // ride-board row (guestId) or the riders who still need a way back.
    if (/^ground/.test(String(route.focusField || ''))) {
      setSheet({ kind: 'ground', focus: route.guestId != null ? route.guestId : (route.focusField === 'ground-riders' ? 'riders' : null) });
      return true;
    }
    // DESTINATION-2 slice 3: air routes land on the exact spot — a guest's
    // arrivals-board row (guestId) or the airports card itself.
    if (/^air/.test(String(route.focusField || ''))) {
      setSheet({ kind: 'air', focus: route.guestId != null ? route.guestId : null });
      return true;
    }
    // DESTINATION-2: lodging routes land on the exact spot — a guest's roster
    // row (guestId), the deadline card ('deadline'), or the stay card itself.
    if (route.tab === 'Travel' || /^lodging/.test(String(route.focusField || ''))) {
      setSheet({ kind: 'lodging', focus: route.guestId != null ? route.guestId : (route.focusField === 'lodging-deadline' ? 'deadline' : null) });
      return true;
    }
    if (/^fp-diet/.test(String(route.focusField || ''))) { setSheet({ kind: 'food', focus: 'diet' }); return true; }
    if (/^caprow-/.test(String(route.focusField || ''))) { setSheet({ kind: 'space' }); return true; }
    if (route.tab === 'Planning Tasks' || route.tab === 'Timeline' || route.tab === 'Planning') {
      setSheet({ kind: 'tasks', focus: route.taskId || null }); return true;
    }
    return false;
  };

  // Do-it-for-me: the app's REAL drafting engine (lib/doItForMe), verbatim.
  // Voice: the host's remembered writing personality — applies to every draft
  // until they change it. Deterministic re-shapes only (no fake AI).
  const [draftTone, setDraftTone] = useState(() => { try { return localStorage.getItem('ngw-hostv2-voice') || 'as-written'; } catch { return 'as-written'; } });
  const [draftBody, setDraftBody] = useState(null); // non-null = host's own edit
  useEffect(() => { try { localStorage.setItem('ngw-hostv2-voice', draftTone); } catch {} }, [draftTone]);
  const openDraft = (title, d, queue) => {
    const body = d ? (typeof d === 'string' ? d : [d.subject, d.body].filter(Boolean).join('\n\n')) : '';
    if (!body.trim()) { toast('Nothing to draft yet — add a few more details first.'); return; }
    setDraftBody(null);
    // Optional queue: remaining {title, body, name} items for "message
    // everyone" flows (one separate draft per person, reviewed/sent one at a
    // time through the SAME real handoffs below — never a silent bulk send).
    setSheet({ kind: 'draft', title, body, queue: queue || null });
  };
  const openNextInQueue = () => {
    const q = (sheet && sheet.queue) || [];
    if (!q.length) return;
    const [next, ...rest] = q;
    setDraftBody(null);
    setSheet({ kind: 'draft', title: next.title, body: next.body, queue: rest.length ? rest : null });
  };
  // "Message all helpers", one click: builds ONE personalized draft per
  // deduped helper (their own responsibilities only, via draftHelperConfirm),
  // opens the first, queues the rest. Each still goes through the real
  // send/text/whatsapp/copy handoffs individually — no silent bulk send.
  const startHelperMessages = () => {
    const people = helperData.helpers || [];
    if (!people.length) { toast('No helpers to message yet.'); return; }
    const drafts = people.map(h => {
      const mine = (helperData.responsibilities || []).filter(r => r.helperId === h.id);
      const d = draftHelperConfirm(event, profile, h, mine);
      return { title: 'Confirm with ' + h.name, body: [d.subject, d.body].filter(Boolean).join('\n\n'), name: h.name };
    }).filter(x => x.body.trim());
    if (!drafts.length) { toast('Nothing to draft yet — add a few more details first.'); return; }
    openDraft(drafts[0].title, drafts[0].body, drafts.slice(1));
  };
  // Tone variants are DETERMINISTIC rewrites of the same facts — mechanical
  // tightening/warming, never invented content (no fake AI doctrine).
  const toneBody = (body, tone) => {
    let b = String(body);
    if (tone === 'tighter') {
      const ps = b.split('\n\n');
      if (ps.length <= 2) return b;
      const mid = ps.slice(1, -1).filter(p => p.includes('→') || /:$/m.test(p));
      return [ps[0], ...mid, ps[ps.length - 1]].join('\n\n');
    }
    if (tone === 'warmer') {
      const warm = 'So glad you’ll be part of it.';
      return b.includes(warm) ? b : b + '\n\n' + warm;
    }
    if (tone === 'playful') {
      const lines = b.split('\n');
      if (lines[0] && !/[!?]$/.test(lines[0].trim())) lines[0] = lines[0].replace(/[.。]?\s*$/, '!');
      b = lines.join('\n');
      const kick = 'It’s going to be a good one.';
      return b.includes(kick) ? b : b + '\n\n' + kick;
    }
    if (tone === 'formal') {
      return b
        .replace(/!/g, '.')
        .replace(/\bWe're\b/g, 'We are').replace(/\bwe're\b/g, 'we are')
        .replace(/\bWe’re\b/g, 'We are').replace(/\bwe’re\b/g, 'we are')
        .replace(/\bdon['’]t\b/gi, 'do not').replace(/\bcan['’]t\b/gi, 'cannot')
        .replace(/\bwon['’]t\b/gi, 'will not').replace(/\bI['’]ll\b/g, 'I will')
        .replace(/\byou['’]ll\b/gi, 'you will').replace(/\bwe['’]ll\b/gi, 'we will')
        .replace(/\bit['’]s\b/gi, 'it is').replace(/\bthat['’]s\b/gi, 'that is');
    }
    return b;
  };
  const shownDraft = () => draftBody != null ? draftBody : toneBody(sheet && sheet.body, draftTone);
  const copyDraft = async (body) => {
    try { await navigator.clipboard.writeText(body); toast('Copied — paste it anywhere.'); feedback('act'); }
    catch { toast('Couldn’t copy on this browser — long-press to select it.'); }
  };

  // The self-RSVP invite link — the SAME ?rsvp=CODE mechanic as the original
  // app (every event carries rsvpCode). Guests who open it reply themselves;
  // replies land in the outbox and merge into this roster automatically.
  const inviteLinkUrl = () => window.location.origin + window.location.pathname + '?rsvp=' + encodeURIComponent(event.rsvpCode || event.id);
  // Scan-to-RSVP: the SAME invite link as a QR — for the printed invite, the
  // door sign, the fridge. Dark-on-white regardless of theme (scanners first).
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const showQr = async () => {
    try {
      const data = await QRCode.toDataURL(inviteLinkUrl(), { width: 520, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      setQrDataUrl(data);
      setSheet({ kind: 'qr' });
    } catch { toast('Couldn’t draw the QR — share the link instead.'); }
  };
  const shareInviteLink = async () => {
    const url = inviteLinkUrl();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'You’re invited — ' + (event.name || 'our event'), text: 'You’re invited to ' + (event.name || 'our event') + '. RSVP here: ' + url, url }); return; } catch { /* declined — fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); toast('Invite link copied — anyone who opens it can RSVP themselves, no app needed.'); feedback('act'); }
    catch { toast('Couldn’t copy on this browser — the link ends in ?rsvp=' + (event.rsvpCode || event.id)); }
  };

  // Tasks: toggle done on the SAME timeline the readiness engine reads —
  // catching up genuinely closes the "Catch up on overdue planning" card.
  const toggleTask = (i) => {
    const tl = (event.timeline || []).map((t, ix) => ix === i ? { ...t, done: !t.done } : t);
    const open = tl.filter(t => t && !t.done).length;
    // RAW FEEDS TRUTH, both directions: checking a buy/shop step is the host
    // asserting the purchases happened — write the raw layer (foodGot) so
    // "Still to get", totals, and the day-before brief all agree. Unchecking
    // never un-buys (asymmetric on purpose).
    let extra = {};
    let boughtNote = '';
    if (tl[i].done && /\b(buy|shop)\b|shopping/i.test(String(tl[i].task || ''))) {
      // COST-TRUTH GATE: the bulk shortcut only marks lines that carry a REAL
      // locked cost — unpriced lines stay open and are named, so "spent" never
      // moves on estimates.
      const got = { ...(event.foodGot || {}) };
      let n = 0, unpriced = 0;
      ((foodPlan && foodPlan.list) || []).forEach(it => {
        if (!it || it.skipped || got[it.id]) return;
        if (it.locked != null) { got[it.id] = true; n += 1; } else unpriced += 1;
      });
      if (n > 0) extra = { foodGot: got };
      if (n > 0 || unpriced > 0) {
        boughtNote = (n > 0 ? ' ' + n + ' priced item' + (n === 1 ? '' : 's') + ' marked bought.' : '')
          + (unpriced > 0 ? ' ' + unpriced + ' still need a real price before they can count as bought.' : '');
      }
    }
    patchEvent({ timeline: tl, ...extra },
      (tl[i].done ? 'Done: ' : 'Reopened: ') + String(tl[i].task || '').slice(0, 50) + '… — ' + open + ' still open.' + boughtNote);
  };

  // No timeline yet → draft one from the playbook's REAL task list, honoring
  // its choice-gated tasks (e.g. steam-yourself vs order-steamed).
  const draftTimeline = () => {
    const rows = (() => { try { return playbookChecklist(event) || []; } catch { return []; } })();
    if (!rows.length) { toast(event.date ? 'No playbook checklist for this type.' : 'Set the date first — the checklist works backward from it.'); return; }
    const tasks = rows.map(r => ({ id: r.id, week: r.week || '', task: r.task || '', done: false, owner: '' }));
    patchEvent({ timeline: tasks }, tasks.length + ' tasks drafted — the engine gates them by your choices and works back from the date.');
  };

  // The REAL spread: same food plan hostSpending bills from, sized by the
  // engine's own attendance band for this event.
  const foodPlan = useMemo(() => {
    try { return playbookFoodPlan(event, { priceFactor: foodPP.priceFactor }); } catch { return null; }
  }, [event]);

  // ROW-LEVEL CTA RULE, single source (was duplicated only inside the Budget
  // sheet's render — the After tab's own money summary showed the identical
  // rows as inert, cursor:default divs). Every allocation row lands on the
  // surface that actually prices it, in EITHER place these rows render.
  const supplGroupName = ((foodPlan && foodPlan.groups) || []).find(g => /suppl|paper|setup|gear/i.test(String(g)));
  const GO_SPEND = {
    food: () => setSheet({ kind: 'food' }),
    supplies: () => { if (supplGroupName) setFoodGroupsOpen(m => ({ ...m, [supplGroupName]: true })); setSheet({ kind: 'food' }); },
    space: () => setSheet({ kind: 'space' }),
    crabs: () => setSheet({ kind: 'crabs' }),
  };
  const hostRowsGo = () => hostSpendRows().map(r => ({ ...r, go: GO_SPEND[r.kind] }));

  // The 5 readiness signals — Basics (foundations) + the four pillars the
  // production readiness engine computes: decisions, people, checklist, paperwork.
  const readiness = useMemo(() => { try { return applicableReadinessAxes(event); } catch { return null; } }, [event]);
  const wins = useMemo(() => { try { return positiveAttention(event, readiness) || { items: [] }; } catch { return { items: [] }; } }, [event, readiness]);

  // Rain backup — the weather lib's real outdoor heuristic; the rainPlan field
  // is the same one the app's weather alert and Where & when read.
  const outdoor = (() => { try { return isLikelyOutdoor(event.venue || '', event.notes || ''); } catch { return false; } })();

  // Shopping check-off writes the same foodGot flags the money engine reads —
  // buying an item literally moves real dollars from committed to spent.
  // COST-TRUTH GATE (Todd, 2026-07-08): because "bought" moves money to spent,
  // a line can only be checked once a REAL cost is locked on it (lock-it, a
  // store pick, or $0 for freebies). Checking an unpriced line opens its cost
  // panel instead — an estimate never gets to pose as spend.
  const toggleGot = (it, cost) => {
    const cur = !!(event.foodGot || {})[it.id];
    // Host-added dishes/items are exempt from the gate below — their cost was
    // already committed at add time (event.foodAdd's cost, possibly a real $0
    // for a potluck dish), not a playbook estimate. Matches legacy's identical
    // exemption (App.js ~11172-11175: "&& !i.added").
    if (!cur && it.locked == null && !it.added) {
      setFoodTune(it.id);
      toast('What did ' + (it.short || it.item) + ' actually cost? Set the real price first — bought is real money, not an estimate.');
      return;
    }
    const next = { ...(event.foodGot || {}), [it.id]: !cur };
    let ns = null;
    try { ns = hostSpending({ ...event, foodGot: next }, foodPP.priceFactor).spent; } catch { ns = null; }
    patchEvent({ foodGot: next },
      (cur ? 'Put back ' : 'Bought ') + (it.short || it.item) + ' (' + fmt(cost) + ')' + (ns !== null ? ' — spent is now ' + fmt(ns) + '.' : '.'));
  };
  // Ported from App.js's guessFoodCategory (~10549-10559): auto-categorize a
  // typed item name into Food/Drinks/Supplies + a rough aisle, so a host-added
  // line sorts into the right spread section instead of always landing in
  // "Food". Pure UI-sort helper — no engine dependency, no search list (board
  // ruling), same word lists as legacy so the guess behaves identically in
  // both apps.
  const guessFoodCategory = (nm) => {
    const n = String(nm || '').toLowerCase();
    const has = (...ws) => ws.some((w) => n.includes(w));
    if (has('beer', 'wine', 'soda', ' pop', 'cola', 'water', 'tea', 'coffee', 'juice', 'lemonade', 'cocktail', 'liquor', 'vodka', 'whiskey', 'rum', 'champagne', 'punch', 'cider', 'seltzer', 'kombucha', 'drink')) return { group: 'Drinks', cat: 'beverages' };
    if (has('plate', 'cup', 'napkin', 'fork', 'knife', 'spoon', 'utensil', 'cutlery', 'foil', 'wrap', 'ziploc', 'baggie', 'ice', 'cooler', 'chest', 'tablecloth', 'tent', 'chair', 'table', 'light', 'candle', 'decor', 'balloon', 'trash', 'paper towel', 'charcoal', 'propane', 'lighter', 'sunscreen', 'bug spray', 'tongs', 'skewer', 'platter')) return { group: 'Supplies', cat: 'supplies' };
    if (has('salad', 'slaw', 'corn', 'potato', 'tomato', 'lettuce', 'fruit', 'watermelon', 'berr', 'greens', 'veg', 'onion', 'pepper', 'cucumber')) return { group: 'Food', cat: 'produce' };
    if (has('crab', 'shrimp', 'fish', 'chicken', 'beef', 'pork', 'sausage', 'burger', 'hot dog', 'meat', 'rib', 'steak', 'turkey', 'ham', 'lobster', 'clam', 'oyster', 'bacon', 'wing')) return { group: 'Food', cat: 'proteins' };
    if (has('cheese', 'milk', 'cream', 'yogurt', 'egg', 'dairy', 'butter')) return { group: 'Food', cat: 'dairy' };
    if (has('bread', 'roll', 'bun', 'chip', 'cracker', 'cookie', 'cake', 'pie', 'dessert', 'snack', 'pretzel', 'pasta', 'rice', 'bean', 'sauce', 'condiment', 'oil', 'seasoning', 'spice', 'old bay', 'dip', 'dressing')) return { group: 'Food', cat: 'other' };
    return { group: 'Food', cat: 'other' };
  };
  // Ported from App.js's commitAdd (~10560-10570): writes a new named line to
  // event.foodAdd, which playbookFoodPlan already merges into foodPlan.list —
  // no engine change required. Cost is optional; blank/unparsed stays 0, the
  // honest "no cost yet / they're bringing it" framing (never a fake number).
  const commitFoodAdd = () => {
    const name = foodAddName.trim();
    if (!name) return;
    const id = 'add-' + Date.now().toString(36);
    const guess = guessFoodCategory(name);
    patchEvent({
      foodAdd: [...(event.foodAdd || []), {
        id, name, owner: foodAddOwner.trim(),
        cost: Math.max(0, Math.round(Number(foodAddCost) || 0)),
        group: foodAddGroup || guess.group, cat: guess.cat,
      }],
    }, name + ' added to the plan.');
    setFoodAddName(''); setFoodAddOwner(''); setFoodAddCost(''); setFoodAddGroup(null); setFoodAddOpen(false);
  };

  // Roster quick-add: paste names, one per line — a REAL guest list, which is
  // what unlocks RSVP intelligence, yes-counts, and the drift detector.
  const [rosterText, setRosterText] = useState('');
  const [guestOpen, setGuestOpen] = useState(null); // per-guest detail editor
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  // WAVE-B: invite-rules fold (guests sheet) — the policies the public RSVP
  // page enforces (InviteV2 reads plusOnePolicy/kidsPolicy/collectAddresses;
  // the invite + guest brief drafts read giftWish). Fold-closed by default.
  const [inviteRulesOpen, setInviteRulesOpen] = useState(false);
  // CSV import — the app's own parsers/merge (lib/csvParsers): 7 platforms,
  // email-primary name-fallback matching, preview before anything writes.
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPlatform, setCsvPlatform] = useState('ngw');
  const [csvPreview, setCsvPreview] = useState(null); // {mapped, summary, fileName, platform}
  // Import history — lib/importHistory end to end, persisted PER EVENT (the
  // legacy shell keeps one global list; V2 keys it by event so one event's
  // undo can never restore another event's roster). Key design: the shared
  // GUEST_IMPORT_BATCHES_KEY + ':' + event id.
  const importBatchesKey = GUEST_IMPORT_BATCHES_KEY + ':' + event.id;
  const [importBatches, setImportBatches] = useState(() => loadImportBatches(importBatchesKey));
  const [importsOpen, setImportsOpen] = useState(false);
  useEffect(() => { setImportBatches(loadImportBatches(GUEST_IMPORT_BATCHES_KEY + ':' + event.id)); setImportsOpen(false); }, [event.id]);
  const writeImportBatches = (batches) => {
    // keep state and storage on the same cap so the list shown IS the list kept
    const capped = batches.slice(-MAX_PERSISTED_BATCHES);
    setImportBatches(capped);
    persistImportBatches(capped, importBatchesKey);
  };
  // PLATFORM_LABELS covers 4 of the 7 csvParsers platforms (pre-existing lib
  // drift, flagged there) — fall back to the parser's own label, then the
  // capitalized key, never a blank.
  const importPlatformLabel = (p) => PLATFORM_LABELS[p]
    || (PLATFORMS[p] && PLATFORMS[p].label)
    || (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'CSV');
  const undoLastCsvImport = () => {
    const res = undoLastImportBatch(importBatches);
    if (!res) return;
    writeImportBatches(res.batches);
    patchEvent({ guests: res.snapshot, kidsCount: kidsTotal(res.snapshot) },
      'Import undone — the list is back the way it was before that import.');
  };
  // PII cleanup (engine-gap NEW-3): every batch carries a FULL pre-import
  // roster snapshot (names, emails, phones) purely so undo can restore it.
  // Beyond the write-time cap (MAX_PERSISTED_BATCHES, enforced in
  // writeImportBatches AND persistImportBatches), the host can drop this
  // event's whole trail. Deletes ONLY the per-event key — the legacy shell's
  // global key is not V2's to touch. The guest list itself is untouched.
  const clearImportHistory = () => {
    try { localStorage.removeItem(importBatchesKey); } catch { /* private mode — state still clears */ }
    setImportBatches([]);
    setImportsOpen(false);
    toast('Import history cleared — those snapshots are off this device, and undoing past imports is no longer possible. Your guest list is unchanged.');
  };
  // Export — the shared serializers (lib/csvParsers toCSV/COLUMNS/exportFileSlug
  // + lib/download), with V2's guest fields mapped back to the canonical
  // column keys so the file round-trips through the NGW Native import.
  const exportGuestsCsv = () => {
    const rows = (event.guests || []).map(g => ({
      name: g.name || '', email: g.email || '', phone: g.phone || '',
      group: g.group || '',
      rsvp_status: g.rsvp || 'Pending', // '' means no reply — canonical 'Pending' (the import maps it back)
      meal_preference: g.meal || '', plus_one_name: g.plusOne || '',
      table_number: g.table ?? '', dietary_restrictions: g.needs || '',
      notes: g.partyNotes || '',
    }));
    downloadCSV(exportFileSlug(event.name) + '-guests.csv', toCSV(rows, COLUMNS.guests));
    toast(rows.length + (rows.length === 1 ? ' guest' : ' guests') + ' downloaded — the file re-imports as NGW Native.');
  };
  const exportVendorsCsv = () => {
    // COLUMNS.vendors reads `contact` for the email column; V2's cockpit
    // writes `email` — bridge it, invent nothing else (missing fields export
    // empty, exactly what's tracked).
    const rows = (event.vendors || []).map(v => ({ ...v, contact: v.contact || v.email || '' }));
    downloadCSV(exportFileSlug(event.name) + '-vendors.csv', toCSV(rows, COLUMNS.vendors));
    toast(rows.length + (rows.length === 1 ? ' vendor' : ' vendors') + ' downloaded as a CSV.');
  };
  const onCsvFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        try {
          const canonical = validateRows(transformRows(res.data || [], csvPlatform));
          // Bridge canonical → the guest shape every reader here uses (the
          // original's canonicalToGuest mapping); _valid rides along so
          // applyMerge can filter.
          const ts = Date.now();
          const mapped = canonical.map((r, i) => ({
            id: 'g-csv-' + ts + '-' + i,
            name: r.name || '', group: r.group || '',
            rsvp: r.rsvp_status === 'Pending' ? '' : (r.rsvp_status || ''),
            meal: r.meal_preference || '—', table: r.table_number ?? null,
            plusOne: r.plus_one_name || '', plusOneMeal: '—', kids: 0,
            needs: r.dietary_restrictions || '', email: r.email || '', phone: r.phone || '',
            partyNotes: r.notes || '', giftReceived: false, thankYouSent: false,
            // _warnings rides along for the batch record's honest warnCount;
            // applyMerge strips it (with _valid/_errors) before anything persists.
            _valid: r._valid, _errors: r._errors, _warnings: r._warnings,
          }));
          const summary = computeMergeSummary(event.guests || [], mapped, 'merge');
          // platform pinned at parse time — the batch records what actually parsed
          setCsvPreview({ mapped, summary, fileName: file.name, platform: csvPlatform });
        } catch { toast('That file didn’t read as a guest CSV — check the platform pick.'); }
      },
      error: () => toast('Couldn’t read that file.'),
    });
  };
  const applyCsv = () => {
    if (!csvPreview) return;
    const before = event.guests || [];
    const batchId = newImportBatchId();
    const merged = applyMerge(before, csvPreview.mapped, 'merge', batchId);
    const kidsCount = kidsTotal(merged);
    // Record the batch BEFORE the write lands: id, pre-import snapshot (what
    // undo restores), and the same audit counts the legacy wizard records.
    const audit = computeImportAuditMeta(csvPreview.mapped, csvPreview.summary);
    writeImportBatches([...importBatches, makeImportBatch(batchId, before, {
      ...audit, platform: csvPreview.platform, mergeMode: 'merge',
    })]);
    patchEvent({ guests: merged, kidsCount },
      (csvPreview.summary.willAdd || 0) + ' added · ' + (csvPreview.summary.willUpdate || 0) + ' updated from ' + csvPreview.fileName + ' — replies and needs came along.');
    setCsvPreview(null); setCsvOpen(false);
  };
  const writeGuest = (i, patch, msg) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, ...patch } : g);
    // kidsCount is the ENGINE's portion-skew knob (kids eat ~40% of adult
    // protein) — derive it from the roster so food re-prices automatically.
    const kidsCount = kidsTotal(gs);
    patchEvent({ guests: gs, kidsCount }, msg);
  };
  const removeGuest = (i) => {
    const g = (event.guests || [])[i];
    const gs = (event.guests || []).filter((_, ix) => ix !== i);
    const kidsCount = gs.reduce((t, x) => t + (Number(x && x.kids) || 0), 0);
    patchEvent({ guests: gs, kidsCount }, (g && g.name || 'Guest') + ' removed from the list.');
    setGuestOpen(null);
  };
  const addRoster = () => {
    const names = rosterText.split('\n').map(x => x.trim()).filter(Boolean);
    if (!names.length) return;
    const existing = event.guests || [];
    const add = names.map((name, i) => ({ id: 'g-' + Date.now() + '-' + i, name, rsvp: '' }));
    patchEvent({ guests: [...existing, ...add] },
      names.length + ' name' + (names.length === 1 ? '' : 's') + ' on the list — ' + (existing.length + add.length) + ' total. RSVPs start blank.');
    setRosterText('');
  };

  // Flip one RSVP — writes the same guests array the engine's confirmed-count
  // (and the catering-drift detector) read.
  const toggleRsvp = (i) => {
    const CYCLE = { '': 'Yes', 'Yes': 'No', 'No': 'Maybe', 'Maybe': '' };
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, rsvp: CYCLE[String(g.rsvp || '')] ?? 'Yes' } : g);
    const yes = gs.filter(g => g && g.rsvp === 'Yes').length;
    const now = gs[i].rsvp || 'no reply yet';
    patchEvent({ guests: gs }, (gs[i].name || 'Guest') + ' → ' + now + ' — ' + yes + ' confirmed. Maybes stay pending until they land.');
  };

  // ── Feedback layer: haptic tick on real state changes, the original app's
  // synthesized chime reserved for magic moments. Muted preference persists.
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('ngw-hostv2-muted') === '1'; } catch { return false; } });
  useEffect(() => { setMessageSoundMuted(muted); try { localStorage.setItem('ngw-hostv2-muted', muted ? '1' : '0'); } catch {} }, [muted]);
  // Sound defaults ON, so most hosts never touch the toggle — priming only on
  // that click would leave the AudioContext unresumed for everyone else. Every
  // later chime fires from a timer/async callback, outside the user-gesture
  // window some browsers require to resume audio, so it unlocks silently and
  // forever otherwise. Prime on the app's first tap anywhere instead.
  useEffect(() => {
    const unlock = () => { primeMessageSound(); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);
  // Screen Wake Lock — the device must not sleep while the app is up (above
  // all on The Day: messy-handed hosts can't keep re-unlocking). Re-acquired
  // whenever the tab becomes visible again; released on unmount. No-ops
  // safely where unsupported.
  useEffect(() => {
    let lock = null, dead = false;
    const acquire = async () => {
      try {
        if (!dead && 'wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch { /* low battery or unsupported — the OS wins */ }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { dead = true; document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch {} };
  }, []);

  // DERIVED COMPLETION (domino doctrine): a checklist step whose real-world
  // condition is satisfied completes ITSELF — the host never re-checks what
  // the plan already knows. Conservative matching: only the unambiguous case
  // (shopping steps, once every spread item is bought). Writes timeline.done
  // for real, so every reader (engine readiness, counts, sheets) agrees.
  useEffect(() => {
    try {
      if (!foodPlan || !foodPlan.itemCount || foodPlan.boughtCount < foodPlan.itemCount) return;
      const tl = event.timeline || [];
      const idx = tl.map((t, i) => (t && !t.done && /\b(buy|shop)\b|shopping/i.test(String(t.task || '')) ? i : -1)).filter(i => i >= 0);
      if (!idx.length) return;
      patchEvent({ timeline: tl.map((t, i) => idx.includes(i) ? { ...t, done: true } : t) },
        idx.length + ' shopping step' + (idx.length === 1 ? '' : 's') + ' completed ' + (idx.length === 1 ? 'itself' : 'themselves') + ' — everything on the spread is bought.');
    } catch {}
  }, [foodPlan && foodPlan.boughtCount, foodPlan && foodPlan.itemCount]);

  // Sprint 60.Y PARITY — the ORIGINAL's one chime placement: ring softly when
  // the total inbound-message count across events increases (a message
  // arrived). Skips the first measurement so mount never rings. Identical
  // logic to App.js; V2's reveal/day chimes are additions on top of this.
  const prevInboundCount = useRef(null);
  useEffect(() => {
    const evs = [...ROSTER, ...customs].map(e => (e && e.id) === eventId ? event : e);
    const count = evs.reduce((sum, ev) => sum + ((ev && ev.commClient) || []).filter(m => m && m.direction === 'inbound').length, 0);
    if (prevInboundCount.current !== null && count > prevInboundCount.current) { try { notifyMessageArrival(); } catch {} }
    prevInboundCount.current = count;
  }, [event, customs, eventId]);
  const feedback = (kind) => {
    if (muted) return;
    try { if (navigator.vibrate) navigator.vibrate(kind === 'magic' ? [12, 70, 12] : 10); } catch { /* no haptics */ }
    if (kind === 'magic') { try { playMessageChime(); } catch { /* no audio */ } }
  };

  // SYNC-HONESTY-1: the exact test patchEvent itself uses to decide whether an
  // edit reaches the cloud — a created (custom) event, or a real/hydrated event
  // this device knows about. A pure curated sample (ALL_SAMPLES that isn't also
  // one of those) is never cloud-backed, so a sync-status claim about it would
  // be fiction. Reused verbatim for the settings sheet's per-event status row.
  const eventIsSyncable = !!activeCustom || REAL_EVENTS.some(e => e.id === eventId) || hydratedEvents.some(e => e.id === eventId);
  const patchEvent = (obj, msg) => {
    if (activeCustom) setCustoms(list => list.map(c => {
      if (!c || c.id !== eventId) return c;
      const next = { ...c, ...obj };
      // Created events sync exactly like real ones (same session gate, same
      // full-event shape, same silent-offline behavior as the branch below).
      // SYNC-HONESTY-1: the old catch{} swallowed the result — no way to tell
      // a real cloud success from a queued/failed write. recordSaveResult
      // stamps or records honestly so the settings sheet can tell the truth.
      if (session) { cloudSaveEvent(next).then(res => recordSaveResult(next, res)).catch(() => {}); }
      return next;
    }));
    else setPatch(p => {
      const nextPatch = { ...p, ...obj };
      // Real-event edits persist to the cloud (superset merge, never drops a
      // base field). Session-gated; sample/demo events stay local-only.
      const realBase = REAL_EVENTS.find(e => e.id === eventId) || hydratedEvents.find(e => e.id === eventId);
      if (session && realBase) {
        const savedEv = { ...realBase, ...nextPatch };
        cloudSaveEvent(savedEv).then(res => recordSaveResult(savedEv, res)).catch(() => {});
      }
      return nextPatch;
    });
    feedback('act');
    if (msg) toast(msg);
  };

  // ── Guest replies land here. TWO sources, ONE merge (the ORIGINAL's
  // name-match rules: exact → last+first(≥3) → first-only(≥4)):
  //   1. the local outbox (ngw-rsvp-queue-<eventId>) — same-browser replies
  //   2. the backend (fetchEventRsvps) — replies DELIVERED from other devices;
  //      without this pull a successfully-delivered reply never reaches this
  //      roster (audit find 2026-07-08: delivery success made replies vanish).
  // THE single merge (lib/guestMerge) — extracted from App.js + this file's
  // former inline copy; both apps now consume one implementation.
  const announceReplies = (gs, n, yesCount) => {
    if (!n) return;
    const kidsCount = kidsTotal(gs);
    patchEvent({ guests: gs, kidsCount },
      n + (n === 1 ? ' reply' : ' replies') + ' came in from your invite link' + (yesCount ? ' — ' + yesCount + ' yes' : '') + '. The count just updated.');
  };
  useEffect(() => {
    try {
      const key = 'ngw-rsvp-queue-' + event.id;
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(raw) || !raw.length) return;
      const queue = purgeStaleOutbox(raw);
      if (!queue.length) { localStorage.removeItem(key); return; }
      const { guests: gs, merged, added, yesCount } = mergeGuestReplies(event.guests || [], queue);
      localStorage.removeItem(key);
      announceReplies(gs, merged + added, yesCount);
    } catch { /* queue unreadable — leave it for the original app */ }
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isRsvpApiConfigured()) return undefined;
    let dead = false;
    (async () => {
      try {
        const rows = await fetchEventRsvps(event.id);
        if (dead || !rows.length) return;
        // Server snake_case → the merge's field names (production's normalize).
        const subs = rows.map(r => ({
          name: r.guest_name, rsvp: r.rsvp, meal: r.meal, needs: r.needs,
          plusOne: r.plus_one, plusOneMeal: r.plus_one_meal, plusOneNeeds: r.plus_one_needs,
          kids: r.kids, note: r.note, idempotencyKey: r.idempotency_key,
        }));
        const { guests: gs, merged, added, yesCount } = mergeGuestReplies(event.guests || [], subs);
        if (!dead) announceReplies(gs, merged + added, yesCount);
      } catch { /* offline or unauthorized — the local queue path still works */ }
    })();
    return () => { dead = true; };
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Which engine actions have a real in-place edit here. Everything else stays an
  // honest route toast — never a button that pretends.
  const wiredKind = (a) => {
    if (['date', 'guests', 'budget', 'food'].includes(a.domain)) return a.domain;
    // Engine top actions carry their CATEGORY as domain ('start', 'readiness'…);
    // recognize them by their real deep-link target or category.
    // SPECIFIC deep-link targets first — category fallbacks LAST. (The rain
    // essential arrives under the 'readiness' category; mapping the whole
    // category to budget put the budget editor on the rain card.)
    const f = (a.route && a.route.focusField) || '';
    if (f === 'rain-plan' || /rain backup/i.test(a.title || '')) return 'rain';
    if (f === 'event-date') return 'date';
    if (f === 'guests-entry') return 'guests';
    if (/dietary|allerg/i.test(a.title || '') || /^fp-diet/.test(f)) return 'diet';
    if ((a.route && a.route.foodFocus) || f === 'food-plan') return 'food';
    if (/catering count/i.test(a.title || '')) return 'count';
    if (/final (guest|catering) count|confirm .*(guest|catering) count/i.test(a.title || '')) return 'lockcount';
    if (f === 'hsp-budget' || (a.domain === 'readiness' && /budget/i.test(a.title || ''))) return 'budget';
    if (a.domain === 'start') return 'guests';
    return null;
  };

  const onCta = (a, key) => {
    const kind = wiredKind(a);
    if (kind) { setEditor(key); spotlight(key); return; }
    if (/chase|rsvp/i.test(String(a.cta || '') + ' ' + String(a.title || ''))) { setSheet({ kind: 'guests' }); return; }
    if (routeSheet(a.route)) return;
    const dest = describeRoute(a.route);
    toast(dest ? 'Not wired here yet — in the app this opens: ' + dest : 'Not wired here yet.');
  };

  const setGuests = (n) => patchEvent({ guestEstimate: n }, 'Planning around ' + n + ' now — the plan just recomputed.');

  // Inline editors, one per wired kind. Each writes the SAME fields the engine's
  // done-conditions read (_eventFoundationActions), so closing a gap closes the card.
  const renderEditor = (a) => {
    const kind = wiredKind(a);
    if (kind === 'guests') {
      const counted = event.guestMode === 'count';
      const guestN = Number(guests) || 0;
      const commitDraft = () => {
        const n = parseInt(guestDraft, 10);
        if (n > 0) setGuests(n);
        setGuestDraft('');
      };
      const bump = (delta) => { setGuestDraft(''); setGuests(Math.max(1, guestN + delta)); };
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          {/* exact-number entry: a +/- stepper plus a typed field, for hosts
              who already know their count instead of picking a nearby preset */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="mini" onClick={() => bump(-1)} aria-label="Fewer guests">−</button>
            <input className="field" style={{ width: 72, textAlign: 'center', fontSize: 'var(--t-input)', padding: '10px 6px' }}
              type="number" inputMode="numeric" min="1"
              value={guestDraft !== '' ? guestDraft : (guestN || '')}
              onFocus={() => setGuestDraft(String(guestN || ''))}
              onChange={e => setGuestDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitDraft(); else if (e.key === 'Escape') setGuestDraft(''); }}
              onBlur={commitDraft}
              aria-label="Exact guest count" />
            <button className="mini" onClick={() => bump(1)} aria-label="More guests">+</button>
            <span className="of">guests</span>
          </div>
          <div className="chips hc-row" style={{ margin: 0 }}>
            {[30, 50, 60, 75, 90, 120].map(n => (
              <button key={n} className="chip" aria-pressed={guests === n} onClick={() => { setGuestDraft(''); setGuests(n); }}>{n}</button>
            ))}
          </div>
          <div className="chips hc-row" style={{ margin: 0 }}>
            <button className="chip" onClick={() => openDraft('Your invite', draftInvite(event, profile, { rsvpUrl: inviteLinkUrl() }))}>Use the invite we wrote</button>
            {/* a confirmed-headcount event doesn't get pushed toward a roster —
                the mode chips below make the choice explicit instead */}
            {!counted && <button className="chip" onClick={() => setSheet({ kind: 'guests' })}>Start a real list</button>}
            <button className="chip" aria-pressed={counted}
              onClick={() => patchEvent({ guestMode: 'count' }, 'Headcount event — food and seats size to the number; replies optional.')}>By headcount</button>
            <button className="chip" aria-pressed={!counted && event.guestMode === 'list'}
              onClick={() => { patchEvent({ guestMode: 'list' }, 'Guest-list event — the roster drives the count.'); setSheet({ kind: 'guests' }); }}>By guest list</button>
          </div>
        </div>
      );
    }
    if (kind === 'rain') return rainEditorBlock();
    if (kind === 'diet') {
      // The ENGINE's dietary model: dietCounts adds a real priced veg main and
      // flags related lines; dietaryNoted closes the cue (headcount events).
      const dc = event.dietCounts || {};
      const DIETS = DIET_TAGS;
      const setD = (k, delta) => {
        const n = Math.max(0, (Number(dc[k]) || 0) + delta);
        patchEvent({ dietCounts: { ...dc, [k]: n } },
          n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
      };
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          {DIETS.map(k => (
            <div className="line" key={k} style={{ padding: '5px 0' }}>
              <span>{k}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="mini" onClick={() => setD(k, -1)} aria-label={'Fewer ' + k}>−</button>
                <span className="of" style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, color: 'var(--ink-soft)' }}>{Number(dc[k]) || 0}</span>
                <button className="mini" onClick={() => setD(k, 1)} aria-label={'More ' + k}>+</button>
              </span>
            </div>
          ))}
          <div className="actions-row" style={{ marginTop: 6 }}>
            <button className="cta" onClick={() => patchEvent({ dietaryNoted: true }, 'Dietary needs noted — the menu is good to go.')}>That’s everyone — noted</button>
          </div>
          <p className="grounding" style={{ margin: 0 }}>
            Vegetarian and vegan counts add a real, priced main to the spread; the others flag which lines to double-check. Counts live on the plan — change them anytime.
          </p>
        </div>
      );
    }
    if (kind === 'lockcount') {
      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
      const planned = guests || 0;
      const confirmedAt = event.guestMode === 'count' ? Number(event.guestCount) || 0 : 0;
      if (confirmedAt > 0) {
        return (
          <div className="chips hc-row">
            <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>Confirmed at {confirmedAt}</span>
            <button className="chip" onClick={() => patchEvent({ guestCount: '' }, 'Count reopened — settle it when the maybes answer.')}>Reopen the count</button>
            <button className="chip" onClick={() => { patchEvent({ guestMode: 'list' }, 'Switched to a guest list — the roster drives the count now.'); setSheet({ kind: 'guests' }); }}>Switch to a guest list</button>
          </div>
        );
      }
      return (
        <div className="chips hc-row">
          {yes > 0 && (
            <button className="chip" onClick={() => patchEvent({ guestCount: yes, guestMode: 'count' }, 'Count set at ' + yes + ' — your confirmed yeses. Food and seats now size to it.')}>
              Set it at {yes} — confirmed yeses
            </button>
          )}
          {planned > 0 && planned !== yes && (
            <button className="chip" onClick={() => patchEvent({ guestCount: planned, guestMode: 'count' }, 'Count set at ' + planned + ' — the number you planned around.')}>
              Set it at {planned} — as planned
            </button>
          )}
          <button className="chip" onClick={() => setSheet({ kind: 'guests' })}>Check the list first</button>
        </div>
      );
    }
    if (kind === 'budget') return budgetEditorBlock();
    if (kind === 'date') return (
      <div className="hc-row">
        <input className="field" type="date" defaultValue={event.date || ''} aria-label="Event date"
          onChange={e => {
            const v = e.target.value;
            if (!v) return;
            // DATE-GUARDRAIL: a malformed value (stray keystrokes, a corrupted
            // paste, a broken segment in the native picker) can otherwise write
            // straight through to event.date and render as "739158d ago" with
            // no sanity check. eventDateStatus is the one shared time-intelligence
            // source — reuse its own blocking verdict instead of a second rule.
            const check = eventDateStatus(v);
            if (check.blocking) { toast(check.reason || "That date doesn't look right — check it."); return; }
            patchEvent({ date: v }, 'Date set — every countdown in the plan just moved.');
          }} />
      </div>
    );
    if (kind === 'food') {
      const FOOD_SOURCING_OPTS = [['We’ll cook it', 'host cooks'], ['A caterer handles it', 'caterer'], ['Potluck', 'potluck']];
      const picked = (event.foodChoices || {}).sourcing;
      // AUTO-COLLAPSE, same doctrine as the food sheet's "Your choices" list
      // (choiceOpen, keyed 'sourcing' here): a made choice folds to its settled
      // line instead of leaving all 3 options sitting there looking unanswered.
      if (picked && choiceOpen !== 'sourcing') {
        const pickedLabel = (FOOD_SOURCING_OPTS.find(([, v]) => v === picked) || [])[0] || picked;
        return (
          <div className="chips hc-row">
            <div className="line" style={{ flex: '1 0 100%', alignItems: 'center' }}>
              <span className="of" style={{ color: 'var(--ok)', fontWeight: 600 }}>{pickedLabel}</span>
              <button className="mini" onClick={() => setChoiceOpen('sourcing')}>change</button>
            </div>
            {foodPlan && (
              <button className="chip" onClick={() => setSheet({ kind: 'food' })}>Open the spread ({foodPlan.itemCount} items)</button>
            )}
          </div>
        );
      }
      return (
        <div className="chips hc-row">
          {FOOD_SOURCING_OPTS.map(([label, val]) => (
            <button key={val} className="chip" aria-pressed={picked === val}
              onClick={() => {
                patchEvent({ foodChoices: { ...(event.foodChoices || {}), sourcing: val } },
                  'Food planned: ' + label.toLowerCase() + ' — the plan just recomputed.');
                setChoiceOpen(null);
              }}>{label}</button>
          ))}
          {foodPlan && (
            <button className="chip" onClick={() => setSheet({ kind: 'food' })}>Open the spread ({foodPlan.itemCount} items)</button>
          )}
        </div>
      );
    }
    if (kind === 'count') {
      // The engine's condition: catererCount must equal CONFIRMED yeses, not the
      // planned number — so only that choice actually closes the card (its
      // underlying action stops being generated once they match, per
      // CommandCenter's catererDrift check). "Hold anyway" deliberately keeps
      // flagging it — that's a real choice, not a bug, but it looked identical
      // to "unanswered" with no settled state at all. Same AUTO-COLLAPSE
      // doctrine as the other editors here now applies: once a count is on
      // file, fold to a line showing it (green if it now matches, amber if
      // the host chose to hold anyway) instead of leaving both chips sitting
      // there looking unclicked.
      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
      const held = event.catererCount;
      if ((held || held === 0) && choiceOpen !== 'catererCount') {
        const matches = held === yes;
        return (
          <div className="chips hc-row">
            <div className="line" style={{ flex: '1 0 100%', alignItems: 'center' }}>
              <span className="of" style={{ color: matches ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 }}>
                {matches ? 'Matches confirmed — ' + held : 'Held at ' + held + ' · ' + yes + ' confirmed'}
              </span>
              <button className="mini" onClick={() => setChoiceOpen('catererCount')}>change</button>
            </div>
          </div>
        );
      }
      return (
        <div className="chips hc-row">
          <button className="chip" onClick={() => {
            patchEvent({ catererCount: yes }, 'Caterer set to the ' + yes + ' confirmed yeses — the mismatch is closed.');
            setChoiceOpen(null);
          }}>
            Match confirmed yeses ({yes})
          </button>
          <button className="chip" onClick={() => {
            patchEvent({ catererCount: guests }, 'Caterer told ' + guests + ' — the engine keeps flagging this until RSVPs catch up.');
            setChoiceOpen(null);
          }}>
            Hold {guests} plates anyway
          </button>
        </div>
      );
    }
    return null;
  };


  // Rain editor — shared by the engine card editor AND the rain sheet, so
  // every route to rain-plan lands on the same real controls.
  const rainEditorBlock = () => {
    let suggested = null;
      try { suggested = suggestRainPlan(event); } catch { suggested = null; }
      // The moment a backup is written, show the host the guest-facing copy
      // and the send options (share sheet / text / WhatsApp) — no dead-end toast.
      const showGuestNote = (planText) => {
        setTimeout(() => {
          try { openDraft('Rain note to guests', guestRainMessage({ ...event, rainPlan: planText }, wx)); } catch {}
        }, 350);
      };
      let authored = null;
      try {
        // The engine's OWN wet-weather matcher (single point of truth); the wx
        // arg is only the lookup key — no forecast is claimed here.
        const hit = playbookContingencyForWeather(event, { kind: 'rain', risk: 'possible' });
        authored = hit ? hit.plan : null;
      } catch { authored = null; }
      // Strip a leading "the" before re-prefixing — some event types are
      // already named "The Cookout"/"The ___", and "The " + "the cookout"
      // doubled up into "The the cookout move".
      const typeLower = String(event.type || '').toLowerCase().replace(/^the\s+/, '');
      return (
        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="actions-row" style={{ marginTop: 0 }}>
            {suggested && (
              <button className="cta"
                onClick={() => { patchEvent({ rainPlan: suggested }, 'Backup written for you — tuned to where you’re hosting.'); showGuestNote(suggested); }}>
                Do it for me
              </button>
            )}
            {authored && (
              <button className="cta soft"
                onClick={() => { patchEvent({ rainPlan: authored }, 'The ' + typeLower + ' move it is.'); showGuestNote(authored); }}>
                The {typeLower} move
              </button>
            )}
          </div>
          <div className="chips">
            {['Tent on standby', 'Carport / garage', 'Move it indoors', 'Rain or shine'].map(p => (
              <button key={p} className="chip" aria-pressed={event.rainPlan === p}
                onClick={() => { patchEvent({ rainPlan: p }, 'Rain backup set: ' + p + ' — the day-of view knows.'); showGuestNote(p); }}>{p}</button>
            ))}
          </div>
          {suggested && <p className="grounding" style={{ margin: 0 }}>“Do it for me”: “{suggested.slice(0, 110)}…”</p>}
        </div>
      );

  };
  // Budget editor — shared by the action-card editor AND the Budget sheet, so a
  // set budget stays changeable forever (three options = the estimator's real
  // low / mid / high; custom numbers split across the same real shares).
  const budgetEditorBlock = () => {
    const est = estimateTotalRange({ type: event.type, guestCount: guests, date: event.date, timeOfDay: event.timeOfDay, isDestination: !!event.isDestination });
    // HOST MODEL: one number (event.totalBudget). Offered three ways — the
    // estimator's real low/mid/high as Lean / Typical / All-out chips (host
    // request, 2026-07-08), a custom number, and the range as a hint.
    const opts = est
      ? [...new Set([est.lowTotal, Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100, est.highTotal])]
      : [];
    const OPT_LABELS = ['Lean', 'Typical', 'All-out'];
    const setB = (n) => {
      setCustomBudget('');
      // MONEY-MOVE UNDO: snapshot just the field this write changes, offer one
      // inline restore on the toast. Single-level, in-memory — not a history.
      const prev = event.totalBudget;
      patchEvent({ totalBudget: n });
      toast('Budget set to ' + fmt(n), {
        label: 'Undo',
        fn: () => patchEvent({ totalBudget: prev === undefined ? '' : prev },
          Number(prev) > 0 ? 'Budget back to ' + fmt(Number(prev)) + '.' : 'Budget cleared — no number set.'),
      });
    };
    const customN = parseInt(customBudget, 10) || 0;
    return (
      <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        {opts.length > 0 && (
          <div className="chips">
            {opts.map((n, idx) => (
              <button key={n} className="chip" aria-pressed={money.planned === n} onClick={() => setB(n)}>
                {opts.length === 3 ? OPT_LABELS[idx] + ' · ' : ''}{fmt(n)}
              </button>
            ))}
          </div>
        )}
        {/* Honest disclosure (engine-gap NEW-2): the estimator says when the
            destination blend actually MOVED the band (destinationAdjusted) —
            same signal production's BudgetEstimateHint discloses. Shown only
            when true; never a guess. */}
        {est && est.destinationAdjusted && (
          <p className="grounding" style={{ margin: 0 }}>
            These ranges run wider because guests are traveling in — travel-scale costs are part of the numbers.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ maxWidth: 170, fontSize: 'var(--t-input)', padding: '10px 14px' }}
            type="number" inputMode="numeric" min="0" placeholder="Your own number"
            value={customBudget} onChange={e => setCustomBudget(e.target.value)}
            aria-label="Custom budget amount" />
          <button className="cta" disabled={customN <= 0} style={customN <= 0 ? { opacity: .45 } : undefined}
            onClick={() => setB(customN)}>Use it</button>
        </div>
        <p className="grounding" style={{ margin: 0 }}>
          {est ? `For ${guests} at a ${String(event.type).toLowerCase()}: lean runs about ${fmt(est.lowTotal)}, all-out about ${fmt(est.highTotal)} — typical lands near ${fmt(Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100)}.` : ''} One number is all you need — the plan works out the rest, and you can change it anytime.
        </p>
      </div>
    );
  };

  // Day-before plan — lib/dayBefore, date-gated (0–2 days out). Pure and real:
  // set an event's date to tomorrow and this materializes.
  const dayBefore = useMemo(() => {
    try { return buildDayBeforePlan(event); } catch { return { applicable: false }; }
  }, [event]);

  // ── Create: build a REAL event object and hand it to the engine ──
  const assemble = () => {
    if (!effType) { toast('Tell me the occasion first — type it or pick it.'); return; }
    // Host-shell creation: playbook-typical count when unsaid, home venueKind
    // detection, universal playbook tasks drafted immediately, guestMode
    // 'count' (a headcount event until a roster starts), budget left to the
    // engine's own domino.
    const short = effType.replace(' Party', '');
    // A recognized milestone ("80th birthday") rides into the name so it isn't
    // silently dropped — never a new standalone field, just the same name the
    // event would otherwise get, made specific.
    const milestoneName = parsed.milestone ? parsed.milestone[0].toUpperCase() + parsed.milestone.slice(1) + ' ' + short : short;
    // Every created event gets its own id (and invite code) — creating another
    // one appends to the store, it never overwrites what came before. The one
    // exception: "Change an answer" corrections keep the id they're fixing.
    const redoId = redoEventId.current; redoEventId.current = null;
    const newId = redoId || mintEventId();
    const ev = {
      id: newId, rsvpCode: newId,
      createdAt: new Date().toISOString(), // overdue-on-creation fix: the board needs to know the runway existed
      name: effName ? effName + '’s ' + milestoneName : 'My ' + milestoneName,
      honoree: effName || '',
      type: effType, date: effDate || '', venue: parsed.venue || '', venueKind: parsed.venueKind || '',
      ...((() => {
        // Same strict city/state-or-ZIP gate as the other venueCity writers —
        // this is event CREATION, so a bare city typed here would otherwise
        // slip past every later check (needsCity only fires on an EMPTY city).
        const p = effCityText.trim() ? parseVenueLocation(effCityText.trim()) : null;
        if (!p) return { venueCity: '' };
        return p.zip ? { venueCity: p.zip } : { venueCity: p.city, venueState: p.state };
      })()),
      guestMode: 'count',
      guestEstimate: effGuests || '',
      totalBudget: effBudget || '',
      isDestination: effIsDestination,
      budget: [],
      guests: [], vendors: [], timeline: [],
    };
    // Canonical checklist over the real event object (date-relative offsets,
    // choice/caterer gates). No date yet → honestly empty; drafts later.
    try { ev.timeline = (playbookChecklist(ev) || []).map(r => ({ id: r.id, week: r.week || '', task: r.task || '', done: false, owner: '' })); } catch {}
    setCustoms(list => list.some(c => c && c.id === newId) ? list.map(c => (c && c.id === newId) ? ev : c) : [...list, ev]);
    setEventId(newId); setRevealed(true);
    // Signed-in hosts' created events reach the account right away — the same
    // cloudSaveEvent path/shape every real-event edit uses. SYNC-HONESTY-1:
    // record the real result instead of swallowing it.
    if (session) { cloudSaveEvent(ev).then(res => recordSaveResult(ev, res)).catch(() => {}); }
    // The Reveal, choreographed around the PRODUCTION reveal stages
    // (buildAssembleRevealStages): identity, blockers, domains, risks.
    clearRevealTimers();
    let lineCount = 4;
    try { lineCount = Math.min((buildAssembleRevealStages(ev, revealIdentityFor(ev), profile, 1) || []).length, 5) + 1; } catch { /* default */ }
    if (REDUCE_MOTION) { setRevealStep(lineCount + 2); return; }
    setRevealStep(0);
    for (let i = 0; i < lineCount; i++) {
      revealTimers.current.push(setTimeout(() => setRevealStep(i + 1), 550 + 650 * i));
    }
    revealTimers.current.push(setTimeout(() => setRevealStep(lineCount + 1), 550 + 650 * lineCount + 350));
    revealTimers.current.push(setTimeout(() => { setRevealStep(lineCount + 2); feedback('magic'); }, 550 + 650 * lineCount + 950));
  };
  // The REAL identity classifier via ctx (audit fix: the old stub hardcoded
  // confidence .8 / isCompound false — compound events got a false single-
  // identity reveal). One ctx build serves identity, stages, and eventPlan.
  const revealIdentityFor = (ev) => {
    try { return buildExperienceContext(ev, profile, 1).eventIdentity; }
    catch { return { primaryEventType: (ev && ev.type) || 'Event', secondaryEventTypes: [], isCompound: false, complexity: 'standard', ceremonyComponents: [], participants: [], confidence: 0 }; }
  };
  // Production reveal stages for the created event — identity, blockers,
  // planning domains (with real $), risk preview.
  const revealStages = useMemo(() => {
    if (!revealed || !activeCustom) return [];
    try { return (buildAssembleRevealStages(activeCustom, revealIdentityFor(activeCustom), profile, 1) || []).slice(0, 5); }
    catch { return []; }
  }, [revealed, activeCustom]);
  const revealLineCount = revealStages.length + 1;
  const revealEyebrow = revealStep > revealLineCount ? 'Here’s what we understood'
    : ['Reading your answers…', 'Sizing the crowd…', 'Pricing the spread…', 'Lining up your steps…'][Math.min(Math.max(revealStep - 1, 0), 3)];
  const customPlan = useMemo(() => {
    if (!revealed || !activeCustom) return null;
    try { return eventPlan(activeCustom, buildExperienceContext(activeCustom, profile, 1)); } catch { return null; }
  }, [revealed, activeCustom]);

  // Run of show — the app's single source: playbook-derived (tracks the event's
  // time of day), a stored ros only when the host has taken ownership.
  const ros = useMemo(() => { try { return effectiveRos(event) || []; } catch { return Array.isArray(event.ros) ? event.ros : []; } }, [event]);
  // WAVE-B: the ONE ros writer — legacy's exact shape (App.js:43393 setRos):
  // snapshot effectiveRos with the edit applied, and set rosEdited: true so
  // the stored schedule wins from now on (effectiveRos only honors event.ros
  // once the host has taken ownership; without the flag a playbook event
  // silently ignores the stored copy). Per-cue time/owner only — done state
  // stays in event.rosDone, untouched.
  const writeRosCue = (cueId, patch, msg) => {
    if (!cueId) return; // an id-less legacy row can't be targeted safely — stay read-only
    const next = ros.map(r => (r && r.id === cueId) ? { ...r, ...patch } : r);
    patchEvent({ ros: next, rosEdited: true }, msg);
  };
  const isPast = isPastEvent(event);                      // lib/closeoutIntel — tense authority
  // DAY-OF resume: entering The Day on the day itself picks up at the first
  // cue not already done (event.rosDone persists across reloads — the same
  // per-cue flag the production app writes; effectiveRos overlays it).
  useEffect(() => {
    if (stage !== 'day' || days !== 0) return;
    const first = ros.findIndex(r => r && !r.done);
    setDayIdx(first === -1 ? ros.length : first);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LIVE DAY (original parity, App.js:34368 semantics): a real wall-clock
  // ticks every 30s and the NOW cue is DERIVED from the current minute — the
  // first open cue at/after now, else the first open cue. The host never taps
  // to find their place; marking done simply re-derives the next NOW.
  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  useEffect(() => {
    if (stage !== 'day' || days !== 0) return undefined;
    const tick = () => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [stage, days]);
  // Cue-time math honoring BOTH stored forms — 24h "14:00" and 12h "2:00 PM"
  // (the original's toMins; parsing 12h as 24h creates the 3 AM-cookout bug).
  const cueMins = (t) => parseMin(t); // lib/dayAlerts — one time parser (12h+24h)
  const rosState = useMemo(() => { try { return classifyRos(ros); } catch { return ros.length ? 'timed' : 'empty'; } }, [ros]);
  const liveDay = stage === 'day' && days === 0 && rosState === 'timed';
  const openCues = useMemo(() => ros.filter(r => r && !r.done), [ros]);
  const nowCue = liveDay
    ? (openCues.find(r => { const m = cueMins(r.time); return m !== null && m >= nowMin; }) || openCues[0] || null)
    : null;
  const nowActive = !!(nowCue && (() => { const m = cueMins(nowCue.time); return m !== null && m <= nowMin; })());
  // EVERY open cue stays visible (original renders the full timeline): the
  // list is chronological and includes behind-schedule cues, marked honestly.
  const cuesAfterNow = nowCue ? openCues.filter(c => c !== nowCue) : [];
  const dayAllDone = liveDay && ros.length > 0 && openCues.length === 0;
  const dayStarted = ros.some(r => r && (r.done || (() => { const m = cueMins(r.time); return m !== null && m <= nowMin; })()));
  // The alert stack — the SAME engine the production app reads (lib/dayAlerts,
  // extracted from App.js so both shells agree). nowMin keeps it current.
  const dayAlerts = useMemo(() => {
    if (days !== 0) return [];
    try { return computeDayAlerts(event) || []; } catch { return []; }
  }, [event, days, nowMin]); // eslint-disable-line react-hooks/exhaustive-deps
  const alertSheet = (a) => {
    const to = String(a.navTo || '');
    const vm = /^(?:ov|confirm|pay)-(.+)$/.exec(String(a.id || ''));
    if (/arrivals|vendors/i.test(to)) { setSheet({ kind: 'vendors', focus: vm ? vm[1] : null }); return; }
    if (/guests/i.test(to)) { setSheet({ kind: 'guests' }); return; }
    if (/task/i.test(to)) { setSheet({ kind: 'tasks', focus: null }); return; }
    if (/communication/i.test(to)) { toast('Approvals live in the app’s messages — not wired here yet.'); return; }
    // Event Day Schedule → we're already looking at it.
  };
  // Handled whispers — ONLY facts the data proves (original Focus semantics).
  const dayWhispers = useMemo(() => {
    if (!liveDay) return [];
    const w = [];
    const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
    if (yes > 0) w.push(yes + ' confirmed');
    else if (guests) w.push('planned for ' + guests);
    if (foodPlan && foodPlan.itemCount > 0 && foodPlan.boughtCount >= foodPlan.itemCount) w.push('food shopped');
    if (money.planned && money.committed <= money.planned) w.push('budget on plan');
    if (outdoor && String(event.rainPlan || '').trim()) w.push('rain backup set');
    return w.slice(0, 4);
  }, [liveDay, event, foodPlan, money.planned, money.committed, outdoor, guests]);
  // Who's helping — DERIVED people (ros owners + arriving confirmed vendors),
  // never a CRM. Caterer rows drop when the host is cooking (original rule).
  // RULED (parity audit): dayHelpers is V2-only day-crew intelligence with no
  // lib equivalent; graduation should extract it INTO a lib rather than the
  // shell re-deriving. Kept here deliberately until then.
  const dayHelpers = useMemo(() => {
    // Computed any day (the print sheet needs it too); the live view is just
    // one of its readers.
    const out = []; const seen = new Set();
    for (const r of ros) {
      const o = String((r && r.owner) || '').trim();
      if (!o || /^(host|you|me|everyone|all)$/i.test(o)) continue;
      const k = o.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const cues = ros.filter(x => String((x && x.owner) || '').trim().toLowerCase() === k);
      out.push({ name: o, role: cues.slice(0, 2).map(c => c.segment).join(' · ').slice(0, 64), time: cues[0] && cues[0].time });
    }
    let cooking = false; try { cooking = hostIsCooking(event); } catch { cooking = false; }
    for (const v of (event.vendors || [])) {
      if (!v || !v.name || !v.arrivalTime) continue;
      if (!['Confirmed', 'Contracted', 'Deposit Paid'].includes(v.status)) continue;
      if (cooking && /cater/i.test(String(v.category || ''))) continue;
      if (seen.has(String(v.name).toLowerCase())) continue;
      let coi = null; try { coi = getVendorCOIState(v, event); } catch { coi = null; }
      out.push({ name: v.name, role: v.category || 'vendor', time: v.arrivalTime, coi });
    }
    return out;
  }, [ros, event]);

  // Schedule collisions on the day (rosOverlap — pairwise interval overlaps).
  const rosOverlaps = useMemo(() => { try { return rosOverlapCount(ros) || 0; } catch { return 0; } }, [ros]);

  // Micro-motion: hero + tile numbers settle in rather than snapping. Held
  // until the splash leaves (audit finding: unheld, this completes under
  // the opaque splash and the daily-boot reveal is invisible every day) —
  // so the numbers actually animate in as part of the fade handoff.
  const revealReady = splash !== 'up';
  const daysAnim = useCountUp(typeof days === 'number' ? Math.abs(days) : null, 650, revealReady);
  const doneAnim = useCountUp(plan.progress.done, 450, revealReady);
  const gAnim = useCountUp(guests || 0, 650, revealReady);
  const bAnim = useCountUp(money.planned || 0, 650, revealReady);

  // ══════════ FIRST-RUN WELCOME ══════════
  // A top-level gate, not a parallel shell: the same frame, one screen, two
  // exits — both land in the existing shell (the Create smart input, or the
  // sample event exactly as it behaves today). No appbar, no dock: nothing to
  // wander into before the one decision this screen asks for.
  if (welcome) {
    return (
      <div className="stagewrap">
        {/* inert while the splash covers the screen: closes the AT-path tap-
            through — a screen reader user could otherwise swipe onto and
            activate welcome/dashboard controls that are invisible to them
            under an opaque splash. Lifted the instant it starts fading, same
            moment sighted users get their first real look. */}
        <div className="app" id="app" inert={splash !== 'gone'}>
          {/* splash-hold: the welcome stagger stays paused at frame one while
              the boot splash is up; the class drops the instant the splash
              starts fading, so the lines begin as it dissolves — one sequence. */}
          <div className={'content welcome' + (splash === 'up' ? ' splash-hold' : '')}>
            <section>
              <div className="eyebrow">Welcome to Event Boss</div>
              {/* The one serif display moment — production's hero face. The
                  sentence's own period IS the brand bead: the same mark that
                  just dropped in on the splash, landed in the headline. */}
              <h1 className="mega welcome-h1">
                The whole event, one&nbsp;plan<span className="welcome-dot" aria-hidden="true" />
              </h1>
              <p className="mega-sub" style={{ fontWeight: 550 }}>
                Tell Event Boss what you’re hosting — a cookout, a shower, a crab feast — and get a plan built around you: guests, food, budget, the whole day.
              </p>
              <div className="welcome-ctas">
                <button className="cta big" onClick={() => dismissWelcome('create')}>Start my event</button>
                <button className="cta ghost" onClick={() => dismissWelcome()}>Explore a sample event first</button>
              </div>
              <p className="grounding" style={{ marginTop: 14 }}>
                The sample is a fully stocked example — nothing in it is yours. Your own event starts fresh from Create, anytime.
              </p>
            </section>
          </div>
        </div>
        {splashEl}
      </div>
    );
  }

  return (
    <div className="stagewrap">
      <div className={'app' + (stage === 'day' ? ' dark-stage' : '')} id="app" ref={appRef} inert={splash !== 'gone'}>
        {/* dash-hold: same mechanism as .welcome.splash-hold — any one-shot
            entrance animation in here (sweepcard's cardin, etc.) pauses at
            frame one while the splash is up and releases the instant it
            starts fading, instead of completing invisibly underneath it. */}
        <div className={'content' + (splash === 'up' ? ' dash-hold' : '')}>
          <div className="appbar">
            <div>
              <div className="wordmark">Event Boss<span className="wm-dot" aria-hidden="true" /></div>
              <div className="appbar-note">V2 preview</div>
            </div>
            {/* Reimagined (host request: header felt crammed on mobile) — the
                event-switcher pill used to sit HERE, truncating the event name
                to "Retirement P…" while the masthead two lines below already
                showed it in full. Same control, one less redundant pill:
                the masthead's own event-type badge (below) is now the tap
                target that opens the events sheet, so the appbar only carries
                the two things that actually live here — sound + profile. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Header carries ONE control (host request 2026-07-11): the
                  account icon. Sound moved into the You & your account sheet. */}
              <button className="sheet-x wm-you" onClick={() => setSheet({ kind: 'settings' })} aria-label="You and your account">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" />
                </svg>
              </button>
            </div>
          </div>

          {/* ══════════ CREATE ══════════ */}
          {stage === 'create' && (
            <section>
              {!revealed ? (
                /* Modernized create moment (host request 2026-07-11): the prompt
                   is a vertically centered display moment while the screen is
                   blank; the instant the host types, the stage collapses to the
                   top and the recognition flow takes over. */
                <div className={'create-stage' + (smartText.trim() === '' ? ' centered' : '')}>
                  <div className="eyebrow">New event</div>
                  <h1 className="mega create-prompt">What are we planning?</h1>
                  <p className="mega-sub" style={{ fontWeight: 550, color: 'var(--muted)' }}>
                    Say it like you’d text a friend — I’ll take it from there.
                  </p>
                  <div className="create-inputrow">
                    <input
                      className="field"
                      placeholder={listening ? 'Listening…' : 'Try: crab feast for 20, Aug 2'}
                      value={smartText}
                      onChange={e => { setSmartText(e.target.value); setFType(null); setCreateEdit(null); }}
                      aria-label="Describe your event"
                    />
                    <button className="cta soft" style={listening ? { background: 'var(--warn-tint)', color: 'var(--warn)' } : undefined}
                      onClick={() => listening ? stopVoice() : startVoice()} aria-pressed={listening} aria-label="Speak it instead">
                      {listening ? 'Listening… tap to stop' : 'Say it'}
                    </button>
                  </div>
                  {smartText.trim() === '' && (
                    /* Empty state: one honest what-you-get line, no example
                       chips (host ruling 2026-07-11 — the prompt stands alone). */
                    <p className="grounding" style={{ marginTop: 18, maxWidth: '36ch' }}>
                      A real plan — guests, food, budget, the day. Change anything.
                    </p>
                  )}
                  {smartText.trim() !== '' && (
                    <>
                      {/* Recognition chips — what was understood; tap to correct. */}
                      <div className="chips" style={{ marginTop: 14 }}>
                        <button className="chip" aria-pressed={!!effType}
                          onClick={() => { setCreateEdit(createEdit === 'type' ? null : 'type'); setTypeOpen(true); setTypeQuery(''); }}>
                          {effType ? effType.replace(' Party', '') : 'Which occasion?'}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'count' ? null : 'count')}>
                          {effGuests ? '~' + effGuests + (fGuests == null && parsed.guests == null ? ' · typical' : '') : 'How many?'}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'date' ? null : 'date')}>
                          {effDate ? new Date(effDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (parsed.monthYear ? parsed.monthYear.label + ' · pick a day' : 'No date yet')}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'name' ? null : 'name')}>
                          {effName ? 'For ' + effName : 'Who’s it for?'}
                        </button>
                        {parsed.venue ? <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>{parsed.venue}</span> : null}
                        <button className="chip" aria-pressed={!!effCityText} onClick={() => setCreateEdit(createEdit === 'city' ? null : 'city')}>
                          {effCityText || 'Which town?'}
                        </button>
                        <button className="chip" aria-pressed={!!effBudget} onClick={() => setCreateEdit(createEdit === 'budget' ? null : 'budget')}>
                          {effBudget ? '$' + effBudget.toLocaleString() + (fBudget == null && parsed.budget != null ? ' · heard' : '') : 'Budget?'}
                        </button>
                        <button className="chip" aria-pressed={effIsDestination} onClick={() => setFIsDestination(!effIsDestination)}>
                          {effIsDestination ? 'Destination event' + (fIsDestination == null ? ' · heard' : '') : 'Local event'}
                        </button>
                      </div>
                      {(createEdit === 'type' || !effType) && (
                        <div className="typebrowser" style={{ marginTop: 12 }}>
                          <input
                            className="field" style={{ maxWidth: 'none' }}
                            placeholder="Search occasions — bbq, boil, sweet 16…"
                            value={typeQuery}
                            onChange={e => setTypeQuery(e.target.value)}
                            aria-label="Search occasions"
                          />
                          {typeMatches ? (
                            <div className="chips" style={{ marginTop: 12 }}>
                              {typeMatches.length
                                ? typeMatches.map(t => (
                                  <button key={t} className="chip" aria-pressed={effType === t} onClick={() => { pickType(t); setCreateEdit(null); }}>{t.replace(' Party', '')}</button>
                                ))
                                : <p className="grounding">Nothing matches — “bbq”, “boil”, and “get together” all work.</p>}
                            </div>
                          ) : (
                            TYPE_GROUPS.map(([group, list]) => (
                              <div key={group} className="shelf-wrap">
                                <div className="shelf-label">{group}</div>
                                <div className="shelf">
                                  {list.map(t => (
                                    <button key={t} className="chip" aria-pressed={effType === t} onClick={() => { pickType(t); setCreateEdit(null); }}>{t.replace(' Party', '')}</button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {createEdit === 'count' && (
                        <div className="chips hc-row">
                          {[10, 18, 30, 50, 75, 120].map(n => (
                            <button key={n} className="chip" aria-pressed={effGuests === n} onClick={() => { setFGuests(n); setCreateEdit(null); }}>~{n}</button>
                          ))}
                        </div>
                      )}
                      {createEdit === 'date' && (
                        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          {parsed.monthYear && !fDate && (() => {
                            // A month + year is a real signal, but never precise enough to
                            // commit alone — same principle as the type/count pickers:
                            // offer real OPTIONS (Saturdays, the usual day for a
                            // celebration) rather than guessing one day silently.
                            const { year, month, label } = parsed.monthYear;
                            const sats = [];
                            const d = new Date(year, month, 1);
                            while (d.getMonth() === month) {
                              if (d.getDay() === 6) sats.push(d.toISOString().slice(0, 10));
                              d.setDate(d.getDate() + 1);
                            }
                            return (
                              <>
                                <p className="grounding" style={{ margin: '0 0 2px' }}>Got {label} — pick a Saturday, or set the exact day below.</p>
                                <div className="chips">
                                  {sats.map(s => (
                                    <button key={s} className="chip" onClick={() => setFDate(s)}>
                                      {new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                          <input className="field" type="date" value={effDate} onChange={e => setFDate(e.target.value)} aria-label="Event date" />
                          {effDate && dstatC.status !== 'ok' && (
                            <p className="grounding" style={dstatC.blocking ? { color: 'var(--danger)' } : { color: 'var(--warn)' }}>{dstatC.reason}</p>
                          )}
                        </div>
                      )}
                      {createEdit === 'name' && (
                        <div className="hc-row">
                          <input className="field" placeholder="Who’s it for?" value={effName} onChange={e => setFName(e.target.value)} aria-label="Who is it for" />
                        </div>
                      )}
                      {createEdit === 'city' && (
                        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          <input className="field" placeholder="Annapolis · Silver Spring, MD · 21401"
                            value={fCity || effCityText} onChange={e => setFCity(e.target.value)} aria-label="Town or ZIP" />
                          <p className="grounding" style={{ margin: 0 }}>The town is how weather and maps find a backyard — it rides into the plan from day one.</p>
                        </div>
                      )}
                      {createEdit === 'budget' && (
                        <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          <input className="field" type="number" min="0" placeholder="Total budget"
                            value={fBudget ?? (parsed.budget ?? '')}
                            onChange={e => setFBudget(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0))}
                            aria-label="Total budget" />
                        </div>
                      )}
                      {effType && (
                        <div style={{ marginTop: 26 }}>
                          <button className="cta big" onClick={assemble}
                            disabled={!!effDate && dstatC.blocking}
                            style={effDate && dstatC.blocking ? { opacity: .45, cursor: 'not-allowed' } : undefined}>
                            Put my plan together
                          </button>
                          <p className="grounding" style={{ marginTop: 10 }}>
                            {effGuests ? `Planning around ${effGuests}${fGuests == null && parsed.guests == null ? ' (the ' + effType.replace(' Party', '').toLowerCase() + ' typical)' : ''}` : ''}
                            {expectC ? ` — likely ${expectC.low}–${expectC.high} make it.` : ''}
                            {!effDate ? ' No date yet is fine — the plan will ask.' : ''}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Full-screen ceremonial takeover (host request 2026-07-11 —
                   see styles.css for the why). SAME data as before, kept
                   verbatim per the host's explicit "I want the listing
                   back": every stage line, why/nextDecision, identity
                   statement, grounding line, both CTAs — only the frame
                   around them changed. */
                <div className="reveal-stage">
                  <div className="reveal-inner">
                    <div className="eyebrow" aria-live="polite">{revealEyebrow}</div>
                    <ul className="tick-list" style={{ marginTop: 22 }}>
                      {revealStages.map((st, i) => (
                        <li key={st.key || i} className={'rv-line' + (revealStep > i ? ' in' : '')}>
                          <strong>{st.title}:</strong> {st.what}{st.why ? <span style={{ color: 'var(--muted)' }}> {st.why}</span> : null}
                          {st.nextDecision && <span className="grounding" style={{ display: 'block', marginTop: 3 }}>{st.nextDecision}</span>}
                        </li>
                      ))}
                      {customPlan && (
                        <li className={'rv-line' + (revealStep > revealStages.length ? ' in' : '')}><strong>{customPlan.nextActions.length} step{customPlan.nextActions.length === 1 ? '' : 's'}</strong> waiting in your plan, lined up in the order they’ll matter.</li>
                      )}
                    </ul>
                    {/* The name lands LAST — the conclusion the plan reached, not a header.
                        Its period is the same locked bead as the boot splash: it drops in
                        and ignites once the name has landed — the same mark, twice. */}
                    <h1 className={'mega title-drop' + (revealStep > revealLineCount ? ' in' : '')} style={{ fontFamily: 'var(--serif)', fontWeight: 800, fontSize: 'var(--t-display-l)', lineHeight: 1.1, letterSpacing: '-.015em', marginTop: 6, color: '#eef0f4' }}>{activeCustom?.name}<span className="reveal-dot" aria-hidden="true" /></h1>
                    {/* identityStatement() — the production identity engine, verbatim */}
                    <p className={'mega-sub pre' + (revealStep > revealLineCount ? ' in' : '')} style={{ marginTop: 8, color: '#9aa7b2' }}>{identityStatement(activeCustom)}</p>
                    <p className={'grounding pre' + (revealStep > revealLineCount + 1 ? ' in' : '')}>All of this came straight from your answers — nothing made up.</p>
                    <div className={'actions-row pre' + (revealStep > revealLineCount + 1 ? ' in' : '')} style={{ marginTop: 24 }}>
                      <button className={'cta big' + (revealStep > revealLineCount + 1 ? ' glow-once' : '')} onClick={() => setStage('plan')}>Open your plan</button>
                      <button className="cta soft" style={{ padding: '13px 22px', borderRadius: 13 }} onClick={() => { clearRevealTimers(); redoEventId.current = activeCustom ? activeCustom.id : null; setRevealed(false); }}>Change an answer</button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ══════════ PLAN ══════════ */}
          {stage === 'plan' && (
            <section>
              {/* Event switching lives in the app-bar switcher (events sheet) —
                  the always-on shelf drew more attention than the plan itself. */}

              {plan._error && <div className="engine-error">Engine error: {plan._error}</div>}

              {/* HERO VIEWPORT (host request, 2026-07-08): the first screen is a
                  flex column sized to the visible frame — masthead + countdown
                  up top, the summary tiles mid, and the NEXT tile anchored just
                  above the floating dock so the primary action sits at thumb
                  reach with no dead space below it. */}
              <div className="hero">
              {/* Event masthead — kicker / readable title / quiet venue.
                  (The old all-caps eyebrow crushed long names into three
                  unreadable letterspaced lines.) Theme/colors (event.theme)
                  rides the same quiet line as venue — real host-entered data,
                  shown only when set, no new row added. */}
              <div className="ev-head">
                <button className="ev-kicker" onClick={() => setSheet({ kind: 'events' })} aria-haspopup="true">
                  {event.type} <span aria-hidden="true">▾</span>
                </button>
                <div className="ev-title">{event.name}</div>
                {(event.venue || event.theme) ? <div className="ev-venue">{[event.venue, event.theme].filter(Boolean).join(' · ')}</div> : null}
              </div>
              <div className="mega">
                {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${daysAnim}d ago` : days === 1 ? `${daysAnim} day` : `${daysAnim} days`}
              </div>
              <p className="mega-sub">
                {(dstat.status === 'today' || dstat.status === 'tomorrow') && dstat.reason}
                {isPast && dstat.status !== 'today' && dstat.status !== 'tomorrow' && 'this one is behind you.'}
                {!isPast && days !== null && days > 1 && `until ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              </p>
              {/* THE VERDICT (host, 2026-07-09): the one sentence the readouts
                  circle but never say — "am I okay?" answered plainly, in the
                  app's voice. Grounded ONLY in already-computed engine state:
                  overdue board decisions, timeline compression, budget overage
                  — the engines' own escalation states, never invented cheer.
                  Division of labor: this line owns "how am I doing"; the NEXT
                  tile owns "what do I do"; the tiles below are the evidence. */}
              {!isPast && days !== null && days > 0 && (() => {
                const slips = [];
                try {
                  const od = (decisionBoard.open || []).filter(r => r && r.status === 'overdue').length;
                  if (od) slips.push(od === 1 ? 'one decision is past its easy window' : od + ' decisions are past their easy window');
                } catch { /* board unavailable */ }
                if (compression && compression.headline) slips.push('time got tight');
                if (money.planned && money.committed > money.planned) slips.push('the budget is running over');
                if (slips.length) {
                  return (
                    <p className="verdict slipping">
                      Mostly on course — {slips.slice(0, 2).join(', and ')}. Worth a look today.
                    </p>
                  );
                }
                if (!actions.length) return <p className="verdict">All quiet — you’re genuinely set for now.</p>;
                return <p className="verdict">You’re in good shape — nothing’s slipping.</p>;
              })()}
              {/* ctx continuity (PC-1): what the plan RECOGNIZED — shown only
                  for compound events where the understanding isn't obvious. */}
              {ctx && ctx.compound && ctx.reasoning && (
                <p className="grounding" style={{ margin: '4px 0 0', color: 'var(--steel-soft)' }}>
                  Planning this as {String(ctx.reasoning).toLowerCase().replace(/\.$/, '')}.
                </p>
              )}
              {returnLine && (
                <button className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: 'none', cursor: returnLine.route ? 'pointer' : 'default', padding: '2px 0 0', font: 'inherit' }}
                  onClick={() => { if (returnLine.route) routeSheet(returnLine.route); setReturnLine(null); }}>
                  <span className="t" style={{ color: 'var(--steel-soft)', fontWeight: 550, fontSize: 'var(--t-row-sub)' }}>{returnLine.line}</span>
                  {returnLine.route ? <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span> : null}
                </button>
              )}

              <div className="bento">
                <button className="tile tile-a" onClick={() => {
                  // Tap = take me to what's next, front and center (attention
                  // system); the caret corner toggles the readouts panel.
                  if (actions.length) { const k = String(actions[0].id || 0); setEditor(null); spotlight(k); }
                  else setHandledOpen(o => !o);
                }}>
                  <div className="t-label">Where you stand{' '}
                    <span role="button" tabIndex={0} style={{ opacity: .55, padding: '2px 6px' }}
                      onClick={e => { e.stopPropagation(); setHandledOpen(o => !o); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setHandledOpen(o => !o); } }}>
                      {handledOpen ? "▴ what’s counted" : "▾ what’s counted"}
                    </span>
                  </div>
                  <div>
                    {(() => {
                      // TRUTH RULE (Todd, 2026-07-08): the tile reads the WIDER
                      // ledger — deriveEventPhaseProgress's essentials (basics +
                      // rain, shopping, dietary, vendors, crabs) — never just the
                      // four foundational dominoes. "Done" is only claimed when
                      // the ENGINE's own label says ready AND the checklist is
                      // clear; otherwise the open work is named.
                      // Engine-authored numbers: completedCount/totalCount and the
                      // ranked nextCue come straight from deriveEventPhaseProgress
                      // (the engine returns counts + nextCue + items — never re-derive).
                      const hasCues = !!(phaseCues && phaseCues.totalCount);
                      const essDone = hasCues ? phaseCues.completedCount : plan.progress.done;
                      const essTotal = hasCues ? phaseCues.totalCount : plan.progress.total;
                      const openTasks = (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).length;
                      const nextCue = hasCues ? phaseCues.nextCue : null;
                      // Numerals in the muted sub get a <b> (one CSS contrast
                      // step up — host request 2026-07-11).
                      // RECON MODEL (2026-07-11): the big number counts AREAS —
                      // each once — so the sub names the unit. The setup fraction
                      // (the four foundational dominoes) shows only while it's
                      // incomplete, then drops entirely; every other number on
                      // the page is an inventory with its own unit noun.
                      const setupLine = plan.progress.total && plan.progress.done < plan.progress.total
                        ? <> · setup <b>{plan.progress.done} of {plan.progress.total}</b></> : null;
                      let sub;
                      if (!essTotal) sub = 'Nothing to read for this event yet.';
                      else if (essDone < essTotal) {
                        // BALANCE RULES (host, 2026-07-08): the big number already
                        // says "2 of 4" — no dangling "handled" prefix; the cue
                        // label keeps the ENGINE's own casing (never lowercased
                        // proper nouns) and clamps so a venue-length label can't
                        // restate the masthead right underneath it.
                        let nl = String((nextCue && nextCue.label) || 'the open one').replace(/^next:\s*/i, '').replace(/\.+$/, '');
                        if (nl.length > 44) nl = nl.slice(0, 44) + '…';
                        sub = <>areas handled{setupLine} · next: {nl}</>;
                      }
                      else if (openTasks > 0) sub = <>areas handled — but <b>{openTasks}</b> checklist step{openTasks === 1 ? '' : 's'} still on the list. Not done yet.</>;
                      else sub = 'areas handled and the checklist is clear — ready for the day.';
                      return (
                        <>
                          <div className="t-num" style={{ fontSize: 'clamp(26px,8cqw,34px)' }}>
                            {essTotal ? `${essDone} of ${essTotal}` : '—'}
                          </div>
                          <div className="bar"><i style={{ width: (essTotal ? Math.round((essDone / essTotal) * 100) : 0) + '%' }} /></div>
                          <div className="t-sub">{sub}</div>
                        </>
                      );
                    })()}
                  </div>
                </button>
                <button className="tile tile-b" onClick={() => setSheet({ kind: 'guests' })}>
                  <div className="t-label">Guests</div>
                  <div>
                    <div className="t-num">{guests ? gAnim : '—'}</div>
                    <div className="t-sub">{guests
                      ? (expect ? <>planned around · likely <b>{expect.low}–{expect.high}</b> on the day{expect.note ? ` (${expect.note})` : ''}</> : 'planned around')
                      : 'no count yet — the plan can’t size food or seats'}</div>
                  </div>
                </button>
                <button className="tile tile-c" onClick={() => setSheet({ kind: 'budget' })}>
                  <div className="t-label">Budget</div>
                  <div>
                    <div className="t-num">{money.planned ? fmt(bAnim) : '—'}</div>
                    {/* over-budget warn moved from inline style to the .over class so
                        the numeral <b> rule can defer to it (b stays warn, not gray). */}
                    <div className={'t-sub' + (money.planned && money.committed > money.planned ? ' over' : '')}>
                      {money.planned ? <><b>{fmt(money.committed)}</b> spoken for · <b>{fmt(money.spent)}</b> spent{money.committed > money.planned ? ' · over' : ''}</> : 'no number yet — tap to set one'}
                    </div>
                  </div>
                </button>
              </div>
              {/* NEXT — out of the grid, anchored to the bottom of the hero
                  viewport (margin-top:auto) so it rides just above the dock. */}
              <button
                  className={'tile tile-d' + (actions.length === 0 ? ' allset' : '')}
                  onClick={() => {
                    if (days === 0) { setStage('day'); return; }
                    // the engine's next cue carries its own route — honor it first
                    if (phaseCues && phaseCues.nextCue && phaseCues.nextCue.route && routeSheet(phaseCues.nextCue.route)) return;
                    if (actions.length) { const k = String(actions[0].id || 0); setEditor(null); spotlight(k); }
                    else document.getElementById('actionsAnchor')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="t-label">Next</div>
                  <div className="t-big">{(() => {
                    if (days === 0) return 'Run the day';
                    const calmTop = actions.length === 1 && /on track|nothing urgent|good shape/i.test(String(actions[0].title || ''));
                    return actions.length === 0 || calmTop ? 'All quiet' : actions.length === 1 ? '1 thing needs you' : actions.length + ' things need you';
                  })()}</div>
                  <div className="t-sub">
                    {(() => {
                      // Host audit (2026-07-08): NAME the first thing (same source as
                      // the card below — can't disagree) instead of counting the
                      // checklist ledger; open to-dos aren't "needs you" unless
                      // overdue, and then the engine makes catch-up the top card.
                      if (days === 0) {
                        // Day-of truth: count what's actually left today, not "1 thing".
                        const moments = ros.filter(r => r && !r.done).length;
                        const openTasks = (event.timeline || []).filter(t => t && !t.done && !isTimelineStepResolved(t)).length;
                        const bits = [];
                        if (moments) bits.push(moments + ' moment' + (moments === 1 ? '' : 's') + ' queued');
                        if (openTasks) bits.push(openTasks + ' steps open');
                        return (bits.length ? bits.join(' · ') + ' — ' : '') + 'The Day has the wheel ↓';
                      }
                      const calmTop = actions.length === 1 && /on track|nothing urgent|good shape/i.test(String(actions[0].title || ''));
                      if (!actions.length || calmTop) {
                        // Calm ≠ blank: name the next DATED thing (human intelligence).
                        if (upNext.length) {
                          const u = upNext[0];
                          const when = u.status === 'overdue' ? ' · past due'
                            : u.status === 'due' ? ' · due today'
                            : u.status === 'due-soon' ? ' · due soon'
                            : (u.due ? ' · by ' + new Date(u.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
                          return 'next: ' + u.label + when + ' ↓';
                        }
                        return 'Nothing waiting on you right now.';
                      }
                      // ORDER-OF-INFORMATION (host, 2026-07-09): the essentials
                      // count is the Where-you-stand tile's one job, directly
                      // above — restating it here was the last double-telling
                      // on the hero. NEXT names only the first thing.
                      const first = String(actions[0].title || '').replace(/\.+$/, '');
                      return 'first: ' + (first.length > 52 ? first.slice(0, 52) + '…' : first) + ' ↓';
                    })()}
                  </div>
                </button>
              </div>

              {/* ── T-72h reconfirm sweep — a live-moment banner that exists only
                  inside the window, and folds to one green line once every
                  vendor has answered. ── */}
              {sweepWindow && reconfirmedN < reconfirmables.length && (
                <div className="sweepcard" role="region" aria-label="Reconfirm your vendors">
                  <div className="sc-eyebrow">{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days + ' days out'} · the reconfirm window</div>
                  <h3>Make sure everyone’s coming</h3>
                  <p>{reconfirmables.length === 1 ? reconfirmables[0].name + ' holds your day' : reconfirmables.length + ' vendors hold your day'} — one tap drafts every reconfirm, each with their own time and details.{reconfirmedN > 0 ? ' ' + reconfirmedN + ' of ' + reconfirmables.length + ' already answered.' : ''}</p>
                  <button className="mini" onClick={() => { setSheet({ kind: 'sweep' }); runSweepDrafts(); }}>Reconfirm everyone</button>
                </div>
              )}
              {sweepWindow && reconfirmedN === reconfirmables.length && (
                <div className="later-row" style={{ marginTop: 14, color: 'var(--ok)' }}>
                  All {reconfirmables.length} vendors answered — everyone’s coming.
                  <button className="mini" style={{ marginLeft: 8 }} onClick={() => setSheet({ kind: 'sweep' })}>See the sweep</button>
                </div>
              )}

              {/* Slide-down readouts: hidden until the Basics tile is tapped —
                  never-dense doctrine. Pills = the 4 readiness pillars; below them
                  the engine's handled facts. */}
              <div className={'slidepanel' + (handledOpen ? ' open' : '')}>
                <div className="slidepanel-inner">
                  {/* POP-1C consumer: the recommendation lifecycle is the one
                      source that classifies EVERY recommendation (foundation,
                      vendors, decisions, risks) by a single state vocabulary.
                      This is the only surface that shows that whole picture —
                      in host language, non-zero states only, simplicity intact. */}
                  {(() => {
                    const lc = (plan.planningState && plan.planningState.recommendationLifecycle) || [];
                    if (!lc.length) return null;
                    const n = (s) => lc.filter(i => i.state === s).length;
                    const bits = [
                      n('Completed') ? n('Completed') + ' handled' : null,
                      n('Working') ? n('Working') + ' in progress' : null,
                      n('Blocked') ? n('Blocked') + ' need' + (n('Blocked') === 1 ? 's' : '') + ' unblocking' : null,
                    ].filter(Boolean);
                    if (!bits.length) return null;
                    return (
                      <p className="grounding" style={{ margin: '0 0 10px', color: 'var(--steel-soft)', fontWeight: 550 }}>
                        {bits.join(' · ')}{n('Blocked') ? '' : ' · all clear'}
                      </p>
                    );
                  })()}
                  {(wins.items || []).length > 0 && (
                    <div className="pills" style={{ marginBottom: 8 }}>
                      {wins.items.map(w => (
                        <span key={w.key} className="pill p-ok" style={{ cursor: 'default' }}>{w.label}<span className="pill-note">{w.note}</span></span>
                      ))}
                    </div>
                  )}
                  {phaseCues && Array.isArray(phaseCues.items) && phaseCues.items.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '6px 0 4px' }}>The {phaseCues.totalCount} areas the count reads</div>
                      {/* RECON MODEL grounding: why this number and the inventories
                          below it can never be compared one-to-one. */}
                      <p className="grounding" style={{ margin: '0 0 6px' }}>
                        Each area counts once here. The items inside an area — shopping items, people, steps — keep their own counts further down the page.
                      </p>
                      {phaseCues.items.map((c, i) => c.handled ? (
                        <div key={c.id || i} className="line" style={{ padding: '5px 0' }}>
                          <span className="of">{c.id}</span><span className="amt" style={{ color: 'var(--ok)', fontWeight: 600 }}>handled</span>
                        </div>
                      ) : (
                        <button key={c.id || i} className="frow" style={{ padding: '8px 2px' }}
                          onClick={() => { if (c.route && routeSheet(c.route)) return; toast(c.cueLabel); }}>
                          <span className="f-main"><span className="f-name" style={{ fontSize: 'var(--t-body)' }}>{c.cueLabel}</span></span>
                          <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                        </button>
                      ))}
                    </>
                  )}
                  {heartMoments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {heartMoments.slice(0, 3).map((m, i) => (
                        <p key={i} className="grounding" style={{ margin: i ? '4px 0 0' : 0 }}>
                          {i === 0 ? 'Protect the moment: ' : 'Also worth protecting: '}
                          {String((m && (m.label || m.title || m.moment)) || m)}
                        </p>
                      ))}
                    </div>
                  )}
                  {(() => {
                    if (!readiness) return null;
                    // Host-leakage gate is now applied upstream, per-axis, by
                    // applicableReadinessAxes (CommandCenter.jsx) — vendor and
                    // document are independently nulled on their own real signal
                    // (vendors.length / documents.length), not one blanket gate
                    // tied to vendor count alone. readiness.vendor/.document
                    // already arrive pre-nulled where inapplicable.
                    const anyOverdue = (decisionBoard.open || []).some(r => r && r.status === 'overdue');
                    const callsPill = (decisionBoard.open || []).length
                      ? { status: anyOverdue ? 'AT_RISK' : 'ATTENTION', note: decisionBoard.open.length + ' open' }
                      : null;
                    // HOST WORDS, never percentages: the engine's checklist note can
                    // read "73%" — remap it to the honest count from the SAME
                    // timeline the pillar was scored on ("11 of 15 done").
                    // RECON-I3: the pillar was scored on effectiveDone — the note
                    // must count on the same basis or the pill contradicts itself.
                    const tlDone = (event.timeline || []).filter(t => {
                      if (!t) return false;
                      try { return effectiveDone(event, t); } catch { return !!t.done; }
                    }).length;
                    const tlTotal = (event.timeline || []).length;
                    const checklistPill = readiness.timeline && /%/.test(String(readiness.timeline.note || '')) && tlTotal
                      ? { ...readiness.timeline, note: tlDone + ' of ' + tlTotal + ' done' }
                      : readiness.timeline;
                    const pillars = [
                      // CANONICAL (queue item 10, ruled 2026-07-08): V2's
                      // decision pillar IS the playbook decision board — the
                      // readiness engine's decision axis is intentionally not
                      // rendered (one decision truth; the board carries
                      // per-decision due dates + routes the pillar lacks).
                      ...(callsPill ? [['Calls to make', callsPill]] : []),
                      ['People', readiness.vendor], ['Paperwork', readiness.document],
                      ['Checklist', checklistPill],
                    ].filter(([, r]) => r && r.status !== 'ON_TRACK'); // action-only: on-track never renders
                    if (!pillars.length) return <p className="grounding" style={{ margin: '2px 0 6px' }}>All quiet — nothing flagged.</p>;
                    // confidenceGrammar (production, live for hosts too): the pill's
                    // WORD reflects actual certainty, not just status — "worth a look"
                    // for a real partial vs. the same red/amber word for a guess.
                    // getEventReadiness rows use {status:'AT_RISK'|...}; the grammar
                    // reads {statusLabel:'AT RISK'|...} — translate, don't reimplement.
                    const grammar = confidencePersona(event);
                    const STATUS_WORD = { ON_TRACK: 'ON TRACK', ATTENTION: 'ATTENTION', AT_RISK: 'AT RISK' };
                    return (
                      <div className="pills">
                        {pillars.map(([label, r]) => {
                          const conf = grammar ? confidenceFor({ statusLabel: STATUS_WORD[r.status] || r.status, note: r.note }, grammar) : null;
                          return (
                            <button key={label} className={'pill ' + (conf ? (conf.tier === 'red' ? 'p-risk' : 'p-warn') : (r.status === 'ATTENTION' ? 'p-warn' : 'p-risk'))}
                              title={conf ? conf.word : undefined}
                              onClick={() => {
                                if (label === 'Checklist') setSheet({ kind: 'tasks', focus: null });
                                else if (label === 'Calls to make') setSheet({ kind: 'decisions', focus: null });
                                else toast(label + ' — ' + (r.label || '') + (r.note ? ': ' + r.note : ''));
                              }}>
                              {label}<span className="pill-note">{conf ? conf.word + ' — ' : ''}{r.note}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {handled.length > 0 && handled.map((h, i) => (
                    <div className="later-row done" key={i} style={{ marginLeft: 0 }}><span className="t">{h}</span></div>
                  ))}
                </div>
              </div>

              {lensSet.length > 1 && (
                <div className="lenses">
                  <button className="lens" aria-pressed={lens === 'all'} onClick={() => setLens('all')}>Everything</button>
                  {lensSet.map(l => (
                    <button key={l} className="lens" aria-pressed={lens === l} onClick={() => setLens(l)}>{l}</button>
                  ))}
                </div>
              )}

              {/* Day-before plan — lib/dayBefore, appears only inside the real 0–2 day window */}
              {dayBefore && dayBefore.applicable && (
                <div className="day-node" style={{ marginTop: 26 }}>
                  <div className="eyebrow">{dayBefore.daysOut === 0 ? 'Today · your day-before plan' : dayBefore.daysOut === 1 ? 'Tomorrow · your day-before plan' : 'Two days out · your day-before plan'}</div>
                  <h3>{(() => {
                    // RECON MODEL (2026-07-11): the engine's "7 things still
                    // matter" summed unlike units. Composed HERE (V2-side; the
                    // engine's own headline string is contract-locked) from the
                    // sections' own opens, each part named with its unit noun.
                    // Zero clauses drop; 3+ nonzero keeps the first two + "and more".
                    if (dayBefore.daysOut === 0 || !dayBefore.openCount) return dayBefore.headline;
                    const sx = dayBefore.sections || [];
                    const openOf = (k) => { const s = sx.find(x => x.key === k); return s ? (Number(s.open) || 0) : 0; };
                    const steps = openOf('tasks');
                    const items = openOf('shopping');
                    const people = openOf('vendors') + openOf('helpers');
                    const parts = [
                      steps ? `${steps} plan step${steps === 1 ? '' : 's'}` : null,
                      items ? `${items} item${items === 1 ? '' : 's'} to get` : null,
                      people ? `${people} ${people === 1 ? 'person' : 'people'} to confirm` : null,
                    ].filter(Boolean);
                    if (!parts.length) return dayBefore.headline; // rain-only etc. — the engine line stays honest
                    const when = dayBefore.daysOut === 1 ? 'tomorrow' : 'the day';
                    const named = parts.length > 2 ? `${parts[0]}, ${parts[1]}, and more` : parts.join(' and ');
                    const cap = named.charAt(0).toUpperCase() + named.slice(1);
                    return `${cap} before ${when}.`;
                  })()}</h3>
                  {dayBefore.moment && <p><strong style={{ color: 'var(--carbon-text)' }}>Protect the moment:</strong> {dayBefore.moment.text}</p>}
                  <div className="db-rows">
                  {(dayBefore.sections || []).slice(0, 5).map(sec => {
                    // Modernized rows (2026-07-11): each engine section reads as a
                    // full-width stacked row — a bold plain-language lead carrying
                    // the COUNT, the engine's own honest sentence beneath. The lead
                    // is composed ONLY from the section's open count + the engine's
                    // own vocabulary ("locked in", "still to get") — no new claims.
                    const n = Number(sec.open) || 0;
                    const lead = (() => {
                      switch (sec.key) {
                        case 'tasks': return n ? `${n} plan step${n === 1 ? '' : 's'} still open` : 'Plan steps — nothing open';
                        case 'shopping': return n ? `${n} item${n === 1 ? '' : 's'} still to get` : 'Shopping — all in hand';
                        case 'vendors': return n ? `${n} ${n === 1 ? 'person' : 'people'} to lock in` : 'Everyone you hired is locked in';
                        case 'rain': return n ? 'No rain backup yet' : 'Rain backup saved';
                        case 'helpers': return n ? `${n} ${n === 1 ? 'helper' : 'helpers'} to confirm` : 'Helpers all confirmed';
                        case 'cues': return 'How tomorrow starts';
                        case 'guests': return 'Tell your guests';
                        default: return sec.label + (n ? ` — ${n} open` : '');
                      }
                    })();
                    // BUG FIX (raw 24h leak): the engine's cues detail prints the
                    // ros's internal "23:40" clock strings verbatim. Re-derive the
                    // row from the SAME source (effectiveRos, already memoized as
                    // `ros`), host-formatted — first cue + "and N more" instead of
                    // three full cue sentences.
                    const sub = (() => {
                      // RECON-I5 consumer: the shopping row names its parts using
                      // the engine's own openFood/openSupplies split — the food
                      // part now matches the food sheet's remainder exactly.
                      if (sec.key === 'shopping' && n > 0 && (sec.openFood != null || sec.openSupplies != null)) {
                        const f = Number(sec.openFood) || 0;
                        const s = Number(sec.openSupplies) || 0;
                        const bits = [
                          f ? `${f} on the food list` : null,
                          s ? `${s} supplies & gear` : null,
                        ].filter(Boolean);
                        if (bits.length) return `${bits.join(' · ')} — one store run covers it.`;
                      }
                      if (sec.key !== 'cues') return sec.detail;
                      const cueList = ros.filter(r => r && r.segment);
                      if (!cueList.length) return sec.detail;
                      const first = cueList[0];
                      return `${first.time ? fmt12h(first.time) + ' — ' : ''}${first.segment}`
                        + (cueList.length > 1 ? ` · and ${cueList.length - 1} more` : '');
                    })();
                    return (
                    <button className={'db-row' + (n === 0 ? ' calm' : '')} key={sec.key}
                      onClick={() => {
                        // The ENGINE authored each row's landing (route carries the
                        // first-unbought foodFocus, the vendorId, the taskId) — use
                        // it first; the keyword fallback only catches route-less rows.
                        if (sec.route && routeSheet(sec.route)) return;
                        const k = String(sec.key || sec.label || '').toLowerCase();
                        if (/task|step|plan/.test(k)) setSheet({ kind: 'tasks', focus: null });
                        else if (/get|shop|food|buy/.test(k)) setSheet({ kind: 'food', focus: null });
                        else if (/weather|rain/.test(k)) setSheet({ kind: 'rain' });
                        else if (/tomorrow|start|schedule/.test(k)) setStage('day');
                        else setSheet({ kind: 'tasks', focus: null });
                      }}>
                      <span className="db-main">
                        <span className="db-lead">{lead}</span>
                        <span className="db-sub">{sub}</span>
                      </span>
                      <span className="chev">›</span>
                    </button>
                    );
                  })}
                  </div>
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="mini" onClick={() => { try { openDraft('Day-before details', draftDayBeforeDetails(event, profile, {})); } catch { toast('Couldn’t draft it.'); } }}>Draft the details</button>
                  </div>
                </div>
              )}

              {blockers.map((b, i) => {
                const isVenueBlock = /venue/i.test(String(b.title || ''));
                const venueSet = !!String(event.venue || '').trim();
                return (
                  <article className="card" key={'blk-' + i} style={{ marginTop: i === 0 ? 24 : 0 }}>
                    <div className="card-head">
                      <div className="card-top"><span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>Blocked</span></div>
                      <h3>{b.title}</h3>
                      {b.what && <p className="because">{b.what}</p>}
                      {/* The blocker resolves RIGHT HERE — never a passive note.
                          At-home venues clear via the town (venueCity), the same
                          field weather and maps read. */}
                      {isVenueBlock && !venueSet && (
                        <>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address — “My brother’s backyard”, “1100 Maine Ave SW”…"
                              value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" />
                            <button className="cta" onClick={saveVenue}>Save</button>
                          </div>
                          {addrSugs.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              {addrSugs.map((sg, si) => (
                                <button key={si} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
                                  onClick={() => pickAddr(sg)}>
                                  <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                        </>
                      )}
                      {isVenueBlock && venueSet && needsCity() && (
                        <>
                          <p className="grounding" style={{ marginTop: 6 }}>
                            “{event.venue}” is named — the venue check also needs the town and state (or a ZIP), so weather and maps find the right one.
                          </p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input className="field" style={{ maxWidth: 180 }} placeholder="Annapolis, MD or 21401"
                              value={cityDraft} onChange={e => setCityDraft(e.target.value)} aria-label="City, state or ZIP" />
                            <button className="cta" onClick={saveCity}>Save</button>
                          </div>
                        </>
                      )}
                      {!isVenueBlock && b.nextDecision && <p className="grounding" style={{ marginTop: 6 }}>{b.nextDecision}</p>}
                      {/* POP-1 continuity: the engine authored WHERE this blocker
                          resolves (b.route) — land there, never a passive note. */}
                      {!isVenueBlock && b.route && (
                        <div className="actions-row">
                          <button className="cta" onClick={() => { if (!routeSheet(b.route)) toast('In the app this opens: ' + (describeRoute(b.route) || 'the right spot')); }}>Sort it out</button>
                        </div>
                      )}
                      {/* No tab/field to route to, but a real fixed set of
                          options — resolves right here instead of leaving
                          nextDecision's text with nowhere to act on it. */}
                      {!isVenueBlock && !b.route && b.fieldKey && Array.isArray(b.options) && (
                        <div className="actions-row" style={{ flexWrap: 'wrap' }}>
                          {b.options.map(opt => (
                            <button key={opt.value} className="chip" onClick={() => patchEvent({ [b.fieldKey]: opt.value })}>{opt.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {event.venue && !venueBlockerShown && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>
                    {addressOpen ? 'Where exactly?' : 'Guests will ask where — add the address for ' + String(event.venue).toLowerCase()}
                  </span>
                  {addressOpen ? null : <button className="mini" onClick={() => setAddressOpen(true)}>Add it</button>}
                </div>
              )}
              {event.venue && !venueBlockerShown && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && addressOpen && (
                <div className="hc-row" style={{ marginTop: 8 }}>
                  <input className="field" style={{ maxWidth: 'none' }} placeholder="Street address — invites and rain notes will carry it"
                    value={addressDraft} onChange={e => setAddressDraft(e.target.value)} aria-label="Venue address" />
                  <button className="cta" disabled={!addressDraft.trim()} style={!addressDraft.trim() ? { opacity: .45 } : undefined}
                    onClick={() => {
                      if (!validPlace(addressDraft) && !/\d/.test(addressDraft)) { toast('That doesn’t read like an address — street and number help guests find you.'); return; }
                      patchEvent({ venue: event.venue + ' — ' + addressDraft.trim() }, 'Address on the plan — invites and the rain note now carry it.'); setAddressOpen(false); setAddressDraft('');
                    }}>
                    Save
                  </button>
                </div>
              )}

              {outdoor && event.rainPlan && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>If it rains: {String(event.rainPlan).slice(0, 60)}{String(event.rainPlan).length > 60 ? '…' : ''}</span>
                  <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, wx || null)); } catch { toast('Couldn’t draft the note.'); } }}>Guest note</button>
                  <button className="mini" onClick={() => patchEvent({ rainPlan: '' }, 'Rain backup cleared — worth re-naming one.')}>Change</button>
                </div>
              )}

              {compression && compression.headline && (
                <button className="later-row" style={{ marginTop: 20, width: '100%', textAlign: 'left', background: 'var(--warn-tint)', border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    // land on the engine's FIRST do-now task, not the sheet top
                    const first = (compression.doNow && compression.doNow[0]) || null;
                    setSheet({ kind: 'tasks', focus: (first && (first.id || first.taskId)) || null });
                  }}>
                  <span className="t" style={{ color: 'var(--warn)' }}>{compression.headline}</span>
                  {compression.meta && compression.meta.sub && <span className="of" style={{ color: 'var(--warn)' }}> {compression.meta.sub}</span>}
                </button>
              )}

              {!String(event.venue || '').trim() && !venueBlockerShown && (
                <article className="card" style={{ marginTop: 20 }}>
                  <div className="card-head">
                    <div className="card-top">
                      <span className="tag plan" style={(days != null && days <= 1) ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : undefined}>
                        {(days != null && days <= 1) ? 'Today' : 'Plan'}
                      </span>
                    </div>
                    <h3>Where is it happening?</h3>
                    <p className="because">{(days != null && days <= 1)
                      ? 'It’s the day — guests, the rain note, and every map link need a place. This can’t wait.'
                      : 'Everything hangs off the venue — invites, the rain backup, seats and space.'}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name or address — “My brother’s backyard”, “1100 Maine Ave SW”…"
                        value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); setPendingCity(''); fetchAddrSugs(e.target.value); }} aria-label="Venue" />
                      <button className="cta" onClick={saveVenue}>Save</button>
                    </div>
                    {addrSugs.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {addrSugs.map((sg, si) => (
                          <button key={si} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
                            onClick={() => pickAddr(sg)}>
                            <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{sg.label}</span>
                          </button>
                        ))}
                        <p className="grounding" style={{ margin: '4px 0 0', opacity: .65 }}>
                          {typeof window !== 'undefined' && window.google ? 'Suggestions by Google Places.' : 'Suggestions by OpenStreetMap — Google Places takes over when the API key lands.'}
                        </p>
                      </div>
                    )}
                    {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                  </div>
                </article>
              )}

              <div className="sect" id="actionsAnchor"><h2>What needs you</h2><div className="rule" /><span className="when">in order</span></div>
              {plan && plan.planningState && (plan.planningState.reasoning || plan.planningState.currentMilestone) && (() => {
                // QUIET: don't restate the first card's own title/consequence a
                // few lines above it — only show the reasoning when it says
                // something the card itself doesn't already carry.
                const firstCard = actions[0];
                const reasoning = plan.planningState.reasoning || '';
                const redundant = firstCard && reasoning && (
                  (firstCard.consequence && firstCard.consequence.slice(0, 24) === reasoning.slice(0, 24)) ||
                  (firstCard.title && reasoning.toLowerCase().includes(String(firstCard.title).toLowerCase().replace(/\.$/, '')))
                );
                if (redundant && !plan.planningState.currentMilestone) return null;
                return (
                  <p className="grounding" style={{ margin: '-8px 0 14px' }}>
                    {redundant ? '' : reasoning}
                    {plan.planningState.currentMilestone ? (redundant ? '' : reasoning ? ' ' : '') + 'Milestone: ' + plan.planningState.currentMilestone + (plan.planningState.nextMilestone ? ' — then ' + plan.planningState.nextMilestone + '.' : '.') : ''}
                  </p>
                );
              })()}

              {actions.length === 0 && (
                <div className="empty">Nothing needs you right now — the basics are all settled.</div>
              )}

              {actions.filter(show).map((a, i) => {
                const key = String(a.id || i);
                const wired = wiredKind(a);
                const lands = wired || (a.route && ['Vendors', 'Budget', 'Guests', 'Planning', 'Planning Tasks', 'Timeline'].includes(a.route.tab));
                return (
                  <article className={'card' + (spot === key ? ' spot' : '')} id={'card-' + key} key={key}
                    style={spot === key ? undefined : { animation: `cardin 340ms var(--ease-out) ${Math.min(i, 6) * 45}ms both` }}>
                    <span className="idx">{i + 1}</span>
                    <div className="card-head">
                      <div className="card-top">
                        <span className={'tag ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>
                        {!lands && <span className="tag plan">in the app</span>}
                      </div>
                      <h3>{a.title}</h3>
                      {a.consequence && <p className="because">{a.consequence}</p>}
                      <div className="actions-row">
                        {a.cta && <button className="cta" onClick={() => onCta(a, key)}>{a.cta}</button>}
                      </div>
                      {editor === key && renderEditor(a)}
                    </div>
                  </article>
                );
              })}


              {actions.length <= 1 && upNext.length > 0 && (
                <>
                  <div className="sect" style={{ marginTop: 26 }}><h2 style={{ fontSize: 'var(--t-card-title)' }}>Coming up</h2><div className="rule" /><span className="when">dated, not urgent</span></div>
                  {upNext.map((u, i) => (
                    <button key={i} className="later-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 0' }}
                      onClick={() => routeUpNext(u)}>
                      <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{u.label}</span>
                      <span className="of" style={{ whiteSpace: 'nowrap' }}>
                        {u.due ? 'by ' + new Date(u.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (u.days != null ? ' · ' + (u.days === 0 ? 'today' : 'in ' + u.days + 'd') : '') : 'no date'}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {/* QUIET INDEX (Fable redo): the first pass hid these rows in a
                  "More" junk drawer — but they're the ONLY route to their
                  sheets, and hiding wayfinding costs more than it saves. The
                  real density problem was five different component types with
                  five different visual weights. One featherweight row per
                  surface, uniform metrics, importance-ordered: attention
                  first, meaning last. */}
              {(() => {
                const trunc = (s, n) => { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t; };
                const meaningText = String(event.must_have_moment || event.meaning_why || event.honoree_story || '');
                const rows = [
                  rollup && rollup.counts && rollup.counts.total > 0 && (rollup.counts.needsAttention > 0 || rollup.counts.missing > 0)
                    ? { key: 'people', label: 'People you’re hiring', sub: rollup.counts.ready + ' of ' + rollup.counts.total + ' booked', attn: true, go: () => { if (!routeSheet(rollup.target)) setSheet({ kind: 'vendors' }); } } : null,
                  // VENDOR-ENTRY-POINT FIX: the row above only ever appears once
                  // vendors already exist AND need attention — a fresh event with
                  // zero vendors had no reachable way in at all (sheet.kind:'vendors'
                  // existed and rendered "No vendors on this event yet." with no add
                  // action, but nothing ever opened it). This calm, non-urgent row
                  // is the actual first door in; it steps aside once real vendors
                  // exist and the urgent row above takes over.
                  (!rollup || !rollup.counts || rollup.counts.total === 0) && vendorPlan.relevant
                    ? { key: 'vendors_suggest', label: 'People you might hire', sub: vendorPlan.categories.length + ' roles this kind of event usually needs', go: () => setSheet({ kind: 'vendors' }) } : null,
                  foodPlan && foodPlan.itemCount > 0 && foodPlan.boughtCount < foodPlan.itemCount
                    ? { key: 'food', label: 'The spread & shopping', sub: 'food & drinks · ' + foodPlan.boughtCount + ' of ' + foodPlan.itemCount + ' bought', go: () => setSheet({ kind: 'food' }) } : null,
                  crab.relevant
                    ? { key: 'crab', label: 'The crab order', sub: crab.lines && crab.lines.length ? (crab.mixedSummary || ('about ' + crab.totalEstimatedCrabs + ' crabs')) : 'not started', go: () => setSheet({ kind: 'crabs' }) } : null,
                  ((capacity && (capacity.items || []).length > 0) || helpers.length > 0)
                    ? { key: 'space', label: 'Space, seats & helpers', sub: helperPeople.length ? helperPeople.length + (helperPeople.length === 1 ? ' person helping' : ' people helping') : 'sized to your count', go: () => setSheet({ kind: 'space' }) } : null,
                  // Sprint 1 seating: only once a real roster has confirmed
                  // guests — headcount events never get invented names to seat.
                  seating.hasRoster && seating.totals.confirmed > 0
                    ? {
                        key: 'seating', label: 'Who sits where',
                        sub: seating.totals.allSeated
                          ? 'everyone’s seated'
                          : seating.totals.seated + ' of ' + seating.totals.confirmed + ' confirmed guests seated',
                        attn: seating.totals.unassigned > 0,
                        go: () => setSheet({ kind: 'seating' }),
                      } : null,
                  // DESTINATION-2: lodging gets a row ONLY for destination
                  // events (the engine's relevant flag — Phase 1's one gate).
                  // The sub is honest per mode: a real not-booked count in
                  // roster mode, the place (or its absence) otherwise.
                  travel.relevant
                    ? {
                        key: 'lodging', label: 'Where everyone stays',
                        sub: travel.lodging.notBookedCount != null && travel.lodging.roster.length > 0
                          ? (travel.lodging.notBookedCount > 0
                              ? travel.lodging.notBookedCount + ' of ' + travel.lodging.roster.length + ' haven’t booked yet'
                              : 'everyone has a room lined up')
                          : (travel.lodging.hotelName || 'no place picked yet'),
                        attn: travel.lodging.notBookedCount != null && travel.lodging.notBookedCount > 0 && !!travel.lodging.deadline,
                        go: () => setSheet({ kind: 'lodging' }),
                      } : null,
                  // DESTINATION-2 slice 3: getting here, same gate. The sub is
                  // honest per mode — a real flight-info count (and any real
                  // conflicts) in roster mode, the airports card otherwise.
                  travel.relevant
                    ? (() => {
                        const arr = travel.air;
                        const have = arr.roster.filter(r => r.hasFlightInfo).length;
                        const nc = (arr.conflicts || []).length;
                        return {
                          key: 'air', label: 'Getting here',
                          sub: travel.rosterMode && arr.roster.length > 0
                            ? (nc > 0
                                ? nc + ' flight' + (nc === 1 ? '' : 's') + ' cut' + (nc === 1 ? 's' : '') + ' into the day'
                                : have > 0 ? have + ' of ' + arr.roster.length + ' have flight info' : 'no flight info yet')
                            : (arr.airportOptions.length > 0
                                ? arr.airportOptions.length + ' airport' + (arr.airportOptions.length === 1 ? '' : 's') + ' listed'
                                : 'no airports listed yet'),
                          attn: nc > 0,
                          go: () => setSheet({ kind: 'air' }),
                        };
                      })()
                    : null,
                  // DESTINATION-2 slice 2: getting around, same gate. The sub
                  // is honest per mode — real ride math once anyone on the
                  // roster has spoken, the decision's actual state otherwise.
                  travel.relevant
                    ? (() => {
                        const gr = travel.ground;
                        const spoken = travel.rosterMode && gr.roster.some(r => r.status !== 'not_set');
                        return {
                          key: 'ground', label: 'Getting around',
                          sub: spoken
                            ? (gr.needRide.length > 0
                                ? gr.needRide.length + ' need a ride · ' + gr.offeredSeats + ' seat' + (gr.offeredSeats === 1 ? '' : 's') + ' offered'
                                : 'no one needs a ride right now')
                            : (gr.transportProvided === true ? 'a shuttle or van is the plan'
                              : gr.transportProvided === false ? 'everyone gets themselves around'
                              : 'group transport not decided yet'),
                          attn: travel.rosterMode && gr.unmatched > 0 && gr.transportProvided !== true,
                          go: () => setSheet({ kind: 'ground' }),
                        };
                      })()
                    : null,
                  // DESTINATION-3: who pays for what, same gate. The sub is
                  // the engine's honest read — dollars appear only when the
                  // host entered them; the pool is never totaled.
                  travel.relevant
                    ? (() => {
                        const cs = costSharingSummary(event);
                        return {
                          key: 'costshare', label: 'Who pays for what',
                          sub: !cs.pooled ? 'everyone covers their own'
                            : cs.tierCount === 0 ? 'pool set up — no tiers yet'
                            : cs.pricedTierCount === 0 ? cs.tierCount + ' tier' + (cs.tierCount === 1 ? '' : 's') + ', amounts not set'
                            : cs.tierCount + ' tier' + (cs.tierCount === 1 ? '' : 's') + ' · $' + cs.lowestDue + (cs.highestDue !== cs.lowestDue ? '–$' + cs.highestDue : '') + (cs.cadence ? ' ' + cs.cadence : ''),
                          go: () => setSheet({ kind: 'costshare' }),
                        };
                      })()
                    : null,
                  riskCount > 0
                    ? { key: 'risks', label: 'What could go wrong', sub: riskCount + ' to know about', go: () => setSheet({ kind: 'risks' }) } : null,
                  !isPast
                    ? { key: 'meaning', label: hasMeaning ? 'The moment that must happen' : 'Make it yours', sub: hasMeaning ? trunc(meaningText, 36) : 'the story, the feeling', go: openMeaning } : null,
                ].filter(Boolean);
                if (!rows.length) return null;
                return (
                  <div className="qidx">
                    {rows.map(r => (
                      <button key={r.key} className="qidx-row" onClick={r.go}>
                        <span className="qidx-l">{r.label}</span>
                        <span className={'qidx-s' + (r.attn ? ' attn' : '')}>{r.sub}</span>
                        <span className="chev">›</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
              {lastLesson && (
                <p className="grounding" style={{ margin: '14px 0 0' }}>
                  From your last {String(event.type).toLowerCase()}: “{lastLesson.lessons.slice(0, 70)}{lastLesson.lessons.length > 70 ? '…' : ''}”
                </p>
              )}
              {String(event.venue || '').trim() && needsCity() && !venueBlockerShown && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>What city, state (or ZIP)? Weather and maps need it.</span>
                  <input className="field" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="Annapolis, MD"
                    value={cityDraft} onChange={e => setCityDraft(e.target.value)} aria-label="City, state or ZIP" />
                  <button className="mini" onClick={saveCity}>Save</button>
                </div>
              )}
            </section>
          )}

          {/* ══════════ THE DAY — live command surface on the day itself,
              walkthrough preview any other day ══════════ */}
          {stage === 'day' && liveDay && (
            <section className="day-sec">
              <div className="eyebrow">
                {dayAllDone ? 'All clear — that’s a wrap' : nowActive ? 'Today · live' : dayStarted ? 'Today · next up' : 'Today · starts soon'}
                {' · '}{new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {/* The REAL wall-clock — ticks every 30s; the day tells the host
                  where it is, the host never hunts for their place. */}
              <div className="clock">
                {(() => { const h = Math.floor(nowMin / 60); const m = nowMin % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
              </div>
              {dayWhispers.length > 0 && (
                <div className="pills" style={{ margin: '-14px 0 18px' }}>
                  {dayWhispers.map(w => <span key={w} className="pill p-ok" style={{ cursor: 'default' }}>{w}</span>)}
                </div>
              )}
              {/* Day alerts — the SAME engine the production app reads
                  (lib/dayAlerts): what needs you RIGHT NOW, three calm tiers. */}
              {rosOverlaps > 0 && (
                <div className="later-row" style={{ background: 'var(--warn-tint)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
                  <span className="t" style={{ color: 'var(--warn)', fontWeight: 650 }}>
                    {rosOverlaps} run-of-show {rosOverlaps === 1 ? 'moment overlaps' : 'moments overlap'} another — worth a look before things collide.
                  </span>
                </div>
              )}
              {nudgeFor('program')}
              {(() => {
                let sugg = [];
                try { sugg = suggestableMoments(event.type, ros) || []; } catch { sugg = []; }
                if (!sugg.length) return null;
                const m = sugg[0];
                return (
                  <div className="later-row" style={{ marginTop: 14, marginBottom: 8 }}>
                    <span className="t" style={{ color: 'var(--carbon-muted)', fontWeight: 550, fontSize: 'var(--t-row-sub)' }}>
                      Worth a spot on the schedule: {m.label || m.title || m.name}
                    </span>
                    <button className="mini" onClick={() => {
                      try {
                        const seg = buildMomentSegment(m);
                        if (!seg) return;
                        // WAVE-B fix: append to the EFFECTIVE schedule + rosEdited
                        // (legacy's setRos shape). The old write appended to the
                        // stored ros without the ownership flag, so on a playbook
                        // event effectiveRos kept returning the derived schedule
                        // and the added moment never appeared anywhere.
                        const rosNext = [...ros, { ...seg, id: 'm-' + Math.random().toString(36).slice(2, 9) }];
                        patchEvent({ ros: rosNext, rosEdited: true }, (m.label || 'The moment') + ' is on the schedule — give it a time when you know it.');
                      } catch { toast('Couldn’t add it.'); }
                    }}>Add it</button>
                  </div>
                );
              })()}
              {dayAlerts.map(a => (
                <button key={a.id} onClick={() => alertSheet(a)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    borderRadius: 14, padding: '12px 14px', marginBottom: 8, font: 'inherit',
                    background: a.tier === 'critical' ? 'var(--danger-tint)' : a.tier === 'warning' ? 'var(--warn-tint)' : 'var(--steel-tint)',
                    color: 'var(--carbon-text)',
                  }}>
                  <span style={{ display: 'block', fontSize: 'var(--t-body-s)', fontWeight: 750, color: a.tier === 'critical' ? 'var(--danger)' : a.tier === 'warning' ? 'var(--warn)' : 'var(--steel-soft)' }}>{a.headline}</span>
                  {a.move && <span style={{ display: 'block', fontSize: 'var(--t-row-sub)', marginTop: 2, color: 'var(--carbon-muted)' }}>{a.move}</span>}
                </button>
              ))}
              {dayAllDone ? (
                // Shared DAY_COMPLETE_COPY (lib/dayOfCopy.js) — same words
                // legacy renders, not a separately-authored version.
                <div className="now-card" style={{ borderColor: 'var(--ok)', marginTop: 6, background: 'var(--ok-tint)', boxShadow: '0 0 28px -8px rgba(79,174,122,.4)' }}>
                  <div className="now-label" style={{ color: 'var(--ok)' }}>{DAY_COMPLETE_COPY.eyebrow}</div>
                  <h2>{DAY_COMPLETE_COPY.headline}</h2>
                  <p className="meta">{DAY_COMPLETE_COPY.body}</p>
                </div>
              ) : nowCue && (
                // "Green means live" — ported from legacy's day-of spine (App.js
                // ~34667: live-bordered card, tinted background, glow) so the
                // ONE moment actually happening now reads unmistakably
                // different from "up next"/"up first", which stay neutral.
                <div className="now-card" style={nowActive
                  ? { marginTop: 6, borderColor: 'var(--ok)', background: 'var(--ok-tint)', boxShadow: '0 0 28px -8px rgba(79,174,122,.4)' }
                  : { marginTop: 6 }}>
                  <div className="now-label" style={nowActive ? { color: 'var(--ok)' } : undefined}>{nowActive ? 'Happening now' : (dayStarted ? 'Next up' : 'Up first') + (nowCue.time ? ' · ' + nowCue.time : '')}</div>
                  <h2>{nowCue.segment}</h2>
                  <p className="meta">
                    {[nowActive && nowCue.time ? 'started ' + nowCue.time : null, nowCue.location, nowCue.owner && ('owner: ' + nowCue.owner), nowCue.vendorName].filter(Boolean).join(' · ')}
                  </p>
                  {nowCue.notes && <p className="meta">{nowCue.notes}</p>}
                  {/* Vendor operational line — the cue's vendor with their
                      arrival + ON-SITE contact (day-of cell beats office line)
                      and a real call link. */}
                  {(() => {
                    const v = (event.vendors || []).find(x => x && (x.id === nowCue.vendorId || (nowCue.vendorName && x.name === nowCue.vendorName)));
                    if (!v) return null;
                    const phone = v.dayOfPhone || v.phone || '';
                    const who = v.dayOfContactName || v.contactName || v.name;
                    if (!phone && !v.arrivalTime) return null;
                    return (
                      <p className="meta" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {[v.arrivalTime ? 'arrives ' + v.arrivalTime : null, who && who !== v.name ? 'on-site: ' + who : null].filter(Boolean).join(' · ')}
                        {phone ? <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + String(phone).replace(/[^+\d]/g, '')}>Call {String(who).split(/\s+/)[0]}</a> : null}
                      </p>
                    );
                  })()}
                  <button className="cta" style={{ marginTop: 6 }} onClick={() => {
                    // Same single-truth write as ever: per-cue rosDone only; the
                    // NOW cue re-derives, so this IS the advance.
                    if (nowCue.id) {
                      patchEvent({ rosDone: { ...(event.rosDone || {}), [nowCue.id]: true } }, null);
                      if (openCues.length === 1) feedback('magic');
                    }
                  }}>
                    {openCues.length === 1 ? 'Done — that’s the last one' : 'Done — what’s next'}
                  </button>
                </div>
              )}
              {cuesAfterNow.length > 0 && (
                <div className="then">
                  {/* Bridges the Happening Now bounding box straight into the
                      spine rail below, so the green reads as one continuous
                      live thread — legacy runs the rail green for the whole
                      day-of, not just behind the NOW box (App.js ~34635). */}
                  <div className="then-spine-link" aria-hidden="true" />
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Then · {cuesAfterNow.length} more moment{cuesAfterNow.length === 1 ? '' : 's'}</div>
                  <div className="then-spine">
                  {cuesAfterNow.slice(0, 7).map((r, i) => {
                    const m = cueMins(r.time);
                    const behind = m !== null && m < nowMin;
                    return (
                      // Tappable: a behind-schedule host records finished-late work
                      // right on the row (same single-truth rosDone write) — the
                      // NOW card alone can't reach a cue whose time already passed.
                      <button className={'then-row' + (behind ? ' is-behind' : i === 0 ? ' is-next' : '')} key={r.id || i}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--carbon-line)', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
                        onClick={() => { if (r.id) patchEvent({ rosDone: { ...(event.rosDone || {}), [r.id]: true } }, 'Recorded: ' + String(r.segment || '').slice(0, 44) + '…'); }}>
                        <span className="dot" aria-hidden="true" />
                        <span className="d" style={behind ? { color: 'var(--warn)', fontWeight: 800 } : i === 0 ? { color: 'var(--steel-soft)', fontWeight: 800 } : undefined}>
                          {behind ? 'BEHIND · ' + (r.time || '') : i === 0 ? 'NEXT · ' + (r.time || '') : r.time}
                        </span>
                        <span>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}{(() => {
                          const v = (event.vendors || []).find(x => x && (x.id === r.vendorId || (r.vendorName && x.name === r.vendorName)));
                          return v && v.arrivalTime ? <span style={{ color: 'var(--carbon-muted)' }}> · arrives {v.arrivalTime}</span> : null;
                        })()}</span>
                      </button>
                    );
                  })}
                  {cuesAfterNow.length > 7 && <div className="then-row"><span className="dot" aria-hidden="true" /><span className="d" /><span style={{ color: 'var(--carbon-muted)' }}>+ {cuesAfterNow.length - 7} more, through the last item</span></div>}
                  </div>
                </div>
              )}
              {ros.some(r => r && r.done) && !dayAllDone && (
                <p className="grounding" style={{ marginTop: 12, color: 'var(--carbon-muted)' }}>
                  {ros.filter(r => r && r.done).length} already run — the day has them.
                </p>
              )}
              {dayHelpers.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Who’s helping · {dayHelpers.length}</div>
                  {dayHelpers.map((h, i) => (
                    <div className="then-row" key={i} style={{ alignItems: 'center' }}>
                      <span aria-hidden style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        background: 'var(--steel-tint)', color: 'var(--steel-soft)',
                      }}>{String(h.name).trim().charAt(0).toUpperCase()}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700 }}>{h.name}
                          {h.coi && h.coi.label ? <span className="tag plan" style={{ marginLeft: 8, color: h.coi.level === 'safe' ? 'var(--carbon-muted)' : 'var(--warn)', background: 'var(--steel-tint)' }}>{h.coi.label}</span> : null}
                        </span>
                        <span style={{ display: 'block', fontSize: 'var(--t-row-sub)', color: 'var(--carbon-muted)' }}>{h.role}</span>
                      </span>
                      <span className="d" style={{ minWidth: 0 }}>{h.time || ''}</span>
                    </div>
                  ))}
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="cta soft" onClick={() => { try { openDraft('Everyone’s part today', draftHelperBrief(event, profile, { ros })); } catch { toast('Couldn’t draft it.'); } }}>
                      Draft the helper brief
                    </button>
                    <button className="mini" onClick={() => window.print()}>Print the day sheet</button>
                    {(event.venue || event.venueCity) && <button className="mini" onClick={() => { try { openDraft('Parking instructions', draftParkingInstructions(event)); } catch { toast('Couldn’t draft it.'); } }}>Parking note</button>}
                  </div>
                </div>
              )}
            </section>
          )}
          {stage === 'day' && !liveDay && (
            <section className="day-sec">
              <div className="eyebrow">{event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date'} · {isPast ? 'as it ran' : 'preview'}</div>
              {days === 0 && rosState === 'untimed' && (
                <p className="grounding" style={{ margin: '8px 0 0', color: 'var(--carbon-muted)' }}>
                  These moments don’t have times yet — the live clock takes over once times are set. Walking through by hand still records what’s done.
                </p>
              )}
              {ros.length === 0 ? (
                <>
                  <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.08 }}>No run of show yet</h1>
                  <p className="day-empty">This event hasn’t built its day schedule. In the app, the run of show fills in as vendors, times, and the ceremony order settle — then this screen becomes one thing at a time, in the order the day runs.
                    {'\n'}Try the Wedding — it has a real one.</p>
                </>
              ) : dayIdx >= ros.length ? (
                <>
                  <div className="clock" style={{ fontSize: 'clamp(34px,11cqw,44px)', fontWeight: 700, letterSpacing: '-.03em' }}>That’s the whole day.</div>
                  <p className="day-empty">All {ros.length} moments walked through, in order, from the real run of show.</p>
                  <button className="cta" style={{ marginTop: 18 }} onClick={() => setDayIdx(0)}>Walk it again</button>
                </>
              ) : (
                <>
                  <div className="clock">{ros[dayIdx].time}</div>
                  <div className="now-card">
                    <div className="now-label">{dayIdx === 0 ? (isPast ? 'How it started' : 'First thing that day') : 'Now'}</div>
                    <h2>{ros[dayIdx].segment}</h2>
                    <p className="meta">
                      {[ros[dayIdx].location, ros[dayIdx].owner && ('owner: ' + ros[dayIdx].owner), ros[dayIdx].vendorName].filter(Boolean).join(' · ')}
                    </p>
                    {ros[dayIdx].notes && <p className="meta">{ros[dayIdx].notes}</p>}
                    {/* WAVE-B: minimal per-cue editor — "give it a time when you
                        know it" finally has a control. Time + who runs it, written
                        through writeRosCue (legacy's ros/rosEdited shape). Preview
                        only, never on the live day, and only for upcoming events. */}
                    {!isPast && ros[dayIdx].id && (
                      <div className="actions-row" style={{ marginTop: 8, alignItems: 'center' }}>
                        <label className="of" htmlFor="ros-cue-time">time</label>
                        <input id="ros-cue-time" className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: '5px 10px' }}
                          value={ros[dayIdx].time || ''}
                          onChange={e => { const cue = ros[dayIdx]; writeRosCue(cue.id, { time: e.target.value }, e.target.value ? (cue.segment || 'This moment') + ' — ' + e.target.value + ' on the schedule.' : (cue.segment || 'This moment') + ' — time cleared.'); }}
                          aria-label={'Time for ' + (ros[dayIdx].segment || 'this moment')} />
                        <label className="of" htmlFor="ros-cue-owner">who runs it</label>
                        <input id="ros-cue-owner" className="field" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: '5px 10px' }} placeholder="you? a helper?"
                          value={ros[dayIdx].owner || ''}
                          onChange={e => writeRosCue(ros[dayIdx].id, { owner: e.target.value }, null)}
                          aria-label={'Who runs ' + (ros[dayIdx].segment || 'this moment')} />
                      </div>
                    )}
                    <button className="cta" style={{ marginTop: 6 }} onClick={() => {
                      const cue = ros[dayIdx];
                      // DAY-OF ONLY: write the per-cue done flag the production app
                      // persists (event.rosDone; single-truth — effectiveRos overlays
                      // it, so "N moments queued" and reloads all agree). A preview
                      // walk on any other day stays session-only: nothing happened.
                      if (days === 0 && cue && cue.id) {
                        patchEvent({ rosDone: { ...(event.rosDone || {}), [cue.id]: true } }, null);
                        if (dayIdx === ros.length - 1) feedback('magic');
                      } else {
                        feedback(dayIdx === ros.length - 1 ? 'magic' : 'act');
                      }
                      setDayIdx(i => i + 1);
                    }}>
                      {dayIdx === ros.length - 1 ? 'Done — that’s the last one' : 'Done — what’s next'}
                    </button>
                  </div>
                  <div className="actions-row" style={{ marginTop: 12 }}>
                    <button className="mini" onClick={() => window.print()}>Print the day sheet</button>
                    {(event.venue || event.venueCity) && <button className="mini" onClick={() => { try { openDraft('Parking instructions', draftParkingInstructions(event)); } catch { toast('Couldn’t draft it.'); } }}>Parking note</button>}
                  </div>
                  {dayIdx < ros.length - 1 && (
                    <div className="then">
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Then · {ros.length - 1 - dayIdx} more moments</div>
                      {ros.slice(dayIdx + 1, dayIdx + 8).map((r, i) => (
                        // WAVE-B: each upcoming row carries its own minimal
                        // time + owner editor (same writeRosCue path as the
                        // Now card above). Rows without an id — hand-authored
                        // legacy imports — stay read-only rather than risking
                        // a write that can't target one cue.
                        !isPast && r.id ? (
                          <div className="then-row" key={r.id} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <input className="field" type="time" style={{ width: 112, flexShrink: 0, fontSize: 'var(--t-input)', padding: '4px 8px' }}
                              value={r.time || ''}
                              onChange={e => writeRosCue(r.id, { time: e.target.value }, e.target.value ? (r.segment || 'This moment') + ' — ' + e.target.value + ' on the schedule.' : (r.segment || 'This moment') + ' — time cleared.')}
                              aria-label={'Time for ' + (r.segment || 'this moment')} />
                            <span style={{ flex: '1 1 auto', minWidth: 120 }}>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}</span>
                            <input className="field" style={{ width: 130, flexShrink: 0, fontSize: 'var(--t-input)', padding: '4px 8px' }} placeholder="who runs it"
                              value={r.owner || ''} onChange={e => writeRosCue(r.id, { owner: e.target.value }, null)}
                              aria-label={'Who runs ' + (r.segment || 'this moment')} />
                          </div>
                        ) : (
                          <div className="then-row" key={r.id || i}>
                            <span className="d">{r.time}</span>
                            <span>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}</span>
                          </div>
                        )
                      ))}
                      {ros.length - 1 - dayIdx > 7 && <div className="then-row"><span className="d" /><span style={{ color: 'var(--carbon-muted)' }}>+ {ros.length - 1 - dayIdx - 7} more, through the last item</span></div>}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ══════════ AFTER — real budget lines, honest tense ══════════ */}
          {stage === 'after' && (
            <section>
              <div className="eyebrow">{isPast ? 'Afterward' : 'Preview — how it’ll wrap up'}</div>
              <h1 className="mega" style={{ fontFamily: 'var(--serif)', fontWeight: 800, fontSize: 'var(--t-display-xl)', lineHeight: 1.08, letterSpacing: '-.015em' }}>
                {isPast ? 'How it landed.' : 'How it’ll land.'}
              </h1>
              <p className="mega-sub">
                {money.planned
                  ? (money.committed <= money.planned
                    ? `${fmt(money.planned - money.committed)} of headroom against the ${fmt(money.planned)} plan so far.`
                    : `Running ${fmt(money.committed - money.planned)} over the ${fmt(money.planned)} plan.`)
                  : 'No budget yet — nothing to settle up when it’s over.'}
              </p>

              {/* HOST MODEL (Rule 4): the money reads as ONE number plus where
                  the plan priced it — never planner category rows. */}
              {(money.committed > 0 || money.planned > 0) && (
                <>
                  <div className="sect"><h2>The money</h2><div className="rule" /><span className="when">from your plan</span></div>
                  <div className="card no-hover"><div className="card-head">
                    {/* Same row-level CTA rule as the live Budget sheet — tapping
                        "Food & drinks" here opens the same food/shopping sheet for
                        reference, even after the event. Used to be inert divs
                        (cursor:default, no onClick) — the one thing on this whole
                        screen you couldn't tap into. */}
                    {hostRowsGo().map(r => (
                      <button key={r.label} className="line" style={{ width: '100%', background: 'none', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                        onClick={r.go} aria-label={'Open ' + r.label}>
                        <span>{r.label} <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span></span>
                        <span className="amt">{fmt(r.got)} <span className="of">of ~{fmt(r.est)}</span></span>
                      </button>
                    ))}
                    <div className="line total">
                      <span>{isPast ? 'Spent, all in' : 'Spoken for so far'}</span>
                      <span className={'amt' + (money.planned && money.committed <= money.planned ? ' under' : '')}>
                        {fmt(money.committed)}{money.planned ? ' · ' + (money.committed <= money.planned ? fmt(money.planned - money.committed) + ' under' : fmt(money.committed - money.planned) + ' over') : ''}
                      </span>
                    </div>
                  </div></div>
                </>
              )}

              <div className="sect"><h2>What carries forward</h2><div className="rule" /></div>
              <div className="empty" style={{ background: 'var(--steel-tint)' }}>
                {guests ? `${guests} guests planned` : 'No guest count'} · {handled.length} foundation fact{handled.length === 1 ? '' : 's'} on record · every budget line above stays saved. The thank-you is drafted right here from what actually happened; your “for next time” note below comes back the next time you plan one of these.
              </div>
              {/* Thank-yous & gifts — per-guest flags on the SAME roster rows the
                  wrap-up meter reads (phaseProgress post_event counts
                  thankYouSent), so thanking someone literally moves the meter. */}
              {isPast && (event.guests || []).some(g => g && g.rsvp === 'Yes') && (() => {
                const yesIdx = (event.guests || []).map((g, i) => ({ g, i })).filter(x => x.g && x.g.rsvp === 'Yes');
                const thanked = yesIdx.filter(x => x.g.thankYouSent === true).length;
                return (
                  <>
                    <div className="sect"><h2>Thank-yous</h2><div className="rule" /><span className="when">{thanked} of {yesIdx.length} sent</span></div>
                    <div className="card no-hover"><div className="card-head" style={{ cursor: 'default' }}>
                      {yesIdx.map(({ g, i }) => (
                        <div className="line" key={i} style={{ alignItems: 'center' }}>
                          <span>{g.name}{String(g.plusOne || '').trim() ? <span className="of"> +1</span> : null}</span>
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button className="mini" style={g.giftReceived ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                              onClick={() => writeGuest(i, { giftReceived: !g.giftReceived }, null)}>
                              {g.giftReceived ? 'gift received' : 'gift?'}
                            </button>
                            <button className="mini" style={g.thankYouSent ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                              onClick={() => writeGuest(i, { thankYouSent: !g.thankYouSent }, g.thankYouSent ? null : ((g.name || 'Guest') + ' thanked — the wrap-up meter keeps count.'))}>
                              {g.thankYouSent ? 'thanked' : 'thank them'}
                            </button>
                          </span>
                        </div>
                      ))}
                      <p className="grounding" style={{ margin: '8px 0 0' }}>“Thanked” feeds the wrap-up meter up top; gifts are just for your memory — and the note below writes itself from what actually happened.</p>
                    </div></div>
                  </>
                );
              })()}
              {/* The final number — teaches attendance learning (INTEL R1).
                  Production contract verbatim: applyReconciliation entry
                  {eventId, date, attendance:{planned, actual}} onto
                  profile.hostIntelligence. Once per event; past events only. */}
              {isPast && (() => {
                const done = (() => { try { return isReconciled(profile, event.id); } catch { return false; } })();
                const planned = guests || 0;
                if (!planned) return null;
                if (done) return (
                  <p className="grounding" style={{ marginTop: 12 }}>Turnout recorded — the next plan sizes smarter for it.</p>
                );
                return (
                  <div style={{ marginTop: 12 }}>
                    <div className="shelf-label" style={{ marginBottom: 6 }}>The final number — how many actually came?</div>
                    <div className="actions-row" style={{ alignItems: 'center' }}>
                      <input className="field" type="number" min="0" style={{ maxWidth: 110, fontSize: 'var(--t-input)' }}
                        placeholder={String(planned)} aria-label="Actual attendance" id="v2-actual-attendance" />
                      <span className="of">of {planned} planned</span>
                      <button className="mini" onClick={() => {
                        const el = document.getElementById('v2-actual-attendance');
                        const actual = Number(el && el.value);
                        if (!Number.isFinite(actual) || actual < 0) { toast('The real headcount — a number.'); return; }
                        try {
                          const entry = { eventId: event.id, date: (event.date && String(event.date).slice(0, 10)) || undefined, attendance: { planned, actual } };
                          patchProfile({ hostIntelligence: applyReconciliation(profile && profile.hostIntelligence, entry) },
                            'Recorded — Event Boss learns from the real number.');
                        } catch { toast('Couldn’t record it.'); }
                      }}>Record it</button>
                    </div>
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>One number, once — future plans quietly adjust to how your crowds really show.</p>
                  </div>
                );
              })()}
              {/* Event memory capture — writes event.lessons via the canonical
                  setLesson (lib/eventMemory); recalled on Plan for the next
                  same-type event. Past events only — a preview has no lessons. */}
              {isPast && (
                <div style={{ marginTop: 12 }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>For next time — the one thing you’d tell yourself</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 'var(--t-input)' }}
                    placeholder="Two bags of ice per cooler wasn’t enough — get three"
                    value={lessonDraft} onChange={e => setLessonDraft(e.target.value)} aria-label="Lesson for next time" />
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="cta" disabled={lessonDraft.trim() === getLesson(event)}
                      style={lessonDraft.trim() === getLesson(event) ? { opacity: .45 } : undefined}
                      onClick={() => patchEvent({ lessons: setLesson(event, lessonDraft).lessons },
                        lessonDraft.trim() ? 'Saved — it’ll come back when you plan the next one.' : 'Note cleared.')}>
                      {getLesson(event) ? 'Update it' : 'Save it'}
                    </button>
                    {getLesson(event) && lessonDraft.trim() === getLesson(event) && (
                      <span className="of" style={{ color: 'var(--ok)' }}>on record</span>
                    )}
                  </div>
                </div>
              )}
              <div className="actions-row" style={{ marginTop: 14 }}>
                <button className="cta" onClick={() => openDraft('The thank-you', draftThankYou(event, profile))}>Draft the thank-you</button>
                <button className="mini" onClick={() => { try { openDraft('The recap', draftRecap(event, profile)); } catch { toast('Couldn’t draft it.'); } }}>Write the recap</button>
                <button className="mini" onClick={() => setSheet({ kind: 'thanks' })}>Start the thank-you run</button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Deep-link landing sheet: routes land on the exact row ── */}
      {sheet && (
        <>
          <div className="sheet-scrim" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-label="Details">
            <div className="sheet-head">
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : sheet.kind === 'decisions' ? 'Calls to make' : sheet.kind === 'space' ? 'Space, seats & helpers' : sheet.kind === 'seating' ? 'Who sits where' : sheet.kind === 'lodging' ? 'Where everyone stays' : sheet.kind === 'air' ? 'Getting here' : sheet.kind === 'ground' ? 'Getting around' : sheet.kind === 'costshare' ? 'Who pays for what' :sheet.kind === 'risks' ? 'What could go wrong' : sheet.kind === 'rain' ? 'If it rains' : sheet.kind === 'crabs' ? 'The crab order' : sheet.kind === 'events' ? 'Your events' : sheet.kind === 'meaning' ? 'Make it yours' : sheet.kind === 'qr' ? (sheet.vendorQr ? 'Scan for the vendor brief' : 'Scan to RSVP') : sheet.kind === 'sweep' ? 'Make sure everyone’s coming' : sheet.kind === 'thanks' ? 'The thank-you run' : sheet.kind === 'settings' ? 'You & your account' : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {sheet.kind === 'decisions' && (
              <>
                {/* Hero copy (host request 2026-07-11): the open count is the star —
                    decisionBoard is the ONE decision source (queue item 10). */}
                {(() => {
                  const openN = (decisionBoard.open || []).length;
                  const lockedN = (decisionBoard.locked || []).length;
                  if (!openN && !lockedN) return null;
                  const overdueN = (decisionBoard.open || []).filter(r => r && r.status === 'overdue').length;
                  return (
                    <SheetHero
                      eyebrow="Calls to make"
                      star={openN ? `${openN} to settle` : 'All settled'}
                      tone={openN ? undefined : 'ok'}
                      sub={openN
                        ? (overdueN
                          ? `${overdueN} ${overdueN === 1 ? 'is' : 'are'} past ${overdueN === 1 ? 'its' : 'their'} easy window — start there. Each one settles in a tap below; your answer reshapes the plan.`
                          : 'Each one settles in a tap below — your answer reshapes the plan.')
                        : `All ${lockedN} ${lockedN === 1 ? 'call is' : 'calls are'} made — change any of them below.`}
                    />
                  );
                })()}
                {(decisionBoard.open || []).length ? (decisionBoard.open || []).map((r, i) => {
                  // Inline settle — keyed on the DECISION having authored options
                  // (playbookDecisionOptions, same rule as legacy's What-to-settle
                  // board), not on any route. Destination calls (group transport,
                  // lodging, health…) settle right here in one tap instead of
                  // detouring through Vendors; a pick writes event.foodChoices[id]
                  // and the board re-derives, moving the row to Settled.
                  const opts = (() => { try { return playbookDecisionOptions(event, r.id); } catch { return null; } })();
                  const focused = sheet.focus && sheet.focus === r.id;
                  if (opts && opts.options.length) {
                    return (
                      <div key={r.id || i} className={'frow' + (focused ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both`, cursor: 'default' }}
                        ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}>
                        <span className="f-main">
                          <span className="f-name">{r.label}
                            {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>overdue</span>}
                          </span>
                          {r.because && <span className="v-meta">{r.because}</span>}
                        </span>
                        <div style={{ flex: '1 0 100%', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {opts.options.map(opt => (
                            <button key={opt} className="chip" aria-pressed={opts.chosen === opt}
                              onClick={() => settleDecision(r, opt)}>{opt}</button>
                          ))}
                        </div>
                        {opts.why && <p className="grounding" style={{ flex: '1 0 100%', margin: 0 }}>{opts.why}</p>}
                      </div>
                    );
                  }
                  return (
                    <button key={r.id || i} className={'frow' + (focused ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                      ref={el => { if (el && focused) el.scrollIntoView({ block: 'center' }); }}
                      onClick={() => { if (r.route && routeSheet(r.route)) return; toast(r.because || r.label); }}>
                      <span className="f-main">
                        <span className="f-name">{r.label}
                          {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>overdue</span>}
                        </span>
                        {r.because && <span className="v-meta">{r.because}</span>}
                      </span>
                    </button>
                  );
                }) : <div className="v-meta" style={{ padding: '14px 2px' }}>Nothing waiting on you.</div>}
                {(decisionBoard.locked || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 4px' }}>Settled</div>
                    {(decisionBoard.locked || []).map((r, i) => {
                      const why = latestRationaleForSubject(event, r.id);
                      // An optioned call stays changeable after it's settled —
                      // "change" re-opens the same chips, and a routed focus
                      // (the ground sheet's "Change the call") opens them
                      // directly so that CTA is honest, not a dead landing.
                      const opts = (() => { try { return playbookDecisionOptions(event, r.id); } catch { return null; } })();
                      const canChange = !!(opts && opts.options.length);
                      const changeOpen = canChange && (choiceOpen === 'dec-' + r.id || (sheet.focus && sheet.focus === r.id));
                      return (
                        // A routed focus can point at a SETTLED call too (the
                        // ground sheet's "Change the call") — same rowfocus
                        // landing as everywhere else, exact row, no hunting.
                        <div key={r.id || i} className={sheet.focus && sheet.focus === r.id ? 'rowfocus' : undefined}
                          ref={el => { if (el && sheet.focus && sheet.focus === r.id) el.scrollIntoView({ block: 'center' }); }}>
                          <div className="line" style={{ alignItems: 'center' }}>
                            <span>{r.label}</span>
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="of">{r.because}</span>
                              {canChange && !changeOpen && (
                                <button className="mini" onClick={() => setChoiceOpen('dec-' + r.id)}>change</button>
                              )}
                              {!why && whyOpen !== r.id && (
                                <button className="mini" onClick={() => { setWhyOpen(r.id); setWhyText(''); }}>note why</button>
                              )}
                            </span>
                          </div>
                          {changeOpen && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '2px 0 8px' }}>
                              {opts.options.map(opt => (
                                <button key={opt} className="chip" aria-pressed={opts.chosen === opt}
                                  onClick={() => settleDecision(r, opt)}>{opt}</button>
                              ))}
                            </div>
                          )}
                          {why && <p className="grounding" style={{ margin: '0 0 6px' }}>Your call: “{why}”</p>}
                          {whyOpen === r.id && (
                            <div className="actions-row" style={{ margin: '0 0 8px', alignItems: 'center' }}>
                              <input className="field" style={{ maxWidth: 'none', flex: 1, fontSize: 'var(--t-input)', padding: '8px 12px' }}
                                placeholder="Why this call? — in your own words" value={whyText}
                                onChange={e => setWhyText(e.target.value)} aria-label={'Why ' + r.label} />
                              <button className="mini" onClick={() => saveWhy(r)}>save</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            {sheet.kind === 'space' && (() => {
              // Hero copy (host request 2026-07-11): the helpers count is the
              // star. Real fields only — deriveHelperResponsibilities' deduped
              // people list and event.venue; nothing sized or claimed beyond them.
              const n = helperPeople.length;
              const venue = String(event.venue || '').trim();
              const venuePhrase = venue
                ? `${/^(the|a|an)\s/i.test(venue) ? '' : 'The '}${venue} is set — arrival, parking, and the rain plan live here.`
                : 'No venue named yet — name it and arrival, parking, and the rain plan live here.';
              return (
                <SheetHero
                  eyebrow="Helping hands"
                  star={n ? `${n} helping` : 'No helpers yet'}
                  sub={venuePhrase}
                />
              );
            })()}
            {sheet.kind === 'space' && (
              // DESTINATION-1: a real toggle so the modifier can be set (or
              // unset) after creation too, not just guessed once from the
              // smart-text input and locked in forever.
              <div className="line" style={{ padding: '2px 0 10px' }}>
                <span>Destination event <span className="of">— guests traveling to a lodging/venue combo</span></span>
                <button className="mini" style={event.isDestination ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                  onClick={() => patchEvent({ isDestination: !event.isDestination },
                    !event.isDestination ? 'Marked as a destination event — lodging, transport, and travel decisions just got added to your plan.' : 'Back to a local event — the travel decisions and vendor categories are removed.')}>
                  {event.isDestination ? 'yes' : 'no'}
                </button>
              </div>
            )}
            {sheet.kind === 'space' && (() => {
              // ONE Place Core (queue: untouched list) — venue/location states;
              // 'na' is suppression, never failure.
              let place = null; try { place = derivePlaceIntelligence(event); } catch { place = null; }
              const placeRows = ((place && place.sections) || []).filter(s => s && s.state !== 'na');
              return placeRows.length ? (
                <>
                  {placeRows.map(s => {
                    const isOpenRow = s.state === 'risk' || s.state === 'needs';
                    const rowColor = s.state === 'risk' ? 'var(--danger)' : s.state === 'needs' ? 'var(--warn)' : 'var(--ok)';
                    const noteField = PLACE_NOTE_FIELD[s.key];
                    // Handled/na rows and 'rain' (routes to its own real sheet
                    // via the CTA below) stay plain text — nothing to tap.
                    if (!isOpenRow || (s.key !== 'rain' && !noteField)) {
                      return (
                        <div key={s.key} className="line" style={{ alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label}</strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </div>
                      );
                    }
                    if (s.key === 'rain') {
                      return (
                        <button key={s.key} className="line" style={{ width: '100%', alignItems: 'flex-start', background: 'none', border: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: '7px 0' }}
                          onClick={() => setSheet({ kind: 'rain' })} aria-label={'Open ' + s.label}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label} <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span></strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </button>
                      );
                    }
                    const isNoteOpen = placeNoteOpen === s.key;
                    return (
                      <div key={s.key} style={{ padding: '7px 0' }}>
                        <button style={{ width: '100%', alignItems: 'flex-start', background: 'none', border: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex' }}
                          onClick={() => setPlaceNoteOpen(isNoteOpen ? null : s.key)} aria-label={'Add note for ' + s.label}>
                          <span style={{ fontSize: 'var(--t-body-s)' }}>
                            <strong style={{ color: rowColor }}>{s.label} <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>{isNoteOpen ? '⌄' : '›'}</span></strong>
                            {s.detail ? ' — ' + s.detail : ''}
                          </span>
                        </button>
                        {isNoteOpen && (
                          <div className="actions-row" style={{ marginTop: 8 }}>
                            <input className="field" style={{ flex: 1 }} placeholder={'Add ' + s.label.toLowerCase() + '…'}
                              defaultValue={event[noteField] || ''} aria-label={s.label}
                              onKeyDown={e => {
                                if (e.key !== 'Enter') return;
                                const v = e.target.value.trim();
                                patchEvent({ [noteField]: v }, s.label + ' saved.');
                                setPlaceNoteOpen(null);
                              }} />
                            <button className="mini" onClick={e => {
                              const v = e.target.previousSibling.value.trim();
                              patchEvent({ [noteField]: v }, s.label + ' saved.');
                              setPlaceNoteOpen(null);
                            }}>Save</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ height: 10 }} />
                </>
              ) : null;
            })()}
            {sheet.kind === 'space' && (
              <>
                {capacity && (capacity.items || []).filter(it => it && !it.skipped).map((it, i) => {
                  const links = it.owned ? null : (() => { try { return supplyRetailLinks(it.short || it.item, event.venue); } catch { return null; } })();
                  // Whole units only — nobody rents 3.2 canopies. The engine's
                  // scaled qty rounds UP for the host (short beats stranded).
                  const baseNeed = (() => {
                    const ov = event.capacityQty && event.capacityQty[it.key];
                    const raw = (event.capacityHave && event.capacityHave[it.key] != null && ov != null)
                      ? ov + (event.capacityHave[it.key] || 0)  // reconstruct the true need when we've overridden
                      : it.qty;
                    return Math.ceil(Number(raw) || 0);
                  })();
                  const have = Math.min(baseNeed, (event.capacityHave && event.capacityHave[it.key]) || 0);
                  const remaining = Math.max(0, baseNeed - have);
                  const helperName = (event.capacityHelpers && event.capacityHelpers[it.key]) || '';
                  // Writes go through the ENGINE's own knobs: capacityQty holds
                  // the REMAINING count (so cost prices only what's left) and
                  // capacityOwned flips when the host is fully covered.
                  const setHave = (n) => {
                    const h = Math.max(0, Math.min(baseNeed, n));
                    patchEvent({
                      capacityHave: { ...(event.capacityHave || {}), [it.key]: h },
                      capacityQty: { ...(event.capacityQty || {}), [it.key]: Math.max(0, baseNeed - h) },
                      capacityOwned: { ...(event.capacityOwned || {}), [it.key]: h >= baseNeed },
                    }, h >= baseNeed ? ((it.short || it.item) + ' fully covered — the plan stops pricing it.') : h > 0 ? ('Counting your ' + h + ' — the plan now prices the remaining ' + (baseNeed - h) + '.') : 'Back to the full count.');
                  };
                  return (
                    <div key={it.key || i} className="brow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                      <div className="line" style={{ padding: '0 0 4px' }}>
                        <span>{it.verb ? it.verb + ' ' : ''}{it.short || it.item} <span className="of">need {baseNeed}</span></span>
                        <span className="amt">
                          {remaining === 0 ? 'covered' : (it.costLow || it.costHigh) ? fmt(it.costLow) + '–' + fmt(it.costHigh) : 'no price read'}
                        </span>
                      </div>
                      <div className="actions-row" style={{ marginTop: 4, alignItems: 'center' }}>
                        <span className="of">you have</span>
                        <input className="field" style={{ maxWidth: 66, fontSize: 'var(--t-input)', padding: '6px 10px' }} type="number" min="0" max={baseNeed}
                          value={have || ''} placeholder="0" aria-label={'How many ' + (it.short || it.item) + ' you have'}
                          onChange={e => setHave(parseInt(e.target.value, 10) || 0)} />
                        <input className="field" style={{ maxWidth: 125, fontSize: 'var(--t-input)', padding: '6px 10px' }} type="text"
                          value={helperName} placeholder="helper brings?" aria-label="Helper supplying this"
                          onChange={e => patchEvent({ capacityHelpers: { ...(event.capacityHelpers || {}), [it.key]: e.target.value } }, null)} />
                        {remaining > 0 && <span className="of">still need {remaining}{helperName ? ' — ask ' + helperName : ''}</span>}
                        {remaining === 0 && helperName && <span className="of" style={{ color: 'var(--ok)' }}>{helperName} has it covered</span>}
                      </div>
                      {links && remaining > 0 && (
                        <div className="actions-row" style={{ marginTop: 4 }}>
                          {links.kind === 'rent' && links.rentUrl && (
                            <a className="mini" style={{ textDecoration: 'none' }} href={links.rentUrl} target="_blank" rel="noreferrer">Find rentals nearby</a>
                          )}
                          {(links.buy || []).slice(0, links.kind === 'rent' ? 1 : 3).map(l => (
                            <a key={l.label} className="mini" style={{ textDecoration: 'none' }} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {helpers.length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Who’s helping</span>
                      {(helperData.helpers || []).length > 0 && (
                        <button className="mini" onClick={startHelperMessages}>Message all helpers</button>
                      )}
                    </div>
                    {helpers.map((h, i) => (
                      <div key={i} className="line">
                        <span>{h.helperName} <span className="of">· {h.label}</span></span>
                        <span className="of">{(() => { try { return helperStatusLine(h) || h.status || ''; } catch { return h.status || ''; } })()}</span>
                      </div>
                    ))}
                  </>
                )}
                {!((capacity && (capacity.items || []).length) || helpers.length) && (
                  <div className="v-meta" style={{ padding: '14px 2px' }}>Nothing to set up or borrow for this one.</div>
                )}
              </>
            )}
            {sheet.kind === 'costshare' && (() => {
              // ── DESTINATION-3 — Who pays for what ──
              // Two funding models, both first-class (lib/costSharing):
              // everyone covers their own, or an ongoing pool with
              // sliding-scale tiers (susu / family-dues tradition). Funding
              // sits BESIDE the budget, never inside it — nothing here
              // touches spending math, and the pool is never totaled
              // (per-tier headcounts are the family's business).
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: '14px 2px' }}>This is a local event — everyone covers their own costs. If it becomes a destination event (Space, seats & helpers), you can set up a shared pool here.</div>;
              }
              const cs = costSharingSummary(event);
              const f = csForm || { reason: '', cadence: '', tiers: [] };
              const setF = (k) => (e) => setCsForm({ ...f, [k]: e.target.value });
              const setTier = (i, k) => (e) => setCsForm({ ...f, tiers: f.tiers.map((t, j) => j === i ? { ...t, [k]: e.target.value } : t) });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px 12px' };
              const setMode = (mode) => patchEvent({
                costSharing: { ...((event.costSharing && typeof event.costSharing === 'object') ? event.costSharing : {}), mode },
              }, mode === 'pooled-dues' ? 'Ongoing pool it is — set up the tiers below.' : 'Everyone covers their own costs.');
              return (
                <>
                  <p className="v-meta" style={{ padding: '2px 2px 10px' }}>{cs.headline}</p>
                  <div className="shelf-label">How the money works</div>
                  <div className="picker" style={{ marginBottom: 8 }}>
                    <button className="chip" aria-pressed={!cs.pooled} onClick={() => setMode('self-pay')}>Everyone covers their own</button>
                    <button className="chip" aria-pressed={cs.pooled} onClick={() => setMode('pooled-dues')}>Ongoing pool</button>
                  </div>
                  {cs.pooled && (
                    <>
                      <div className="lodge-form">
                        <label className="lodge-f full"><span className="of">Why the pool exists</span>
                          <input className="field" style={fld} placeholder="e.g. so Grandma can come" value={f.reason} onChange={setF('reason')} aria-label="Why the pool exists" /></label>
                        <label className="lodge-f full"><span className="of">How often people chip in</span>
                          <input className="field" style={fld} placeholder="e.g. monthly, per paycheck" value={f.cadence} onChange={setF('cadence')} aria-label="How often people contribute" /></label>
                      </div>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Who chips in what</div>
                      {f.tiers.length === 0 && (
                        <p className="v-meta" style={{ margin: '0 0 8px' }}>Different people can carry different amounts — working adults one number, students another, elders covered. Add a line per group.</p>
                      )}
                      {f.tiers.map((t, i) => (
                        <div key={i} className="lodge-form" style={{ marginBottom: 4 }}>
                          <label className="lodge-f"><span className="of">Who</span>
                            <input className="field" style={fld} placeholder="e.g. Working adults" value={t.label} onChange={setTier(i, 'label')} aria-label={'Group ' + (i + 1) + ' — who this covers'} /></label>
                          <label className="lodge-f"><span className="of">Amount</span>
                            <input className="field" style={fld} type="number" min="0" inputMode="decimal" placeholder="$ — leave blank if unset" value={t.amount} onChange={setTier(i, 'amount')} aria-label={'Group ' + (i + 1) + ' amount in dollars'} /></label>
                          <label className="lodge-f full"><span className="of">Worth knowing</span>
                            <input className="field" style={fld} placeholder="e.g. covered by the pool" value={t.note} onChange={setTier(i, 'note')} aria-label={'Group ' + (i + 1) + ' note'} /></label>
                          <button className="mini" style={{ justifySelf: 'start' }} onClick={() => setCsForm({ ...f, tiers: f.tiers.filter((_, j) => j !== i) })}>Remove this group</button>
                        </div>
                      ))}
                      <div className="actions-row" style={{ marginTop: 6 }}>
                        <button className="mini" onClick={() => setCsForm({ ...f, tiers: [...f.tiers, { label: '', amount: '', note: '' }] })}>Add a group</button>
                        <button className="cta" onClick={saveCostSharing}>Save how the money works</button>
                      </div>
                    </>
                  )}
                  <p className="grounding" style={{ marginTop: 14 }}>This sits beside your budget, not inside it — the pool never gets totaled up, because who lands in each group is the family’s call, not the app’s.</p>
                </>
              );
            })()}
            {sheet.kind === 'lodging' && (() => {
              // ── DESTINATION-2 · slice 1 — Where everyone stays ──
              // HOST surface only (no guest portal). Everything shown comes
              // from lib/travelPlan or the host's own form: headcount mode
              // degrades to the stay card alone — guest rows never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: '14px 2px' }}>This is a local event — nobody needs a room. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const lg = travel.lodging;
              const f = lodgeForm || { hotelName: '', rate: '', code: '', deadline: '', b1name: '', b1note: '', b2name: '', b2note: '' };
              const setF = (k) => (e) => setLodgeForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px 12px' };
              const focusDeadline = sheet.focus === 'deadline';
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the booked count is the
                      star in roster mode; the stay's own state otherwise. All
                      figures from lib/travelPlan — the roster summary line below
                      was PROMOTED here, not duplicated. */}
                  {travel.rosterMode && lg.roster.length > 0 ? (
                    <SheetHero
                      eyebrow="Rooms lined up"
                      star={`${lg.roster.length - (lg.notBookedCount || 0)} of ${lg.roster.length} booked`}
                      tone={lg.notBookedCount === 0 ? 'ok' : undefined}
                      sub={lg.notBookedCount > 0
                        ? `${lg.notBookedCount} ${lg.notBookedCount === 1 ? 'hasn’t' : 'haven’t'} booked yet — tap a name each time you hear where they stand.`
                        : 'Everyone has a room lined up — tap a name if anything changes.'}
                    />
                  ) : (
                    <SheetHero
                      eyebrow="The stay"
                      star={lg.hotelName ? 'The stay is set' : 'No place picked yet'}
                      tone={lg.hotelName ? 'ok' : undefined}
                      sub={lg.hotelName
                        ? `${lg.hotelName} is the plan — the details below feed the where-to-stay note.`
                        : 'Name the place below and the where-to-stay note writes itself.'}
                    />
                  )}
                  {/* The one dated fact on this card, said plainly — never "cutoff". */}
                  {lg.deadline && (() => {
                    let dd = null; try { dd = daysUntil(lg.deadline); } catch { dd = null; }
                    const when = new Date(lg.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                    const late = dd != null && dd < 0;
                    return (
                      <p className={'v-meta' + (focusDeadline ? ' rowfocus' : '')} style={{ padding: '2px 2px 8px', ...(late || (dd != null && dd <= 7) ? { color: 'var(--warn)', fontWeight: 650 } : {}) }}>
                        {late
                          ? 'The group rate ended ' + when + ' — check with the hotel before pointing anyone else there.'
                          : 'Group rate ends ' + when + (dd != null ? (dd === 0 ? ' — today' : ' — in ' + dd + ' day' + (dd === 1 ? '' : 's')) : '') + '.'}
                      </p>
                    );
                  })()}
                  <div className="shelf-label">The stay</div>
                  <div className="lodge-form">
                    <label className="lodge-f full"><span className="of">Place</span>
                      <input className="field" style={fld} placeholder="Hotel or rental name" value={f.hotelName} onChange={setF('hotelName')} aria-label="Where guests stay" /></label>
                    <label className="lodge-f"><span className="of">A night</span>
                      <input className="field" style={fld} type="number" min="0" inputMode="decimal" placeholder="$" value={f.rate} onChange={setF('rate')} aria-label="Nightly rate in dollars" /></label>
                    <label className="lodge-f"><span className="of">Booking code</span>
                      <input className="field" style={fld} placeholder="Say this when booking" value={f.code} onChange={setF('code')} aria-label="Booking code" /></label>
                    <label className="lodge-f full"><span className="of">Group rate ends</span>
                      <input className="field" style={fld} type="date" value={f.deadline} onChange={setF('deadline')} aria-label="Last day to book at the group rate" /></label>
                    <label className="lodge-f"><span className="of">Backup place</span>
                      <input className="field" style={fld} placeholder="If the first fills up" value={f.b1name} onChange={setF('b1name')} aria-label="First backup place" /></label>
                    <label className="lodge-f"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="Farther? Cheaper?" value={f.b1note} onChange={setF('b1note')} aria-label="Note about the first backup" /></label>
                    <label className="lodge-f"><span className="of">Second backup</span>
                      <input className="field" style={fld} placeholder="One more option" value={f.b2name} onChange={setF('b2name')} aria-label="Second backup place" /></label>
                    <label className="lodge-f"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="The honest tradeoff" value={f.b2note} onChange={setF('b2note')} aria-label="Note about the second backup" /></label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={saveLodging}>Save the stay details</button>
                    {/* DRAFT-ONLY (UX_07): the note is written from the SAVED
                        details, reviewed by the host, sent from their own
                        messages — the label says Draft, never Send. */}
                    {lg.hotelName && (
                      <button className="cta soft" onClick={() => { try { openDraft('The where-to-stay note', draftLodgingNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the where-to-stay note
                      </button>
                    )}
                  </div>
                  {travel.rosterMode ? (
                    lg.roster.length > 0 ? (
                      <>
                        {/* count + guidance promoted into the sheet hero above */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>Who’s booked a room</div>
                        {lg.roster.map((r, i) => (
                          <button key={r.guestId != null ? r.guestId : 'g' + i}
                            className={'frow' + (sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId) ? ' rowfocus' : '')}
                            ref={el => { if (el && sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId)) el.scrollIntoView({ block: 'center' }); }}
                            style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                            onClick={() => cycleLodging(r)}
                            aria-label={r.name + ' — ' + LODGING_STATUS_LABEL[r.status] + '. Tap to update.'}>
                            <span className="f-main">
                              <span className="f-name">{r.name}
                                {r.recentlyChanged && <span className="tag plan">just changed</span>}
                              </span>
                              {(r.roommate || r.accessibility) && (
                                <span className="v-meta">{[r.roommate ? 'rooming with ' + r.roommate : null, r.accessibility].filter(Boolean).join(' · ')}</span>
                              )}
                            </span>
                            <span className={'tag lodge-' + r.status}>{LODGING_STATUS_LABEL[r.status]}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: '12px 2px 0' }}>Everyone on the list has declined — nobody needs a room right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster and a null
                    // count — show the stay card only, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name booking list here. Switch to a guest list when you want to track who’s booked a room.</p>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'ground' && (() => {
              // ── DESTINATION-2 · slice 2 — Getting around ──
              // HOST surface only. The shuttle call is the dest_transport
              // DECISION (Phase 1's single source of truth) — shown read-only
              // here with a route to the exact decision row, never a second
              // toggle. Headcount mode keeps the host info card and degrades
              // the ride board — guest rows are never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: '14px 2px' }}>This is a local event — nobody’s coordinating travel. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const gr = travel.ground;
              const f = groundForm || { lastReturnNote: '', p1name: '', p1note: '', p2name: '', p2note: '' };
              const setF = (k) => (e) => setGroundForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px 12px' };
              const hasNoteMaterial = !!(gr.lastReturnNote || gr.pickupPoints.length || gr.transportProvided != null);
              const firstNeeds = gr.roster.findIndex(x => x.status === 'needs_ride');
              const spoken = travel.rosterMode && gr.roster.some(x => x.status !== 'not_set');
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): real ride math once the
                      roster has spoken; the transport call's state otherwise. The
                      ride-board summary line below was PROMOTED here. */}
                  {spoken ? (
                    gr.needRide.length > 0 ? (
                      <SheetHero
                        eyebrow="Getting around"
                        star={`${gr.needRide.length} need${gr.needRide.length === 1 ? 's' : ''} a ride`}
                        sub={`${gr.offeredSeats} seat${gr.offeredSeats === 1 ? '' : 's'} offered — ` + (
                          gr.unmatched === 0 ? 'enough to cover everyone. You make the introductions.'
                          : gr.transportProvided === true ? 'the shuttle or van covers the rest.'
                          : `${gr.unmatched} still without a way back. Worth pairing people up.`)}
                      />
                    ) : (
                      <SheetHero
                        eyebrow="Getting around"
                        star="No rides needed"
                        tone="ok"
                        sub="No one needs a ride right now — tap a name when that changes."
                      />
                    )
                  ) : (
                    <SheetHero
                      eyebrow="Getting around"
                      star={gr.transportProvided === true ? 'Shuttle’s the plan' : gr.transportProvided === false ? 'No shuttle' : 'Not decided yet'}
                      tone={gr.transportProvided === true ? 'ok' : undefined}
                      sub={travel.rosterMode
                        ? 'Tap a name each time you hear their plan — renting a car, needing a ride, or offering seats.'
                        : gr.transportProvided === true ? 'A shuttle or van is the plan — the pickup spots below go in the note.'
                        : gr.transportProvided === false ? 'Everyone gets themselves around — the getting-back note below is still worth writing.'
                        : 'One tap below settles it — your answer feeds the getting-around note.'}
                    />
                  )}
                  <div className="line" style={{ padding: '2px 0 10px', alignItems: 'center' }}>
                    <span>Group transport <span className="of">— {gr.transportPick || (gr.transportProvided === true ? 'yes, a shuttle or van' : gr.transportProvided === false ? 'guests get themselves around' : 'not decided yet')}</span></span>
                    <button className="mini" onClick={() => setSheet({ kind: 'decisions', focus: 'dest_transport' })}>
                      {gr.transportProvided == null ? 'Decide it' : 'Change the call'}
                    </button>
                  </div>
                  <div className="shelf-label">Worth telling everyone</div>
                  <div className="lodge-form">
                    <label className="lodge-f full"><span className="of">Getting back at night</span>
                      <input className="field" style={fld} placeholder="e.g. no rideshare after 9pm — last shuttle 11:30" value={f.lastReturnNote} onChange={setF('lastReturnNote')} aria-label="The honest note about getting back at night" /></label>
                    <label className="lodge-f"><span className="of">Pickup spot</span>
                      <input className="field" style={fld} placeholder="Hotel lobby, venue gate…" value={f.p1name} onChange={setF('p1name')} aria-label="First pickup spot" /></label>
                    <label className="lodge-f"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="On the hour? Which door?" value={f.p1note} onChange={setF('p1note')} aria-label="Note about the first pickup spot" /></label>
                    <label className="lodge-f"><span className="of">Second spot</span>
                      <input className="field" style={fld} placeholder="One more if needed" value={f.p2name} onChange={setF('p2name')} aria-label="Second pickup spot" /></label>
                    <label className="lodge-f"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="Times? Landmarks?" value={f.p2note} onChange={setF('p2note')} aria-label="Note about the second pickup spot" /></label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={saveGround}>Save the getting-around details</button>
                    {/* DRAFT-ONLY (UX_07): written from the SAVED details plus
                        the decision's real answer, reviewed by the host, sent
                        from their own messages — Draft, never Send. */}
                    {hasNoteMaterial && (
                      <button className="cta soft" onClick={() => { try { openDraft('The getting-around note', draftRidesNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the getting-around note
                      </button>
                    )}
                  </div>
                  {travel.rosterMode ? (
                    gr.roster.length > 0 ? (
                      <>
                        {/* Host-mediated matching: the board + the sheet hero IS
                            the matching tool — counts only, never assignments.
                            (summary line promoted into the hero above) */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>The ride board</div>
                        {gr.roster.map((r, i) => {
                          const isFocus = sheet.focus != null && ((r.guestId != null && String(sheet.focus) === String(r.guestId))
                            || (sheet.focus === 'riders' && r.status === 'needs_ride'));
                          const scrollHere = sheet.focus != null && ((r.guestId != null && String(sheet.focus) === String(r.guestId))
                            || (sheet.focus === 'riders' && i === firstNeeds));
                          return (
                            <div key={r.guestId != null ? r.guestId : 'g' + i}>
                              <button className={'frow' + (isFocus ? ' rowfocus' : '')}
                                ref={el => { if (el && scrollHere) el.scrollIntoView({ block: 'center' }); }}
                                style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                                onClick={() => cycleRide(r)}
                                aria-label={r.name + ' — ' + RIDE_STATUS_LABEL[r.status] + '. Tap to update.'}>
                                <span className="f-main">
                                  <span className="f-name">{r.name}
                                    {r.recentlyChanged && <span className="tag plan">just changed</span>}
                                  </span>
                                </span>
                                <span className={'tag ride-' + r.status}>{RIDE_STATUS_LABEL[r.status]}</span>
                              </button>
                              {r.status === 'offers_ride' && (
                                <div className="actions-row" style={{ padding: '0 8px 8px', alignItems: 'center' }}>
                                  <button className="mini" onClick={() => setRideSeats(r, -1)} aria-label={'Fewer seats from ' + r.name}>−</button>
                                  <span className="of" style={{ minWidth: 52, textAlign: 'center', fontWeight: 700, color: 'var(--ink-soft)' }}>{r.seats} seat{r.seats === 1 ? '' : 's'}</span>
                                  <button className="mini" onClick={() => setRideSeats(r, +1)} aria-label={'More seats from ' + r.name}>+</button>
                                  {r.seats === 0 && <span className="of">how many can they take?</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: '12px 2px 0' }}>Everyone on the list has declined — nobody needs a ride right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster — the host
                    // info card above stands alone, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name ride board here. Switch to a guest list when you want to track who needs a ride.</p>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'air' && (() => {
              // ── DESTINATION-2 · slice 3 — Getting here ──
              // HOST surface only. The airports and their honest tradeoffs are
              // host-entered; the arrivals board reads the per-guest air fields
              // lib/travelPlan normalizes, clustered by arrival day. Land-by /
              // fly-home-after guidance derives from the event's OWN date and
              // start time — a recommended time is never invented. Headcount
              // mode keeps the airports card and drops the board — guest rows
              // are never invented.
              if (!travel.relevant) {
                return <div className="v-meta" style={{ padding: '14px 2px' }}>This is a local event — nobody’s flying in. If that changes, mark it as a destination event under Space, seats & helpers.</div>;
              }
              const ar = travel.air;
              const f = airForm || { a1name: '', a1code: '', a1note: '', a2name: '', a2code: '', a2note: '', a3name: '', a3code: '', a3note: '' };
              const setF = (k) => (e) => setAirForm({ ...f, [k]: e.target.value });
              const fld = { maxWidth: 'none', fontSize: 'var(--t-input)', padding: '9px 12px' };
              const startDay = /^\d{4}-\d{2}-\d{2}/.test(String(event.date || '')) ? String(event.date).slice(0, 10) : null;
              const endDay = (/^\d{4}-\d{2}-\d{2}/.test(String(event.endDate || '')) ? String(event.endDate).slice(0, 10) : null) || startDay;
              const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const fmtTime = (t) => {
                const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '').trim());
                if (!m) return String(t || '').trim();
                const h = Number(m[1]);
                return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + (h >= 12 ? 'pm' : 'am');
              };
              const haveCount = ar.roster.filter(r => r.hasFlightInfo).length;
              const editingRow = (r) => !!(flightEdit && ((flightEdit.guestId != null && r.guestId != null && flightEdit.guestId === r.guestId)
                || (flightEdit.guestId == null && r.guestId == null && flightEdit.name === r.name)));
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the flight-info count is
                      the star in roster mode; the airports card's state otherwise.
                      The "Who lands when" summary line was PROMOTED here. */}
                  {travel.rosterMode && ar.roster.length > 0 ? (
                    <SheetHero
                      eyebrow="Flight info in"
                      star={`${haveCount} of ${ar.roster.length}`}
                      tone={(ar.conflicts || []).length > 0 ? 'warn' : haveCount >= ar.roster.length ? 'ok' : undefined}
                      sub={(ar.conflicts || []).length > 0
                        ? `${ar.conflicts.length} flight${ar.conflicts.length === 1 ? '' : 's'} cut${ar.conflicts.length === 1 ? 's' : ''} into the day — worth a check-in. The flagged rows below say whose.`
                        : haveCount === 0
                          ? 'Tap a name each time you hear flights — the board builds itself day by day.'
                          : haveCount < ar.roster.length
                            ? 'Tap a name to add more as you hear.'
                            : 'The whole board is filled in.'}
                    />
                  ) : (
                    <SheetHero
                      eyebrow="Getting here"
                      star={ar.airportOptions.length > 0 ? `${ar.airportOptions.length} airport${ar.airportOptions.length === 1 ? '' : 's'} listed` : 'No airports listed yet'}
                      sub={ar.airportOptions.length > 0
                        ? 'The options below feed the getting-here note — honest tradeoffs and all.'
                        : 'List the options below and the getting-here note writes itself.'}
                    />
                  )}
                  {/* The one dated fact on this card — the event's own dates,
                      said plainly. A start time appears ONLY when the host
                      actually gave one; nothing here is ever a guessed time. */}
                  {startDay && (() => {
                    const tp = (() => { try { return timePhrase(event); } catch { return ''; } })();
                    return (
                      <p className="v-meta" style={{ padding: '2px 2px 8px' }}>
                        {endDay !== startDay
                          ? 'It runs ' + fmtDay(startDay) + ' through ' + fmtDay(endDay) + ' — flights in by ' + fmtDay(startDay) + ', home after ' + fmtDay(endDay) + '.'
                          : 'The day itself is ' + fmtDay(startDay) + (tp ? ' — it starts ' + (/^in the /.test(tp) ? tp : 'at ' + tp) : '') + '. Flights should land before then.'}
                      </p>
                    );
                  })()}
                  <div className="shelf-label">Airports worth flying into</div>
                  <div className="lodge-form">
                    <label className="lodge-f"><span className="of">Airport</span>
                      <input className="field" style={fld} placeholder="Baltimore/Washington Intl" value={f.a1name} onChange={setF('a1name')} aria-label="First airport name" /></label>
                    <label className="lodge-f"><span className="of">Code</span>
                      <input className="field" style={fld} placeholder="BWI" value={f.a1code} onChange={setF('a1code')} aria-label="First airport code" /></label>
                    <label className="lodge-f full"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="Closer? Fewer flights? Cheaper?" value={f.a1note} onChange={setF('a1note')} aria-label="The honest tradeoff of the first airport" /></label>
                    <label className="lodge-f"><span className="of">Second airport</span>
                      <input className="field" style={fld} placeholder="One more option" value={f.a2name} onChange={setF('a2name')} aria-label="Second airport name" /></label>
                    <label className="lodge-f"><span className="of">Code</span>
                      <input className="field" style={fld} placeholder="DCA" value={f.a2code} onChange={setF('a2code')} aria-label="Second airport code" /></label>
                    <label className="lodge-f full"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="Farther but more flights?" value={f.a2note} onChange={setF('a2note')} aria-label="The honest tradeoff of the second airport" /></label>
                    <label className="lodge-f"><span className="of">Third airport</span>
                      <input className="field" style={fld} placeholder="If there’s a third" value={f.a3name} onChange={setF('a3name')} aria-label="Third airport name" /></label>
                    <label className="lodge-f"><span className="of">Code</span>
                      <input className="field" style={fld} placeholder="IAD" value={f.a3code} onChange={setF('a3code')} aria-label="Third airport code" /></label>
                    <label className="lodge-f full"><span className="of">Worth knowing</span>
                      <input className="field" style={fld} placeholder="The honest tradeoff" value={f.a3note} onChange={setF('a3note')} aria-label="The honest tradeoff of the third airport" /></label>
                  </div>
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="mini" onClick={saveAirports}>Save the airport options</button>
                    {/* DRAFT-ONLY (UX_07): written from the SAVED options plus
                        the event's real dates and the decision's real answer,
                        reviewed by the host, sent from their own messages —
                        the label says Draft, never Send. */}
                    {ar.airportOptions.length > 0 && (
                      <button className="cta soft" onClick={() => { try { openDraft('The getting-here note', draftGettingHereNote(event)); } catch { toast('Couldn’t draft it.'); } }}>
                        Draft the getting-here note
                      </button>
                    )}
                  </div>
                  {travel.rosterMode ? (
                    ar.roster.length > 0 ? (
                      <>
                        {/* count + guidance promoted into the sheet hero above */}
                        <div className="shelf-label" style={{ margin: '18px 0 2px' }}>Who lands when</div>
                        {arrivalClusters(ar.roster).map((cl) => (
                          <div key={cl.day || 'unknown'}>
                            <div className="shelf-label" style={{ margin: '12px 0 2px' }}>
                              {cl.day
                                ? fmtDay(cl.day) + (startDay ? (cl.day === startDay ? ' — the day itself' : cl.day > startDay ? ' — after it starts' : '') : '')
                                : 'No flight info yet'}
                            </div>
                            {cl.rows.map((r, i) => {
                              const isFocus = sheet.focus != null && r.guestId != null && String(sheet.focus) === String(r.guestId);
                              const editing = editingRow(r);
                              const rowConf = (ar.conflicts || []).filter(c => (c.guestId != null && r.guestId != null) ? c.guestId === r.guestId : c.name === r.name);
                              const meta = [
                                r.airportCode ? 'into ' + r.airportCode : null,
                                r.arriveTime ? 'lands ' + fmtTime(r.arriveTime) : null,
                                r.departDate ? 'home ' + fmtDay(r.departDate) + (r.departTime ? ' ' + fmtTime(r.departTime) : '') : null,
                              ].filter(Boolean).join(' · ');
                              return (
                                <div key={r.guestId != null ? r.guestId : 'g' + (cl.day || 'u') + i}>
                                  <button className={'frow' + (isFocus ? ' rowfocus' : '')}
                                    ref={el => { if (el && isFocus) el.scrollIntoView({ block: 'center' }); }}
                                    style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                                    onClick={() => (editing ? setFlightEdit(null) : openFlightEdit(r))}
                                    aria-label={r.name + ' — ' + (r.hasFlightInfo ? 'flight info on the board' : 'no flight info yet') + '. Tap to enter flights.'}>
                                    <span className="f-main">
                                      <span className="f-name">{r.name}
                                        {r.recentlyChanged && <span className="tag plan">just changed</span>}
                                      </span>
                                      {meta && <span className="v-meta">{meta}</span>}
                                      {/* Conflict flags on the exact row — the engine's own
                                          honest reads (arrives_late / leaves_early), never
                                          derived a second time here. */}
                                      {rowConf.map((c) => (
                                        <span key={c.type} className="v-meta" style={{ color: 'var(--warn)', fontWeight: 650 }}>
                                          {c.type === 'arrives_late'
                                            ? 'lands' + (r.arriveDate ? ' ' + fmtDay(r.arriveDate) : '') + ' — after the day starts'
                                            : 'flies out' + (r.departDate ? ' ' + fmtDay(r.departDate) : '') + ' — before it ends'}
                                        </span>
                                      ))}
                                    </span>
                                    <span className={'tag air-' + (r.hasFlightInfo ? 'set' : 'none')}>{r.hasFlightInfo ? 'On the board' : 'No flights yet'}</span>
                                  </button>
                                  {editing && (
                                    <div style={{ padding: '0 8px 10px' }}>
                                      <div className="lodge-form">
                                        <label className="lodge-f full"><span className="of">Flying into</span>
                                          <input className="field" style={fld} placeholder="BWI" value={flightEdit.airportCode} onChange={e => setFlightEdit({ ...flightEdit, airportCode: e.target.value })} aria-label={'Airport ' + r.name + ' flies into'} /></label>
                                        <label className="lodge-f"><span className="of">Lands on</span>
                                          <input className="field" style={fld} type="date" value={flightEdit.arriveDate} onChange={e => setFlightEdit({ ...flightEdit, arriveDate: e.target.value })} aria-label={'Day ' + r.name + ' lands'} /></label>
                                        <label className="lodge-f"><span className="of">Lands at</span>
                                          <input className="field" style={fld} type="time" value={flightEdit.arriveTime} onChange={e => setFlightEdit({ ...flightEdit, arriveTime: e.target.value })} aria-label={'Time ' + r.name + ' lands'} /></label>
                                        <label className="lodge-f"><span className="of">Flies home on</span>
                                          <input className="field" style={fld} type="date" value={flightEdit.departDate} onChange={e => setFlightEdit({ ...flightEdit, departDate: e.target.value })} aria-label={'Day ' + r.name + ' flies home'} /></label>
                                        <label className="lodge-f"><span className="of">Flies home at</span>
                                          <input className="field" style={fld} type="time" value={flightEdit.departTime} onChange={e => setFlightEdit({ ...flightEdit, departTime: e.target.value })} aria-label={'Time ' + r.name + ' flies home'} /></label>
                                      </div>
                                      <div className="actions-row" style={{ marginTop: 8 }}>
                                        <button className="mini" onClick={saveFlightEdit}>Save {r.name}’s flights</button>
                                        <button className="mini" onClick={() => setFlightEdit(null)}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="v-meta" style={{ padding: '12px 2px 0' }}>Everyone on the list has declined — nobody’s flying in right now.</p>
                    )
                  ) : (
                    // Headcount mode: the engine returns no roster — the
                    // airports card above stands alone, never invented rows.
                    <p className="grounding" style={{ marginTop: 14 }}>You’re planning by headcount, so there’s no name-by-name arrivals board here. Switch to a guest list when you want to track who lands when.</p>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'seating' && (() => {
              // ── Sprint 1 — Who sits where ──
              // One engine (lib/seatingPlan) reads it all; writes go through
              // its pure helpers + patchEvent. Assignment is tap-a-name-then-
              // tap-a-table (the ride board's tap-the-row rhythm — a per-guest
              // cycle through N tables would be a slot machine, not a control).
              // No per-table capacity exists in the data, so none is claimed —
              // only occupancy, the average, and the evenness the engine derives.
              const sp = seating;
              if (!sp.hasRoster || sp.totals.confirmed === 0) {
                return <div className="v-meta" style={{ padding: '14px 2px' }}>Seating works from your guest list — once someone says yes, their name shows up here to be seated.</div>;
              }
              const picked = seatPick != null ? sp.confirmed.find(g => String(g.id) === String(seatPick)) : null;
              const focusId = sheet.focus != null ? String(sheet.focus) : null;
              const guestSub = (g) => [
                MEAL_SHORT[g.meal] || null,
                g.kids ? '+' + g.kids + (Number(g.kids) === 1 ? ' kid' : ' kids') : null,
                g.group || null,
              ].filter(Boolean).join(' · ');
              const tableSub = (t) => {
                const meals = Object.entries(t.meals || {}).map(([m, n]) => (MEAL_SHORT[m] || m) + ' ' + n);
                return [...meals, t.kids ? 'Kids ' + t.kids : null].filter(Boolean).join(' · ');
              };
              const guestRow = (g, seated) => {
                const isFocus = focusId != null && String(g.id) === focusId;
                const isPicked = seatPick != null && String(g.id) === String(seatPick);
                return (
                  <div key={g.id} className={'frow' + (isFocus || isPicked ? ' rowfocus' : '')}
                    ref={el => { if (el && isFocus) el.scrollIntoView({ block: 'center' }); }}
                    style={{ cursor: 'pointer' }} role="button" tabIndex={0}
                    onClick={() => setSeatPick(isPicked ? null : g.id)}
                    onKeyDown={e => { if (e.key === 'Enter') setSeatPick(isPicked ? null : g.id); }}
                    aria-label={g.name + (seated ? ' — seated. Tap to move them.' : ' — needs a seat. Tap, then tap a table.')}>
                    <span className="f-main">
                      <span className="f-name">{g.name}
                        {isPicked && <span className="tag plan">now tap a table</span>}
                      </span>
                      {guestSub(g) && <span className="v-meta">{guestSub(g)}</span>}
                    </span>
                    {seated && (
                      <span className="mini" role="button" tabIndex={0}
                        onClick={e => { e.stopPropagation(); unseatGuest(g); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); unseatGuest(g); } }}>
                        unseat
                      </span>
                    )}
                  </div>
                );
              };
              // Hero copy (host request 2026-07-11): the old summary line is
              // PROMOTED to the hero — same buildSeatingPlan totals, count as
              // the star. "about 1 a table" reads as broken math — say "one".
              const tableBits = [
                sp.tableCount + (sp.tableCount === 1 ? ' table' : ' tables'),
                sp.totals.avgPerTable ? (sp.totals.avgPerTable === 1 ? 'one a table' : 'about ' + sp.totals.avgPerTable + ' a table') : null,
                sp.totals.seated > 0 ? (sp.totals.tablesEven ? 'tables are even' : 'tables are uneven') : null,
              ].filter(Boolean).join(' · ');
              return (
                <>
                  <SheetHero
                    eyebrow="Seated so far"
                    star={`${sp.totals.seated} of ${sp.totals.confirmed}`}
                    tone={sp.totals.allSeated ? 'ok' : undefined}
                    sub={(sp.totals.allSeated ? 'Everyone’s in a seat — ' : '') + tableBits + '.'}
                  />
                  {sp.dietChips.length > 0 && (
                    <div className="chips" style={{ margin: '0 0 8px' }}>
                      {sp.dietChips.map(c => <span key={c} className="chip" style={{ cursor: 'default' }}>{c}</span>)}
                    </div>
                  )}
                  <div className="line" style={{ alignItems: 'center', padding: '4px 0 10px' }}>
                    <span>Tables</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="mini" onClick={() => stepTableCount(-1)} disabled={sp.tableCount <= 1}
                        style={sp.tableCount <= 1 ? { opacity: .45 } : undefined} aria-label="One table fewer">−</button>
                      <span className="of" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, color: 'var(--ink-soft)' }}>{sp.tableCount}</span>
                      <button className="mini" onClick={() => stepTableCount(+1)} aria-label="One table more">+</button>
                    </span>
                  </div>
                  {picked && (
                    <p className="grounding" style={{ margin: '0 0 8px' }}>
                      Seating {picked.name} — tap a table below.{' '}
                      <button className="mini" onClick={() => setSeatPick(null)}>never mind</button>
                    </p>
                  )}
                  {sp.unassigned.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '8px 0 2px' }}>Still need a seat — tap a name, then a table</div>
                      {sp.unassigned.map(g => guestRow(g, false))}
                      {sp.unassigned.some(g => g.group) && (
                        <div className="actions-row" style={{ margin: '8px 0 2px', alignItems: 'center' }}>
                          <button className="mini" onClick={autoSeatByGroup}>Group people automatically</button>
                          <span className="of">spreads people evenly — it won’t seat groups together</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="shelf-label" style={{ margin: '14px 0 2px' }}>The tables{picked ? ' — tap one to seat ' + picked.name : ''}</div>
                  {sp.tables.map(t => {
                    const isOpen = seatOpenTable === t.number;
                    const renaming = tableNameDraft && tableNameDraft.num === t.number;
                    return (
                      <div key={t.number}>
                        <button className="frow" style={picked ? { boxShadow: 'inset 0 0 0 1px var(--steel-tint)' } : undefined}
                          onClick={() => { if (picked) { seatGuestAt(picked, t); setSeatOpenTable(t.number); } else setSeatOpenTable(isOpen ? null : t.number); }}
                          aria-label={t.label + ' — ' + t.count + ' seated.' + (picked ? ' Tap to seat ' + picked.name + ' here.' : ' Tap to open.')}>
                          <span className="f-main">
                            <span className="f-name">{t.label}</span>
                            {tableSub(t) && <span className="v-meta">{tableSub(t)}</span>}
                          </span>
                          <span className="of" style={{ fontWeight: 700, color: t.count ? 'var(--ink-soft)' : 'var(--faint)' }}>
                            {t.count ? t.count + ' seated' : 'empty'}
                          </span>
                          <span className="chev" style={{ position: 'static', color: 'var(--faint)', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '2px 0 8px 14px' }}>
                            {t.guests.map(g => guestRow(g, true))}
                            {t.guests.length === 0 && <p className="v-meta" style={{ margin: '4px 0' }}>No one here yet.</p>}
                            {renaming ? (
                              <div className="actions-row" style={{ marginTop: 6, alignItems: 'center' }}>
                                <input className="field" style={{ maxWidth: 200, fontSize: 'var(--t-input)', padding: '6px 10px' }}
                                  placeholder={'Table ' + t.number} value={tableNameDraft.value} autoFocus
                                  onChange={e => setTableNameDraft({ num: t.number, value: e.target.value })}
                                  onKeyDown={e => { if (e.key === 'Enter') saveTableName(t.number); }}
                                  aria-label={'Name for table ' + t.number} />
                                <button className="mini" onClick={() => saveTableName(t.number)}>Save</button>
                                <button className="mini" onClick={() => setTableNameDraft(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="mini" style={{ marginTop: 6 }}
                                onClick={() => setTableNameDraft({ num: t.number, value: t.name || '' })}>
                                {t.name ? 'Rename it' : 'Name this table'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
            {sheet.kind === 'risks' && (
              <>
                {/* Hero copy (host request 2026-07-11): riskCount is the SAME
                    number the quiet index row shows — exactly the rows below.
                    Authored possibilities, never live alerts — no alarm tone. */}
                <SheetHero
                  eyebrow="Eyes open"
                  star={riskCount ? `${riskCount} to know about` : 'All quiet'}
                  tone={riskCount ? undefined : 'ok'}
                  sub={riskCount
                    ? 'None of these are happening — they’re the ones worth a plan. Clear any you’ve already got covered.'
                    : 'Everything flagged has a plan or got dismissed.'}
                />
                {/* ctx.activeRisks (PC-2): the reveal's risk deriver, already
                    filtered through event.riskStatus — dismissing here writes
                    the SAME field production writes, one loop everywhere. */}
                {ctx && (ctx.activeRisks || []).map((r, i) => (
                  <div key={'ctx-' + (r.type || i)} className="brow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                    <div className="f-name" style={{ marginBottom: 3 }}>
                      {r.description}
                      <span className="tag plan" style={r.severity === 'high' ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{r.severity}</span>
                    </div>
                    <p className="grounding" style={{ margin: 0 }}>{r.mitigation}</p>
                    <div className="actions-row" style={{ marginTop: 6 }}>
                      <button className="mini" onClick={() => patchEvent({ riskStatus: { ...(event.riskStatus || {}), [r.type]: 'dismissed' } }, 'Noted — that one stops surfacing.')}>Handled — stop showing this</button>
                    </div>
                  </div>
                ))}
                {risks && (risks.items || []).map((r, i) => (
                  <div key={r.id || i} className="brow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                    <div className="f-name" style={{ marginBottom: 3 }}>
                      {r.trigger}
                      <span className={'tag ' + (r.severity === 'high' ? 'plan' : 'plan')} style={r.severity === 'high' ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{r.severity}</span>
                    </div>
                    <p className="grounding" style={{ margin: 0 }}>{r.mitigation}</p>
                  </div>
                ))}
              </>
            )}
            {sheet.kind === 'meaning' && meaningDraft && (
              <>
                <p className="grounding" style={{ margin: '0 0 12px' }}>
                  This is what the plan protects — the day-before brief, the run of show, and the toast all draw from your own words. Nothing here is required.
                </p>
                {[
                  ['honoree', 'Who is it for?', 'Margaret — my mom', false],
                  ['honoree_story', 'Their story, in a line or two', '32 years at the library; she taught half the county to read', true],
                  ['meaning_why', 'Why this matters', 'She never lets anyone celebrate her — this time we are', false],
                  ['feeling_words', 'How the day should feel', 'warm, loud, unhurried', false],
                  ['must_have_moment', 'The one moment that must happen', 'Everyone on the lawn for the sunset photo', false],
                ].map(([key, label, ph, multi]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div className="shelf-label" style={{ marginBottom: 5 }}>{label}</div>
                    {multi ? (
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 'var(--t-input)' }} placeholder={ph}
                        value={meaningDraft[key]} onChange={e => setMeaningDraft(d => ({ ...d, [key]: e.target.value }))} aria-label={label} />
                    ) : (
                      <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)' }} placeholder={ph}
                        value={meaningDraft[key]} onChange={e => setMeaningDraft(d => ({ ...d, [key]: e.target.value }))} aria-label={label} />
                    )}
                  </div>
                ))}
                <div className="actions-row">
                  <button className="cta" onClick={() => {
                    const clean = {};
                    Object.entries(meaningDraft).forEach(([k, v]) => { clean[k] = String(v || '').trim(); });
                    patchEvent(clean, 'That’s the heart of it — the plan will protect it.');
                    setSheet(null);
                  }}>Save it</button>
                  {hasToastMaterial({ ...event, ...meaningDraft }) && (
                    <button className="mini" onClick={() => { try { openDraft('Your toast', draftToast({ ...event, ...meaningDraft }, profile)); } catch { toast('Couldn’t draft it.'); } }}>
                      Draft the toast
                    </button>
                  )}
                </div>
              </>
            )}
            {sheet.kind === 'events' && (
              <>
                {(REAL_EVENTS.length > 0 || hydratedEvents.length > 0) && (
                  <>
                    <div className="shelf-label" style={{ margin: '0 0 6px' }}>Yours{hydratedEvents.length ? ' — synced to your account' : ' — from the app'}</div>
                    {[...REAL_EVENTS, ...hydratedEvents.filter(he => !REAL_EVENTS.some(re => re.id === he.id))].map((e, i) => {
                      const isActive = e.id === eventId;
                      const d = daysUntil(e.date);
                      return (
                        <button key={e.id} className={'frow' + (isActive ? ' rowfocus' : '')} style={{ animation: `cardin 260ms var(--ease-out) ${Math.min(i, 8) * 30}ms both` }}
                          onClick={() => { switchEvent(e.id); setSheet(null); }}>
                          <span className="f-main">
                            <span className="f-name">{e.name}{isActive ? <span className="tag plan">current</span> : null}</span>
                            <span className="v-meta">{[e.type, e.venue].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className="of" style={{ whiteSpace: 'nowrap' }}>{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : 'in ' + d + 'd'}</span>
                        </button>
                      );
                    })}
                    <div className="shelf-label" style={{ margin: '10px 0 6px' }}>Samples & tests</div>
                  </>
                )}
                {[...ROSTER, ...customs.map(c => ({ ...c, _custom: true }))].map((e, i) => {
                  const isActive = e.id === eventId;
                  const src = e;
                  const d = daysUntil(src.date);
                  const label = e._custom ? (e.name || 'Yours') : (e === MY_CRAB_FEAST ? 'My Crab Feast' : e.type);
                  // DISAMBIGUATION-1: a seed/sample event can share a name+venue with the
                  // host's own real event (e.g. both default to "My Crab Feast" / "Backyard"),
                  // reading as an unlabeled duplicate. Every row in this "Samples & tests"
                  // shelf is synthetic EXCEPT MY_CRAB_FEAST when it's been promoted to the
                  // host's real crab-feast event (appCrab) — a real "Sample" tag, not invented.
                  const isSample = !e._custom && !(e === MY_CRAB_FEAST && appCrab);
                  return (
                    <button key={e.id} className={'frow' + (isActive ? ' rowfocus' : '')} style={{ animation: `cardin 260ms var(--ease-out) ${Math.min(i, 8) * 30}ms both` }}
                      onClick={() => { switchEvent(e.id); setSheet(null); }}>
                      <span className="f-main">
                        <span className="f-name">{label}{isSample ? <span style={{ fontSize: 'var(--t-caption)', fontWeight: 650, color: 'var(--ink-soft)', background: 'var(--bg-band)', border: '1px solid var(--line)', borderRadius: 10, padding: '1px 7px', marginLeft: 6, opacity: 0.7 }}>Sample</span> : null}{isActive ? <span className="tag plan">current</span> : null}</span>
                        <span className="v-meta">{src.name === label ? '' : src.name}{src.venue ? (src.name === label ? '' : ' · ') + src.venue : ''}</span>
                      </span>
                      <span className="of" style={{ whiteSpace: 'nowrap' }}>{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : 'in ' + d + 'd'}</span>
                    </button>
                  );
                })}
                {!activeCustom && Object.keys(patch).length > 0 && (
                  <div className="actions-row" style={{ marginTop: 12 }}>
                    <button className="mini" onClick={() => { setPatch({}); toast('Your changes to this event were cleared.'); }}>Reset changes to this event</button>
                  </div>
                )}
              </>
            )}
            {sheet.kind === 'crabs' && (() => {
              const cp = (event.crabPlan && typeof event.crabPlan === 'object') ? event.crabPlan : {};
              const lines = Array.isArray(cp.lines) ? cp.lines : [];
              const writeCp = (next, msg) => patchEvent({ crabPlan: { ...cp, ...next } }, msg);
              const UNIT_LABEL = { dozen: 'dozen', half_bushel: 'half bushel', bushel: 'bushel' };
              const SIZE_LABEL = { medium: 'medium', large: 'large', extra_large: 'XL', jumbo: 'jumbo' };
              // Reference prices for the picked size+unit, from the verified ladder.
              const refs = (() => {
                if (!crabLadder) return [];
                const KEYS = { medium: ['medium'], large: ['largeFemale', 'largeMale'], extra_large: ['xlFemale', 'xlMale'], jumbo: ['jumboMale'] };
                const FIELD = { dozen: 'perDz', half_bushel: 'perHalfBushel', bushel: 'perBushel' };
                return (KEYS[crabAdd.size] || []).map(k => {
                  const row = crabLadder[k]; const p = row && row[FIELD[crabAdd.unit]];
                  return p ? { label: (/Female/.test(k) ? 'female' : /Male/.test(k) ? 'male' : 'ref') + ' $' + p, price: p } : null;
                }).filter(Boolean);
              })();
              // POP-1E: the reusable procurement estimate — an explained band
              // (assumptions/pricing model/region/confidence/cost reducers) plus
              // pickup/storage/cooking logistics. Region from the event's state.
              const _pm = /,\s*([A-Za-z]{2})\s*$/.exec(String(event.venueCity || ''));
              const _pstate = (_pm ? _pm[1].toUpperCase() : null) || (profile && profile.state ? String(profile.state).toUpperCase() : null);
              const proc = (() => { try { return buildCrabProcurement(event, { state: _pstate }); } catch { return null; } })();
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the order's own crab
                      count is the star — the old "About N crabs" meta line is
                      PROMOTED here. Figures from buildCrabPlan, host prices only. */}
                  {lines.length > 0 && (
                    <SheetHero
                      eyebrow="The order adds up to"
                      star={`about ${crab.totalEstimatedCrabs} crabs`}
                      sub={
                        (crab.coveredCrabsPerPerson != null ? '~' + (Math.round(crab.coveredCrabsPerPerson * 10) / 10) + ' each · ' : '')
                        + (crab.totalEstimatedCost != null ? 'about ' + fmt(crab.totalEstimatedCost) + ' from your prices' : 'add prices to see the cost')
                        + (crab.boughtCost > 0 ? ' · ' + fmt(crab.boughtCost) + ' bought' : '')
                      }
                    />
                  )}
                  {proc && proc.cost && (
                    <div className="card" style={{ marginBottom: 12, padding: '13px 15px' }}>
                      <div className="line" style={{ padding: 0 }}>
                        <span className="shelf-label" style={{ margin: 0 }}>{proc.explanation.pricingModel === 'host-entered-actual' ? 'Your crab cost' : 'Estimated crab cost'}</span>
                        <span className="amt" style={{ fontSize: 20, fontWeight: 800 }}>
                          {proc.cost.low === proc.cost.high ? fmt(proc.cost.low) : fmt(proc.cost.low) + '–' + fmt(proc.cost.high)}
                        </span>
                      </div>
                      {proc.cost.perPerson && (
                        <p className="grounding" style={{ margin: '3px 0 0' }}>
                          {proc.cost.perPerson.low === proc.cost.perPerson.high ? fmt(proc.cost.perPerson.low) : fmt(proc.cost.perPerson.low) + '–' + fmt(proc.cost.perPerson.high)} a head · {proc.explanation.confidence} confidence · {proc.explanation.regionalFactors.region}
                        </p>
                      )}
                      {proc.explanation.assumptions[0] && (
                        <p className="grounding" style={{ margin: '6px 0 0', opacity: .8 }}>{proc.explanation.assumptions[0]} {proc.explanation.regionalFactors.note}</p>
                      )}
                      {proc.explanation.costReducers.length > 0 && (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 'var(--t-row-sub)', fontWeight: 650, color: 'var(--steel-soft)' }}>Ways to spend less</summary>
                          <div style={{ marginTop: 6 }}>
                            {proc.explanation.costReducers.map((c, i) => (
                              <p key={i} className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>{c.label}.</strong> {c.hint}</p>
                            ))}
                          </div>
                        </details>
                      )}
                      {(proc.logistics.pickupWindow || proc.logistics.cooking) && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 'var(--t-row-sub)', fontWeight: 650, color: 'var(--steel-soft)' }}>Pickup, storage & cooking</summary>
                          <div style={{ marginTop: 6 }}>
                            {proc.logistics.pickupWindow && <p className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>Pickup:</strong> {proc.logistics.pickupWindow.note}</p>}
                            {proc.logistics.storage && <p className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>Storage:</strong> {proc.logistics.storage.note}</p>}
                            {proc.logistics.transport && <p className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>Transport:</strong> {proc.logistics.transport.note}</p>}
                            {proc.logistics.cooking && <p className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>Cooking:</strong> {proc.logistics.cooking.note}</p>}
                            {(proc.logistics.servingWaves || []).map((w, i) => (
                              <p key={i} className="grounding" style={{ margin: '0 0 4px' }}><strong style={{ color: 'var(--ink-soft)' }}>Wave {w.wave} ({w.timing}):</strong> {w.note}</p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {crab.coverageCopy && <div className="v-meta" style={{ padding: '0 2px 6px' }}>{crab.coverageCopy}</div>}
                  {lines.length === 0 && (() => {
                    // RECOMMEND-1: a real starting mix (bushels/dozens, kid-adjusted
                    // pickers) instead of leaving the host to guess bushels-vs-dozens
                    // from scratch. One tap turns it into real, editable order lines —
                    // no separate "estimate" living apart from the real order.
                    const rec = (() => { try { return recommendCrabOrder(event); } catch { return null; } })();
                    if (!rec) return null;
                    return (
                      <div className="card" style={{ marginBottom: 12, padding: '13px 15px' }}>
                        <div className="shelf-label" style={{ margin: 0 }}>A starting order</div>
                        <p className="grounding" style={{ margin: '4px 0 0' }}>{rec.summary} — about {rec.totalCrabs} crabs.</p>
                        <p className="grounding" style={{ margin: '4px 0 0', opacity: .85 }}>{rec.note}</p>
                        <button className="cta" style={{ marginTop: 10 }} onClick={() => {
                          const newLines = rec.lines.map((l, i) => ({ id: 'cl-rec-' + i + '-' + l.size + '-' + l.unit, ...l }));
                          writeCp({ lines: [...lines, ...newLines] }, 'Added — a real starting point, edit any line to match your vendor’s quote.');
                        }}>Use this order</button>
                      </div>
                    );
                  })()}
                  {/* order summary promoted into the sheet hero above */}
                  {lines.map((l, i) => {
                    const writeLine = (patch, msg) => writeCp({ lines: lines.map((x, ix) => ix === i ? { ...x, ...patch } : x) }, msg);
                    const perUnitCount = lineCrabCount(l);
                    return (
                    <div className="line" key={l.id || i} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{l.quantity}× {UNIT_LABEL[l.unit] || l.unit} {SIZE_LABEL[l.size] || l.size}</span>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="mini" style={l.bought ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                            onClick={() => {
                              // COST-TRUTH GATE: a crab line needs its real price
                              // before it can be bought — same rule as the spread.
                              if (!l.bought && !(Number(l.pricePerUnit) > 0)) {
                                toast('Enter what this line cost first — tap a reference price or type your crab house’s quote.');
                                return;
                              }
                              writeLine({ bought: !l.bought }, l.bought ? 'Back on the order.' : 'Marked bought — real spend now, not an estimate.');
                            }}>
                            {l.bought ? 'bought' : 'got it?'}
                          </button>
                          <button className="mini" onClick={() => writeCp({ lines: lines.filter((_, ix) => ix !== i) }, 'Line removed — the coverage math just recomputed.')}>×</button>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label className="of" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          crabs per {UNIT_LABEL[l.unit] || l.unit}
                          <input id={`crabline-${l.id}-count`} className="field" style={{ maxWidth: 72, fontSize: 'var(--t-input)', padding: '5px 8px' }}
                            type="number" min="0" placeholder={defaultCountPerUnit(l.size, l.unit) != null ? `~${defaultCountPerUnit(l.size, l.unit)}` : 'ask vendor'}
                            value={l.estimatedCountPerUnit ?? ''}
                            onChange={e => { const n = parseInt(e.target.value, 10); writeLine({ estimatedCountPerUnit: Number.isFinite(n) && n > 0 ? n : undefined }); }} />
                        </label>
                        <label className="of" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          price per {UNIT_LABEL[l.unit] || l.unit}
                          <input id={`crabline-${l.id}-price`} className="field" style={{ maxWidth: 86, fontSize: 'var(--t-input)', padding: '5px 8px' }}
                            type="number" min="0" placeholder="quote"
                            value={l.pricePerUnit ?? ''}
                            onChange={e => { const n = parseFloat(e.target.value); writeLine({ pricePerUnit: Number.isFinite(n) && n > 0 ? n : undefined }); }} />
                        </label>
                        {perUnitCount != null && <span className="of">≈ {perUnitCount} crabs</span>}
                      </div>
                    </div>
                    );
                  })}
                  {crab.bushelExplanation && <p className="grounding" style={{ margin: '8px 0 0' }}>{crab.bushelExplanation}</p>}
                  {(crab.issues || []).map((iss, i) => (
                    <div key={i} style={{ margin: '6px 0 0' }}>
                      <p className="grounding" style={{ margin: 0, color: 'var(--warn)' }}>{iss.copy || iss.message || String(iss)}</p>
                      {/* the ENGINE's own route — lands on the exact field */}
                      {iss.actionLabel && iss.route && iss.route.focusField && (
                        <button className="mini" style={{ marginTop: 4 }}
                          onClick={() => setSheet(s => ({ ...s, focus: iss.route.focusField }))}>{iss.actionLabel}</button>
                      )}
                    </div>
                  ))}
                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Who’s actually picking?</div>
                  <div className={sheet.focus === 'pickers' ? 'rowfocus' : ''} style={{ display: 'flex', gap: 10, alignItems: 'center', borderRadius: 12, padding: '6px 4px' }}>
                    <input className="field" style={{ maxWidth: 80, fontSize: 'var(--t-input)', padding: '10px 12px' }} type="number" min="0"
                      placeholder={String(guests || '')} aria-label="Serious crab pickers"
                      value={cp.crabEatingHeadcount || ''}
                      onChange={e => { const n = parseInt(e.target.value, 10) || 0; writeCp({ crabEatingHeadcount: n || undefined }, n ? 'Sizing crabs to ' + n + ' pickers — kids and light eaters don’t drive the count.' : 'Back to the full headcount.'); }} />
                    <span className="of" style={{ flex: 1 }}>serious pickers — kids and light eaters don’t drive the crab count</span>
                  </div>
                  {crab.pickerNote && <p className="grounding" style={{ margin: '4px 0 0', color: 'var(--warn)' }}>{crab.pickerNote}</p>}
                  {crab.pickerReconcileNote && <p className="grounding" style={{ margin: '4px 0 0' }}>{crab.pickerReconcileNote}</p>}
                  <div className={'shelf-label' + (sheet.focus === 'order' ? ' rowfocus' : '')} style={{ margin: '16px 0 6px', borderRadius: 8 }}>Add to the order</div>
                  <div className="chips">
                    {['medium', 'large', 'extra_large', 'jumbo'].map(sz => (
                      <button key={sz} className="chip" aria-pressed={crabAdd.size === sz} onClick={() => setCrabAdd(a => ({ ...a, size: sz }))}>{SIZE_LABEL[sz]}</button>
                    ))}
                  </div>
                  <div className="chips" style={{ marginTop: 8 }}>
                    {['dozen', 'half_bushel', 'bushel'].map(u => (
                      <button key={u} className="chip" aria-pressed={crabAdd.unit === u} onClick={() => setCrabAdd(a => ({ ...a, unit: u }))}>{UNIT_LABEL[u]}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <input className="field" style={{ maxWidth: 70, fontSize: 'var(--t-input)', padding: '10px 12px' }} type="number" min="1" aria-label="How many"
                      value={crabAdd.qty} onChange={e => setCrabAdd(a => ({ ...a, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
                    <input className="field" style={{ maxWidth: 120, fontSize: 'var(--t-input)', padding: '10px 12px' }} type="number" min="0" placeholder="$ each" aria-label="Price each"
                      value={crabAdd.price} onChange={e => setCrabAdd(a => ({ ...a, price: e.target.value }))} />
                    <button className="cta" onClick={() => {
                      const l = { id: 'cl-' + lines.length + '-' + crabAdd.size + '-' + crabAdd.unit, size: crabAdd.size, unit: crabAdd.unit, quantity: crabAdd.qty, pricePerUnit: parseFloat(crabAdd.price) || undefined, estimatedCountPerUnit: defaultCountPerUnit(crabAdd.size, crabAdd.unit) || undefined };
                      writeCp({ lines: [...lines, l] }, 'On the order — coverage and cost just recomputed.');
                      setCrabAdd(a => ({ ...a, qty: 1, price: '' }));
                    }}>Add it</button>
                  </div>
                  {refs.length > 0 && (
                    <div className="actions-row" style={{ marginTop: 8 }}>
                      {refs.map(r => (
                        <button key={r.label} className="mini" onClick={() => setCrabAdd(a => ({ ...a, price: String(r.price) }))}>{r.label}</button>
                      ))}
                    </div>
                  )}
                  {/* Live selection preview — cost and coverage MOVE with every
                      chip, before the line is added. Reference range until the
                      host commits a price. */}
                  {(() => {
                    const per = defaultCountPerUnit(crabAdd.size, crabAdd.unit);
                    const crabsAdded = per ? per * crabAdd.qty : null;
                    const priceN = parseFloat(crabAdd.price) || 0;
                    const refLo = refs.length ? Math.min(...refs.map(r => r.price)) : null;
                    const refHi = refs.length ? Math.max(...refs.map(r => r.price)) : null;
                    const costLine = priceN > 0
                      ? 'about ' + fmt(priceN * crabAdd.qty) + ' at your price'
                      : refLo != null
                        ? 'reference ' + (refLo === refHi ? 'about ' + fmt(refLo * crabAdd.qty) : fmt(refLo * crabAdd.qty) + '–' + fmt(refHi * crabAdd.qty)) + ' — tap a price above to use it'
                        : 'no reference price for this pick — enter what your crab house quotes';
                    const heads = crab.crabEatingHeadcount || guests || 0;
                    return (
                      <p className="grounding" style={{ marginTop: 8, color: 'var(--ink-soft)' }}>
                        This pick: {crabAdd.qty}× {crabAdd.unit.replace('_', ' ')} {crabAdd.size.replace('_', ' ')}
                        {crabsAdded ? ' ≈ ' + crabsAdded + ' crabs' + (heads ? ' (~' + (Math.round(((crab.totalEstimatedCrabs || 0) + crabsAdded) / heads * 10) / 10) + ' each with the order so far)' : '') : ' — crab count varies, ask the vendor'} · {costLine}
                      </p>
                    );
                  })()}
                  <p className="grounding" style={{ marginTop: 8 }}>
                    Reference prices: Captain White's, Maine Ave Fish Market, July 2026 — one verified DMV point, not the market. Cost only counts prices you put in. Crabs count toward “spoken for” the moment they’re priced.
                  </p>
                </>
              );
            })()}
            {sheet.kind === 'sweep' && (() => {
              const total = reconfirmables.length;
              const pct = total ? Math.round((reconfirmedN / total) * 100) : 0;
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the answered count is
                      the star — the old count line + guidance line are PROMOTED
                      here. Same reconfirmables/reconfirmed72 data as the rows. */}
                  <SheetHero
                    eyebrow="Answered so far"
                    star={`${reconfirmedN} of ${total}`}
                    tone={total > 0 && reconfirmedN === total ? 'ok' : undefined}
                    sub={reconfirmedN === total
                      ? 'That’s everyone — the day is set.'
                      : 'Each note already knows their arrival time and your address. Send from your own thread — nothing goes out by itself.'}
                  />
                  <div className="bar" aria-hidden style={{ marginBottom: 12 }}><span style={{ width: pct + '%', background: 'var(--ok)' }} /></div>
                  {reconfirmables.map(v => {
                    const st = v.reconfirmed72 ? 'answered' : (sweepState[v.id] || 'waiting');
                    const d = draftVendorReconfirm(event, v, profile);
                    const phone = String(v.dayOfPhone || v.phone || '').trim();
                    const arrival = String(v.arrivalTime || v.loadIn || v.arrival || '').trim();
                    return (
                      <div key={v.id} className={'sweep-row ' + st}>
                        <span className="sweep-state">{st === 'waiting' ? 'waiting' : st === 'drafting' ? 'drafting…' : st === 'ready' ? 'draft ready' : 'they answered'}</span>
                        <div className="f-name">{v.name}</div>
                        <div className="sv-meta">{[v.category, arrival ? 'arrives ' + arrival : null, v.cost ? '$' + Number(v.cost).toLocaleString() : null].filter(Boolean).join(' · ')}</div>
                        {st === 'ready' && !v.reconfirmed72 && (
                          <div className="actions-row" style={{ marginTop: 8 }}>
                            {phone && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + phone.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(d.body)}>Text them</a>}
                            <button className="mini" onClick={() => { try { navigator.clipboard.writeText(d.body); toast('Copied — paste it wherever you talk to ' + v.name + '.'); } catch { openDraft('Reconfirm — ' + v.name, d); } }}>Copy the note</button>
                            <button className="mini" onClick={() => openDraft('Reconfirm — ' + v.name, d)}>Read it first</button>
                          </div>
                        )}
                        {st !== 'answered' && (
                          <div className="actions-row" style={{ marginTop: 6 }}>
                            <button className="mini" onClick={() => writeVendor(v.id, { reconfirmed72: true }, v.name + ' is confirmed — ' + (total - reconfirmedN - 1) + ' to go.')}>They answered — all set</button>
                          </div>
                        )}
                        {st === 'answered' && (
                          <div className="actions-row" style={{ marginTop: 6 }}>
                            <button className="mini" onClick={() => writeVendor(v.id, { reconfirmed72: false }, 'Back on the list — worth another nudge.')}>Actually, still waiting</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {reconfirmedN < total && (
                    <div className="actions-row" style={{ marginTop: 4 }}>
                      <button className="mini" onClick={runSweepDrafts}>Draft the reconfirms</button>
                    </div>
                  )}
                  <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Every note is built from what’s on file — their arrival time, your date and place. Nothing invented, nothing auto-sent.</p>
                </>
              );
            })()}
            {sheet.kind === 'settings' && (() => {
              const mem = (() => { try { return summarizeHostIntel(profile); } catch { return { present: false, groups: [] }; } })();
              return (
                <>
                  {/* Sound lives here now (host request 2026-07-11) — the header
                      carries only the account icon. Same toggle, same prime. */}
                  <div className="later-row" style={{ borderTop: 'none', padding: '4px 2px 14px' }}>
                    <span className="t">Sound</span>
                    <button className="mini" onClick={() => { primeMessageSound(); setMuted(m => !m); }}>
                      {muted ? 'Muted — tap for sound' : 'On — tap to mute'}
                    </button>
                  </div>
                  <div className="shelf-label" style={{ margin: '2px 0 6px' }}>You</div>
                  <input className="field" style={{ maxWidth: 'none' }} placeholder="Your name — it signs every note we draft"
                    defaultValue={(profile && profile.name) || ''} aria-label="Your name"
                    onBlur={e => { const v = e.target.value.trim(); if (v !== ((profile && profile.name) || '')) patchProfile({ name: v }, v ? 'Your notes now sign as ' + v + '.' : 'Signature cleared.'); }} />
                  <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Your area</div>
                  <input className="field" style={{ maxWidth: 'none' }} placeholder="Town or city — “Annapolis, MD”"
                    defaultValue={(profile && profile.city) || ''} aria-label="Your area"
                    onBlur={e => {
                      const v = e.target.value.trim();
                      if (v === ((profile && profile.city) || '')) return;
                      if (v && !isPlausibleCityText(v)) { toast('A town name — “Annapolis” or “Silver Spring, MD”.'); return; }
                      const m = /,\s*([A-Za-z]{2})\s*$/.exec(v);
                      patchProfile({ city: v, ...(m ? { state: m[1].toUpperCase() } : {}) }, v ? 'Area saved — local prices and weather line up to it.' : 'Area cleared.');
                    }} />
                  <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Used for local food prices and as the weather fallback when an event has no town of its own.</p>

                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>What Event Boss remembers</div>
                  {mem.present && mem.groups.length ? (
                    <>
                      {mem.groups.map(g => (
                        <div key={g.domain} style={{ marginBottom: 6 }}>
                          <p className="grounding" style={{ margin: 0, fontWeight: 650, color: 'var(--ink-soft)' }}>{g.title}</p>
                          {(g.lines || []).map((l, i) => <p key={i} className="grounding" style={{ margin: '1px 0 0' }}>{l}</p>)}
                        </div>
                      ))}
                      <div className="actions-row" style={{ marginTop: 6 }}>
                        <button className="mini" onClick={() => { patchProfile(clearAllMemory(profile || {}), 'Memory cleared — Event Boss starts fresh.'); }}>Clear what it remembers</button>
                      </div>
                    </>
                  ) : (
                    <p className="grounding" style={{ margin: 0 }}>Nothing yet — after an event wraps, noting how it really went teaches the plans that follow.</p>
                  )}

                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Your account</div>
                  {!isSupabaseConfigured() ? (
                    <p className="grounding" style={{ margin: 0 }}>Everything lives on this device. Accounts turn on when the cloud is configured.</p>
                  ) : session ? (
                    <>
                      <p className="grounding" style={{ margin: '0 0 8px' }}>Signed in as <strong style={{ color: 'var(--ink-soft)' }}>{(session.user && session.user.email) || 'your account'}</strong> — your name, area, and what Event Boss remembers sync to your account across devices.</p>
                      {profile && profile.accountType === 'planner' && (
                        <p className="grounding" style={{ margin: '0 0 8px', opacity: .8 }}>You’re set up as a planner — this is the host view of your event. Your client roster and planner tools live in the full app.</p>
                      )}
                      <div className="actions-row">
                        <button className="mini" onClick={async () => { try { await supabase.auth.signOut(); toast('Signed out — everything here stays on this device.'); } catch { toast('Couldn’t sign out.'); } }}>Sign out</button>
                      </div>
                    </>
                  ) : authSent ? (
                    <p className="grounding" style={{ margin: 0 }}>Check your email — the sign-in link lands you in Event Boss, and this shell picks the session up automatically.</p>
                  ) : (
                    <>
                      <input className="field" style={{ maxWidth: 'none' }} type="email" placeholder="you@example.com" value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)} aria-label="Email for sign-in link" />
                      <div className="actions-row" style={{ marginTop: 8 }}>
                        <button className="cta" disabled={authBusy} onClick={sendMagicLink}>{authBusy ? 'Sending…' : 'Email me a sign-in link'}</button>
                      </div>
                      <p className="grounding" style={{ margin: '8px 0 0', opacity: .75 }}>No password — the link signs you in. One account, both apps, this device and your others.</p>
                    </>
                  )}

                  {/* SYNC-HONESTY-1: an honest per-event sync status, backed
                      entirely by the syncState reader — no status is ever
                      shown for a curated sample (eventIsSyncable false), since
                      a sample never touches the cloud and a claim about it
                      would be fiction either way. */}
                  {isSupabaseConfigured() && eventIsSyncable && (() => {
                    const status = getEventSyncStatus(event);
                    if (!status) return null;
                    const lastSync = status === SYNC_STATUS.SYNCED ? getLastSyncTime(event.id) : null;
                    const pending = getPendingCount();
                    const showRetry = status === SYNC_STATUS.SYNC_FAILED || pending > 0;
                    const fmtSyncTime = (iso) => {
                      const t = iso ? new Date(iso).getTime() : NaN;
                      if (!Number.isFinite(t)) return '';
                      const min = Math.floor((Date.now() - t) / 60000);
                      if (min < 1) return 'just now';
                      if (min < 60) return min + (min === 1 ? ' minute ago' : ' minutes ago');
                      const hr = Math.floor(min / 60);
                      if (hr < 24) return hr + (hr === 1 ? ' hour ago' : ' hours ago');
                      const day = Math.floor(hr / 24);
                      if (day < 7) return day + (day === 1 ? ' day ago' : ' days ago');
                      return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };
                    return (
                      <>
                        <div className="shelf-label" style={{ margin: '16px 0 6px' }}>This event</div>
                        <div className="later-row" style={{ borderTop: 'none', padding: '4px 2px 6px' }}>
                          <span className="t">{SYNC_STATUS_LABEL[status]}{lastSync ? ' · ' + fmtSyncTime(lastSync) : ''}</span>
                          {showRetry && (
                            <button className="mini" onClick={() => {
                              flushSync().then(res => {
                                if (res && res.flushed > 0) toast((res.flushed === 1 ? 'This change' : res.flushed + ' changes') + ' synced to your account.');
                                else toast('Still couldn’t reach the cloud — we’ll keep trying.');
                              }).catch(() => toast('Still couldn’t reach the cloud — we’ll keep trying.'));
                            }}>Retry now</button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })()}
            {sheet.kind === 'thanks' && (() => {
              const yes = (event.guests || []).map((g, i) => ({ g, i })).filter(x => x.g && x.g.rsvp === 'Yes');
              const sent = yes.filter(x => x.g.thankYouSent).length;
              const queue = yes.filter(x => !x.g.thankYouSent);
              const cur = queue[0] || null;
              const pct = yes.length ? Math.round((sent / yes.length) * 100) : 0;
              const noteFor = (g) => {
                const first = String(g.name || '').trim().split(/\s+/)[0] || 'friend';
                let base = { body: '' };
                try { base = draftThankYou(event, profile); } catch { /* draft optional */ }
                const gift = g.giftReceived ? ' And thank you for the gift — it meant a lot.' : '';
                return (first + ' — ' + String(base.body || 'Thank you for celebrating with us.').replace(/^\s*(hi|hey|hello)[^,\n]*,?\s*/i, '')).trim() + gift;
              };
              return (
                <>
                  {/* Hero copy (host request 2026-07-11): the thanked count is
                      the star — the old count line and the all-done line are
                      PROMOTED here. Same rsvp==='Yes' / thankYouSent reads. */}
                  {yes.length > 0 && (
                    <SheetHero
                      eyebrow="Thanked so far"
                      star={`${sent} of ${yes.length}`}
                      tone={sent >= yes.length ? 'ok' : undefined}
                      sub={sent >= yes.length
                        ? 'That’s everyone — every yes has a thank-you.'
                        : 'One at a time — each note already knows who came and what they brought.'}
                    />
                  )}
                  <div className="bar" aria-hidden style={{ marginBottom: 12 }}><span style={{ width: pct + '%', background: 'var(--ok)' }} /></div>
                  {!yes.length && <p className="grounding">No confirmed guests on this one yet.</p>}
                  {cur && (() => {
                    const { g, i } = cur;
                    const body = noteFor(g);
                    const phone = String(g.phone || '').trim();
                    return (
                      <div className="brow" style={{ padding: '14px 16px' }}>
                        <div className="f-name">{g.name}</div>
                        {g.giftReceived && <p className="grounding" style={{ margin: '2px 0 0', color: 'var(--warn)' }}>gift noted</p>}
                        <p className="grounding" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{body}</p>
                        <div className="actions-row" style={{ marginTop: 10 }}>
                          {phone && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + phone.replace(/[^+\d]/g, '') + '?&body=' + encodeURIComponent(body)}>Text it</a>}
                          <button className="mini" onClick={() => { try { navigator.clipboard.writeText(body); toast('Copied.'); } catch { /* nothing */ } }}>Copy</button>
                          <button className="cta" onClick={() => writeGuest(i, { thankYouSent: true }, queue.length > 1 ? g.name.split(' ')[0] + ' thanked — next up.' : 'That was the last one — every yes is thanked.')}>Sent — next</button>
                          <button className="mini" onClick={() => writeGuest(i, { thankYouSent: true }, 'Skipped — marked handled.')}>Skip</button>
                        </div>
                      </div>
                    );
                  })()}
                  {queue.length > 1 && <p className="grounding" style={{ opacity: .7 }}>Up next: {queue.slice(1, 4).map(x => String(x.g.name || '').split(' ')[0]).join(', ')}{queue.length > 4 ? '…' : ''}</p>}
                </>
              );
            })()}
            {sheet.kind === 'qr' && (
              <>
                {sheet.vendorQr ? (
                  <>
                    <p className="grounding" style={{ margin: '2px 0 12px' }}>
                      {(sheet.vendorQr.name || 'They')} scan{sheet.vendorQr.name ? 's' : ''} it to see their brief — arrival time, your address, their part of the day. Nothing about budget, payments, or other vendors.
                    </p>
                    {sheet.vendorQr.dataUrl && (
                      <div style={{ background: '#ffffff', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'center' }}>
                        <img src={sheet.vendorQr.dataUrl} alt={'QR code for ' + (sheet.vendorQr.name || 'the vendor') + '’s brief'} style={{ width: '100%', maxWidth: 300, display: 'block' }} />
                      </div>
                    )}
                    <div className="actions-row" style={{ marginTop: 12 }}>
                      <button className="mini" onClick={() => setSheet(sheet.vendorQr.back || { kind: 'vendors' })}>Back to vendors</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="grounding" style={{ margin: '2px 0 12px' }}>
                      Guests scan it and RSVP themselves — no app, no account. Screenshot it for the group chat, print it for the paper invite, tape it by the door.
                    </p>
                    {qrDataUrl && (
                      <div style={{ background: '#ffffff', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'center' }}>
                        <img src={qrDataUrl} alt={'QR code for the ' + (event.name || 'event') + ' RSVP link'} style={{ width: '100%', maxWidth: 300, display: 'block' }} />
                      </div>
                    )}
                    <div className="actions-row" style={{ marginTop: 12 }}>
                      <button className="mini" onClick={shareInviteLink}>Share the link instead</button>
                    </div>
                  </>
                )}
              </>
            )}
            {sheet.kind === 'rain' && (
              <>
                {event.rainPlan ? (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Your backup: {event.rainPlan}</div>
                ) : (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Open sky and no backup named yet — pick one, or let it be written for you.</div>
                )}
                {rainEditorBlock()}
                {event.rainPlan && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Written for you — every audience</div>
                    <div className="actions-row">
                      <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, wx || null)); } catch { toast('Couldn’t draft the note.'); } }}>Guest note</button>
                      <button className="mini" onClick={() => openDraft('Heads-up for your helpers', rainNoteFor('helpers'))}>Helper heads-up</button>
                      {reconfirmables.length > 0 && <button className="mini" onClick={() => openDraft('Weather note to vendors', rainNoteFor('vendors'))}>Vendor heads-up</button>}
                    </div>
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Three audiences, three notes — same facts, different job: guests get the call, helpers get the shift, vendors get the question. Each opens for editing before anything sends.</p>
                  </>
                )}
                {/* Watch the sky — device notifications while the app is open.
                    LIVE weather only (never the sample), changes only (the
                    first read is a baseline, not news). */}
                {!wx?._sample && (
                  <>
                    <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Watch the sky for me</div>
                    {wxNotify && notifGranted ? (
                      <div className="actions-row">
                        <span className="pill p-ok" style={{ cursor: 'default' }}>Watching<span className="pill-note">you’ll get a ping when it moves</span></span>
                        <button className="mini" onClick={() => setWxNotifyPref(false)}>Stop watching</button>
                      </div>
                    ) : (
                      <div className="actions-row">
                        <button className="mini" onClick={askWxNotify}>Ping me if the forecast moves</button>
                      </div>
                    )}
                    <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>While the app is open, your phone gets a heads-up the moment the risk or timing changes — with your backup named in the ping. Lock-screen alerts land when the installable app ships.</p>
                  </>
                )}
                {/* weatherLogistics — the engine's day-of adjustments sized to
                    the real headcount (ice lb/guest math, shade, tent call). */}
                {wx && (() => {
                  let tips = [];
                  try { tips = weatherLogistics(wx, { guests }) || []; } catch { tips = []; }
                  if (!tips.length) return null;
                  return (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 4px' }}>Sized to your {guests || 'crowd'}</div>
                      {tips.map(t => (
                        <p className="grounding" key={t.key} style={{ margin: '4px 0 0' }}>{t.text}</p>
                      ))}
                      {wx._sample && <p className="grounding" style={{ margin: '6px 0 0', opacity: .65 }}>Numbers from the sample forecast — live weather sharpens them once the key lands.</p>}
                    </>
                  );
                })()}
              </>
            )}
            {sheet.kind === 'draft' && (
              <>
                <div className="chips" style={{ marginBottom: 12 }}>
                  {[['as-written', 'As written'], ['tighter', 'Tighter'], ['warmer', 'Warmer'], ['playful', 'Playful'], ['formal', 'Formal']].map(([k, label]) => (
                    <button key={k} className="chip" aria-pressed={draftBody == null && draftTone === k} onClick={() => { setDraftTone(k); setDraftBody(null); }}>{label}</button>
                  ))}
                  {draftBody != null && <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>Your words</span>}
                </div>
                <textarea className="draft-body draft-edit" value={shownDraft()} aria-label="Edit the draft"
                  onChange={e => setDraftBody(e.target.value)}
                  rows={Math.min(14, shownDraft().split('\n').length + 2)} />
                {/* Real handoffs: the native share sheet (iMessage/WhatsApp/etc.),
                    plus direct sms: and wa.me deep links — no fake "sent" states. */}
                <div className="actions-row" style={{ marginTop: 14 }}>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button className="cta"
                      onClick={() => { navigator.share({ title: sheet.title || 'From your plan', text: shownDraft() }).catch(() => {}); }}>
                      Send it…
                    </button>
                  )}
                  <a className="mini" style={{ textDecoration: 'none' }} href={'sms:?&body=' + encodeURIComponent(shownDraft())}>Text</a>
                  <a className="mini" style={{ textDecoration: 'none' }} href={'https://wa.me/?text=' + encodeURIComponent(shownDraft())} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button className="mini" onClick={() => copyDraft(shownDraft())}>Copy it</button>
                </div>
                {/* "Message all helpers": each person still gets reviewed and
                    sent individually through the real handoffs above — this
                    just queues the rest so working through everyone is one
                    button, not re-opening the list each time. */}
                {sheet.queue && sheet.queue.length > 0 && (
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="cta" onClick={openNextInQueue}>
                      Next: {sheet.queue[0].name} ({sheet.queue.length} left) →
                    </button>
                  </div>
                )}
                <p className="grounding" style={{ marginTop: 10 }}>“Send it…” opens your phone’s own share sheet — pick Messages, WhatsApp, or anywhere else. Voices re-shape the same real details mechanically — and you can edit every word above; your voice choice is remembered for every draft.</p>
              </>
            )}
            {sheet.kind === 'tasks' && (
              (event.timeline || []).length ? (
                <>
                  {(() => {
                    // taskEngine.effectiveDone: a step the event's own facts
                    // already prove handled (date set, caterer booked…) reads as
                    // inferred-done — the checklist never nags about proven work.
                    // Hero copy (host request 2026-07-11): the old "N open of M"
                    // meta line is PROMOTED to the hero. RECON-I3: done counts on
                    // the same effectiveDone-aware basis (isTimelineStepResolved)
                    // as the hero tile, the pill note, and the day-before card.
                    const total = (event.timeline || []).length;
                    const openRows = (event.timeline || []).filter(t => t && !t.done);
                    const inferredN = openRows.filter(t => isTimelineStepResolved(t)).length;
                    const openN = openRows.length - inferredN;
                    const doneN = total - openN;
                    return (
                      <SheetHero
                        eyebrow="Checked off"
                        star={`${doneN} of ${total}`}
                        tone={openN === 0 ? 'ok' : undefined}
                        sub={openN === 0
                          ? 'Every step is handled — the plan has them.'
                          : doneN === 0
                            ? 'Nothing checked yet — check things off and your plan keeps up.'
                            : inferredN
                              ? `${openN} still open · ${inferredN} already handled by your plan — tap to confirm.`
                              : `${openN} still open — check things off and your plan keeps up.`}
                      />
                    );
                  })()}
                  {/* OPEN work gets the rows; DONE work minimizes into a green
                      report line (tap to review) — same green-dot semantics as
                      the handled sections everywhere else. */}
                  {(event.timeline || []).map((t, i) => {
                    if (!t || t.done) return null;
                    const inferred = isTimelineStepResolved(t);
                    return (
                    <button key={t.id || i} className={'frow' + (inferred ? ' got' : '') + (sheet.focus && t.id === sheet.focus ? ' focus-task' : '')}
                      ref={el => { if (el && sheet.focus && t.id === sheet.focus) el.scrollIntoView({ block: 'center' }); }}
                      style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                      onClick={() => toggleTask(i)}>
                      <span className="fcheck" aria-hidden="true" />
                      <span className="f-main">
                        <span className="f-name">{t.task}
                          {inferred ? <span className="tag plan" style={{ color: 'var(--ok)', background: 'var(--ok-tint)' }}>done by your plan — tap to confirm</span> : null}
                          {(() => { // compressed-timeline urgency, the engine's word (never for standard)
                            try {
                              // the engine wants a week→offset map (production's
                              // PHASE_OFFSET); V2 checklists carry T-Nd weeks, so
                              // the map derives from the convention itself.
                              const mm = /T-(\d+)d/i.exec(String(t.week || ''));
                              const po = mm ? { [t.week]: -Number(mm[1]) } : null;
                              const u = days != null && po ? taskUrgencyChip(t, days, event.type, po) : null;
                              return u && u.label ? <span className="tag plan" style={{ color: 'var(--warn)', background: 'var(--warn-tint)' }}>{u.label}</span> : null;
                            } catch { return null; }
                          })()}
                        </span>
                        <span className="v-meta">{[t.week, t.owner].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                    );
                  })}
                  {(event.timeline || []).some(t => t && t.done) && (
                    <>
                      <button className="fold-btn" style={{ color: 'var(--ok)' }} onClick={() => setDoneOpen(o => !o)}>
                        {(event.timeline || []).filter(t => t && t.done).length} done — the plan has them
                        <span className="chev">{doneOpen ? '▾' : '›'}</span>
                      </button>
                      {doneOpen && (event.timeline || []).map((t, i) => (t && t.done) ? (
                        <button key={t.id || i} className="frow got" onClick={() => toggleTask(i)}>
                          <span className="fcheck" aria-hidden="true" />
                          <span className="f-main">
                            <span className="f-name">{t.task}</span>
                            <span className="v-meta">{[t.week, t.owner].filter(Boolean).join(' · ')}</span>
                          </span>
                        </button>
                      ) : null)}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="v-meta" style={{ padding: '14px 2px' }}>No checklist yet — that’s exactly why the plan flagged “catch up.” Draft the real one:</div>
                  <button className="cta" onClick={draftTimeline}>Draft my checklist from the playbook</button>
                </>
              )
            )}
            {sheet.kind === 'food' && (foodPlan ? (
              <>
                {/* PRINCIPLES REDESIGN: summary before detail — the bought count
                    leads (the host's real question: "how much is left to do?"),
                    one grounding line carries the rest of the engine's math. */}
                {foodPlan.hasRealCount ? (() => {
                  const fBand = (() => { try { return attendanceBand(event); } catch { return null; } })();
                  const fBandLbl = (() => { try { return attendanceBandLabel(fBand); } catch { return null; } })();
                  const fGuestPhrase = (fBand && fBand.applicable && fBand.band && fBandLbl) ? fBandLbl : `${foodPlan.bandLow}–${foodPlan.bandHigh}`;
                  const left = foodPlan.itemCount - foodPlan.boughtCount;
                  const done = foodPlan.boughtCount >= foodPlan.itemCount && foodPlan.itemCount > 0;
                  return (
                  <div style={{ padding: '2px 0 14px' }}>
                    {/* Hero copy (host request 2026-07-11): the count is the star,
                        a warm honest line under it — same treatment the guest
                        list hero got. All figures from the real plan. */}
                    <div className="eyebrow">Bought so far</div>
                    <div style={{ fontSize: 'var(--t-hero-star)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, margin: '6px 0 6px', fontVariantNumeric: 'tabular-nums', color: done ? 'var(--ok)' : 'var(--ink)' }}>
                      {foodPlan.boughtCount} of {foodPlan.itemCount}
                    </div>
                    <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)', margin: '0 0 8px', minHeight: 0 }}>
                      {done
                        ? 'Everything’s bought — the spread is covered.'
                        : foodPlan.boughtCount === 0
                          ? 'Nothing’s crossed off yet — one good store run covers all of it.'
                          : left <= 2
                            ? `${left} to go — nearly there.`
                            : `${left} still to grab — check things off as you shop.`}
                    </p>
                    <p className="grounding" style={{ margin: 0 }}>
                      Food {fmt(foodPlan.foodLow)}–{fmt(foodPlan.foodHigh)} · supplies {fmt(foodPlan.suppliesLow)}–{fmt(foodPlan.suppliesHigh)} · {fmt(foodPlan.perGuestLow)}–{fmt(foodPlan.perGuestHigh)} a head, sized for {fGuestPhrase} guests.
                    </p>
                  </div>
                  );
                })() : (
                  <p className="grounding" style={{ margin: '2px 0 12px' }}>
                    Sized to a typical guess for now — set a real guest count and the dollars appear.
                  </p>
                )}
                {/* Meal tally (guests parity gap #5): what guests actually picked —
                    the same guest.meal field RSVPs, CSV imports, and the per-guest
                    meal edit write. Rendered ONLY once at least one real answer
                    exists; no invented zeros. */}
                {(() => {
                  const gs = event.guests || [];
                  const counts = {};
                  gs.forEach(g => {
                    const m = String((g && g.meal) || '').trim();
                    if (m && m !== '—') counts[m] = (counts[m] || 0) + 1;
                  });
                  const answered = Object.values(counts).reduce((a, b) => a + b, 0);
                  if (!answered) return null;
                  const un = gs.length - answered;
                  // Stable order: the invite's own meal choices first, then any
                  // free-text meals a CSV brought in.
                  const order = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];
                  const keys = [...order.filter(k => counts[k]), ...Object.keys(counts).filter(k => !order.includes(k))];
                  return (
                    <p className="grounding" style={{ margin: '0 0 12px' }}>
                      Meal picks so far: {keys.map(k => `${k} ${counts[k]}`).join(' · ')}{un > 0 ? ` · ${un} unanswered` : ''}.
                    </p>
                  );
                })()}
                {/* Menu decisions — the playbook's real choices; picking one re-sizes
                    and re-prices the spread through the same engine. */}
                {(() => {
                  // Keys must match the engine's DIET_KEYWORDS table verbatim ('Shellfish',
                  // not 'Shellfish allergy') — dietCounts keys ARE the flag lookup keys.
                  const dc = event.dietCounts || {};
                  const anyDiet = DIET_TAGS.some(k => Number(dc[k]) > 0) || Object.keys(dc).some(k => !DIET_TAGS.includes(k) && Number(dc[k]) > 0);
                  const setD = (k, delta) => {
                    const n = Math.max(0, (Number(dc[k]) || 0) + delta);
                    patchEvent({ dietCounts: { ...dc, [k]: n } },
                      n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
                  };
                  const setCount = (k, n) => {
                    const next = { ...dc };
                    if (n > 0) next[k] = n; else delete next[k];
                    patchEvent({ dietCounts: next }, n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
                  };
                  const dietOpen = !!foodSect.diet || sheet.focus === 'diet';
                  if (!dietOpen) {
                    return null; // folded into the status strip below — see fstatusStrip
                  }
                  // Guest-needs reconciliation (parity: App.js:10827-10836) — what the
                  // RSVPs already told the host, mapped to the same DIET_TAGS vocabulary,
                  // so a per-guest free-text note doesn't have to be re-typed here.
                  const guestDiet = {};
                  const addNeeds = (str) => {
                    const seen = new Set();
                    String(str || '').split(',').map(x => x.trim()).filter(Boolean).forEach(p => {
                      const tag = dietTagFor(p);
                      if (tag && !seen.has(tag)) { seen.add(tag); guestDiet[tag] = (guestDiet[tag] || 0) + 1; }
                    });
                  };
                  (event.guests || []).forEach(g => { if (!g) return; addNeeds(g.needs); addNeeds(g.plusOneNeeds); });
                  const pending = Object.entries(guestDiet).filter(([d, n]) => (Number(dc[d]) || 0) < n);
                  const pullFromGuests = () => {
                    const next = { ...dc };
                    Object.entries(guestDiet).forEach(([d, n]) => { next[d] = Math.max(Number(next[d]) || 0, n); });
                    patchEvent({ dietCounts: next, dietMergeUndo: dc }, 'Merged from your RSVPs.');
                  };
                  const customDiets = Object.keys(dc).filter(d => !DIET_TAGS.includes(d) && (Number(dc[d]) || 0) > 0);
                  const active = [...DIET_TAGS, ...customDiets].filter(d => (Number(dc[d]) || 0) > 0);
                  const activeLower = new Set(active.map(d => d.toLowerCase()));
                  const inactive = DIET_TAGS.filter(d => (Number(dc[d]) || 0) <= 0 && !activeLower.has(d.toLowerCase()));
                  const otherQuick = showMoreDiets ? inactive : inactive.slice(0, 2);
                  const rest = showMoreDiets ? [] : inactive.slice(2);
                  const totalActive = active.reduce((s, d) => s + (Number(dc[d]) || 0), 0);
                  const addCustomDiet = () => {
                    const name = dietOtherName.trim();
                    if (!name) { setDietOtherOpen(false); return; }
                    setCount(name, Math.max(1, Number(dc[name]) || 1));
                    setDietOtherName(''); setDietOtherOpen(false);
                  };
                  const stepper = (k) => {
                    const n = Number(dc[k]) || 0;
                    return (
                      <div key={k} className="line" style={{ padding: '6px 0' }}>
                        <span style={{ color: n > 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: n > 0 ? 650 : 500 }}>{k}</span>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="mini" onClick={() => setD(k, -1)} disabled={n <= 0} aria-label={'Fewer ' + k}>−</button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{n}</span>
                          <button className="mini" onClick={() => setD(k, 1)} aria-label={'More ' + k}>+</button>
                        </span>
                      </div>
                    );
                  };
                  // Closes the panel regardless of how it opened. dietOpen is an OR of
                  // foodSect.diet and sheet.focus==='diet' (a deep-link entry, e.g. from
                  // an fp-diet nudge) — clearing only foodSect.diet left the panel stuck
                  // open whenever it was opened via the deep-link path (found live).
                  const closeDiet = () => {
                    setFoodSect(m => ({ ...m, diet: false }));
                    if (sheet.focus === 'diet') setSheet(s => ({ ...s, focus: null }));
                  };
                  return (
                    <div className={'brow' + (sheet.focus === 'diet' ? ' rowfocus' : '')} style={{ marginBottom: 12, borderRadius: 12, padding: '8px 6px' }}>
                      <div className="shelf-label" style={{ marginBottom: 6 }}>
                        Dietary needs {anyDiet ? '' : '— none counted yet'}
                        <button className="mini" style={{ marginLeft: 8 }} onClick={closeDiet}>done</button>
                      </div>
                      {active.length > 0 && (
                        <>
                          <div className="v-meta" style={{ marginTop: 4 }}>Active{totalActive > 0 ? ' — ' + totalActive + (totalActive === 1 ? ' guest' : ' guests') : ''}</div>
                          {active.map(stepper)}
                        </>
                      )}
                      {otherQuick.length > 0 && (
                        <>
                          <div className="v-meta" style={{ marginTop: active.length > 0 ? 10 : 4 }}>Other — tap to set a count</div>
                          {otherQuick.map(stepper)}
                        </>
                      )}
                      {rest.length > 0 && (
                        <button className="mini" style={{ marginTop: 6 }} onClick={() => setShowMoreDiets(true)}>
                          + {rest.length} more — {rest.slice(0, 4).join(' · ')}{rest.length > 4 ? ' …' : ''}
                        </button>
                      )}
                      {dietOtherOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <input className="field" autoFocus value={dietOtherName} placeholder="Name it…"
                            onChange={e => setDietOtherName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addCustomDiet(); if (e.key === 'Escape') { setDietOtherName(''); setDietOtherOpen(false); } }} />
                          <button className="mini" onClick={addCustomDiet}>Add</button>
                        </div>
                      ) : (
                        <button className="mini" style={{ marginTop: 8 }} onClick={() => setDietOtherOpen(true)}>+ Other</button>
                      )}
                      {pending.length > 0 && (
                        <button className="later-row" style={{ marginTop: 10, width: '100%', textAlign: 'left', background: 'var(--steel-tint)', border: 'none', borderRadius: 9, padding: '9px 12px', cursor: 'pointer' }}
                          onClick={pullFromGuests}>
                          <span className="t" style={{ color: 'var(--ink)' }}>From your RSVPs</span>
                          <span className="v-meta" style={{ flex: 1 }}>{pending.map(([d, n]) => d + ' ×' + n).join(' · ')}</span>
                          <span style={{ color: 'var(--steel-soft)', fontWeight: 700, flexShrink: 0 }}>Add →</span>
                        </button>
                      )}
                      {event.dietMergeUndo && (
                        <button className="mini" style={{ marginTop: 8 }} onClick={() => patchEvent({ dietCounts: event.dietMergeUndo, dietMergeUndo: null }, 'Merge undone.')}>
                          ✓ Merged from your RSVPs — Undo
                        </button>
                      )}
                      <p className="grounding" style={{ margin: '10px 0 0' }}>
                        Vegetarian + vegan counts add a real, priced main below; the others flag the lines to double-check.
                        {!event.dietaryNoted && <span> </span>}
                        {!event.dietaryNoted && (
                          <button className="mini" onClick={() => { patchEvent({ dietaryNoted: true }, 'Dietary needs noted — the menu is good to go.'); closeDiet(); }}>That’s everyone — noted</button>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {(foodPlan.choices || []).length > 0 && (() => {
                  const openN = (foodPlan.choices || []).filter(c => !((event.foodChoices || {})[c.id])).length;
                  const open = !!foodSect.choices;
                  void openN;
                  return null; // folded into the status strip below
                })()}
                {/* ONE compact status strip replaces two heavy fold-rows — the
                    same information, without the wall-of-rows drift. */}
                {(() => {
                  const dc = event.dietCounts || {};
                  const anyDiet = DIET_TAGS.some(k => Number(dc[k]) > 0) || Object.keys(dc).some(k => !DIET_TAGS.includes(k) && Number(dc[k]) > 0);
                  const dietOpen = !!foodSect.diet || sheet.focus === 'diet';
                  const openN = (foodPlan.choices || []).filter(c => !((event.foodChoices || {})[c.id])).length;
                  const choicesOpen = !!foodSect.choices;
                  const hasChoices = (foodPlan.choices || []).length > 0;
                  if (dietOpen || choicesOpen) return null; // the expanded panel above already shows it
                  return (
                    <div className="fstatus-row">
                      <button className="fstatus" onClick={() => setFoodSect(m => ({ ...m, diet: true }))}>
                        <div className="fs-l">Dietary needs</div>
                        <div className="fs-v" style={{ color: anyDiet || event.dietaryNoted ? 'var(--ok)' : 'var(--muted)' }}>
                          {anyDiet ? 'noted · ' + DIET_TAGS.filter(k => Number(dc[k]) > 0).length + ' flagged' : event.dietaryNoted ? 'noted' : 'none yet ›'}
                        </div>
                      </button>
                      {hasChoices && (
                        <button className="fstatus" onClick={() => setFoodSect(m => ({ ...m, choices: true }))}>
                          <div className="fs-l">Your choices</div>
                          <div className="fs-v" style={{ color: openN > 0 ? 'var(--warn)' : 'var(--ok)' }}>{openN > 0 ? openN + ' open ›' : 'all set'}</div>
                        </button>
                      )}
                    </div>
                  );
                })()}
                {(foodPlan.choices || []).length > 0 && !!foodSect.choices && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 8px' }}>
                      Your choices
                      <button className="mini" style={{ marginLeft: 8 }} onClick={() => { setFoodSect(m => ({ ...m, choices: false })); setChoiceOpen(null); }}>done</button>
                    </div>
                    {foodPlan.choices.map(d => {
                      // AUTO-COLLAPSE (host request): a made choice folds to its
                      // settled line; when the LAST one lands the whole section
                      // closes itself — done work never keeps the room.
                      const picked = (event.foodChoices || {})[d.id];
                      if (picked && choiceOpen !== d.id) {
                        return (
                          <div key={d.id} className="line" style={{ alignItems: 'center' }}>
                            <span>{d.label}</span>
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="of" style={{ color: 'var(--ok)', fontWeight: 600 }}>{picked}</span>
                              <button className="mini" onClick={() => setChoiceOpen(d.id)}>change</button>
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={d.id} style={{ marginBottom: 12 }}>
                          <div className="f-name" style={{ marginBottom: 6 }}>{d.label}</div>
                          <div className="chips">
                            {(d.options || []).map(opt => (
                              <button key={opt} className="chip" aria-pressed={(d.chosen || d.default) === opt}
                                onClick={() => {
                                  const nextChoices = { ...(event.foodChoices || {}), [d.id]: opt };
                                  const stillOpen = (foodPlan.choices || []).filter(c => !nextChoices[c.id]).length;
                                  patchEvent({ foodChoices: nextChoices },
                                    stillOpen === 0
                                      ? d.label + ': ' + opt + ' — that was the last call. The spread is fully priced.'
                                      : d.label + ': ' + opt + ' — the spread just re-sized.');
                                  setChoiceOpen(null);
                                  if (stillOpen === 0) setFoodSect(m => ({ ...m, choices: false }));
                                }}>{opt}</button>
                            ))}
                          </div>
                          {d.why && <p className="grounding" style={{ marginTop: 5 }}>{d.why}</p>}
                        </div>
                      );
                    })}
                  </>
                )}
                <div className="actions-row" style={{ margin: '0 0 6px' }}>
                  <button className="mini" onClick={() => {
                    // Was called with no items/anchor at all — the store-locator
                    // map links and every line's qty/store came back empty (found
                    // in the 2026-07-11 food-plan audit). foodShopItems/eventGeoQuery
                    // are the same shared engines legacy's "Copy the shopping list"
                    // reads (App.js:10614-10615), so both apps build the identical list.
                    let shopItems = []; try { shopItems = foodShopItems(foodPlan, event); } catch { shopItems = []; }
                    let anchor = ''; try { anchor = eventGeoQuery(event, profile); } catch { anchor = ''; }
                    openDraft('Your shopping list', draftShoppingList(event, profile, { items: shopItems, anchor }));
                  }}>Copy the shopping list</button>
                  <button className="mini" onClick={() => { try { openDraft('Dietary note', draftDietaryNote(event, profile)); } catch { toast('Couldn’t draft it.'); } }}>Dietary note</button>
                </div>
                {nudgeFor('food')}
                {/* Sourcing tier — the plan's real cook/order axis; switching
                    re-prices proteins and changes where each line says to buy. */}
                {(foodPlan.sourcingTiers || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 8px' }}>How it’s sourced</div>
                    {(() => {
                      const key = foodPlan.sourcingKey;
                      const byTier = (key && key.byTier) || {};
                      const curCost = byTier[foodPlan.sourcing] || 0;
                      return (foodPlan.sourcingTiers || []).map(t => {
                        if (!t) return null;
                        const id = t.id || t.key;
                        const on = foodPlan.sourcing === id;
                        const cost = byTier[id] || 0;
                        // Decision delta vs the CURRENT tier — the same honest-empty rule
                        // as the legacy card: only shown when both sides have a real number.
                        const delta = cost - curCost;
                        const deltaLabel = (!on && cost && curCost && delta !== 0)
                          ? (delta < 0 ? ' · saves ~' + fmt(Math.abs(delta)) : ' · ~' + fmt(Math.abs(delta)) + ' more')
                          : '';
                        return (
                          <button key={id} className="line" aria-pressed={on}
                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 0', alignItems: 'flex-start' }}
                            onClick={() => patchEvent({ sourcing: id }, 'Sourcing: ' + (t.label || id) + ' — proteins re-priced, stores updated.')}>
                            <span style={{ flex: 1 }}>
                              <span className="vc-name" style={{ display: 'block' }}>{t.label || id}</span>
                              {(t.note || cost > 0) && (
                                <span className="grounding" style={{ display: 'block', margin: '2px 0 0' }}>
                                  {t.note}{t.note && cost > 0 ? ' · ' : ''}
                                  {cost > 0 ? '~' + fmt(cost) + ' ' + String((key && key.item) || '').toLowerCase() : ''}
                                  {deltaLabel}
                                </span>
                              )}
                            </span>
                            {/* "current" used steel-soft vs muted's near-identical blue-gray
                                (both from the same hue family) — nearly invisible distinction.
                                --ok is already the app's "this is the active/confirmed one"
                                signal everywhere else (RSVP Yes, vendor Confirmed); reusing it
                                here instead of a second steel tone (found 2026-07-11). */}
                            <span className="of" style={{ flexShrink: 0, marginLeft: 8, fontWeight: on ? 700 : 550, color: on ? 'var(--ok)' : 'var(--muted)' }}>{on ? 'current' : 'switch'}</span>
                          </button>
                        );
                      });
                    })()}
                    <p className="grounding" style={{ marginBottom: 10 }}>The tier re-prices the proteins and changes where each line says to buy.</p>
                  </>
                )}
                {/* Bulk price-lock — parity with legacy's "Use typical prices for
                    the other N items →" (App.js ~11040-11060). Locks every still-
                    estimated line to the ENGINE's own honest midpoint
                    ((low+high)/2) — never a new number. Skips supplies, custom
                    (added) items, skipped lines, and anything already locked or
                    unpriced (no low/high at all) — same gate as legacy, so both
                    apps agree on which lines qualify. */}
                {(() => {
                  const supplGroup = ((foodPlan && foodPlan.groups) || []).find(g => /suppl|paper|setup|gear/i.test(String(g)));
                  const unpriced = (foodPlan.list || []).filter(it => it && !it.skipped && it.group !== supplGroup && it.locked == null && !it.added && (Number(it.low) || Number(it.high)));
                  if (bulkPriced && bulkPriced.length > 0) {
                    const undo = () => {
                      const next = { ...(event.foodLocked || {}) };
                      bulkPriced.forEach(id => delete next[id]);
                      patchEvent({ foodLocked: next }, 'Undid the typical-price lock.');
                      setBulkPriced(null);
                    };
                    return (
                      <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                        <span className="of" style={{ color: 'var(--ok)', fontWeight: 700 }}>Used typical prices for {bulkPriced.length}</span>
                        <button className="mini" onClick={undo}>Undo</button>
                      </div>
                    );
                  }
                  if (unpriced.length < 2) return null;
                  const priceAll = () => {
                    const next = { ...(event.foodLocked || {}) };
                    const ids = unpriced.map(it => it.id);
                    unpriced.forEach(it => { next[it.id] = Math.round(((Number(it.low) || 0) + (Number(it.high) || 0)) / 2); });
                    patchEvent({ foodLocked: next }, 'Locked ' + ids.length + ' item' + (ids.length === 1 ? '' : 's') + ' to typical prices.');
                    setBulkPriced(ids);
                  };
                  return (
                    <button className="mini" style={{ marginBottom: 10 }} onClick={priceAll}>
                      Lock the rest to typical prices ({unpriced.length}) →
                    </button>
                  );
                })()}
                {(() => {
                  // Skipped lines stay IN the list (parity with legacy's toggleSkip —
                  // App.js:11145 — which keeps a skipped line visible with strikethrough
                  // and a single toggle back). V2 used to filter them out entirely, so a
                  // "skip it" tap made the line vanish with no way back (found in the
                  // 2026-07-11 food-plan audit). Cost/progress math still excludes
                  // skipped lines — the engine's own itemCount/boughtCount already do
                  // (lib/playbooks/index.js:2374) — this just stops hiding the row.
                  const allItems = (foodPlan.list || []).filter(Boolean);
                  // ── Shopping-run mode: "I'm at X" — the list collapses to THIS
                  // store's unbought lines with a walk-in total. Store truth =
                  // the host's pick (foodWhere) first, else the plan's buyAt /
                  // first where option. Session-only; never an event write.
                  const storeOf = (it) => (event.foodWhere || {})[it.id] || (Array.isArray(it.where) && it.where[0]) || null; // buyAt is WHEN, never a store
                  const activeAll = allItems.filter(it => !it.skipped);
                  const stores = [...new Set(activeAll.map(storeOf).filter(Boolean))];
                  const inStore = (it) => !shopStore || storeOf(it) === shopStore || (Array.isArray(it.where) && it.where.includes(shopStore));
                  const items = shopStore ? activeAll.filter(inStore) : allItems;
                  const runLeft = shopStore ? items.filter(it => !(event.foodGot || {})[it.id]) : [];
                  const runLo = runLeft.reduce((t, it) => t + (Number(it.locked != null ? it.locked : it.low) || 0), 0);
                  const runHi = runLeft.reduce((t, it) => t + (Number(it.locked != null ? it.locked : it.high) || 0), 0);
                  const groups = (foodPlan.groups && foodPlan.groups.length ? foodPlan.groups : [...new Set(items.map(it => it.group || 'Other'))]);
                  // Decision flags: a menu decision the host hasn't explicitly
                  // made yet marks every line it re-prices (playbook `affects`).
                  const undecidedAffects = (() => { try { return playbookOpenDecisionAffects(event); } catch { return {}; } })();
                  const groupRows = groups.map(g => {
                    const gItems = items.filter(it => (it.group || 'Other') === g);
                    if (!gItems.length) return null;
                    const gActive = gItems.filter(it => !it.skipped);
                    const gBought = gActive.filter(it => (event.foodGot || {})[it.id]).length;
                    const gLow = gActive.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.low) || 0), 0);
                    const gHigh = gActive.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.high) || 0), 0);
                    const gDecisions = gActive.filter(it => undecidedAffects[it.id]).length;
                    // Accordion (never-dense): a group opens when tapped, when a
                    // deep-link targets one of its lines, or while tuning one.
                    const focusHere = gItems.some(it => it.id === sheet.focus || it.id === foodTune);
                    const isOpen = !!foodGroupsOpen[g] || focusHere || !!shopStore; // run mode opens the shelves
                    const gDone = gBought === gActive.length;
                    return (
                    <div key={g} className={'fgroup' + (isOpen ? ' open' : '')}>
                      <button className="fg-head" onClick={() => setFoodGroupsOpen(m => ({ ...m, [g]: !isOpen }))}>
                        <div className={'fg-badge' + (gDone ? ' done' : '')} aria-hidden>{g.trim().charAt(0).toUpperCase()}</div>
                        <div className="fg-id">
                          <div className="fg-label">{g}
                            {gDecisions > 0 ? <span className="tag essential" style={{ marginLeft: 8 }}>{gDecisions} decision{gDecisions === 1 ? '' : 's'} open</span> : null}
                          </div>
                          <div className="fg-sub" style={{ color: gDone ? 'var(--ok)' : 'var(--muted)' }}>
                            {!gActive.length ? 'all skipped' : gDone ? 'all ' + gActive.length + ' bought' : gBought + ' of ' + gActive.length + ' bought' + (foodPlan.hasRealCount ? ' · ' + fmt(gLow) + '–' + fmt(gHigh) : '')}
                          </div>
                          <div className={'fg-track' + (gDone ? ' done' : '')}><i style={{ width: (gActive.length ? gBought / gActive.length * 100 : 100) + '%' }} /></div>
                        </div>
                        <span className="fg-chev">›</span>
                      </button>
                      <div className="fg-items">
                      {isOpen && gItems.map((it, i) => {
                        const got = !!(event.foodGot || {})[it.id];
                        const cost = it.locked != null ? Number(it.locked) : ((Number(it.low) || 0) + (Number(it.high) || 0)) / 2;
                        const tuning = foodTune === it.id;
                        // Keep the FULL normalized alt (name + unitCostRange) — not just its
                        // name — so the chip below can show what picking it would cost, not
                        // just its label. Same parser the engine's own swap re-pricing uses
                        // (lib/playbooks/index.js normalizeAlternative), so a plain-string
                        // alt (no unitCostRange) and a priced object alt both land in one shape.
                        const alts = (it.alternatives || []).map(normalizeAlternative).filter(a => a.name).slice(0, 4);
                        const activeSwapName = (event.foodSwap || {})[it.id] || null;
                        return (
                          <div key={it.id}>
                            <button className={'frow' + (got ? ' got' : '') + (it.skipped ? ' skipped' : '')}
                              style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                              onClick={() => {
                                // Skipped rows stay visible (see the audit note above);
                                // tapping one is the undo — the same single-toggle
                                // symmetry legacy's toggleSkip uses (App.js:11145).
                                if (it.skipped) {
                                  const m = { ...(event.foodSkip || {}) }; delete m[it.id];
                                  patchEvent({ foodSkip: m }, (it.short || it.item) + ' is back — the total just picked it up again.');
                                  return;
                                }
                                toggleGot(it, cost);
                              }}>
                              <span className="fcheck" aria-hidden="true" />
                              <span className="f-main">
                                <span className="f-name" style={it.skipped ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                                  {it.short || it.item}
                                  {it.skipped ? <span className="tag plan">skipped — tap to restore</span> : null}
                                  {/* Host-added line (event.foodAdd) — who's bringing it, if named. */}
                                  {!it.skipped && it.added && it.owner ? <span className="tag plan">{it.owner}</span> : null}
                                  {!it.skipped && it.added && !it.owner ? <span className="tag plan">yours</span> : null}
                                  {!it.skipped && it.swappedFrom ? <span className="tag plan">swapped</span> : null}
                                  {!it.skipped && undecidedAffects[it.id] ? <span className="tag essential" title={undecidedAffects[it.id]}>decision open</span> : null}
                                  {!it.skipped && it.essential && !got ? <span className="tag essential">essential</span> : null}
                                  {!it.skipped && it.badge ? <span className="tag plan">{String(it.badge).toLowerCase()}</span> : null}
                                  {!it.skipped && it.buyAt === 'day-of' ? <span className="tag essential">day-of</span> : null}
                                  {/* Engine dietary heads-up (dietFlags: roster needs +
                                      dietCounts, keyword-matched) — "watch this", never
                                      a hard contains-X claim. */}
                                  {Array.isArray(it.dietFlags) && it.dietFlags.length ? <span className="tag essential">{it.dietFlags.join(' · ').toLowerCase()}</span> : null}
                                </span>
                                <span className="v-meta">
                                  {[
                                    it.qty && it.unit ? `${it.qty} ${it.unit}` : null,
                                    foodPlan.hasRealCount && it.unitBase && it.perUnitLow ? `${fmt(it.perUnitLow)}–${fmt(it.perUnitHigh)}/${it.unitBase}` : null,
                                    (event.foodWhere || {})[it.id] ? 'your pick: ' + (event.foodWhere || {})[it.id] : (Array.isArray(it.where) ? it.where.join(',') : it.where),
                                  ].filter(Boolean).join(' · ')}
                                </span>
                                {/* The "because" behind the quantity (it.basis, the
                                    shared engine's already-formatted rate string —
                                    lib/quantities/quantityBasis.js) and the "often
                                    forgotten" heads-up (it.forgotten) — both read by
                                    legacy's food card, neither rendered in V2 before
                                    (found in the 2026-07-11 food-plan audit). Muted
                                    text, not accent color: informational, not
                                    interactive (UX_02 color-restraint doctrine) — a
                                    deliberate change from legacy's steel-colored
                                    treatment of "forgotten". */}
                                {(it.basis || it.forgotten) && (
                                  <span className="v-meta" style={{ display: 'block', marginTop: 2 }}>
                                    {[it.basis ? it.basis + ' · typical' : null, it.forgotten ? 'often forgotten' : null].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </span>
                              {/* Frictionless price entry: the amount itself is the
                                  input, not a link to a panel two taps away. Tap the
                                  estimate range, type what you actually paid, Enter or
                                  tap away commits it — same foodLocked write the old
                                  "tune → set it" flow used, just without the detour.
                                  Locked (already-real) prices still route through tune
                                  to reach "back to estimate" — editing a committed
                                  number is the rarer path and can afford one more tap. */}
                              {tuning && it.locked == null ? (
                                <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <input className="field" style={{ width: 72, fontSize: 'var(--t-input)', padding: '4px 8px' }} type="number" min="0"
                                    inputMode="decimal" placeholder="$ paid" autoFocus
                                    aria-label={'Real cost for ' + (it.short || it.item)}
                                    value={tuneCost} onChange={e => setTuneCost(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && parseFloat(tuneCost) >= 0 && tuneCost !== '') {
                                        const n = Math.max(0, Math.round(parseFloat(tuneCost) || 0));
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n } },
                                          (it.short || it.item) + ' set at ' + fmt(n) + ' — a real price now, not a range.');
                                        setTuneCost(''); setFoodTune(null);
                                      } else if (e.key === 'Escape') { setTuneCost(''); setFoodTune(null); }
                                    }}
                                    onBlur={() => {
                                      if (parseFloat(tuneCost) >= 0 && tuneCost !== '') {
                                        const n = Math.max(0, Math.round(parseFloat(tuneCost) || 0));
                                        patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n } },
                                          (it.short || it.item) + ' set at ' + fmt(n) + ' — a real price now, not a range.');
                                        setTuneCost('');
                                      }
                                    }} />
                                </span>
                              ) : (
                                <span className="amt" role="button" tabIndex={0}
                                  onClick={e => { e.stopPropagation(); setTuneCost(''); setFoodTune(it.id); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setTuneCost(''); setFoodTune(it.id); } }}
                                  title="Tap to enter the real price">
                                  {/* Host-added lines carry a single committed cost (event.foodAdd's
                                      cost — never a range), so no invented spread. Blank/$0 at add
                                      time is an honest state, not a fake number: "bringing it" when
                                      someone's named (their name already shows as its own tag chip
                                      next to the item name — repeating it here made this span too
                                      wide and collided with a long wrapped item name, found live
                                      testing this feature), "no cost yet" otherwise. Never displayed
                                      as "$0–$0". Same honesty rule legacy's money() helper applies
                                      (App.js ~11246-11250). */}
                                  {it.locked != null
                                    ? fmt(it.locked)
                                    : it.added
                                      ? (it.low > 0 ? fmt(it.low) : (it.owner ? 'bringing it' : 'no cost yet'))
                                      : (foodPlan.hasRealCount ? fmt(it.low) + '–' + fmt(it.high) : '—')}
                                </span>
                              )}
                              <span className="mini" role="button" tabIndex={0} style={{ marginLeft: 6 }}
                                onClick={e => { e.stopPropagation(); setFoodTune(tuning ? null : it.id); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setFoodTune(tuning ? null : it.id); } }}>
                                {tuning ? 'more' : 'tune'}
                              </span>
                              {/* Host-added lines are fully deletable (not just skippable) —
                                  parity with legacy's removeAdded (App.js ~11122). */}
                              {it.added && (
                                <span className="mini" role="button" tabIndex={0} style={{ marginLeft: 6 }}
                                  title={'Remove ' + (it.short || it.item)}
                                  onClick={e => {
                                    e.stopPropagation();
                                    patchEvent({ foodAdd: (event.foodAdd || []).filter(a => a.id !== it.id) },
                                      (it.short || it.item) + ' removed.');
                                  }}
                                  onKeyDown={e => {
                                    if (e.key !== 'Enter') return;
                                    e.stopPropagation();
                                    patchEvent({ foodAdd: (event.foodAdd || []).filter(a => a.id !== it.id) },
                                      (it.short || it.item) + ' removed.');
                                  }}>
                                  remove
                                </span>
                              )}
                            </button>
                            {tuning && (
                              <div className="brow" style={{ margin: '2px 0 8px', paddingLeft: 30 }}>
                                {/* COST STRUCTURE, per item — the engine's own knobs:
                                    size it (foodQty re-prices), swap it (alternatives
                                    carry their own real ranges), or skip it. */}
                                <div className="actions-row" style={{ alignItems: 'center' }}>
                                  <span className="of">size:</span>
                                  <button className="mini" onClick={() => {
                                    const q = Math.max(0, (Number(it.qty) || 0) - 1);
                                    patchEvent({ foodQty: { ...(event.foodQty || {}), [it.id]: q } }, 'Sized to ' + q + ' ' + (it.unit || '') + ' — the cost just moved.');
                                  }}>−</button>
                                  <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{it.qty} {it.unit}</span>
                                  <button className="mini" onClick={() => {
                                    const q = (Number(it.qty) || 0) + 1;
                                    patchEvent({ foodQty: { ...(event.foodQty || {}), [it.id]: q } }, 'Sized to ' + q + ' ' + (it.unit || '') + ' — the cost just moved.');
                                  }}>+</button>
                                  <button className="mini" onClick={() => {
                                    if (it.skipped) {
                                      const m = { ...(event.foodSkip || {}) }; delete m[it.id];
                                      patchEvent({ foodSkip: m }, (it.short || it.item) + ' is back — the total just picked it up again.');
                                    } else {
                                      patchEvent({ foodSkip: { ...(event.foodSkip || {}), [it.id]: true } }, (it.short || it.item) + ' skipped — the total just dropped.');
                                    }
                                  }}>{it.skipped ? 'restore it' : 'skip it'}</button>
                                </div>
                                {/* Real-cost entry now lives inline on the row itself
                                    (tap the amount) — the frictionless path. This stays
                                    only for the already-locked reset case; "back to
                                    estimate" has no other home. */}
                                {it.locked != null && (
                                  <div className="actions-row" style={{ marginTop: 8, alignItems: 'center' }}>
                                    <span className="of">cost:</span>
                                    <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>set at {fmt(it.locked)}</span>
                                    <button className="mini" onClick={() => {
                                      const m = { ...(event.foodLocked || {}) }; delete m[it.id];
                                      patchEvent({ foodLocked: m }, (it.short || it.item) + ' back to the estimate range.');
                                    }}>back to estimate</button>
                                  </div>
                                )}
                                {Array.isArray(it.where) && it.where.length > 1 && (
                                  <div className="chips" style={{ marginTop: 8 }}>
                                    {it.where.slice(0, 4).map(w => (
                                      <button key={w} className="chip" aria-pressed={(event.foodWhere || {})[it.id] === w}
                                        onClick={() => {
                                          // Store pick still isn't a "paid" price (cost-truth
                                          // gate — that's foodLocked, only set on an actual
                                          // purchase). But for a protein with a real per-channel
                                          // price (sourcingPrices / canonicalProteinPrice, the
                                          // same cited data the plan-wide sourcing tier uses),
                                          // the engine now repriced THIS line's estimate to that
                                          // channel the moment it's picked — was display-only
                                          // before (2026-07-11 food-plan audit). Never invents a
                                          // number for stores without sourced data.
                                          patchEvent({ foodWhere: { ...(event.foodWhere || {}), [it.id]: w } },
                                            'Buying at ' + w + ' — estimate re-priced to that channel when we have real numbers for it.');
                                        }}>
                                        {w}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {(alts.length > 0 || it.swappedFrom) && (
                                  <div className="chips" style={{ marginTop: 8 }}>
                                    {it.swappedFrom && (
                                      <button className="chip" onClick={() => {
                                        const m = { ...(event.foodSwap || {}) }; delete m[it.id];
                                        patchEvent({ foodSwap: m }, 'Back to ' + it.swappedFrom + ' — original pricing restored.');
                                      }}>back to {it.swappedFrom}</button>
                                    )}
                                    {alts.map(na => {
                                      const name = na.name;
                                      const isActive = activeSwapName === name;
                                      // A plain-string alt (no unitCostRange) keeps the line's
                                      // current cost when swapped — no delta to show, honestly.
                                      // A priced alt re-prices to units × ITS OWN range, the same
                                      // math the engine applies on swap (playbookFoodPlan). Only
                                      // shown when there's a real quantity + current cost to
                                      // compare against (same honest-empty rule as the sourcing-
                                      // tier delta above) and it isn't the alt already active.
                                      const altCost = (!isActive && foodPlan.hasRealCount && Array.isArray(na.unitCostRange) && it.units)
                                        ? (Number(it.units) || 0) * ((Number(na.unitCostRange[0]) || 0) + (Number(na.unitCostRange[1]) || 0)) / 2
                                        : null;
                                      const delta = (altCost != null && cost) ? Math.round(altCost - cost) : null;
                                      const deltaLabel = (delta != null && delta !== 0)
                                        ? (delta < 0 ? ' · saves ~' + fmt(Math.abs(delta)) : ' · ~' + fmt(Math.abs(delta)) + ' more')
                                        : '';
                                      return (
                                        <button key={name} className="chip" onClick={() => patchEvent({ foodSwap: { ...(event.foodSwap || {}), [it.id]: name } }, 'Swapped to ' + name + ' — priced with its own real range.')}>
                                          {name}{deltaLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                    );
                  });
                  return (
                    <>
                      {stores.length > 1 && (
                        <>
                        <div className="shelf-label" style={{ margin: '10px 0 6px' }}>Shopping at</div>
                        <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {stores.slice(0, 5).map(s => (
                            <button key={s} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={shopStore === s}
                              onClick={() => setShopStore(shopStore === s ? null : s)}>{shopStore === s ? 'At ' + s : s}</button>
                          ))}
                          {shopStore && <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} onClick={() => setShopStore(null)}>Everything</button>}
                        </div>
                        </>
                      )}
                      {shopStore && (
                        <p className="grounding" style={{ margin: '0 0 10px' }}>
                          {runLeft.length === 0
                            ? 'Everything for ' + shopStore + ' is bought — nothing left on this run.'
                            : runLeft.length + ' line' + (runLeft.length === 1 ? '' : 's') + ' left at ' + shopStore + ' — walk in expecting about ' + fmt(runLo) + (runHi > runLo ? '–' + fmt(runHi) : '') + '. Checking off asks the real price.'}
                        </p>
                      )}
                      {groupRows}
                    </>
                  );
                })()}
                {(foodPlan.specialDiets || []).length > 0 && (
                  <p className="grounding" style={{ marginTop: 10 }}>
                    Dietary: {foodPlan.specialDiets.map(d => d.count + ' ' + d.diet).join(', ')} — a real named main is sized into the totals for them.
                  </p>
                )}
                {/* Add your own line — closes the remove/add asymmetry legacy already
                    fixed (App.js ~11415-11457): a dish someone's bringing, or anything
                    off-playbook the host is buying. Name required; who's bringing it +
                    cost both optional and honest — no invented number. */}
                <div style={{ marginTop: 4 }}>
                  {foodAddOpen ? (
                    <div className="brow" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
                      <div className="shelf-label" style={{ marginBottom: 8 }}>Add your own item</div>
                      <input className="field" style={{ maxWidth: 'none' }} autoFocus
                        placeholder="e.g. Aunt Carol's potato salad, extra ice"
                        value={foodAddName} onChange={e => setFoodAddName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                      <div className="actions-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                        <input className="field" style={{ maxWidth: 220, flex: 1 }} placeholder="Who's bringing it (optional)"
                          value={foodAddOwner} onChange={e => setFoodAddOwner(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--line)', borderRadius: 10, padding: '0 10px' }}>
                          <span className="of">$</span>
                          <input type="number" inputMode="decimal" min="0" placeholder="cost (optional)"
                            style={{ width: 115, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 'var(--t-input)', fontWeight: 650, fontFamily: 'inherit', padding: '9px 4px' }}
                            value={foodAddCost} onChange={e => setFoodAddCost(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitFoodAdd(); }} />
                        </span>
                      </div>
                      {/* Where it belongs — auto-guessed from the name; tap to override
                          (same word list as legacy's guessFoodCategory, ported above). */}
                      <div className="actions-row" style={{ marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="of">Goes in:</span>
                        {['Food', 'Drinks', 'Supplies'].map(g => {
                          const active = (foodAddGroup || guessFoodCategory(foodAddName).group) === g;
                          return (
                            <button key={g} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={active}
                              onClick={() => setFoodAddGroup(g)}>{g}</button>
                          );
                        })}
                      </div>
                      <div className="actions-row" style={{ marginTop: 10 }}>
                        <button className="cta" disabled={!foodAddName.trim()} style={!foodAddName.trim() ? { opacity: .45 } : undefined}
                          onClick={commitFoodAdd}>Add to the plan</button>
                        <button className="mini" onClick={() => { setFoodAddOpen(false); setFoodAddName(''); setFoodAddOwner(''); setFoodAddCost(''); setFoodAddGroup(null); }}>Cancel</button>
                      </div>
                      <p className="grounding" style={{ marginTop: 8 }}>Cost is optional — leave it blank if you don’t know it yet, or if someone else is bringing it.</p>
                    </div>
                  ) : (
                    <button className="fold-btn" style={{ marginTop: 14 }} onClick={() => setFoodAddOpen(true)}>
                      + Add an item you’re bringing or buying<span className="chev">›</span>
                    </button>
                  )}
                </div>
              </>
            ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No spread to build for this kind of event yet.</div>)}
            {sheet.kind === 'vendors' && (() => {
              // Queue item 6 — the promise-model engine (vendorAccountability):
              // cross-vendor conflicts up top, a per-vendor accountability line
              // when the tier isn't clean. Deterministic, honest not_tracked.
              let conflicts = [];
              try { conflicts = deriveVendorPromiseConflicts(event) || []; } catch { conflicts = []; }
              const streams = (plan && plan.workstreams) || [];
              const showStreams = streams.length > 1 || streams.some(w => w.status !== 'ready' && w.status !== 'not_started');
              const GOOD = ['Confirmed', 'Paid', 'Deposit Paid', 'Contracted'];
              const chipify = (s) => String(s || '').split(' — ')[0].split('.')[0].slice(0, 42);
              const unbookedSuggestions = vendorPlan.relevant ? vendorPlan.categories.filter(c => !c.booked) : [];
              const hasVendors = (event.vendors || []).length > 0;
              const rc = rollup && rollup.counts && rollup.counts.total > 0 ? rollup.counts : null;
              return (
              <>
              {/* Hero copy (host request 2026-07-11): the readiness count leads,
                  a warm honest line under it — same treatment as guests + food.
                  Counts come straight from the vendor readiness rollup. */}
              {rc && (
                <div style={{ padding: '2px 0 14px' }}>
                  <div className="eyebrow">Ready for the day</div>
                  <div style={{ fontSize: 'var(--t-hero-star)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, margin: '6px 0 6px', fontVariantNumeric: 'tabular-nums', color: rc.ready >= rc.total ? 'var(--ok)' : 'var(--ink)' }}>
                    {rc.ready} of {rc.total}
                  </div>
                  <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)', margin: 0, minHeight: 0 }}>
                    {/* RECON (2026-07-11): the star is the ROLLUP's booked bar —
                        the sub speaks the same vocabulary. The stricter confirm/
                        arrival/paperwork bar belongs to the day-before row, which
                        names it; borrowing its language here retyped the number. */}
                    {rc.ready >= rc.total
                      ? 'Everyone’s locked in — confirms, times, and paperwork all set.'
                      : `${rc.total - rc.ready} not booked yet — their cards below say which.`}
                  </p>
                </div>
              )}
              {vendorPlan.relevant && (
                <div style={{ marginBottom: 12 }}>
                  <label className="shelf-label" style={{ display: 'block', margin: '0 0 4px' }} htmlFor="metro-market-pick">Which market are you in?</label>
                  <select id="metro-market-pick" className="field" value={event.metroMarket || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const m = id ? METRO_MARKETS.find(x => x.id === id) : null;
                      patchEvent({ metroMarket: id || null },
                        m ? `Estimates now use ${m.label} typical rates.` : 'Back to a national baseline — no market set.');
                    }}>
                    <option value="">National baseline — no market set</option>
                    {[1, 2, 3, 4].map(tier => (
                      <optgroup key={tier} label={`Tier ${tier} — ${METRO_TIER_LABEL[tier].label}`}>
                        {METRO_MARKETS.filter(m => m.tier === tier).map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {metroMkt && (
                    <p className="grounding" style={{ margin: '4px 0 0' }}>
                      {metroMkt.label} typically runs {metroMkt.factor > 1 ? 'above' : metroMkt.factor < 1 ? 'below' : 'at'} the national baseline{metroMkt.factor !== 1 ? ` (${metroMkt.factor > 1 ? '+' : ''}${Math.round((metroMkt.factor - 1) * 100)}%)` : ''} used for the ranges below.
                    </p>
                  )}
                </div>
              )}
              {hasVendors ? (
                <>
                  {showStreams && (
                    <div className="wstrip">
                      {streams.map(w => {
                        const done = w.readiness && w.readiness.total > 0 && w.readiness.booked >= w.readiness.total;
                        const attn = w.blocked || (w.readiness && w.readiness.needsAttention > 0);
                        return (
                          <button key={w.id} className={'wchip' + (done ? ' done' : attn ? ' attn' : '')}
                            onClick={() => { if (!(w.deepLink && routeSheet(w.deepLink))) setSheet({ kind: 'vendors' }); }}>
                            <span className="wl">{w.label}</span>
                            <span className="wn">{w.readiness ? w.readiness.booked + ' of ' + w.readiness.total : '—'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {conflicts.length > 0 && (
                    <button className="conflictbar" onClick={() => setSheet(s => ({ ...s, conflictsOpen: !s.conflictsOpen }))}>
                      <span>{conflicts.length} thing{conflicts.length === 1 ? '' : 's'} between vendors need{conflicts.length === 1 ? 's' : ''} a look</span>
                      <span style={{ transform: sheet.conflictsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }}>›</span>
                    </button>
                  )}
                  {sheet.conflictsOpen && conflicts.slice(0, 4).map((c, i) => (
                    <div key={c.id || i} className="brow" style={{ borderColor: 'var(--warn-tint)' }}>
                      <p className="grounding" style={{ margin: 0, color: 'var(--warn)', fontWeight: 600 }}>{c.title}</p>
                      <p className="grounding" style={{ margin: '2px 0 0' }}>{c.explanation}{c.recommendedAction ? ' ' + c.recommendedAction : ''}</p>
                    </div>
                  ))}
                  {(event.vendors || []).map(v => {
                    let acct = null;
                    try { acct = quickAccountabilityForVendor(v, event); } catch { acct = null; }
                    const worry = acct && acct.tier && acct.tier !== 'on_track' && (acct.reasons || []).length ? acct.reasons[0] : null;
                    let coiAct = null;
                    try { coiAct = coiNextAction(v, event, v.name || 'this vendor'); } catch { coiAct = null; }
                    let memLine = '';
                    try { memLine = summarizeVendorMemory(vendorMemoryFor([...ALL_SAMPLES.map(se => se.id === event.id ? event : se)], v, event.id)); } catch { memLine = ''; }
                    const isOpen = sheet.focus === v.id;
                    const good = GOOD.includes(v.status);
                    return (
                      <div key={v.id} className={'vcard' + (isOpen ? ' open' : '')}
                        ref={el => { if (el && isOpen) el.scrollIntoView({ block: 'center' }); }}
                        onClick={() => setSheet(s => ({ ...s, focus: isOpen ? null : v.id }))}>
                        <div className="vc-head">
                          <div className="vc-avatar" aria-hidden>{String(v.name || '?').trim().charAt(0).toUpperCase()}</div>
                          <div className="vc-id">
                            <div className="vc-name">{v.name || 'Unnamed'}</div>
                            <div className="vc-cat">{v.category || 'Vendor'}{v.arrivalTime ? ' · arrives ' + v.arrivalTime : ''}</div>
                          </div>
                          {/* HOST-APPROPRIATE-VENDOR-UI: an informal helper isn't
                              missing paperwork — there's none to have. "no status"
                              reads like an incomplete paid booking; this reads like
                              what it actually is. */}
                          {v.isInformal ? (
                            <span className="vc-pill">helping out</span>
                          ) : (
                            /* WAVE-B (a): the pill WRITES now — every status read
                               (vendorIntelligence, workstreams, GOOD above) consumed
                               v.status but nothing in this cockpit could set it.
                               One tap moves it up the ladder, like lodging rows. */
                            <button className={'vc-pill' + (good ? ' good' : v.status ? ' mid' : '')}
                              onClick={ev => { ev.stopPropagation(); cycleVendorStatus(v); }}
                              aria-label={'Booking status: ' + (v.status || 'not set') + '. Tap to move it forward.'}>
                              {v.status || 'set status'}
                            </button>
                          )}
                        </div>
                        {(worry || coiAct || memLine) && (
                          <div className="vc-chips">
                            {worry && <span className="vc-chip">{chipify(worry)}</span>}
                            {coiAct && <span className="vc-chip">COI needed</span>}
                            {!worry && !coiAct && memLine && <span className="vc-chip quiet">{chipify(memLine)}</span>}
                          </div>
                        )}
                        <div className="vc-more" onClick={ev => ev.stopPropagation()}>
                          {/* Contact info — a vendor added from a suggested category
                              starts life as { category, name:'' } with no way to name it
                              or reach it; nothing in this cockpit ever wrote name/phone/
                              email, so a vendor could stay "Unnamed" forever and the Call
                              button (below) could never appear. Legacy already has this
                              as a plain form field; V2 never got it. */}
                          <div className="actions-row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
                            <input className="field" style={{ maxWidth: 170, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="vendor name"
                              value={v.name || ''} onChange={e => writeVendor(v.id, { name: e.target.value }, null)} aria-label="Vendor name" />
                            <input className="field" style={{ maxWidth: 140, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="phone" type="tel"
                              value={v.phone || ''} onChange={e => writeVendor(v.id, { phone: e.target.value }, null)} aria-label="Vendor phone" />
                            <input className="field" style={{ maxWidth: 185, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="email" type="email"
                              value={v.email || ''} onChange={e => writeVendor(v.id, { email: e.target.value }, null)} aria-label="Vendor email" />
                          </div>
                          {/* Vendor Brief authoring (VB2, ported): contactName and
                              briefNote are both in buildVendorBriefPayload's audited
                              whitelist (lib/vendorBrief.js) — legacy has always had a
                              plain field for each; V2 never got either, so a brief
                              minted here would leave them blank. contactName is who a
                              vendor calls on-site if the host isn't reachable; briefNote
                              is a plain note that goes to the VENDOR (never v.notes,
                              which is host-private bookkeeping and never leaves this
                              cockpit). */}
                          <div className="actions-row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
                            <input className="field" style={{ maxWidth: 220, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="on-site contact (if not you)"
                              value={v.contactName || ''} onChange={e => writeVendor(v.id, { contactName: e.target.value }, null)} aria-label="On-site contact for this vendor's brief" />
                          </div>
                          <textarea className="field" style={{ maxWidth: 'none', width: '100%', boxSizing: 'border-box', fontSize: 'var(--t-input)', padding: '8px 10px', marginBottom: 8, resize: 'vertical' }}
                            placeholder="A note for them — parking, load-in door, anything they should know before they arrive" rows={2}
                            value={v.briefNote || ''} onChange={e => writeVendor(v.id, { briefNote: e.target.value }, null)} aria-label="Note shared with this vendor in their brief" />
                          {/* WAVE-B write paths (b) + (c): arrival time (the day-of
                              roster, NOW card, and print sheet all read v.arrivalTime;
                              nothing wrote it) and money — the payment-note button
                              below gates on Number(v.cost) > 0 && !v.balancePaid, so
                              these two fields make that gate reachable AND resolvable.
                              Money stays off informal helpers — they're not a paid
                              vendor by the host's own word. */}
                          <div className="actions-row" style={{ margin: '0 0 10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label className="of" htmlFor={'v-arrive-' + v.id}>arrives</label>
                            <input id={'v-arrive-' + v.id} className="field" type="time" style={{ maxWidth: 130, fontSize: 'var(--t-input)', padding: '5px 10px' }}
                              value={v.arrivalTime || ''} onChange={e => writeVendor(v.id, { arrivalTime: e.target.value }, null)}
                              aria-label="Arrival time on the day" />
                            {!v.isInformal && (<>
                              <label className="of" htmlFor={'v-cost-' + v.id}>agreed to pay $</label>
                              <input id={'v-cost-' + v.id} className="field" type="number" inputMode="numeric" min="0" placeholder="0"
                                style={{ maxWidth: 104, fontSize: 'var(--t-input)', padding: '5px 10px' }}
                                value={vendorCostDraft !== null && isOpen ? vendorCostDraft : (v.cost ?? '')}
                                onFocus={() => setVendorCostDraft(String(v.cost ?? ''))}
                                onChange={e => setVendorCostDraft(e.target.value)}
                                onBlur={() => commitVendorCost(v)}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') setVendorCostDraft(null); }}
                                aria-label="What you agreed to pay" />
                              <button className="chip" aria-pressed={!!v.balancePaid} onClick={() => toggleVendorPaid(v)}>
                                {v.balancePaid ? '✓ paid in full' : 'mark paid in full'}
                              </button>
                            </>)}
                          </div>
                          {/* HOST-APPROPRIATE-VENDOR-UI: friends/family helping out
                              shouldn't get chased for a certificate of insurance. This
                              flag is read by the shared vendorAccountability engine
                              (deriveVendorExpectedPromises etc.) and vendorCoiRequirement
                              — setting it clears every COI/contract/promise nudge below,
                              not just the label. */}
                          <button className="chip" style={{ marginBottom: 10 }}
                            aria-pressed={!!v.isInformal}
                            onClick={() => writeVendor(v.id, { isInformal: !v.isInformal },
                              !v.isInformal ? (v.name || 'This') + ' is a friend or family member helping out — no paperwork tracked.' : (v.name || 'This') + ' switched back to a paid vendor.')}>
                            {v.isInformal ? '✓ friend or family helping (not a paid vendor)' : 'not a paid vendor — friend or family helping?'}
                          </button>
                          {/* Every open promise is CLEARABLE — the same promiseEvidence
                              override production's vendor detail uses ("Mark proof on
                              file"), so the worry chip can actually resolve, not just
                              describe. Honest: it's the host asserting they have it,
                              not a fake upload. */}
                          {(() => {
                            let openPromises = [];
                            try {
                              openPromises = (inferPromisesFromVendor(v, event) || [])
                                .filter(p => p.status !== 'completed' && p.status !== 'not_required' && p.status !== 'confirmed');
                            } catch { openPromises = []; }
                            if (!openPromises.length) return null;
                            // cap the visible list — a fresh vendor can carry a whole
                            // playbook's worth of unconfirmed promises; show what's
                            // actionable now, not an audit of everything at once.
                            const shown = openPromises.slice(0, 3);
                            const more = openPromises.length - shown.length;
                            return [...shown.map(p => (
                              <div key={p.promiseKey} className="line" style={{ alignItems: 'center', padding: '4px 0' }}>
                                <span className="vc-detail" style={{ margin: 0 }}>{p.promiseText}{p.dueDate ? ' · due ' + p.dueDate : ''}</span>
                                <button className="mini" onClick={() => writeVendor(v.id, { promiseEvidence: { ...(v.promiseEvidence || {}), [p.promiseKey]: 'attached' } },
                                  p.promiseText + ' — marked confirmed.')}>
                                  {p.evidenceRequired ? 'Mark proof on file' : 'Mark confirmed'}
                                </button>
                              </div>
                            )), more > 0 ? (
                              <p key="more" className="vc-detail" style={{ opacity: .7 }}>+{more} more open — the vendor's own brief covers the rest.</p>
                            ) : null];
                          })()}
                          {coiAct && (() => {
                            let coi = null; try { coi = getVendorCOIState(v, event); } catch { coi = null; }
                            return (
                            <div className="line" style={{ alignItems: 'center', padding: '4px 0', flexWrap: 'wrap', gap: 6 }}>
                              <span className="vc-detail" style={{ margin: 0, flex: '1 1 100%' }}>{coiAct.title} {coiAct.consequence}</span>
                              {/* WAVE-B (d): optional expiry while marking verified —
                                  getVendorCOIState reads coiExpiryDate to catch coverage
                                  that lapses before the event. Blank is honest: verified
                                  with no date on file. */}
                              {coi && coi.status === 'received' && (
                                <label className="of" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  covered through
                                  <input className="field" type="date" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: '4px 8px' }}
                                    value={v.coiExpiryDate || ''}
                                    onChange={e => writeVendor(v.id, { coiExpiryDate: e.target.value || null }, null)}
                                    aria-label="Insurance covered through — optional" />
                                </label>
                              )}
                              <button className="mini" style={{ flexShrink: 0, marginLeft: 'auto' }} onClick={() => {
                                // The same status ladder coiNextAction reads: requested → received → verified.
                                if (coi && coi.status === 'requested') writeVendor(v.id, { coiStatus: 'received' }, 'COI marked received.');
                                else if (coi && coi.status === 'received') writeVendor(v.id, { coiVerified: true }, v.coiExpiryDate ? 'COI verified — covered through ' + v.coiExpiryDate + '.' : 'COI verified.');
                                else if (coi && coi.status === 'expired') writeVendor(v.id, { coiStatus: 'requested', coiVerified: false, coiExpiryDate: null }, 'Asked for a current COI.');
                                else writeVendor(v.id, { coiStatus: 'requested' }, 'COI marked requested.');
                              }}>{coiAct.ctaCopy || 'Mark COI requested'}</button>
                            </div>
                            );
                          })()}
                          {memLine && <p className="vc-detail">{memLine}</p>}
                          <div className="vc-actions">
                            <button className="mini" onClick={() => openDraft('Note to ' + (v.name || 'your vendor'), draftVendorOutreach(event, v, profile))}>Draft note</button>
                            {Number(v.cost) > 0 && !v.balancePaid && (
                              <button className="mini" onClick={() => { try { openDraft('Payment reminder', draftVendorPaymentReminder(event, v)); } catch { toast('Couldn’t draft it.'); } }}>Payment note</button>
                            )}
                            {(() => { try {
                              const m = getSuggestedPayMethod(v); if (!m) return null;
                              const link = buildPayLink(m, v, null); if (!link) return null;
                              return <a className="mini" style={{ textDecoration: 'none' }} href={link} target="_blank" rel="noreferrer">Pay via {m}</a>;
                            } catch { return null; } })()}
                            {String(v.dayOfPhone || v.phone || '').trim() && (
                              <a className="mini" style={{ textDecoration: 'none' }} href={'tel:' + String(v.dayOfPhone || v.phone).replace(/[^+\d]/g, '')}>Call</a>
                            )}
                            <button className="mini" onClick={() => shareVendorBrief(v)}>Share the vendor brief</button>
                          </div>
                          {/* The minted link: a plain URL the host copies and sends
                              themselves — nothing here auto-sends anything. */}
                          {vendorBrief && vendorBrief.vendorId === v.id && (
                            <div style={{ marginTop: 8, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10 }}>
                              {vendorBrief.minting ? (
                                <p className="vc-detail" style={{ margin: 0 }}>Putting the brief together…</p>
                              ) : (
                                <>
                                  <p className="vc-detail" style={{ margin: '0 0 8px', wordBreak: 'break-all' }}>{vendorBrief.url}</p>
                                  <div className="actions-row">
                                    <button className="mini" onClick={copyVendorBriefLink}>{vendorBrief.copied ? 'Copied' : 'Copy link'}</button>
                                    {vendorBrief.qrDataUrl && (
                                      <button className="mini" onClick={() => setSheet({ kind: 'qr', vendorQr: { url: vendorBrief.url, dataUrl: vendorBrief.qrDataUrl, name: v.name, back: { kind: 'vendors', focus: v.id } } })}>
                                        Show QR
                                      </button>
                                    )}
                                  </div>
                                  <p className="vc-detail" style={{ margin: '8px 0 0', opacity: .75 }}>{(v.name || 'They')} will see only their arrival time, your address, and their part of the day — nothing about budget, payments, or other vendors.</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {nudgeFor('vendors')}
                  {/* Vendor export — the same shared serializers as the guest
                      list (toCSV + COLUMNS.vendors already define the format);
                      missing fields export empty, exactly what's tracked. */}
                  <button className="fold-btn" onClick={exportVendorsCsv}>
                    Download the vendor list (CSV)
                  </button>
                </>
              ) : null}
              {unbookedSuggestions.length > 0 ? (
                <>
                  <div className="shelf-label" style={{ margin: hasVendors ? '16px 0 6px' : '0 0 6px' }}>
                    {hasVendors ? 'Other roles this kind of event usually needs' : 'People this kind of event usually needs'}
                  </div>
                  {/* factorsApplied (metro market, timeline rush) is an EVENT-level
                      adjustment, identical for every category — it was rendering
                      once per row, repeating the same two sentences 6-9 times in a
                      row. Shown once here instead. */}
                  {unbookedSuggestions[0] && unbookedSuggestions[0].factorsApplied.length > 0 && (
                    <p className="grounding" style={{ margin: '0 0 10px', opacity: .75 }}>
                      Estimates below: {unbookedSuggestions[0].factorsApplied.map(f => f.explanation).join(' ')}
                    </p>
                  )}
                  {/* Category name was inheriting .line's 14px/ink-soft with only a
                      fontWeight bump — 1px and 100-weight away from .grounding's
                      13px/550 secondary text below it. Nothing to anchor the eye.
                      Reusing .vc-name's exact treatment (14.5px/750/full-ink) —
                      the same "this is the primary thing in the row" contrast
                      already established for booked-vendor names just above this
                      list, not a new pattern. */}
                  {unbookedSuggestions.map(cat => (
                    <div key={cat.category} className="line" style={{ alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{ flex: 1 }}>
                        <div className="vc-name">{cat.category}</div>
                        {cat.estimateCopy && <p className="grounding" style={{ margin: '3px 0 0' }}>{cat.estimateCopy}</p>}
                        {cat.altToDIY && <p className="grounding" style={{ margin: '2px 0 0', opacity: .75 }}>{cat.altToDIY}</p>}
                      </div>
                      <button className="mini" style={{ flexShrink: 0 }} onClick={() => addVendorCategory(cat.category)}>Add</button>
                    </div>
                  ))}
                </>
              ) : (!hasVendors && <div className="v-meta" style={{ padding: '14px 2px' }}>No vendors on this event yet.</div>)}
              </>
              );
            })()}
            {sheet.kind === 'budget' && (() => {
              // HOST MODEL: one number, and "where it's going" priced by the plan
              // itself (hostSpending's food/supplies/capacity terms) — never
              // planner category rows the host didn't write.
              // ROW-LEVEL CTA RULE: hostRowsGo() (component-level, shared with
              // the After tab's identical summary) routes every allocation row
              // to the surface that prices it — the spread (food/supplies),
              // the space list, the crab order.
              const hostRows = hostRowsGo();
              let heroCopy = null; try { heroCopy = budgetHeroCopy(event, foodPP.priceFactor); } catch { heroCopy = null; }
              // Queue item 7 — the recovery engine: source-backed ways OUT of
              // an overage (safe cuts / tradeoffs / protected), never invented $.
              let recovery = null;
              try { recovery = buildBudgetRecoveryPlan(event, foodPP.priceFactor); } catch { recovery = null; }
              let swapPick = null;
              try { swapPick = recovery && recovery.status === 'recovery_available' ? pickDroppableBudgetRow(event, foodPP.priceFactor) : null; } catch { swapPick = null; }
              const left = money.planned ? money.planned - money.committed : null;
              return (
                <>
                  {/* PRINCIPLES REDESIGN (host directive): summary before detail —
                      the host's question is "am I OK?", so the STATE leads. One
                      narrative (the canonical engine copy), not three number
                      readouts of the same fact. */}
                  {money.planned ? (() => {
                    // DENOMINATORS-1: name the guest count this budget was sized
                    // against — the same band the Guests tile and food plan use,
                    // never a second unreconciled number.
                    let budgetBand = null;
                    try { budgetBand = attendanceBand(event); } catch { budgetBand = null; }
                    const hasSpread = budgetBand && budgetBand.applicable && budgetBand.band;
                    const guestPhrase = hasSpread ? attendanceBandLabel(budgetBand) + ' guests' : null;
                    // Hero copy (host request 2026-07-11): the old summary row is
                    // PROMOTED to the full hero. The warm line RENDERS budgetHeroCopy's
                    // own strings (lib/budgetCopy — one source of truth per fact):
                    // its state machine already speaks over/near/waiting honestly.
                    // Plain "under" adds only the engine's caveat — the star and
                    // grounding line already say the rest.
                    const over = left != null && left < 0;
                    const hcState = heroCopy && heroCopy.state;
                    const warmSub = !heroCopy ? null
                      : hcState === 'over' ? [heroCopy.line, heroCopy.caveat].filter(Boolean).join(' ')
                      : hcState === 'near' ? [heroCopy.title, heroCopy.caveat].filter(Boolean).join(' ')
                      : hcState === 'waiting' ? [heroCopy.title, heroCopy.line, heroCopy.caveat].filter(Boolean).join(' ')
                      : heroCopy.caveat || null;
                    return (
                    <SheetHero
                      eyebrow={over ? 'Over by' : 'Left to spend'}
                      star={fmt(Math.abs(left || 0))}
                      tone={over ? 'danger' : hcState === 'near' ? 'warn' : 'ok'}
                      sub={warmSub}
                      grounding={<>
                        <b>{fmt(money.committed)}</b> spoken for of your <b>{fmt(money.planned)}</b>{money.spent ? <> · <b>{fmt(money.spent)}</b> actually spent</> : null}{guestPhrase ? ' · sized for ' + guestPhrase : ''}.
                      </>}
                    />
                    );
                  })() : (
                    heroCopy && heroCopy.title ? <p className="grounding" style={{ margin: '2px 0 8px' }}>{heroCopy.title}{heroCopy.line ? ' ' + heroCopy.line : ''}</p> : null
                  )}
                  {hostRows.length > 0 && (
                    <>
                      {/* BUDGET-CONTRADICTION FIX: "priced by your plan" reads as a
                          budget breakdown — a direct clash with heroCopy's "Set a
                          budget" ask right above when no ceiling exists yet. This
                          row total is real (the plan's own cost estimate), just not
                          a budget, so the label says so instead of implying one. */}
                      <div className="shelf-label" style={{ margin: '10px 0 6px' }}>{money.planned ? 'Where it’s going — priced by your plan' : 'What your plan adds up to so far'}</div>
                      {hostRows.map((r, i) => {
                        const alloc = money.planned ? Math.min(100, Math.round((r.est / money.planned) * 100)) : 0;
                        const got = r.est ? Math.min(100, Math.round((r.got / r.est) * 100)) : 0;
                        const allBought = r.est > 0 && r.got >= r.est;
                        return (
                          <div key={r.label}>
                            <button className="brow"
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--line-soft)', font: 'inherit', color: 'inherit', cursor: 'pointer', animation: `cardin 300ms var(--ease-out) ${i * 40}ms both` }}
                              onClick={r.go} aria-label={'Open ' + r.label}>
                              <div className="line" style={{ padding: '0 0 5px' }}>
                                <span>{r.label} <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span></span>
                                {/* "$0 bought" ×3 before any buying is noise — the
                                    bought figure earns its place once buying starts */}
                                {allBought
                                  ? <span className="amt" style={{ color: 'var(--ok)' }}>{fmt(r.got)} <span className="of" style={{ color: 'var(--ok)' }}>bought</span></span>
                                  : r.got > 0
                                    ? <span className="amt">{fmt(r.got)} <span className="of">of ~{fmt(r.est)}</span></span>
                                    : <span className="amt">~{fmt(r.est)}</span>}
                              </div>
                              <div className="bline"><i style={{ width: Math.max(alloc, 4) + '%' }}><b style={{ width: got + '%' }} /></i></div>
                            </button>
                            {/* Food-cost detail (audit gap fix): per-head cost, real-priced
                                vs. still-estimated item count, and the regional pricing
                                note — the same facts the legacy Food & Drink card
                                (App.js HostSpendingPlan) surfaces, read from the SAME
                                already-computed foodPlan/foodPP, no new math. */}
                            {r.kind === 'food' && foodPlan && foodPlan.itemCount > 0 && (
                              <div className="v-meta" style={{ padding: '0 0 10px' }}>
                                {foodPlan.guests > 0 && foodPlan.foodHigh > 0 && (
                                  <>≈ {fmt(foodPlan.perGuestLow)}–{fmt(foodPlan.perGuestHigh)} a head × {foodPlan.guests} {foodPlan.guests === 1 ? 'guest' : 'guests'}. </>
                                )}
                                {foodPlan.lockedCount > 0
                                  ? <>{foodPlan.lockedCount} of {foodPlan.itemCount} priced for real, the rest estimated.</>
                                  : <>All {foodPlan.itemCount} item{foodPlan.itemCount === 1 ? '' : 's'} still estimated — lock a real price as you shop.</>}
                                {foodPP.priceContext && (
                                  <> Prices adjusted for the {foodPP.priceContext.split(' · ')[0]} region.</>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                  {recovery && recovery.status === 'recovery_available' && (
                    <div style={{ marginTop: 12 }}>
                      <div className="shelf-label" style={{ margin: '0 0 4px', color: 'var(--warn)' }}>A way back under</div>
                      {recovery.headline && <p className="grounding" style={{ margin: '0 0 6px' }}>{recovery.headline}</p>}
                      {(recovery.suggestions || []).slice(0, 4).map((s, i) => (
                        <div key={s.id || i} className="line" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 'var(--t-body-s)', flex: '1 1 auto' }}>
                            {s.copy || s.label || s.title}
                            {s.why ? <span className="grounding" style={{ display: 'block', margin: '2px 0 0' }}>{s.why}</span> : null}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {(s.estimatedSavings || s.amount) ? <span className="of" style={{ whiteSpace: 'nowrap' }}>~{fmt(s.estimatedSavings || s.amount)}</span> : null}
                            {s.route && <button className="mini" onClick={() => { if (!routeSheet(s.route)) toast('In the app this opens: ' + (describeRoute(s.route) || 'the right spot')); }}>{s.actionLabel || 'Open'}</button>}
                          </span>
                        </div>
                      ))}
                      {swapPick && swapPick.row && (
                        <p className="grounding" style={{ margin: '6px 0 0', fontWeight: 650, color: 'var(--ink-soft)' }}>
                          The one-line fix: drop “{swapPick.row.category || swapPick.row.label}” (~{fmt(swapPick.drop)}) and you’re back under.
                        </p>
                      )}
                      {(recovery.protectedItems || []).length > 0 && (
                        <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Protected — not on the cut list: {(recovery.protectedItems || []).slice(0, 3).map(x => x.label || x).join(', ')}.</p>
                      )}
                    </div>
                  )}
                  {/* the editor is settled work once a number exists — it folds;
                      no number yet → it IS the ask, so it stays open */}
                  {money.planned ? (
                    budgetFoldOpen ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="shelf-label" style={{ margin: '0 0 8px' }}>Change the number <button className="mini" style={{ marginLeft: 6 }} onClick={() => setBudgetFoldOpen(false)}>done</button></div>
                        {budgetEditorBlock()}
                      </div>
                    ) : (
                      <button className="fold-btn" style={{ marginTop: 14 }} onClick={() => setBudgetFoldOpen(true)}>
                        Your budget — {fmt(money.planned)}<span className="chev">›</span>
                      </button>
                    )
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      <div className="shelf-label" style={{ margin: '0 0 8px' }}>Set the number</div>
                      {budgetEditorBlock()}
                    </div>
                  )}
                </>
              );
            })()}
            {sheet.kind === 'guests' && (() => {
              const gcr = (() => { try { return guestCountResolved(event); } catch { return null; } })();
              const band = (() => { try { return attendanceBand(event); } catch { return null; } })();
              const bandLbl = (() => { try { return attendanceBandLabel(band); } catch { return null; } })();
              const quickAdd = (
                <div style={{ marginTop: 12 }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>Add names — one per line</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 74, resize: 'vertical', fontSize: 'var(--t-input)', fontWeight: 500 }}
                    placeholder={'Denise & Ray\nThe Okafors\nUncle Joe'}
                    value={rosterText} onChange={e => setRosterText(e.target.value)} aria-label="Add guest names" />
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="cta" disabled={!rosterText.trim()} style={!rosterText.trim() ? { opacity: .45 } : undefined} onClick={addRoster}>Add them</button>
                  </div>
                </div>
              );
              const chase = showsReplyTracking(event); // count-only hosts are never chased
              const plusOnes = (event.guests || []).filter(g => g && g.rsvp === 'Yes' && String(g.plusOne || '').trim()).length;
              const kidsHere = kidsTotal(event.guests);
              // guestMode switch — the ENGINE's own workflow knob (guestPlanningMode
              // reads it): by-list hosts get reply tracking + chasing, by-headcount
              // hosts are never nagged about replies.
              const countingChips = (
                <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                  <span className="of">counting:</span>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={chase}
                    onClick={() => patchEvent({ guestMode: 'list' }, 'By list — replies are tracked and the quiet ones can be nudged.')}>By list</button>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.guestMode === 'count'}
                    onClick={() => patchEvent({ guestMode: 'count' }, 'By headcount — replies are optional and nobody gets chased.')}>By headcount</button>
                </div>
              );
              // CSV import — lib/csvParsers end to end: platform map → validate →
              // preview counts → merge (email-primary, name-fallback). Nothing
              // writes until the host confirms the preview.
              const csvBlock = !csvOpen ? (
                <button className="fold-btn" onClick={() => setCsvOpen(true)}>
                  Import a guest list (CSV)
                  <span className="chev">›</span>
                </button>
              ) : (
                <div className="brow" style={{ marginTop: 14, borderRadius: 12, padding: '10px 8px' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>
                    Where is the list from?
                    <button className="mini" style={{ marginLeft: 8 }} onClick={() => { setCsvOpen(false); setCsvPreview(null); }}>close</button>
                  </div>
                  <div className="chips">
                    {Object.entries(PLATFORMS).map(([key, p]) => (
                      <button key={key} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={csvPlatform === key}
                        onClick={() => { setCsvPlatform(key); setCsvPreview(null); }}>{p.label || key}</button>
                    ))}
                  </div>
                  <div className="actions-row" style={{ marginTop: 10, alignItems: 'center' }}>
                    <input type="file" accept=".csv,text/csv" aria-label="Guest CSV file" style={{ fontSize: 'var(--t-row-sub)', color: 'var(--muted)' }}
                      onChange={e => onCsvFile(e.target.files && e.target.files[0])} />
                  </div>
                  {csvPreview && (
                    <>
                      <p className="grounding" style={{ margin: '8px 0 0' }}>
                        {csvPreview.mapped.filter(r => r._valid).length} of {csvPreview.mapped.length} rows read cleanly from {csvPreview.fileName} —
                        {' '}{csvPreview.summary.willAdd || 0} new, {csvPreview.summary.willUpdate || 0} already on your list (their replies update).
                        {csvPreview.mapped.some(r => !r._valid) ? ' Rows without a name are skipped.' : ''}
                      </p>
                      <div className="actions-row" style={{ marginTop: 8 }}>
                        <button className="cta" onClick={applyCsv}>Bring them in</button>
                        <button className="mini" onClick={() => setCsvPreview(null)}>Not this file</button>
                      </div>
                    </>
                  )}
                </div>
              );
              // Past imports — the audit trail lib/importHistory keeps per event.
              // Quiet fold; undo restores the pre-import snapshot wholesale, and
              // the copy says exactly that.
              const pastImports = importBatches.length === 0 ? null : !importsOpen ? (
                <button className="fold-btn" style={{ marginTop: 0 }} onClick={() => setImportsOpen(true)}>
                  Past imports · {importBatches.length}
                  <span className="chev">›</span>
                </button>
              ) : (
                <div className="brow" style={{ marginTop: 14, borderRadius: 12, padding: '10px 8px' }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>
                    Past imports
                    <button className="mini" style={{ marginLeft: 8 }} onClick={() => setImportsOpen(false)}>close</button>
                  </div>
                  {[...importBatches].reverse().map((b, i) => (
                    <div key={b.id || i} className="v-meta" style={{ padding: '3px 2px' }}>
                      {fmtBatchTs(b.ts)} · {importPlatformLabel(b.platform)} — {b.inserted || 0} added · {b.updated || 0} updated
                      {b.skipped ? ' · ' + b.skipped + ' skipped' : ''}
                      {i === 0 ? <span className="of"> · latest</span> : null}
                    </div>
                  ))}
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="mini" onClick={undoLastCsvImport}>Undo last import</button>
                    <button className="mini" onClick={clearImportHistory}>Clear import history</button>
                  </div>
                  <p className="grounding" style={{ margin: '6px 0 0' }}>
                    Undo puts the list back the way it was before that import — anything you changed on the list since then goes with it. Only the latest import can be undone.
                    {' '}Each past import keeps a copy of the list as it stood — names, emails, phones — so undo can work. Clearing the history deletes those copies from this device; your guest list stays, but past imports can no longer be undone.
                  </p>
                </div>
              );
              // Guest export — shared serializers, canonical columns, so the
              // file re-imports cleanly as NGW Native. Only offered when there
              // is a real list to download.
              const exportRow = (event.guests || []).length ? (
                <button className="fold-btn" style={{ marginTop: 0 }} onClick={exportGuestsCsv}>
                  Download the guest list (CSV)
                </button>
              ) : null;
              // Guest-list hero (host request, 2026-07-11): the sheet opens on a
              // hero moment — the same eyebrow/mega/mega-sub treatment as the
              // home hero, fed by the SAME resolvers every other surface reads
              // (yes-heads math below, attendanceBand label). No new counting.
              const guestHero = (() => {
                const roster = (event.guests || []).length > 0;
                let n, sub;
                if (roster) {
                  const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
                  const heads = yes.length + yes.filter(g => String(g.plusOne || '').trim()).length;
                  n = heads;
                  sub = chase
                    ? (gcr && gcr.pending > 0
                      ? 'said yes so far · ' + gcr.pending + (gcr.pending === 1 ? ' hasn’t answered' : ' haven’t answered') + (bandLbl ? ' — likely ' + bandLbl + ' on the day' : '')
                      : 'said yes — the list has settled' + (bandLbl ? ' · likely ' + bandLbl + ' on the day' : ''))
                    : 'on the list — counted, never chased';
                } else {
                  n = Number(guests) || 0;
                  sub = n > 0
                    ? 'planned around' + (bandLbl ? ' · sized for ' + bandLbl + ' on the day' : '')
                    : 'no names yet — start with the ones you’d text first';
                }
                return (
                  <div style={{ padding: '2px 2px 12px' }}>
                    <div className="eyebrow">Your people</div>
                    <div className="mega" style={{ fontSize: 46, margin: '6px 0 2px' }}>{n > 0 ? n : '—'}</div>
                    <div className="mega-sub" style={{ fontSize: 'var(--t-body)', minHeight: 0 }}>{sub}</div>
                  </div>
                );
              })();
              // WAVE-B: invite rules — the SAME event fields the public RSVP page
              // already enforces (InviteV2: plusOnePolicy/kidsPolicy/collectAddresses)
              // and the invite + guest brief drafts read (giftWish). V2 hosts could
              // never set them. Values match the reads exactly; tapping an active
              // chip clears back to unset, and unset means the invite stays quiet.
              const inviteRules = (() => {
                const chipSm = { padding: '5px 11px', fontSize: 'var(--t-pill)' };
                if (!inviteRulesOpen) {
                  return (
                    <button className="fold-btn" onClick={() => setInviteRulesOpen(true)}>
                      Invite rules — plus-ones, kids, addresses, gifts
                      <span className="chev">›</span>
                    </button>
                  );
                }
                const gw = (event.giftWish && typeof event.giftWish === 'object') ? event.giftWish : {};
                const GIFTS = [
                  ['no_gifts', 'No gifts'], ['registry', 'Registry'], ['charity', 'A donation'],
                  ['potluck', 'Potluck'], ['contribution', 'Chip in'],
                ];
                const GIFT_TOAST = {
                  no_gifts: '“Your presence is the gift” goes on the invite.',
                  registry: 'Registry noted — paste the link below so guests can find it.',
                  charity: 'Donation wish noted — name the cause below.',
                  potluck: 'Potluck — the guest brief asks everyone to bring a dish.',
                  contribution: 'Chip-in noted — put the per-person amount below.',
                };
                const GIFT_DETAIL = { registry: 'Paste the registry link', charity: 'Cause name or link', potluck: 'Dish assignments — optional', contribution: '$ per person' };
                return (
                  <div className="brow" style={{ marginTop: 14, borderRadius: 12, padding: '10px 8px' }}>
                    <div className="shelf-label" style={{ marginBottom: 6 }}>
                      Invite rules — the RSVP page follows these
                      <button className="mini" style={{ marginLeft: 8 }} onClick={() => setInviteRulesOpen(false)}>close</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 8px', alignItems: 'center' }}>
                      <span className="of">plus-ones:</span>
                      <button className="chip" style={chipSm} aria-pressed={event.plusOnePolicy === 'plus_one_ok'}
                        onClick={() => patchEvent({ plusOnePolicy: event.plusOnePolicy === 'plus_one_ok' ? null : 'plus_one_ok' },
                          event.plusOnePolicy === 'plus_one_ok' ? 'Unset — the invite stays quiet on plus-ones.' : 'Plus-ones welcome — the invite says so, and the RSVP page asks who they’re bringing.')}>Welcome</button>
                      <button className="chip" style={chipSm} aria-pressed={event.plusOnePolicy === 'no_plus_ones'}
                        onClick={() => patchEvent({ plusOnePolicy: event.plusOnePolicy === 'no_plus_ones' ? null : 'no_plus_ones' },
                          event.plusOnePolicy === 'no_plus_ones' ? 'Unset — the RSVP page offers a plus-one again.' : 'Named guests only — the RSVP page won’t offer a plus-one.')}>Named guests only</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 8px', alignItems: 'center' }}>
                      <span className="of">kids:</span>
                      <button className="chip" style={chipSm} aria-pressed={event.kidsPolicy === 'kids_welcome'}
                        onClick={() => patchEvent({ kidsPolicy: event.kidsPolicy === 'kids_welcome' ? null : 'kids_welcome' },
                          event.kidsPolicy === 'kids_welcome' ? 'Unset — the invite stays quiet on kids.' : 'Kids welcome — the invite says so.')}>Welcome</button>
                      <button className="chip" style={chipSm} aria-pressed={event.kidsPolicy === 'adults_only'}
                        onClick={() => patchEvent({ kidsPolicy: event.kidsPolicy === 'adults_only' ? null : 'adults_only' },
                          event.kidsPolicy === 'adults_only' ? 'Unset — the RSVP page asks about kids again.' : 'Adults-only — the RSVP page won’t ask about kids.')}>Adults only</button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 8px', alignItems: 'center' }}>
                      <span className="of">addresses:</span>
                      <button className="chip" style={chipSm} aria-pressed={!!event.collectAddresses}
                        onClick={() => patchEvent({ collectAddresses: !event.collectAddresses },
                          !event.collectAddresses ? 'Yeses now get an optional mailing-address ask — framed as for thank-yous, never required.' : 'Address question removed from the RSVP page.')}>
                        {event.collectAddresses ? '✓ collecting for thank-you mail' : 'collect for thank-you mail?'}
                      </button>
                    </div>
                    <div className="actions-row" style={{ margin: '0 0 4px', alignItems: 'center' }}>
                      <span className="of">gifts:</span>
                      {GIFTS.map(([mode, label]) => (
                        <button key={mode} className="chip" style={chipSm} aria-pressed={gw.mode === mode}
                          onClick={() => patchEvent({ giftWish: gw.mode === mode ? null : { mode, detail: '' } },
                            gw.mode === mode ? 'Unset — the invite stays quiet on gifts.' : GIFT_TOAST[mode])}>{label}</button>
                      ))}
                    </div>
                    {gw.mode && gw.mode !== 'no_gifts' && (
                      <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)', margin: '4px 0 6px' }}
                        placeholder={GIFT_DETAIL[gw.mode] || ''} value={gw.detail || ''}
                        onChange={e => patchEvent({ giftWish: { mode: gw.mode, detail: e.target.value } }, null)}
                        aria-label="Gift note detail" />
                    )}
                    <p className="grounding" style={{ margin: '4px 0 0' }}>Leave anything unset and the invite simply won’t mention it.</p>
                  </div>
                );
              })();
              return (event.guests || []).length ? (
                <>
                  {guestHero}
                  {chase && gcr && gcr.pending > 0 && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {gcr.pending} still unanswered{bandLbl ? ' · likely ' + bandLbl + ' on the day' : ''} — the count settles as replies land.
                    </div>
                  )}
                  {(plusOnes > 0 || kidsHere > 0) && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {[plusOnes ? '+' + plusOnes + ' plus-one' + (plusOnes === 1 ? '' : 's') : null, kidsHere ? kidsHere + ' kid' + (kidsHere === 1 ? '' : 's') + ' — food sizes them lighter' : null].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {!chase && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      You went by headcount — replies here are just for tracking, no chasing.
                    </div>
                  )}
                  <div className="v-meta" style={{ padding: '2px 2px 12px' }}>
                    {(() => {
                      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
                      const heads = yes.length + yes.filter(g => String(g.plusOne || '').trim()).length;
                      return heads !== yes.length ? `${yes.length} yes (+${heads - yes.length} with them = ${heads} heads) of ${(event.guests || []).length}` : `${yes.length} yes of ${(event.guests || []).length}`;
                    })()}
                    {rsvpBy && rsvpBy.iso && !isPast ? ` · replies by ${new Date(rsvpBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    {!isPast && (
                      <button className="mini" style={{ marginLeft: 6 }} onClick={() => setDeadlineOpen(o => !o)}>{deadlineOpen ? 'done' : 'change'}</button>
                    )}
                    {' — tap the tag to flip an RSVP, the name for kids, +1s and needs.'}
                  </div>
                  {deadlineOpen && (
                    <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                      <span className="of">replies by:</span>
                      <input className="field" style={{ maxWidth: 175, fontSize: 'var(--t-input)', padding: '6px 10px' }} type="date"
                        value={event.rsvpDeadline || (rsvpBy && rsvpBy.iso) || ''}
                        onChange={e => patchEvent({ rsvpDeadline: e.target.value }, 'Reply-by date set — the nudges and countdown read it.')}
                        aria-label="RSVP deadline" />
                    </div>
                  )}
                  <div className="actions-row" style={{ margin: '0 0 8px' }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                    <button className="mini" onClick={() => openDraft('Your invite', draftInvite(event, profile, { rsvpUrl: inviteLinkUrl() }))}>Copy the invite</button>
                    {/* WAVE-B: the full guest brief — legacy's draftGuestBrief
                        (when/where/parking/bring/dress/gifts), DRAFT-only per
                        UX_07: written for the host, sent by the host. */}
                    <button className="mini" onClick={() => { try { openDraft('The guest brief', draftGuestBrief(event, profile, { rsvpUrl: inviteLinkUrl() })); } catch { toast('Couldn’t draft it.'); } }}>Draft the guest brief</button>
                    <button className="mini" onClick={() => { try { openDraft('Update to everyone', draftGuestUpdate(event, {})); } catch { toast('Couldn’t draft it.'); } }}>Update everyone</button>
                    {showsReplyTracking(event) && <button className="mini" onClick={() => openDraft('The RSVP nudge', draftRsvpChase(event, profile, { rsvpUrl: inviteLinkUrl() }))}>Nudge the quiet ones</button>}
                  </div>
                  {/* Invite look — the tone engine guesses from the event's mood
                      (paper by day, elegant by night, muted when somber); the
                      host's word always wins (lib/inviteTone). */}
                  <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                    <span className="of">invite look:</span>
                    {[['', 'Match the event'], ['bright', 'Bright paper'], ['elegant', 'Elegant dark']].map(([val, label]) => (
                      <button key={val || 'auto'} className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={(event.inviteStyle || '') === val}
                        onClick={() => patchEvent({ inviteStyle: val }, val ? 'Invite set to ' + label.toLowerCase() + ' — the link updates instantly.' : 'The invite matches the event’s mood again.')}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Crest choice — only offered when this event HAS registered
                      artwork (never a toggle that does nothing). The host's
                      call: artwork on the invite, or purely typographic. */}
                  {eventArtworkFile(event) && (
                    <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                      <span className="of">artwork:</span>
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.inviteCrest !== 'off'}
                        onClick={() => patchEvent({ inviteCrest: '' }, 'The artwork is on the invite.')}>On the invite</button>
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }} aria-pressed={event.inviteCrest === 'off'}
                        onClick={() => patchEvent({ inviteCrest: 'off' }, 'Words only — the invite stays purely typographic.')}>Words only</button>
                    </div>
                  )}
                  {inviteRules}
                  {countingChips}
                  {(() => { // INTEL R1 — the only hostIntelligence read-forward: gated + clamped by the engine
                    try {
                      const adj = attendanceAdjustment(profile, event);
                      return adj && adj.applied && adj.because
                        ? <p className="grounding" style={{ margin: '0 0 8px' }}>{adj.because}</p>
                        : null;
                    } catch { return null; }
                  })()}
                  {nudgeFor('guests')}
                  {(() => {
                    // Grouped roster: when the host has sorted people into groups,
                    // the list reads by group; indexes stay the ORIGINAL array
                    // positions (every writer here is index-based).
                    const withIdx = (event.guests || []).map((g, i) => ({ g, i })).slice(0, 60);
                    const row = ({ g, i }) => (
                      <div key={i}>
                        <div className="grow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }}
                            onClick={() => setGuestOpen(guestOpen === i ? null : i)}>
                            {g.name || 'Guest ' + (i + 1)}
                            {String(g.plusOne || '').trim() ? <span className="of"> +1 {g.plusOne}</span> : null}
                            {Number(g.kids) > 0 ? <span className="of"> · {g.kids} kid{Number(g.kids) === 1 ? '' : 's'}</span> : null}
                            {String(g.needs || '').trim() ? <span className="tag essential" style={{ marginLeft: 6 }}>{g.needs}</span> : null}
                          </button>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => toggleRsvp(i)} aria-label={'RSVP for ' + (g.name || 'guest')}>
                            <span className={'tag plan'} style={g.rsvp === 'Yes' ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : g.rsvp === 'Maybe' ? { color: 'var(--warn)', background: 'var(--warn-tint)' } : undefined}>{g.rsvp || '—'}</span>
                          </button>
                        </div>
                        {guestOpen === i && (
                          <div className="brow" style={{ margin: '2px 0 8px', padding: '8px 6px' }}>
                            {(() => {
                              // Single source of truth: reads the SAME aggregation the
                              // Helpers panel (space sheet) uses — a food/task/setup/supply
                              // owner that resolved to THIS guest, not a second copy.
                              const roles = (() => { try { return guestHelperRoles(event, g.id); } catch { return []; } })();
                              if (!roles.length) return null;
                              return (
                                <div className="v-meta" style={{ margin: '0 0 8px', color: 'var(--ink-soft)' }}>
                                  Helping with: {roles.map(r => r.label).join(', ')}
                                </div>
                              );
                            })()}
                            <div className="actions-row" style={{ alignItems: 'center' }}>
                              <span className="of">kids:</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: Math.max(0, (Number(g.kids) || 0) - 1) }, null)}>−</button>
                              <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{Number(g.kids) || 0}</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: (Number(g.kids) || 0) + 1 }, (Number(g.kids) || 0) + 1 + ' kids with ' + (g.name || 'this guest') + ' — the food plan sizes them lighter.')}>+</button>
                              <input className="field" style={{ maxWidth: 125, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="+1 name"
                                value={g.plusOne || ''} onChange={e => writeGuest(i, { plusOne: e.target.value }, null)} aria-label="Plus one name" />
                              <input className="field" style={{ maxWidth: 150, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="needs? (vegan, nut…)"
                                value={g.needs || ''} onChange={e => writeGuest(i, { needs: e.target.value }, null)} aria-label="Dietary needs" />
                              <button className="mini" onClick={() => removeGuest(i)}>remove</button>
                            </div>
                            <div className="actions-row" style={{ marginTop: 8, alignItems: 'center' }}>
                              {/* Meal edit (guests parity gap #5): writes the SAME
                                  guest.meal field the RSVP page and CSV import write —
                                  tap cycles the invite's real meal choices. A free-text
                                  meal from a CSV shows as-is; tapping replaces it (an
                                  explicit host edit, confirmed by the toast). */}
                              <span className="of">meal:</span>
                              <button className="chip" style={{ padding: '5px 11px', fontSize: 'var(--t-pill)' }}
                                aria-label={'Meal for ' + (g.name || 'guest') + ' — tap to change'}
                                onClick={() => {
                                  const MC = ['—', 'Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];
                                  const cur = MC.indexOf(String(g.meal || '—'));
                                  // A free-text meal (cur === -1) steps into the choice
                                  // cycle at Standard — never straight to "cleared".
                                  const next = cur === -1 ? 'Standard' : MC[(cur + 1) % MC.length];
                                  writeGuest(i, { meal: next },
                                    next === '—'
                                      ? (g.name || 'Guest') + '’s meal cleared — counts as unanswered.'
                                      : (g.name || 'Guest') + ' → ' + next + ' — the meal tally keeps count.');
                                }}>{String(g.meal || '—') === '—' ? 'not answered' : g.meal}</button>
                              <input className="field" style={{ maxWidth: 140, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="phone" type="tel"
                                value={g.phone || ''} onChange={e => writeGuest(i, { phone: e.target.value }, null)} aria-label="Phone" />
                              <input className="field" style={{ maxWidth: 185, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="email" type="email"
                                value={g.email || ''} onChange={e => writeGuest(i, { email: e.target.value }, null)} aria-label="Email" />
                              <input className="field" style={{ maxWidth: 120, fontSize: 'var(--t-input)', padding: '6px 10px' }} placeholder="group" list="v2-groups"
                                value={g.group || ''} onChange={e => writeGuest(i, { group: e.target.value }, null)} aria-label="Group" />
                            </div>
                            {chase && !g.rsvp && (String(g.phone || '').trim() || String(g.email || '').trim()) && (() => {
                              // PER-GUEST chase — the engine's nudge (with the real
                              // RSVP link) straight to THIS person's phone or inbox.
                              const d = draftRsvpChase(event, profile, { rsvpUrl: inviteLinkUrl() });
                              const body = [d.subject, d.body].filter(Boolean).join('\n\n');
                              const first = String(g.name || 'them').split(/\s+/)[0];
                              return (
                                <div className="actions-row" style={{ marginTop: 8 }}>
                                  {String(g.phone || '').trim() && <a className="mini" style={{ textDecoration: 'none' }} href={'sms:' + encodeURIComponent(g.phone.trim()) + '?&body=' + encodeURIComponent(body)}>Text {first} the nudge</a>}
                                  {String(g.email || '').trim() && <a className="mini" style={{ textDecoration: 'none' }} href={'mailto:' + encodeURIComponent(g.email.trim()) + '?subject=' + encodeURIComponent(d.subject || 'Can you make it?') + '&body=' + encodeURIComponent(d.body || body)}>Email {first}</a>}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                    const names = [...new Set(withIdx.map(x => String(x.g.group || '').trim()).filter(Boolean))];
                    if (names.length <= 1) return withIdx.map(row);
                    const buckets = [...names, ''].map(gr => ({ gr, items: withIdx.filter(x => String(x.g.group || '').trim() === gr) })).filter(b => b.items.length);
                    return buckets.map(b => (
                      <div key={b.gr || 'ungrouped'}>
                        <div className="shelf-label" style={{ margin: '12px 0 2px' }}>{b.gr || 'Everyone else'} · {b.items.length}</div>
                        {b.items.map(row)}
                      </div>
                    ));
                  })()}
                  <datalist id="v2-groups">
                    <option value="Family" /><option value="Friends" /><option value="Work" /><option value="Neighbors" />
                  </datalist>
                  {quickAdd}
                  {csvBlock}
                  {pastImports}
                  {exportRow}
                </>
              ) : (
                <>
                  {guestHero}
                  <div className="v-meta" style={{ padding: '2px 2px 4px' }}>
                    No list yet{guests ? ' — you’re planning around ' + guests + ' for now' : ''}. A real list is what unlocks RSVPs, the confirmed count, and the caterer check.
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 10px' }}>
                    <button className="mini" onClick={() => { setGuestDraft(''); setGuests(Math.max(1, (Number(guests) || 0) - 1)); }} aria-label="Fewer guests">−</button>
                    <input className="field" style={{ width: 72, textAlign: 'center', fontSize: 'var(--t-input)', padding: '8px 6px' }}
                      type="number" inputMode="numeric" min="1"
                      value={guestDraft !== '' ? guestDraft : (Number(guests) || '')}
                      onFocus={() => setGuestDraft(String(Number(guests) || ''))}
                      onChange={e => setGuestDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { const n = parseInt(guestDraft, 10); if (n > 0) setGuests(n); setGuestDraft(''); }
                        else if (e.key === 'Escape') setGuestDraft('');
                      }}
                      onBlur={() => { const n = parseInt(guestDraft, 10); if (n > 0) setGuests(n); setGuestDraft(''); }}
                      aria-label="Exact guest count" />
                    <button className="mini" onClick={() => { setGuestDraft(''); setGuests((Number(guests) || 0) + 1); }} aria-label="More guests">+</button>
                    <span className="of">guests</span>
                  </div>
                  {/* KIDS-INVISIBLE FIX: by-headcount hosts (no roster to sum
                      kids from — writeGuest's kidsTotal() bridge only runs
                      once names exist) had NO way to tell the app how many
                      of the count are kids, so the food/protein engine always
                      saw zero and sized for full adults. Legacy already has
                      this exact stepper (App.js ~32283, "Of your N, how many
                      are kids / light eaters?") wired straight to
                      event.kidsCount, which lib/playbooks/index.js's
                      proteinGuests already reads — same field, same engine,
                      V2 just never collected it in this mode. */}
                  {Number(guests) > 0 && (() => {
                    const kids = Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(event.kidsCount) || 0)));
                    const setK = (v) => patchEvent({ kidsCount: Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(v) || 0))) },
                      'Of your ' + guests + ', ' + Math.max(0, Math.min(Number(guests) || 0, Math.round(Number(v) || 0))) + ' are kids — food sizes them lighter.');
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                        <button className="mini" onClick={() => setK(kids - 1)} aria-label="Fewer kids or light eaters">−</button>
                        <span className="of" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, color: 'var(--ink-soft)' }}>{kids}</span>
                        <button className="mini" onClick={() => setK(kids + 1)} aria-label="More kids or light eaters">+</button>
                        <span className="of">of your {guests} are kids / light eaters</span>
                      </div>
                    );
                  })()}
                  <div className="actions-row" style={{ margin: '0 0 4px' }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                  </div>
                  <p className="grounding" style={{ margin: '0 0 6px' }}>Guests who open the link reply themselves — names, meals, kids, plus-ones — and the list builds on its own.</p>
                  {inviteRules}
                  {nudgeFor('guests') || nudgeFor('message')}
                  {countingChips}
                  {(() => { // INTEL R1 — the only hostIntelligence read-forward: gated + clamped by the engine
                    try {
                      const adj = attendanceAdjustment(profile, event);
                      return adj && adj.applied && adj.because
                        ? <p className="grounding" style={{ margin: '0 0 8px' }}>{adj.because}</p>
                        : null;
                    } catch { return null; }
                  })()}
                  {nudgeFor('guests')}
                  {quickAdd}
                  {csvBlock}
                  {pastImports}
                </>
              );
            })()}
          </div>
        </>
      )}

      {spot && <div className="dimveil" onClick={() => { clearTimeout(spotTimer.current); setSpot(null); }} />}

      {wxImpact && stage === 'plan' && (
        <div className={'wxpill' + (wxOpen ? ' open' : '')}>
          <button className="wxpill-head" onClick={() => { setWxOpen(o => !o); feedback('tick'); }} aria-expanded={wxOpen}>
            <span className="wx-glyph">☂</span>
            <span className="wx-line">
              {/* The sample marker rides the COLLAPSED line — the only line most
                  hosts read. A forecast claim may never outrun its source. */}
              {wxOpen ? 'Weather on your day' : (wx._sample ? 'Sample forecast · ' : '') + rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}
            </span>
            <span className="chev" style={{ position: 'static' }}>{wxOpen ? '▾' : '›'}</span>
          </button>
          {wxOpen && (
            <div className="wx-body">
              <p className="wx-headline">{(wx._sample ? 'Sample forecast · ' : '') + rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}</p>
              {wx.rainWindow && <p className="grounding" style={{ margin: '4px 0 0' }}>Rain looks most likely {wx.rainWindow.label} — {wx._sample ? 'sample timing for this preview, not a live read' : wxImpact.confidence === 'hourly' ? 'from the hour-by-hour read' : 'timing is a day-level read'}.</p>}
              {/* WEATHER-IMPACT-1 (queue item 4): the engine's per-phase rows,
                  not a hand-built summary — each names its own moment. */}
              {(wxImpact.affectedPhases || []).slice(0, 3).map(ph => (
                <p key={ph.phase || ph.label} className="grounding" style={{ margin: '6px 0 0' }}>
                  <strong style={{ color: 'var(--ink-soft)' }}>{ph.label || ph.phase}</strong>{ph.summary ? ' — ' + ph.summary : ''}
                </p>
              ))}
              <div className="actions-row" style={{ marginTop: 10 }}>
                {/* CTAs follow the ENGINE's prompts, not a local guess */}
                {(wxImpact.shouldPromptRainPlan || !rainPlanStatus(event).hasPlan) && (
                  <button className="cta" onClick={() => { setWxOpen(false); setSheet({ kind: 'rain' }); }}>
                    {rainPlanStatus(event).hasPlan ? 'Review the backup' : 'Add a rain backup'}
                  </button>
                )}
                {!wxImpact.shouldPromptRainPlan && rainPlanStatus(event).hasPlan && (
                  <button className="cta" onClick={() => { setWxOpen(false); setSheet({ kind: 'rain' }); }}>Review the backup</button>
                )}
                {(wxImpact.shouldPromptGuestUpdate || rainPlanStatus(event).hasPlan) && (
                  <button className="mini" onClick={() => { setWxOpen(false); try { openDraft('Rain note to guests', guestRainMessage(event, wx)); } catch { toast('Couldn’t draft the note.'); } }}>
                    {wxImpact.shouldPromptGuestUpdate ? 'Tell the guests' : 'Guest note'}
                  </button>
                )}
              </div>
              {wx._sample
                ? <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Sample forecast for this preview — live weather turns on with the API key.</p>
                : <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Live forecast for {event.venueCity || event.venue}.</p>}
            </div>
          )}
        </div>
      )}

      <nav className={'dock' + (dockHidden ? ' dock-hidden' : '')} aria-label="Sections">
        <button aria-current={stage === 'create'} onClick={() => setStage('create')}>Create</button>
        <button aria-current={stage === 'plan'} onClick={() => setStage('plan')}>Plan</button>
        <button aria-current={stage === 'day'} onClick={() => setStage('day')}>The Day</button>
        <button aria-current={stage === 'after'} onClick={() => setStage('after')}>After</button>
      </nav>

      {toastMsg && (
        <div className="toast on">
          {toastMsg}
          {toastAction && (
            <button className="toast-undo" onClick={() => {
              const fn = toastAction.fn;
              setToastMsg(null); setToastAction(null); clearTimeout(toastTimer.current);
              if (fn) fn();
            }}>{toastAction.label || 'Undo'}</button>
          )}
        </div>
      )}

      {/* Print-only day sheet — a paper cue sheet a helper can hold (window.print
          from The Day). Same effectiveRos truth, nothing screen-only. */}
      {ros.length > 0 && (
        <div className="printsheet" aria-hidden="true">
          <h1>{event.name}</h1>
          <p className="p-sub">
            {event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            {event.venue ? ` · ${event.venue}` : ''}{event.venueCity ? `, ${event.venueCity}` : ''}
            {event.rainPlan ? ` · If it rains: ${event.rainPlan}` : ''}
          </p>
          <div className="p-head">Run of show</div>
          {ros.map((r, i) => (
            <div className="p-row" key={r.id || i}>
              <span className="p-time">{r.time || '—'}</span>
              <span>
                {r.segment}
                <span className="p-meta">
                  {[r.location, r.owner && ('owner: ' + r.owner), r.vendorName, r.notes].filter(Boolean).map(x => ' · ' + x).join('')}
                </span>
              </span>
            </div>
          ))}
          {dayHelpers.length > 0 && (
            <>
              <div className="p-head">Who’s helping</div>
              {dayHelpers.map((h, i) => (
                <div className="p-row" key={i}>
                  <span className="p-time">{h.time || ''}</span>
                  <span>{h.name}<span className="p-meta">{h.role ? ' · ' + h.role : ''}</span></span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Boot splash overlay — last child so it paints over dock/toast/sheet */}
      {splashEl}
    </div>
  );
}
