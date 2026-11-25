// hostv4, step 1: the shell (owner, 11/25/2026: "create a separate host shell,
// host v4 … to start the working demo for the new design").
//
// Three tabs (UX_12 §2): Next step, Your plan, The Day. It reads the plans
// hostv2 saved on this device and asks the SAME shared code what comes next, so
// the two shells never disagree. Where v4 cannot act yet, it says so and opens
// the plan in the current app; it never pretends.
import { useMemo, useState } from 'react';
import { readCustomEvents } from '@app/lib/customEventStore';
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
      return { ask: heroAskFor(a, ev) || a.title, title: a.title };
    } catch { return null; }
  }, [ev]);
}

function usePlanRows(ev) {
  return useMemo(() => {
    try { const p = deriveEventPhaseProgress(ev); return { items: (p.items || []).filter((i) => i.cueLabel), cue: p.cue || null }; } catch { return { items: [], cue: null }; }
  }, [ev]);
}

const Icon = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const TABS = [
  ['next', 'Next step', <><circle cx="12" cy="12" r="8.5" /><path d="M10.5 8.5L14 12l-3.5 3.5" /></>],
  ['plan', 'Your plan', <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />],
  ['day', 'The Day', <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" /></>],
];

export default function HostShellV4() {
  const [{ ev, sample }] = useState(pickEvent);
  const [tab, setTab] = useState('next');
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
  const openInCurrent = <a className="primary" href="../hostv2/">Open it in the current app</a>;

  return (
    <div className="app">
      <main className="view" data-tab={tab}>
        <h1 className="lt">{tab === 'plan' ? 'Your plan' : tab === 'day' ? 'The Day' : ev.name}</h1>
        <p className="sub">{tab === 'plan' ? ev.name + (date ? ' · ' + date : '') : date}{holiday && tab !== 'plan' ? ' · ' + holiday : ''}</p>
        {sample && <p className="fine" data-sample>A sample plan. Plans you make in the current app open here.</p>}

        {tab === 'next' && (
          <section data-next>
            {next ? <h2 className="q">{next.ask}</h2> : <h2 className="q">You’re set for now.</h2>}
            <p className="qhelp">This new design shows one step at a time. Doing it here comes next; for now it opens in the current app.</p>
          </section>
        )}

        {tab === 'plan' && (
          <section className="grp" data-plan>
            {rows.map((r, i) => (
              <div className="row" key={r.id}>
                <span>{r.cueLabel}</span>
                <span className={'val' + (r.handled ? ' ok' : i === firstOpen ? ' next' : '')}>{r.handled ? 'Done' : i === firstOpen ? 'Next' : 'Later'}</span>
              </div>
            ))}
          </section>
        )}

        {tab === 'day' && <p className="qhelp" data-day>The Day’s timeline comes after Guests in the new design. Until then it’s in the current app.</p>}
      </main>

      {tab === 'next' && !sample && <div className="action">{openInCurrent}</div>}

      <nav className="tabbar" role="tablist">
        {TABS.map(([id, label, d]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon d={d} />{label}</button>
        ))}
      </nav>
    </div>
  );
}
