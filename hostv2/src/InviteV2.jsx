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
import { isRsvpApiConfigured, submitRsvp, rsvpIdempotencyKey, flushRsvpOutbox, fetchPublicInvite, INVITE_FETCH_FAILED } from '@app/lib/api/rsvp';
import { rsvpDeadlineFor, daysUntil } from '@app/lib/dates';
import { inviteTone, invitePalette, deepenForLight } from '@app/lib/inviteTone';
import { buildExperienceContext } from '@app/lib/experienceContext';
import { geocodeVenue } from '@app/lib/weather';
import { dark as steelPalette } from '@app/theme/palette';
// Pulls ONLY the event pool + artwork resolver — not the 8,500-line host shell.
// This is the code-split: a guest opening ?rsvp=CODE no longer downloads
// HostShellV2 just to say yes.
import { ALL_SAMPLES, LS_PATCH, LS_CUSTOM, eventArtworkFile } from './eventPool.js';

// Identity crest — the SAME registry the app's glyph system reads (real PD
// artwork; artwork doctrine), and the HOST'S call whether it appears:
// event.inviteCrest === 'off' keeps the invitation purely typographic.
function markUrlFor(event) {
  if (event && event.inviteCrest === 'off') return null;
  const file = eventArtworkFile(event);
  return file ? (import.meta.env.BASE_URL + file) : null;
}

// The plate (single-select) — drives food SIZING (veg/vegan/pescatarian net
// out of the protein count). Gluten-Free moved out of "meal" into Diet below
// (it's a restriction, not a plate); Pescatarian added.
const MEALS = ['Standard', 'Vegetarian', 'Vegan', 'Pescatarian'];
// Dietary & access, redesigned (host request 2026-07-12) into structured groups
// that each flow to a real consumer — allergens → food item flags, diet → food
// sizing/flags, access → seating. The old flat NEEDS list (Nut allergy /
// Shellfish / Dairy-free / Egg / Kosher / Halal / Wheelchair access) under-
// collected: no Peanut/Milk/Fish/Soy/Sesame, and "Egg" matched nothing
// downstream. ALLERGENS is the FDA "big-9". DIET_RULES are preferences/rules
// (a preference is softer than the same-named allergen — the host sees both).
const ALLERGENS = ['Peanut', 'Tree nuts', 'Milk', 'Egg', 'Fish', 'Shellfish', 'Soy', 'Wheat / gluten', 'Sesame'];
const DIET_RULES = ['Gluten-free', 'Dairy-free', 'Halal', 'Kosher', 'No alcohol'];
const ACCESS_NEEDS = ['Step-free / wheelchair', 'Needs an accessible seat'];

// Deck line — the celebration copy under the event name (the original's
// DECK_BY_VOICE concept, scoped to what V2 can honestly claim). Ordered
// [signal, line] pairs; copy strings unchanged since the remake shipped.
const DECK_LINES = [
  [/crab|crawfish|low.?country|fish\s*fry|cook.?out|bbq|barbecue/i, 'Good food, good people'],
  [/retire/i, 'A career worth celebrating'],
  [/birthday/i, 'Another year, celebrated right'],
  [/graduat/i, 'They did the work — come cheer'],
  [/baby|shower/i, 'Something wonderful is coming'],
  [/wedding|anniversary/i, 'Two names, one day'],
];
const DECK_DEFAULT = 'It wouldn’t be the same without you';

