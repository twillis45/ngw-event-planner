// hostv4 THE DAY (owner, 11/26/2026: "Start building the day-of screens", from
// the Thanksgiving mockups). One screen that changes with the hour and keeps one
// button (UX_12):
//   before the day   the day's run and the day-of list, to read ahead;
//   morning          what's up first (or now), then the short list; the button
//                    checks the first open check, or finishes the step under way;
//   under way        help first, now and next, the sober-ride check near the end
//                    of the night, and the steps the day moved past folded into
//                    "Earlier today · N" (hostv2 marks each one "Behind");
//   after            says so; Afterward is in the current app for now.
// Today's run (every step, one line) and counter mode (large type for the
// kitchen, the screen kept on) are here too. Everything is read through
// lib/dayState and lib/dayOfEdits, and every write is one of their edits.
import { useEffect, useState } from 'react';
import { dayState } from '@app/lib/dayState';
import { todaysRos, dayOfList, dayOfTickEdit, dayOfStepEdit, cuesDoneEdit, ridesDue, nextDayOfCheck } from '@app/lib/dayOfEdits';
import { incidentPlanFor } from '@app/lib/knowledge/incidentContext';
import { clock12 } from '@app/lib/clock';
import { parseMin } from '@app/lib/dayAlerts';

const chev = <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const lowerFirst = (s) => String(s || '').replace(/^\w/, (c) => c.toLowerCase());
// The step's own words, its first clause: "Baste and rotate the bird".
export const stepTitle = (r) => {
  let s = String((r && (r.segment || r.task)) || '').split(/;| — /)[0].trim();
  if (s.length > 46 && s.includes(':')) s = s.split(':')[0];
  return s;
};
const inLine = (mins) => {
  if (mins == null || mins < 0) return '';
  const h = Math.floor(mins / 60); const m = mins % 60;
  return 'In ' + (h ? h + ' hr' + (m ? ' ' + m + ' min' : '') : m + ' min');
};

// The clock: a passed `now` (tests, renders) or the real one, every 30 seconds.
export function useNow(fixed) {
  const [t, setT] = useState(() => fixed || new Date());
  useEffect(() => {
    if (fixed) return undefined;
    const id = setInterval(() => setT(new Date()), 30000);
    return () => clearInterval(id);
  }, [fixed]);
  return fixed || t;
}

function useDay(ev, now) {
  const ros = todaysRos(ev, now);
  return { ros, st: dayState(ev, ros, now), list: dayOfList(ev) };
}

function Sheet({ title, onDone, children }) {
  return (
    <div className="scrim" onClick={onDone}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>{title}</h2><button className="link" onClick={onDone}>Done</button></div>
        {children}
      </div>
    </div>
  );
}

function HelpSheet({ ev, onDone }) {
  const plan = (() => { try { return incidentPlanFor(ev); } catch { return null; } })();
  const [open, setOpen] = useState(null);
  return (
    <Sheet title="If something goes wrong" onDone={onDone}>
      <div className="grp">
        {(plan ? plan.lines : []).map((l) => (
          <div key={l.key}>
            <button className="row go" aria-expanded={open === l.key} onClick={() => setOpen(open === l.key ? null : l.key)}><span className="nm">{l.label}</span>{chev}</button>
            {open === l.key && <p className="helptext">{l.text}</p>}
          </div>
        ))}
      </div>
      {plan && plan.boundary && <p className="fine">{plan.boundary}</p>}
    </Sheet>
  );
}

function CheckRow({ item, onTick, onDetail, attr }) {
  return (
    <div className={'row check' + (item.checked ? ' got' : '')} data-check={item.key} {...attr}>
      <button className="tickbtn" aria-pressed={item.checked} aria-label={(item.checked ? 'Reopen: ' : 'Check off: ') + item.label} onClick={onTick}><span className="box" aria-hidden="true">{item.checked ? '✓' : ''}</span></button>
      <button className="nm checknm" data-detail onClick={onDetail}>{item.label}</button>
    </div>
  );
}

