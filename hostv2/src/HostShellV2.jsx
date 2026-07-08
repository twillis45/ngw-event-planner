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
import { positiveAttention } from '@app/lib/positiveAttention';
import { isLikelyOutdoor, suggestRainPlan, guestRainMessage } from '@app/lib/weather';
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
const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV, MY_CRAB_FEAST];
const ROSTER = [...ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean), MY_CRAB_FEAST];
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
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const dm = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (dm) {
      const now = new Date(); const cand = new Date(now.getFullYear(), MONTHS.indexOf(dm[1].slice(0, 3).toLowerCase()), parseInt(dm[2], 10), 12);
      if (cand < now) cand.setFullYear(cand.getFullYear() + 1);
      date = cand.toISOString().slice(0, 10);
    } else {
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
    return {
      type, guests, date,
      honoree: hm ? hm[1] : null,
      venueKind: home ? 'home' : '',
      venue: home ? (/backyard/i.test(t) ? 'Backyard' : 'Home') : '',
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
  const decisionBoard = useMemo(() => { try { return playbookDecisionBoard(event) || { open: [], locked: [] }; } catch { return { open: [], locked: [] }; } }, [event]);
  const capacity = useMemo(() => { try { return playbookCapacity(event); } catch { return null; } }, [event]);
  const helpers = useMemo(() => { try { return deriveHelperResponsibilities(event) || []; } catch { return []; } }, [event]);
  const risks = useMemo(() => { try { return playbookRisks(event); } catch { return null; } }, [event]);
  // The essentials rail (phaseProgress), tight-timeline summary, and the
  // playbook's heart moments — the last of the audit list.
  const phaseCues = useMemo(() => { try { return deriveEventPhaseProgress(event); } catch { return null; } }, [event]);
  const compression = useMemo(() => { try { return deriveEventCompressionSummary(event, daysUntil); } catch { return null; } }, [event]);
  const heartMoments = useMemo(() => { try { return playbookHeartMoments(event) || []; } catch { return []; } }, [event]);

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
    spotTimer.current = setTimeout(() => setSpot(null), 2200);
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
    return false;
  };

  // Do-it-for-me: the app's REAL drafting engine (lib/doItForMe), verbatim.
  const openDraft = (title, d) => {
    const body = d ? (typeof d === 'string' ? d : [d.subject, d.body].filter(Boolean).join('\n\n')) : '';
    if (!body.trim()) { toast('Nothing to draft yet — add a few more details first.'); return; }
    setSheet({ kind: 'draft', title, body });
  };
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
                onClick={() => patchEvent({ rainPlan: suggested }, 'Backup written for you — tuned to where you’re hosting.')}>
                Do it for me
              </button>
            )}
            {authored && (
              <button className="cta soft"
                onClick={() => patchEvent({ rainPlan: authored }, 'The ' + String(event.type).toLowerCase() + ' move it is.')}>
                The {String(event.type).toLowerCase()} move
              </button>
            )}
          </div>
          <div className="chips">
            {['Tent on standby', 'Carport / garage', 'Move it indoors', 'Rain or shine'].map(p => (
              <button key={p} className="chip" aria-pressed={event.rainPlan === p}
                onClick={() => patchEvent({ rainPlan: p }, 'Rain backup set: ' + p + ' — the day-of view knows.')}>{p}</button>
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
    // HOST MODEL (the app's own pattern): one "What's your budget?" number;
    // the estimator range is a HINT beside it, never a set of options.
    const setB = (n) => {
      setCustomBudget('');
      patchEvent({ totalBudget: n },
        'Budget set at ' + fmt(n) + ' — one number, yours to change anytime.');
    };
    const customN = parseInt(customBudget, 10) || 0;
    return (
      <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ maxWidth: 170, fontSize: 15, padding: '10px 14px' }}
            type="number" inputMode="numeric" min="0" placeholder="Your own number"
            value={customBudget} onChange={e => setCustomBudget(e.target.value)}
            aria-label="Custom budget amount" />
          <button className="cta" disabled={customN <= 0} style={customN <= 0 ? { opacity: .45 } : undefined}
            onClick={() => setB(customN)}>Use it</button>
        </div>
        <p className="grounding" style={{ margin: 0 }}>
          {est ? `Typical for ${guests} at a ${String(event.type).toLowerCase()}: ${fmt(est.lowTotal)}–${fmt(est.highTotal)}.` : ''} One number is all you need — the plan works out the rest, and you can change it anytime.
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
                  <input
                    className="field" style={{ maxWidth: 'none', fontSize: 16.5, marginTop: 10 }}
                    placeholder="Try: crab feast for 20 in the backyard aug 2"
                    value={smartText}
                    onChange={e => { setSmartText(e.target.value); setFType(null); setCreateEdit(null); }}
                    aria-label="Describe your event"
                  />
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
              {/* Event switcher: edge-to-edge snap shelf, active event auto-centered.
                  Each chip carries its live countdown from the same real date math. */}
              <div className="shelf picker-shelf">
                {[...ROSTER, ...(custom ? [{ id: 'custom', _custom: true }] : [])].map(e => {
                  const isActive = e.id === eventId || (e._custom && eventId === 'custom');
                  const src = e._custom ? custom : e;
                  const d = daysUntil(src.date);
                  return (
                    <button key={e.id} className="chip" aria-pressed={isActive}
                      ref={el => { if (el && isActive) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }}
                      onClick={() => switchEvent(e._custom ? 'custom' : e.id)}>
                      {e._custom ? 'Yours' : (e === MY_CRAB_FEAST ? 'My Crab Feast' : e.type)}
                      <span className="chip-sub">{d === null ? 'no date' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : `${d}d`}</span>
                    </button>
                  );
                })}
                {eventId !== 'custom' && Object.keys(patch).length > 0 && (
                  <button className="chip reset" onClick={() => { setPatch({}); toast('Your changes to this event were cleared.'); }}>Reset changes</button>
                )}
              </div>

              {plan._error && <div className="engine-error">Engine error: {plan._error}</div>}

              <div className="eyebrow">{event.name}{event.venue ? ' · ' + event.venue : ''}</div>
              <div className="mega">
                {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${daysAnim}d ago` : `${daysAnim} days`}
              </div>
              <p className="mega-sub">
                {isPast && 'this one is behind you.'}
                {!isPast && (dstat.status === 'today' || dstat.status === 'tomorrow') && dstat.reason}
                {!isPast && days !== null && days > 1 && `until ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              </p>

              <div className="bento">
                <button className="tile tile-a" onClick={() => { setHandledOpen(o => !o); }}>
                  <div className="t-label">The basics <span style={{ opacity: .55 }}>{handledOpen ? "▴" : "▾"}</span></div>
                  <div>
                    <div className="t-num">{pct === null ? '—' : pctAnim + '%'}</div>
                    <div className="bar"><i style={{ width: (pct || 0) + '%' }} /></div>
                    <div className="t-sub">
                      {plan.progress.total
                        ? `${plan.progress.done} of ${plan.progress.total} basics settled — date, guests, budget, food.`
                        : 'Nothing to read for this event yet.'}
                    </div>
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
                    if (actions.length) { const k = String(actions[0].id || 0); setEditor(null); spotlight(k); }
                    else document.getElementById('actionsAnchor')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="t-label">Next</div>
                  <div className="t-num">
                    {actions.length === 0 ? 'Nothing needs you' : `${actions.length} thing${actions.length === 1 ? '' : 's'} need${actions.length === 1 ? 's' : ''} you`}
                  </div>
                  <div className="t-go">{actions.length ? 'Start with the first one ↓' : 'The engine found no gaps'}</div>
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
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : sheet.kind === 'decisions' ? 'Calls to make' : sheet.kind === 'space' ? 'Space, seats & helpers' : sheet.kind === 'risks' ? 'What could go wrong' : sheet.kind === 'rain' ? 'If it rains' : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {sheet.kind === 'decisions' && (
              <>
                {(decisionBoard.open || []).length ? (decisionBoard.open || []).map((r, i) => (
                  <button key={r.id || i} className="frow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}
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
                  return (
                    <div key={it.key || i} className="brow" style={{ animation: `cardin 280ms var(--ease-out) ${Math.min(i, 8) * 35}ms both` }}>
                      <div className="line" style={{ padding: '0 0 4px' }}>
                        <span>{it.verb ? it.verb + ' ' : ''}{it.short || it.item} <span className="of">×{it.qty}</span></span>
                        <button className="mini" style={it.owned ? { color: 'var(--ok)', background: 'var(--ok-tint)' } : undefined}
                          onClick={() => patchEvent(
                            { capacityOwned: { ...(event.capacityOwned || {}), [it.key]: !it.owned } },
                            it.owned ? ((it.short || it.item) + ' back on the get list.') : ((it.short || it.item) + ' marked as yours — the plan stops pricing it.'))}>
                          {it.owned ? 'you have it' : (it.costLow || it.costHigh) ? fmt(it.costLow) + '–' + fmt(it.costHigh) : 'have it?'}
                        </button>
                      </div>
                      {links && (
                        <div className="actions-row" style={{ marginTop: 2 }}>
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
                <div className="draft-body">{sheet.body}</div>
                <div className="actions-row" style={{ marginTop: 14 }}>
                  <button className="cta" onClick={() => copyDraft(sheet.body)}>Copy it</button>
                </div>
                <p className="grounding" style={{ marginTop: 10 }}>Written from your event’s real details — edit anything after you paste it.</p>
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