// HQ-3 re-audit NEW-1: this page used to classify the celebration with its own
// regex over `type + name`, testing /retire/ before /birthday/ — so a compound
// Birthday + Retirement invite silently read retirement-only, bypassing the
// canonical identity every host surface consults. Now the CLASSIFICATION comes
// from the same reader (PC-1's buildExperienceContext → eventIdentity, pure —
// no profile/session, so it's safe on this public page): the event's PRIMARY
// milestone is tried first, then its secondaries, so the identity's own order
// decides the line — not the order of the pairs above. The host's authored
// deckLine still always wins, and the copy strings are untouched.
//
// Degrade, never crash: backend-resolved invites carry only the whitelisted
// PUBLIC_EVENT_FIELDS (name/type among them — enough for the reader), but if
// the canonical reader returns nothing or throws for ANY event, the original
// type+name regex still answers. That fallback also keeps covering free-text
// signals the identity engine has no vocabulary for (a "Crab Feast" living
// only in the event NAME).
function deckLineFor(event, somber, isPast) {
  if (!event) return '';
  // Past events become a recap. A host-authored deckLine was written for the
  // UPCOMING invite and may be future-tense ("Something wonderful is coming"),
  // which would contradict "Thank you for coming" — so on a (non-memorial) past
  // event the retrospective line wins even over the authored copy. Memorials
  // keep their own handling below.
  if (isPast && !somber) return 'A day worth remembering';
  const explicit = String(event.deckLine || '').trim();
  if (explicit) return explicit;
  if (somber) return 'In loving memory';
  try {
    const ctx = buildExperienceContext(event);
    const id = ctx && ctx.eventIdentity;
    if (id) {
      const labels = [id.primaryEventType, ...(id.secondaryEventTypes || [])].filter(Boolean);
      for (const label of labels) {
        const hit = DECK_LINES.find(([re]) => re.test(String(label)));
        if (hit) return hit[1];
      }
    }
  } catch { /* guest page: fall through to the regex below */ }
  const t = String(event.type || '') + ' ' + String(event.name || '');
  const hit = DECK_LINES.find(([re]) => re.test(t));
  return hit ? hit[1] : DECK_DEFAULT;
}

