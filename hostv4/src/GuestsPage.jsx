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
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { typingIn } from './layout.js';
import { countEdit, modeEdit, addNamesEdit, nameLines, rsvpEdit, removeGuestEdit, plusOneEdit, kidsEdit, replyByEdit, replyByProblem, clearReplyByEdit, guestFieldEdit, mealEdit, listToggleEdit, kidsAddedLine, toldEdit, MEAL_CHOICES, guestListCsv, replyAlertsEdit } from '@app/lib/guestEdits';
import { formatPhoneUS, isMalformedEmail } from '@app/lib/contactFormat';
import { guestToldMap, isTold } from '@app/lib/guestTold';
import { detectCoupleNames } from '@app/lib/guestSplit';
import { guestCountFor } from '@app/lib/guestCountFor';
import { confirmedRsvpCovers } from '@app/lib/confirmedCovers';
import { rsvpState } from '@app/lib/rsvp';
import { filterGuestsByName } from '@app/lib/seatingPlan';
import { proposeReplyBy } from '@app/lib/replyBy';
import { ALLERGENS, DIET_RULES } from '@app/lib/dietOptions';
import { nudgeRecipients, nudgeCount, wasInvited } from '@app/lib/replyNudge';
import NudgeSheet from './NudgeSheet.jsx';
import LockSheet from './LockSheet.jsx';
import { replyLinkFor, linkSharedFields } from '@app/lib/inviteSend';
import { downloadCSV } from '@app/lib/download';
import { LINK_WHY } from './sendKit.jsx';
import { useGuestQuestions } from '@app/lib/guestUpdatesKit';
import { getLastSyncTime } from '@app/lib/api/syncState';
import { questionsWaitingLine } from '@app/lib/guestInbox';

