// ─── WHERE EVERYONE STAYS — THE COCKPIT (reimagine, 2026-08-03) ────────────
//
// Host, after reading the live panel end to end: "not very readable... we need
// way more than folding."
//
// The live sheet is FIVE surfaces wearing one scroll — a search launcher, an
// intake, a comparison, a commitment and a record. A host is only ever in ONE
// of those moments, so stacking all five makes them work out which part is
// theirs every time they open it. Folding hid four behind carets; it did not
// stop there being four.
//
// This is the same content as ONE STAGE AT A TIME, per 02_STUDIO_MATTE's Detail
// View Rule ("operating cockpits, not generic profile cards — readiness, why it
// matters, next action, phase sections") and UX_04's "every view has exactly
// one dominant element".
//
// WHY IT LIVES AT ?demo=lodging RATHER THAN REPLACING THE SHEET: this is a real
// behavioural change to the surface every destination host uses. It runs beside
// the live one, on the SAME real event out of localStorage — no fixtures, no
// invented houses — so it can be driven and judged before it replaces anything.
//
// NOTHING HERE INVENTS DATA. Every number comes from the same engines the live
// sheet uses (lodgingStage, lodgingCompare, kitchenConsequence,
// lodgingSearchLinks). A stage with no data yet says so plainly rather than
// showing a plausible blank.
import { useMemo, useState } from 'react';
import {
  lodgingIntel, lodgingStage, LODGING_STAGES, lodgingCompare,
  kitchenConsequence, lodgingSearchLinks, lodgingSearchBlocked,
} from '@app/lib/lodgingIntel';
import { LS_CUSTOMS, LS_LAST_EVENT, loadCustomEvents } from './eventPool.js';

const STEP_LABEL = {
  'no-town': 'The town',
  looking: 'Go look',
  weighing: 'Weigh them',
  picked: 'The pick',
  booked: 'On the books',
};

export default function LodgingCockpit() {
  const events = useMemo(() => { try { return loadCustomEvents() || []; } catch { return []; } }, []);
  const lastId = (() => { try { return localStorage.getItem(LS_LAST_EVENT); } catch { return null; } })();
  const [eventId, setEventId] = useState(() =>
    (events.find((e) => e && e.id === lastId) ? lastId : (events[0] && events[0].id)) || null);
  const event = events.find((e) => e && e.id === eventId) || null;

  const intel = useMemo(() => { try { return event ? lodgingIntel(event) : null; } catch { return null; } }, [event]);
  const derived = useMemo(() => { try { return event ? lodgingStage(event, intel) : null; } catch { return null; } }, [event, intel]);

  // The DERIVED stage is the truth. `viewing` only changes which stage you are
  // LOOKING at — it never rewrites the event, so nothing here can lie about
  // where the host actually is.
  const [viewing, setViewing] = useState(null);
  const stage = viewing || (derived && derived.stage) || null;
  const isCurrent = !viewing || (derived && viewing === derived.stage);

  if (!event) return <Frame><p style={S.muted}>No event on this device yet. Create one in the app first.</p></Frame>;
  if (!derived) {
    return (
      <Frame>
        <p style={S.eyebrow}>WHERE EVERYONE STAYS</p>
        <h1 style={S.h1}>Not a destination event.</h1>
        <p style={S.why}>This cockpit only has a job when guests travel — the whole stack is gated on <code>isDestination</code>.</p>
        <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
      </Frame>
    );
  }

  return (
    <Frame>
      <p style={S.eyebrow}>WHERE EVERYONE STAYS</p>

      {/* THE STEP RAIL — every stage stays reachable; only one is loud. */}
      <div style={S.rail}>
        {LODGING_STAGES.map((s) => {
          const st = derived.steps.find((x) => x.id === s) || {};
          const on = s === stage;
          return (
            <button key={s} onClick={() => setViewing(s === derived.stage ? null : s)} style={{
              ...S.step,
              color: on ? 'var(--ink)' : st.done ? 'var(--muted)' : 'var(--faint)',
              borderBottomColor: on ? 'var(--ok)' : st.done ? 'var(--steel-soft)' : 'var(--line)',
              fontWeight: on ? 650 : 500,
            }}>{STEP_LABEL[s]}</button>
          );
        })}
      </div>

      {!isCurrent && (
        <p style={S.peek}>
          Looking ahead — you’re actually at <strong style={{ color: 'var(--ink-soft)' }}>{STEP_LABEL[derived.stage]}</strong>.
          <button onClick={() => setViewing(null)} style={S.link}>Back to now</button>
        </p>
      )}

      {/* ONE dominant thing. */}
      <h1 style={S.h1}>{stageCopy(derived, stage).title}</h1>
      <p style={S.why}>{stageCopy(derived, stage).why}</p>

      <Body stage={stage} event={event} intel={intel} derived={derived} />

      <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
    </Frame>
  );
}

