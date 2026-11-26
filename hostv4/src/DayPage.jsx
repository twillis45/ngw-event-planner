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
import { todaysRos, dayOfList, dayOfTickEdit, dayOfStepEdit, cuesDoneEdit, ridesDue, nextDayOfCheck, runningLate, addMomentEdit } from '@app/lib/dayOfEdits';
import { suggestableMoments } from '@app/lib/momentLibrary';
import { incidentPlanFor } from '@app/lib/knowledge/incidentContext';
import { clock12 } from '@app/lib/clock';
import { parseMin, computeDayAlerts } from '@app/lib/dayAlerts';
import { dayWeather, guestTravelMessage, isWeatherConfigured, geocodeVenue, getEventWeatherSpan, weatherImpactByEventPhase, rainAwareSummary, rainPlanStatus } from '@app/lib/weather';
import { placeIsOutdoors } from '@app/lib/placeIntelligence';
import { venueGeoQuery } from '@app/lib/venueFor';
import { daysUntil, daysUntilEnd } from '@app/lib/dates';
import { buildDayBeforePlan, dayWeatherLabel } from '@app/lib/dayBefore';
import { stepToggleEdit, tonightsSteps } from '@app/lib/stepToggle';
import { playbookFoodPlan } from '@app/lib/playbooks';
import { isReconfirmable } from '@app/lib/workstreams';
import { crewRows, helperJobMessage, helperLinkPatch, helperHandoffPatch, helperMintWhy, helperPageBase } from '@app/lib/helperJob';
import { mintHelperLinkResult, isHelperLinkApiConfigured, fetchHelperConfirmations, emailHelperJob, helperEmailWords } from '@app/lib/api/helperLink';
import { draftHelperBrief, draftGuestBrief, draftParkingInstructions } from '@app/lib/doItForMe';
import { venueFor } from '@app/lib/venueFor';
import { checkInEdit } from '@app/lib/guestEdits';
import { tableNeeds } from '@app/lib/dietRows';
import { publicAppUrl } from '@app/lib/publicAppUrl';
import { readProfile, useSendReady, NotReady } from './sendKit.jsx';

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

// THE DAY'S FORECAST (owner, 11/26/2026: "Yes build the weather line and rain
// actions"): the one fetch hostv2 makes (geocode the venue's query, then the
// span), live only, within the 14 days a forecast reaches. A passed `forecast`
// (tests, renders) is used as it is; null means none.
export function useForecast(ev, given) {
  const [row, setRow] = useState(null);
  useEffect(() => {
    if (given !== undefined) return undefined;
    let dead = false;
    setRow(null);
    (async () => {
      try {
        if (!isWeatherConfigured() || !ev.date) return;
        const d = daysUntil(ev.date); const dEnd = daysUntilEnd(ev);
        if (d == null || d > 14 || (dEnd == null ? d < 0 : dEnd < 0)) return;
        const q = venueGeoQuery(ev);
        if (!q) return;
        const at = await geocodeVenue(q);
        if (dead || !at) return;
        const span = await getEventWeatherSpan(at.lat, at.lon, ev);
        if (!dead && span) setRow(span.primary);
      } catch { /* no forecast beats a wrong one */ }
    })();
    return () => { dead = true; };
  }, [ev.id, ev.date, ev.endDate, given]); // eslint-disable-line react-hooks/exhaustive-deps
  return given !== undefined ? given : row;
}

function useDay(ev, now) {
  const ros = todaysRos(ev, now);
  return { ros, st: dayState(ev, ros, now), list: dayOfList(ev) };
}

