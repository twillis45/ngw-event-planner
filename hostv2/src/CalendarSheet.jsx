// CalendarSheet — "Calendar" (owner, 11/16/2026: "yes to the calendar view.
// Week and month toggle").
//
// A VIEW of the plan by date (lib/planCalendar): checklist steps on the day
// their lead puts them, vendors' open promises on their due dates, and the
// event day. Nothing is typed in here, so it cannot disagree with the
// checklist. Week is a day-by-day list (made for a phone); Month is a grid
// whose days open their list below it.
import { useMemo, useState } from 'react';
import { calendarItems, weekDays, monthWeeks, shiftAnchor, rangeLabel } from '@app/lib/planCalendar';
import { localISO, getToday } from '@app/lib/dates';

const VIEW_KEY = 'ngw-calendar-view';
const readView = () => { try { return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week'; } catch { return 'week'; } };
const dayName = (iso, opts) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', opts);

function Item({ it }) {
  return (
    <li className={'cal-item cal-' + it.kind + (it.done ? ' is-done' : '') + (it.overdue ? ' is-late' : '')} data-kind={it.kind}>
      <span className="cal-dot" aria-hidden="true" />
      <span className="cal-text">{it.label}</span>
      {it.done ? <span className="cal-tag">Done</span> : it.overdue ? <span className="cal-tag">Overdue</span> : null}
    </li>
  );
}

export default function CalendarSheet({ event, onOpenChecklist }) {
  const today = localISO(getToday());
  const { items, undated } = useMemo(() => calendarItems(event), [event]);
  const byDate = useMemo(() => {
    const m = {};
    for (const it of items) (m[it.date] = m[it.date] || []).push(it);
    return m;
  }, [items]);
  const [view, setView] = useState(readView);
  const [anchor, setAnchor] = useState(() => (event.date && event.date < today ? event.date : today));
  const [picked, setPicked] = useState(anchor);
  const pick = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* a convenience only */ } };
  const move = (n) => { const a = shiftAnchor(anchor, view, n); setAnchor(a); if (view === 'month') setPicked(a); };
  const goToday = () => { setAnchor(today); setPicked(today); };

  return (
    <div data-calendar>
      <div className="cal-bar">
        <div className="cal-toggle" role="group" aria-label="Calendar view">
          <button className={'mini' + (view === 'week' ? ' on' : '')} aria-pressed={view === 'week'} onClick={() => pick('week')}>Week</button>
          <button className={'mini' + (view === 'month' ? ' on' : '')} aria-pressed={view === 'month'} onClick={() => pick('month')}>Month</button>
        </div>
        <button className="mini" onClick={goToday}>Today</button>
      </div>
      <div className="cal-nav">
        <button className="mini" aria-label={view === 'month' ? 'Previous month' : 'Previous week'} onClick={() => move(-1)}>‹</button>
        <strong className="cal-range" data-cal-range aria-live="polite">{rangeLabel(anchor, view)}</strong>
        <button className="mini" aria-label={view === 'month' ? 'Next month' : 'Next week'} onClick={() => move(1)}>›</button>
      </div>

      {view === 'week' ? (
        <ol className="cal-week" data-cal-week>
          {weekDays(anchor).map((d) => (
            <li key={d} className={'cal-day' + (d === today ? ' is-today' : '')} data-date={d}>
              <div className="cal-day-head">
                <span>{dayName(d, { weekday: 'short' })}</span>
                <span className="cal-day-num">{dayName(d, { month: 'short', day: 'numeric' })}</span>
                {d === today && <span className="cal-today">Today</span>}
              </div>
              {(byDate[d] || []).length
                ? <ul className="cal-items">{byDate[d].map((it) => <Item key={it.id} it={it} />)}</ul>
                : <p className="cal-empty">Nothing due</p>}
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="cal-month" role="grid" aria-label={rangeLabel(anchor, 'month')} data-cal-month>
            <div className="cal-row cal-dow" role="row">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <span key={i} role="columnheader" aria-hidden="true">{w}</span>)}
            </div>
            {monthWeeks(anchor).map((wk, i) => (
              <div className="cal-row" role="row" key={i}>
                {wk.map((c) => {
                  const its = byDate[c.date] || [];
                  const hasEvent = its.some((x) => x.kind === 'event');
                  const late = its.some((x) => x.overdue);
                  return (
                    <button key={c.date} role="gridcell" type="button" data-date={c.date}
                      className={'cal-cell' + (c.inMonth ? '' : ' is-out') + (c.date === today ? ' is-today' : '') + (c.date === picked ? ' is-picked' : '') + (hasEvent ? ' has-event' : '')}
                      aria-label={dayName(c.date, { weekday: 'long', month: 'long', day: 'numeric' }) + (its.length ? `, ${its.length} item${its.length === 1 ? '' : 's'}` : ', nothing due')}
                      aria-pressed={c.date === picked} onClick={() => setPicked(c.date)}>
                      <span className="cal-num">{Number(c.date.slice(8))}</span>
                      {its.length > 0 && <span className={'cal-count' + (late ? ' is-late' : '')}>{its.length}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="cal-picked" data-cal-picked>
            <div className="shelf-label" style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>{dayName(picked, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            {(byDate[picked] || []).length
              ? <ul className="cal-items">{byDate[picked].map((it) => <Item key={it.id} it={it} />)}</ul>
              : <p className="cal-empty">Nothing due that day.</p>}
          </div>
        </>
      )}

      <div className="cal-foot">
        <p className="grounding" style={{ margin: 0 }}>
          From your checklist and your vendors — change a step there and it moves here.
          {undated > 0 ? ` ${undated} step${undated === 1 ? ' has' : 's have'} no date and ${undated === 1 ? 'is' : 'are'} only in the checklist.` : ''}
        </p>
        {onOpenChecklist && <button className="mini" onClick={onOpenChecklist}>Open the checklist</button>}
      </div>
    </div>
  );
}