export default function DayPage({ ev, save, now: fixed, status, onRun, onCounter, date }) {
  const now = useNow(fixed);
  const { ros, st, list } = useDay(ev, now);
  const [sheet, setSheet] = useState(null); // 'help' | 'list' | { detail: key }
  const [more, setMore] = useState(false);
  const start = clock12(ev.startTime);

  const tick = (item) => {
    if (item.via === 'step') return save(dayOfStepEdit(ev, item.stepIndex));
    if (item.via === 'rain' && !item.checked) return setSheet({ detail: item.key });
    return save(dayOfTickEdit(ev, item.key));
  };
  const finish = () => st.nowCue && save(cuesDoneEdit(ev, [st.nowCue.id], 'Done: ' + stepTitle(st.nowCue) + '.'));
  const markEarlier = () => save(cuesDoneEdit(ev, st.earlierCues.map((c) => c.id)));

  const detailItem = sheet && sheet.detail && list ? list.items.find((i) => i.key === sheet.detail) : null;
  const sheets = (<>
    {sheet === 'help' && <HelpSheet ev={ev} onDone={() => setSheet(null)} />}
    {sheet === 'list' && list && (
      <Sheet title={'Before guests arrive · ' + list.done + ' of ' + list.items.length} onDone={() => setSheet(null)}>
        <div className="grp">{list.items.map((i) => <CheckRow key={i.key} item={i} onTick={() => tick(i)} onDetail={() => setSheet({ detail: i.key })} />)}</div>
      </Sheet>
    )}
    {detailItem && (
      <Sheet title={detailItem.label} onDone={() => setSheet(null)}>
        {detailItem.detail && <p className="qhelp">{detailItem.detail}</p>}
        {detailItem.via === 'rain' && !detailItem.checked
          ? <p className="fine">Your rain plan is set in the current app. <a className="link" href="../hostv2/">Open the current app</a></p>
          : <button className="primary" onClick={() => { tick(detailItem); setSheet(null); }}>{detailItem.checked ? 'Reopen it' : 'Check it off'}</button>}
      </Sheet>
    )}
  </>);

  const runRow = ros.length > 0 && (
    <button className="row go" data-open-run onClick={onRun}>
      <span className="nm">{st.eventDay ? 'Today’s run' : 'The day’s run'}<small>{ros.length} steps, {clock12(ros[0].time)} to {clock12(ros[ros.length - 1].time)}</small></span>{chev}
    </button>
  );
  const helpRow = <button className="row go" data-help onClick={() => setSheet('help')}><span className="nm">If something goes wrong</span>{chev}</button>;
  const nowCard = st.nowCue && (
    <div className="nowcard" data-now>
      <p className="t">{st.nowActive ? 'Now · since ' + clock12(st.nowCue.time) : (st.started ? 'Up next · ' : 'Up first · ') + clock12(st.nowCue.time)}</p>
      <p className="what">{st.nowCue.segment || st.nowCue.task}</p>
      {st.nowActive && st.nextCue && <p className="nx">Next at {clock12(st.nextCue.time)} · {stepTitle(st.nextCue)}</p>}
    </div>
  );
  const open = list ? list.items.filter((i) => !i.checked) : [];
  const listSection = list && (
    <section data-dayof>
      <h3 className="sh">Before guests arrive · {list.done} of {list.items.length}</h3>
      <div className="grp">
        {(more ? list.items : open.slice(0, 3)).map((i) => <CheckRow key={i.key} item={i} onTick={() => tick(i)} onDetail={() => setSheet({ detail: i.key })} />)}
        {!more && list.items.length > 3 && (
          <button className="row go" data-dayof-more onClick={() => setMore(true)}><span className="nm sub2">{open.length > 3 ? (open.length - 3) + ' more' : 'All ' + list.items.length}{list.done && open.length > 3 ? ', and ' + list.done + ' done' : ''}</span>{chev}</button>
        )}
      </div>
    </section>
  );

  let body; let action = null;
  const sub = st.eventDay
    ? (st.dayCount > 1 ? 'Day ' + st.dayIndex + ' of ' + st.dayCount : 'Today') + (start ? ' · guests at ' + start : '')
    : (date || '') + (start ? ' · guests at ' + start : '');
  if (st.phase === 'after') {
    body = (<>
      <p className="qhelp" data-after>That day is done. Afterward (how many came, the thank-yous) is in the current app for now.</p>
      <div className="grp"><a className="row go" href="../hostv2/"><span className="nm">Open the current app</span>{chev}</a></div>
    </>);
  } else if (st.phase === 'before') {
    body = (<>{runRow && <div className="grp">{runRow}</div>}{listSection}</>);
  } else if (st.phase === 'done-for-today') {
    body = (<><div className="nowcard" data-now><p className="what">That’s the day. {ros.length} of {ros.length} done.</p></div><div className="grp gap">{helpRow}</div></>);
  } else if (st.phase === 'morning') {
    const nextCheck = nextDayOfCheck(ev);
    body = (<>
      {nowCard}
      <div className="grp gap">{runRow}<button className="row go" data-open-counter onClick={onCounter}><span className="nm">Counter mode<small>Large type for the kitchen. The screen stays on.</small></span>{chev}</button></div>
      {st.nowActive && list
        ? <div className="grp gap"><button className="row go" data-dayof-row onClick={() => setSheet('list')}><span className="nm">Before guests arrive</span><span className={'val' + (open.length ? ' warn' : ' ok')}>{open.length ? open.length + ' to go' : 'All set'}</span>{chev}</button></div>
        : listSection}
    </>);
    if (st.nowActive) action = <button className="primary" onClick={finish}>Done, what’s next</button>;
    else if (nextCheck) action = <button className="primary" onClick={() => tick(nextCheck)}>Check off: {lowerFirst(nextCheck.label)}</button>;
  } else {
    const rides = ridesDue(ev, ros, now);
    body = (<>
      <div className="grp">{helpRow}</div>
      <div className="gap">{nowCard}</div>
      {rides && <div className="grp gap"><CheckRow item={rides} attr={{ 'data-rides': true }} onTick={() => tick(rides)} onDetail={() => setSheet({ detail: 'rides' })} /></div>}
      {st.earlierCues.length > 0 && (
        <div className="grp gap"><div className="row" data-earlier><span className="nm sub2">Earlier today · {st.earlierCues.length} step{st.earlierCues.length === 1 ? '' : 's'}</span><button className="link" onClick={markEarlier}>Mark them done</button></div></div>
      )}
      <div className="grp gap">{runRow}</div>
    </>);
    if (st.nowCue) action = <button className="primary" onClick={finish}>{st.nowActive ? 'Done, what’s next' : 'Done: ' + lowerFirst(stepTitle(st.nowCue))}</button>;
  }

  return (<>
    <main className="view" data-view="day" data-phase={st.phase}>
      <h1 className="lt">The Day</h1>
      <p className="sub">{sub}</p>
      {status}
      {body}
    </main>
    {action && <div className="action">{action}</div>}
    {sheets}
  </>);
}

