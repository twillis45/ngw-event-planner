// Host Shell V2 — WIRED PROTOTYPE (separate app, real engines).
// UI is the expressive-editorial concept; every number and card below comes from
// the production engines: eventPlan() (CommandCenter.jsx), identityStatement()
// (lib/eventIdentity), real sample events, real budget + run-of-show data.
// Nothing invented — where data is missing, the UI says so.
import { useMemo, useState, useEffect, useRef } from 'react';
import { eventPlan } from '@app/CommandCenter';
import { identityStatement } from '@app/lib/eventIdentity';
import { daysUntil, eventDateStatus, rsvpDeadlineFor } from '@app/lib/dates';
import { isPastEvent } from '@app/lib/closeoutIntel';
import { hostSpending } from '@app/lib/hostSpending';
import { expectedFromPlanned } from '@app/lib/attendanceModel';
import { EVENT_TAXONOMY } from '@app/lib/eventTaxonomy.mjs';
import { estimateTotalRange } from '@app/lib/budgetEstimator';
import { SAMPLE_EVENTS_EXTRA } from '@app/data/sampleEventsExtra';
import { SAMPLE_EVENTS_DMV } from '@app/data/sampleEventsDMV';

const ROSTER_IDS = ['ev-x-retirement-party', 'ev-x-birthday', 'ev-x-graduation', 'ev-dmv-wedding'];
const ALL_SAMPLES = [...SAMPLE_EVENTS_EXTRA, ...SAMPLE_EVENTS_DMV];
const ROSTER = ROSTER_IDS.map(id => ALL_SAMPLES.find(e => e.id === id)).filter(Boolean);
const FALLBACK = ROSTER[0] || ALL_SAMPLES[0];

const LS_PATCH = id => 'ngw-hostv2-patch-' + id;
const LS_CUSTOM = 'ngw-hostv2-custom-event';

const fmt = n => '$' + Math.round(n).toLocaleString('en-US');

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

