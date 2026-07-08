// InviteV2 — the PUBLIC self-RSVP invite page (?rsvp=CODE), V2 editorial skin.
// CONTRACT = the ORIGINAL app's guest loop, verbatim (single point of truth):
//   · resolve the event by rsvpCode (or id) from the same pool + patch layers
//     the host shell reads
//   · idempotency + outbox via lib/api/rsvp (key ngw-rsvp-queue-<eventId>,
//     entry = payload + idempotencyKey + submittedAt; re-submit replaces)
//   · payload field names identical to RSVPFormView's, so a reply made here
//     merges into BOTH apps' rosters on this browser — and posts to the real
//     backend when REACT_APP_API_BASE_URL is configured
// Honest states: delivered ("Thanks!") vs queued-offline ("Saved — we'll send
// it"). No fake AI, no invented data: everything shown comes off the event.
import { useMemo, useState, useEffect, useRef } from 'react';
import { isRsvpApiConfigured, submitRsvp, rsvpIdempotencyKey, flushRsvpOutbox } from '@app/lib/api/rsvp';
import { rsvpDeadlineFor, daysUntil } from '@app/lib/dates';
import { ALL_SAMPLES, LS_PATCH, LS_CUSTOM } from './HostShellV2.jsx';

const MEALS = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];
// The ORIGINAL's RSVP_ALLERGY_OPTIONS, verbatim (App.js:2506).
const NEEDS = ['Nut allergy', 'Shellfish', 'Dairy-free', 'Egg', 'Kosher', 'Halal', 'Wheelchair access'];
const SOMBER = /memorial|remembrance|funeral|repast|celebration of life/i;

// Resolve the invite against the SAME event pool + patch layers the host
// shell reads — the guest sees exactly what the host's plan says.
function findInviteEvent(code) {
  try {
    const c = String(code || '').trim();
    if (!c) return null;
    let custom = null;
    try { custom = JSON.parse(localStorage.getItem(LS_CUSTOM)) || null; } catch { custom = null; }
    const pool = [...ALL_SAMPLES, ...(custom ? [custom] : [])];
    const base = pool.find(e => e && (String(e.rsvpCode || '') === c || String(e.id || '') === c));
    if (!base) return null;
    if (base.id === 'custom') return base; // the custom event stores itself whole
    let patch = {};
    try { patch = JSON.parse(localStorage.getItem(LS_PATCH(base.id))) || {}; } catch { patch = {}; }
    return { ...base, ...patch };
  } catch { return null; }
}

const dfmt = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts);

