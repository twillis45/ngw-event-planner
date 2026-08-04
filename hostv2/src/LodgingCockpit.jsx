// ─── WHERE EVERYONE STAYS — THE COCKPIT (reimagine, 2026-08-03) ────────────
//
// Host, after reading the live panel end to end: "not very readable... we need
// way more than folding."
//
// The live sheet is FIVE surfaces wearing one scroll — a search launcher, an
// intake, a comparison, a commitment and a record. A host is only ever in ONE
// of those moments, so stacking all five makes them work out which part is
// theirs every time. Folding hid four behind carets; it did not stop there
// being four.
//
// Same content, ONE STAGE AT A TIME — 02_STUDIO_MATTE's Detail View Rule
// ("operating cockpits… readiness, why it matters, next action, phase
// sections") and UX_04's "every view has exactly one dominant element".
//
// IT WRITES FOR REAL. Pasting adds options, picking writes `status: 'chosen'`
// AND fills the stay in the same patch (the outlet ruling, 2026-07-28: a pick
// that touches nothing is a toast that lies). Everything lands on the same
// localStorage the live app reads, so the two surfaces cannot disagree.
//
// NOTHING HERE INVENTS DATA. Every number comes from the engines the live sheet
// uses. A stage the data has not reached says so plainly.
import { useMemo, useState, useCallback } from 'react';
import {
  lodgingIntel, lodgingStage, LODGING_STAGES, lodgingCompare, lodgingRecommendation,
  kitchenConsequence, lodgingSearchLinks, lodgingSearchBlocked,
  extractListingCandidates, normalizeLodgingOption, stayFromPick,
} from '@app/lib/lodgingIntel';
import { LS_CUSTOMS, LS_LAST_EVENT, loadCustomEvents } from './eventPool.js';

const STEP_LABEL = {
  'no-town': 'The town', looking: 'Go look', weighing: 'Weigh them',
  picked: 'The pick', booked: 'On the books',
};

export default function LodgingCockpit() {
  const [tick, setTick] = useState(0);
  const events = useMemo(() => { try { return loadCustomEvents() || []; } catch { return []; } }, [tick]);
  const lastId = (() => { try { return localStorage.getItem(LS_LAST_EVENT); } catch { return null; } })();
  const [eventId, setEventId] = useState(() =>
    (events.find((e) => e && e.id === lastId) ? lastId : (events[0] && events[0].id)) || null);
  const event = events.find((e) => e && e.id === eventId) || null;

  // ONE write path. Everything on this surface goes through it, so the cockpit
  // and the live sheet can never hold different truths about the same event.
  const patch = useCallback((changes) => {
    try {
      const all = loadCustomEvents() || [];
      const next = all.map((e) => (e && e.id === eventId ? { ...e, ...changes } : e));
      localStorage.setItem(LS_CUSTOMS, JSON.stringify(next));
      setTick((t) => t + 1);
    } catch { /* storage full or blocked — the surface simply does not change */ }
  }, [eventId]);

  const intel = useMemo(() => { try { return event ? lodgingIntel(event) : null; } catch { return null; } }, [event]);
  const derived = useMemo(() => { try { return event ? lodgingStage(event, intel) : null; } catch { return null; } }, [event, intel]);

  // `viewing` changes only which stage you LOOK at — it never rewrites the
  // event, so this cannot lie about where the host actually is.
  const [viewing, setViewing] = useState(null);
  const stage = viewing || (derived && derived.stage) || null;
  const isCurrent = !viewing || (derived && viewing === derived.stage);

  if (!event) return <Frame><Solo><p className="lc-note">No event on this device yet. Create one in the app first.</p></Solo></Frame>;
  if (!derived) return (
    <Frame><Solo>
      <p className="lc-eyebrow">WHERE EVERYONE STAYS</p>
      <h1 className="lc-h1">Not a destination event.</h1>
      <p className="lc-why">This cockpit only has a job when guests travel — the whole stack is gated on <code>isDestination</code>.</p>
      <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
    </Solo></Frame>
  );

  const copy = stageCopy(derived, stage);

  return (
    <Frame>
      <div className="lc-grid">
        <aside className="lc-rail-col">
          <p className="lc-eyebrow">WHERE EVERYONE STAYS</p>
          <nav className="lc-rail">
            {LODGING_STAGES.map((s) => {
              const st = derived.steps.find((x) => x.id === s) || {};
              const on = s === stage;
              return (
                <button key={s} onClick={() => setViewing(s === derived.stage ? null : s)}
                  className={'lc-step' + (on ? ' is-on' : st.done ? ' is-done' : '')}>{STEP_LABEL[s]}</button>
              );
            })}
          </nav>
        </aside>

        <main className="lc-main">
          {!isCurrent && (
            <p className="lc-peek">
              Looking ahead — you’re actually at <strong>{STEP_LABEL[derived.stage]}</strong>.
              <button onClick={() => setViewing(null)} className="lc-link">Back to now</button>
            </p>
          )}
          <h1 className="lc-h1">{copy.title}</h1>
          <p className="lc-why">{copy.why}</p>
          <Body stage={stage} event={event} intel={intel} patch={patch} />
          <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
        </main>
      </div>
    </Frame>
  );
}

