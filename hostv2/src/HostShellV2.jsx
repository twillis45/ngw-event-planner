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
import { isLikelyOutdoor, suggestRainPlan, guestRainMessage, weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus } from '@app/lib/weather';
import { playMessageChime, setMessageSoundMuted } from '@app/lib/notificationSound';
import { draftInvite, draftShoppingList, draftVendorOutreach, draftThankYou, draftRsvpChase } from '@app/lib/doItForMe';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor } from '@app/lib/dates';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { deriveEventPhaseProgress } from '@app/lib/phaseProgress';
import { deriveEventCompressionSummary } from '@app/lib/workflowCompression';
import { buildDayBeforePlan } from '@app/lib/dayBefore';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { estimateTotalRange, estimatorConfidence } from '@app/lib/budgetEstimator';
import { ALL_PLAYBOOKS, playbookFoodPlan, effectiveRos, guestCountResolved, attendanceBand, attendanceBandLabel, playbookDecisionBoard, playbookCapacity, playbookRisks, supplyRetailLinks, playbookHeartMoments } from '@app/lib/playbooks';
import { EVENT_TAXONOMY, resolveCanonicalType } from '@app/lib/eventTaxonomy.mjs';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

// My Crab Feast: prefer the user's REAL event from the app's own storage
// (same-origin on the deployed site — the production app writes 'ngw-events');
// otherwise construct one from the Crab Feast playbook's real defaults.
let APP_EVENTS = [];
try { APP_EVENTS = JSON.parse(localStorage.getItem('ngw-events')) || []; } catch { APP_EVENTS = []; }
const appCrab = APP_EVENTS.find(e => e && /crab/i.test(String(e.name || '') + ' ' + String(e.type || '')));
const CRAB_PB = ALL_PLAYBOOKS.find(pb => pb && pb.type === 'Crab Feast');
const inThreeWeeks = (() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toISOString().slice(0, 10); })();
const MY_CRAB_FEAST = appCrab || {
  id: 'my-crab-feast', rsvpCode: 'crab',
  name: 'My Crab Feast', type: 'Crab Feast',
  date: inThreeWeeks, venue: 'Backyard',
  guestEstimate: (CRAB_PB && CRAB_PB.meta && CRAB_PB.meta.typicalGuests && CRAB_PB.meta.typicalGuests.default) || 18,
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
  const typical = (pb && pb.meta && pb.meta.typicalGuests && pb.meta.typicalGuests.default) || 14;
  const tasks = ((pb && pb.tasks) || []).filter(t => t && !t.whenChoice);
  return {
    id, rsvpCode: id, name,
    type: pb ? pb.type : 'Get-Together',
    date: mkDate(plus),
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
    timeline: tasks.map((t, i) => ({ id: 'tl-' + (t.id || i), week: t.when || '', task: t.label || '', done: i < Math.ceil(tasks.length / 2), owner: 'Host' })),
    ...extras,
  };
};
const TEST_DAY_OF = mkTest('test-day-of', 'Test — Cookout (day of)', /^the cookout$|^cookout$/i, 0, {
  rainPlan: '', // day-of with NO backup: the rain essential + weather pill must both fire
});
const TEST_TWO_DAYS = mkTest('test-two-days', 'Test — Game Night (in 2 days)', /game night/i, 2, {});

const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV, MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];

const ROSTER = [...ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean), MY_CRAB_FEAST, TEST_DAY_OF, TEST_TWO_DAYS];
const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

const LS_PATCH = id => 'ngw-hostv2-patch-' + id;
const LS_CUSTOM = 'ngw-hostv2-custom-event';

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