export default function InviteV2({ code }) {
  const event = useMemo(() => findInviteEvent(code), [code]);
  const [guestName, setGuestName] = useState('');
  const [rsvp, setRsvp] = useState('');
  const [meal, setMeal] = useState('Standard');
  const [needsSel, setNeedsSel] = useState([]);
  const [needsOther, setNeedsOther] = useState('');
  const [hasPlusOne, setHasPlusOne] = useState(false);
  const [plusOne, setPlusOne] = useState('');
  const [plusOneMeal, setPlusOneMeal] = useState('Standard');
  const [kids, setKids] = useState(0);
  const [note, setNote] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [queued, setQueued] = useState(false);
  const [shareState, setShareState] = useState('');
  const shareTimer = useRef(null);
  useEffect(() => () => clearTimeout(shareTimer.current), []);

  // Flush anything queued offline for this event once we're back (parity with
  // the original's PublicRsvpRoute; a no-op while no backend is configured).
  useEffect(() => {
    if (!event || !isRsvpApiConfigured()) return undefined;
    const flush = () => { flushRsvpOutbox(event.id, code).catch(() => {}); };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [event, code]);

  if (!event) {
    return (
      <div className="stagewrap"><div className="app"><div className="content">
        <section style={{ paddingTop: 120, textAlign: 'center' }}>
          <div className="eyebrow">Invitation</div>
          <h1 className="mega" style={{ fontSize: 'clamp(26px,8.5cqw,34px)', lineHeight: 1.1 }}>This link isn’t live anymore</h1>
          <p className="mega-sub" style={{ fontSize: 15 }}>Ask your host for a fresh invite link — this one doesn’t match an event here.</p>
        </section>
      </div></div></div>
    );
  }

  const days = (() => { try { return daysUntil(event.date); } catch { return null; } })();
  const rsvpBy = (() => { try { return rsvpDeadlineFor(event); } catch { return null; } })();
  const somber = SOMBER.test(String(event.type || '') + ' ' + String(event.name || ''));
  const allowPlusOne = event.plusOnePolicy !== 'no_plus_ones';
  const allowKids = event.kidsPolicy !== 'adults_only';

  // Social proof from the REAL roster only — never a fabricated number.
  const social = (() => {
    if (somber) return null;
    const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
    if (!yes.length) return 'Be the first to say yes';
    const names = [];
    for (const g of yes) {
      const n = String(g.name || '').trim();
      if (!n || /\(|group|table|family|team|&| and /i.test(n)) continue;
      const first = n.split(/\s+/)[0];
      if (first && !names.includes(first)) names.push(first);
      if (names.length >= 2) break;
    }
    if (names.length >= 2 && yes.length > 2) return `${names[0]}, ${names[1]} + ${yes.length - 2} going`;
    if (names.length >= 2) return `${names[0]} & ${names[1]} are in`;
    if (names.length === 1 && yes.length > 1) return `${names[0]} + ${yes.length - 1} going`;
    if (names.length === 1) return `${names[0]} is in`;
    return yes.length === 1 ? '1 guest is in' : `${yes.length} guests are in`;
  })();

  const needsJoined = [...needsSel, needsOther.trim()].filter(Boolean).join(', ');

  // The ORIGINAL's honest submit: outbox FIRST (never lose a reply), then the
  // server when configured; same-idempotency-key entries replace each other.
  const submit = async () => {
    if (sending) return;
    const fullName = guestName.trim();
    if (!fullName || !rsvp) {
      setErr(!fullName && !rsvp ? 'Add your name and let us know if you can make it.'
        : !fullName ? 'Add your name to send.' : 'Let us know if you can make it.');
      return;
    }
    setErr('');
    const parts = fullName.split(/\s+/);
    const payload = {
      name: fullName, firstName: parts[0], lastName: parts.slice(1).join(' '),
      rsvp, meal: rsvp === 'Yes' ? meal : '—', needs: needsJoined,
      plusOne: hasPlusOne ? plusOne.trim() : '', plusOneMeal: hasPlusOne ? plusOneMeal : '—', plusOneNeeds: '',
      kids: rsvp === 'Yes' ? kids : 0,
      note: note.trim(),
      ...(event.collectAddresses && mailingAddress.trim() ? { mailingAddress: mailingAddress.trim() } : {}),
    };
    const idk = rsvpIdempotencyKey(event.id + ':' + code);
    const key = 'ngw-rsvp-queue-' + event.id;
    try {
      const q = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [...(Array.isArray(q) ? q : []).filter(e => e.idempotencyKey !== idk),
        { ...payload, idempotencyKey: idk, submittedAt: Date.now() }];
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* storage blocked — the server path below may still deliver */ }

    let delivered = true;
    if (isRsvpApiConfigured()) {
      setSending(true);
      try {
        await submitRsvp(code, {
          idempotency_key: idk, name: payload.name, rsvp: payload.rsvp, meal: payload.meal,
          needs: payload.needs, plus_one: payload.plusOne, plus_one_meal: payload.plusOneMeal,
          plus_one_needs: payload.plusOneNeeds, kids: payload.kids, note: payload.note,
        });
        try {
          const q = JSON.parse(localStorage.getItem(key) || '[]');
          const rest = q.filter(e => e.idempotencyKey !== idk);
          if (rest.length) localStorage.setItem(key, JSON.stringify(rest));
          else localStorage.removeItem(key);
        } catch { /* delivered anyway */ }
      } catch { delivered = false; }
      setSending(false);
    }
    setQueued(!delivered);
    setSubmitted(true);
    try { if (navigator.vibrate) navigator.vibrate([12, 70, 12]); } catch { /* no haptics */ }
  };

  // "I'm in" forward — the guest recruits the next guest with the SAME link.
  const shareForward = async (own) => {
    const url = window.location.href;
    const evName = event.name || 'the celebration';
    const text = own
      ? `I’m going to ${evName} — come too! RSVP here: ${url}`
      : `You’re invited to ${evName}. RSVP here: ${url}`;
    let r = '';
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: own ? `I’m going to ${evName}` : `You’re invited — ${evName}`, text, url }); r = 'shared'; } catch { r = ''; }
    }
    if (!r) {
      try { await navigator.clipboard.writeText(text); r = 'copied'; } catch { r = ''; }
    }
    if (r) {
      setShareState(r);
      clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShareState(''), 2200);
    }
  };

  // Add-to-calendar: Google link + a real .ics — all-day, from the plan's date.
  const calDate = String(event.date || '').replace(/-/g, '');
  const calEnd = (() => {
    if (!event.date) return '';
    const d = new Date(event.date + 'T12:00:00'); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  })();
  const gcalUrl = event.date
    ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(event.name || 'Event')
      + '&dates=' + calDate + '/' + calEnd
      + (event.venue ? '&location=' + encodeURIComponent(event.venue + (event.venueCity ? ', ' + event.venueCity : '')) : '')
    : null;
  const icsHref = event.date
    ? 'data:text/calendar;charset=utf-8,' + encodeURIComponent([
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NGW Event Boss//Guest Invite//EN',
      'BEGIN:VEVENT', `UID:invite-${event.id}-${code}@ngw-events`,
      `DTSTART;VALUE=DATE:${calDate}`, `DTEND;VALUE=DATE:${calEnd}`,
      `SUMMARY:${String(event.name || 'Event').replace(/[,;]/g, ' ')}`,
      ...(event.venue ? [`LOCATION:${String(event.venue).replace(/[,;]/g, ' ')}`] : []),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n'))
    : null;

  const chip = (on, label, onClick, key) => (
    <button key={key || label} className="chip" aria-pressed={on} onClick={onClick}>{label}</button>
  );
  const first = guestName.trim().split(/\s+/)[0] || '';

  return (
    <div className="stagewrap">
      <div className="app"><div className="content">
        <section>
          <div className="eyebrow" style={{ marginTop: 10 }}>{somber ? 'Please join us' : 'You’re invited'}</div>
          <h1 className="mega" style={{ fontSize: 'clamp(27px,8.5cqw,36px)', lineHeight: 1.08 }}>{event.name}</h1>
          <p className="mega-sub" style={{ fontSize: 16 }}>
            {event.date ? dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date to come'}
            {event.venue ? ` · ${event.venue}` : ''}{event.venueCity ? `, ${event.venueCity}` : ''}
          </p>
          <p className="grounding" style={{ marginTop: 4 }}>
            {days != null && days > 0 ? `${days} day${days === 1 ? '' : 's'} away` : days === 0 ? 'Today' : ''}
            {rsvpBy && rsvpBy.iso && days != null && days >= 0 ? ` · replies by ${dfmt(rsvpBy.iso, { month: 'long', day: 'numeric' })}` : ''}
            {social ? ` · ${social}` : ''}
          </p>

          {!submitted ? (
            <div className="card no-hover" style={{ marginTop: 22 }}><div className="card-head" style={{ cursor: 'default' }}>
              <div className="shelf-label" style={{ marginBottom: 6 }}>Your name</div>
              <input className="field" style={{ maxWidth: 'none' }} autoComplete="name" placeholder="First and last"
                value={guestName} onChange={e => { setGuestName(e.target.value); if (err) setErr(''); }} aria-label="Your name" />

              <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Can you make it?</div>
              <div className="chips" role="radiogroup" aria-label="Attendance">
                {[['Yes', 'Yes, I’m in'], ['No', 'Can’t make it'], ['Maybe', 'Maybe']].map(([val, label]) =>
                  chip(rsvp === val, label, () => { setRsvp(val); if (err) setErr(''); }, val))}
              </div>

              {rsvp === 'Yes' && (
                <>
                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Meal</div>
                  <div className="chips">{MEALS.map(m => chip(meal === m, m, () => setMeal(m)))}</div>

                  {allowKids && (
                    <>
                      <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Kids coming with you</div>
                      <div className="actions-row" style={{ alignItems: 'center' }}>
                        <button className="mini" onClick={() => setKids(k => Math.max(0, k - 1))} aria-label="Fewer kids">−</button>
                        <span className="of" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, color: 'var(--ink-soft)' }} aria-live="polite">{kids}</span>
                        <button className="mini" onClick={() => setKids(k => k + 1)} aria-label="More kids">+</button>
                      </div>
                    </>
                  )}

                  {allowPlusOne && (
                    <>
                      <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Bringing someone?</div>
                      <div className="chips">
                        {chip(hasPlusOne, hasPlusOne ? 'Yes — a plus-one' : 'Add a plus-one', () => setHasPlusOne(v => !v))}
                      </div>
                      {hasPlusOne && (
                        <div style={{ marginTop: 8 }}>
                          <input className="field" style={{ maxWidth: 'none' }} placeholder="Their name"
                            value={plusOne} onChange={e => setPlusOne(e.target.value)} aria-label="Plus-one name" />
                          <div className="chips" style={{ marginTop: 8 }}>
                            {MEALS.map(m => chip(plusOneMeal === m, m, () => setPlusOneMeal(m), 'po-' + m))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {rsvp !== 'No' && (
                <>
                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Allergies or access needs</div>
                  <div className="chips">
                    {NEEDS.map(n => chip(needsSel.includes(n), n,
                      () => setNeedsSel(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n])))}
                  </div>
                  <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 14 }} placeholder="Anything else we should know about food or access"
                    value={needsOther} onChange={e => setNeedsOther(e.target.value)} aria-label="Other needs" />
                </>
              )}

              {event.collectAddresses && rsvp === 'Yes' && (
                <>
                  <div className="shelf-label" style={{ margin: '16px 0 6px' }}>Mailing address — optional</div>
                  <p className="grounding" style={{ margin: '0 0 6px' }}>Your host plans to mail thank-yous or favors. Skip it if you’d rather not.</p>
                  <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 14 }}
                    value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} aria-label="Mailing address" />
                </>
              )}

              <div className="shelf-label" style={{ margin: '16px 0 6px' }}>{rsvp === 'No' ? 'Send a note anyway?' : 'A note for your host — optional'}</div>
              <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 14 }}
                placeholder={rsvp === 'No' ? 'Sorry to miss it — save me a plate!' : 'Can’t wait!'}
                value={note} onChange={e => setNote(e.target.value)} aria-label="Note to host" />

              {err && <p className="grounding" role="alert" style={{ marginTop: 10, color: 'var(--danger)' }}>{err}</p>}
              <div className="actions-row" style={{ marginTop: 14 }}>
                <button className="cta big" onClick={submit} disabled={sending} style={sending ? { opacity: .6 } : undefined}>
                  {sending ? 'Sending…' : 'Send my reply'}
                </button>
              </div>
              <p className="grounding" style={{ marginTop: 8 }}>Just a name and an answer — everything else is optional. You can open this link again anytime to change your reply.</p>
            </div></div>
          ) : (
            <div className="card no-hover" style={{ marginTop: 22 }}><div className="card-head" style={{ cursor: 'default' }}>
              <h3 style={{ marginTop: 0 }}>
                {queued ? `Saved, ${first || 'friend'} — we’ll send it as soon as you’re back online.`
                  : rsvp === 'Yes' ? `Thanks, ${first || 'friend'} — you’re in.`
                  : rsvp === 'Maybe' ? `Noted, ${first || 'friend'} — come back to this link when you know.`
                  : `Thanks for letting us know, ${first || 'friend'}. You’ll be missed.`}
              </h3>
              {rsvp === 'Yes' && (
                <p className="grounding" style={{ margin: '4px 0 0' }}>
                  {1 + (hasPlusOne && plusOne.trim() ? 1 : 0) + (kids || 0)} of you
                  {needsJoined ? ' · needs noted: ' + needsJoined : ''}
                  {meal !== 'Standard' ? ' · ' + meal.toLowerCase() : ''}
                </p>
              )}
              <div className="actions-row" style={{ marginTop: 14 }}>
                {rsvp !== 'No' && gcalUrl && <a className="mini" style={{ textDecoration: 'none' }} href={gcalUrl} target="_blank" rel="noreferrer">Google Calendar</a>}
                {rsvp !== 'No' && icsHref && <a className="mini" style={{ textDecoration: 'none' }} href={icsHref} download={(event.name || 'event') + '.ics'}>Apple / .ics</a>}
                <button className="mini" onClick={() => setSubmitted(false)}>Change my answer</button>
              </div>
              {!queued && rsvp === 'Yes' && !somber && (
                <div className="actions-row" style={{ marginTop: 12 }}>
                  <button className="cta" onClick={() => shareForward(true)}>
                    {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'I’m in — tell a friend'}
                  </button>
                </div>
              )}
            </div></div>
          )}

          {!submitted && !somber && (
            <div className="actions-row" style={{ marginTop: 14, justifyContent: 'center' }}>
              <button className="mini" onClick={() => shareForward(false)}>
                {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'Forward this invite'}
              </button>
            </div>
          )}
          <p className="grounding" style={{ marginTop: 18, textAlign: 'center', opacity: .7 }}>Your reply goes straight to your host’s plan — nothing to install, no account.</p>
        </section>
      </div></div>
    </div>
  );
}