// Peeking must describe the stage you are LOOKING at, or the header would
// disagree with the body under it.
function stageCopy(derived, stage) {
  if (stage === derived.stage) return derived;
  return ({
    'no-town': { title: 'Name the town.', why: 'Every search needs a place before it can open.' },
    looking: { title: 'Go find some places.', why: 'Three doors, opened with your own answers already in them.' },
    weighing: { title: 'Weigh them side by side.', why: 'On the things you said matter — and nothing that was never said.' },
    picked: { title: 'Lock one in.', why: 'Choosing is not booking. This is where the pick becomes a reservation.' },
    booked: { title: 'On the books.', why: 'The refund window, the next payment, and who still needs a room.' },
  })[stage] || derived;
}

function Body({ stage, event, intel, patch }) {
  if (stage === 'no-town') return <NoTown event={event} patch={patch} />;
  if (stage === 'looking') return <Looking event={event} patch={patch} />;
  if (stage === 'weighing') return <Weighing event={event} intel={intel} patch={patch} />;
  if (stage === 'picked') return <Picked event={event} intel={intel} patch={patch} />;
  return <Booked event={event} patch={patch} />;
}

function NoTown({ event, patch }) {
  const [town, setTown] = useState('');
  let b = null; try { b = lodgingSearchBlocked(event); } catch { b = null; }
  // Asked IN PLACE. The old route pointed at `event-venue`, which writes
  // `venue` — not `venueCity` — so the searches stayed shut (verified live).
  const save = () => {
    const t = town.trim(); if (!t) return;
    const [city, state] = t.split(',').map((x) => x.trim());
    patch({ venueCity: city || t, ...(state ? { venueState: state } : null) });
  };
  return (
    <Panel label="THE ONE GAP">
      <p className="lc-body">{b ? b.detail : 'Airbnb, Vrbo and hotel searches all need a place.'}</p>
      <div className="lc-row-form">
        <input className="lc-field" placeholder="Santa Fe, NM" value={town}
          onChange={(e) => setTown(e.target.value)} aria-label="Town" />
        <button className="lc-cta" onClick={save} disabled={!town.trim()}>Use this town</button>
      </div>
    </Panel>
  );
}

function Looking({ event, patch }) {
  const [text, setText] = useState('');
  let links = []; try { links = lodgingSearchLinks(event) || []; } catch { links = []; }
  // One paste can carry a whole results page — extractListingCandidates reads
  // every card on it, with no server call.
  const add = () => {
    let found = { candidates: [] };
    try { found = extractListingCandidates(text) || found; } catch { /* unreadable paste */ }
    const cands = (found.candidates || []).filter(Boolean);
    if (!cands.length) return;
    const before = event.lodgingOptions || [];
    const next = cands.map((c, i) => normalizeLodgingOption({
      id: 'lodge-' + Math.random().toString(36).slice(2, 8),
      url: c.url, label: c.name || '', beds: c.beds, totalPrice: c.priceShown,
      photoUrl: c.photo, notes: [c.bedrooms ? `${c.bedrooms} bedrooms` : null,
        c.place ? `in ${c.place}` : null].filter(Boolean).join(' · '),
      status: 'option',
    }, before.length + i));
    patch({ lodgingOptions: [...before, ...next] });
    setText('');
  };
  return (
    <>
      <Panel label="THREE DOORS">
        <div className="lc-ctas">
          {links.map((l) => <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className="lc-cta">{l.label} ↗</a>)}
        </div>
        {links[0] && <p className="lc-note">Opens with your own answers already in it — {(links[0].applied || []).join(' · ')}.</p>}
        {!links.length && <p className="lc-note">No doors yet — the town is missing.</p>}
      </Panel>
      <Panel label="BRING ONE BACK">
        <textarea className="lc-field lc-area" rows={4} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="…or paste it here" aria-label="Paste a listing link or a results page" />
        <p className="lc-note">One link, or the whole results page — every card on it is read, with no server call.</p>
        <button className="lc-cta" onClick={add} disabled={!text.trim()}>Read what I pasted</button>
      </Panel>
    </>
  );
}

