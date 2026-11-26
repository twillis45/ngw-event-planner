// hostv4, step 1: the shell (owner, 11/25/2026: "create a separate host shell,
// host v4 … to start the working demo for the new design").
//
// Three tabs (UX_12 §2): Next step, Your plan, The Day. It reads the plans
// hostv2 saved on this device and asks the SAME shared code what comes next, so
// the two shells never disagree. Where v4 cannot act yet, it says so and opens
// the plan in the current app; it never pretends.
import { useEffect, useMemo, useState } from 'react';
import GuestsPage from './GuestsPage.jsx';
import Sidebar from './Sidebar.jsx';
import { useLayout } from './layout.js';
import InvitePage from './InvitePage.jsx';
import InviteDesignPage from './InviteDesignPage.jsx';

// Pushed pages, by id: their title and the name of the link back to them.
const PAGE_TITLE = { guests: 'Guests', updates: 'Updates and questions', invite: 'Your invite', 'invite-design': 'Design this page' };
import UpdatesPage from './UpdatesPage.jsx';
import { readCustomEvents, patchSavedEvent } from '@app/lib/customEventStore';
import { sourcedBudget } from '@app/lib/playbooks';
import { saveEvent as cloudSaveEvent } from '@app/lib/api/events';
import { recordSaveResult, getLastSyncTime } from '@app/lib/api/syncState';
import { eventPlan } from '@app/CommandCenter';
import { heroAskFor } from '@app/lib/heroAsk';
import { deriveEventPhaseProgress } from '@app/lib/phaseProgress';
import { holidayOn } from '@app/lib/holidayDates.mjs';

const LAST_EVENT_KEY = 'ngw-hostv2-last-event';

// A made-up plan, shown only when this device has none, and never saved.
const SAMPLE = { id: 'v4-sample', name: 'Rosa’s 40th Birthday', type: 'Birthday', date: '2027-01-04', guestEstimate: 25, guests: [], vendors: [], budget: [], timeline: [] };

function pickEvent() {
  let events = [];
  try { events = readCustomEvents(); } catch { events = []; }
  let last = null;
  try { last = window.localStorage.getItem(LAST_EVENT_KEY); } catch { last = null; }
  const ev = events.find((e) => e.id === last) || events[0] || null;
  return ev ? { ev, sample: false } : { ev: SAMPLE, sample: true };
}

const longDate = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

function useNext(ev) {
  return useMemo(() => {
    try {
      const a = (eventPlan(ev).nextActions || [])[0];
      if (!a) return null;
      const dom = String(a.domain || '').toLowerCase();
      const budget = dom === 'budget' || /^set your budget/i.test(String(a.title || '').trim());
      // A Guests ask opens the Guests page, which v4 can do (step 1, 11/25/2026).
      const guests = dom === 'guests' || dom === 'start' || (a.route && a.route.tab === 'Guests');
      return { ask: heroAskFor(a, ev) || a.title, title: a.title, budget, guests: !budget && guests };
    } catch { return null; }
  }, [ev]);
}

function usePlanRows(ev) {
  return useMemo(() => {
    try { const p = deriveEventPhaseProgress(ev); return { items: (p.items || []).filter((i) => i.cueLabel), cue: p.cue || null }; } catch { return { items: [], cue: null }; }
  }, [ev]);
}

const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const TIER = { essentials: 'Just the essentials', extras: 'With extras', everything: 'Everything' };
const shortDay = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'date unknown'; };

// THE BUDGET QUESTION (owner, 11/25/2026: "Build from cited"). Every figure is
// sourcedBudget's: cited shopping prices only, each choice adding to the one
// before. How they were built is one tap down, never on the question screen.
function BudgetChoices({ sb, pick, setPick }) {
  return (
    <div className="grp" role="radiogroup" aria-label="Budget">
      {sb.steps.map((t) => (
        <button key={t.key} className="row choice" role="radio" aria-checked={pick === t.mid} onClick={() => setPick(t.mid)}>
          <span className="radio" aria-hidden="true" />
          <span>{TIER[t.key]}</span>
          <span className="val">about {money(t.mid)}</span>
        </button>
      ))}
    </div>
  );
}

