// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production engines: eventPlan() (CommandCenter.jsx), identityStatement()
// (lib/eventIdentity), real sample events, real budget + run-of-show data.
// Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { eventPlan, getEventReadiness } from '@app/CommandCenter';
import { buildAssembleRevealStages, unresolvedBlockerStages } from '@app/lib/assembleRevealEngines';
import { buildExperienceContext } from '@app/lib/experienceContext';
import { deriveHelperResponsibilities, helperStatusLine } from '@app/lib/helperResponsibility';
import { buildCrabPlan, defaultCountPerUnit } from '@app/lib/crabPlan';
import { positiveAttention } from '@app/lib/positiveAttention';
import { showsReplyTracking } from '@app/lib/guestMode';
import { isLikelyOutdoor, suggestRainPlan, guestRainMessage, weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus, weatherLogistics, isWeatherConfigured, geocodeVenue, getEventWeatherRisk } from '@app/lib/weather';
import { playMessageChime, setMessageSoundMuted } from '@app/lib/notificationSound';
import { draftInvite, draftShoppingList, draftVendorOutreach, draftThankYou, draftRsvpChase, draftHelperBrief, draftVendorReconfirm, hasToastMaterial, draftToast } from '@app/lib/doItForMe';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor } from '@app/lib/dates';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { setLesson, getLesson } from '@app/lib/eventMemory';
import { purgeStaleOutbox, fetchEventRsvps, isRsvpApiConfigured } from '@app/lib/api/rsvp';
import { effectiveDoneDetail } from '@app/lib/taskEngine';
import Papa from 'papaparse';
import QRCode from 'qrcode';
import { PLATFORMS, transformRows, validateRows, computeMergeSummary, applyMerge } from '@app/lib/csvParsers';
import { deriveEventPhaseProgress } from '@app/lib/phaseProgress';
import { deriveEventCompressionSummary } from '@app/lib/workflowCompression';
import { buildDayBeforePlan } from '@app/lib/dayBefore';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { estimateTotalRange } from '@app/lib/budgetEstimator';
import { ALL_PLAYBOOKS, getPlaybook, playbookFoodPlan, effectiveRos, classifyRos, hostIsCooking, guestCountResolved, attendanceBand, attendanceBandLabel, playbookDecisionBoard, playbookCapacity, playbookRisks, supplyRetailLinks, playbookHeartMoments, playbookChecklist, playbookContingencyForWeather, crabPriceLadder, playbookOpenDecisionAffects, playbookTypicalGuests } from '@app/lib/playbooks';
import { buildReturnSnapshot, readReturnSnapshot, writeReturnSnapshot, deriveReturnNarration, narrationDuplicatesTelling } from '@app/lib/returnNarration';
import { makeRecord, appendDecision, latestRationaleForSubject } from '@app/lib/decisionMemory';
import { computeDayAlerts } from '@app/lib/dayAlerts';
import { getVendorCOIState } from '@app/lib/vendorIntelligence';
import { EVENT_TAXONOMY, resolveCanonicalType } from '@app/lib/eventTaxonomy.mjs';
import { ARTWORK_MARKS } from '@app/lib/artworkMarks';
import { isPlausibleCityText } from '@app/lib/cityText';
import { isFoodPricesConfigured, getFoodPriceFactor } from '@app/lib/foodPrices';
import { quickAccountabilityForVendor } from '@app/lib/vendorAccountability/derive';
import { deriveVendorPromiseConflicts } from '@app/lib/vendorAccountability/conflicts';
import { buildBudgetRecoveryPlan } from '@app/lib/budgetRecovery';
import { mergeGuestReplies } from '@app/lib/guestMerge';
import { parseMin } from '@app/lib/dayAlerts';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

// My Crab Feast: prefer the user's REAL event from the app's own storage
// (same-origin on the deployed site — the production app writes 'ngw-events');
// otherwise construct one from the Crab Feast playbook's real defaults.
let APP_EVENTS = [];
try { APP_EVENTS = JSON.parse(localStorage.getItem('ngw-events')) || []; } catch { APP_EVENTS = []; }
const appCrab = APP_EVENTS.find(e => e && /crab/i.test(String(e.name || '') + ' ' + String(e.type || '')));
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
export const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV, MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];

const ROSTER = [...ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean), MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];
const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

export const LS_PATCH = id => 'ngw-hostv2-patch-' + id;
export const LS_CUSTOM = 'ngw-hostv2-custom-event';

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
function useCountUp(target, dur = 650) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    if (REDUCE_MOTION || target === null || target === undefined || isNaN(target) || from === target) { setV(target); return; }
    const start = typeof from === 'number' && !isNaN(from) ? from : 0;
    const t0 = performance.now(); let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}


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

// Occasion choices = the REAL playbook catalog: every type the engine ships a
// full playbook for (same registry the app's type browse resolves against),
// minus the business types a host never plans.
const HOST_TYPES = ALL_PLAYBOOKS
  .map(pb => pb && pb.type)
  .filter(t => t && !/board meeting|conference|team retreat/i.test(t));

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