// When you peek at another stage, the copy must describe THAT stage — not the
// one you are in — or the header would disagree with the body below it.
function stageCopy(derived, stage) {
  if (stage === derived.stage) return derived;
  const AHEAD = {
    'no-town': { title: 'Name the town.', why: 'Every search needs a place before it can open.' },
    looking: { title: 'Go find some places.', why: 'Three doors, opened with your own answers already in them.' },
    weighing: { title: 'Weigh them side by side.', why: 'On the things you said matter — and nothing that was never said.' },
    picked: { title: 'Lock one in.', why: 'Choosing is not booking. This is where the pick becomes a reservation.' },
    booked: { title: 'On the books.', why: 'The refund window, the next payment, and who still needs a room.' },
  };
  return AHEAD[stage] || derived;
}

function Body({ stage, event, intel, derived }) {
  if (stage === 'no-town') {
    let b = null; try { b = lodgingSearchBlocked(event); } catch { b = null; }
    return <Panel label="WHY IT IS BLOCKED">
      <p style={S.body}>{b ? b.detail : 'Airbnb, Vrbo and hotel searches all need a place.'}</p>
      <Rows rows={[['Airbnb search', 'needs a place'], ['Vrbo search', 'needs a place'], ['Hotel search', 'needs a place']]} />
    </Panel>;
  }

  if (stage === 'looking') {
    let links = []; try { links = lodgingSearchLinks(event) || []; } catch { links = []; }
    return <Panel label="THREE DOORS">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {links.map((l) => <a key={l.id} href={l.href} target="_blank" rel="noreferrer" style={S.cta}>{l.label} ↗</a>)}
      </div>
      {links[0] && <p style={S.note}>Opens with your own answers already in it — {(links[0].applied || []).join(' · ')}.</p>}
      {!links.length && <p style={S.note}>No doors yet — the town is missing.</p>}
    </Panel>;
  }

  if (stage === 'weighing') {
    let cmp = null; try { cmp = lodgingCompare(event, intel); } catch { cmp = null; }
    const kc = (() => { try { return kitchenConsequence(event); } catch { return null; } })();
    return <>
      {kc && <Panel label="THE KITCHEN DECIDES THE FOOD PLAN">
        <p style={S.strong}>{kc.headline}</p>
        <p style={S.body}>{kc.detail}</p>
      </Panel>}
      {cmp ? <Transpose cmp={cmp} /> : <Panel label="SIDE BY SIDE">
        <p style={S.note}>One option is not a comparison — add a second and this fills in.</p>
      </Panel>}
    </>;
  }

  if (stage === 'picked') {
    const chosen = (intel && intel.chosen) || null;
    if (!chosen) return <Panel label="THE PICK"><p style={S.note}>Nothing picked yet — this is what it will show once one is.</p></Panel>;
    const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? `$${Math.round(Number(n)).toLocaleString()}` : '—');
    return <Panel label="THE PICK">
      <p style={S.strong}>{String(chosen.label || '').trim() || 'Your pick'}</p>
      <Rows rows={[
        ['All-in', money(chosen.allIn != null ? chosen.allIn : chosen.totalPrice)],
        ['Sleeps', chosen.sleeps != null ? String(chosen.sleeps) : '—'],
        ['Cancellation', String(chosen.cancellationTier || '').trim() || '—'],
      ]} />
      <p style={S.note}>Choosing is not booking. Book on the platform, then bring the confirmation numbers back.</p>
    </Panel>;
  }

  // booked
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const md = (event.moneyDates && typeof event.moneyDates === 'object') ? event.moneyDates : {};
  const any = [stay.hotelName, stay.bookingCode, md.refundDeadline, md.installmentDue].some((v) => String(v || '').trim());
  return <Panel label="ON THE BOOKS">
    {!any && <p style={S.note}>Nothing recorded yet — this is what it will watch once the confirmation is in.</p>}
    <Rows rows={[
      ['The stay', String(stay.hotelName || '').trim() || '—'],
      ['Booking code', String(stay.bookingCode || '').trim() || '—'],
      ['Refund window closes', String(md.refundDeadline || '').trim() || '—'],
      ['Next payment due', String(md.installmentDue || '').trim() || '—'],
    ]} />
  </Panel>;
}