function Weighing({ event, intel, patch }) {
  let cmp = null; try { cmp = lodgingCompare(event, intel); } catch { cmp = null; }
  const kc = (() => { try { return kitchenConsequence(event); } catch { return null; } })();
  const rec = (() => { try { return lodgingRecommendation(event, intel); } catch { return null; } })();
  const opts = (intel && intel.options) || [];

  // THE OUTLET (board ruling 2026-07-28): a pick writes the stay in the SAME
  // patch, so travelPlan reads it and hostSpending counts it. A pick that
  // touches nothing is a toast that lies.
  const pick = (id) => {
    const next = (event.lodgingOptions || []).map((o) =>
      ({ ...o, status: o && o.id === id ? 'chosen' : (o && o.status === 'chosen' ? 'option' : (o && o.status) || 'option') }));
    let stay = null;
    try { stay = stayFromPick({ ...event, lodgingOptions: next }); } catch { stay = null; }
    patch({ lodgingOptions: next, ...(stay ? { lodging: { ...(event.lodging || {}), ...stay } } : null) });
  };

  return (
    <>
      {kc && <Panel label="THE KITCHEN DECIDES THE FOOD PLAN">
        <p className="lc-strong">{kc.headline}</p>
        <p className="lc-body">{kc.detail}</p>
      </Panel>}
      {cmp ? <Transpose cmp={cmp} /> : <Panel label="SIDE BY SIDE">
        <p className="lc-note">One option is not a comparison — add a second and this fills in.</p>
      </Panel>}
      {rec && rec.line && <Panel label="WHAT THE PLAN WOULD PICK">
        <p className="lc-body">{rec.line}</p>
      </Panel>}
      <Panel label="MAKE THE CALL">
        {opts.map((o) => (
          <div key={o.id} className="lc-opt">
            <span className="lc-opt-name">{o.label}</span>
            <button className="lc-cta lc-cta-sm" onClick={() => pick(o.id)}>Make it the pick</button>
          </div>
        ))}
        {!opts.length && <p className="lc-note">Nothing on the list yet.</p>}
      </Panel>
    </>
  );
}

function Picked({ event, intel, patch }) {
  const chosen = (intel && intel.chosen) || null;
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const [code, setCode] = useState(stay.bookingCode || '');
  if (!chosen) return <Panel label="THE PICK"><p className="lc-note">Nothing picked yet — this is what it will show once one is.</p></Panel>;
  const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? `$${Math.round(Number(n)).toLocaleString()}` : '—');
  return (
    <Panel label="THE PICK">
      <p className="lc-strong">{String(chosen.label || '').trim() || 'Your pick'}</p>
      <Rows rows={[
        ['All-in', money(chosen.allIn != null ? chosen.allIn : chosen.totalPrice)],
        ['Sleeps', chosen.sleeps != null ? String(chosen.sleeps) : '—'],
        ['Cancellation', String(chosen.cancellationTier || '').trim() || '—'],
      ]} />
      <p className="lc-note">Choosing is not booking. Book on the platform, then bring the confirmation back.</p>
      <div className="lc-row-form">
        <input className="lc-field" placeholder="Booking code" value={code}
          onChange={(e) => setCode(e.target.value)} aria-label="Booking code" />
        <button className="lc-cta" disabled={!code.trim()}
          onClick={() => patch({ lodging: { ...stay, bookingCode: code.trim() } })}>Save the stay details</button>
      </div>
    </Panel>
  );
}

