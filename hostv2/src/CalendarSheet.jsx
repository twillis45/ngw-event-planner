// CalendarSheet — "Calendar" (owner, 11/16/2026: "yes to the calendar view.
// Week and month toggle").
//
// A VIEW of the plan by date (lib/planCalendar): checklist steps on the day
// their lead puts them, vendors' open promises on their due dates, and the
// event day. Nothing is typed in here, so it cannot disagree with the
// checklist. Week is a day-by-day list (made for a phone); Month is a grid
// whose days open their list below it.
import { useMemo, useState } from 'react';
import { calendarItems, weekDays, monthWeeks, shiftAnchor, rangeLabel, calendarIcs } from '@app/lib/planCalendar';
import { localISO, getToday } from '@app/lib/dates';
import { track as trackEvent, EVENTS as ANALYTICS } from '@app/lib/analytics';
import { calendarFeedUrl, calendarWebcalUrl, newCalendarCode, isCalendarFeedConfigured } from '@app/lib/api/calendarFeed';

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

// "Add to my calendar" (11/16/2026): the dated plan as one .ics file. On a
// phone it opens the calendar app's own "Add all" screen; on a computer it
// downloads, and the calendar app opens it.
function addToCalendar(event) {
  const blob = new Blob([calendarIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = (String(event.name || 'plan').replace(/[’']/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'plan') + '-plan.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
  try { trackEvent(ANALYTICS.CALENDAR_ADDED, { how: 'file' }); } catch (_e) { /* counter only */ }
}

// SUBSCRIBE (owner, 11/16/2026: "need subscription calendar"): one private
// link the host's calendar app re-reads by itself. Needs a saved plan (the
// feed reads it), so a signed-out host is told so and gets no link.
function Subscribe({ event, signedIn, onSave, onLine }) {
  const [confirmOff, setConfirmOff] = useState(false);
  const code = String(event.calendarCode || '').trim();
  if (!isCalendarFeedConfigured()) return null;
  const https = calendarFeedUrl(code);
  const copy = async () => {
    try { await navigator.clipboard.writeText(https); onLine('Calendar address copied.'); }
    catch { onLine('Copy didn’t work here — press and hold the address to copy it.'); }
  };
  return (
    <div className="cal-sub" data-cal-subscribe>
      <div className="shelf-label" style={{ margin: '0 0 var(--sp-1)' }}>Keep it in your calendar</div>
      {!signedIn ? (
        <p className="grounding" data-cal-sub-signed-out style={{ margin: 0 }}>Sign in and keep this plan first — your calendar app reads the saved plan.</p>
      ) : !code ? (
        <>
          <p className="grounding" style={{ margin: '0 0 var(--sp-2)' }}>Subscribe once and your calendar app keeps these dates up to date as the plan changes.</p>
          <button className="mini" data-cal-sub-on onClick={() => { onSave({ calendarCode: newCalendarCode() }, 'Calendar subscription is on.'); try { trackEvent(ANALYTICS.CALENDAR_ADDED, { how: 'subscription' }); } catch (_e) { /* counter only */ } }}>Subscribe in my calendar app</button>
        </>
      ) : (
        <>
          <div className="actions-row" style={{ flexWrap: 'wrap', margin: '0 0 var(--sp-2)' }}>
            <a className="mini" data-cal-sub-apple href={calendarWebcalUrl(code)} style={{ textDecoration: 'none' }}>Subscribe on iPhone or Mac</a>
            <button className="mini" data-cal-sub-copy onClick={copy}>Copy the address</button>
          </div>
          <p className="fam-url" data-cal-sub-url>{https}</p>
          <p className="grounding" style={{ margin: 'var(--sp-2) 0 0' }}>
            Google Calendar: Other calendars → From URL, then paste the address. Outlook: Add calendar → Subscribe from web.
            Calendar apps check for changes on their own schedule — Apple every few hours, Google can take up to a day.
          </p>
          {confirmOff ? (
            <div className="actions-row" style={{ marginTop: 'var(--sp-2)' }}>
              <button className="mini danger" data-cal-sub-off onClick={() => { setConfirmOff(false); onSave({ calendarCode: null }, 'Calendar subscription is off — the address won’t work anymore.'); }}>Turn it off</button>
              <button className="mini" onClick={() => setConfirmOff(false)}>Keep it on</button>
            </div>
          ) : (
            <button className="mini" style={{ marginTop: 'var(--sp-2)' }} onClick={() => setConfirmOff(true)}>Turn off the subscription</button>
          )}
        </>
      )}
    </div>
  );
}

export default function CalendarSheet({ event, onOpenChecklist, signedIn = false, onSave, onLine = () => {} }) {
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
        {items.length > 0 && (
          <>
            <button className="mini" data-cal-ics onClick={() => addToCalendar(event)}>Add to my calendar</button>
            <p className="grounding" style={{ margin: 0 }}>
              Puts the event day and every open step into Apple, Google or Outlook Calendar. It’s a one-time copy — if the plan changes, add it again.
            </p>
          </>
        )}
        {onSave && <Subscribe event={event} signedIn={signedIn} onSave={onSave} onLine={onLine} />}
        {onOpenChecklist && <button className="mini" onClick={onOpenChecklist}>Open the checklist</button>}
      </div>
    </div>
  );
}