function HowWeGotThese({ sb, type, onDone }) {
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label="How we got these" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>How we got these</h2><button className="link" onClick={onDone}>Done</button></div>
        <p className="fine">From our {String(type || 'party').toLowerCase()} shopping list for {sb.guests} guests. Every price has a published source; each choice adds to the one before.</p>
        {sb.steps.map((t) => (
          <section key={t.key}>
            <div className="sh"><h3>{TIER[t.key]}</h3><span>{money(t.low)}–{money(t.high)}</span></div>
            <div className="grp">
              {t.adds.map((l) => (
                <div className="row" key={l.id}>
                  <span className="nm">{l.item}<small>{l.sources.length} {l.sources.length === 1 ? 'source' : 'sources'} · checked {shortDay(l.lastVerified)}</small></span>
                  <span className="val">{money(l.low)}–{money(l.high)}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
        {sb.stale.length > 0 && <p className="fine warn" data-stale>{sb.stale.length === 1 ? 'One price was' : sb.stale.length + ' prices were'} last checked more than four weeks ago.</p>}
        {sb.leftOut.length > 0 && <p className="fine">Left out, no published price yet: {sb.leftOut.map((l) => l.item).join(', ')}.</p>}
        <p className="fine">Only the shopping list. Not included: anyone you hire, a venue, gifts or tips.</p>
      </div>
    </div>
  );
}

const Icon = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const TABS = [
  ['next', 'Next step', <><circle cx="12" cy="12" r="8.5" /><path d="M10.5 8.5L14 12l-3.5 3.5" /></>],
  ['plan', 'Your plan', <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />],
  ['day', 'The Day', <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" /></>],
];

export default function HostShellV4() {
  const [{ ev, sample }, setPicked] = useState(pickEvent);
  const [tab, setTab] = useState('next');
  const [pick, setPick] = useState(null);
  const [why, setWhy] = useState(false);
  const [done, setDone] = useState(null); // { msg, undo } — one quiet line, with Undo
  const [failed, setFailed] = useState(null);
  const [stack, setStack] = useState([]); // pages pushed over the tab: 'guests', then 'invite'
  const layout = useLayout();
  const [sideOpen, setSideOpen] = useState(false);
  const page = stack[stack.length - 1] || null;
  // Every pushed page is a history entry, so browser back (and Safari's edge
  // swipe) equals app back (UX_12 §7a.7).
  useEffect(() => {
    const onPop = () => setStack((st) => st.slice(0, -1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const push = (pg) => { try { window.history.pushState({ v4: pg }, ''); } catch { /* the page still opens */ } setDone(null); setStack((st) => [...st, pg]); };
  const back = () => { try { window.history.back(); } catch { setStack((st) => st.slice(0, -1)); } };
  const next = useNext(ev);
  const { items: rows, cue } = usePlanRows(ev);
  const date = longDate(ev.date);
  const holiday = holidayOn(ev.date);
  // ONE "NEXT" (11/25/2026): Your plan marks the row Next step is asking about.
  // The plan list has its own pick (its cue), which can name a different row;
  // two "next"s on two tabs is exactly the confusion v4 exists to remove. The
  // list's own pick is used only when no row matches the ask.
  const askRow = next ? rows.findIndex((r) => !r.handled && r.cueLabel === String(next.ask).replace(/\.$/, '')) : -1;
  const firstOpen = askRow >= 0 ? askRow : rows.findIndex((r) => cue && r.id === cue.id);
  // The sample is not in the current app, so its button opens the app, not "it".
  const openInCurrent = <a className="primary" href="../hostv2/">{sample ? 'Open the current app' : 'Open it in the current app'}</a>;
  const sb = useMemo(() => (next && next.budget ? sourcedBudget(ev) : null), [ev, next]);
  const tierPick = sb ? (pick != null ? pick : (sb.steps[1] || sb.steps[0]).mid) : null;

  // SAVE: one edit to one saved event, through the function hostv2 saves with
  // (patchSavedEvent). A plan already in an account also goes to the account,
  // the same rule hostv2 applies (its sync record); cloudSaveEvent queues when
  // it cannot write yet. The sample plan is never saved.
  const save = (obj, msg, prev) => {
    setFailed(null);
    if (sample) { setPicked({ ev: { ...ev, ...obj }, sample: true }); setDone({ msg: msg + ' Sample plan, not saved.', prev }); setPick(null); return true; }
    const res = patchSavedEvent(ev.id, obj, { reason: 'hostv4:patch-event' });
    if (!res.ok) { setFailed('That didn’t save on this phone. Your last saved version is still here.'); return false; }
    setPicked({ ev: res.saved, sample: false });
    // A save with no line (a field saved as she types) shows nothing.
    setDone(msg ? (prev ? { msg, prev } : { msg }) : null);
    setPick(null);
    if (getLastSyncTime(res.saved.id)) {
      cloudSaveEvent(res.saved).then((r) => {
        try { recordSaveResult(res.saved, r); } catch { /* stamping is best-effort */ }
        if (r && r.ok && r.updatedAt) {
          const st = patchSavedEvent(res.saved.id, { _cloudUpdatedAt: r.updatedAt }, { reason: 'hostv4:cloud-stamp' });
          if (st.ok) setPicked({ ev: st.saved, sample: false });
        } else if (r && r.reason === 'conflict') {
          setFailed('Saved on this phone. Your plan changed on another device, so open the current app to choose which to keep.');
        }
      }).catch(() => {});
    }
    return true;
  };
  // A shared edit ({ patch, msg } from lib/guestEdits), undoable: Undo puts back
  // exactly the fields it changed.
  const saveEdit = (ed) => {
    if (!ed) return false;
    // Nothing to save (a download): the line alone, with no Undo.
    if (!Object.keys(ed.patch).length) { if (ed.msg) setDone({ msg: ed.msg }); return true; }
    const prev = {}; for (const k of Object.keys(ed.patch)) prev[k] = ev[k] === undefined ? null : ev[k];
    return save(ed.patch, ed.msg, prev);
  };
  const setBudget = (n) => save({ totalBudget: n }, 'Budget set to ' + money(n) + '.', { totalBudget: ev.totalBudget === undefined ? '' : ev.totalBudget });
  const undo = () => { const d = done; setDone(null); if (d && d.prev) save(d.prev, 'Undone.'); };

  const status = (<>
    {done && <p className="done" role="status" data-done>{done.msg}{done.prev && <> <button className="link" onClick={undo}>Undo</button></>}</p>}
    {failed && <p className="fine warn" role="alert">{failed}</p>}
  </>);
  const tabbar = (
    <nav className="tabbar" role="tablist">
      {TABS.map(([id, label, d]) => (
        <button key={id} role="tab" aria-selected={!page && tab === id} onClick={() => { if (stack.length) { try { window.history.go(-stack.length); } catch { /* falls through */ } setStack([]); } setTab(id); }}><Icon d={d} />{label}</button>
      ))}
    </nav>
  );

  // TABLETS (UX_13): the sidebar replaces the tab bar; every view sits beside it
  // (split) or under it (compact, behind a menu button). The phone is unchanged.
  const goTab = (id) => { if (stack.length) { try { window.history.go(-stack.length); } catch { /* falls through */ } setStack([]); } setTab(id); };
  const goGuests = () => { if (page !== 'guests') { if (stack.length) { try { window.history.go(-stack.length); } catch { /* falls through */ } setStack([]); } push('guests'); } };
  const frame = (content) => (layout === 'phone' ? content : (
    <div className={'tablet ' + layout + (sideOpen ? ' sideopen' : '')} data-layout={layout}>
      <Sidebar ev={ev} date={date} tabs={TABS.map(([id, label, d]) => [id, label, <Icon d={d} />])} here={page === 'guests' || stack.includes('guests') ? 'guests' : page ? null : tab}
        onTab={goTab} onGuests={goGuests} onClose={() => setSideOpen(false)} hidden={layout === 'compact' && !sideOpen} />
      {layout === 'compact' && <div className="sidescrim" onClick={() => setSideOpen(false)} />}
      {layout === 'compact' && !page && <button className="menubtn" aria-label="Show places" onClick={() => setSideOpen(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>}
      {content}
    </div>
  ));

  if (page) {
    // The link back names the page it goes to (one table names both).
    const from = stack.length > 1 ? PAGE_TITLE[stack[stack.length - 2]] : tab === 'plan' ? 'Your plan' : 'Next step';
    const navbar = (title, acts) => (<>
      <div className="navbar"><button className="backbtn" onClick={back} aria-label={'Back to ' + from}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{from}</button></div>
      {acts ? <div className="ltrow"><h1 className="lt">{title}</h1>{acts}</div> : <h1 className="lt">{title}</h1>}
    </>);
    return frame(
      <div className="app pushed" key={page}>
        {page === 'guests' && <GuestsPage key={ev.id} ev={ev} save={saveEdit} sample={sample} nav={(acts) => navbar(PAGE_TITLE.guests, acts)} status={status} onInvite={() => push('invite')} onUpdates={() => push('updates')} layout={layout} />}
        {page === 'updates' && <UpdatesPage key={ev.id} ev={ev} nav={navbar(PAGE_TITLE.updates)} status={status} />}
        {page === 'invite' && <InvitePage key={ev.id} ev={ev} save={saveEdit} nav={navbar(PAGE_TITLE.invite)} status={status} onDesign={() => push('invite-design')} />}
        {page === 'invite-design' && <InviteDesignPage key={ev.id} ev={ev} save={saveEdit} nav={navbar(PAGE_TITLE['invite-design'])} status={status} />}
        {tabbar}
      </div>
    );
  }

  return frame(
    <div className="app">
      <main className="view" data-tab={tab}>
        <h1 className="lt">{tab === 'plan' ? 'Your plan' : tab === 'day' ? 'The Day' : ev.name}</h1>
        <p className="sub">{sample && tab !== 'plan' ? 'Sample · ' : ''}{tab === 'plan' ? ev.name + (date ? ' · ' + date : '') : date}{holiday && tab !== 'plan' ? ' · ' + holiday : ''}</p>
        {/* The sentence lives on Your plan, so a question screen stays inside its word budget. */}
        {sample && tab === 'plan' && <p className="fine" data-sample>A sample plan. Plans you make in the current app open here.</p>}

        {tab === 'next' && status}
        {tab === 'next' && sb && (
          <section data-next data-budget>
            <h2 className="q">How much do you want to spend?</h2>
            <BudgetChoices sb={sb} pick={tierPick} setPick={setPick} />
            <p className="fine"><button className="link" onClick={() => setWhy(true)}>How we got these</button></p>
          </section>
        )}
        {tab === 'next' && !sb && (
          <section data-next>
            {next ? <h2 className="q">{next.ask}</h2> : <h2 className="q">You’re set for now.</h2>}
            {next && !next.guests && <p className="qhelp">This new design shows one step at a time. Doing it here comes next; for now it opens in the current app.</p>}
          </section>
        )}

        {tab === 'plan' && (
          <section className="grp" data-plan>
            {rows.map((r, i) => {
              const val = <span className={'val' + (r.handled ? ' ok' : i === firstOpen ? ' next' : '')}>{r.handled ? 'Done' : i === firstOpen ? 'Next' : 'Later'}</span>;
              // A Guests row opens the Guests page; the rest stay in the current app for now.
              return r.route && r.route.tab === 'Guests'
                ? <button className="row go" key={r.id} data-plan-row="guests" onClick={() => push('guests')}><span>{r.cueLabel}</span>{val}</button>
                : <div className="row" key={r.id}><span>{r.cueLabel}</span>{val}</div>;
            })}
          </section>
        )}

        {tab === 'day' && <p className="qhelp" data-day>The Day’s timeline comes after Guests in the new design. Until then it’s in the current app.</p>}
      </main>

      {tab === 'next' && sb && <div className="action"><button className="primary" onClick={() => setBudget(tierPick)}>Plan with {money(tierPick)}</button></div>}
      {/* Never a dead end (live check, 11/25/2026): the sample said "opens in the current app" with nothing to tap. */}
      {tab === 'next' && !sb && next && next.guests && <div className="action"><button className="primary" onClick={() => push('guests')}>Open Guests</button></div>}
      {tab === 'next' && !sb && next && !next.guests && <div className="action">{openInCurrent}</div>}
      {why && sb && <HowWeGotThese sb={sb} type={ev.type} onDone={() => setWhy(false)} />}

      {tabbar}
    </div>
  );
}