function Booked({ event, patch }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const md = (event.moneyDates && typeof event.moneyDates === 'object') ? event.moneyDates : {};
  const setMd = (k) => (e) => patch({ moneyDates: { ...md, [k]: e.target.value } });
  return (
    <>
      <Panel label="ON THE BOOKS">
        <Rows rows={[
          ['The stay', String(stay.hotelName || '').trim() || '—'],
          ['Booking code', String(stay.bookingCode || '').trim() || '—'],
        ]} />
      </Panel>
      <Panel label="THE MONEY-SAFE DATES">
        <p className="lc-note">Copy these off the booking confirmation — they are the ones with a deadline.</p>
        {[['refundDeadline', 'Refund window closes'], ['installmentDue', 'Next payment due'],
          ['headcountDue', 'Final headcount due']].map(([k, label]) => (
          <div key={k} className="lc-date">
            <span className="lc-row-label">{label}</span>
            <input className="lc-field lc-field-sm" type="date" value={md[k] || ''} onChange={setMd(k)} aria-label={label} />
          </div>
        ))}
      </Panel>
    </>
  );
}

function Transpose({ cmp }) {
  const grid = { gridTemplateColumns: `minmax(92px,1.3fr) repeat(${cmp.columns.length}, minmax(0,1fr))` };
  return (
    <Panel label={`SIDE BY SIDE${cmp.guests ? ` · YOUR ${cmp.guests}` : ''}`}>
      <div className="lc-t-head" style={grid}>
        <span />
        {cmp.columns.map((c) => <span key={c.id} className="lc-col">{c.label}</span>)}
      </div>
      {cmp.rows.map((r) => (
        <div key={r.id} className="lc-t-row" style={grid}>
          <span className="lc-row-label">{r.label}</span>
          {r.values.map((v, i) => (
            <span key={i} className={'lc-t-val' + (v === '—' ? ' is-gap' : r.flags[i] === 'short' ? ' is-short' : '')}>{v}</span>
          ))}
        </div>
      ))}
      <p className="lc-note">{cmp.note}</p>
    </Panel>
  );
}

const Rows = ({ rows }) => rows.map(([l, r]) => (
  <div key={l} className="lc-row"><span className="lc-row-label">{l}</span><span className="lc-row-val">{r}</span></div>
));

const Panel = ({ label, children }) => (
  <section className="lc-panel"><p className="lc-label">{label}</p>{children}</section>
);

function EventPicker({ events, eventId, onPick }) {
  if (events.length < 2) return null;
  return (
    <section className="lc-panel lc-picker">
      <p className="lc-label">DRIVING WHICH EVENT</p>
      <div className="lc-ctas">
        {events.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)}
            className={'lc-cta lc-cta-sm' + (e.id === eventId ? '' : ' is-off')}>{e.name || 'Untitled'}</button>
        ))}
      </div>
    </section>
  );
}