// TODAY'S RUN: every step, one line each; done quiet, now marked, later plain.
export function RunPage({ ev, save, now: fixed, nav, status }) {
  const now = useNow(fixed);
  const { ros, st } = useDay(ev, now);
  return (<>
    <main className="view" data-view="run">
      {nav}
      {status}
      <div className="grp run" data-run>
        {ros.map((r, i) => {
          // A step the day moved past without a tick is "past": quiet, never "Behind".
          const state = r.done ? 'done' : st.eventDay && r === st.nowCue && st.nowActive ? 'now' : st.earlierCues.includes(r) ? 'past' : 'later';
          return (
            <div className={'row s-' + state} key={r.id || i} data-step={r.id || i} data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
              <span className={'mk s-' + state} aria-hidden="true">{state === 'done' ? '✓' : ''}</span>
              <span className="tm">{clock12(r.time)}</span><span className="nm">{stepTitle(r)}</span>
            </div>
          );
        })}
      </div>
    </main>
    {st.eventDay && st.nowActive && <div className="action"><button className="primary" onClick={() => save(cuesDoneEdit(ev, [st.nowCue.id], 'Done: ' + stepTitle(st.nowCue) + '.'))}>Done, what’s next</button></div>}
  </>);
}

// COUNTER MODE: propped on the counter, read from three feet. The screen is
// kept on while it is open (Screen Wake Lock, where the browser allows it).
export function CounterMode({ ev, save, now: fixed, onLeave }) {
  const now = useNow(fixed);
  const { st } = useDay(ev, now);
  useEffect(() => {
    let lock = null; let gone = false;
    (async () => { try { if (navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); if (gone) lock.release(); } } catch { /* not allowed here: the screen may sleep */ } })();
    return () => { gone = true; try { if (lock) lock.release(); } catch { /* already released */ } };
  }, []);
  const cue = st.nowCue;
  const next = st.nowActive ? st.nextCue : null;
  const nextMin = next ? parseMin(next.time) : null;
  return (
    <div className="counter" data-counter role="dialog" aria-label="Counter mode">
      <div className="ctop"><span>{ev.name}</span><span className="cclock">{clock12(String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'))}</span></div>
      {cue ? (<>
        <p className="clbl">{st.nowActive ? 'Now · since ' + clock12(cue.time) : 'Up first · ' + clock12(cue.time)}</p>
        <p className="cbig" data-big>{cue.segment || cue.task}</p>
        {next && <div className="cnext"><div className="cin" data-in>{inLine(nextMin - st.nowMin)}</div><div className="cwhat">{clock12(next.time)} · {stepTitle(next)}</div></div>}
      </>) : <p className="cbig" data-big>{st.allDone ? 'That’s the day.' : 'Nothing on the schedule yet.'}</p>}
      {cue && st.nowActive && <button className="primary cdone" onClick={() => save(cuesDoneEdit(ev, [cue.id], 'Done: ' + stepTitle(cue) + '.'))}>Done, what’s next</button>}
      <div className="cfoot"><button className="link" onClick={onLeave}>Leave counter mode</button></div>
    </div>
  );
}
