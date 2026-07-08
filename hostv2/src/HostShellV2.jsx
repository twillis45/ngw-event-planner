// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production engines: eventPlan() (CommandCenter.jsx), identityStatement()
// (lib/eventIdentity), real sample events, real budget + run-of-show data.
// Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { eventPlan, getEventReadiness } from '@app/CommandCenter';
import { buildAssembleRevealStages } from '@app/lib/assembleRevealEngines';
import { isLikelyOutdoor } from '@app/lib/weather';
import { playMessageChime, setMessageSoundMuted } from '@app/lib/notificationSound';
import { draftInvite, draftShoppingList, draftVendorOutreach, draftThankYou, draftRsvpChase } from '@app/lib/doItForMe';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor } from '@app/lib/dates';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { buildDayBeforePlan } from '@app/lib/dayBefore';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { estimateTotalRange, estimatorConfidence } from '@app/lib/budgetEstimator';
import { ALL_PLAYBOOKS, playbookFoodPlan } from '@app/lib/playbooks';
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

  // Create-stage form
  const [fName, setFName] = useState('David Carter');
  const [fType, setFType] = useState('Retirement Party');
  const [fDate, setFDate] = useState('2026-08-22');
  const [fGuests, setFGuests] = useState(75);
  const [fBudget, setFBudget] = useState(null);
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

  // Create-stage intelligence, all real: date validity (lib/dates), likely
  // turnout (lib/attendanceModel), and budget options from the REAL estimator.
  const dstatC = eventDateStatus(fDate);
  const expectC = expectedFromPlanned(fGuests, fType);
  const estC = estimateTotalRange({ type: fType, guestCount: fGuests, date: fDate });
  const confC = estimatorConfidence({ hasType: !!fType, hasDate: !dstatC.blocking, hasGuestCount: fGuests > 0, hasMarket: false, hasTimeOfDay: false, hasHistory: false });
  const budgetOpts = estC
    ? [...new Set([estC.lowTotal, Math.round(((estC.lowTotal + estC.highTotal) / 2) / 100) * 100, estC.highTotal])]
    : [];

  const base = eventId === 'custom' ? custom : (ALL_SAMPLES.find(e => e.id === eventId) || FALLBACK);
  const event = useMemo(() => ({ ...(base || FALLBACK), ...(eventId === 'custom' ? {} : patch) }), [base, patch, eventId]);

  // ── THE REAL ENGINE ──
  const plan = useMemo(() => {
    try { return eventPlan(event, null); }
    catch (err) { return { _error: String(err), nextActions: [], progress: { done: 0, total: 0 }, handled: [], vendorReadinessRollup: null }; }
  }, [event]);

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

  // Flip one RSVP — writes the same guests array the engine's confirmed-count
  // (and the catering-drift detector) read.
  const toggleRsvp = (i) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, rsvp: g.rsvp === 'Yes' ? 'No' : 'Yes' } : g);
    const yes = gs.filter(g => g && g.rsvp === 'Yes').length;
    patchEvent({ guests: gs }, (gs[i].name || 'Guest') + ' flipped to ' + (gs[i].rsvp === 'Yes' ? 'yes' : 'no') + ' — ' + yes + ' confirmed now. The engine reads this.');
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
    const f = (a.route && a.route.focusField) || '';
    if (f === 'hsp-budget' || a.domain === 'readiness') return 'budget';
    if (f === 'event-date') return 'date';
    if (f === 'rain-plan' || /rain backup/i.test(a.title || '')) return 'rain';
    if (f === 'guests-entry' || a.domain === 'start') return 'guests';
    if ((a.route && a.route.foodFocus) || f === 'food-plan') return 'food';
    if (/catering count/i.test(a.title || '')) return 'count';
    return null;
  };

  const onCta = (a, key) => {
    const kind = wiredKind(a);
    if (kind) { setEditor(editor === key ? null : key); return; }
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
      </div>
    );
    if (kind === 'rain') return (
      <div className="chips hc-row">
        {['Tent on standby', 'Carport / garage', 'Move it indoors', 'Rain or shine'].map(p => (
          <button key={p} className="chip" aria-pressed={event.rainPlan === p}
            onClick={() => patchEvent({ rainPlan: p }, 'Rain backup set: ' + p + ' — the day-of view knows.')}>{p}</button>
        ))}
      </div>
    );
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

  // Budget editor — shared by the action-card editor AND the Budget sheet, so a
  // set budget stays changeable forever (three options = the estimator's real
  // low / mid / high; custom numbers split across the same real shares).
  const budgetEditorBlock = () => {
    const est = estimateTotalRange({ type: event.type, guestCount: guests, date: event.date });
    const opts = est
      ? [...new Set([est.lowTotal, Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100, est.highTotal])]
      : [2000, 3500, 5000];
    const LABELS = opts.length === 3 ? ['Lean', 'Typical', 'All-out'] : [];
    // HOST MODEL: one number (event.totalBudget) — category rows are the
    // planner's model, never the host's (per hostSpending's own doctrine).
    const setB = (n) => {
      setCustomBudget('');
      patchEvent({ totalBudget: n },
        'Budget set at ' + fmt(n) + ' — one number, yours to change anytime.');
    };
    const customN = parseInt(customBudget, 10) || 0;
    return (
      <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div className="chips">
          {opts.map((n, idx) => (
            <button key={n} className="chip" aria-pressed={money.planned === n} onClick={() => setB(n)}>
              {LABELS[idx] ? LABELS[idx] + ' · ' : ''}{fmt(n)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ maxWidth: 170, fontSize: 15, padding: '10px 14px' }}
            type="number" inputMode="numeric" min="0" placeholder="Your own number"
            value={customBudget} onChange={e => setCustomBudget(e.target.value)}
            aria-label="Custom budget amount" />
          <button className="cta" disabled={customN <= 0} style={customN <= 0 ? { opacity: .45 } : undefined}
            onClick={() => setB(customN)}>Use it</button>
        </div>
        <p className="grounding" style={{ margin: 0 }}>
          {est ? `That’s the honest range for ${guests} at a ${String(event.type).toLowerCase()} — lean to all-out.` : 'No estimate for this type — pick or enter any number.'} One number is all you need — the plan works out the rest.
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
    const ev = {
      id: 'custom', rsvpCode: 'mine',
      name: (fName || 'My') + '’s ' + fType.replace(' Party', ''),
      honoree: fName || '',
      type: fType, date: fDate, venue: '',
      guestEstimate: fGuests || '',
      totalBudget: fBudget || '',
      budget: [],
      guests: [], vendors: [], timeline: [],
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

  const ros = Array.isArray(event.ros) ? event.ros : [];
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
                    Tell me four things and I’ll take it from there.
                  </p>
                  <div className="q"><div className="q-label">Who’s it for?</div>
                    <input className="field" value={fName} onChange={e => setFName(e.target.value)} aria-label="Who is it for" />
                  </div>
                  <div className="q"><div className="q-label">The occasion</div>
                    {!typeOpen ? (
                      /* Progressive disclosure: the 35-type catalog stays folded
                         behind the current pick until the host asks for it. */
                      <div className="chips">
                        <button className="chip" aria-pressed="true" onClick={() => setTypeOpen(true)}>{fType.replace(' Party', '')}</button>
                        <button className="chip" onClick={() => setTypeOpen(true)}>Change</button>
                      </div>
                    ) : (
                      <div className="typebrowser">
                        <input
                          className="field" style={{ maxWidth: 'none' }}
                          placeholder="Type it — bbq, crab boil, sweet 16…"
                          value={typeQuery} autoFocus
                          onChange={e => setTypeQuery(e.target.value)}
                          aria-label="Search occasions"
                        />
                        {typeMatches ? (
                          <div className="chips" style={{ marginTop: 12 }}>
                            {typeMatches.length
                              ? typeMatches.map(t => (
                                <button key={t} className="chip" aria-pressed={fType === t} onClick={() => pickType(t)}>{t.replace(' Party', '')}</button>
                              ))
                              : <p className="grounding">Nothing matches — try another word. “bbq”, “boil”, and “get together” all work.</p>}
                          </div>
                        ) : (
                          TYPE_GROUPS.map(([group, list]) => (
                            <div key={group} className="shelf-wrap">
                              <div className="shelf-label">{group}</div>
                              <div className="shelf">
                                {list.map(t => (
                                  <button key={t} className="chip" aria-pressed={fType === t} onClick={() => pickType(t)}>{t.replace(' Party', '')}</button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="q"><div className="q-label">When?</div>
                    <input className="field" type="date" value={fDate} onChange={e => setFDate(e.target.value)} aria-label="Event date" />
                    {/* eventDateStatus — the app's real time intelligence */}
                    {dstatC.status !== 'ok' && (
                      <p className="grounding" style={dstatC.blocking ? { color: 'var(--danger)' } : { color: 'var(--warn)' }}>{dstatC.reason}</p>
                    )}
                  </div>
                  <div className="q"><div className="q-label">Roughly how many people?</div>
                    <div className="chips">{[30, 50, 75, 120, 0].map(n => (
                      <button key={n} className="chip" aria-pressed={fGuests === n} onClick={() => { setFGuests(n); setFBudget(null); }}>{n === 0 ? 'No idea yet' : '~' + n}</button>
                    ))}</div>
                    {/* expectedFromPlanned — the real attendance model */}
                    {expectC && <p className="grounding">Plan for {expectC.planned} — likely {expectC.low}–{expectC.high} actually make it.</p>}
                  </div>
                  <div className="q"><div className="q-label">What feels right to spend?</div>
                    {/* Three options = the estimator's real low / typical / high for this
                        type + count + date. A custom number is first-class too. */}
                    <div className="chips">
                      {budgetOpts.map((n, idx) => (
                        <button key={n} className="chip" aria-pressed={fBudget === n} onClick={() => { setFBudget(n); setCustomBudget(''); }}>
                          {(budgetOpts.length === 3 ? ['Lean', 'Typical', 'All-out'][idx] + ' · ' : '')}{fmt(n)}
                        </button>
                      ))}
                      <button className="chip" aria-pressed={fBudget === null && !customBudget} onClick={() => { setFBudget(null); setCustomBudget(''); }}>Not sure yet</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input className="field" style={{ maxWidth: 170, fontSize: 15, padding: '10px 14px' }}
                        type="number" inputMode="numeric" min="0" placeholder="Your own number"
                        value={customBudget}
                        onChange={e => { setCustomBudget(e.target.value); const n = parseInt(e.target.value, 10); setFBudget(n > 0 ? n : null); }}
                        aria-label="Custom budget amount" />
                    </div>
                    {estC
                      ? <p className="grounding">Most people spend {fmt(estC.lowTotal)}–{fmt(estC.highTotal)}{confC.level === 'high' ? ' — a confident read' : confC.level === 'medium' ? ' — a fair first read' : ' — a rough first read'}. Pick one or write your own; you can change it anytime.</p>
                      : <p className="grounding">Pick a guest count and the estimator can suggest a range.</p>}
                  </div>
                  <div style={{ marginTop: 34 }}>
                    <button className="cta big" onClick={assemble} disabled={dstatC.blocking} style={dstatC.blocking ? { opacity: .45, cursor: 'not-allowed' } : undefined}>
                      Put my plan together
                    </button>
                  </div>
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
                    <div className="t-sub">{money.planned ? `${fmt(money.committed)} spoken for · ${fmt(money.spent)} spent` : 'no number yet — tap to set one'}</div>
                  </div>
                </button>
                <button
                  className={'tile tile-d' + (actions.length === 0 ? ' allset' : '')}
                  onClick={() => document.getElementById('actionsAnchor')?.scrollIntoView({ behavior: 'smooth' })}
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
                  {readiness && (
                    <div className="pills">
                      {[['Calls to make', readiness.decision], ['People', readiness.vendor], ['Checklist', readiness.timeline], ['Paperwork', readiness.document]].map(([label, r]) => r && (
                        <button key={label} className={'pill ' + (r.status === 'ON_TRACK' ? 'p-ok' : r.status === 'ATTENTION' ? 'p-warn' : 'p-risk')}
                          onClick={() => toast(label + ' — ' + (r.label || '') + (r.note ? ': ' + r.note : ''))}>
                          {label}<span className="pill-note">{r.note}</span>
                        </button>
                      ))}
                    </div>
                  )}
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

              {outdoor && event.rainPlan && (
                <div className="later-row" style={{ marginTop: 18 }}>
                  <span className="t" style={{ color: 'var(--muted)', fontWeight: 550 }}>If it rains: {event.rainPlan}</span>
                  <button className="mini" onClick={() => patchEvent({ rainPlan: '' }, 'Rain backup cleared — worth re-naming one.')}>Change</button>
                </div>
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
                  <article className="card" key={key} style={{ animation: `cardin 340ms var(--ease-out) ${Math.min(i, 6) * 45}ms both` }}>
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


              {foodPlan && foodPlan.itemCount > 0 && (
                <button className="fold-btn" onClick={() => setSheet({ kind: 'food' })}>
                  The spread &amp; shopping — {foodPlan.boughtCount} of {foodPlan.itemCount} bought
                  <span className="chev">›</span>
                </button>
              )}

              {rollup && rollup.counts && rollup.counts.total > 0 && (
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
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Your money' : sheet.kind === 'food' ? 'The spread & shopping' : sheet.kind === 'tasks' ? 'Your checklist' : sheet.kind === 'draft' ? (sheet.title || 'Written for you') : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
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
                                {it.essential ? <span className="tag essential">essential</span> : null}
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
                  {budgetLines.length > 0 && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Already promised</div>
                      {budgetLines.map(l => (
                        <div className="line" key={l.id}><span>{l.category}</span><span className="amt">{fmt(Number(l.actual) || 0)} <span className="of">of {fmt(Number(l.budgeted) || 0)}</span></span></div>
                      ))}
                    </>
                  )}
                  <div className="line total"><span>Spoken for so far</span><span className="amt">{fmt(money.committed)}{money.planned ? ' of ' + fmt(money.planned) : ''}</span></div>
                  <div className="shelf-label" style={{ margin: '16px 0 8px' }}>Change it</div>
                  {budgetEditorBlock()}
                </>
              );
            })()}
            {sheet.kind === 'guests' && (
              (event.guests || []).length ? (
                <>
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
                      <span className={'tag ' + (g.rsvp === 'Yes' ? 'budget' : 'plan')}>{g.rsvp || '—'}</span>
                    </button>
                  ))}
                </>
              ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No guest list on this event.</div>
            )}
          </div>
        </>
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
