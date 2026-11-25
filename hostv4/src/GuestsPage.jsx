// hostv4 GUESTS, step 1 (owner, 11/25/2026: "start the guests flow in hostv4").
// The approved prototype's Guests page, against the feature map
// (hostv2/test/guestFeatureMap.json). This step builds:
//   - the questions, one at a time at the top until answered: about how many,
//     by name or headcount, plus-ones, kids, the reply-by date (with its holiday);
//   - the page: the count line, adding names (a couple counts as two, or kept as
//     written), the list (swipe right for coming, left to remove, or tap),
//     search and filters at 8+ names, and a sheet for one guest (reply, remove);
//   - the bottom button by state.
// Every change is built by lib/guestEdits, the same builders hostv2 saves, and
// saved by the shell. What this step does not build yet (the invite, sending,
// nudges, locking the count, updates) says so and opens the current app.
import { useMemo, useRef, useState } from 'react';
import { countEdit, modeEdit, addNamesEdit, nameLines, rsvpEdit, removeGuestEdit, plusOneEdit, kidsEdit, replyByEdit } from '@app/lib/guestEdits';
import { detectCoupleNames } from '@app/lib/guestSplit';
import { guestCountFor } from '@app/lib/guestCountFor';
import { confirmedRsvpCovers } from '@app/lib/confirmedCovers';
import { rsvpState } from '@app/lib/rsvp';
import { filterGuestsByName } from '@app/lib/seatingPlan';
import { proposeReplyBy } from '@app/lib/replyBy';

const REPLY = { yes: 'Coming', maybe: 'Maybe', no: 'Can’t make it', pending: 'No reply' };
const RSVP_VALUE = { yes: 'Yes', maybe: 'Maybe', no: 'No', pending: '' };
const FILTERS = [['all', 'Everyone'], ['yes', 'Coming'], ['pending', 'Not replied'], ['maybe', 'Maybe'], ['no', 'Can’t make it']];
const longDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const chev = <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** The questions still to ask, in the prototype's order. An answer is a saved field. */
export function guestQuestions(ev) {
  const q = [];
  if (!(Number(ev.guestEstimate) > 0) && ev.guestCountSource !== 'host') q.push('count');
  if (!ev.guestMode) q.push('mode');
  // Unset or cleared (Undo writes null back) is unanswered: the question returns.
  if (ev.plusOnePolicy == null) q.push('plus');
  if (ev.kidsPolicy == null) q.push('kids');
  if (!String(ev.rsvpDeadline || '').trim()) q.push('replyBy');
  return q;
}

function Stepper({ value, onChange, label }) {
  return (
    <div className="stepper">
      <span className="num" aria-live="polite">{value}</span>
      <span className="btns">
        <button aria-label={'Fewer ' + label} onClick={() => onChange(Math.max(1, value - 1))}>−</button>
        <button aria-label={'More ' + label} onClick={() => onChange(value + 1)}>+</button>
      </span>
    </div>
  );
}

function Rows({ items }) {
  // The current answer carries a checkmark (a single choice in a list, UX_12 §6).
  return <div className="grp">{items.map(([label, fn, on]) => <button key={label} className="row go" aria-current={on || undefined} onClick={fn}><span className="nm">{label}</span>{on ? <span className="check" aria-label="Chosen">✓</span> : chev}</button>)}</div>;
}

