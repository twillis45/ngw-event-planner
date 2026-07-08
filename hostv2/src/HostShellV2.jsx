// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production orchestrator: eventPlan() (CommandCenter.jsx), real sample events,
// real budget lines. Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { eventPlan } from '@app/CommandCenter';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

// ── Event roster: a few real samples to swap between (engine generality demo) ──
const ROSTER_IDS = ['ev-x-retirement-party', 'ev-x-birthday', 'ev-x-graduation', 'ev-dmv-wedding'];
const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV];
const ROSTER = ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean);
const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

const LS_KEY = id => 'ngw-hostv2-patch-' + id;

const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

function daysUntil(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d)) return null;
    return Math.round((d - new Date()) / 86400000);
  } catch { return null; }
}

function budgetTotals(event) {
  const b = event.budget;
  if (Array.isArray(b)) {
    const planned = b.reduce((s, l) => s + (Number(l.budgeted) || 0), 0);
    const committed = b.reduce((s, l) => s + (Number(l.actual) || 0), 0);
    return { planned, committed, lines: b.length };
  }
  if (typeof b === 'number') return { planned: b, committed: 0, lines: 0 };
  return { planned: 0, committed: 0, lines: 0 };
}

function guestNumber(event) {
  return Number(event.guestEstimate) || Number(event.catererCount) || (event.guests || []).length || 0;
}

// Map engine action domains → host-facing lens labels.
const DOMAIN_LENS = { guests: 'Guests', budget: 'Budget', food: 'Food', vendors: 'Vendors', date: 'Plan', start: 'Guests' };

// Describe a route in host words — CTAs in this prototype don't navigate (there
// are no tabs here); they show exactly where the real app would take you.
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