const REPLY = { yes: 'Coming', maybe: 'Maybe', no: 'Can’t make it', pending: 'No reply' };
const RSVP_VALUE = { yes: 'Yes', maybe: 'Maybe', no: 'No', pending: '' };
// GUESTS FOLDS AWAY (owner chose option E, 11/25/2026: "minimize lists and
// collapse where we can, hide"). The replies, folded into groups that open in
// place one at a time; a find box only past FIND_AT names.
const GROUPS = [['yes', 'Coming'], ['maybe', 'Maybe'], ['pending', 'No reply yet'], ['no', 'Can’t make it']];
const FIND_AT = 21;
const chevDown = <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** The headcount at a glance: each reply against the plan's number. */
function Headcount({ counts, of }) {
  const named = counts.yes + counts.maybe + counts.pending + counts.no;
  const open = Math.max(0, (of || 0) - named);
  const parts = [[counts.yes, 'coming'], [counts.maybe, 'maybe'], [counts.pending, 'no reply'], [counts.no, 'can’t make it']].filter(([n], k) => k === 0 || n > 0);
  const said = parts.map(([n, w]) => n + ' ' + w).join(', ') + (of ? ', of ' + of : '');
  return (<>
    <div className="hbar" data-headcount role="img" aria-label={said}>
      {[['yes', counts.yes], ['maybe', counts.maybe], ['pending', counts.pending], ['no', counts.no], ['open', open]].filter(([, n]) => n > 0).map(([k, n]) => <i key={k} className={k} style={{ flex: n }} />)}
    </div>
    <p className="legend" aria-hidden="true">{parts.map(([n, w], k) => <Fragment key={w}>{k ? ' · ' : ''}<b>{n}</b> {w}</Fragment>)}{of ? ' · of ' + of : ''}</p>
  </>);
}
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
  // Too close for an honest reply-by date (owner's Thanksgiving, 11/25/2026:
  // the party was the next day), the question has no answer, so it isn't asked.
  if (!String(ev.rsvpDeadline || '').trim()) {
    let close = false;
    try { const p = proposeReplyBy(ev); close = !!(p && p.tooClose); } catch { close = false; }
    if (!close) q.push('replyBy');
  }
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
  const [picked, setPicked] = useState('');
  const problem = picked ? replyByProblem(ev, picked) : null;
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
        {/* iPad's picker changes the field as soon as it is touched, so a pick
            waits for a tap on "Use <date>" (owner, 11/25/2026: the date kept
            coming back after Undo). */}
        <label className="row">Pick another date
          <input type="date" className="datein" aria-label="Reply-by date" value={picked} onChange={(e) => setPicked(e.target.value)} />
        </label>
        {picked && !problem && (
          <button className="row go" onClick={() => save(replyByEdit(picked))}><span className="nm">Use {longDay(picked)}</span>{chev}</button>
        )}
        {String(ev.rsvpDeadline || '').trim() && <button className="row go" onClick={() => save(clearReplyByEdit())}>No reply-by date</button>}
      </div>
      {picked && problem && <p className="fine" data-problem>{problem}</p>}
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
  replyBy: (ev) => (String(ev.rsvpDeadline || '').trim() ? 'replies by ' + new Date(ev.rsvpDeadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'no reply-by date'),
};
export const answersLine = (ev) => Object.keys(ANSWER).map((k) => ANSWER[k](ev)).join(' · ');

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
function GuestRow({ g, onOpen, onComing, onRemove, selected }) {
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
      <button ref={ref} className="row guest" data-guest={g.id} aria-selected={selected || undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { st.current = null; set(0, true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
        <span>{g.name}</span><span className={'val' + (r === 'yes' ? ' ok' : '')}>{REPLY[r]}</span>
      </button>
    </div>
  );
}

/** A text field that saves when she leaves it (no line, no save per keystroke). */
function Field({ label, value, onSave, type = 'text', placeholder, invalid, format }) {
  return (
    <input className="field" type={type} aria-label={label} placeholder={placeholder || label} defaultValue={value || ''} aria-invalid={invalid || undefined}
      onBlur={(e) => { const v = format ? format(e.target.value) : e.target.value.trim(); if (format) e.target.value = v; if (v !== String(value || '')) onSave(v); }} />
  );
}

// Diet and allergies in little space (owner chose "A + B", 11/25/2026): a row
// that opens a checklist, and what is picked shown under it as chips that
// remove it. Nothing picked, the row alone.
function ListRow({ label, on, onOpen, onRemove }) {
  const set = Array.isArray(on) ? on : [];
  return (<>
    <button className="row go" onClick={onOpen}><span className="nm">{label}</span>{!set.length && <span className="val">None</span>}{chev}</button>
    {set.length > 0 && <div className="chips wrap picked">{set.map((x) => <button key={x} aria-label={'Remove ' + x} onClick={() => onRemove(x)}>{x} <span aria-hidden="true">✕</span></button>)}</div>}
  </>);
}

function Checklist({ label, items, on, onTap, onDone, back }) {
  const set = Array.isArray(on) ? on : [];
  return (<>
    <button className="link back" onClick={onDone}>‹ {back}</button>
    <h3 className="lbl">{label}</h3>
    <div className="grp" role="group" aria-label={label}>
      {items.map((x) => <button key={x} className="row go" aria-pressed={set.includes(x)} onClick={() => onTap(x)}><span className="nm">{x}</span>{set.includes(x) ? <span className="check" aria-hidden="true">✓</span> : null}</button>)}
    </div>
  </>);
}

function MealPick({ label, value, onPick }) {
  const v = String(value || '—');
  const opts = MEAL_CHOICES.includes(v) ? MEAL_CHOICES : [...MEAL_CHOICES, v];
  return (
    <select className="field" aria-label={label} value={v} onChange={(e) => onPick(e.target.value)}>
      {opts.map((m) => <option key={m} value={m}>{m === '—' ? 'Meal not answered' : m}</option>)}
    </select>
  );
}

// ONE GUEST (feature map: guest sheet). Every change is a lib/guestEdits edit,
// the ones hostv2's guest editor saves: reply, meal and needs, their +1 (when
// plus-ones are welcome), children (when kids are welcome), how to reach them,
// "I told them myself" (a record only), remove.
export function GuestDetail({ ev, g, i, save, onDone, keys }) {
  const r = rsvpState(g);
  const name = String(g.name || '').trim();
  const first = name.split(/\s+/)[0] || 'them';
  const kids = Number(g.kids) || 0;
  const plusOk = ev.plusOnePolicy === 'plus_one_ok' || !!String(g.plusOne || '').trim();
  const kidsOk = ev.kidsPolicy === 'kids_welcome' || kids > 0;
  const told = isTold(guestToldMap(ev), g.id);
  const field = (fields) => save(guestFieldEdit(ev, i, fields, null));
  const [list, setList] = useState(null); // 'diets' | 'allergens' while its checklist is open
  const toggle = (f) => (x) => save(listToggleEdit(ev, i, f, x, name));
  if (list) return <Checklist label={list === 'diets' ? 'Diet' : 'Allergies'} items={list === 'diets' ? DIET_RULES : ALLERGENS} on={g[list]} onTap={toggle(list)} onDone={() => setList(null)} back={first} />;
  return (<>
        <h3 className="lbl">Reply</h3>
        <div className="seg" role="group" aria-label="Reply">
          {['yes', 'maybe', 'no', 'pending'].map((k) => <button key={k} aria-pressed={r === k} onClick={() => save(rsvpEdit(ev, i, RSVP_VALUE[k]))}>{k === 'pending' ? 'No reply' : k === 'no' ? 'No' : REPLY[k]}</button>)}
        </div>
        <h3 className="lbl">Meal</h3>
        <MealPick label={'Meal for ' + name} value={g.meal} onPick={(m) => save(mealEdit(ev, i, 'meal', m, name))} />
        {/* Diet and allergies asked apart, from the guest form's own lists
            (owner, 11/25/2026); the free text is for anything else. */}
        <div className="grp lists">
          <ListRow label="Diet" on={g.diets} onOpen={() => setList('diets')} onRemove={toggle('diets')} />
          <ListRow label="Allergies" on={g.allergens} onOpen={() => setList('allergens')} onRemove={toggle('allergens')} />
        </div>
        <Field label="Other needs" placeholder="Anything else, if any" value={g.needs} onSave={(v) => field({ needs: v })} />
        {plusOk && (<>
          <h3 className="lbl">Their +1</h3>
          <Field label="Plus one name" placeholder="Their +1’s name, if any" value={g.plusOne} onSave={(v) => field({ plusOne: v })} />
          {String(g.plusOne || '').trim() && (<>
            <MealPick label={'Meal for ' + g.plusOne} value={g.plusOneMeal} onPick={(m) => save(mealEdit(ev, i, 'plusOneMeal', m, String(g.plusOne).trim()))} />
            <Field label={'Dietary needs for ' + g.plusOne} placeholder="Dietary needs, if any" value={g.plusOneNeeds} onSave={(v) => field({ plusOneNeeds: v })} />
          </>)}
        </>)}
        {kidsOk && (<>
          <h3 className="lbl">Children</h3>
          <div className="grp"><div className="stepper">
            <span className="num" data-kids>{kids}</span>
            <span className="btns">
              <button aria-label={'Remove a child from ' + name + '’s party'} onClick={() => field({ kids: Math.max(0, kids - 1) })}>−</button>
              <button aria-label={'Add a child to ' + name + '’s party'} onClick={() => save(guestFieldEdit(ev, i, { kids: kids + 1 }, kidsAddedLine(kids + 1, name)))}>+</button>
            </span>
          </div></div>
          <p className="fine">Children count in the food plan at a lighter portion.</p>
        </>)}
        <h3 className="lbl">How to reach them</h3>
        <Field label="Phone" type="tel" placeholder="Phone" value={g.phone} format={formatPhoneUS} onSave={(v) => field({ phone: v })} />
        <Field label="Email" type="email" placeholder="Email" value={g.email} invalid={isMalformedEmail(g.email)} onSave={(v) => field({ email: v })} />
        {isMalformedEmail(g.email) && <p className="fine warn">That email doesn’t look right.</p>}
        <div className="grp" style={{ marginTop: 16 }}>
          <button className="row go" data-told aria-pressed={told} onClick={() => save(toldEdit(ev, g.id, name, 'other', new Date().toISOString()))}>
            <span className="nm">I told {first} myself<small>A note for you. Nothing is sent.</small></span>{told ? <span className="check" aria-label="Done">✓</span> : null}
          </button>
          <button className="row danger" onClick={() => { onDone(); save(removeGuestEdit(ev, i)); }}>Remove from the list</button>
        </div>
        {keys && <p className="keys" data-keys><span><kbd>↑</kbd> <kbd>↓</kbd> next name</span><span><kbd>/</kbd> find</span><span><kbd>N</kbd> add a name</span><span><kbd>Y</kbd> <kbd>M</kbd> <kbd>X</kbd> reply</span></p>}
  </>);
}

// On a phone, one guest is a sheet (UX_12); on an iPad it is the detail pane,
// or a pushed page in portrait (UX_13). The same detail in each.
function GuestSheet({ ev, g, i, save, onDone }) {
  const name = String(g.name || '').trim();
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label={name} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{name}</h2><button className="link" onClick={onDone}>Done</button></div>
        <GuestDetail ev={ev} g={g} i={i} save={save} onDone={onDone} />
      </div>
    </div>
  );
}

export default function GuestsPage({ ev, save, sample, nav, status, onInvite, onUpdates, layout = 'phone' }) {
  const qs = guestQuestions(ev);
  const [count, setCount] = useState(() => Number(ev.guestEstimate) || Number(guestCountFor(ev).count) || 20);
  const [text, setText] = useState('');
  const [couple, setCouple] = useState(null); // { lines, guests } after a couple was split
  const [find, setFind] = useState('');
  const [open, setOpen] = useState(null);
  const [answers, setAnswers] = useState(false);
  const [sheet, setSheet] = useState(null); // 'nudge' | 'lock' | 'add' | 'more'
  // The one open group. undefined: not yet chosen (on an iPad split, the
  // selected guest's group opens, so the selection is in view); null: all closed.
  const [group, setGroup] = useState(undefined);
  const [waiting, setWaiting] = useState(0);
  useGuestQuestions(getLastSyncTime(ev.id) ? ev.id : null, setWaiting);
  const [shareLine, setShareLine] = useState('');
  // SHARE THE LINK: the checked reply link (lib/inviteSend), through the phone's
  // share sheet, else copied. A completed share is the invite going out.
  const shareLink = async () => {
    setShareLine('Checking your reply link…');
    let x; try { x = await replyLinkFor(ev); } catch { x = { url: '', reason: 'unavailable' }; }
    if (!x.url) { setShareLine('Your reply link isn’t ready. ' + (LINK_WHY[x.reason] || LINK_WHY.unavailable)); return; }
    const text = 'You’re invited to ' + (ev.name || 'our event') + '. RSVP here: ' + x.url;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'You’re invited — ' + (ev.name || 'our event'), text, url: x.url });
        setShareLine('');
        const f = linkSharedFields(ev, new Date().toISOString());
        if (Object.keys(f).length) save({ patch: f, msg: 'Shared — the plan counts the invite as out.' });
        return;
      } catch (e) { if (e && e.name === 'AbortError') { setShareLine(''); return; } }
    }
    try { await navigator.clipboard.writeText(x.url); setShareLine('Link copied. Paste it anywhere guests will see it.'); }
    catch { setShareLine('Your reply link: ' + x.url); }
  };
  const download = () => { const f = guestListCsv(ev); downloadCSV(f.filename, f.content); save({ patch: {}, msg: f.msg }); };
  const guests = useMemo(() => (Array.isArray(ev.guests) ? ev.guests : []), [ev]);
  const named = guests.length;
  const coming = confirmedRsvpCovers(ev);
  const planned = Number(guestCountFor(ev).count) || null;
  // Names stay on the page once there are any, even after the count is locked
  // (locking writes guestMode 'count', as hostv2's lock does).
  const byName = ev.guestMode !== 'count' || named > 0;
  const locked = ev.guestMode === 'count' ? Number(ev.guestCount) || 0 : 0;
  const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  const replyByPassed = !!ev.rsvpDeadline && String(ev.rsvpDeadline).slice(0, 10) < today;
  const toNudge = nudgeCount(nudgeRecipients(ev));
  const invited = guests.filter((g) => wasInvited(ev, g)).length;
  const replied = guests.filter((g) => wasInvited(ev, g) && rsvpState(g) !== 'pending').length;

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
  const counts = { yes: 0, maybe: 0, pending: 0, no: 0 };
  for (const g of guests) counts[rsvpState(g)] = (counts[rsvpState(g)] || 0) + 1;
  const finding = named >= FIND_AT && find.trim();
  const openGroup = group !== undefined ? group : (layout === 'split' && guests.length ? rsvpState((open != null && guests.find((g) => g.id === open)) || guests[0]) : null);
  const shown = finding ? filterGuestsByName(guests, find) : openGroup ? guests.filter((g) => rsvpState(g) === openGroup) : guests;
  const opened = open != null ? guests.find((g) => g.id === open) : null;
  const tablet = layout !== 'phone';
  // SPLIT (UX_13): the detail pane always shows someone once there are names.
  const shownGuest = layout === 'split' && !qs.length && byName ? (opened || shown[0] || null) : null;
  const selectedId = layout === 'split' ? (shownGuest && shownGuest.id) : open;

  // KEYBOARD (UX_13 §4, owner: "keep shortcuts"): tablets only, never while typing.
  useEffect(() => {
    if (!tablet) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { if (typingIn(document.activeElement)) document.activeElement.blur(); else setOpen(null); return; }
      if (typingIn(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
      const cur = shown.findIndex((g) => g.id === selectedId);
      const sel = shown[cur] || null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = shown[Math.min(shown.length - 1, Math.max(0, cur + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (n) { setOpen(layout === 'split' ? n.id : n.id); const el = document.querySelector('[data-guest="' + n.id + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
      } else if (e.key === '/') { e.preventDefault(); const f = document.getElementById('findguest') || document.getElementById('addname'); if (f) f.focus(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); const f = document.getElementById('addname'); if (f) f.focus(); }
      else if (sel && (e.key === 'y' || e.key === 'Y')) save(rsvpEdit(ev, indexOf(sel), 'Yes'));
      else if (sel && (e.key === 'm' || e.key === 'M')) save(rsvpEdit(ev, indexOf(sel), 'Maybe'));
      else if (sel && (e.key === 'x' || e.key === 'X')) save(rsvpEdit(ev, indexOf(sel), 'No'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // THE BOTTOM BUTTON, by state (prototype PRIMARY.guests). One action.
  const action = qs[0] === 'count' ? { label: 'Plan for ' + count, go: () => save(countEdit(ev, count)) }
    : qs.length ? null
      : byName && !named ? { label: 'Add names', go: () => { if (text.trim()) add(); else { const f = document.getElementById('addname'); if (f) f.focus(); } } }
        : !ev.invitesSentAt ? { label: 'Review your invite', go: onInvite }
          // LOCK THE COUNT: the bottom button after the reply-by date, and nowhere else (owner, 11/25/2026).
          : replyByPassed && !locked ? { label: 'Lock the count', go: () => setSheet('lock') }
            : toNudge ? { label: toNudge === 1 ? 'Nudge the one who hasn’t replied' : 'Nudge the ' + toNudge + ' who haven’t replied', go: () => setSheet('nudge') }
              : null;

  // The page owns its screen and its bottom button (one primary, same place).
  const actionEl = action && <div className="action">{action.href
      ? <a className="primary" href={action.href}>{action.label}</a>
      : <button className="primary" onClick={action.go}>{action.label}</button>}</div>;
  const row = (g) => (
    <GuestRow key={g.id || g.name} g={g} selected={tablet && g.id === selectedId} onOpen={() => setOpen(g.id)}
      onComing={() => save(rsvpEdit(ev, indexOf(g), 'Yes'))} onRemove={() => save(removeGuestEdit(ev, indexOf(g)))} />
  );
  const addBox = (<>
    <label className="lbl" htmlFor="addname">Names, one per line</label>
    <div className="addrow">
      <textarea className="field" id="addname" rows={text.includes('\n') ? 3 : 1} placeholder="For example: Jamie Lee" value={text} onChange={(e) => setText(e.target.value)} />
      {text.trim() && <button className="link" onClick={add}>Add</button>}
    </div>
    {couple && <p className="line" data-couple>Couples count as two people. <button className="link" onClick={keepAsWritten}>Keep as written</button></p>}
  </>);
  // + and ⋯, beside the title: adding names and everything else, off the page.
  const acts = !qs.length && (
    <span className="pageacts">
      {byName && named > 0 && <button className="ic" aria-label="Add names" onClick={() => setSheet('add')}>＋</button>}
      <button className="ic" aria-label="More" onClick={() => setSheet('more')}>⋯</button>
    </span>
  );
  const listPane = (<>
    <main className="view" data-view="guests">
    {typeof nav === 'function' ? nav(acts) : <>{nav}{acts}</>}
    <section data-guests>
      {planned && !(byName && named > 0 && !qs.length) && <p className="sub">{locked ? 'Locked at ' + locked : 'Planning for ' + planned}{byName && !qs.length ? ' · ' + named + ' named · ' + coming + ' coming' : ''}{sample ? ' · Sample' : ''}</p>}
      {status}
      {qs.length > 0 && <div className="card" data-question={qs[0]}><QuestionCard k={qs[0]} ev={ev} count={count} setCount={setCount} save={save} /></div>}

      {answers && <AnswersSheet ev={ev} save={save} onDone={() => setAnswers(false)} />}

      {!qs.length && !byName && (<>
        <h3 className="sh">Headcount</h3>
        <div className="grp"><div className="row">Planning around<span className="val">{planned}</span></div>
          <button className="row go" onClick={() => save(modeEdit('list'))}>Switch to a list of names{chev}</button></div>
      </>)}

      {!qs.length && byName && named > 0 && (<>
        <Headcount counts={counts} of={locked || planned} />
        {waiting > 0 && <button className="pill warn" data-questions-waiting onClick={onUpdates}>{questionsWaitingLine(waiting)}{chev}</button>}
        {named >= FIND_AT && <input className="field" id="findguest" type="search" placeholder="Find someone on the list" aria-label="Find someone on the list" value={find} onChange={(e) => setFind(e.target.value)} />}
        {finding ? (
          shown.length ? <div className="grp" data-names>{shown.map(row)}</div> : <p className="fine">No one here matches.</p>
        ) : (
          <div className="grp" data-groups>
            {GROUPS.filter(([k]) => counts[k] > 0).map(([k, l]) => (
              <Fragment key={k}>
                <button className="row go" data-group={k} aria-expanded={openGroup === k} onClick={() => setGroup(openGroup === k ? null : k)}>
                  <span className={'dot ' + k} aria-hidden="true" /><span className="nm">{l}</span><span className="val">{counts[k]}</span>{openGroup === k ? chevDown : chev}
                </button>
                {openGroup === k && <div className="inset" data-names>{shown.map(row)}</div>}
              </Fragment>
            ))}
          </div>
        )}
      </>)}

      {!qs.length && byName && !named && (<>
        <p className="fine">Add who’s coming, one name per line.</p>
        {addBox}
      </>)}

      {sheet === 'add' && (
        <div className="scrim" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-label="Add names" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" aria-hidden="true" />
            <div className="sheethead"><h2>Add names</h2><button className="link" onClick={() => setSheet(null)}>Done</button></div>
            {addBox}
          </div>
        </div>
      )}

      {sheet === 'more' && (
        <div className="scrim" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-label="More about guests" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" aria-hidden="true" />
            <div className="sheethead"><h2>Guests</h2><button className="link" onClick={() => setSheet(null)}>Done</button></div>
            <div className="grp"><button className="row go" data-answers onClick={() => { setSheet(null); setAnswers(true); }}><span className="nm">Your answers<small>{answersLine(ev)}</small></span>{chev}</button></div>
            <div className="grp">
              <button className="row go" data-open-invite onClick={() => { setSheet(null); onInvite(); }}><span>Your invite</span><span className={'val' + (ev.invitesSentAt ? ' ok' : '')}>{ev.invitesSentAt ? 'Sent' : 'Not sent yet'}</span>{chev}</button>
              {ev.invitesSentAt && <div className="row" data-replied><span>Who has replied</span><span className="val">{replied} of {invited}</span></div>}
              {(replyByPassed || locked > 0) && <button className="row go" data-count-row onClick={() => setSheet('lock')}><span>The count</span><span className={'val' + (locked ? ' ok' : '')}>{locked ? 'Locked at ' + locked : 'Not locked'}</span>{chev}</button>}
              <button className="row go" data-open-updates onClick={() => { setSheet(null); onUpdates(); }}><span>Updates and questions</span>{chev}</button>
            </div>
            {byName && (<div className="grp" data-more>
              <button className="row go" data-share-link onClick={shareLink}><span>Share the link</span>{chev}</button>
              {named > 0 && <button className="row go" data-download onClick={download}><span>Download the list</span>{chev}</button>}
              <button className="row go" role="switch" aria-checked={ev.hostAlerts !== false} data-alerts onClick={() => save(replyAlertsEdit(ev))}>
                <span className="nm">Tell me when someone replies<small>By email and notifications, at most once an hour</small></span>
                <span className={'switch' + (ev.hostAlerts !== false ? ' on' : '')} aria-hidden="true" />
              </button>
            </div>)}
            {shareLine && <p className="fine" role="status" data-share-line>{shareLine}</p>}
            <p className="fine">Importing a list and the QR code are in the current app for now. <a className="link" href="../hostv2/">Open the current app</a></p>
          </div>
        </div>
      )}
      {sheet === 'nudge' && <NudgeSheet ev={ev} save={save} onDone={() => setSheet(null)} />}
      {sheet === 'lock' && <LockSheet ev={ev} save={save} onDone={() => setSheet(null)} />}
      {opened && layout === 'phone' && <GuestSheet key={opened.id} ev={ev} g={opened} i={indexOf(opened)} save={save} onDone={() => setOpen(null)} />}
    </section>
    </main>
    {actionEl}
  </>);
  if (!tablet) return listPane;
  // iPad (UX_13): the list pane with its action in its bar; beside it (split) or
  // over it (compact, a pushed page) the guest.
  const detailGuest = layout === 'split' ? shownGuest : opened;
  return (
    <div className={'gsplit ' + layout} data-layout={layout}>
      <div className="listpane">{listPane}</div>
      {layout === 'split' && (
        <aside className="gdetail" data-detail aria-label="Guest">
          {detailGuest
            ? <><h2 className="dhead">{detailGuest.name}</h2><GuestDetail key={detailGuest.id} ev={ev} g={detailGuest} i={indexOf(detailGuest)} save={save} onDone={() => setOpen(null)} keys /></>
            : <p className="empty">{named ? 'Pick a name to see their reply, meal and how to reach them.' : 'Names you add show here, one at a time.'}</p>}
        </aside>
      )}
      {layout === 'compact' && detailGuest && (
        <aside className="gdetail pushedpane" data-detail aria-label={detailGuest.name}>
          <div className="navbar"><button className="backbtn" onClick={() => setOpen(null)} aria-label="Back to Guests"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Guests</button></div>
          <h2 className="dhead">{detailGuest.name}</h2>
          <GuestDetail key={detailGuest.id} ev={ev} g={detailGuest} i={indexOf(detailGuest)} save={save} onDone={() => setOpen(null)} keys />
        </aside>
      )}
    </div>
  );
}