const guestNumber = e => Number(e.guestEstimate) || Number(e.catererCount) || (e.guests || []).length || 0;

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
    return t.length >= 3 && /[a-zA-Z]/.test(t) && !/^\d+$/.test(t);
  };
  const [cityDraft, setCityDraft] = useState('');
  const saveVenue = () => {
    if (!validPlace(venueDraft)) { setVenueErr('Give guests a real place — a name or an address, not just a number.'); return; }
    const v = venueDraft.trim();
    patchEvent({
      venue: v,
      venueKind: /backyard|house|home|yard|place|garden/i.test(v) ? 'home' : (event.venueKind || ''),
    }, 'Venue on the plan — invites, maps, and the rain note now carry it.');
    setVenueErr(null); setVenueDraft('');
  };
  // At-home venues resolve the ORIGINAL's venue blocker via venueCity (the
  // same field weather geocoding reads) — so home events get a city ask.
  const needsCity = event.venueKind === 'home' && !String(event.venueCity || '').trim();
  const saveCity = () => {
    const c = cityDraft.trim();
    if (c.length < 2 || !/^[a-zA-Z][a-zA-Z .,'-]*$/.test(c)) { toast('City or town name only — “Annapolis”, “Silver Spring, MD”.'); return; }
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
    // An exact playbook-type mention wins ("crab feast"); the alias resolver
    // (bbq/boil/sweet 16 regexes) is the fallback — both are real resolvers.
    let type = null;
    const hit = HOST_TYPES.find(ht => t.toLowerCase().includes(ht.toLowerCase().replace(' party', '')));
    if (hit && hit.length > 3) type = hit;
    if (!type) { try { const c = resolveCanonicalType(t); if (c && HOST_TYPES.includes(c)) type = c; } catch { type = null; } }
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
  const effPb = effType ? ALL_PLAYBOOKS.find(p => p && p.type === effType) : null;
  const pbTypical = (effPb && effPb.meta && effPb.meta.typicalGuests && effPb.meta.typicalGuests.default) || null;
  const effGuests = (fGuests ?? parsed.guests) ?? pbTypical;
  const effDate = fDate || parsed.date || '';
  const effName = fName || parsed.honoree || '';
  const dstatC = eventDateStatus(effDate || null);
  const expectC = expectedFromPlanned(effGuests, effType);

  const base = eventId === 'custom' ? custom : (ALL_SAMPLES.find(e => e.id === eventId) || FALLBACK);
  const event = useMemo(() => ({ ...(base || FALLBACK), ...(eventId === 'custom' ? {} : patch) }), [base, patch, eventId]);

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
  useEffect(() => {
    try {
      console.debug('[v2ctx]', event.id, 'ctx:', !!ctx, '· identity:', ctx && ctx.identity && ctx.identity.primaryEventType,
        '· blockers:', blockers.length, '· priority:', plan && plan.planningState && plan.planningState.currentPriority);
    } catch {}
  }, [event.id, ctx, blockers, plan]);
  const decisionBoard = useMemo(() => { try { return playbookDecisionBoard(event) || { open: [], locked: [] }; } catch { return { open: [], locked: [] }; } }, [event]);
  const capacity = useMemo(() => { try { return playbookCapacity(event); } catch { return null; } }, [event]);
  const helpers = useMemo(() => { try { return deriveHelperResponsibilities(event) || []; } catch { return []; } }, [event]);
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
  const crabLadder = useMemo(() => {
    try {
      const pb = ALL_PLAYBOOKS.find(p => p && /crab/i.test(String(p.type || '')));
      const scan = (o, depth) => {
        if (!o || typeof o !== 'object' || depth > 6) return null;
        if (o.priceLadder) return o.priceLadder;
        for (const v of Object.values(o)) { const r = scan(v, depth + 1); if (r) return r; }
        return null;
      };
      return scan(pb, 0);
    } catch { return null; }
  }, [event.type]);

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
  // SAMPLE forecast (live fetch needs the weather API key) driving the REAL
  // engines: weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus,
  // guestRainMessage. Only rendered for outdoor, upcoming, dated events.
  const wx = useMemo(() => {
    // Self-contained reads (this memo sits above the shared outdoor/days consts).
    const out = (() => { try { return isLikelyOutdoor(event.venue, event.notes); } catch { return false; } })();
    const past = (() => { try { return isPastEvent(event); } catch { return false; } })();
    const d = (() => { try { return daysUntil(event.date); } catch { return null; } })();
    // Same 14-day boundary as getEventWeatherRisk — no real forecast reaches
    // beyond it, so no alert may exist there either (even a sample one).
    if (!out || past || !event.date || d == null || d < 0 || d > 14) return null;
    return {
      kind: 'rain', risk: 'high', conditions: 'Rain', pop: 70,
      date: event.date,
      summary: 'Rain likely on your event day',
      rainWindow: { startHour: 14, endHour: 18, label: '2 PM\u20136 PM' },
      _sample: true,
    };
  }, [event]);
  const wxImpact = useMemo(() => {
    if (!wx) return null;
    try { const im = weatherImpactByEventPhase(event, wx); return im && im.hasImpact ? im : null; } catch { return null; }
  }, [event, wx]);
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
  const spend = useMemo(() => {                          // lib/hostSpending — budget single-source
    try { return hostSpending(event, 1); } catch { return { total: 0, spent: 0, committed: 0 }; }
  }, [event]);
  const money = { planned: spend.total, committed: spend.committed, spent: spend.spent, lines: Array.isArray(event.budget) ? event.budget.length : 0 };
  const guests = guestNumber(event);
  const expect = expectedFromPlanned(guests, event.type); // lib/attendanceModel — likely turnout
  const rsvpBy = rsvpDeadlineFor(event);                  // lib/dates — reply-by date
  const actions = plan.nextActions || [];
  const handled = plan.handled || [];
  const rollup = plan.vendorReadinessRollup;
  const pct = plan.progress.total ? Math.round((plan.progress.done / plan.progress.total) * 100) : null;

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

  // Tasks: toggle done on the SAME timeline the readiness engine reads —
  // catching up genuinely closes the "Catch up on overdue planning" card.
  const toggleTask = (i) => {
    const tl = (event.timeline || []).map((t, ix) => ix === i ? { ...t, done: !t.done } : t);
    const open = tl.filter(t => t && !t.done).length;
    patchEvent({ timeline: tl },
      (tl[i].done ? 'Done: ' : 'Reopened: ') + String(tl[i].task || '').slice(0, 50) + '… — ' + open + ' still open.');
  };

  // No timeline yet → draft one from the playbook's REAL task list, honoring
  // its choice-gated tasks (e.g. steam-yourself vs order-steamed).
  const draftTimeline = () => {
    const pb = ALL_PLAYBOOKS.find(p => p && p.type === event.type);
    if (!pb || !Array.isArray(pb.tasks)) { toast('No playbook checklist for this type.'); return; }
    const picks = event.foodChoices || {};
    const tasks = pb.tasks.filter(t => {
      if (!t) return false;
      if (t.whenChoice && Array.isArray(t.whenChoice.in)) {
        const chosen = picks[t.whenChoice.id];
        return chosen ? t.whenChoice.in.includes(chosen) : true;
      }
      return true;
    }).map((t, i) => ({ id: 'tl-' + (t.id || i), week: t.when || '', task: t.label || '', done: false, owner: 'Host' }));
    patchEvent({ timeline: tasks }, tasks.length + ' tasks drafted from the ' + String(event.type).toLowerCase() + ' playbook.');
  };

  // The REAL spread: same food plan hostSpending bills from, sized by the
  // engine's own attendance band for this event.
  const foodPlan = useMemo(() => {
    try { return playbookFoodPlan(event, { priceFactor: 1 }); } catch { return null; }
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
  const toggleGot = (it, cost) => {
    const cur = !!(event.foodGot || {})[it.id];
    const next = { ...(event.foodGot || {}), [it.id]: !cur };
    let ns = null;
    try { ns = hostSpending({ ...event, foodGot: next }, 1).spent; } catch { ns = null; }
    patchEvent({ foodGot: next },
      (cur ? 'Put back ' : 'Bought ') + (it.short || it.item) + ' (' + fmt(cost) + ')' + (ns !== null ? ' — spent is now ' + fmt(ns) + '.' : '.'));
  };

  // Roster quick-add: paste names, one per line — a REAL guest list, which is
  // what unlocks RSVP intelligence, yes-counts, and the drift detector.
  const [rosterText, setRosterText] = useState('');
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
    if ((a.route && a.route.foodFocus) || f === 'food-plan') return 'food';
    if (/catering count/i.test(a.title || '')) return 'count';
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
    if (kind === 'guests') return (
      <div className="chips hc-row">
        {[30, 50, 60, 75, 90, 120].map(n => (
          <button key={n} className="chip" aria-pressed={guests === n} onClick={() => setGuests(n)}>{n}</button>
        ))}
        <button className="chip" onClick={() => openDraft('Your invite', draftInvite(event, null))}>Use the invite we wrote</button>
        <button className="chip" onClick={() => setSheet({ kind: 'guests' })}>Start a real list</button>
      </div>
    );
    if (kind === 'rain') return rainEditorBlock();
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
        const pb = ALL_PLAYBOOKS.find(p => p && p.type === event.type);
        const hit = ((pb && pb.contingencies) || []).find(c => c && (/rain|canopy|cover|indoor|garage|tent|umbrella|wet|storm/i.test(c.plan || '') || /weather|rain|storm|cold/i.test(c.when || '')));
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
    const est = estimateTotalRange({ type: event.type, guestCount: guests, date: event.date });
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
    const timeline = ((effPb && effPb.tasks) || [])
      .filter(t => t && !t.whenChoice)
      .map((t, i) => ({ id: 'tl-' + (t.id || i), week: t.when || '', task: t.label || '', done: false, owner: 'Host' }));
    const ev = {
      id: 'custom', rsvpCode: 'mine',
      name: effName ? effName + '’s ' + short : 'My ' + short,
      honoree: effName || '',
      type: effType, date: effDate || '', venue: parsed.venue || '', venueKind: parsed.venueKind || '',
      guestMode: 'count',
      guestEstimate: effGuests || '',
      totalBudget: '',
      budget: [],
      guests: [], vendors: [], timeline,
    };
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
  const revealIdentityFor = (ev) => ({
    primaryEventType: (ev && ev.type) || 'Event', secondaryEventTypes: [], isCompound: false,
    complexity: 'standard', ceremonyComponents: [], participants: [], confidence: 0.8,
  });
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
    try { return eventPlan(custom, null); } catch { return null; }
  }, [revealed, custom]);

  // Run of show — the app's single source: playbook-derived (tracks the event's
  // time of day), a stored ros only when the host has taken ownership.
  const ros = useMemo(() => { try { return effectiveRos(event) || []; } catch { return Array.isArray(event.ros) ? event.ros : []; } }, [event]);
  const isPast = isPastEvent(event);                      // lib/closeoutIntel — tense authority
  const budgetLines = Array.isArray(event.budget) ? event.budget : [];

  // Micro-motion: hero + tile numbers settle in rather than snapping.
  const daysAnim = useCountUp(typeof days === 'number' ? Math.abs(days) : null);
  const pctAnim = useCountUp(pct);
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

              <div className="bento">
                <button className="tile tile-a" onClick={() => { setHandledOpen(o => !o); }}>
                  <div className="t-label">Where you stand <span style={{ opacity: .55 }}>{handledOpen ? "▴" : "▾"}</span></div>
                  <div>
                    {(() => {
                      // TRUTH RULE (Todd, 2026-07-08): the tile reads the WIDER
                      // ledger — deriveEventPhaseProgress's essentials (basics +
                      // rain, shopping, dietary, vendors, crabs) — never just the
                      // four foundational dominoes. "Done" is only claimed when
                      // the ENGINE's own label says ready AND the checklist is
                      // clear; otherwise the open work is named.
                      const ess = phaseCues && Array.isArray(phaseCues.items) && phaseCues.items.length ? phaseCues.items : null;
                      const essDone = ess ? ess.filter(c => c.handled).length : plan.progress.done;
                      const essTotal = ess ? ess.length : plan.progress.total;
                      const openTasks = (event.timeline || []).filter(t => t && !t.done).length;
                      const firstOpen = ess ? ess.find(c => !c.handled) : null;
                      const basicsLine = plan.progress.total ? `basics ${plan.progress.done} of ${plan.progress.total}` : null;
                      let sub;
                      if (!essTotal) sub = 'Nothing to read for this event yet.';
                      else if (essDone < essTotal) sub = `essentials handled — ${basicsLine ? basicsLine + ' · ' : ''}next: ${String((firstOpen && (firstOpen.cueLabel || firstOpen.id)) || 'the open one').toLowerCase()}`;
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
                <button
                  className={'tile tile-d' + (actions.length === 0 ? ' allset' : '')}
                  onClick={() => {
                    if (days === 0) { setStage('day'); return; }
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
                      if (phaseCues && Array.isArray(phaseCues.items) && phaseCues.items.length) {
                        const d = phaseCues.items.filter(c => c.handled).length, t = phaseCues.items.length;
                        if (d < t) bits.push(d + ' of ' + t + ' essentials handled');
                      }
                      const first = String(actions[0].title || '').replace(/\.+$/, '');
                      bits.push('first: ' + (first.length > 44 ? first.slice(0, 44) + '…' : first) + ' ↓');
                      return bits.join(' · ');
                    })()}
                  </div>
                </button>
              </div>

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
                    const pillars = [
                      ...(callsPill ? [['Calls to make', callsPill]] : []),
                      ...(home ? [] : [['People', readiness.vendor], ['Paperwork', readiness.document]]),
                      ['Checklist', readiness.timeline],
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
                    <div className="then-row" key={sec.key}>
                      <span className="d" style={{ minWidth: 108 }}>{sec.label}</span>
                      <span style={{ color: 'var(--carbon-muted)' }}>{sec.detail}</span>
                    </div>
                  ))}
                </div>
              )}

              {blockers.map((b, i) => (
                <article className="card" key={'blk-' + i} style={{ marginTop: i === 0 ? 24 : 0 }}>
                  <div className="card-head">
                    <div className="card-top"><span className="tag plan" style={{ color: 'var(--danger)', background: 'rgba(232,64,54,.14)' }}>Blocked</span></div>
                    <h3>{b.title}</h3>
                    {b.what && <p className="because">{b.what}</p>}
                    {b.nextDecision && <p className="grounding" style={{ marginTop: 6 }}>{b.nextDecision}</p>}
                  </div>
                </article>
              ))}

              {event.venue && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>
                    {addressOpen ? 'Where exactly?' : 'Guests will ask where — add the address for ' + String(event.venue).toLowerCase()}
                  </span>
                  {addressOpen ? null : <button className="mini" onClick={() => setAddressOpen(true)}>Add it</button>}
                </div>
              )}
              {event.venue && !/\d/.test(String(event.venue)) && (event.venueKind === 'home' || /backyard|house|place|yard|home|garden|farm|cabin/i.test(String(event.venue))) && addressOpen && (
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
                  <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, null)); } catch { toast('Couldn’t draft the note.'); } }}>Guest note</button>
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

              {String(event.venue || '').trim() && needsCity && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>What city or town? Weather and maps need it.</span>
                  <input className="field" style={{ maxWidth: 130, fontSize: 13, padding: '6px 10px' }} placeholder="Annapolis"
                    value={cityDraft} onChange={e => setCityDraft(e.target.value)} aria-label="City or town" />
                  <button className="mini" onClick={saveCity}>Save</button>
                </div>
              )}
              {!String(event.venue || '').trim() && (
                <article className="card" style={{ marginTop: 20 }}>
                  <div className="card-head">
                    <div className="card-top">
                      <span className="tag plan" style={(days != null && days <= 1) ? { color: 'var(--danger)', background: 'rgba(232,64,54,.14)' } : undefined}>
                        {(days != null && days <= 1) ? 'Today' : 'Plan'}
                      </span>
                    </div>
                    <h3>Where is it happening?</h3>
                    <p className="because">{(days != null && days <= 1)
                      ? 'It’s the day — guests, the rain note, and every map link need a place. This can’t wait.'
                      : 'Everything hangs off the venue — invites, the rain backup, seats and space.'}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input className="field" style={{ maxWidth: 'none', flex: 1 }} placeholder="Name the place — “My brother’s backyard”, “VFW Post 3150”…"
                        value={venueDraft} onChange={e => { setVenueDraft(e.target.value); setVenueErr(null); }} aria-label="Venue" />
                      <button className="cta" onClick={saveVenue}>Save</button>
                    </div>
                    {venueErr && <p className="grounding" style={{ marginTop: 6, color: 'var(--danger)' }}>{venueErr}</p>}
                  </div>
                </article>
              )}

              <div className="sect" id="actionsAnchor"><h2>What needs you</h2><div className="rule" /><span className="when">in order</span></div>

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
                  Space, seats &amp; helpers{helpers.length ? ` — ${helpers.length} helping` : ''}
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

          {/* ══════════ THE DAY — real run-of-show data ══════════ */}
          {stage === 'day' && (
            <section className="day-sec">
              <div className="eyebrow">{event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date'} · {isPast ? 'as it ran' : 'preview'}</div>
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
                    <button className="cta" style={{ marginTop: 6 }} onClick={() => { feedback(dayIdx === ros.length - 1 ? 'magic' : 'act'); setDayIdx(i => i + 1); }}>
                      {dayIdx === ros.length - 1 ? 'Done — that’s the last one' : 'Done — what’s next'}
                    </button>
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
              <div className="eyebrow">{isPast ? 'Afterward' : 'Preview — how closeout will read'}</div>
              <h1 className="mega" style={{ fontSize: 'clamp(30px,10cqw,42px)', lineHeight: 1.02 }}>
                {isPast ? 'How it landed.' : 'How it’ll land.'}
              </h1>
              <p className="mega-sub" style={{ fontSize: 16 }}>
                {money.planned
                  ? (money.committed <= money.planned
                    ? `${fmt(money.planned - money.committed)} of headroom against the ${fmt(money.planned)} plan so far.`
                    : `Running ${fmt(money.committed - money.planned)} over the ${fmt(money.planned)} plan.`)
                  : 'No budget lines yet — closeout has nothing to reconcile.'}
              </p>

              {budgetLines.length > 0 && (
                <>
                  <div className="sect"><h2>The money</h2><div className="rule" /><span className="when">{budgetLines.length} lines · real data</span></div>
                  <div className="card no-hover"><div className="card-head" style={{ cursor: 'default' }}>
                    {budgetLines.map(l => (
                      <div className="line" key={l.id}>
                        <span>{l.category}</span>
                        <span className="amt">{fmt(Number(l.actual) || 0)} <span className="of">of {fmt(Number(l.budgeted) || 0)}</span></span>
                      </div>
                    ))}
                    <div className="line total">
                      <span>{isPast ? 'Spent, all in' : 'Committed so far'}</span>
                      <span className={'amt' + (money.committed <= money.planned ? ' under' : '')}>
                        {fmt(money.committed)} · {money.committed <= money.planned ? fmt(money.planned - money.committed) + ' under' : fmt(money.committed - money.planned) + ' over'}
                      </span>
                    </div>
                  </div></div>
                </>
              )}

              <div className="sect"><h2>What carries forward</h2><div className="rule" /></div>
              <div className="empty" style={{ background: 'var(--steel-tint)' }}>
                {guests ? `${guests} guests planned` : 'No guest count'} · {handled.length} foundation fact{handled.length === 1 ? '' : 's'} on record · every budget line above stays saved. The thank-you is drafted right here from what actually happened; “for next time” notes live in the main app’s event memory.
              </div>
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
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : sheet.kind === 'decisions' ? 'Calls to make' : sheet.kind === 'space' ? 'Space, seats & helpers' : sheet.kind === 'risks' ? 'What could go wrong' : sheet.kind === 'rain' ? 'If it rains' : sheet.kind === 'crabs' ? 'The crab order' : sheet.kind === 'events' ? 'Your events' : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {sheet.kind === 'decisions' && (
              <>
                {(decisionBoard.open || []).length ? (decisionBoard.open || []).map((r, i) => (
                  <button key={r.id || i} className={'frow' + (sheet.focus && sheet.focus === r.id ? ' rowfocus' : '')} style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                    onClick={() => { if (r.route && routeSheet(r.route)) return; toast(r.because || r.label); }}>
                    <span className="f-main">
                      <span className="f-name">{r.label}
                        {r.status === 'overdue' && <span className="tag plan" style={{ color: 'var(--danger)', background: 'rgba(232,64,54,.14)' }}>overdue</span>}
                      </span>
                      {r.because && <span className="v-meta">{r.because}</span>}
                    </span>
                  </button>
                )) : <div className="v-meta" style={{ padding: '14px 2px' }}>Nothing waiting on you.</div>}
                {(decisionBoard.locked || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '14px 0 4px' }}>Settled</div>
                    {(decisionBoard.locked || []).map((r, i) => (
                      <div key={r.id || i} className="line"><span>{r.label}</span><span className="of">{r.because}</span></div>
                    ))}
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
                {risks && (risks.items || []).map((r, i) => (
                  <div key={r.id || i} className="brow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                    <div className="f-name" style={{ marginBottom: 3 }}>
                      {r.trigger}
                      <span className={'tag ' + (r.severity === 'high' ? 'plan' : 'plan')} style={r.severity === 'high' ? { color: 'var(--danger)', background: 'rgba(232,64,54,.14)' } : { color: 'var(--warn)', background: 'var(--warn-tint)' }}>{r.severity}</span>
                    </div>
                    <p className="grounding" style={{ margin: 0 }}>{r.mitigation}</p>
                  </div>
                ))}
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
                          onClick={() => writeCp({ lines: lines.map((x, ix) => ix === i ? { ...x, bought: !x.bought } : x) }, l.bought ? 'Back on the order.' : 'Marked bought — real spend now, not an estimate.')}>
                          {l.bought ? 'bought' : 'got it?'}
                        </button>
                        <button className="mini" onClick={() => writeCp({ lines: lines.filter((_, ix) => ix !== i) }, 'Line removed — the coverage math just recomputed.')}>×</button>
                      </span>
                    </div>
                  ))}
                  {crab.bushelExplanation && <p className="grounding" style={{ margin: '8px 0 0' }}>{crab.bushelExplanation}</p>}
                  {(crab.issues || []).map((iss, i) => (
                    <p className="grounding" key={i} style={{ margin: '6px 0 0', color: 'var(--warn)' }}>{iss.copy || iss.message || String(iss)}</p>
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
            {sheet.kind === 'rain' && (
              <>
                {event.rainPlan ? (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Your backup: {event.rainPlan}</div>
                ) : (
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>Open sky and no backup named yet — pick one, or let it be written for you.</div>
                )}
                {rainEditorBlock()}
                {event.rainPlan && (
                  <div className="actions-row" style={{ marginTop: 12 }}>
                    <button className="mini" onClick={() => { try { openDraft('Rain note to guests', guestRainMessage(event, null)); } catch { toast('Couldn’t draft the note.'); } }}>Draft the guest note</button>
                  </div>
                )}
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
                  <div className="v-meta" style={{ padding: '2px 2px 10px' }}>
                    {(event.timeline || []).filter(t => t && !t.done).length} open of {(event.timeline || []).length} — check things off and your plan keeps up.
                  </div>
                  {(event.timeline || []).map((t, i) => (
                    <button key={t.id || i} className={'frow' + (t.done ? ' got' : '') + (sheet.focus && t.id === sheet.focus ? ' focus-task' : '')}
                      ref={el => { if (el && sheet.focus && t.id === sheet.focus) el.scrollIntoView({ block: 'center' }); }}
                      style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                      onClick={() => toggleTask(i)}>
                      <span className="fcheck" aria-hidden="true" />
                      <span className="f-main">
                        <span className="f-name">{t.task}</span>
                        <span className="v-meta">{[t.week, t.owner].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  ))}
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
                {(foodPlan.choices || []).length > 0 && (
                  <>
                    <div className="shelf-label" style={{ margin: '10px 0 8px' }}>Your choices</div>
                    {foodPlan.choices.map(d => (
                      <div key={d.id} style={{ marginBottom: 12 }}>
                        <div className="f-name" style={{ marginBottom: 6 }}>{d.label}</div>
                        <div className="chips">
                          {(d.options || []).map(opt => (
                            <button key={opt} className="chip" aria-pressed={(d.chosen || d.default) === opt}
                              onClick={() => patchEvent({ foodChoices: { ...(event.foodChoices || {}), [d.id]: opt } },
                                d.label + ': ' + opt + ' — the spread just re-sized.')}>{opt}</button>
                          ))}
                        </div>
                        {d.why && <p className="grounding" style={{ marginTop: 5 }}>{d.why}</p>}
                      </div>
                    ))}
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
                  return groups.map(g => (
                    <div key={g}>
                      <div className="shelf-label" style={{ margin: '14px 0 4px' }}>{g}</div>
                      {items.filter(it => (it.group || 'Other') === g).map((it, i) => {
                        const got = !!(event.foodGot || {})[it.id];
                        const cost = it.locked != null ? Number(it.locked) : ((Number(it.low) || 0) + (Number(it.high) || 0)) / 2;
                        return (
                          <button key={it.id} className={'frow' + (got ? ' got' : '')}
                            style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
                            onClick={() => toggleGot(it, cost)}>
                            <span className="fcheck" aria-hidden="true" />
                            <span className="f-main">
                              <span className="f-name">
                                {it.short || it.item}
                                {it.essential && !got ? <span className="tag essential">essential</span> : null}
                                {it.badge ? <span className="tag plan">{String(it.badge).toLowerCase()}</span> : null}
                                {it.buyAt === 'day-of' ? <span className="tag essential">day-of</span> : null}
                              </span>
                              <span className="v-meta">
                                {[
                                  it.qty && it.unit ? `${it.qty} ${it.unit}` : null,
                                  foodPlan.hasRealCount && it.unitBase && it.perUnitLow ? `${fmt(it.perUnitLow)}–${fmt(it.perUnitHigh)}/${it.unitBase}` : null,
                                  it.where,
                                ].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            <span className="amt">
                              {foodPlan.hasRealCount
                                ? (it.locked != null ? fmt(it.locked) : fmt(it.low) + '–' + fmt(it.high))
                                : '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
                {(foodPlan.specialDiets || []).length > 0 && (
                  <p className="grounding" style={{ marginTop: 10 }}>
                    Dietary: {foodPlan.specialDiets.map(d => d.count + ' ' + d.diet).join(', ')} — a real named main is sized into the totals for them.
                  </p>
                )}
              </>
            ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No spread to build for this kind of event yet.</div>)}
            {sheet.kind === 'vendors' && (
              (event.vendors || []).length ? (event.vendors || []).map(v => (
                <div key={v.id} className={'vrow' + (sheet.focus === v.id ? ' focus' : '')}
                  ref={el => { if (el && sheet.focus === v.id) el.scrollIntoView({ block: 'center' }); }}>
                  <div>
                    <div className="v-name">{v.name || 'Unnamed'}</div>
                    <div className="v-meta">{[v.category, v.status].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="tag vendors">{v.status || '—'}</span>
                    <button className="mini" onClick={(ev) => { ev.stopPropagation(); openDraft('Note to ' + (v.name || 'your vendor'), draftVendorOutreach(event, v, null)); }}>Draft note</button>
                  </span>
                </div>
              )) : <div className="v-meta" style={{ padding: '14px 2px' }}>No vendors on this event yet.</div>
            )}
            {sheet.kind === 'budget' && (() => {
              // HOST MODEL: one number, and "where it's going" priced by the plan
              // itself (hostSpending's food/supplies/capacity terms) — never
              // planner category rows the host didn't write.
              const hostRows = [
                { label: 'Food & drinks', est: spend.foodEstimate || 0, got: spend.foodBought || 0 },
                { label: 'Supplies', est: spend.suppliesEstimate || 0, got: spend.suppliesBought || 0 },
                ...(spend.hasCapacity ? [{ label: 'Seats, tables & space', est: spend.capacityEstimate || 0, got: spend.capacityBought || 0 }] : []),
                ...(spend.crabEstimate ? [{ label: 'The crab order', est: spend.crabEstimate || 0, got: spend.crabBought || 0 }] : []),
              ].filter(r => r.est > 0 || r.got > 0);
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
                          <div className="brow" key={r.label} style={{ animation: `cardin 300ms var(--ease-out) ${i * 40}ms both` }}>
                            <div className="line" style={{ padding: '0 0 5px' }}>
                              <span>{r.label}</span>
                              <span className="amt">{fmt(r.got)} <span className="of">bought of {fmt(r.est)}</span></span>
                            </div>
                            <div className="bline"><i style={{ width: Math.max(alloc, 4) + '%' }}><b style={{ width: got + '%' }} /></i></div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="line total"><span>Spoken for so far</span><span className="amt">{fmt(money.committed)}{money.planned ? ' of ' + fmt(money.planned) : ''}</span></div>
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
              return (event.guests || []).length ? (
                <>
                  {gcr && gcr.pending > 0 && (
                    <div className="v-meta" style={{ padding: '0 2px 6px' }}>
                      {gcr.pending} still unanswered{bandLbl ? ' · likely ' + bandLbl + ' on the day' : ''} — the count settles as replies land.
                    </div>
                  )}
                  <div className="v-meta" style={{ padding: '2px 2px 12px' }}>
                    {(event.guests || []).filter(g => g && g.rsvp === 'Yes').length} yes of {(event.guests || []).length}
                    {rsvpBy && rsvpBy.iso && !isPast ? ` · replies by ${new Date(rsvpBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    {' — tap a name to flip their RSVP — your plan reads this list.'}
                  </div>
                  <div className="actions-row" style={{ margin: '0 0 8px' }}>
                    <button className="mini" onClick={() => openDraft('Your invite', draftInvite(event, null))}>Copy the invite</button>
                    <button className="mini" onClick={() => openDraft('The RSVP nudge', draftRsvpChase(event, null))}>Nudge the quiet ones</button>
                  </div>
                  {(event.guests || []).slice(0, 40).map((g, i) => (
                    <button key={i} className="grow" onClick={() => toggleRsvp(i)}>
                      <span>{g.name || 'Guest ' + (i + 1)}</span>
                      <span className={'tag plan'} style={g.rsvp === 'Yes' ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : g.rsvp === 'Maybe' ? { color: 'var(--warn)', background: 'var(--warn-tint)' } : undefined}>{g.rsvp || '—'}</span>
                    </button>
                  ))}
                  {quickAdd}
                </>
              ) : (
                <>
                  <div className="v-meta" style={{ padding: '14px 2px 4px' }}>
                    No list yet{guests ? ' — you’re planning around ' + guests + ' for now' : ''}. A real list is what unlocks RSVPs, the confirmed count, and the caterer check.
                  </div>
                  {quickAdd}
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
              {wxOpen ? 'Weather on your day' : rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}
            </span>
            <span className="chev" style={{ position: 'static' }}>{wxOpen ? '▾' : '›'}</span>
          </button>
          {wxOpen && (
            <div className="wx-body">
              <p className="wx-headline">{rainAwareSummary(wxImpact.headline, rainPlanStatus(event).hasPlan)}</p>
              {wx.rainWindow && <p className="grounding" style={{ margin: '4px 0 0' }}>Rain looks most likely {wx.rainWindow.label} — {wxImpact.confidence === 'hourly' ? 'from the hour-by-hour read' : 'timing is a day-level read'}.</p>}
              <div className="actions-row" style={{ marginTop: 10 }}>
                <button className="cta" onClick={() => { setWxOpen(false); setSheet({ kind: 'rain' }); }}>
                  {rainPlanStatus(event).hasPlan ? 'Review the backup' : 'Add a rain backup'}
                </button>
                {rainPlanStatus(event).hasPlan && (
                  <button className="mini" onClick={() => { setWxOpen(false); try { openDraft('Rain note to guests', guestRainMessage(event, wx)); } catch { toast('Couldn’t draft the note.'); } }}>
                    Guest note
                  </button>
                )}
              </div>
              <p className="grounding" style={{ marginTop: 10, opacity: .7 }}>Sample forecast for this preview — live weather turns on with the API key.</p>
            </div>
          )}
        </div>
      )}

      <nav className="dock" aria-label="Sections">
        <button aria-current={stage === 'create'} onClick={() => setStage('create')}>Create</button>
        <button aria-current={stage === 'plan'} onClick={() => setStage('plan')}>Plan</button>
        <button aria-current={stage === 'day'} onClick={() => setStage('day')}>The Day</button>
        <button aria-current={stage === 'after'} onClick={() => setStage('after')}>After</button>
      </nav>

      {toastMsg && <div className="toast on">{toastMsg}</div>}
    </div>
  );
}