function Transpose({ cmp }) {
  const grid = `minmax(92px,1.3fr) repeat(${cmp.columns.length}, minmax(0,1fr))`;
  return <Panel label={`SIDE BY SIDE${cmp.guests ? ` · YOUR ${cmp.guests}` : ''}`}>
    <div style={{ display: 'grid', gridTemplateColumns: grid, columnGap: 8, alignItems: 'end' }}>
      <span />
      {cmp.columns.map((c) => <span key={c.id} style={S.col}>{c.label}</span>)}
    </div>
    {cmp.rows.map((r) => (
      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: grid, columnGap: 8,
        borderTop: '1px solid var(--line)', padding: '10px 0', alignItems: 'baseline' }}>
        <span style={S.rowLabel}>{r.label}</span>
        {r.values.map((v, i) => (
          <span key={i} style={{ ...S.rowVal, fontWeight: v === '—' ? 400 : 650,
            color: v === '—' ? 'var(--faint)' : r.flags[i] === 'short' ? 'var(--muted)' : 'var(--ink)' }}>{v}</span>
        ))}
      </div>
    ))}
    <p style={S.note}>{cmp.note}</p>
  </Panel>;
}

const Rows = ({ rows }) => rows.map(([l, r]) => (
  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 18,
    borderTop: '1px solid var(--line)', padding: '12px 0', alignItems: 'baseline' }}>
    <span style={S.rowLabel}>{l}</span>
    <span style={{ ...S.rowVal, textAlign: 'right' }}>{r}</span>
  </div>
));

const Panel = ({ label, children }) => (
  <section style={{ marginTop: 26 }}>
    <p style={S.label}>{label}</p>
    {children}
  </section>
);

const Frame = ({ children }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)',
    backgroundImage: 'radial-gradient(150% 500px at 50% -70px, rgba(86,116,140,.30) 0%, rgba(86,116,140,.09) 40%, transparent 74%)',
    backgroundRepeat: 'no-repeat',
    font: '400 15px/1.5 Inter, system-ui, sans-serif',
    padding: '26px 20px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
    <div style={{ maxWidth: 393, margin: '0 auto' }}>{children}</div>
  </div>
);

function EventPicker({ events, eventId, onPick }) {
  if (events.length < 2) return null;
  return (
    <section style={{ marginTop: 34, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <p style={S.label}>DRIVING WHICH EVENT</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {events.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} style={{
            ...S.cta, fontSize: 12,
            opacity: e.id === eventId ? 1 : 0.55,
          }}>{e.name || 'Untitled'}</button>
        ))}
      </div>
    </section>
  );
}

const S = {
  eyebrow: { font: '650 11px/1 Inter, sans-serif', letterSpacing: '.09em', color: 'var(--muted)', margin: 0 },
  h1: { font: '700 32px/1.15 Inter, sans-serif', letterSpacing: '-0.03em', color: 'var(--ink)', margin: '26px 0 0' },
  why: { font: 'italic 400 15px/1.5 Newsreader, Georgia, serif', color: 'var(--muted)', margin: '12px 0 0' },
  label: { font: '500 10px/1 Inter, sans-serif', letterSpacing: '.09em', color: 'var(--faint)', margin: '0 0 8px' },
  body: { color: 'var(--ink-soft)', margin: '0 0 6px' },
  strong: { font: '650 17px/1.3 Inter, sans-serif', color: 'var(--ink)', margin: '0 0 6px' },
  note: { font: '400 11px/1.5 Inter, sans-serif', color: 'var(--faint)', margin: '10px 0 0' },
  peek: { font: '400 12px/1.5 Inter, sans-serif', color: 'var(--muted)', margin: '12px 0 0' },
  muted: { color: 'var(--muted)' },
  rail: { display: 'flex', gap: 4, marginTop: 18, flexWrap: 'wrap' },
  step: { background: 'none', border: 'none', borderBottom: '2px solid', padding: '6px 8px 8px',
    font: '500 11px/1 Inter, sans-serif', letterSpacing: '.02em', cursor: 'pointer' },
  link: { background: 'none', border: 'none', color: 'var(--steel-soft)', cursor: 'pointer',
    font: '500 12px/1 Inter, sans-serif', padding: '0 0 0 6px', textDecoration: 'underline' },
  cta: { background: 'var(--sheen)', color: 'var(--ink)', border: 'none', borderRadius: 14,
    padding: '10px 18px', minHeight: 46, display: 'inline-flex', alignItems: 'center',
    font: '700 15px/1 Inter, sans-serif', letterSpacing: '-0.01em', textDecoration: 'none', cursor: 'pointer' },
  col: { font: '650 10px/1.2 Inter, sans-serif', letterSpacing: '.04em', color: 'var(--faint)',
    textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowLabel: { font: '500 13px/1.35 Inter, sans-serif', color: 'var(--ink-soft)' },
  rowVal: { font: '400 13px/1.35 Inter, sans-serif', textAlign: 'right', color: 'var(--ink)' },
};
