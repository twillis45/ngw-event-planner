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
import { inviteTone, invitePalette, deepenForLight } from '@app/lib/inviteTone';
import { geocodeVenue } from '@app/lib/weather';
import { dark as steelPalette } from '@app/theme/palette';
import { ALL_SAMPLES, LS_PATCH, LS_CUSTOM, eventArtworkFile } from './HostShellV2.jsx';

// Identity crest — the SAME registry the app's glyph system reads (real PD
// artwork; artwork doctrine), and the HOST'S call whether it appears:
// event.inviteCrest === 'off' keeps the invitation purely typographic.
function markUrlFor(event) {
  if (event && event.inviteCrest === 'off') return null;
  const file = eventArtworkFile(event);
  return file ? (import.meta.env.BASE_URL + file) : null;
}

const MEALS = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];
// The ORIGINAL's RSVP_ALLERGY_OPTIONS, verbatim (App.js:2506).
const NEEDS = ['Nut allergy', 'Shellfish', 'Dairy-free', 'Egg', 'Kosher', 'Halal', 'Wheelchair access'];

// The invite speaks the EVENT'S mood (lib/inviteTone — one truth with the
// original): light = warm paper, dark = elegant evening, muted = somber. The
// palette lands as scoped CSS-var overrides so every class retints, and the
// steel identity accent deepens on paper (dark-tuned hues wash out on cream).
function toneVarsFor(pal) {
  const steelAccent = pal.dark ? null : deepenForLight(steelPalette.steelBlue);
  return {
    '--bg': pal.bg, '--card': pal.panel, '--bg-band': pal.surface,
    '--line': pal.border, '--line-soft': pal.border,
    '--ink': pal.text, '--ink-soft': pal.sub, '--muted': pal.muted, '--faint': pal.muted,
    ...(steelAccent ? {
      '--steel': steelAccent, '--steel-soft': steelAccent,
      '--steel-tint': `color-mix(in srgb, ${steelAccent} 10%, transparent)`,
    } : {}),
    // Declared HERE so inherited text re-resolves against the overridden vars —
    // body's own color computed against :root would leak white onto paper.
    color: 'var(--ink)',
    colorScheme: pal.dark ? 'dark' : 'light',
  };
}