// ── RESPONSIVE TO THE DEVICE, NOT TO A PHONE FRAME ─────────────────────────
// 02_STUDIO_MATTE's Responsive Rule names six sizes and says "mobile is not an
// afterthought". The first cut of this pinned max-width:393 — a phone mock on
// every screen, which is the opposite. It now flows: fluid measure and clamped
// type on one column, and at >=900px the step rail moves to its own left column
// so the decision keeps the width instead of the rail stealing it.
const CSS = `
.lc-wrap{min-height:100vh;background:var(--bg);color:var(--ink);
  background-image:radial-gradient(150% 500px at 50% -70px, rgba(86,116,140,.30) 0%, rgba(86,116,140,.09) 40%, transparent 74%);
  background-repeat:no-repeat;font:400 15px/1.5 Inter,system-ui,sans-serif;
  padding:clamp(20px,4vw,40px) clamp(16px,5vw,48px) calc(48px + env(safe-area-inset-bottom,0px));}
.lc-grid{width:min(100%,1180px);margin:0 auto;display:grid;grid-template-columns:1fr;gap:0;}
.lc-main{min-width:0;max-width:68ch;}
.lc-eyebrow{font:650 11px/1 Inter,sans-serif;letter-spacing:.09em;color:var(--muted);margin:0;}
.lc-rail{display:flex;gap:4px;margin:18px 0 0;flex-wrap:wrap;}
.lc-step{background:none;border:none;border-bottom:2px solid var(--line);padding:6px 8px 8px;
  font:500 11px/1 Inter,sans-serif;letter-spacing:.02em;cursor:pointer;color:var(--faint);}
.lc-step.is-done{color:var(--muted);border-bottom-color:var(--steel-soft);}
.lc-step.is-on{color:var(--ink);border-bottom-color:var(--ok);font-weight:650;}
.lc-h1{font:700 clamp(27px,5.2vw,40px)/1.12 Inter,sans-serif;letter-spacing:-.03em;margin:26px 0 0;text-wrap:balance;}
.lc-why{font:italic 400 clamp(14px,1.9vw,17px)/1.5 Newsreader,Georgia,serif;color:var(--muted);margin:12px 0 0;max-width:52ch;}
.lc-peek{font:400 12px/1.5 Inter,sans-serif;color:var(--muted);margin:16px 0 0;}
.lc-peek strong{color:var(--ink-soft);}
.lc-link{background:none;border:none;color:var(--steel-soft);cursor:pointer;font:500 12px/1 Inter,sans-serif;padding:0 0 0 6px;text-decoration:underline;}
.lc-panel{margin-top:clamp(20px,3vw,30px);}
.lc-picker{border-top:1px solid var(--line);padding-top:14px;}
.lc-label{font:500 10px/1 Inter,sans-serif;letter-spacing:.09em;color:var(--faint);margin:0 0 8px;}
.lc-body{color:var(--ink-soft);margin:0 0 6px;}
.lc-strong{font:650 17px/1.3 Inter,sans-serif;margin:0 0 6px;}
.lc-note{font:400 11px/1.5 Inter,sans-serif;color:var(--faint);margin:10px 0 0;}
.lc-ctas{display:flex;gap:8px;flex-wrap:wrap;}
.lc-cta{background:var(--sheen);color:var(--ink);border:none;border-radius:14px;padding:10px 18px;min-height:46px;
  display:inline-flex;align-items:center;justify-content:center;font:700 15px/1 Inter,sans-serif;
  letter-spacing:-.01em;text-decoration:none;cursor:pointer;}
.lc-cta[disabled]{opacity:.4;cursor:default;}
.lc-cta-sm{font-size:13px;min-height:40px;padding:8px 14px;}
.lc-cta.is-off{opacity:.5;}
.lc-field{background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--ink);
  padding:12px 14px;font:400 15px/1.3 Inter,sans-serif;min-height:46px;width:100%;min-width:0;}
.lc-field-sm{max-width:190px;min-height:40px;}
.lc-area{resize:vertical;line-height:1.5;}
.lc-row-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;}
.lc-row-form .lc-field{flex:1 1 200px;}
.lc-row,.lc-date{display:flex;justify-content:space-between;gap:18px;border-top:1px solid var(--line);
  padding:12px 0;align-items:center;}
.lc-row-label{font:500 13px/1.35 Inter,sans-serif;color:var(--ink-soft);min-width:0;}
.lc-row-val{font:400 13px/1.35 Inter,sans-serif;text-align:right;color:var(--ink);}
.lc-opt{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--line);padding:12px 0;flex-wrap:wrap;}
.lc-opt-name{font:500 15px/1.3 Inter,sans-serif;min-width:0;}
.lc-t-head{display:grid;column-gap:8px;align-items:end;}
.lc-t-row{display:grid;column-gap:8px;border-top:1px solid var(--line);padding:10px 0;align-items:baseline;}
.lc-col{font:650 10px/1.2 Inter,sans-serif;letter-spacing:.04em;color:var(--faint);text-align:right;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lc-t-val{font:650 13px/1.35 Inter,sans-serif;text-align:right;color:var(--ink);}
.lc-t-val.is-gap{font-weight:400;color:var(--faint);}
.lc-t-val.is-short{color:var(--muted);}
@media (min-width:900px){
  .lc-grid{grid-template-columns:190px minmax(0,1fr);gap:clamp(28px,4vw,64px);}
  .lc-rail{flex-direction:column;align-items:flex-start;gap:0;position:sticky;top:clamp(20px,4vw,40px);}
  .lc-step{border-bottom:none;border-left:2px solid var(--line);padding:10px 0 10px 12px;width:100%;text-align:left;font-size:12px;}
  .lc-step.is-done{border-left-color:var(--steel-soft);}
  .lc-step.is-on{border-left-color:var(--ok);}
}
@media (prefers-reduced-motion:reduce){.lc-wrap *{animation:none!important;transition:none!important;}}
`;

// Frame is the page shell only — the GRID belongs to whoever needs two columns,
// so it is never emitted twice.
const Frame = ({ children }) => (
  <div className="lc-wrap"><style>{CSS}</style>{children}</div>
);
// The simple states (no event, not a destination) have no rail, so they get the
// single-column body directly.
const Solo = ({ children }) => (
  <div className="lc-grid"><div className="lc-main">{children}</div></div>
);