/** One question card. `count` is held by the page, because its answer is the bottom button. */
export function QuestionCard({ k, ev, count, setCount, save }) {
  if (k === 'count') return (<>
    <h2 className="q">About how many are coming?</h2>
    <div className="grp"><Stepper value={count} onChange={setCount} label="guests" /></div>
    <p className="fine">A guess is fine. You can change it later.</p>
  </>);
  if (k === 'mode') return (<>
    <h2 className="q">Do you want to track who’s coming by name?</h2>
    <Rows items={[['Yes, I’ll list names', () => save(modeEdit('list')), ev.guestMode === 'list'], ['No, a headcount is enough', () => save(modeEdit('count')), ev.guestMode === 'count']]} />
  </>);
  if (k === 'plus') return (<>
    <h2 className="q">Can guests bring someone?</h2>
    <Rows items={[['Yes, plus-ones are welcome', () => save(plusOneEdit('plus_one_ok')), ev.plusOnePolicy === 'plus_one_ok'], ['Not this time', () => save(plusOneEdit('no_plus_ones')), ev.plusOnePolicy === 'no_plus_ones']]} />
  </>);
  if (k === 'kids') return (<>
    <h2 className="q">Are kids welcome?</h2>
    <Rows items={[['Kids are welcome', () => save(kidsEdit('kids_welcome')), ev.kidsPolicy === 'kids_welcome'], ['Adults only', () => save(kidsEdit('adults_only')), ev.kidsPolicy === 'adults_only']]} />
  </>);
  if (k === 'replyBy') return <ReplyByCard ev={ev} save={save} />;
  return null;
}

// The proposal's reasoning is one tap down (UX_12 §1.4), so the screen stays a question.
function ReplyByCard({ ev, save }) {
  const [why, setWhy] = useState(false);
  {
    let prop = null;
    try { prop = proposeReplyBy(ev); } catch { prop = null; }
    return (<>
      <h2 className="q">When should replies be in by?</h2>
      <div className="grp">
        {prop && prop.iso && !prop.tooClose && (
          <button className="row go" onClick={() => save(replyByEdit(prop.iso))}>
            <span className="nm">{longDay(prop.iso)}<small>Our suggestion</small>{prop.holiday && <small className="hol" data-holiday>That’s {prop.holiday}. Keep it, or pick another date.</small>}</span>{chev}
          </button>
        )}
        <label className="row">Pick another date
          <input type="date" className="datein" aria-label="Reply-by date" onChange={(e) => e.target.value && save(replyByEdit(e.target.value))} />
        </label>
      </div>
      {prop && prop.tooClose && <p className="fine">{prop.why}</p>}
      {prop && !prop.tooClose && (why ? <p className="fine" data-why>{prop.why}</p> : <p className="fine"><button className="link" onClick={() => setWhy(true)}>Why this date</button></p>)}
    </>);
  }
}