function Sheet({ title, onDone, children }) {
  // Escape closes it, as Done does (live check of 31b2dd20, 834 wide).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDone(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);
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

export default function DayPage({ ev, save, now: fixed, status, onRun, onCounter, onGuests, onCrew, onUpdates, date, forecast }) {
  const now = useNow(fixed);
  const { ros, st, list } = useDay(ev, now);
  const wxRow = useForecast(ev, forecast);
  const wx = (() => { try { return dayWeather(wxRow); } catch { return null; } })();
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState(null); // 'help' | 'list' | { detail: key }
  const [more, setMore] = useState(false);
  const [late, setLate] = useState(false);
  const [hereOpen, setHereOpen] = useState(false);
  const [momentAt, setMomentAt] = useState(null); // the time field while the moment sheet is open
  const [tell, setTell] = useState(false);
  const start = clock12(ev.startTime);

  const tick = (item) => {
    if (item.via === 'step') return save(dayOfStepEdit(ev, item.stepIndex));
    if (item.via === 'rain' && !item.checked) return setSheet({ detail: item.key });
    return save(dayOfTickEdit(ev, item.key));
  };
  const finish = () => st.nowCue && save(cuesDoneEdit(ev, [st.nowCue.id], 'Done: ' + stepTitle(st.nowCue) + '.'));
  const markEarlier = () => save(cuesDoneEdit(ev, st.earlierCues.map((c) => c.id)));

  const detailItem = sheet && sheet.detail && list ? list.items.find((i) => i.key === sheet.detail) : null;
  const ticked = (ev.safetyChecked && typeof ev.safetyChecked === 'object') ? ev.safetyChecked : {};
  const note = wx && wx.arrival ? guestTravelMessage(ev, wx.arrival) : '';
  const copyNote = async () => { try { await navigator.clipboard.writeText(note); setCopied(true); } catch { setCopied(false); } };
  // THE DAY'S WEATHER: the line for any event, and what it asks of arrivals.
  // OUTDOOR WEATHER (B5): hostv2's impact read, for an outdoor event, with the
  // rain plan in mind; indoors the arrivals card above is the whole story.
  const hasRainPlan = (() => { try { return rainPlanStatus(ev).hasPlan; } catch { return false; } })();
  const impact = (() => {
    if (!wxRow) return null;
    try { if (!placeIsOutdoors(ev)) return null; const im = weatherImpactByEventPhase(ev, wxRow); return im && im.hasImpact ? im : null; } catch { return null; }
  })();
  const weatherCard = wx && (
    <div className="grp gap" data-day-weather={wx.arrival ? wx.arrival.kind : 'clear'}>
      <div className="row"><span className="nm">{wx.line}{wx.arrival && <small>{wx.arrival.advice}</small>}</span></div>
      {impact && <div className="row" data-wx-impact><span className="nm">{rainAwareSummary(impact.headline, hasRainPlan)}</span></div>}
      {impact && !hasRainPlan && <a className="row go" data-wx-rainplan href="../hostv2/"><span className="nm">Set your rain plan<small>Where everyone goes if it rains. In the current app for now.</small></span>{chev}</a>}
      {wx.arrival && wx.arrival.checks.map((c) => (
        <CheckRow key={c.key} item={{ key: c.key, label: c.label, checked: !!ticked[c.key] }}
          onTick={() => save(dayOfTickEdit(ev, c.key, c.label))} onDetail={() => save(dayOfTickEdit(ev, c.key, c.label))} />
      ))}
      {wx.arrival && <button className="row go" data-wx-note onClick={() => { setCopied(false); setSheet('note'); }}><span className="nm">Weather note to guests</span>{chev}</button>}
    </div>
  );
  // DAY ALERTS (B5): hostv2's alert engine, any day of the event; the most
  // urgent above Now, all of them one tap away. The "next up" heads-up is the
  // Now card's job, so only "Can’t wait" and "Watch" show here.
  const RANK = { critical: 0, warning: 1 };
  const alerts = st.eventDay
    ? (() => { try { return (computeDayAlerts(ev) || []).filter((a) => a.tier in RANK).sort((a, b) => RANK[a.tier] - RANK[b.tier]); } catch { return []; } })()
    : [];
  const tierWord = (a) => (a.tier === 'critical' ? 'Can’t wait' : 'Watch');
  const alertLine = alerts[0] && (
    <div className="grp gap alertgrp"><button className={'row go alert ' + alerts[0].tier} data-alert onClick={() => setSheet('alerts')}>
      <span className="nm"><b className="tier">{tierWord(alerts[0])}</b> {alerts[0].headline}{alerts.length > 1 && <small>{alerts.length - 1} more</small>}</span>{chev}
    </button></div>
  );
  // A MOMENT WORTH A SPOT (B7): the type's next moment not yet on the run (the
  // list hostv2 offers), one row under Now; she picks its time, the next
  // step's by default, and it joins the run (lib/dayOfEdits addMomentEdit).
  const moment = st.phase !== 'after' && st.phase !== 'done-for-today'
    ? (() => { try { return suggestableMoments(ev.type, ros)[0] || null; } catch { return null; } })()
    : null;
  const momentDefault = ((st.nextCue || st.nowCue || ros[0] || {}).time) || '';
  const momentRow = moment && (
    <div className="grp gap"><button className="row go" data-moment onClick={() => setMomentAt(momentDefault)}>
      <span className="nm">Worth a spot: {moment.label}<small>Not on today’s run yet.</small></span>{chev}
    </button></div>
  );

  const sheets = (<>
    {moment && momentAt !== null && (
      <Sheet title={moment.label} onDone={() => setMomentAt(null)}>
        <p className="qhelp">{moment.owner ? 'Usually led by: ' + moment.owner + '.' : 'A moment worth a spot on the day.'}{moment.note ? ' ' + moment.note : ''}</p>
        <input className="field" type="time" aria-label="When" data-moment-time value={momentAt} onChange={(e) => setMomentAt(e.target.value)} />
        <button className="primary" data-moment-add onClick={() => { if (save(addMomentEdit(ev, moment, momentAt, now))) setMomentAt(null); }}>Add it to the run</button>
      </Sheet>
    )}
    {late && <LateSheet ev={ev} save={save} now={now} onDone={() => setLate(false)} onUpdates={onUpdates} />}
    {tell && <TellSheet ev={ev} onDone={() => setTell(false)} onUpdates={onUpdates} />}
    {sheet === 'help' && <HelpSheet ev={ev} onDone={() => setSheet(null)} />}
    {sheet === 'alerts' && (
      <Sheet title="Needs you today" onDone={() => setSheet(null)}>
        <div className="grp">{alerts.map((a) => (
          <div key={a.id} className={'row alert ' + a.tier} data-alert-row={a.id}>
            <span className="nm"><b className="tier">{tierWord(a)}</b> {a.headline}{a.move && <small>{a.move}</small>}</span>
            {a.navTo === 'Guests' && onGuests
              ? <button className="link act" data-alert-go onClick={() => { setSheet(null); onGuests(); }}>Guests</button>
              : <a className="link act" data-alert-go href="../hostv2/">Open</a>}
          </div>
        ))}</div>
        {alerts.some((a) => a.navTo !== 'Guests') && <p className="fine">Open takes you to the current app, where that part lives for now.</p>}
      </Sheet>
    )}
    {sheet === 'note' && note && (
      <Sheet title="Weather note to guests" onDone={() => setSheet(null)}>
        <p className="qhelp" data-wx-note-text>{note}</p>
        <button className="primary" onClick={copyNote}>{copied ? 'Copied' : 'Copy the note'}</button>
        <p className="fine">Paste it into your group text, or post it to everyone’s invite from Updates.</p>
      </Sheet>
    )}
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
  // YOUR DAY CREW (B3): one row, with how many helpers have their link.
  const crew = (() => { try { return crewRows(ev); } catch { return []; } })();
  const crewRow = crew.length > 0 && onCrew && (
    <button className="row go" data-open-crew onClick={onCrew}>
      <span className="nm">Your day crew</span><span className="val">{crew.filter((c) => c.linkSent).length} of {crew.length} sent</span>{chev}
    </button>
  );
  // RUNNING LATE (B8): once the day is under way (a step has begun).
  const lateRow = st.started && (st.phase === 'morning' || st.phase === 'under-way') && (
    <button className="row go" data-late onClick={() => setLate(true)}><span className="nm">Running late?<small>Move the rest of today later, once.</small></span>{chev}</button>
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

  // WHO'S HERE (B6): once guests are due, a list plan's yes guests to tap in
  // (lib/guestEdits checkInEdit); who is here folds into one row; anyone not
  // here yet with a phone is one tap to text. Maybes are named under it.
  const coming = (ev.guests || []).filter((g) => g && g.id && /^y/i.test(String(g.rsvp || '')));
  const maybes = (ev.guests || []).filter((g) => g && /^m/i.test(String(g.rsvp || '')));
  const here = coming.filter((g) => g.checkedIn);
  const notYet = coming.filter((g) => !g.checkedIn);
  const tapIn = (g) => save(checkInEdit(ev, g.id, now.toISOString()));
  const hereRow = (g) => {
    const digits = String(g.phone || '').replace(/[^+\d]/g, '');
    return (
      <div key={g.id} className={'row check' + (g.checkedIn ? ' got' : '')} data-here-row={g.id}>
        <button className="tickbtn" data-tick aria-pressed={!!g.checkedIn} aria-label={(g.checkedIn ? 'Not here: ' : 'Here: ') + g.name} onClick={() => tapIn(g)}><span className="box" aria-hidden="true">{g.checkedIn ? '✓' : ''}</span></button>
        <span className="nm">{g.name}</span>
        {!g.checkedIn && digits && <a className="link act" data-here-text href={'sms:' + digits}>Text</a>}
      </div>
    );
  };
  const whosHere = st.doorsOpen && coming.length > 0 && (
    <section data-whos-here>
      <h3 className="sh">Who’s here · {here.length} of {coming.length}</h3>
      <div className="grp">
        {here.length > 0 && <button className="row go" data-here-done aria-expanded={hereOpen} onClick={() => setHereOpen(!hereOpen)}><span className="nm">{here.length} here</span><span className="val">{hereOpen ? 'Hide' : 'Show'}</span></button>}
        {hereOpen && here.map(hereRow)}
        {notYet.map(hereRow)}
      </div>
      {maybes.length > 0 && <p className="fine">Maybe: {maybes.map((g) => g.name).join(', ')}</p>}
    </section>
  );
  // AT THE TABLE (B6): who needs what, from the guest list (lib/dietRows).
  const needs = st.doorsOpen ? (() => { try { return tableNeeds(ev); } catch { return []; } })() : [];
  const atTable = needs.length > 0 && (
    <section data-at-table>
      <h3 className="sh">At the table</h3>
      <div className="grp">{needs.map((n) => <div key={n.need} className="row" data-table-need><span className="nm">{n.need}<small>{n.names.join(', ')}</small></span></div>)}</div>
    </section>
  );

  let body; let action = null;
  // The day before (B2): buildDayBeforePlan's window, 1–2 days out, read with
  // the live forecast so tomorrow's weather rides in it.
  const eve = (() => {
    if (st.phase !== 'before') return null;
    let db = null;
    try { db = buildDayBeforePlan(ev, now, wxRow); } catch { db = null; }
    if (!db || !db.applicable || db.daysOut < 1) return null;
    const sec = (k) => (db.sections || []).find((x) => x.key === k) || null;
    const rows = [];
    const cnt = sec('count');
    if (cnt) rows.push({ key: 'count', label: 'Final guest count', val: 'Not settled', go: onGuests });
    const shop = sec('shopping');
    if (shop && shop.open) { const l = Number(shop.listLeft) || 0; const g = Number(shop.openGear) || 0; rows.push({ key: 'shopping', label: 'Still to get', val: l ? l + ' item' + (l === 1 ? '' : 's') : g + ' rental' + (g === 1 ? '' : 's') }); }
    const vend = sec('vendors');
    if ((ev.vendors || []).some(isReconfirmable) || (vend && vend.open)) rows.push({ key: 'vendors', label: 'Reconfirm your vendors', val: vend && vend.open ? vend.open + ' to lock in' : 'Check in' });
    const help = sec('helpers');
    if (help && help.open) rows.push({ key: 'helpers', label: 'People bringing things', val: help.open + ' to confirm' });
    const rain = sec('rain');
    if (rain && rain.open) rows.push({ key: 'rain', label: 'Rain backup', val: 'Not set' });
    return { daysOut: db.daysOut, rows, tonight: db.daysOut === 1 ? tonightsSteps(ev, now) : [] };
  })();
  const sub = st.eventDay
    ? (st.dayCount > 1 ? 'Day ' + st.dayIndex + ' of ' + st.dayCount : 'Today') + (start ? ' · guests at ' + start : '')
    : (eve && eve.daysOut === 1 ? 'Tomorrow' : (date || '')) + (start ? ' · guests at ' + start : '');
  if (st.phase === 'after') {
    body = (<>
      <p className="qhelp" data-after>That day is done. Afterward (how many came, the thank-yous) is in the current app for now.</p>
      <div className="grp"><a className="row go" href="../hostv2/"><span className="nm">Open the current app</span>{chev}</a></div>
    </>);
  } else if (st.phase === 'before' && eve) {
    // THE DAY BEFORE (B2, 11/26/2026): tonight's steps, then what the day-before
    // plan (lib/dayBefore, hostv2's) still has open. Ticks are lib/stepToggle.
    const foodList = () => { try { return (playbookFoodPlan(ev) || {}).list || []; } catch { return []; } };
    const tickStep = (s) => save(stepToggleEdit(ev, s.index, foodList()));
    body = (<>
      {weatherCard && <><h3 className="sh">{dayWeatherLabel(eve.daysOut)}</h3>{weatherCard}</>}
      {eve.tonight.length > 0 && (
        <section data-tonight>
          <h3 className="sh">Tonight</h3>
          <div className="grp">{eve.tonight.map((s) => <CheckRow key={s.index} item={{ key: String(s.id || s.index), label: s.task, checked: false }} onTick={() => tickStep(s)} onDetail={() => tickStep(s)} />)}</div>
        </section>
      )}
      {eve.rows.length > 0 && (
        <section data-before-tomorrow>
          <h3 className="sh">Before {eve.daysOut === 1 ? 'tomorrow' : 'the day'}</h3>
          <div className="grp">{eve.rows.map((r) => (r.go
            ? <button key={r.key} className="row go" data-db-row={r.key} onClick={r.go}><span className="nm">{r.label}</span><span className="val warn">{r.val}</span>{chev}</button>
            : <a key={r.key} className="row go" data-db-row={r.key} href="../hostv2/"><span className="nm">{r.label}</span><span className="val warn">{r.val}</span>{chev}</a>))}
          </div>
          <div className="grp gap"><button className="row go" data-tell onClick={() => setTell(true)}><span className="nm">Tell your guests<small>The details, a parking note, or an update on their invite.</small></span>{chev}</button></div>
          {eve.rows.some((r) => !r.go) && <p className="fine">The store run, vendors, helpers and the rain backup open in the current app for now.</p>}
        </section>
      )}
      {(runRow || crewRow) && <div className="grp gap">{runRow}{crewRow}</div>}
      {listSection}
    </>);
    if (eve.tonight[0]) action = <button className="primary" onClick={() => tickStep(eve.tonight[0])}>Done: {lowerFirst(stepTitle(eve.tonight[0]))}</button>;
  } else if (st.phase === 'before') {
    body = (<>{weatherCard}{runRow && <div className="grp gap">{runRow}</div>}{listSection}</>);
  } else if (st.phase === 'done-for-today') {
    body = (<><div className="nowcard" data-now><p className="what">That’s the day. {ros.length} of {ros.length} done.</p></div><div className="grp gap">{helpRow}</div></>);
  } else if (st.phase === 'morning') {
    const nextCheck = nextDayOfCheck(ev);
    body = (<>
      {alertLine}
      {nowCard}
      {momentRow}
      {weatherCard}
      <div className="grp gap">{runRow}{crewRow}{lateRow}<button className="row go" data-tell onClick={() => setTell(true)}><span className="nm">Tell your guests</span>{chev}</button><button className="row go" data-open-counter onClick={onCounter}><span className="nm">Counter mode<small>Large type for the kitchen. The screen stays on.</small></span>{chev}</button></div>
      {st.nowActive && list
        ? <div className="grp gap"><button className="row go" data-dayof-row onClick={() => setSheet('list')}><span className="nm">Before guests arrive</span><span className={'val' + (open.length ? ' warn' : ' ok')}>{open.length ? open.length + ' to go' : 'All set'}</span>{chev}</button></div>
        : listSection}
    </>);
    if (st.nowActive) action = <button className="primary" onClick={finish}>Done, what’s next</button>;
    else if (nextCheck) action = <button className="primary" onClick={() => tick(nextCheck)}>Check off: {lowerFirst(nextCheck.label)}</button>;
  } else {
    const rides = ridesDue(ev, ros, now);
    body = (<>
      <div className="grp">{helpRow}{lateRow}</div>
      {alertLine}
      <div className="gap">{nowCard}</div>
      {momentRow}
      {weatherCard}
      {rides && <div className="grp gap"><CheckRow item={rides} attr={{ 'data-rides': true }} onTick={() => tick(rides)} onDetail={() => setSheet({ detail: 'rides' })} /></div>}
      {whosHere}
      {atTable}
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
      {/* Adding, moving or timing a step is in the current app until the run can be edited here. */}
      <div className="grp gap"><a className="row go" data-edit-run href="../hostv2/"><span className="nm">Change the run in the current app<small>Add, move or time a step.</small></span>{chev}</a></div>
    </main>
    {st.eventDay && st.nowActive && <div className="action"><button className="primary" onClick={() => save(cuesDoneEdit(ev, [st.nowCue.id], 'Done: ' + stepTitle(st.nowCue) + '.'))}>Done, what’s next</button></div>}
  </>);
}

// COUNTER MODE: propped on the counter, read from three feet. The screen is
// kept on while it is open (Screen Wake Lock, where the browser allows it).
export function CounterMode({ ev, save, now: fixed, onLeave }) {
  const [late, setLate] = useState(false);
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
      <div className="cfoot"><button className="link" data-late onClick={() => setLate(true)}>Running late</button><button className="link" onClick={onLeave}>Leave counter mode</button></div>
      {late && <LateSheet ev={ev} save={save} now={now} onDone={() => setLate(false)} />}
    </div>
  );
}

// YOUR DAY CREW (B3, 11/26/2026; the Thanksgiving mockup, 8:00 AM). Each helper
// gets a link to their own job, nothing else. The send is hostv2's
// (lib/helperJob): the link is made on the server with the account hostv2
// signed in, then a text to their phone or a copy; the link and the handoff are
// recorded; the app emails it when they have an address.
export function CrewPage({ ev, save, nav, status }) {
  const [answers, setAnswers] = useState({});
  const [send, setSend] = useState(null); // { id, busy } | { id, error } | { id, m }
  const [mail, setMail] = useState(null);
  const [copied, setCopied] = useState(false);
  const [brief, setBrief] = useState(false);
  const linked = Array.isArray(ev.helperLinkIds) && ev.helperLinkIds.length > 0;
  useEffect(() => {
    if (!isHelperLinkApiConfigured() || !linked) return undefined;
    let live = true;
    fetchHelperConfirmations(ev.id).then((rows) => {
      if (!live || !Array.isArray(rows)) return;
      const m = {}; for (const a of rows) { const k = String(a && a.helper_key); if (k && !m[k]) m[k] = a; }
      setAnswers(m);
    }).catch(() => {});
    return () => { live = false; };
  }, [ev.id, linked]);
  const rows = (() => { try { return crewRows(ev, answers); } catch { return []; } })();
  const row = send ? rows.find((r) => r.helperId === send.id) : null;
  const handoff = (channel) => save({ patch: helperHandoffPatch(ev, { helperId: row.helperId, helperName: row.name }, channel) });

  const start = async (r) => {
    setSend({ id: r.helperId, busy: true }); setMail(null); setCopied(false);
    let base;
    try { base = helperPageBase(publicAppUrl()); } catch { setSend({ id: r.helperId, error: 'The public link address is missing, so ' + r.first + '’s link can’t be made. Nothing was sent.' }); return; }
    const res = await mintHelperLinkResult(ev.id, r.name);
    if (!res.ok) { setSend({ id: r.helperId, error: helperMintWhy(res.kind, r.first) }); return; }
    const m = helperJobMessage({ event: ev, profile: readProfile(), helperId: r.helperId, code: res.code, appUrl: base });
    if (!m) { setSend(null); return; }
    const lp = helperLinkPatch(ev, r.helperId);
    if (Object.keys(lp).length) save({ patch: lp });
    setSend({ id: r.helperId, m });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(send.m.body); setCopied(true); handoff('copy'); } catch { setCopied(false); }
  };
  const email = async () => {
    setMail({ busy: true });
    const res = await emailHelperJob(ev.id, row.name);
    setMail(res);
  };
  // Where they stand, under their jobs: their own answer, else whether the link went out.
  const said = (r) => (r.answer === 'confirmed' ? <b className="ok" data-crew-said>Has it</b>
    : r.answer === 'declined' ? <b className="warn" data-crew-said>Can’t do it</b>
      : r.linkSent ? <span data-crew-said>Link sent</span> : null);
  const briefText = brief ? (() => { try { const d = draftHelperBrief(ev, readProfile(), { ros: todaysRos(ev, new Date()) }); return d.body || ''; } catch { return ''; } })() : '';

  return (<>
    <main className="view" data-view="crew">
      {nav}
      <p className="sub">Each person gets a link to their own job, nothing else.</p>
      {status}
      {rows.length === 0 ? (
        <div data-crew-empty>
          <p className="qhelp">No one has a job yet. Give a step or a dish to someone by name in the current app, and they show up here.</p>
          <div className="grp"><a className="row go" href="../hostv2/"><span className="nm">Open the current app</span>{chev}</a></div>
        </div>
      ) : (<>
        <div className="grp">{rows.map((r) => (
          <div key={r.helperId} className="row" data-crew-row={r.helperId}>
            <span className="nm">{r.name}<small>{r.jobs.join(' · ')}</small>{said(r) && <small>{said(r)}</small>}</span>
            <button className="link act" data-crew-send onClick={() => start(r)} disabled={!!(send && send.busy)}>{r.linkSent ? 'Resend' : 'Send'}</button>
          </div>
        ))}</div>
        <div className="grp gap">
          <button className="row go" data-crew-brief onClick={() => { setBrief(true); setCopied(false); }}><span className="nm">Everyone’s part today<small>One message with each person’s job and time.</small></span>{chev}</button>
          <a className="row go" data-crew-print href="../hostv2/"><span className="nm">Print the day sheet<small>For the refrigerator. In the current app for now.</small></span>{chev}</a>
        </div>
      </>)}
    </main>
    {send && row && (
      <Sheet title={send.m ? 'Send ' + row.first + ' their job' : row.first + '’s job'} onDone={() => setSend(null)}>
        {send.busy && <p className="fine" role="status">Making {row.first}’s link…</p>}
        {send.error && <p className="qhelp" role="alert">{send.error}</p>}
        {send.m && (<>
          <p className="qhelp" data-crew-message>{send.m.body}</p>
          {send.m.href
            ? <a className="primary" data-crew-text href={send.m.href} onClick={() => handoff('sms')}>Text it to {row.first}</a>
            : <button className="primary" data-crew-copy onClick={copy}>{copied ? 'Copied' : 'Copy the message'}</button>}
          {send.m.href && <button className="link" data-crew-copy onClick={copy}>{copied ? 'Copied' : 'Copy it instead'}</button>}
          {send.m.hasEmail && (mail && !mail.busy
            ? <p className="fine" data-crew-emailed role="status">{helperEmailWords(mail)}</p>
            : <button className="link" data-crew-email onClick={email} disabled={!!(mail && mail.busy)}>{mail && mail.busy ? 'Emailing…' : 'Email ' + row.first + ' their job'}</button>)}
          <p className="fine">Nothing goes out until you send it from your phone{send.m.hasEmail ? ' or tap Email' : ''}.</p>
        </>)}
      </Sheet>
    )}
    {brief && (
      <Sheet title="Everyone’s part today" onDone={() => setBrief(false)}>
        <p className="qhelp" style={{ whiteSpace: 'pre-line' }}>{briefText}</p>
        <button className="primary" onClick={async () => { try { await navigator.clipboard.writeText(briefText); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy it'}</button>
        <p className="fine">Paste it into your group text with your helpers.</p>
      </Sheet>
    )}
  </>);
}

// RUNNING LATE (B8, 11/26/2026; the Thanksgiving mockup, 1:05 PM). Move the rest
// of today later, once: what moves and what stays shows before anything is
// saved; the save is lib/dayOfEdits runningLate (the schedule writer's shape).
// Then telling guests is one tap, in Updates.
function LateSheet({ ev, save, now, onDone, onUpdates }) {
  const [by, setBy] = useState(30);
  const [moved, setMoved] = useState(null);
  const plan = (() => { try { return runningLate(ev, by, now); } catch { return { moved: [], kept: [], edit: null }; } })();
  const rows = [...plan.moved.map((m) => ({ id: m.id, t: m.to, label: stepTitle({ segment: m.segment }), stay: false })),
    ...plan.kept.map((k) => ({ id: k.id, t: k.time, label: 'Arrivals stay at ' + clock12(k.time), stay: true }))]
    .sort((a, b) => (parseMin(a.t) || 0) - (parseMin(b.t) || 0));
  const go = () => { if (plan.edit && save(plan.edit)) setMoved(plan.edit.msg); };
  if (moved) return (
    <Sheet title="The rest of today moved" onDone={onDone}>
      <p className="qhelp" role="status">{moved}</p>
      {onUpdates && <button className="primary" data-late-tell onClick={() => { onDone(); onUpdates(); }}>Tell your guests in Updates</button>}
      <p className="fine">Guests see a change only when you tell them.</p>
    </Sheet>
  );
  return (
    <Sheet title="Running late?" onDone={onDone}>
      {!plan.moved.length ? <p className="qhelp">Nothing left today to move.</p> : (<>
        <p className="qhelp">Move the rest of today later by</p>
        <div className="seg">{[15, 30, 45].map((m) => <button key={m} data-late-by aria-pressed={by === m} onClick={() => setBy(m)}>{m} min</button>)}</div>
        <div className="grp gap run" data-late-preview>{rows.slice(0, 4).map((r) => (
          <div key={r.id} className="row"><span className="tm">{clock12(r.t)}</span><span className="nm">{r.label}{r.stay && <small>Guests already have the time.</small>}</span></div>
        ))}</div>
        {rows.length > 4 && <p className="fine">And {rows.length - 4} more after that.</p>}
        <button className="primary" data-late-go onClick={go}>Move the rest {by} minutes</button>
      </>)}
    </Sheet>
  );
}

// TELL YOUR GUESTS (B4, 11/26/2026): hostv2's own guest drafts from The Day.
// The details carry the reply link, so they wait for it (useSendReady, the
// invite's own check); the parking note needs a place; an update posts to
// everyone's invite from Updates. Copy hands the words to her phone; nothing
// is sent from here.
function TellSheet({ ev, onDone, onUpdates }) {
  const [view, setView] = useState(null); // null | 'brief' | 'parking'
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(null); // her edits; null until she types
  const send = useSendReady(ev);
  const vf = (() => { try { return venueFor(ev); } catch { return {}; } })();
  const hasPlace = !!(vf.name || vf.city);
  const text = view === 'parking'
    ? (() => { try { return String(draftParkingInstructions(ev) || ''); } catch { return ''; } })()
    : view === 'brief' && send.ready
      ? (() => { try { return draftGuestBrief(ev, readProfile(), { rsvpUrl: send.link.url }).body || ''; } catch { return ''; } })()
      : '';
  // Her words win once she types. A draft's [ ] blanks (the parking note's
  // "[street / driveway …]") are filled before anything is copied.
  const shown = draft !== null ? draft : text;
  const blanks = /\[[^\]]+\]/.test(shown);
  const copy = async () => { if (blanks) return; try { await navigator.clipboard.writeText(shown); setCopied(true); } catch { setCopied(false); } };
  if (view) return (
    <Sheet title={view === 'parking' ? 'Parking note' : 'The details'} onDone={onDone}>
      {view === 'brief' && !send.ready ? <NotReady acct={send.acct} link={send.link} check={send.check} /> : (<>
        <textarea className="field" rows={8} aria-label="The words" data-tell-text value={shown} onChange={(e) => { setDraft(e.target.value); setCopied(false); }} />
        {blanks && <p className="fine warn">Fill in the [ ] parts first.</p>}
        <button className="primary" data-tell-copy disabled={blanks} onClick={copy}>{copied ? 'Copied' : 'Copy it'}</button>
        <p className="fine">Paste it into your group text or email. Nothing is sent from here.</p>
      </>)}
      <button className="link" onClick={() => { setView(null); setCopied(false); setDraft(null); }}>Back</button>
    </Sheet>
  );
  return (
    <Sheet title="Tell your guests" onDone={onDone}>
      <div className="grp">
        <button className="row go" data-tell-brief onClick={() => setView('brief')}><span className="nm">Send the details<small>Where, when, what to bring, and their reply link.</small></span>{chev}</button>
        {hasPlace && <button className="row go" data-tell-parking onClick={() => setView('parking')}><span className="nm">Parking note<small>Where to park and how to find the door.</small></span>{chev}</button>}
        {onUpdates && <button className="row go" data-tell-updates onClick={() => { onDone(); onUpdates(); }}><span className="nm">Post it to everyone’s invite<small>In Updates; emailed to guests who asked for updates.</small></span>{chev}</button>}
      </div>
    </Sheet>
  );
}