export default function HostShellV2() {
  const [eventId, setEventId] = useState(FALLBACK ? FALLBACK.id : null);
  const [patch, setPatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY(FALLBACK.id))) || {}; } catch { return {}; }
  });
  const [toastMsg, setToastMsg] = useState(null);
  const [hcOpen, setHcOpen] = useState(false);
  const [handledOpen, setHandledOpen] = useState(false);
  const toastTimer = useRef(null);

  const base = ALL_SAMPLES.find(e => e.id === eventId) || FALLBACK;
  const event = useMemo(() => ({ ...base, ...patch }), [base, patch]);

  // ── THE REAL ENGINE ── every card, count, and route below comes from here.
  const plan = useMemo(() => {
    try { return eventPlan(event, null); }
    catch (err) { return { _error: String(err), nextActions: [], progress: { done: 0, total: 0 }, handled: [], vendorReadinessRollup: null }; }
  }, [event]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY(eventId), JSON.stringify(patch)); } catch {}
  }, [patch, eventId]);

  const switchEvent = (id) => {
    setEventId(id);
    setHcOpen(false); setHandledOpen(false);
    try { setPatch(JSON.parse(localStorage.getItem(LS_KEY(id))) || {}); } catch { setPatch({}); }
  };

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  };

  const days = daysUntil(event.date);
  const money = budgetTotals(event);
  const guests = guestNumber(event);
  const actions = plan.nextActions || [];
  const top = actions.slice(0, 3);
  const rest = actions.slice(3);
  const handled = plan.handled || [];
  const rollup = plan.vendorReadinessRollup;
  const pct = plan.progress.total ? Math.round((plan.progress.done / plan.progress.total) * 100) : null;

  const [lens, setLens] = useState('all');
  const lensSet = [...new Set(actions.map(a => DOMAIN_LENS[a.domain] || 'Plan'))];
  const show = a => lens === 'all' || (DOMAIN_LENS[a.domain] || 'Plan') === lens;

  const onCta = (a) => {
    const dest = describeRoute(a.route);
    toast(dest ? 'In the app this opens: ' + dest : 'This action has no route yet — the engine surfaced it without a deep link.');
  };

  const setGuests = (n) => {
    setPatch(p => ({ ...p, guestEstimate: n }));
    toast('Planning around ' + n + ' now — watch the plan recompute.');
  };

  return (
    <div className="stagewrap">
      <div className="app" id="app">
        <div className="content">
          <div className="appbar">
            <div className="wordmark">Event Boss</div>
            <div className="appbar-note">V2 · wired to real engine</div>
          </div>

          {/* Event picker — proves the engine generality: same surface, any event */}
          <div className="picker">
            {ROSTER.map(e => (
              <button key={e.id} className="chip" aria-pressed={e.id === eventId} onClick={() => switchEvent(e.id)}>
                {e.type}
              </button>
            ))}
            {Object.keys(patch).length > 0 && (
              <button className="chip reset" onClick={() => { setPatch({}); toast('Your changes to this event were cleared.'); }}>Reset changes</button>
            )}
          </div>

          {plan._error && <div className="engine-error">Engine error: {plan._error}</div>}

          {/* ── Hero: time is the thing a host feels ── */}
          <div className="eyebrow">{event.name}{event.venue ? ' · ' + event.venue : ''}</div>
          <div className="mega">
            {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${-days}d ago` : `${days} days`}
          </div>
          <p className="mega-sub">
            {days !== null && days > 0 && `until ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            {days !== null && days < 0 && 'this one is behind you.'}
            {days === 0 && 'it all happens today.'}
          </p>

          {/* ── Bento: real numbers or honest absence ── */}
          <div className="bento">
            <div className="tile tile-a">
              <div className="t-label">The basics</div>
              <div>
                <div className="t-num">{pct === null ? '—' : pct + '%'}</div>
                <div className="bar"><i style={{ width: (pct || 0) + '%' }} /></div>
                <div className="t-sub">
                  {plan.progress.total
                    ? `${plan.progress.done} of ${plan.progress.total} foundations settled — date, guests, budget, food.`
                    : 'No foundation data for this event.'}
                </div>
              </div>
            </div>
            <div className="tile tile-b">
              <div className="t-label">Guests</div>
              <div>
                <div className="t-num">{guests || '—'}</div>
                <div className="t-sub">{guests ? 'planned around' : 'no count yet — the plan can’t size food or seats'}</div>
              </div>
            </div>
            <div className="tile tile-c">
              <div className="t-label">Budget</div>
              <div>
                <div className="t-num">{money.planned ? fmt(money.planned) : '—'}</div>
                <div className="t-sub">
                  {money.planned
                    ? `${fmt(money.committed)} committed across ${money.lines} lines`
                    : 'no budget lines yet'}
                </div>
              </div>
            </div>
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

          {/* ── Lenses (only the domains the engine actually surfaced) ── */}
          {lensSet.length > 1 && (
            <div className="lenses">
              <button className="lens" aria-pressed={lens === 'all'} onClick={() => setLens('all')}>Everything</button>
              {lensSet.map(l => (
                <button key={l} className="lens" aria-pressed={lens === l} onClick={() => setLens(l)}>{l}</button>
              ))}
            </div>
          )}

          {/* ── Next actions: straight from eventPlan(), engine order preserved ── */}
          <div className="sect" id="actionsAnchor"><h2>What needs you</h2><div className="rule" /><span className="when">engine-ranked</span></div>

          {actions.length === 0 && (
            <div className="empty">The orchestrator has no open actions for this event — every foundation it tracks is settled.</div>
          )}

          {top.filter(show).map((a, i) => (
            <article className="card" key={a.id || i}>
              <span className="idx">{i + 1}</span>
              <div className="card-head">
                <div className="card-top">
                  <span className={'tag ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>
                </div>
                <h3>{a.title}</h3>
                {a.consequence && <p className="because">{a.consequence}</p>}
                <div className="actions-row">
                  {a.cta && <button className="cta" onClick={() => onCta(a)}>{a.cta}</button>}
                  {a.domain === 'guests' && (
                    <button className="cta soft" onClick={() => setHcOpen(o => !o)}>Set a count here</button>
                  )}
                </div>
                {a.domain === 'guests' && hcOpen && (
                  <div className="chips hc-row">
                    {[30, 50, 60, 75, 90, 120].map(n => (
                      <button key={n} className="chip" aria-pressed={guests === n} onClick={() => setGuests(n)}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}

          {rest.filter(show).length > 0 && (
            <>
              <div className="sect"><h2>Then</h2><div className="rule" /><span className="when">{rest.filter(show).length} more</span></div>
              {rest.filter(show).map((a, i) => (
                <div className="later-row" key={a.id || i}>
                  <span className={'tag ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>
                  <span className="t">{a.title}</span>
                  {a.cta && <button className="mini" onClick={() => onCta(a)}>{a.cta}</button>}
                </div>
              ))}
            </>
          )}

          {/* ── Already handled: the engine's own facts, foldable ── */}
          {handled.length > 0 && (
            <>
              <button className="fold-btn" onClick={() => setHandledOpen(o => !o)}>
                Already handled — {handled.length} {handled.length === 1 ? 'thing' : 'things'}
                <span className="chev">{handledOpen ? '▴' : '▾'}</span>
              </button>
              {handledOpen && handled.map((h, i) => (
                <div className="later-row done" key={i}><span className="t">{h}</span></div>
              ))}
            </>
          )}

          {/* ── Vendors rollup: the engine's single-source readiness sentence ── */}
          {rollup && rollup.counts && rollup.counts.total > 0 && (
            <div className="day-node">
              <div className="eyebrow">People you’re hiring · {rollup.counts.ready} of {rollup.counts.total} ready</div>
              <h3>{rollup.label}</h3>
              {rollup.nextAction && <p>{rollup.nextAction}</p>}
              {rollup.ctaLabel && (
                <button className="cta" onClick={() => toast('In the app this opens: ' + (describeRoute(rollup.target) || 'Vendors'))}>
                  {rollup.ctaLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="dock" aria-label="Sections">
        <button aria-current="true">Plan</button>
        <button onClick={() => toast('Not wired in this prototype yet — Plan is the wired surface.')}>The Day</button>
        <button onClick={() => toast('Not wired in this prototype yet — Plan is the wired surface.')}>After</button>
      </nav>

      {toastMsg && <div className="toast on">{toastMsg}</div>}
    </div>
  );
}