const ANSWER = {
  count: (ev) => 'about ' + (Number(ev.guestEstimate) || '—'),
  mode: (ev) => (ev.guestMode === 'count' ? 'by headcount' : 'by name'),
  plus: (ev) => (ev.plusOnePolicy === 'plus_one_ok' ? '+1s welcome' : 'no +1s'),
  kids: (ev) => (ev.kidsPolicy === 'kids_welcome' ? 'kids welcome' : 'adults only'),
  replyBy: (ev) => 'replies by ' + new Date(ev.rsvpDeadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
};

/** Your answers: every question again, in a sheet, to change one. */
function AnswersSheet({ ev, save, onDone }) {
  const [count, setCount] = useState(Number(ev.guestEstimate) || 20);
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label="Your answers" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>Your answers</h2><button className="link" onClick={onDone}>Done</button></div>
        {['count', 'mode', 'plus', 'kids', 'replyBy'].map((k) => (
          <div key={k} className="card" data-answer={k}>
            <QuestionCard k={k} ev={ev} count={count} setCount={setCount} save={save} />
            {k === 'count' && Number(ev.guestEstimate) !== count && <button className="link" onClick={() => save(countEdit(ev, count))}>Plan for {count}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A row that follows the finger: right past 90px marks coming, left removes. Taps open the guest. */
function GuestRow({ g, onOpen, onComing, onRemove }) {
  const ref = useRef(null); const st = useRef(null);
  const set = (x, anim) => { const el = ref.current; if (!el) return; el.style.transition = anim ? 'transform .25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'; el.style.transform = x ? 'translateX(' + x + 'px)' : ''; };
  const down = (e) => { st.current = { x: e.clientX, y: e.clientY, dx: 0, axis: null, t: Date.now() }; };
  const move = (e) => {
    const s = st.current; if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    if (!s.axis && Math.hypot(dx, dy) > 8) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; // locks to the axis it starts on
    if (s.axis === 'x') { s.dx = dx; set(dx, false); }
  };
  const up = () => {
    const s = st.current; st.current = null; if (!s) return;
    const flick = Math.abs(s.dx) > 30 && Date.now() - s.t < 200;
    if (s.axis === 'x' && (s.dx > 90 || (flick && s.dx > 0))) { set(0, true); onComing(); return; }
    if (s.axis === 'x' && (s.dx < -90 || (flick && s.dx < 0))) { set(0, true); onRemove(); return; }
    set(0, true);
    if (!s.axis) onOpen();
  };
  const r = rsvpState(g);
  return (
    <div className="swipe">
      <span className="under ok" aria-hidden="true">Coming</span><span className="under rm" aria-hidden="true">Remove</span>
      <button ref={ref} className="row guest" data-guest={g.id} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { st.current = null; set(0, true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
        <span>{g.name}</span><span className={'val' + (r === 'yes' ? ' ok' : '')}>{REPLY[r]}</span>
      </button>
    </div>
  );
}

function GuestSheet({ g, onReply, onRemove, onDone }) {
  const r = rsvpState(g);
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label={g.name} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{g.name}</h2><button className="link" onClick={onDone}>Done</button></div>
        <h3 className="lbl">Reply</h3>
        <div className="seg" role="group" aria-label="Reply">
          {['yes', 'maybe', 'no', 'pending'].map((k) => <button key={k} aria-pressed={r === k} onClick={() => onReply(RSVP_VALUE[k])}>{k === 'pending' ? 'No reply' : k === 'no' ? 'No' : REPLY[k]}</button>)}
        </div>
        <p className="fine">Meal, their +1, how to reach them and nudges are in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
        <div className="grp" style={{ marginTop: 16 }}><button className="row danger" onClick={onRemove}>Remove from the list</button></div>
      </div>
    </div>
  );
}

export default function GuestsPage({ ev, save, sample, nav, status, onInvite }) {
  const qs = guestQuestions(ev);
  const [count, setCount] = useState(() => Number(ev.guestEstimate) || Number(guestCountFor(ev).count) || 20);
  const [text, setText] = useState('');
  const [couple, setCouple] = useState(null); // { lines, guests } after a couple was split
  const [find, setFind] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const [answers, setAnswers] = useState(false);
  const guests = useMemo(() => (Array.isArray(ev.guests) ? ev.guests : []), [ev]);
  const named = guests.length;
  const coming = confirmedRsvpCovers(ev);
  const planned = Number(guestCountFor(ev).count) || null;
  const byName = ev.guestMode !== 'count';

  const add = () => {
    const lines = nameLines(text);
    const ed = addNamesEdit(ev, lines, { splitCouples: true });
    if (!ed) return;
    const split = lines.some((l) => detectCoupleNames(l));
    if (save(ed)) { setText(''); setCouple(split ? { lines, before: guests } : null); }
  };
  const keepAsWritten = () => {
    const ed = addNamesEdit({ ...ev, guests: couple.before }, couple.lines, { splitCouples: false });
    setCouple(null); if (ed) save(ed);
  };
  const indexOf = (g) => guests.findIndex((x) => x === g || (x.id && x.id === g.id));
  const shown = filterGuestsByName(guests, find).filter((g) => filter === 'all' || rsvpState(g) === filter);
  const opened = open != null ? guests.find((g) => g.id === open) : null;

  // THE BOTTOM BUTTON, by state (prototype PRIMARY.guests). One action.
  const action = qs[0] === 'count' ? { label: 'Plan for ' + count, go: () => save(countEdit(ev, count)) }
    : qs.length ? null
      : byName && !named ? { label: 'Add names', go: () => { const f = document.getElementById('addname'); if (f) f.focus(); } }
        : { label: 'Send the invite in the current app', href: '../hostv2/' };

  // The page owns its screen and its bottom button (one primary, same place).
  return (<>
    <main className="view" data-view="guests">
    {nav}
    <section data-guests>
      {planned && <p className="sub">Planning for {planned}{byName && !qs.length ? ' · ' + named + ' named · ' + coming + ' coming' : ''}{sample ? ' · Sample' : ''}</p>}
      {status}
      {qs.length > 0 && <div className="card" data-question={qs[0]}><QuestionCard k={qs[0]} ev={ev} count={count} setCount={setCount} save={save} /></div>}

      {!qs.length && (
        <div className="grp"><button className="row go" data-answers onClick={() => setAnswers(true)}><span className="nm">Your answers<small>{Object.keys(ANSWER).map((k) => ANSWER[k](ev)).join(' · ')}</small></span>{chev}</button></div>
      )}
      {answers && <AnswersSheet ev={ev} save={save} onDone={() => setAnswers(false)} />}

      {!qs.length && !byName && (<>
        <h3 className="sh">Headcount</h3>
        <div className="grp"><div className="row">Planning around<span className="val">{planned}</span></div>
          <button className="row go" onClick={() => save(modeEdit('list'))}>Switch to a list of names{chev}</button></div>
      </>)}

      {!qs.length && byName && (<>
        <div className="sh"><h3>Names</h3><span>{named}</span></div>
        <label className="lbl" htmlFor="addname">Add names, one per line</label>
        <div className="addrow">
          <textarea className="field" id="addname" rows={text.includes('\n') ? 3 : 1} placeholder="For example: Jamie Lee" value={text} onChange={(e) => setText(e.target.value)} />
          {text.trim() && <button className="link" onClick={add}>Add</button>}
        </div>
        {couple && <p className="line" data-couple>Couples count as two people. <button className="link" onClick={keepAsWritten}>Keep as written</button></p>}
        {named >= 8 && (<>
          <input className="field" type="search" placeholder="Find someone on the list" aria-label="Find someone on the list" value={find} onChange={(e) => setFind(e.target.value)} />
          <div className="chips" role="group" aria-label="Show">{FILTERS.map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}</div>
        </>)}
        {shown.length ? (
          <div className="grp" data-names>
            {shown.map((g) => (
              <GuestRow key={g.id || g.name} g={g} onOpen={() => setOpen(g.id)}
                onComing={() => save(rsvpEdit(ev, indexOf(g), 'Yes'))} onRemove={() => save(removeGuestEdit(ev, indexOf(g)))} />
            ))}
          </div>
        ) : <p className="fine">{named ? 'No one here matches.' : 'No names yet. Add the people you know are coming.'}</p>}
        {named > 0 && <p className="fine">Swipe a name right to mark them coming, left to remove. Or tap it.</p>}
      </>)}

      {!qs.length && (<>
        <h3 className="sh">The invite</h3>
        <div className="grp"><button className="row go" data-open-invite onClick={onInvite}><span>Your invite</span><span className={'val' + (ev.invitesSentAt ? ' ok' : '')}>{ev.invitesSentAt ? 'Sent' : 'Not sent yet'}</span>{chev}</button></div>
        <p className="fine">Sending it, replies, nudges and updates are in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
      </>)}

      {opened && <GuestSheet g={opened} onDone={() => setOpen(null)}
        onReply={(v) => save(rsvpEdit(ev, indexOf(opened), v))}
        onRemove={() => { const i = indexOf(opened); setOpen(null); save(removeGuestEdit(ev, i)); }} />}
    </section>
    </main>
    {action && <div className="action">{action.href
      ? <a className="primary" href={action.href}>{action.label}</a>
      : <button className="primary" onClick={action.go}>{action.label}</button>}</div>}
  </>);
}