export default function HostShellV2() {
  const [stage, setStage] = useState('plan');
  const [eventId, setEventId] = useState(FALLBACK ? FALLBACK.id : null);
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_CUSTOM)) || null; } catch { return null; }
  });
  const [patch, setPatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PATCH(FALLBACK.id))) || {}; } catch { return {}; }
  });
  const [toastMsg, setToastMsg] = useState(null);
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
  const [createEdit, setCreateEdit] = useState(null); // which correction editor is open
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
    patchEvent({
      venue: v,
      venueKind: /backyard|house|home|yard|place|garden/i.test(v) ? 'home' : (event.venueKind || ''),
      ...(pendingCity && isPlausibleCityText(pendingCity) ? { venueCity: pendingCity } : {}),
    }, 'Venue on the plan — invites, maps, and the rain note now carry it.');
    setVenueErr(null); setVenueDraft(''); setPendingCity(''); setAddrSugs([]);
  };
  // At-home venues resolve the ORIGINAL's venue blocker via venueCity (the
  // same field weather geocoding reads) — so home events get a city ask.
  const needsCity = () => event.venueKind === 'home' && !String(event.venueCity || '').trim();
  const saveCity = () => {
    const c = cityDraft.trim();
    // CITY-LEAK-1's canonical gate — the same isPlausibleCityText every
    // venueCity seam in production uses; V2's looser inline regex let junk by.
    if (!isPlausibleCityText(c)) { toast('A town name or ZIP — “Annapolis”, “Silver Spring, MD”, “21401”.'); return; }
    patchEvent({ venueCity: c }, 'City noted — weather and the venue check now line up.');
    setCityDraft('');
  };
  // Voice input (Web Speech API) — the browser's own recognizer; nothing fake.
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const startVoice = () => {
    if (!SpeechRec) { toast('Voice input isn’t available in this browser — type it instead.'); return; }
    try {
      const r = new SpeechRec();
      recogRef.current = r;
      r.lang = 'en-US'; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (ev) => {
        const text = Array.from(ev.results).map(x => x[0] && x[0].transcript).join(' ').trim();
        if (text) { setSmartText(text); setFType(null); setCreateEdit(null); }
      };
      r.onend = () => setListening(false);
      r.onerror = () => { setListening(false); toast('Couldn’t hear that — try again or type it.'); };
      setListening(true);
      r.start();
      feedback('act');
    } catch { setListening(false); toast('Voice input didn’t start — type it instead.'); }
  };
  const stopVoice = () => { try { recogRef.current && recogRef.current.stop(); } catch {} setListening(false); };
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

  // Smart parse — every extraction is a REAL resolver: resolveCanonicalType
  // (taxonomy aliases), month/day + m/d date forms, count-near-people words,
  // possessive honoree, home-venue detection.
  const parsed = useMemo(() => {
    const t = String(smartText || '');
    // CANON-TYPE-1 fixed in the lib (named playbooks resolve before the
    // at-home catch-all; venue words are no longer type signals), so the
    // canonical resolver leads. The literal-mention scan stays only as a
    // fallback for catalog types the keyword table doesn't cover yet.
    let type = null;
    try { const c = resolveCanonicalType(t); if (c && HOST_TYPES.includes(c)) type = c; } catch { type = null; }
    if (!type) {
      const hit = HOST_TYPES.find(ht => t.toLowerCase().includes(ht.toLowerCase().replace(' party', '')));
      if (hit && hit.length > 3) type = hit;
    }
    let guests = null;
    const gm = t.match(/(?:for|about|around|~)\s*(\d{1,3})\b/i) || t.match(/\b(\d{1,3})\s*(?:people|guests|ppl|folks|friends|pickers)\b/i);
    if (gm) guests = parseInt(gm[1], 10);
    let date = null;
    // Relative forms first — "in 2 weeks", "tomorrow", "next saturday".
    const rel = t.match(/\bin\s+(\d+)\s+(day|week|month)s?\b/i);
    if (rel) {
      const d = new Date(); const n = parseInt(rel[1], 10);
      if (rel[2].toLowerCase() === 'day') d.setDate(d.getDate() + n);
      else if (rel[2].toLowerCase() === 'week') d.setDate(d.getDate() + n * 7);
      else d.setMonth(d.getMonth() + n);
      d.setHours(12); date = d.toISOString().slice(0, 10);
    } else if (/\btomorrow\b/i.test(t)) {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12); date = d.toISOString().slice(0, 10);
    } else {
      const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const wd = t.match(/\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      if (wd) {
        const d = new Date(); const target = DAYS.indexOf(wd[1].toLowerCase());
        let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7;
        d.setDate(d.getDate() + add); d.setHours(12); date = d.toISOString().slice(0, 10);
      }
    }
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const dm = date ? null : t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (dm) {
      const now = new Date(); const cand = new Date(now.getFullYear(), MONTHS.indexOf(dm[1].slice(0, 3).toLowerCase()), parseInt(dm[2], 10), 12);
      if (cand < now) cand.setFullYear(cand.getFullYear() + 1);
      date = cand.toISOString().slice(0, 10);
    } else if (!date) {
      const sm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (sm) {
        const now = new Date(); const y = sm[3] ? (sm[3].length === 2 ? 2000 + Number(sm[3]) : Number(sm[3])) : now.getFullYear();
        const cand = new Date(y, Number(sm[1]) - 1, Number(sm[2]), 12);
        if (!sm[3] && cand < now) cand.setFullYear(cand.getFullYear() + 1);
        if (!isNaN(cand)) date = cand.toISOString().slice(0, 10);
      }
    }
    const hm = t.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)[’']s\b/);
    const home = /backyard|back\s?yard|at home|my place|our (house|home)|the house/i.test(t);
    // Venue phrase kept VERBATIM — "my brother's backyard" is the venue, not
    // a generic "Backyard". Guests read this in invites and rain notes.
    const vm = t.match(/\b(?:in|at)\s+((?:my|our|his|her|their)\s+[a-z]+(?:['’]s)?\s+(?:backyard|back\s?yard|house|place|yard|home|garden|farm|cabin|lake house))\b/i)
      || t.match(/\b(?:in|at)\s+(the\s+(?:park|beach|clubhouse|pavilion|community center))\b/i);
    const venuePhrase = vm ? vm[1].charAt(0).toUpperCase() + vm[1].slice(1) : '';
    return {
      type, guests, date,
      honoree: hm ? hm[1] : null,
      venueKind: home || /\bmy|our\b/i.test(venuePhrase) ? 'home' : '',
      venue: venuePhrase || (home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : ''),
    };
  }, [smartText]);

  // Effective values: manual correction wins, then the parse, then the
  // playbook's own typical (host-shell defaulting — never a blank form).
  const effType = fType || parsed.type || null;
  const pbTypical = effType ? playbookTypicalGuests(effType) : null;
  const effGuests = (fGuests ?? parsed.guests) ?? pbTypical;
  const effDate = fDate || parsed.date || '';
  const effName = fName || parsed.honoree || '';
  const dstatC = eventDateStatus(effDate || null);
  const expectC = expectedFromPlanned(effGuests, effType, (() => { try { return effType ? getPlaybook(effType) : null; } catch { return null; } })());

  const base = eventId === 'custom' ? custom : (ALL_SAMPLES.find(e => e.id === eventId) || FALLBACK);
  const event = useMemo(() => ({ ...(base || FALLBACK), ...(eventId === 'custom' ? {} : patch) }), [base, patch, eventId]);

  // ── Regional price factor (queue item 3) — the production pipeline:
  // getFoodPriceFactor via the API base (BLS regional). State comes ONLY from
  // an explicit ', XX' in venueCity — never guessed. Neutral 1.0 otherwise.
  const [foodPP, setFoodPP] = useState({ priceFactor: 1, priceContext: null });
  useEffect(() => {
    let dead = false;
    const m = /,\s*([A-Za-z]{2})\s*$/.exec(String(event.venueCity || ''));
    const state = m ? m[1].toUpperCase() : null;
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
  const ctx = useMemo(() => { try { return buildExperienceContext(event, null, 1); } catch { return null; } }, [event]);

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
  // The essentials rail (phaseProgress), tight-timeline summary, and the
  // playbook's heart moments — the last of the audit list.
  const phaseCues = useMemo(() => { try { return deriveEventPhaseProgress(event); } catch { return null; } }, [event]);
  const compression = useMemo(() => { try { return deriveEventCompressionSummary(event, daysUntil); } catch { return null; } }, [event]);
  const heartMoments = useMemo(() => { try { return playbookHeartMoments(event) || []; } catch { return []; } }, [event]);
  const crab = useMemo(() => { try { return buildCrabPlan(event); } catch { return { relevant: false }; } }, [event]);
  // Captain White's July 2026 reference ladder — from the playbook's verified
  // knowledge. Shown as REFERENCE; a price only counts when the host taps it
  // in (CRAB-PRICING-1 hard rule: no fake market prices).
  const crabLadder = useMemo(() => { try { return crabPriceLadder(); } catch { return null; } }, []);

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
      (event.timeline || []).filter(t => t && !t.done).forEach(t => {
        const m = /T-(\d+)\s*d/i.exec(String(t.week || ''));
        let due = null, dd = null;
        if (m && event.date) {
          const d0 = new Date(event.date + 'T12:00:00'); d0.setDate(d0.getDate() - parseInt(m[1], 10));
          due = d0.toISOString().slice(0, 10);
          try { dd = daysUntil(due); } catch { dd = null; }
        }
        out.push({ label: t.task, due, days: dd, taskId: t.id, kind: 'step' });
      });
    } catch {}
    return out
      .filter(x => x.days == null || x.days >= 0)
      .sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : 1))
      .slice(0, 3);
  }, [decisionBoard, event]);
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
  const [foodGroupsOpen, setFoodGroupsOpen] = useState({}); // spread accordion
  const [foodSect, setFoodSect] = useState({}); // dietary/choices/sourcing folds
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
      const pool = [...ALL_SAMPLES, ...(custom ? [custom] : [])];
      const hit = pool.find(e => e && e.id !== event.id && e.type === event.type && String(e.lessons || '').trim() && isPastEvent(e));
      return hit ? { name: hit.name, lessons: String(hit.lessons).trim() } : null;
    } catch { return null; }
  }, [event.id, event.type, custom]);
  // ROW-LEVEL CTA RULE (Todd): a coming-up item lands on the exact field that
  // answers it — the crab order, the pickers count, the space list — never a
  // sheet top when a closer target exists.
  const routeUpNext = (u) => {
    const t = String(u.label || '');
    if (/pickers|light eaters/i.test(t)) { setSheet({ kind: 'crabs', focus: 'pickers' }); return; }
    if (/crab house|pre-?order|bushel|dozen|steam/i.test(t)) { setSheet({ kind: 'crabs', focus: 'order' }); return; }
    if (/rent or borrow|steamer pot|propane|tables|chairs|canopy/i.test(t)) { setSheet({ kind: 'space' }); return; }
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
        const q = String(event.venueCity || '').trim() || (!homeish ? String(event.venue || '').trim() : '');
        if (!q) return;
        const coords = await geocodeVenue(q);
        if (dead || !coords) return;
        const wxr = await getEventWeatherRisk(coords.lat, coords.lon, event.date);
        if (!dead && wxr) setLiveWx(wxr);
      } catch { /* stay quiet — no forecast beats a wrong one */ }
    })();
    return () => { dead = true; };
  }, [event.id, event.date, event.venue, event.venueCity, event.notes]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (eventId !== 'custom') { try { localStorage.setItem(LS_PATCH(eventId), JSON.stringify(patch)); } catch {} }
  }, [patch, eventId]);
  useEffect(() => {
    if (custom) { try { localStorage.setItem(LS_CUSTOM, JSON.stringify(custom)); } catch {} }
  }, [custom]);
  useEffect(() => { appRef.current?.scrollTo({ top: 0 }); }, [stage, eventId]);

  const switchEvent = (id) => {
    setEventId(id); setHandledOpen(false); setStage('plan'); setEditor(null); setSheet(null); setDayIdx(0);
    if (id !== 'custom') { try { setPatch(JSON.parse(localStorage.getItem(LS_PATCH(id))) || {}); } catch { setPatch({}); } }
  };

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3400);
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
  const [sheet, setSheet] = useState(null);   // deep-link landing: {kind, focus}
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
  const routeSheet = (route) => {
    if (!route || !route.tab) return false;
    if (route.tab === 'Vendors') { setSheet({ kind: 'vendors', focus: route.vendorId || null }); return true; }
    if (route.tab === 'Budget') { setSheet({ kind: 'budget', focus: null }); return true; }
    if (route.tab === 'Guests') { setSheet({ kind: 'guests', focus: null }); return true; }
    if (route.tab === 'Planning' && (route.foodFocus || /food/i.test(String(route.focusField || '')))) {
      setSheet({ kind: 'food', focus: route.foodFocus || null }); return true;
    }
    if (route.tab === 'Planning Tasks' || route.tab === 'Timeline' || route.tab === 'Planning') {
      setSheet({ kind: 'tasks', focus: route.taskId || null }); return true;
    }
    if (route.focusField === 'rain-plan') { setSheet({ kind: 'rain' }); return true; }
    if (route.focusField === 'crab-plan') { setSheet({ kind: 'crabs' }); return true; }
    if (/^fp-diet/.test(String(route.focusField || ''))) { setSheet({ kind: 'food', focus: 'diet' }); return true; }
    return false;
  };

  // Do-it-for-me: the app's REAL drafting engine (lib/doItForMe), verbatim.
  // Voice: the host's remembered writing personality — applies to every draft
  // until they change it. Deterministic re-shapes only (no fake AI).
  const [draftTone, setDraftTone] = useState(() => { try { return localStorage.getItem('ngw-hostv2-voice') || 'as-written'; } catch { return 'as-written'; } });
  const [draftBody, setDraftBody] = useState(null); // non-null = host's own edit
  useEffect(() => { try { localStorage.setItem('ngw-hostv2-voice', draftTone); } catch {} }, [draftTone]);
  const openDraft = (title, d) => {
    const body = d ? (typeof d === 'string' ? d : [d.subject, d.body].filter(Boolean).join('\n\n')) : '';
    if (!body.trim()) { toast('Nothing to draft yet — add a few more details first.'); return; }
    setDraftBody(null);
    setSheet({ kind: 'draft', title, body });
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

  // The 5 readiness signals — Basics (foundations) + the four pillars the
  // production readiness engine computes: decisions, people, checklist, paperwork.
  const readiness = useMemo(() => { try { return getEventReadiness(event); } catch { return null; } }, [event]);
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
    if (!cur && it.locked == null) {
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

  // Roster quick-add: paste names, one per line — a REAL guest list, which is
  // what unlocks RSVP intelligence, yes-counts, and the drift detector.
  const [rosterText, setRosterText] = useState('');
  const [guestOpen, setGuestOpen] = useState(null); // per-guest detail editor
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  // CSV import — the app's own parsers/merge (lib/csvParsers): 7 platforms,
  // email-primary name-fallback matching, preview before anything writes.
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPlatform, setCsvPlatform] = useState('ngw');
  const [csvPreview, setCsvPreview] = useState(null); // {mapped, summary, fileName}
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
            _valid: r._valid, _errors: r._errors,
          }));
          const summary = computeMergeSummary(event.guests || [], mapped, 'merge');
          setCsvPreview({ mapped, summary, fileName: file.name });
        } catch { toast('That file didn’t read as a guest CSV — check the platform pick.'); }
      },
      error: () => toast('Couldn’t read that file.'),
    });
  };
  const applyCsv = () => {
    if (!csvPreview) return;
    const merged = applyMerge(event.guests || [], csvPreview.mapped, 'merge', 'v2-' + Date.now());
    const kidsCount = merged.reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
    patchEvent({ guests: merged, kidsCount },
      (csvPreview.summary.willAdd || 0) + ' added · ' + (csvPreview.summary.willUpdate || 0) + ' updated from ' + csvPreview.fileName + ' — replies and needs came along.');
    setCsvPreview(null); setCsvOpen(false);
  };
  const writeGuest = (i, patch, msg) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, ...patch } : g);
    // kidsCount is the ENGINE's portion-skew knob (kids eat ~40% of adult
    // protein) — derive it from the roster so food re-prices automatically.
    const kidsCount = gs.reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
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
    const evs = [...ROSTER, ...(custom ? [custom] : [])].map(e => (e && e.id) === eventId ? event : e);
    const count = evs.reduce((sum, ev) => sum + ((ev && ev.commClient) || []).filter(m => m && m.direction === 'inbound').length, 0);
    if (prevInboundCount.current !== null && count > prevInboundCount.current) { try { playMessageChime(); } catch {} }
    prevInboundCount.current = count;
  }, [event, custom, eventId]);
  const feedback = (kind) => {
    if (muted) return;
    try { if (navigator.vibrate) navigator.vibrate(kind === 'magic' ? [12, 70, 12] : 10); } catch { /* no haptics */ }
    if (kind === 'magic') { try { playMessageChime(); } catch { /* no audio */ } }
  };

  const patchEvent = (obj, msg) => {
    if (eventId === 'custom') setCustom(c => ({ ...c, ...obj }));
    else setPatch(p => ({ ...p, ...obj }));
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
    const kidsCount = gs.reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
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
    if (/final guest count|confirm .*guest count/i.test(a.title || '')) return 'lockcount';
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
      return (
        <div className="chips hc-row">
          {[30, 50, 60, 75, 90, 120].map(n => (
            <button key={n} className="chip" aria-pressed={guests === n} onClick={() => setGuests(n)}>{n}</button>
          ))}
          <button className="chip" onClick={() => openDraft('Your invite', draftInvite(event, null, { rsvpUrl: inviteLinkUrl() }))}>Use the invite we wrote</button>
          {/* a confirmed-headcount event doesn't get pushed toward a roster —
              the mode chips below make the choice explicit instead */}
          {!counted && <button className="chip" onClick={() => setSheet({ kind: 'guests' })}>Start a real list</button>}
          <button className="chip" aria-pressed={counted}
            onClick={() => patchEvent({ guestMode: 'count' }, 'Headcount event — food and seats size to the number; replies optional.')}>By headcount</button>
          <button className="chip" aria-pressed={!counted && event.guestMode === 'list'}
            onClick={() => { patchEvent({ guestMode: 'list' }, 'Guest-list event — the roster drives the count.'); setSheet({ kind: 'guests' }); }}>By guest list</button>
        </div>
      );
    }
    if (kind === 'rain') return rainEditorBlock();
    if (kind === 'diet') {
      // The ENGINE's dietary model: dietCounts adds a real priced veg main and
      // flags related lines; dietaryNoted closes the cue (headcount events).
      const dc = event.dietCounts || {};
      // Keys must match the engine's DIET_KEYWORDS table verbatim ('Shellfish',
      // not 'Shellfish allergy') — dietCounts keys ARE the flag lookup keys.
      const DIETS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Shellfish'];
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
          onChange={e => { if (e.target.value) patchEvent({ date: e.target.value }, 'Date set — every countdown in the plan just moved.'); }} />
      </div>
    );
    if (kind === 'food') return (
      <div className="chips hc-row">
        {[['We’ll cook it', 'host cooks'], ['A caterer handles it', 'caterer'], ['Potluck', 'potluck']].map(([label, val]) => (
          <button key={val} className="chip" aria-pressed={(event.foodChoices || {}).sourcing === val}
            onClick={() => patchEvent({ foodChoices: { ...(event.foodChoices || {}), sourcing: val } },
              'Food planned: ' + label.toLowerCase() + ' — the plan just recomputed.')}>{label}</button>
        ))}
        {foodPlan && (
          <button className="chip" onClick={() => setSheet({ kind: 'food' })}>Open the spread ({foodPlan.itemCount} items)</button>
        )}
      </div>
    );
    if (kind === 'count') {
      // The engine's condition: catererCount must equal CONFIRMED yeses, not the
      // planned number — so only that choice actually closes the card.
      const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
      return (
        <div className="chips hc-row">
          <button className="chip" onClick={() => patchEvent({ catererCount: yes },
            'Caterer set to the ' + yes + ' confirmed yeses — the mismatch is closed.')}>
            Match confirmed yeses ({yes})
          </button>
          <button className="chip" onClick={() => patchEvent({ catererCount: guests },
            'Caterer told ' + guests + ' — the engine keeps flagging this until RSVPs catch up.')}>
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
                onClick={() => { patchEvent({ rainPlan: authored }, 'The ' + String(event.type).toLowerCase() + ' move it is.'); showGuestNote(authored); }}>
                The {String(event.type).toLowerCase()} move
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
    const est = estimateTotalRange({ type: event.type, guestCount: guests, date: event.date, timeOfDay: event.timeOfDay });
    // HOST MODEL: one number (event.totalBudget). Offered three ways — the
    // estimator's real low/mid/high as Lean / Typical / All-out chips (host
    // request, 2026-07-08), a custom number, and the range as a hint.
    const opts = est
      ? [...new Set([est.lowTotal, Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100, est.highTotal])]
      : [];
    const OPT_LABELS = ['Lean', 'Typical', 'All-out'];
    const setB = (n) => {
      setCustomBudget('');
      patchEvent({ totalBudget: n },
        'Budget set at ' + fmt(n) + ' — one number, yours to change anytime.');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ maxWidth: 170, fontSize: 15, padding: '10px 14px' }}
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
    const ev = {
      id: 'custom', rsvpCode: 'mine',
      name: effName ? effName + '’s ' + short : 'My ' + short,
      honoree: effName || '',
      type: effType, date: effDate || '', venue: parsed.venue || '', venueKind: parsed.venueKind || '',
      venueCity: isPlausibleCityText(fCity.trim()) ? fCity.trim() : '',
      guestMode: 'count',
      guestEstimate: effGuests || '',
      totalBudget: '',
      budget: [],
      guests: [], vendors: [], timeline: [],
    };
    // Canonical checklist over the real event object (date-relative offsets,
    // choice/caterer gates). No date yet → honestly empty; drafts later.
    try { ev.timeline = (playbookChecklist(ev) || []).map(r => ({ id: r.id, week: r.week || '', task: r.task || '', done: false, owner: '' })); } catch {}
    setCustom(ev); setEventId('custom'); setRevealed(true);
    // The Reveal, choreographed around the PRODUCTION reveal stages
    // (buildAssembleRevealStages): identity, blockers, domains, risks.
    clearRevealTimers();
    let lineCount = 4;
    try { lineCount = Math.min((buildAssembleRevealStages(ev, revealIdentityFor(ev), null, 1) || []).length, 5) + 1; } catch { /* default */ }
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
    try { return buildExperienceContext(ev, null, 1).eventIdentity; }
    catch { return { primaryEventType: (ev && ev.type) || 'Event', secondaryEventTypes: [], isCompound: false, complexity: 'standard', ceremonyComponents: [], participants: [], confidence: 0 }; }
  };
  // Production reveal stages for the created event — identity, blockers,
  // planning domains (with real $), risk preview.
  const revealStages = useMemo(() => {
    if (!revealed || !custom) return [];
    try { return (buildAssembleRevealStages(custom, revealIdentityFor(custom), null, 1) || []).slice(0, 5); }
    catch { return []; }
  }, [revealed, custom]);
  const revealLineCount = revealStages.length + 1;
  const revealEyebrow = revealStep > revealLineCount ? 'Here’s what we understood'
    : ['Reading your answers…', 'Sizing the crowd…', 'Pricing the spread…', 'Lining up your steps…'][Math.min(Math.max(revealStep - 1, 0), 3)];
  const customPlan = useMemo(() => {
    if (!revealed || !custom) return null;
    try { return eventPlan(custom, buildExperienceContext(custom, null, 1)); } catch { return null; }
  }, [revealed, custom]);

  // Run of show — the app's single source: playbook-derived (tracks the event's
  // time of day), a stored ros only when the host has taken ownership.
  const ros = useMemo(() => { try { return effectiveRos(event) || []; } catch { return Array.isArray(event.ros) ? event.ros : []; } }, [event]);
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
    if (/arrivals|vendors/i.test(to)) { setSheet({ kind: 'vendors' }); return; }
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

  // Micro-motion: hero + tile numbers settle in rather than snapping.
  const daysAnim = useCountUp(typeof days === 'number' ? Math.abs(days) : null);
  const doneAnim = useCountUp(plan.progress.done, 450);
  const gAnim = useCountUp(guests || 0);
  const bAnim = useCountUp(money.planned || 0);

  return (
    <div className="stagewrap">
      <div className={'app' + (stage === 'day' ? ' dark-stage' : '')} id="app" ref={appRef}>
        <div className="content">
          <div className="appbar">
            <div className="wordmark">Event Boss</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div className="appbar-note">V2 preview</div>
              <button className="sheet-x" style={{ padding: '3px 10px', fontSize: 10.5, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onClick={() => setSheet({ kind: 'events' })} aria-haspopup="true">
                {(eventId === 'custom' ? ((custom && custom.name) || 'Yours') : (/crab/i.test(String(event.name || '')) ? 'My Crab Feast' : event.type))} ▾
              </button>
              <button className="sheet-x" style={{ padding: '3px 10px', fontSize: 10.5 }} onClick={() => setMuted(m => !m)}>{muted ? 'Muted' : 'Sound on'}</button>
            </div>
          </div>

          {/* ══════════ CREATE ══════════ */}
          {stage === 'create' && (
            <section>
              {!revealed ? (
                <>
                  <div className="eyebrow">New event</div>
                  <h1 className="mega" style={{ fontSize: 'clamp(30px,10cqw,40px)', lineHeight: 1.05 }}>What are we planning?</h1>
                  <p className="mega-sub" style={{ fontSize: 15, fontWeight: 550, color: 'var(--muted)' }}>
                    Say it like you’d text a friend — I’ll take it from there.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <input
                      className="field" style={{ maxWidth: 'none', fontSize: 16.5, flex: 1 }}
                      placeholder={listening ? 'Listening…' : 'Try: crab feast for 20 in the backyard aug 2'}
                      value={smartText}
                      onChange={e => { setSmartText(e.target.value); setFType(null); setCreateEdit(null); }}
                      aria-label="Describe your event"
                    />
                    <button className="cta soft" style={listening ? { background: 'var(--warn-tint)', color: 'var(--warn)' } : undefined}
                      onClick={() => listening ? stopVoice() : startVoice()} aria-pressed={listening} aria-label="Speak it instead">
                      {listening ? 'Listening… tap to stop' : 'Say it'}
                    </button>
                  </div>
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
                          {effDate ? new Date(effDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date yet'}
                        </button>
                        <button className="chip" onClick={() => setCreateEdit(createEdit === 'name' ? null : 'name')}>
                          {effName ? 'For ' + effName : 'Who’s it for?'}
                        </button>
                        {parsed.venue ? <span className="chip" aria-pressed="true" style={{ pointerEvents: 'none' }}>{parsed.venue}</span> : null}
                        <button className="chip" aria-pressed={!!fCity.trim()} onClick={() => setCreateEdit(createEdit === 'city' ? null : 'city')}>
                          {fCity.trim() || 'Which town?'}
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
                            value={fCity} onChange={e => setFCity(e.target.value)} aria-label="Town or ZIP" />
                          <p className="grounding" style={{ margin: 0 }}>The town is how weather and maps find a backyard — it rides into the plan from day one.</p>
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
                </>
              ) : (
                <>
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
                  {/* The name lands LAST — the conclusion the plan reached, not a header */}
                  <h1 className={'mega title-drop' + (revealStep > revealLineCount ? ' in' : '')} style={{ fontSize: 'clamp(27px,8.5cqw,34px)', lineHeight: 1.1, marginTop: 6 }}>{custom?.name}</h1>
                  {/* identityStatement() — the production identity engine, verbatim */}
                  <p className={'mega-sub pre' + (revealStep > revealLineCount ? ' in' : '')} style={{ fontSize: 17, marginTop: 8 }}>{identityStatement(custom)}</p>
                  <p className={'grounding pre' + (revealStep > revealLineCount + 1 ? ' in' : '')}>All of this came straight from your answers — nothing made up.</p>
                  <div className={'actions-row pre' + (revealStep > revealLineCount + 1 ? ' in' : '')} style={{ marginTop: 24 }}>
                    <button className={'cta big' + (revealStep > revealLineCount + 1 ? ' glow-once' : '')} onClick={() => setStage('plan')}>Open your plan</button>
                    <button className="cta soft" style={{ padding: '13px 22px', borderRadius: 13 }} onClick={() => { clearRevealTimers(); setRevealed(false); }}>Change an answer</button>
                  </div>
                </>
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
                  unreadable letterspaced lines.) */}
              <div className="ev-head">
                <div className="ev-kicker">{event.type}</div>
                <div className="ev-title">{event.name}</div>
                {event.venue ? <div className="ev-venue">{event.venue}</div> : null}
              </div>
              <div className="mega">
                {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${daysAnim}d ago` : `${daysAnim} days`}
              </div>
              <p className="mega-sub">
                {(dstat.status === 'today' || dstat.status === 'tomorrow') && dstat.reason}
                {isPast && dstat.status !== 'today' && dstat.status !== 'tomorrow' && 'this one is behind you.'}
                {!isPast && days !== null && days > 1 && `until ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              </p>
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
                  <span className="t" style={{ color: 'var(--steel-soft)', fontWeight: 550, fontSize: 13 }}>{returnLine.line}</span>
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
                      {handledOpen ? "▴ readouts" : "▾ readouts"}
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
                      const openTasks = (event.timeline || []).filter(t => t && !t.done).length;
                      const nextCue = hasCues ? phaseCues.nextCue : null;
                      const basicsLine = plan.progress.total ? `basics ${plan.progress.done} of ${plan.progress.total}` : null;
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
                        sub = `essentials${basicsLine ? ' · ' + basicsLine : ''} · next: ${nl}`;
                      }
                      else if (openTasks > 0) sub = `essentials handled — but ${openTasks} checklist step${openTasks === 1 ? '' : 's'} still on the list. Not done yet.`;
                      else sub = 'essentials handled and the checklist is clear — ready for the day.';
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
                      ? (expect ? `planned around · likely ${expect.low}–${expect.high} on the day` : 'planned around')
                      : 'no count yet — the plan can’t size food or seats'}</div>
                  </div>
                </button>
                <button className="tile tile-c" onClick={() => setSheet({ kind: 'budget' })}>
                  <div className="t-label">Budget</div>
                  <div>
                    <div className="t-num">{money.planned ? fmt(bAnim) : '—'}</div>
                    <div className="t-sub" style={money.planned && money.committed > money.planned ? { color: 'var(--warn)' } : undefined}>
                      {money.planned ? `${fmt(money.committed)} spoken for · ${fmt(money.spent)} spent${money.committed > money.planned ? ' · over' : ''}` : 'no number yet — tap to set one'}
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
                        const openTasks = (event.timeline || []).filter(t => t && !t.done).length;
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
                          return 'next: ' + u.label + (u.due ? ' · by ' + new Date(u.due + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '') + ' ↓';
                        }
                        return 'Nothing waiting on you right now.';
                      }
                      const bits = [];
                      if (phaseCues && phaseCues.totalCount && phaseCues.completedCount < phaseCues.totalCount) {
                        bits.push(phaseCues.completedCount + ' of ' + phaseCues.totalCount + ' essentials handled');
                      }
                      const first = String(actions[0].title || '').replace(/\.+$/, '');
                      bits.push('first: ' + (first.length > 44 ? first.slice(0, 44) + '…' : first) + ' ↓');
                      return bits.join(' · ');
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
                  {(wins.items || []).length > 0 && (
                    <div className="pills" style={{ marginBottom: 8 }}>
                      {wins.items.map(w => (
                        <span key={w.key} className="pill p-ok" style={{ cursor: 'default' }}>{w.label}<span className="pill-note">{w.note}</span></span>
                      ))}
                    </div>
                  )}
                  {phaseCues && Array.isArray(phaseCues.items) && phaseCues.items.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '6px 0 4px' }}>The essentials</div>
                      {phaseCues.items.map((c, i) => c.handled ? (
                        <div key={c.id || i} className="line" style={{ padding: '5px 0' }}>
                          <span className="of">{c.id}</span><span className="amt" style={{ color: 'var(--ok)', fontWeight: 600 }}>handled</span>
                        </div>
                      ) : (
                        <button key={c.id || i} className="frow" style={{ padding: '8px 2px' }}
                          onClick={() => { if (c.route && routeSheet(c.route)) return; toast(c.cueLabel); }}>
                          <span className="f-main"><span className="f-name" style={{ fontSize: 13.5 }}>{c.cueLabel}</span></span>
                          <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span>
                        </button>
                      ))}
                    </>
                  )}
                  {heartMoments.length > 0 && (
                    <p className="grounding" style={{ marginTop: 10 }}>
                      Protect the moment: {String((heartMoments[0] && (heartMoments[0].label || heartMoments[0].title || heartMoments[0].moment)) || heartMoments[0]).slice(0, 120)}
                    </p>
                  )}
                  {(() => {
                    if (!readiness) return null;
                    // Family doctrine: home-hosted events have no vendors/paperwork
                    // expectation — those pillars don't apply, so they never show.
                    const fam = (EVENT_TAXONOMY[event.type] && EVENT_TAXONOMY[event.type].family) || '';
                    const home = fam === 'home_hosted';
                    const anyOverdue = (decisionBoard.open || []).some(r => r && r.status === 'overdue');
                    const callsPill = (decisionBoard.open || []).length
                      ? { status: anyOverdue ? 'AT_RISK' : 'ATTENTION', note: decisionBoard.open.length + ' open' }
                      : null;
                    // HOST WORDS, never percentages: the engine's checklist note can
                    // read "73%" — remap it to the honest count from the SAME
                    // timeline the pillar was scored on ("11 of 15 done").
                    const tlDone = (event.timeline || []).filter(t => t && t.done).length;
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
                      ...(home ? [] : [['People', readiness.vendor], ['Paperwork', readiness.document]]),
                      ['Checklist', checklistPill],
                    ].filter(([, r]) => r && r.status !== 'ON_TRACK'); // action-only: on-track never renders
                    if (!pillars.length) return <p className="grounding" style={{ margin: '2px 0 6px' }}>All quiet — nothing flagged.</p>;
                    return (
                      <div className="pills">
                        {pillars.map(([label, r]) => (
                          <button key={label} className={'pill ' + (r.status === 'ATTENTION' ? 'p-warn' : 'p-risk')}
                            onClick={() => {
                              if (label === 'Checklist') setSheet({ kind: 'tasks', focus: null });
                              else if (label === 'Calls to make') setSheet({ kind: 'decisions', focus: null });
                              else toast(label + ' — ' + (r.label || '') + (r.note ? ': ' + r.note : ''));
                            }}>
                            {label}<span className="pill-note">{r.note}</span>
                          </button>
                        ))}
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
                  <h3>{dayBefore.headline}</h3>
                  {dayBefore.moment && <p><strong style={{ color: 'var(--carbon-text)' }}>Protect the moment:</strong> {dayBefore.moment.text}</p>}
                  {(dayBefore.sections || []).slice(0, 5).map(sec => (
                    <button className="then-row" key={sec.key} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: '7px 0' }}
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
                      <span className="d" style={{ minWidth: 108 }}>{sec.label}</span>
                      <span style={{ color: 'var(--carbon-muted)', flex: 1 }}>{sec.detail}</span>
                      <span className="chev" style={{ position: 'static', color: 'var(--carbon-muted)' }}>›</span>
                    </button>
                  ))}
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
                            “{event.venue}” is named — the venue check also needs the town, so weather and maps can find it.
                          </p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input className="field" style={{ maxWidth: 180 }} placeholder="Annapolis"
                              value={cityDraft} onChange={e => setCityDraft(e.target.value)} aria-label="City or town" />
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
                  onClick={() => setSheet({ kind: 'tasks', focus: null })}>
                  <span className="t" style={{ color: 'var(--warn)' }}>{compression.headline}</span>
                  {compression.meta && compression.meta.sub && <span className="of" style={{ color: 'var(--warn)' }}> {compression.meta.sub}</span>}
                </button>
              )}

              {!isPast && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>
                    {hasMeaning
                      ? 'The moment that must happen: ' + (String(event.must_have_moment || event.meaning_why || event.honoree_story).slice(0, 52)) + (String(event.must_have_moment || event.meaning_why || event.honoree_story).length > 52 ? '…' : '')
                      : 'Make it yours — the story, the feeling, the one moment that must happen'}
                  </span>
                  {hasToastMaterial(event) && <button className="mini" onClick={() => { try { openDraft('Your toast', draftToast(event, null)); } catch { toast('Couldn’t draft it.'); } }}>Toast</button>}
                  <button className="mini" onClick={openMeaning}>{hasMeaning ? 'Edit' : 'Add it'}</button>
                </div>
              )}
              {lastLesson && (
                <div className="later-row" style={{ marginTop: 10 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>
                    From your last {String(event.type).toLowerCase()}: “{lastLesson.lessons.slice(0, 70)}{lastLesson.lessons.length > 70 ? '…' : ''}”
                  </span>
                </div>
              )}
              {String(event.venue || '').trim() && needsCity() && !venueBlockerShown && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>What city or town? Weather and maps need it.</span>
                  <input className="field" style={{ maxWidth: 130, fontSize: 13, padding: '6px 10px' }} placeholder="Annapolis"
                    value={cityDraft} onChange={e => setCityDraft(e.target.value)} aria-label="City or town" />
                  <button className="mini" onClick={saveCity}>Save</button>
                </div>
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
              {plan && plan.planningState && plan.planningState.reasoning && (
                <p className="grounding" style={{ margin: '-8px 0 14px' }}>{plan.planningState.reasoning}</p>
              )}

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


              {foodPlan && foodPlan.itemCount > 0 && foodPlan.boughtCount < foodPlan.itemCount && (
                <button className="fold-btn" onClick={() => setSheet({ kind: 'food' })}>
                  The spread &amp; shopping — {foodPlan.boughtCount} of {foodPlan.itemCount} bought
                  <span className="chev">›</span>
                </button>
              )}

              {actions.length <= 1 && upNext.length > 0 && (
                <>
                  <div className="sect" style={{ marginTop: 26 }}><h2 style={{ fontSize: 17 }}>Coming up</h2><div className="rule" /><span className="when">dated, not urgent</span></div>
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

              {crab.relevant && (
                <button className="fold-btn" onClick={() => setSheet({ kind: 'crabs' })}>
                  The crab order — {crab.lines && crab.lines.length ? (crab.mixedSummary || ('about ' + crab.totalEstimatedCrabs + ' crabs')) : 'not started'}
                  <span className="chev">›</span>
                </button>
              )}
              {((capacity && (capacity.items || []).length > 0) || helpers.length > 0) && (
                <button className="fold-btn" onClick={() => setSheet({ kind: 'space' })}>
                  Space, seats &amp; helpers{helperPeople.length ? ` — ${helperPeople.length} helping` : ''}
                  <span className="chev">›</span>
                </button>
              )}
              {risks && risks.count > 0 && (
                <button className="fold-btn" onClick={() => setSheet({ kind: 'risks' })}>
                  What could go wrong — {risks.count} to know about
                  <span className="chev">›</span>
                </button>
              )}

              {rollup && rollup.counts && rollup.counts.total > 0 && (rollup.counts.needsAttention > 0 || rollup.counts.missing > 0) && (
                <div className="day-node">
                  <div className="eyebrow">People you’re hiring · {rollup.counts.ready} of {rollup.counts.total} ready</div>
                  <h3>{rollup.label}</h3>
                  {rollup.nextAction && <p>{rollup.nextAction}</p>}
                  {rollup.ctaLabel && (
                    <button className="cta" onClick={() => { if (!routeSheet(rollup.target)) toast('In the app this opens: ' + (describeRoute(rollup.target) || 'Vendors')); }}>
                      {rollup.ctaLabel}
                    </button>
                  )}
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
              {dayAlerts.map(a => (
                <button key={a.id} onClick={() => alertSheet(a)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    borderRadius: 14, padding: '12px 14px', marginBottom: 8, font: 'inherit',
                    background: a.tier === 'critical' ? 'var(--danger-tint)' : a.tier === 'warning' ? 'var(--warn-tint)' : 'var(--steel-tint)',
                    color: 'var(--carbon-text)',
                  }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 750, color: a.tier === 'critical' ? 'var(--danger)' : a.tier === 'warning' ? 'var(--warn)' : 'var(--steel-soft)' }}>{a.headline}</span>
                  {a.move && <span style={{ display: 'block', fontSize: 12.5, marginTop: 2, color: 'var(--carbon-muted)' }}>{a.move}</span>}
                </button>
              ))}
              {dayAllDone ? (
                <div className="now-card" style={{ borderColor: 'var(--ok)', marginTop: 6 }}>
                  <div className="now-label" style={{ color: 'var(--ok)' }}>Everything handled</div>
                  <h2>That’s a wrap.</h2>
                  <p className="meta">All {ros.length} moments run, in order. Enjoy what’s left of the day.</p>
                </div>
              ) : nowCue && (
                <div className="now-card" style={{ marginTop: 6 }}>
                  <div className="now-label">{nowActive ? 'Happening now' : (dayStarted ? 'Next up' : 'Up first') + (nowCue.time ? ' · ' + nowCue.time : '')}</div>
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
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Then · {cuesAfterNow.length} more moment{cuesAfterNow.length === 1 ? '' : 's'}</div>
                  {cuesAfterNow.slice(0, 7).map((r, i) => {
                    const m = cueMins(r.time);
                    const behind = m !== null && m < nowMin;
                    return (
                      // Tappable: a behind-schedule host records finished-late work
                      // right on the row (same single-truth rosDone write) — the
                      // NOW card alone can't reach a cue whose time already passed.
                      <button className="then-row" key={r.id || i}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--carbon-line)', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
                        onClick={() => { if (r.id) patchEvent({ rosDone: { ...(event.rosDone || {}), [r.id]: true } }, 'Recorded: ' + String(r.segment || '').slice(0, 44) + '…'); }}>
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
                  {cuesAfterNow.length > 7 && <div className="then-row"><span className="d" /><span style={{ color: 'var(--carbon-muted)' }}>+ {cuesAfterNow.length - 7} more, through the last item</span></div>}
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
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--carbon-muted)' }}>{h.role}</span>
                      </span>
                      <span className="d" style={{ minWidth: 0 }}>{h.time || ''}</span>
                    </div>
                  ))}
                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button className="cta soft" onClick={() => { try { openDraft('Everyone’s part today', draftHelperBrief(event, null, { ros })); } catch { toast('Couldn’t draft it.'); } }}>
                      Send everyone their part
                    </button>
                    <button className="mini" onClick={() => window.print()}>Print the day sheet</button>
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
                  <h1 className="mega" style={{ fontSize: 'clamp(28px,9cqw,36px)', lineHeight: 1.08 }}>No run of show yet</h1>
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
                  </div>
                  {dayIdx < ros.length - 1 && (
                    <div className="then">
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Then · {ros.length - 1 - dayIdx} more moments</div>
                      {ros.slice(dayIdx + 1, dayIdx + 8).map((r, i) => (
                        <div className="then-row" key={r.id || i}>
                          <span className="d">{r.time}</span>
                          <span>{r.segment}{r.vendorName ? ' — ' + r.vendorName : ''}</span>
                        </div>
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
              <h1 className="mega" style={{ fontSize: 'clamp(30px,10cqw,42px)', lineHeight: 1.02 }}>
                {isPast ? 'How it landed.' : 'How it’ll land.'}
              </h1>
              <p className="mega-sub" style={{ fontSize: 16 }}>
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
                  <div className="card no-hover"><div className="card-head" style={{ cursor: 'default' }}>
                    {hostSpendRows().map(r => (
                      <div className="line" key={r.label}>
                        <span>{r.label}</span>
                        <span className="amt">{fmt(r.got)} <span className="of">of ~{fmt(r.est)}</span></span>
                      </div>
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
              {/* Event memory capture — writes event.lessons via the canonical
                  setLesson (lib/eventMemory); recalled on Plan for the next
                  same-type event. Past events only — a preview has no lessons. */}
              {isPast && (
                <div style={{ marginTop: 12 }}>
                  <div className="shelf-label" style={{ marginBottom: 6 }}>For next time — the one thing you’d tell yourself</div>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 14 }}
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
                <button className="cta" onClick={() => openDraft('The thank-you', draftThankYou(event, null))}>Draft the thank-you</button>
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
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : sheet.kind === 'decisions' ? 'Calls to make' : sheet.kind === 'space' ? 'Space, seats & helpers' : sheet.kind === 'risks' ? 'What could go wrong' : sheet.kind === 'rain' ? 'If it rains' : sheet.kind === 'crabs' ? 'The crab order' : sheet.kind === 'events' ? 'Your events' : sheet.kind === 'meaning' ? 'Make it yours' : sheet.kind === 'qr' ? 'Scan to RSVP' : sheet.kind === 'sweep' ? 'Make sure everyone’s coming' : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {sheet.kind === 'decisions' && (
              <>
                {(decisionBoard.open || []).length ? (decisionBoard.open || []).map((r, i) => (
                  <button key={r.id || i} className={'frow' + (sheet.focus && sheet.focus === r.id ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                    onClick={() => { if (r.route && routeSheet(r.route)) return; toast(r.because || r.label); }}>
                    <span className="f-main">
                      <span className="f-name">{r.label}
                        {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>overdue</span>}
                      </span>
                      {r.because && <span className="v-meta">{r.because}</span>}
                    </span>
                  </button>
                )) : <div className="v-meta" style={{ padding: '14px 2px' }}>Nothing waiting on you.</div>}
                {(decisionBoard.locked || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 4px' }}>Settled</div>
                    {(decisionBoard.locked || []).map((r, i) => {
                      const why = latestRationaleForSubject(event, r.id);
                      return (
                        <div key={r.id || i}>
                          <div className="line" style={{ alignItems: 'center' }}>
                            <span>{r.label}</span>
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="of">{r.because}</span>
                              {!why && whyOpen !== r.id && (
                                <button className="mini" onClick={() => { setWhyOpen(r.id); setWhyText(''); }}>note why</button>
                              )}
                            </span>
                          </div>
                          {why && <p className="grounding" style={{ margin: '0 0 6px' }}>Your call: “{why}”</p>}
                          {whyOpen === r.id && (
                            <div className="actions-row" style={{ margin: '0 0 8px', alignItems: 'center' }}>
                              <input className="field" style={{ maxWidth: 'none', flex: 1, fontSize: 13, padding: '8px 12px' }}
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
                        <input className="field" style={{ maxWidth: 58, fontSize: 13, padding: '6px 10px' }} type="number" min="0" max={baseNeed}
                          value={have || ''} placeholder="0" aria-label={'How many ' + (it.short || it.item) + ' you have'}
                          onChange={e => setHave(parseInt(e.target.value, 10) || 0)} />
                        <input className="field" style={{ maxWidth: 110, fontSize: 13, padding: '6px 10px' }} type="text"
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
                    <div className="shelf-label" style={{ margin: '14px 0 4px' }}>Who’s helping</div>
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
            {sheet.kind === 'risks' && (
              <>
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
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 58, resize: 'vertical', fontSize: 14 }} placeholder={ph}
                        value={meaningDraft[key]} onChange={e => setMeaningDraft(d => ({ ...d, [key]: e.target.value }))} aria-label={label} />
                    ) : (
                      <input className="field" style={{ maxWidth: 'none', fontSize: 14 }} placeholder={ph}
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
                    <button className="mini" onClick={() => { try { openDraft('Your toast', draftToast({ ...event, ...meaningDraft }, null)); } catch { toast('Couldn’t draft it.'); } }}>
                      Draft the toast
                    </button>
                  )}
                </div>
              </>
            )}
            {sheet.kind === 'events' && (
              <>
                {[...ROSTER, ...(custom ? [{ id: 'custom', _custom: true }] : [])].map((e, i) => {
                  const isActive = e.id === eventId || (e._custom && eventId === 'custom');
                  const src = e._custom ? custom : e;
                  const d = daysUntil(src.date);
                  const label = e._custom ? ((custom && custom.name) || 'Yours') : (e === MY_CRAB_FEAST ? 'My Crab Feast' : e.type);
                  return (
                    <button key={e.id} className={'frow' + (isActive ? ' rowfocus' : '')} style={{ animation: `cardin 260ms var(--ease-out) ${Math.min(i, 8) * 30}ms both` }}
                      onClick={() => { switchEvent(e._custom ? 'custom' : e.id); setSheet(null); }}>
                      <span className="f-main">
                        <span className="f-name">{label}{isActive ? <span className="tag plan">current</span> : null}</span>
                        <span className="v-meta">{src.name === label ? '' : src.name}{src.venue ? (src.name === label ? '' : ' · ') + src.venue : ''}</span>
                      </span>
                      <span className="of" style={{ whiteSpace: 'nowrap' }}>{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : 'in ' + d + 'd'}</span>
                    </button>
                  );
                })}
                {eventId !== 'custom' && Object.keys(patch).length > 0 && (
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
              return (
                <>
                  {crab.coverageCopy && <div className="v-meta" style={{ padding: '0 2px 6px' }}>{crab.coverageCopy}</div>}
                  {lines.length > 0 && (
                    <div className="v-meta" style={{ padding: '0 2px 10px' }}>
                      About {crab.totalEstimatedCrabs} crabs{crab.coveredCrabsPerPerson != null ? ' · ~' + (Math.round(crab.coveredCrabsPerPerson * 10) / 10) + ' each' : ''}
                      {crab.totalEstimatedCost != null ? ' · about ' + fmt(crab.totalEstimatedCost) + ' from your prices' : ' · add prices to see the cost'}
                      {crab.boughtCost > 0 ? ' · ' + fmt(crab.boughtCost) + ' bought' : ''}
                    </div>
                  )}
                  {lines.map((l, i) => (
                    <div className="line" key={l.id || i}>
                      <span>
                        {l.quantity}× {UNIT_LABEL[l.unit] || l.unit} {SIZE_LABEL[l.size] || l.size}
                        {Number(l.pricePerUnit) > 0 ? <span className="of"> · {fmt(l.pricePerUnit)} each</span> : <span className="of"> · no price yet</span>}
                      </span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="mini" style={l.bought ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                          onClick={() => {
                            // COST-TRUTH GATE: a crab line needs its real price
                            // before it can be bought — same rule as the spread.
                            if (!l.bought && !(Number(l.pricePerUnit) > 0)) {
                              toast('Enter what this line cost first — tap a reference price or type your crab house’s quote.');
                              return;
                            }
                            writeCp({ lines: lines.map((x, ix) => ix === i ? { ...x, bought: !x.bought } : x) }, l.bought ? 'Back on the order.' : 'Marked bought — real spend now, not an estimate.');
                          }}>
                          {l.bought ? 'bought' : 'got it?'}
                        </button>
                        <button className="mini" onClick={() => writeCp({ lines: lines.filter((_, ix) => ix !== i) }, 'Line removed — the coverage math just recomputed.')}>×</button>
                      </span>
                    </div>
                  ))}
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
                    <input className="field" style={{ maxWidth: 80, fontSize: 15, padding: '10px 12px' }} type="number" min="0"
                      placeholder={String(guests || '')} aria-label="Serious crab pickers"
                      value={cp.crabEatingHeadcount || ''}
                      onChange={e => { const n = parseInt(e.target.value, 10) || 0; writeCp({ crabEatingHeadcount: n || undefined }, n ? 'Sizing crabs to ' + n + ' pickers — kids and light eaters don’t drive the count.' : 'Back to the full headcount.'); }} />
                    <span className="of" style={{ flex: 1 }}>serious pickers — kids and light eaters don’t drive the crab count</span>
                  </div>
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
                    <input className="field" style={{ maxWidth: 70, fontSize: 15, padding: '10px 12px' }} type="number" min="1" aria-label="How many"
                      value={crabAdd.qty} onChange={e => setCrabAdd(a => ({ ...a, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
                    <input className="field" style={{ maxWidth: 120, fontSize: 15, padding: '10px 12px' }} type="number" min="0" placeholder="$ each" aria-label="Price each"
                      value={crabAdd.price} onChange={e => setCrabAdd(a => ({ ...a, price: e.target.value }))} />
                    <button className="cta" onClick={() => {
                      const l = { id: 'cl-' + lines.length + '-' + crabAdd.size + '-' + crabAdd.unit, size: crabAdd.size, unit: crabAdd.unit, quantity: crabAdd.qty, pricePerUnit: parseFloat(crabAdd.price) || undefined, countPerUnit: defaultCountPerUnit(crabAdd.size, crabAdd.unit) || undefined };
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
                  <p className="grounding" style={{ margin: '2px 0 10px' }}>
                    {reconfirmedN === total
                      ? 'That’s everyone — the day is set.'
                      : 'Each note already knows their arrival time and your address. Send from your own thread — nothing goes out by itself.'}
                  </p>
                  <div className="bar" aria-hidden style={{ marginBottom: 4 }}><span style={{ width: pct + '%', background: 'var(--ok)' }} /></div>
                  <p className="grounding" style={{ margin: '0 0 12px', fontVariantNumeric: 'tabular-nums' }}>{reconfirmedN} of {total} answered</p>
                  {reconfirmables.map(v => {
                    const st = v.reconfirmed72 ? 'answered' : (sweepState[v.id] || 'waiting');
                    const d = draftVendorReconfirm(event, v, null);
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
            {sheet.kind === 'qr' && (
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
                    const openRows = (event.timeline || []).filter(t => t && !t.done);
                    const inferredN = openRows.filter(t => { try { const d = effectiveDoneDetail(event, t); return d.done && d.inferred; } catch { return false; } }).length;
                    return (
                      <div className="v-meta" style={{ padding: '2px 2px 10px' }}>
                        {openRows.length - inferredN} open of {(event.timeline || []).length}
                        {inferredN ? ' · ' + inferredN + ' already handled by your plan — tap to confirm' : ''} — check things off and your plan keeps up.
                      </div>
                    );
                  })()}
                  {/* OPEN work gets the rows; DONE work minimizes into a green
                      report line (tap to review) — same green-dot semantics as
                      the handled sections everywhere else. */}
                  {(event.timeline || []).map((t, i) => {
                    if (!t || t.done) return null;
                    let inferred = false;
                    try { const d = effectiveDoneDetail(event, t); inferred = d.done && d.inferred; } catch { inferred = false; }
                    return (
                    <button key={t.id || i} className={'frow' + (inferred ? ' got' : '') + (sheet.focus && t.id === sheet.focus ? ' focus-task' : '')}
                      ref={el => { if (el && sheet.focus && t.id === sheet.focus) el.scrollIntoView({ block: 'center' }); }}
                      style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                      onClick={() => toggleTask(i)}>
                      <span className="fcheck" aria-hidden="true" />
                      <span className="f-main">
                        <span className="f-name">{t.task}
                          {inferred ? <span className="tag plan" style={{ color: 'var(--ok)', background: 'var(--ok-tint)' }}>done by your plan — tap to confirm</span> : null}
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
                {/* The plan's own headline math: totals, per-head, and the turnout
                    band it was sized to — $ gated on hasRealCount, per the engine. */}
                {foodPlan.hasRealCount ? (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>
                    Food {fmt(foodPlan.foodLow)}–{fmt(foodPlan.foodHigh)} · supplies {fmt(foodPlan.suppliesLow)}–{fmt(foodPlan.suppliesHigh)} · {fmt(foodPlan.perGuestLow)}–{fmt(foodPlan.perGuestHigh)} a head across the {foodPlan.bandLow}–{foodPlan.bandHigh} turnout band. {foodPlan.boughtCount} of {foodPlan.itemCount} bought — checking off moves real money to spent.
                  </div>
                ) : (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>
                    Sized to a typical guess for now — set a real guest count and the dollars appear.
                  </div>
                )}
                {/* Menu decisions — the playbook's real choices; picking one re-sizes
                    and re-prices the spread through the same engine. */}
                {(() => {
                  const dc = event.dietCounts || {};
                  // Keys must match the engine's DIET_KEYWORDS table verbatim ('Shellfish',
                  // not 'Shellfish allergy') — dietCounts keys ARE the flag lookup keys.
                  const DIETS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Shellfish'];
                  const anyDiet = DIETS.some(k => Number(dc[k]) > 0);
                  const setD = (k, delta) => {
                    const n = Math.max(0, (Number(dc[k]) || 0) + delta);
                    patchEvent({ dietCounts: { ...dc, [k]: n } },
                      n ? k + ' × ' + n + ' — the spread just adjusted for it.' : k + ' cleared.');
                  };
                  const dietSummary = DIETS.filter(k => Number(dc[k]) > 0).map(k => k + ' ' + dc[k]).join(' · ');
                  const dietOpen = !!foodSect.diet || sheet.focus === 'diet';
                  if (!dietOpen) {
                    return (
                      <button className="fold-btn" onClick={() => setFoodSect(m => ({ ...m, diet: true }))}>
                        Dietary needs — {anyDiet ? dietSummary : event.dietaryNoted ? <span style={{ color: 'var(--ok)' }}>noted</span> : 'none counted yet'}
                        <span className="chev">›</span>
                      </button>
                    );
                  }
                  return (
                    <div className={'brow' + (sheet.focus === 'diet' ? ' rowfocus' : '')} style={{ marginBottom: 12, borderRadius: 12, padding: '8px 6px' }}>
                      <div className="shelf-label" style={{ marginBottom: 6 }}>
                        Dietary needs {anyDiet ? '' : '— none counted yet'}
                        <button className="mini" style={{ marginLeft: 8 }} onClick={() => setFoodSect(m => ({ ...m, diet: false }))}>done</button>
                      </div>
                      <div className="chips">
                        {DIETS.map(k => (
                          <span key={k} className="chip" style={{ display: 'inline-flex', gap: 7, alignItems: 'center', cursor: 'default' }}>
                            {k} <b>{Number(dc[k]) || 0}</b>
                            <span role="button" tabIndex={0} style={{ cursor: 'pointer', padding: '0 3px' }} onClick={() => setD(k, -1)}>−</span>
                            <span role="button" tabIndex={0} style={{ cursor: 'pointer', padding: '0 3px' }} onClick={() => setD(k, 1)}>+</span>
                          </span>
                        ))}
                      </div>
                      <p className="grounding" style={{ margin: '6px 0 0' }}>
                        Vegetarian + vegan counts add a real, priced main below; the others flag the lines to double-check.
                        {!event.dietaryNoted && <span> </span>}
                        {!event.dietaryNoted && (
                          <button className="mini" onClick={() => { patchEvent({ dietaryNoted: true }, 'Dietary needs noted — the menu is good to go.'); setFoodSect(m => ({ ...m, diet: false })); }}>That’s everyone — noted</button>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {(foodPlan.choices || []).length > 0 && (() => {
                  const openN = (foodPlan.choices || []).filter(c => !((event.foodChoices || {})[c.id])).length;
                  const open = !!foodSect.choices;
                  if (!open) {
                    return (
                      <button className="fold-btn" onClick={() => setFoodSect(m => ({ ...m, choices: true }))}>
                        Your choices — {openN > 0 ? <span style={{ color: 'var(--warn)' }}>{openN} open · each re-prices lines</span> : <span style={{ color: 'var(--ok)' }}>all set</span>}
                        <span className="chev">›</span>
                      </button>
                    );
                  }
                  return null;
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
                  <button className="mini" onClick={() => openDraft('Your shopping list', draftShoppingList(event, null))}>Copy the shopping list</button>
                </div>
                {/* Sourcing tier — the plan's real cook/order axis; switching
                    re-prices proteins and changes where each line says to buy. */}
                {(foodPlan.sourcingTiers || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 8px' }}>How it’s sourced</div>
                    <div className="chips" style={{ marginBottom: 4 }}>
                      {(foodPlan.sourcingTiers || []).map(t => t && (
                        <button key={t.id || t.key || t.label} className="chip" aria-pressed={foodPlan.sourcing === (t.id || t.key)}
                          onClick={() => patchEvent({ sourcing: t.id || t.key }, 'Sourcing: ' + (t.label || t.id) + ' — proteins re-priced, stores updated.')}>
                          {t.label || t.id}
                        </button>
                      ))}
                    </div>
                    <p className="grounding" style={{ marginBottom: 10 }}>The tier re-prices the proteins and changes where each line says to buy.</p>
                  </>
                )}
                {(() => {
                  const items = (foodPlan.list || []).filter(it => it && !it.skipped);
                  const groups = (foodPlan.groups && foodPlan.groups.length ? foodPlan.groups : [...new Set(items.map(it => it.group || 'Other'))]);
                  // Decision flags: a menu decision the host hasn't explicitly
                  // made yet marks every line it re-prices (playbook `affects`).
                  const undecidedAffects = (() => { try { return playbookOpenDecisionAffects(event); } catch { return {}; } })();
                  return groups.map(g => {
                    const gItems = items.filter(it => (it.group || 'Other') === g);
                    if (!gItems.length) return null;
                    const gBought = gItems.filter(it => (event.foodGot || {})[it.id]).length;
                    const gLow = gItems.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.low) || 0), 0);
                    const gHigh = gItems.reduce((t, it) => t + (it.locked != null ? Number(it.locked) : Number(it.high) || 0), 0);
                    const gDecisions = gItems.filter(it => undecidedAffects[it.id]).length;
                    // Accordion (never-dense): a group opens when tapped, when a
                    // deep-link targets one of its lines, or while tuning one.
                    const focusHere = gItems.some(it => it.id === sheet.focus || it.id === foodTune);
                    const isOpen = !!foodGroupsOpen[g] || focusHere;
                    return (
                    <div key={g}>
                      <button className="fold-btn" style={{ marginTop: 10, ...(gBought === gItems.length ? { color: 'var(--ok)' } : {}) }} onClick={() => setFoodGroupsOpen(m => ({ ...m, [g]: !isOpen }))}>
                        {gBought === gItems.length
                          ? `${g} — all ${gItems.length} bought`
                          : `${g} — ${gBought} of ${gItems.length} bought${foodPlan.hasRealCount ? ' · ' + fmt(gLow) + '–' + fmt(gHigh) : ''}`}
                        {gDecisions > 0 ? <span className="tag essential" style={{ marginLeft: 8 }}>{gDecisions} decision{gDecisions === 1 ? '' : 's'} open</span> : null}
                        <span className="chev">{isOpen ? '▾' : '›'}</span>
                      </button>
                      {isOpen && gItems.map((it, i) => {
                        const got = !!(event.foodGot || {})[it.id];
                        const cost = it.locked != null ? Number(it.locked) : ((Number(it.low) || 0) + (Number(it.high) || 0)) / 2;
                        const tuning = foodTune === it.id;
                        const alts = (it.alternatives || []).map(a => (a && (a.name || a.label)) || (typeof a === 'string' ? a : null)).filter(Boolean).slice(0, 4);
                        return (
                          <div key={it.id}>
                            <button className={'frow' + (got ? ' got' : '')}
                              style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                              onClick={() => toggleGot(it, cost)}>
                              <span className="fcheck" aria-hidden="true" />
                              <span className="f-main">
                                <span className="f-name">
                                  {it.short || it.item}
                                  {it.swappedFrom ? <span className="tag plan">swapped</span> : null}
                                  {undecidedAffects[it.id] ? <span className="tag essential" title={undecidedAffects[it.id]}>decision open</span> : null}
                                  {it.essential && !got ? <span className="tag essential">essential</span> : null}
                                  {it.badge ? <span className="tag plan">{String(it.badge).toLowerCase()}</span> : null}
                                  {it.buyAt === 'day-of' ? <span className="tag essential">day-of</span> : null}
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
                              </span>
                              <span className="amt">
                                {foodPlan.hasRealCount
                                  ? (it.locked != null ? fmt(it.locked) : fmt(it.low) + '–' + fmt(it.high))
                                  : '—'}
                              </span>
                              <span className="mini" role="button" tabIndex={0} style={{ marginLeft: 6 }}
                                onClick={e => { e.stopPropagation(); setFoodTune(tuning ? null : it.id); }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setFoodTune(tuning ? null : it.id); } }}>
                                {tuning ? 'done' : 'tune'}
                              </span>
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
                                  <button className="mini" onClick={() => patchEvent({ foodSkip: { ...(event.foodSkip || {}), [it.id]: true } }, (it.short || it.item) + ' skipped — the total just dropped.')}>skip it</button>
                                </div>
                                {/* ORIGINAL parity — lock the real cost: event.foodLocked[id]
                                    = the committed dollar amount ("picked a source/price");
                                    the engine turns the range into a fixed line. */}
                                <div className="actions-row" style={{ marginTop: 8, alignItems: 'center' }}>
                                  <span className="of">cost:</span>
                                  {it.locked != null ? (
                                    <>
                                      <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>set at {fmt(it.locked)}</span>
                                      <button className="mini" onClick={() => {
                                        const m = { ...(event.foodLocked || {}) }; delete m[it.id];
                                        patchEvent({ foodLocked: m }, (it.short || it.item) + ' back to the estimate range.');
                                      }}>back to estimate</button>
                                    </>
                                  ) : (
                                    <>
                                      <input className="field" style={{ maxWidth: 90, fontSize: 13, padding: '6px 10px' }} type="number" min="0" placeholder="$ actual"
                                        aria-label={'Real cost for ' + (it.short || it.item)}
                                        value={tuneCost} onChange={e => setTuneCost(e.target.value)} />
                                      <button className="mini" disabled={!(parseFloat(tuneCost) >= 0 && tuneCost !== '')}
                                        onClick={() => {
                                          const n = Math.max(0, Math.round(parseFloat(tuneCost) || 0));
                                          patchEvent({ foodLocked: { ...(event.foodLocked || {}), [it.id]: n } },
                                            (it.short || it.item) + ' set at ' + fmt(n) + ' — a real price now, not a range.');
                                          setTuneCost('');
                                        }}>set it</button>
                                    </>
                                  )}
                                </div>
                                {Array.isArray(it.where) && it.where.length > 1 && (
                                  <div className="chips" style={{ marginTop: 8 }}>
                                    {it.where.slice(0, 4).map(w => (
                                      <button key={w} className="chip" aria-pressed={(event.foodWhere || {})[it.id] === w}
                                        onClick={() => {
                                          // Store pick → a REAL cost, not a range: lock the
                                          // line at the store's point on its own BLS band
                                          // (bulk = low end, grocery = mid, specialty = high).
                                          const f = /costco|sam|bulk|bj|warehouse/i.test(w) ? 0 : /butcher|cheese|bakery|farmers|fish|premium|market/i.test(w) ? 1 : 0.5;
                                          const lo = Number(it.low) || 0, hi = Number(it.high) || lo;
                                          const lockAt = Math.round(lo + (hi - lo) * f);
                                          patchEvent({
                                            foodWhere: { ...(event.foodWhere || {}), [it.id]: w },
                                            foodLocked: { ...(event.foodLocked || {}), [it.id]: lockAt },
                                          }, 'Buying at ' + w + ' — set at ' + fmt(lockAt) + ' (' + (f === 0 ? 'the low end' : f === 1 ? 'the high end' : 'the middle') + ' of its price band). Change it anytime.');
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
                                    {alts.map(name => (
                                      <button key={name} className="chip" onClick={() => patchEvent({ foodSwap: { ...(event.foodSwap || {}), [it.id]: name } }, 'Swapped to ' + name + ' — priced with its own real range.')}>
                                        {name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  });
                })()}
                {(foodPlan.specialDiets || []).length > 0 && (
                  <p className="grounding" style={{ marginTop: 10 }}>
                    Dietary: {foodPlan.specialDiets.map(d => d.count + ' ' + d.diet).join(', ')} — a real named main is sized into the totals for them.
                  </p>
                )}
              </>
            ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No spread to build for this kind of event yet.</div>)}
            {sheet.kind === 'vendors' && (() => {
              // Queue item 6 — the promise-model engine (vendorAccountability):
              // cross-vendor conflicts up top, a per-vendor accountability line
              // when the tier isn't clean. Deterministic, honest not_tracked.
              let conflicts = [];
              try { conflicts = deriveVendorPromiseConflicts(event) || []; } catch { conflicts = []; }
              return (event.vendors || []).length ? (
                <>
                  {conflicts.slice(0, 3).map((c, i) => (
                    <div key={c.id || i} className="brow" style={{ borderColor: 'var(--warn-tint)' }}>
                      <p className="grounding" style={{ margin: 0, color: 'var(--warn)', fontWeight: 600 }}>{c.title}</p>
                      <p className="grounding" style={{ margin: '2px 0 0' }}>{c.explanation}{c.recommendedAction ? ' ' + c.recommendedAction : ''}</p>
                    </div>
                  ))}
                  {(event.vendors || []).map(v => {
                    let acct = null;
                    try { acct = quickAccountabilityForVendor(v, event); } catch { acct = null; }
                    const worry = acct && acct.tier && acct.tier !== 'on_track' && (acct.reasons || []).length;
                    return (
                      <div key={v.id} className={'vrow' + (sheet.focus === v.id ? ' focus' : '')}
                        ref={el => { if (el && sheet.focus === v.id) el.scrollIntoView({ block: 'center' }); }}>
                        <div>
                          <div className="v-name">{v.name || 'Unnamed'}</div>
                          <div className="v-meta">{[v.category, v.status].filter(Boolean).join(' · ')}</div>
                          {worry ? <div className="v-meta" style={{ color: 'var(--warn)' }}>{acct.reasons[0]}</div> : null}
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="tag vendors">{v.status || '—'}</span>
                          <button className="mini" onClick={(ev) => { ev.stopPropagation(); openDraft('Note to ' + (v.name || 'your vendor'), draftVendorOutreach(event, v, null)); }}>Draft note</button>
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No vendors on this event yet.</div>;
            })()}
            {sheet.kind === 'budget' && (() => {
              // HOST MODEL: one number, and "where it's going" priced by the plan
              // itself (hostSpending's food/supplies/capacity terms) — never
              // planner category rows the host didn't write.
              // ROW-LEVEL CTA RULE: every allocation row lands on the surface
              // that prices it — the spread (food/supplies), the space list,
              // the crab order. Supplies additionally opens its own group.
              const supplGroup = ((foodPlan && foodPlan.groups) || []).find(g => /suppl|paper|setup|gear/i.test(String(g)));
              const GO = {
                food: () => setSheet({ kind: 'food' }),
                supplies: () => { if (supplGroup) setFoodGroupsOpen(m => ({ ...m, [supplGroup]: true })); setSheet({ kind: 'food' }); },
                space: () => setSheet({ kind: 'space' }),
                crabs: () => setSheet({ kind: 'crabs' }),
              };
              const hostRows = hostSpendRows().map(r => ({ ...r, go: GO[r.kind] }));
              // Queue item 7 — the recovery engine: source-backed ways OUT of
              // an overage (safe cuts / tradeoffs / protected), never invented $.
              let recovery = null;
              try { recovery = buildBudgetRecoveryPlan(event, foodPP.priceFactor); } catch { recovery = null; }
              return (
                <>
                  <div className="line" style={{ padding: '2px 0 10px' }}>
                    <span>Your budget</span>
                    <span className="amt">{money.planned ? fmt(money.planned) : 'not set yet'}</span>
                  </div>
                  {hostRows.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '4px 0 6px' }}>Where it’s going — priced by your plan</div>
                      {hostRows.map((r, i) => {
                        const alloc = money.planned ? Math.min(100, Math.round((r.est / money.planned) * 100)) : 0;
                        const got = r.est ? Math.min(100, Math.round((r.got / r.est) * 100)) : 0;
                        return (
                          <button className="brow" key={r.label}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--line-soft)', font: 'inherit', color: 'inherit', cursor: 'pointer', animation: `cardin 300ms var(--ease-out) ${i * 40}ms both` }}
                            onClick={r.go} aria-label={'Open ' + r.label}>
                            <div className="line" style={{ padding: '0 0 5px' }}>
                              <span>{r.label} <span className="chev" style={{ position: 'static', color: 'var(--faint)' }}>›</span></span>
                              <span className="amt">{fmt(r.got)} <span className="of">bought of ~{fmt(r.est)}</span></span>
                            </div>
                            <div className="bline"><i style={{ width: Math.max(alloc, 4) + '%' }}><b style={{ width: got + '%' }} /></i></div>
                          </button>
                        );
                      })}
                    </>
                  )}
                  <div className="line total"><span>Spoken for so far</span><span className="amt">{fmt(money.committed)}{money.planned ? ' of ' + fmt(money.planned) : ''}</span></div>
                  {recovery && recovery.status === 'recovery_available' && (
                    <div style={{ marginTop: 12 }}>
                      <div className="shelf-label" style={{ margin: '0 0 4px', color: 'var(--warn)' }}>A way back under</div>
                      {recovery.headline && <p className="grounding" style={{ margin: '0 0 6px' }}>{recovery.headline}</p>}
                      {(recovery.suggestions || []).slice(0, 4).map((s, i) => (
                        <div key={s.id || i} className="line" style={{ alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 13 }}>{s.copy || s.label || s.title}</span>
                          {s.amount ? <span className="of" style={{ whiteSpace: 'nowrap' }}>~{fmt(s.amount)}</span> : null}
                        </div>
                      ))}
                      {(recovery.protectedItems || []).length > 0 && (
                        <p className="grounding" style={{ margin: '6px 0 0', opacity: .75 }}>Protected — not on the cut list: {(recovery.protectedItems || []).slice(0, 3).map(x => x.label || x).join(', ')}.</p>
                      )}
                    </div>
                  )}
                  <div className="shelf-label" style={{ margin: '16px 0 8px' }}>Change it</div>
                  {budgetEditorBlock()}
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
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 74, resize: 'vertical', fontSize: 14, fontWeight: 500 }}
                    placeholder={'Denise & Ray\nThe Okafors\nUncle Joe'}
                    value={rosterText} onChange={e => setRosterText(e.target.value)} aria-label="Add guest names" />
                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="cta" disabled={!rosterText.trim()} style={!rosterText.trim() ? { opacity: .45 } : undefined} onClick={addRoster}>Add them</button>
                  </div>
                </div>
              );
              const chase = showsReplyTracking(event); // count-only hosts are never chased
              const plusOnes = (event.guests || []).filter(g => g && g.rsvp === 'Yes' && String(g.plusOne || '').trim()).length;
              const kidsTotal = (event.guests || []).reduce((t, g) => t + (Number(g && g.kids) || 0), 0);
              // guestMode switch — the ENGINE's own workflow knob (guestPlanningMode
              // reads it): by-list hosts get reply tracking + chasing, by-headcount
              // hosts are never nagged about replies.
              const countingChips = (
                <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                  <span className="of">counting:</span>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={chase}
                    onClick={() => patchEvent({ guestMode: 'list' }, 'By list — replies are tracked and the quiet ones can be nudged.')}>By list</button>
                  <button className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={event.guestMode === 'count'}
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
                      <button key={key} className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={csvPlatform === key}
                        onClick={() => { setCsvPlatform(key); setCsvPreview(null); }}>{p.label || key}</button>
                    ))}
                  </div>
                  <div className="actions-row" style={{ marginTop: 10, alignItems: 'center' }}>
                    <input type="file" accept=".csv,text/csv" aria-label="Guest CSV file" style={{ fontSize: 12.5, color: 'var(--muted)' }}
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
              return (event.guests || []).length ? (
                <>
                  {chase && gcr && gcr.pending > 0 && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {gcr.pending} still unanswered{bandLbl ? ' · likely ' + bandLbl + ' on the day' : ''} — the count settles as replies land.
                    </div>
                  )}
                  {(plusOnes > 0 || kidsTotal > 0) && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {[plusOnes ? '+' + plusOnes + ' plus-one' + (plusOnes === 1 ? '' : 's') : null, kidsTotal ? kidsTotal + ' kid' + (kidsTotal === 1 ? '' : 's') + ' — food sizes them lighter' : null].filter(Boolean).join(' · ')}
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
                      <input className="field" style={{ maxWidth: 160, fontSize: 13, padding: '6px 10px' }} type="date"
                        value={event.rsvpDeadline || (rsvpBy && rsvpBy.iso) || ''}
                        onChange={e => patchEvent({ rsvpDeadline: e.target.value }, 'Reply-by date set — the nudges and countdown read it.')}
                        aria-label="RSVP deadline" />
                    </div>
                  )}
                  <div className="actions-row" style={{ margin: '0 0 8px' }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                    <button className="mini" onClick={() => openDraft('Your invite', draftInvite(event, null, { rsvpUrl: inviteLinkUrl() }))}>Copy the invite</button>
                    {showsReplyTracking(event) && <button className="mini" onClick={() => openDraft('The RSVP nudge', draftRsvpChase(event, null, { rsvpUrl: inviteLinkUrl() }))}>Nudge the quiet ones</button>}
                  </div>
                  {/* Invite look — the tone engine guesses from the event's mood
                      (paper by day, elegant by night, muted when somber); the
                      host's word always wins (lib/inviteTone). */}
                  <div className="actions-row" style={{ margin: '0 0 10px', alignItems: 'center' }}>
                    <span className="of">invite look:</span>
                    {[['', 'Match the event'], ['bright', 'Bright paper'], ['elegant', 'Elegant dark']].map(([val, label]) => (
                      <button key={val || 'auto'} className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={(event.inviteStyle || '') === val}
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
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={event.inviteCrest !== 'off'}
                        onClick={() => patchEvent({ inviteCrest: '' }, 'The artwork is on the invite.')}>On the invite</button>
                      <button className="chip" style={{ padding: '5px 11px', fontSize: 11.5 }} aria-pressed={event.inviteCrest === 'off'}
                        onClick={() => patchEvent({ inviteCrest: 'off' }, 'Words only — the invite stays purely typographic.')}>Words only</button>
                    </div>
                  )}
                  {countingChips}
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
                            <div className="actions-row" style={{ alignItems: 'center' }}>
                              <span className="of">kids:</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: Math.max(0, (Number(g.kids) || 0) - 1) }, null)}>−</button>
                              <span className="of" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{Number(g.kids) || 0}</span>
                              <button className="mini" onClick={() => writeGuest(i, { kids: (Number(g.kids) || 0) + 1 }, (Number(g.kids) || 0) + 1 + ' kids with ' + (g.name || 'this guest') + ' — the food plan sizes them lighter.')}>+</button>
                              <input className="field" style={{ maxWidth: 110, fontSize: 13, padding: '6px 10px' }} placeholder="+1 name"
                                value={g.plusOne || ''} onChange={e => writeGuest(i, { plusOne: e.target.value }, null)} aria-label="Plus one name" />
                              <input className="field" style={{ maxWidth: 130, fontSize: 13, padding: '6px 10px' }} placeholder="needs? (vegan, nut…)"
                                value={g.needs || ''} onChange={e => writeGuest(i, { needs: e.target.value }, null)} aria-label="Dietary needs" />
                              <button className="mini" onClick={() => removeGuest(i)}>remove</button>
                            </div>
                            <div className="actions-row" style={{ marginTop: 8, alignItems: 'center' }}>
                              <input className="field" style={{ maxWidth: 125, fontSize: 13, padding: '6px 10px' }} placeholder="phone" type="tel"
                                value={g.phone || ''} onChange={e => writeGuest(i, { phone: e.target.value }, null)} aria-label="Phone" />
                              <input className="field" style={{ maxWidth: 165, fontSize: 13, padding: '6px 10px' }} placeholder="email" type="email"
                                value={g.email || ''} onChange={e => writeGuest(i, { email: e.target.value }, null)} aria-label="Email" />
                              <input className="field" style={{ maxWidth: 105, fontSize: 13, padding: '6px 10px' }} placeholder="group" list="v2-groups"
                                value={g.group || ''} onChange={e => writeGuest(i, { group: e.target.value }, null)} aria-label="Group" />
                            </div>
                            {chase && !g.rsvp && (String(g.phone || '').trim() || String(g.email || '').trim()) && (() => {
                              // PER-GUEST chase — the engine's nudge (with the real
                              // RSVP link) straight to THIS person's phone or inbox.
                              const d = draftRsvpChase(event, null, { rsvpUrl: inviteLinkUrl() });
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
                </>
              ) : (
                <>
                  <div className="v-meta" style={{ padding: '14px 2px 4px' }}>
                    No list yet{guests ? ' — you’re planning around ' + guests + ' for now' : ''}. A real list is what unlocks RSVPs, the confirmed count, and the caterer check.
                  </div>
                  <div className="actions-row" style={{ margin: '0 0 4px' }}>
                    <button className="mini" onClick={shareInviteLink}>Share the RSVP link</button>
                    <button className="mini" onClick={showQr}>Show the QR</button>
                  </div>
                  <p className="grounding" style={{ margin: '0 0 6px' }}>Guests who open the link reply themselves — names, meals, kids, plus-ones — and the list builds on its own.</p>
                  {countingChips}
                  {quickAdd}
                  {csvBlock}
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

      {toastMsg && <div className="toast on">{toastMsg}</div>}

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
    </div>
  );
}