// The invite speaks the EVENT'S mood (lib/inviteTone — one truth with the
// original): light = warm paper, dark = elegant evening, muted = somber. The
// palette lands as scoped CSS-var overrides so every class retints, and the
// steel identity accent deepens on paper (dark-tuned hues wash out on cream).
function toneVarsFor(pal) {
  const steelAccent = pal.dark ? null : deepenForLight(steelPalette.steelBlue);
  return {
    '--bg': pal.bg, '--card': pal.panel, '--bg-band': pal.surface,
    // Color re-audit (→10): --line-soft was === --line, flattening the border
    // hierarchy the host has. Give it a real softer step (borders carry no text,
    // so contrast is not a constraint).
    '--line': pal.border, '--line-soft': `color-mix(in srgb, ${pal.border} 55%, transparent)`,
    '--ink': pal.text, '--ink-soft': pal.sub, '--muted': pal.muted, '--faint': pal.muted,
    // Status colors MUST be scoped per skin (per-screen audit): they weren't,
    // so on a LIGHT skin the "You're in" eyebrow and error text fell through to
    // the dark-calibrated --ok/--danger and computed ≈2.5:1 / ≈3.7:1 — failing.
    // Light skins get deep green/red (≈5:1 on cream/white); dark skins keep the
    // light calibrations (the host theme's own lightened danger, ≈4.5+:1 on dark).
    '--ok': pal.dark ? '#4FAE7A' : '#1e7a46',
    '--ok-tint': pal.dark ? 'rgba(79,174,122,.14)' : 'color-mix(in srgb, #1e7a46 12%, transparent)',
    '--danger': pal.dark ? '#F27A70' : '#c03838',
    '--danger-tint': pal.dark ? 'rgba(242,122,112,.14)' : 'color-mix(in srgb, #c03838 12%, transparent)',
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

// Adapt the backend resolver's PUBLIC event to this page's render shape. The
// server returns ONLY whitelisted display fields (backend/app/routers/rsvp.py
// PUBLIC_EVENT_FIELDS) — no id and no roster — so:
//   · the rsvp code stands in for the missing id (the same outbox/idempotency
//     keying the original's PublicRsvpRoute uses when only the code is known)
//   · host parking copy arrives as `parking`; this page reads `parkingNotes`
//   · rosterUnknown marks that the guest list was never sent — the social
//     line falls back to the anonymized goingCount the server DOES send (a
//     tally, never names), instead of staying silent.
function adaptRemoteInvite(remote, code) {
  if (!remote || typeof remote !== 'object') return null;
  return {
    ...remote,
    id: remote.id || String(code),
    parkingNotes: remote.parkingNotes || remote.parking || '',
    rosterUnknown: true,
    // Anonymized social proof (rsvp.py adds goingCount to the public event) —
    // a count only, so the invite can show "N going" with the roster withheld.
    goingCount: Number.isFinite(Number(remote.goingCount)) ? Number(remote.goingCount) : null,
    // Recap keepsake (host-authored, not PII) — carried on the public event so a
    // backend invite reopened after the date shows the host's note + album link.
    recapNote: remote.recapNote || '',
    albumUrl: remote.albumUrl || '',
  };
}

const dfmt = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts);

export default function InviteV2({ code }) {
  // Resolution order: local pool + patch layers FIRST (fast path — same-device
  // demos keep working offline, exactly as before), then the backend public
  // resolver for a guest opening the link on their own phone (the original's
  // PublicRsvpRoute fallback, App.js). With no backend configured, behavior is
  // unchanged from before: local or the not-found state, no loading flash.
  const localEvent = useMemo(() => findInviteEvent(code), [code]);
  // undefined = backend lookup in flight; { event: null } = genuinely not found;
  // { event: null, failed: true } = the lookup itself failed (offline/5xx) — a
  // retryable state, NOT "this link is dead." retryTick re-runs the effect.
  const [resolved, setResolved] = useState(() =>
    (localEvent || !isRsvpApiConfigured()) ? { event: localEvent } : undefined);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (localEvent) { setResolved({ event: localEvent }); return undefined; }
    if (!isRsvpApiConfigured()) { setResolved({ event: null }); return undefined; }
    setResolved(undefined);
    (async () => {
      // fetchPublicInvite returns INVITE_FETCH_FAILED for a network/offline/5xx
      // failure (retryable) vs null for a genuine not-found — kept distinct so a
      // transient blip isn't shown as a dead link.
      const remote = await fetchPublicInvite(code);
      if (cancelled) return;
      if (remote === INVITE_FETCH_FAILED) setResolved({ event: null, failed: true });
      else setResolved({ event: adaptRemoteInvite(remote, code) });
    })();
    return () => { cancelled = true; };
  }, [code, localEvent, retryTick]);
  const resolveFailed = !!(resolved && resolved.failed);
  const event = (resolved && resolved.event) || null;
  const [guestName, setGuestName] = useState('');
  const [rsvp, setRsvp] = useState('');
  const [meal, setMeal] = useState('Standard');
  const [allergensSel, setAllergensSel] = useState([]);
  const [rulesSel, setRulesSel] = useState([]);
  const [accessSel, setAccessSel] = useState([]);
  const [needsOther, setNeedsOther] = useState('');
  const [needsOpen, setNeedsOpen] = useState(false); // progressive disclosure
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
      // Same state-suffix disambiguation as HostShellV2's weather query — a
      // bare city can silently geocode to the wrong same-named city elsewhere.
      const vc = String((event && event.venueCity) || '').trim();
      const vs = String((event && event.venueState) || '').trim();
      const q = (vc && !/^\d{5}$/.test(vc) && vs ? `${vc}, ${vs}, US` : vc) || (!homeish ? String((event && event.venue) || '').trim() : '');
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
  // Classified ONCE per event — the canonical reader is pure but not free;
  // it must not re-run on every keystroke of the reply form. Declared before
  // the loading/not-found returns (hooks can't sit after a conditional).
  const deck = useMemo(() => {
    // isPast is computed later in render (needs `days`); recompute the same test
    // locally so the deck line can drop future-tense copy on a past-event recap.
    let past = false;
    try { const d = daysUntil(event.date); past = d != null && d < 0; } catch { /* undated → not past */ }
    return deckLineFor(event, tone === 'muted', past);
  }, [event, tone]);

  // Flush anything queued offline for this event once we're back (parity with
  // the original's PublicRsvpRoute; a no-op while no backend is configured).
  useEffect(() => {
    if (!event || !isRsvpApiConfigured()) return undefined;
    const flush = () => { flushRsvpOutbox(event.id, code).catch(() => {}); };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [event, code]);

  // Staged reveal (approved choreography): one element per beat in reading
  // order. A single flag + per-element transition delays; reduced-motion CSS
  // lands everything instantly. Declared BEFORE the loading/not-found returns
  // (hooks can't sit after a conditional return once the event can arrive
  // async) and armed only once the event exists, so a backend-resolved invite
  // still gets the full reveal.
  const [rvOn, setRvOn] = useState(false);
  useEffect(() => {
    if (!event) return undefined;
    const t = setTimeout(() => setRvOn(true), 60);
    return () => clearTimeout(t);
  }, [event]);

  // Backend lookup in flight (no local copy, API configured): a quiet, honest
  // holding state in the invite's own voice — never a premature "not found".
  if (!resolved) {
    return (
      <div className="stagewrap"><div className="app" style={toneVars}><div className="content">
        <section style={{ paddingTop: 120, textAlign: 'center' }} aria-busy="true">
          <div className="eyebrow">Invitation</div>
          <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }} aria-live="polite">Loading your invite…</p>
        </section>
      </div></div></div>
    );
  }

  // Lookup FAILED (offline / server hiccup) — NOT a dead link. Honest, retryable:
  // never tell a guest with a flaky connection that a live invite is gone.
  if (resolveFailed) {
    return (
      <div className="stagewrap"><div className="app" style={toneVars}><div className="content">
        <section style={{ paddingTop: 120, textAlign: 'center' }}>
          <div className="eyebrow">Invitation</div>
          <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.1 }}>We couldn’t load your invite</h1>
          <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }}>Looks like the connection dropped — the invite is fine. Check your signal and try again.</p>
          <div className="actions-row" style={{ marginTop: 'var(--sp-4)', justifyContent: 'center' }}>
            <button className="cta" onClick={() => { setResolved(undefined); setRetryTick(t => t + 1); }}>Try again</button>
          </div>
        </section>
      </div></div></div>
    );
  }

  if (!event) {
    return (
      <div className="stagewrap"><div className="app" style={toneVars}><div className="content">
        <section style={{ paddingTop: 120, textAlign: 'center' }}>
          <div className="eyebrow">Invitation</div>
          <h1 className="mega" style={{ fontSize: 'var(--t-display-l)', lineHeight: 1.1 }}>This link isn’t live anymore</h1>
          <p className="mega-sub" style={{ fontSize: 'var(--t-body-s)' }}>Ask your host for a fresh invite link — this one doesn’t match an event here.</p>
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
    // Backend-resolved invite: the roster (names) is never sent to a stranger's
    // device (server whitelist), but the server DOES send an anonymized
    // goingCount — so show the tally, not names. A null count (older server /
    // not sent) still stays silent rather than fabricate a number.
    if (event.rosterUnknown) {
      const n = event.goingCount;
      if (n == null) return null;
      if (n <= 0) return 'Be the first to say yes';
      return n === 1 ? '1 person is going' : `${n} going`;
    }
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

  // Live momentum faces (Goal 2) — colored-initial avatars, LOCAL invites only.
  // The SAME deterministic tint + initial mechanism as the Guests tab (.gav /
  // AVA_TINTS in HostShellV2), so the invite and the host roster read as one
  // system. REAL names only: backend-resolved invites (rosterUnknown) send an
  // anonymized goingCount with NO names, so they get zero faces here (count-only,
  // matching the `social` string) — never a fabricated or privacy-withheld face.
  const AVA_TINTS = ['#3b4a52', '#4a4136', '#3a4a3e', '#463a44', '#3f4657', '#4a3f3a'];
  const avaTintFor = (nm) => { const s = String(nm || ''); let h = 0; for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0; return AVA_TINTS[h % AVA_TINTS.length]; };
  const socialFaces = (() => {
    if (somber || event.rosterUnknown) return []; // no names to honestly show
    const seen = [];
    const out = [];
    for (const g of (event.guests || [])) {
      if (!g || g.rsvp !== 'Yes') continue;
      const nm = String(g.name || '').trim();
      // Same guard the `social` string uses: skip group/table/family entries — a
      // single initial can't honestly stand for "The Diaz Family" or "Table 4".
      if (!nm || /\(|group|table|family|team|&| and /i.test(nm)) continue;
      const first = nm.split(/\s+/)[0];
      const key = first.toLowerCase();
      if (!first || seen.includes(key)) continue;
      seen.push(key);
      out.push({ initial: first.charAt(0).toUpperCase(), tint: avaTintFor(nm) });
      if (out.length >= 5) break;
    }
    return out;
  })();

  // Honest going tally for the post-RSVP signature moment (Goal 1). The base
  // count is the SAME real source the `social` line already trusts: the
  // anonymized goingCount for backend invites, the local Yes tally otherwise. A
  // null count yields no line (the moment falls back to "You're in") — never a
  // fabricated number. Phrased "You + N others" so the base (which predates this
  // fresh reply) reads as the crowd the guest is joining.
  const goingTally = event.rosterUnknown
    ? (Number.isFinite(Number(event.goingCount)) ? Number(event.goingCount) : null)
    : (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
  const goingJoinLine = (goingTally != null && goingTally > 0)
    ? (goingTally === 1 ? 'You + 1 other going' : `You + ${goingTally} others going`)
    : null;

  // Post-event RECAP (10+, the only guest-facing growth surface): when a shared
  // link is opened AFTER the event, the invite becomes a recap instead of an
  // RSVP form — honest, real-data only. Attendance reuses the anonymized count
  // (goingCount for backend invites, the local Yes tally otherwise); a null
  // count stays silent rather than fabricate. The guest's own prior reply is
  // echoed from the outbox if present.
  const isPast = days != null && days < 0;
  const recapAttendance = (() => {
    const n = event.rosterUnknown
      ? (Number.isFinite(Number(event.goingCount)) ? Number(event.goingCount) : null)
      : (event.guests || []).filter(g => g && g.rsvp === 'Yes').length;
    if (n == null || n <= 0) return null;
    return n === 1 ? '1 of us was there' : `${n} of us were there`;
  })();
  const myPriorRsvp = (() => {
    try { const q = JSON.parse(localStorage.getItem('ngw-rsvp-queue-' + event.id) || '[]'); const m = Array.isArray(q) && q.length ? q[q.length - 1] : null; return (m && m.rsvp) || null; } catch { return null; }
  })();
  // Recap keepsake content — REAL host-provided material only, never fabricated.
  // recapNote: the host's own words to guests (a thank-you). albumUrl: a real
  // photo album the host links (Google Photos, iCloud, etc.) — rendered only when
  // it's a genuine http(s) URL, so a bad/injected value can never become a link.
  const recapNote = (() => { const s = String(event.recapNote || '').trim(); return s || null; })();
  const albumUrl = (() => { const s = String(event.albumUrl || '').trim(); return /^https?:\/\//i.test(s) ? s : null; })();

  // Structured selections carry to the app as arrays; needsJoined stays a
  // human string for display + the legacy free-text regex consumers.
  const needsStructured = [...allergensSel, ...rulesSel, ...accessSel];
  const needsJoined = [...needsStructured, needsOther.trim()].filter(Boolean).join(', ');

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
      // Structured, so the app consumes clean data instead of regex-on-a-string:
      // allergens → food item flags, diets → food sizing + flags, access → seating.
      allergens: allergensSel, diets: rulesSel, access: accessSel,
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
    // Past events can't be RSVP'd to — "Share the memory" recruits nobody, it
    // passes along the recap. Branch the copy so we never tell someone to "RSVP
    // here" for a celebration that already happened (CTA-truthfulness).
    const text = isPast
      ? `Looking back on ${evName}: ${url}`
      : own
        ? `I’m going to ${evName} — come too! RSVP here: ${url}`
        : `You’re invited to ${evName}. RSVP here: ${url}`;
    const title = isPast ? `Looking back on ${evName}` : own ? `I’m going to ${evName}` : `You’re invited — ${evName}`;
    let r = '';
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title, text, url }); r = 'shared'; }
      // A user who taps Cancel in the native share sheet fires AbortError — that's
      // a deliberate "never mind," NOT a failure, so stop here rather than silently
      // copying to their clipboard behind their back (per-screen audit).
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (!r) {
      try { await navigator.clipboard.writeText(text); r = 'copied'; } catch { /* clipboard blocked (insecure context) — fall through */ }
    }
    if (!r) {
      // Last-ditch when there's no share API AND no clipboard access: surface the
      // link so the guest can copy it by hand, instead of the button doing nothing.
      try { window.prompt('Copy this invite link:', url); r = 'copied'; } catch { r = ''; }
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

  // `radio` opts into radiogroup semantics (role=radio + aria-checked) for the
  // single-select attendance chips inside role="radiogroup"; without it a chip
  // renders aria-pressed (toggle-button), which is invalid as a radiogroup child.
  // Multi-select chips (NEEDS) legitimately keep aria-pressed, so this is opt-in.
  const chip = (on, label, onClick, key, radio) => (
    <button key={key || label} className="chip"
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? on : undefined}
      aria-pressed={radio ? undefined : on}
      onClick={onClick}>{label}</button>
  );
  const first = guestName.trim().split(/\s+/)[0] || '';

  const mastRight = event.date ? dfmt(event.date, { month: 'short', year: 'numeric' }) : '';
  const mark = markUrlFor(event);

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
              <div className="inv2-eyebrow lp" style={{ marginTop: mark ? 10 : 22 }}>{isPast ? 'Thank you for coming' : somber ? 'Please join us' : 'You’re invited'}</div>
            </div>
            <h1 {...rv('inv2-name lp-display')}>{event.name}</h1>
            <p {...rv('inv2-deck lp')}>{deck}</p>
            <div {...rv()}>
              <hr className="inv2-rule" />
              {event.date && (<><div className="inv2-label lp">When</div>
                <div className="inv2-val lp">{dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div></>)}
              {(event.venue || event.venueCity) && (<><div className="inv2-label lp">Where</div>
                <div className="inv2-val lp">{[event.venue, event.venueCity].filter(Boolean).join(', ')}</div></>)}
              {/* Details the host set — the backend already sends these on the
                  public event (whitelisted); the invite just wasn't rendering
                  them. Present-only, and hidden on a past-event recap. */}
              {!isPast && String(event.dressCode || '').trim() && (<><div className="inv2-label lp">Dress</div>
                <div className="inv2-val lp">{event.dressCode}</div></>)}
              {!isPast && String(event.bringNote || '').trim() && (<><div className="inv2-label lp">Bring</div>
                <div className="inv2-val lp">{event.bringNote}</div></>)}
              {!isPast && String(event.hostContact || '').trim() && (<><div className="inv2-label lp">Host</div>
                <div className="inv2-val lp">{event.hostContact}</div></>)}
              {!isPast && ((rsvpBy && rsvpBy.iso && days != null && days >= 0) || social) ? (
                <div style={{ margin: '8px 0 0', textAlign: 'center' }}>
                  {/* Live momentum (Goal 2): real first-name initials on the same
                      deterministic tints as the Guests tab, overlapped into a
                      cluster. LOCAL invites only — backend invites show the
                      count-only `social` string with no faces (roster withheld). */}
                  {socialFaces.length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {socialFaces.map((f, i) => (
                        <span key={i} className="gav" aria-hidden="true"
                          style={{ width: 26, height: 26, fontSize: 10, marginLeft: i ? -8 : 0, background: f.tint, boxShadow: '0 0 0 2px var(--card)' }}>{f.initial}</span>
                      ))}
                    </div>
                  )}
                  <p className="grounding" style={{ margin: socialFaces.length ? '5px 0 0' : 0 }}>
                    {rsvpBy && rsvpBy.iso && days != null && days >= 0 ? 'replies by ' + dfmt(rsvpBy.iso, { month: 'long', day: 'numeric' }) : ''}
                    {rsvpBy && rsvpBy.iso && days != null && days >= 0 && social ? ' · ' : ''}{social || ''}
                  </p>
                </div>
              ) : null}
            </div>
            {days != null && days > 0 && (
              <div {...rv('inv2-countflex')}>
                {/* condensed state is INLINE-driven — a deployed-build cascade
                    quirk left the .answered descendant rules matching-but-inert,
                    so the state carries its own styles (transitions stay CSS). */}
                <div className="inv2-countwrap" style={answered ? { maxHeight: 24, margin: '6px 0 0' } : undefined}>
                  <div className="inv2-count lp-display" style={answered ? { display: 'inline', fontSize: 11, fontFamily: 'inherit', fontWeight: 800, letterSpacing: '.16em', margin: 0 } : undefined}>{days}</div>
                  <div className="inv2-label lp inv2-countlab" style={answered ? { display: 'inline', marginLeft: 5, marginTop: 0 } : { marginTop: 2 }}>{days === 1 ? 'day to go' : 'days to go'}</div>
                </div>
              </div>
            )}

            {isPast ? (
              <div {...rv('inv2-ask')}>
                {/* Post-event recap — a keepsake close, replacing the RSVP ask once
                    the date has passed. Everything here is real: the attendance
                    count, the host's own note, and a real photo album if the host
                    linked one. Nothing is fabricated; absent pieces stay silent. */}
                <div className="inv2-label lp" style={{ textAlign: 'center', margin: '0 0 10px' }}>Afterward</div>
                {recapNote && (
                  <p className="inv2-deck lp" style={{ margin: '0 0 12px', textAlign: 'center', fontStyle: 'italic' }}>“{recapNote}”</p>
                )}
                <p className="grounding" style={{ margin: '0 0 6px', textAlign: 'center' }}>
                  {recapAttendance ? recapAttendance + ' — thank you for celebrating.' : 'Thank you for celebrating.'}
                  {myPriorRsvp === 'Yes' ? ' You were in.' : ''}
                </p>
                {albumUrl
                  ? <p className="grounding" style={{ margin: '2px 0 0', textAlign: 'center', opacity: .8 }}>The photos from the day are up — take a look.</p>
                  : <p className="grounding" style={{ margin: '2px 0 0', textAlign: 'center', opacity: .8 }}>Got photos? Share them so everyone can relive it.</p>}
                <div className="actions-row" style={{ marginTop: 12, justifyContent: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {albumUrl && <a className="mini" href={albumUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>See the photos</a>}
                  <button className="mini" onClick={() => shareForward(false)}>{shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'Share the memory'}</button>
                </div>
              </div>
            ) : !submitted ? (
              <div {...rv('inv2-ask')}>
                {/* THE ONE ASK — attendance alone; everything else is earned */}
                <div className="inv2-label lp" style={{ textAlign: 'left', margin: '0 0 8px' }}>The favor of a reply</div>
                <div className="chips" role="radiogroup" aria-label="Attendance">
                  {[['Yes', 'Yes, I’m in'], ['No', 'Can’t make it'], ['Maybe', 'Maybe']].map(([val, label]) =>
                    chip(rsvp === val, label, () => { setRsvp(val); if (attendInvalid) { setAttendInvalid(false); setErr(nameInvalid ? 'Add your name to send.' : ''); } }, val, true))}
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
                    aria-describedby={nameInvalid ? 'rsvp-name-error' : undefined}
                    value={guestName} onChange={e => { setGuestName(e.target.value); if (nameInvalid && e.target.value.trim()) { setNameInvalid(false); setErr(attendInvalid ? 'Let us know if you can make it.' : ''); } }} aria-label="Your name" />
                  {nameInvalid && <p id="rsvp-name-error" className="grounding" role="alert" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>Add your name to send.</p>}

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
                              <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 'var(--t-input)' }} placeholder="Their allergies or needs — optional"
                                value={plusOneNeeds} onChange={e => setPlusOneNeeds(e.target.value)} aria-label="Plus-one needs" />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {rsvp && rsvp !== 'No' && (
                    <>
                      {/* Progressive disclosure (host request 2026-07-12): most guests
                          have no needs, so keep it a single tap by default; the full
                          grouped set (allergies / diet / access) expands only when asked.
                          Each group is a multi-select that flows to a real consumer. */}
                      {!needsOpen ? (
                        <button className="mini" style={{ marginTop: 14 }} onClick={() => setNeedsOpen(true)}>
                          Add dietary or access needs
                        </button>
                      ) : (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Allergies</div>
                          <div className="chips" role="group" aria-label="Allergies">
                            {ALLERGENS.map(n => chip(allergensSel.includes(n), n,
                              () => setAllergensSel(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]), 'al-' + n))}
                          </div>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Diet</div>
                          <div className="chips" role="group" aria-label="Diet">
                            {DIET_RULES.map(n => chip(rulesSel.includes(n), n,
                              () => setRulesSel(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]), 'di-' + n))}
                          </div>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Getting around</div>
                          <div className="chips" role="group" aria-label="Access needs">
                            {ACCESS_NEEDS.map(n => chip(accessSel.includes(n), n,
                              () => setAccessSel(s => s.includes(n) ? s.filter(x => x !== n) : [...s, n]), 'ac-' + n))}
                          </div>
                          <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 'var(--t-input)' }} placeholder="Anything else we should know about food or access"
                            value={needsOther} onChange={e => setNeedsOther(e.target.value)} aria-label="Other needs" />
                        </>
                      )}
                    </>
                  )}

                  {event.collectAddresses && rsvp === 'Yes' && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Mailing address — optional</div>
                      <p className="grounding" style={{ margin: '0 0 6px' }}>Your host plans to mail thank-yous or favors. Skip it if you’d rather not.</p>
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 'var(--t-input)' }}
                        value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} aria-label="Mailing address" />
                    </>
                  )}

                  {rsvp && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>{rsvp === 'No' ? 'Send a note anyway?' : 'A note for your host — optional'}</div>
                      <textarea className="field" style={{ maxWidth: 'none', minHeight: 52, resize: 'vertical', fontSize: 'var(--t-input)' }}
                        placeholder={rsvp === 'No' ? 'Sorry to miss it — save me a plate!' : 'Can’t wait!'}
                        value={note} onChange={e => setNote(e.target.value)} aria-label="Note to host" />
                      {err && <p className="grounding" role="alert" style={{ marginTop: 10, color: 'var(--danger)' }}>{err}</p>}
                      <div className="actions-row" style={{ marginTop: 14 }}>
                        <button className="cta big" onClick={submit} disabled={sending}>
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
                {(!queued && rsvp === 'Yes' && !somber) ? (
                  /* ── Signature moment (Goal 1) — a screenshot-worthy confirmation
                     for a delivered Yes: the event mark (same ARTWORK_MARKS crest
                     as the invite masthead, reused verbatim), the event name +
                     date, and an HONEST going tally from real data (goingJoinLine
                     — goingCount/local Yes count; silent when null). The prominent
                     Share CTA below carries the guest back out to recruit the next
                     one. Queued / Maybe / No keep the quieter close in the else. ── */
                  <>
                    {mark && (
                      <div className="inv2-crest" style={{ '--crabimg': 'url("' + mark + '")', margin: '0 auto 6px' }}>
                        <img src={mark} alt="" />
                      </div>
                    )}
                    <div className="inv2-eyebrow lp" style={{ color: 'var(--ok)' }}>You’re in</div>
                    <h3 className="lp-display" style={{ margin: '8px 0 0', fontSize: 23, fontFamily: 'var(--serif)', lineHeight: 1.12 }}>{event.name}</h3>
                    {event.date && (
                      <p className="inv2-deck lp" style={{ margin: '4px 0 0' }}>{dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    )}
                    <p className="grounding" style={{ margin: '10px 0 0', fontWeight: 700, color: 'var(--ok)' }}>
                      {goingJoinLine || ('See you there, ' + (first || 'friend') + '.')}
                    </p>
                    <p className="grounding" style={{ margin: '4px 0 0' }}>
                      {1 + (hasPlusOne && plusOne.trim() ? 1 : 0) + (kids || 0)} of you
                      {needsJoined ? ' · needs noted: ' + needsJoined : ''}
                      {meal !== 'Standard' ? ' · ' + meal.toLowerCase() : ''}
                    </p>
                    <div className="actions-row" style={{ marginTop: 16, justifyContent: 'center' }}>
                      <button className="cta big" onClick={() => shareForward(true)}>
                        {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'I’m in — bring a friend'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inv2-eyebrow lp" style={{ color: rsvp === 'Yes' ? 'var(--ok)' : undefined }}>
                      {queued ? 'Saved' : rsvp === 'Yes' ? 'You’re in' : rsvp === 'Maybe' ? 'Noted' : 'We’ll miss you'}
                    </div>
                    <h3 className="lp-display" style={{ margin: '10px 0 0', fontSize: 21, fontFamily: 'var(--serif)' }}>
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
                  </>
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

          {/* Keep forward visible after Maybe/No too (per-screen audit: it used to
              vanish on any submit — a guest who answered Maybe/No then had NO way
              to pass the invite on). Hidden only when the Yes-only recruit CTA
              above already covers forwarding — and on a past-event recap, which
              carries its own "Share the memory" action (no duplicate forward). */}
          {!somber && !isPast && !(submitted && rsvp === 'Yes' && !queued) && (
            <div className="actions-row" style={{ marginTop: 14, justifyContent: 'center' }}>
              <button className="mini" onClick={() => shareForward(false)}>
                {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'Forward this invite'}
              </button>
            </div>
          )}
          {!isPast && <p className="grounding" style={{ marginTop: 18, textAlign: 'center', opacity: .7 }}>Your reply goes straight to your host’s plan — nothing to install, no account. Only your host sees it; the guest list stays private.</p>}
          {/* Guest-visible brand moment (build-map #6): the locked identity — the
              wordmark + machined brand period — on the one surface every guest
              touches. Tuned to the stationery's own palette, not the app steel. */}
          <div {...rv('inv2-wordmark')}>Event Boss<span className="inv2-wm-dot" aria-hidden="true" /></div>
        </section>
      </div></div>
    </div>
  );
}