// Resolve the invite against the SAME event pool + patch layers the host
// shell reads — the guest sees exactly what the host's plan says.
function findInviteEvent(code) {
  try {
    const c = String(code || '').trim();
    if (!c) return null;
    let custom = null;
    try { custom = JSON.parse(localStorage.getItem(LS_CUSTOM)) || null; } catch { custom = null; }
    const pool = [...ALL_SAMPLES, ...(custom ? [custom] : [])];
    let base = pool.find(e => e && (String(e.rsvpCode || '') === c || String(e.id || '') === c));
    // Demo alias: when the shell adopted the host's REAL crab event from
    // ngw-events, its rsvpCode is a real token — but ?rsvp=crab should still
    // land on the same event the shell calls "My Crab Feast".
    if (!base && /^crab$/i.test(c)) {
      base = pool.find(e => e && /crab/i.test(String(e.name || '') + ' ' + String(e.type || '')));
    }
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
  const [plusOneNeeds, setPlusOneNeeds] = useState('');
  const [kids, setKids] = useState(0);
  const [note, setNote] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [err, setErr] = useState('');
  // Field-level validation (original a11y WIN 2): each missing field lights up
  // on its own, aria-invalid + inline message; focus moves to the first one.
  const [nameInvalid, setNameInvalid] = useState(false);
  const [attendInvalid, setAttendInvalid] = useState(false);
  const nameRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [queued, setQueued] = useState(false);
  const [shareState, setShareState] = useState('');
  const shareTimer = useRef(null);
  useEffect(() => () => clearTimeout(shareTimer.current), []);
  // ── Arrival assist (event day): guest-initiated, entirely client-side —
  // location is watched ONLY after the guest asks, compared against the
  // geocoded venue, and never leaves the device. Web constraint stated
  // honestly: it works while this page is open (no background geofence).
  const [nearState, setNearState] = useState('idle'); // idle|watching|near|denied|nocoords
  const watchRef = useRef(null);
  useEffect(() => () => { if (watchRef.current != null) { try { navigator.geolocation.clearWatch(watchRef.current); } catch { /* gone */ } } }, []);
  const haversineKm = (la1, lo1, la2, lo2) => {
    const R = 6371, toR = (x) => x * Math.PI / 180;
    const dLa = toR(la2 - la1), dLo = toR(lo2 - lo1);
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(toR(la1)) * Math.cos(toR(la2)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const startNearWatch = async () => {
    try {
      if (!navigator.geolocation) { setNearState('denied'); return; }
      const homeish = /^(backyard|back\s?yard|home|house|my place)$/i.test(String((event && event.venue) || '').trim());
      const q = String((event && event.venueCity) || '').trim() || (!homeish ? String((event && event.venue) || '').trim() : '');
      if (!q) { setNearState('nocoords'); return; }
      const coords = await geocodeVenue(q);
      if (!coords) { setNearState('nocoords'); return; }
      setNearState('watching');
      watchRef.current = navigator.geolocation.watchPosition((pos) => {
        const d = haversineKm(pos.coords.latitude, pos.coords.longitude, coords.lat, coords.lon);
        if (d <= 0.8) {
          setNearState('near');
          try { navigator.geolocation.clearWatch(watchRef.current); } catch { /* done */ }
          try { if (navigator.vibrate) navigator.vibrate([12, 70, 12]); } catch { /* no haptics */ }
        }
      }, () => setNearState('denied'), { enableHighAccuracy: true, maximumAge: 30000 });
    } catch { setNearState('denied'); }
  };
  // The event's mood, one truth with the original (lib/inviteTone): warm paper
  // by default, elegant dark for evening/formal, muted for somber — and the
  // host's inviteStyle override always wins.
  const tone = inviteTone(event || {});
  const pal = invitePalette(tone);
  const toneVars = useMemo(() => toneVarsFor(pal), [tone]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="stagewrap"><div className="app" style={toneVars}><div className="content">
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
  const somber = tone === 'muted';
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
    const missingName = !fullName, missingAttend = !rsvp;
    if (missingName || missingAttend) {
      // Both requirements validate SIMULTANEOUSLY (original a11y WIN 2):
      // per-field flags + combined live message + focus to the first invalid.
      setNameInvalid(missingName);
      setAttendInvalid(missingAttend);
      setErr(missingName && missingAttend ? 'Add your name and let us know if you can make it.'
        : missingName ? 'Add your name to send.' : 'Let us know if you can make it.');
      try { if (missingName && nameRef.current) nameRef.current.focus(); } catch { /* no focus */ }
      return;
    }
    setErr(''); setNameInvalid(false); setAttendInvalid(false);
    const parts = fullName.split(/\s+/);
    const payload = {
      name: fullName, firstName: parts[0], lastName: parts.slice(1).join(' '),
      rsvp, meal: rsvp === 'Yes' ? meal : '—', needs: needsJoined,
      plusOne: hasPlusOne ? plusOne.trim() : '', plusOneMeal: hasPlusOne ? plusOneMeal : '—',
      plusOneNeeds: hasPlusOne ? plusOneNeeds.trim() : '',
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

  // Deck line — a small voice-keyed map (the original's DECK_BY_VOICE concept,
  // scoped to what V2 can honestly claim). The host's own words win if set.
  const deck = (() => {
    const explicit = String(event.deckLine || '').trim();
    if (explicit) return explicit;
    const t = String(event.type || '') + ' ' + String(event.name || '');
    if (somber) return 'In loving memory';
    if (/crab|crawfish|low.?country|fish\s*fry|cook.?out|bbq|barbecue/i.test(t)) return 'Good food, good people';
    if (/retire/i.test(t)) return 'A career worth celebrating';
    if (/birthday/i.test(t)) return 'Another year, celebrated right';
    if (/graduat/i.test(t)) return 'They did the work — come cheer';
    if (/baby|shower/i.test(t)) return 'Something wonderful is coming';
    if (/wedding|anniversary/i.test(t)) return 'Two names, one day';
    return 'It wouldn’t be the same without you';
  })();
  const mastRight = event.date ? dfmt(event.date, { month: 'short', year: 'numeric' }) : '';
  const mark = markUrlFor(event);

  // Staged reveal (approved choreography): one element per beat in reading
  // order. A single flag + per-element transition delays; reduced-motion CSS
  // lands everything instantly.
  const [rvOn, setRvOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRvOn(true), 60); return () => clearTimeout(t); }, []);
  let rvIdx = 0;
  const rv = (extra) => ({
    className: 'rv' + (rvOn ? ' in' : '') + (extra ? ' ' + extra : ''),
    style: { transitionDelay: rvOn ? (0.15 + (rvIdx++) * 0.28) + 's' : '0s' },
  });

  const toneClass = pal.dark ? 'inv2-dark' : somber ? 'inv2-muted' : '';
  const answered = !!rsvp || submitted;

  return (
    <div className="stagewrap">
      <div className="app" style={toneVars}><div className="content">
        <section className={'inv2 ' + toneClass + (answered ? ' answered' : '')} style={{ paddingTop: 14 }}>
          {/* ── The stationery — the approved remake: linen stock, letterpress,
              embossed crest, staged reveal, ONE ask, disclosure earned by the
              answer, countdown that condenses but never vanishes. ── */}
          <div className="inv2-sheet">
            <div {...rv()}>
              <div className="inv2-mast lp"><span>An invitation</span><span className="mr" aria-hidden /><span>{mastRight}</span></div>
            </div>
            {mark && (
              <div {...rv()}>
                <div className="inv2-crest" style={{ '--crabimg': 'url("' + mark + '")' }}>
                  <img src={mark} alt="" />
                </div>
              </div>
            )}
            <div {...rv()} >
              <div className="inv2-eyebrow lp" style={{ marginTop: mark ? 10 : 22 }}>{somber ? 'Please join us' : 'You’re invited'}</div>
            </div>
            <h1 {...rv('inv2-name lp-display')}>{event.name}</h1>
            <p {...rv('inv2-deck lp')}>{deck}</p>
            <div {...rv()}>
              <hr className="inv2-rule" />
              {event.date && (<><div className="inv2-label lp">When</div>
                <div className="inv2-val lp">{dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div></>)}
              {(event.venue || event.venueCity) && (<><div className="inv2-label lp">Where</div>
                <div className="inv2-val lp">{[event.venue, event.venueCity].filter(Boolean).join(', ')}</div></>)}
              {(rsvpBy && rsvpBy.iso && days != null && days >= 0) || social ? (
                <p className="grounding" style={{ margin: '8px 0 0', textAlign: 'center' }}>
                  {rsvpBy && rsvpBy.iso && days != null && days >= 0 ? 'replies by ' + dfmt(rsvpBy.iso, { month: 'long', day: 'numeric' }) : ''}
                  {rsvpBy && rsvpBy.iso && days != null && days >= 0 && social ? ' · ' : ''}{social || ''}
                </p>
              ) : null}
            </div>
            {days != null && days > 0 && (
              <div {...rv('inv2-countflex')}>
                {/* condensed state is INLINE-driven — a deployed-build cascade
                    quirk left the .answered descendant rules matching-but-inert,
                    so the state carries its own styles (transitions stay CSS). */}
                <div className="inv2-countwrap" style={answered ? { maxHeight: 24, margin: '6px 0 0' } : undefined}>
                  <div className="inv2-count lp-display" style={answered ? { display: 'inline', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: '.16em', margin: 0 } : undefined}>{days}</div>
                  <div className="inv2-label lp inv2-countlab" style={answered ? { display: 'inline', marginLeft: 5, marginTop: 0 } : { marginTop: 2 }}>{days === 1 ? 'day to go' : 'days to go'}</div>
                </div>
              </div>
            )}

            {!submitted ? (
              <div {...rv('inv2-ask')}>
                {/* THE ONE ASK — attendance alone; everything else is earned */}
                <div className="inv2-label lp" style={{ textAlign: 'left', margin: '0 0 8px' }}>The favor of a reply</div>
                <div className="chips" role="radiogroup" aria-label="Attendance">
                  {[['Yes', 'Yes, I’m in'], ['No', 'Can’t make it'], ['Maybe', 'Maybe']].map(([val, label]) =>
                    chip(rsvp === val, label, () => { setRsvp(val); if (attendInvalid) { setAttendInvalid(false); setErr(nameInvalid ? 'Add your name to send.' : ''); } }, val))}
                </div>
                {attendInvalid && <p className="grounding" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>Let us know if you can make it.</p>}

                <div className={'inv2-more' + (rsvp ? ' open' : '')} aria-hidden={!rsvp}
                  // inert while closed: max-height:0 hides visually but fields would
                  // still take keyboard focus — a Tab trap into invisible inputs.
                  // (set imperatively — React 18 drops the inert attribute prop)
                  ref={el => { if (el) { if (rsvp) el.removeAttribute('inert'); else el.setAttribute('inert', ''); } }}>
                  <div className="inv2-label lp" style={{ textAlign: 'left', margin: '16px 0 6px' }}>
                    {rsvp === 'Yes' ? 'Wonderful — just a few taps' : rsvp === 'Maybe' ? 'Noted — leave a name at least' : 'Thanks for telling us straight'}
                  </div>
                  <input className="field" ref={nameRef} style={{ maxWidth: 'none', ...(nameInvalid ? { borderColor: 'var(--danger)' } : {}) }}
                    autoComplete="name" placeholder="Your name — first and last" aria-invalid={nameInvalid || undefined}
                    value={guestName} onChange={e => { setGuestName(e.target.value); if (nameInvalid && e.target.value.trim()) { setNameInvalid(false); setErr(attendInvalid ? 'Let us know if you can make it.' : ''); } }} aria-label="Your name" />
                  {nameInvalid && <p className="grounding" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>Add your name to send.</p>}

                  {rsvp === 'Yes' && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Meal</div>
                      <div className="chips">{MEALS.map(m => chip(meal === m, m, () => setMeal(m)))}</div>
                      {allowKids && (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Kids coming with you</div>
                          <div className="actions-row" style={{ alignItems: 'center' }}>
                            <button className="mini" onClick={() => setKids(k => Math.max(0, k - 1))} aria-label="Fewer kids">−</button>
                            <span className="of" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }} aria-live="polite">{kids}</span>
                            <button className="mini" onClick={() => setKids(k => k + 1)} aria-label="More kids">+</button>
                          </div>
                        </>
                      )}
                      {allowPlusOne && (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Bringing someone?</div>
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
                              <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 14 }} placeholder="Their allergies or needs — optional"
                                value={plusOneNeeds} onChange={e => setPlusOneNeeds(e.target.value)} aria-label="Plus-one needs" />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {rsvp && rsvp !== 'No' && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Allergies or access needs</div>
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
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Mailing address — optional</div>
                      <p className="grounding" style={{ margin: '0 0 6px' }}>Your host plans to mail thank-yous or favors. Skip it if you’d rather not.</p>
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 14 }}
                        value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} aria-label="Mailing address" />
                    </>
                  )}

                  {rsvp && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>{rsvp === 'No' ? 'Send a note anyway?' : 'A note for your host — optional'}</div>
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 14 }}
                        placeholder={rsvp === 'No' ? 'Sorry to miss it — save me a plate!' : 'Can’t wait!'}
                        value={note} onChange={e => setNote(e.target.value)} aria-label="Note to host" />
                      {err && <p className="grounding" role="alert" style={{ marginTop: 10, color: 'var(--danger)' }}>{err}</p>}
                      <div className="actions-row" style={{ marginTop: 14 }}>
                        <button className="cta big" onClick={submit} disabled={sending} style={sending ? { opacity: .6 } : undefined}>
                          {sending ? 'Sending…' : 'Send my reply'}
                        </button>
                      </div>
                      <p className="grounding" style={{ marginTop: 8 }}>Just a name and an answer — everything else is optional. Open this link again anytime to change your reply.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="inv2-ask" style={{ textAlign: 'center', padding: '20px 4px 8px' }}>
                <div className="inv2-eyebrow lp" style={{ color: rsvp === 'Yes' ? 'var(--ok)' : undefined }}>
                  {queued ? 'Saved' : rsvp === 'Yes' ? 'You’re in' : rsvp === 'Maybe' ? 'Noted' : 'We’ll miss you'}
                </div>
                <h3 className="lp-display" style={{ margin: '10px 0 0', fontSize: 20, fontFamily: 'Georgia,serif' }}>
                  {queued ? 'Saved, ' + (first || 'friend') + ' — we’ll send it as soon as you’re back online.'
                    : rsvp === 'Yes' ? 'See you there, ' + (first || 'friend') + '.'
                    : rsvp === 'Maybe' ? 'Come back to this link when you know, ' + (first || 'friend') + '.'
                    : 'Thanks for letting us know, ' + (first || 'friend') + '.'}
                </h3>
                {rsvp === 'Yes' && (
                  <p className="grounding" style={{ margin: '8px 0 0' }}>
                    {1 + (hasPlusOne && plusOne.trim() ? 1 : 0) + (kids || 0)} of you
                    {needsJoined ? ' · needs noted: ' + needsJoined : ''}
                    {meal !== 'Standard' ? ' · ' + meal.toLowerCase() : ''}
                  </p>
                )}
                {!queued && rsvp === 'Yes' && !somber && (
                  <div className="actions-row" style={{ marginTop: 16, justifyContent: 'center' }}>
                    <button className="cta big" onClick={() => shareForward(true)}>
                      {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'I’m in — tell a friend'}
                    </button>
                  </div>
                )}
                <div className="actions-row" style={{ marginTop: 14, justifyContent: 'center' }}>
                  {rsvp !== 'No' && gcalUrl && <a className="mini" style={{ textDecoration: 'none' }} href={gcalUrl} target="_blank" rel="noreferrer">Google Calendar</a>}
                  {rsvp !== 'No' && icsHref && <a className="mini" style={{ textDecoration: 'none' }} href={icsHref} download={(event.name || 'event') + '.ics'}>Apple / .ics</a>}
                  <button className="mini" onClick={() => setSubmitted(false)}>Change my answer</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Getting there — event day only; unchanged mechanics. ── */}
          {days === 0 && (event.venue || event.venueCity) && (
            <div className="card no-hover" style={{ marginTop: 14 }}><div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
              <div className="shelf-label" style={{ marginBottom: 4 }}>Getting there — it’s today</div>
              <p className="grounding" style={{ margin: '0 0 8px' }}>{[event.venue, event.venueCity].filter(Boolean).join(', ')}</p>
              <div className="actions-row" style={{ marginTop: 0 }}>
                <a className="mini" style={{ textDecoration: 'none' }} target="_blank" rel="noreferrer"
                  href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent([event.venue, event.venueCity].filter(Boolean).join(', '))}>
                  Directions
                </a>
                {nearState === 'idle' && <button className="mini" onClick={startNearWatch}>Tell me when I’m close</button>}
              </div>
              {nearState === 'watching' && <p className="grounding" style={{ margin: '8px 0 0' }}>Watching — keep this page open and we’ll flag it when you’re close. Your location never leaves this phone.</p>}
              {nearState === 'near' && (
                <p className="grounding" style={{ margin: '8px 0 0', color: 'var(--ok)', fontWeight: 600 }}>
                  You’re basically there.
                  {String(event.parkingNotes || '').trim() ? ' Parking: ' + event.parkingNotes : ''}
                  {String(event.rainPlan || '').trim() ? ' If the sky turns: ' + event.rainPlan : ''}
                </p>
              )}
              {nearState === 'denied' && <p className="grounding" style={{ margin: '8px 0 0' }}>Location was blocked — directions above still get you there.</p>}
              {nearState === 'nocoords' && <p className="grounding" style={{ margin: '8px 0 0' }}>We couldn’t pin the venue on a map — directions above will ask for the address.</p>}
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