// Occasion choices come from the REAL taxonomy: every host-driven family type.
const HOST_TYPES = Object.entries(EVENT_TAXONOMY)
  .filter(([, v]) => v && v.family === 'host_driven')
  .map(([k]) => k)
  .slice(0, 9);

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

  // Create-stage intelligence, all real: date validity (lib/dates), likely
  // turnout (lib/attendanceModel), and budget options from the REAL estimator.
  const dstatC = eventDateStatus(fDate);
  const expectC = expectedFromPlanned(fGuests, fType);
  const estC = estimateTotalRange({ type: fType, guestCount: fGuests, date: fDate });
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
  const [sheet, setSheet] = useState(null);   // deep-link landing: {kind, focus}
  const [dayIdx, setDayIdx] = useState(0);    // The Day: position in the run of show

  // Row-level landings inside the prototype — a route with a real destination
  // here opens the sheet on the exact row, instead of toasting.
  const routeSheet = (route) => {
    if (!route || !route.tab) return false;
    if (route.tab === 'Vendors') { setSheet({ kind: 'vendors', focus: route.vendorId || null }); return true; }
    if (route.tab === 'Budget') { setSheet({ kind: 'budget', focus: null }); return true; }
    if (route.tab === 'Guests') { setSheet({ kind: 'guests', focus: null }); return true; }
    return false;
  };

  // Flip one RSVP — writes the same guests array the engine's confirmed-count
  // (and the catering-drift detector) read.
  const toggleRsvp = (i) => {
    const gs = (event.guests || []).map((g, ix) => ix === i ? { ...g, rsvp: g.rsvp === 'Yes' ? 'No' : 'Yes' } : g);
    const yes = gs.filter(g => g && g.rsvp === 'Yes').length;
    patchEvent({ guests: gs }, (gs[i].name || 'Guest') + ' flipped to ' + (gs[i].rsvp === 'Yes' ? 'yes' : 'no') + ' — ' + yes + ' confirmed now. The engine reads this.');
  };

  const patchEvent = (obj, msg) => {
    if (eventId === 'custom') setCustom(c => ({ ...c, ...obj }));
    else setPatch(p => ({ ...p, ...obj }));
    if (msg) toast(msg);
  };

  // Which engine actions have a real in-place edit here. Everything else stays an
  // honest route toast — never a button that pretends.
  const wiredKind = (a) => {
    if (['date', 'guests', 'budget', 'food'].includes(a.domain)) return a.domain;
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
      </div>
    );
    if (kind === 'budget') return (
      <div className="chips hc-row">
        {[2000, 3500, 5000, 8000].map(n => (
          <button key={n} className="chip" aria-pressed={money.planned === n}
            onClick={() => patchEvent(
              { budget: [{ id: 'v2-b1', category: 'Everything', budgeted: n, actual: 0, notes: 'Set in Host V2' }] },
              'Budget set at ' + fmt(n) + ' — the plan just recomputed.')}>{fmt(n)}</button>
        ))}
      </div>
    );
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

  // ── Create: build a REAL event object and hand it to the engine ──
  const assemble = () => {
    const ev = {
      id: 'custom', rsvpCode: 'mine',
      name: (fName || 'My') + '’s ' + fType.replace(' Party', ''),
      honoree: fName || '',
      type: fType, date: fDate, venue: '',
      guestEstimate: fGuests || '',
      budget: fBudget ? [{ id: 'custom-b1', category: 'Everything', budgeted: fBudget, actual: 0, notes: 'Set at creation' }] : [],
      guests: [], vendors: [], timeline: [],
    };
    setCustom(ev); setEventId('custom'); setRevealed(true);
  };
  const customPlan = useMemo(() => {
    if (!revealed || !custom) return null;
    try { return eventPlan(custom, null); } catch { return null; }
  }, [revealed, custom]);

  const ros = Array.isArray(event.ros) ? event.ros : [];
  const isPast = isPastEvent(event);                      // lib/closeoutIntel — tense authority
  const budgetLines = Array.isArray(event.budget) ? event.budget : [];

  return (
    <div className="stagewrap">
      <div className={'app' + (stage === 'day' ? ' dark-stage' : '')} id="app" ref={appRef}>
        <div className="content">
          <div className="appbar">
            <div className="wordmark">Event Boss</div>
            <div className="appbar-note">V2 · engine + doctrine wired</div>
          </div>

          {/* ══════════ CREATE ══════════ */}
          {stage === 'create' && (
            <section>
              {!revealed ? (
                <>
                  <div className="eyebrow">New event</div>
                  <h1 className="mega" style={{ fontSize: 'clamp(30px,10cqw,40px)', lineHeight: 1.05 }}>What are we planning?</h1>
                  <p className="mega-sub" style={{ fontSize: 15, fontWeight: 550, color: 'var(--muted)' }}>
                    Four answers — then the real engine builds the plan.
                  </p>
                  <div className="q"><div className="q-label">Who’s it for?</div>
                    <input className="field" value={fName} onChange={e => setFName(e.target.value)} aria-label="Who is it for" />
                  </div>
                  <div className="q"><div className="q-label">The occasion</div>
                    {/* Choices = the real taxonomy's host-driven family */}
                    <div className="chips">{HOST_TYPES.map(t => (
                      <button key={t} className="chip" aria-pressed={fType === t} onClick={() => { setFType(t); setFBudget(null); }}>{t.replace(' Party', '')}</button>
                    ))}</div>
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
                    {/* Options come from the REAL budget estimator for this type + count + date */}
                    <div className="chips">
                      {budgetOpts.map(n => (
                        <button key={n} className="chip" aria-pressed={fBudget === n} onClick={() => setFBudget(n)}>{fmt(n)}</button>
                      ))}
                      <button className="chip" aria-pressed={fBudget === null} onClick={() => setFBudget(null)}>Not sure yet</button>
                    </div>
                    {estC
                      ? <p className="grounding">Typical for {fGuests} at a {fType.toLowerCase()}: {fmt(estC.lowTotal)}–{fmt(estC.highTotal)} — the estimator’s real range.</p>
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
                  <div className="eyebrow">Here’s what we understood</div>
                  <h1 className="mega" style={{ fontSize: 'clamp(27px,8.5cqw,34px)', lineHeight: 1.1 }}>{custom?.name}</h1>
                  {/* identityStatement() — the production identity engine, verbatim */}
                  <p className="mega-sub" style={{ fontSize: 17, marginTop: 10 }}>{identityStatement(custom)}</p>
                  {customPlan && (
                    <ul className="tick-list">
                      <li><strong>{customPlan.progress.done} of {customPlan.progress.total} foundations</strong> already settled from your four answers.</li>
                      {customPlan.nextActions[0] && (
                        <li>The engine’s first move: <strong>{customPlan.nextActions[0].title}</strong>{customPlan.nextActions[0].consequence ? ' — ' + customPlan.nextActions[0].consequence : ''}</li>
                      )}
                      <li><strong>{customPlan.nextActions.length} step{customPlan.nextActions.length === 1 ? '' : 's'}</strong> waiting in the plan, ranked by the same orchestrator the app runs.</li>
                    </ul>
                  )}
                  <p className="grounding">Every line above came from the production engine reading your answers. Nothing scripted.</p>
                  <div className="actions-row" style={{ marginTop: 24 }}>
                    <button className="cta big" onClick={() => setStage('plan')}>Open your plan</button>
                    <button className="cta soft" style={{ padding: '13px 22px', borderRadius: 13 }} onClick={() => setRevealed(false)}>Change an answer</button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ══════════ PLAN ══════════ */}
          {stage === 'plan' && (
            <section>
              <div className="picker">
                {ROSTER.map(e => (
                  <button key={e.id} className="chip" aria-pressed={e.id === eventId} onClick={() => switchEvent(e.id)}>{e.type}</button>
                ))}
                {custom && <button className="chip" aria-pressed={eventId === 'custom'} onClick={() => switchEvent('custom')}>Yours</button>}
                {eventId !== 'custom' && Object.keys(patch).length > 0 && (
                  <button className="chip reset" onClick={() => { setPatch({}); toast('Your changes to this event were cleared.'); }}>Reset changes</button>
                )}
              </div>

              {plan._error && <div className="engine-error">Engine error: {plan._error}</div>}

              <div className="eyebrow">{event.name}{event.venue ? ' · ' + event.venue : ''}</div>
              <div className="mega">
                {days === null ? 'No date' : days === 0 ? 'Today' : days < 0 ? `${-days}d ago` : `${days} days`}
              </div>
              <p className="mega-sub">
                {isPast && 'this one is behind you.'}
                {!isPast && (dstat.status === 'today' || dstat.status === 'tomorrow') && dstat.reason}
                {!isPast && days !== null && days > 1 && `until ${new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              </p>

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
                    <div className="t-sub">{guests
                      ? (expect ? `planned around · likely ${expect.low}–${expect.high} on the day` : 'planned around')
                      : 'no count yet — the plan can’t size food or seats'}</div>
                  </div>
                </div>
                <div className="tile tile-c">
                  <div className="t-label">Budget</div>
                  <div>
                    <div className="t-num">{money.planned ? fmt(money.planned) : '—'}</div>
                    <div className="t-sub">{money.planned ? `${fmt(money.committed)} committed · ${fmt(money.spent)} spent` : 'no budget lines yet'}</div>
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

              {lensSet.length > 1 && (
                <div className="lenses">
                  <button className="lens" aria-pressed={lens === 'all'} onClick={() => setLens('all')}>Everything</button>
                  {lensSet.map(l => (
                    <button key={l} className="lens" aria-pressed={lens === l} onClick={() => setLens(l)}>{l}</button>
                  ))}
                </div>
              )}

              <div className="sect" id="actionsAnchor"><h2>What needs you</h2><div className="rule" /><span className="when">engine-ranked</span></div>

              {actions.length === 0 && (
                <div className="empty">The orchestrator has no open actions for this event — every foundation it tracks is settled.</div>
              )}

              {actions.filter(show).map((a, i) => {
                const key = String(a.id || i);
                const wired = wiredKind(a);
                const lands = wired || (a.route && ['Vendors', 'Budget', 'Guests'].includes(a.route.tab));
                return (
                  <article className="card" key={key}>
                    <span className="idx">{i + 1}</span>
                    <div className="card-head">
                      <div className="card-top">
                        <span className={'tag ' + (DOMAIN_LENS[a.domain] || 'Plan').toLowerCase()}>{DOMAIN_LENS[a.domain] || 'Plan'}</span>
                        {!lands && <span className="tag plan">route only</span>}
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
                    <button className="cta" style={{ marginTop: 6 }} onClick={() => setDayIdx(i => i + 1)}>
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
                {guests ? `${guests} guests planned` : 'No guest count'} · {handled.length} foundation fact{handled.length === 1 ? '' : 's'} on record · every budget line above stays saved. In the app, closeout also drafts thank-yous and keeps “for next time” notes in event memory — those engines live in the main app and aren’t wired here yet.
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
              <strong>{sheet.kind === 'vendors' ? 'People you’re hiring' : sheet.kind === 'budget' ? 'Budget lines' : 'Guest list'}</strong>
              <button className="sheet-x" onClick={() => setSheet(null)}>Close</button>
            </div>
            {sheet.kind === 'vendors' && (
              (event.vendors || []).length ? (event.vendors || []).map(v => (
                <div key={v.id} className={'vrow' + (sheet.focus === v.id ? ' focus' : '')}
                  ref={el => { if (el && sheet.focus === v.id) el.scrollIntoView({ block: 'center' }); }}>
                  <div>
                    <div className="v-name">{v.name || 'Unnamed'}</div>
                    <div className="v-meta">{[v.category, v.status].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className="tag vendors">{v.status || '—'}</span>
                </div>
              )) : <div className="v-meta" style={{ padding: '14px 2px' }}>No vendors on this event yet.</div>
            )}
            {sheet.kind === 'budget' && (
              budgetLines.length ? (
                <>
                  {budgetLines.map(l => (
                    <div className="line" key={l.id}><span>{l.category}</span><span className="amt">{fmt(Number(l.actual) || 0)} <span className="of">of {fmt(Number(l.budgeted) || 0)}</span></span></div>
                  ))}
                  <div className="line total"><span>Committed so far</span><span className="amt">{fmt(money.committed)} of {fmt(money.planned)}</span></div>
                </>
              ) : <div className="v-meta" style={{ padding: '14px 2px' }}>No budget lines yet.</div>
            )}
            {sheet.kind === 'guests' && (
              (event.guests || []).length ? (
                <>
                  <div className="v-meta" style={{ padding: '2px 2px 12px' }}>
                    {(event.guests || []).filter(g => g && g.rsvp === 'Yes').length} yes of {(event.guests || []).length}
                    {rsvpBy && rsvpBy.iso && !isPast ? ` · replies by ${new Date(rsvpBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    {' — tap a name to flip their RSVP. The engine reads this list.'}
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
