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
import { rsvpDeadlineFor, daysUntil, daysUntilEnd, spanEnd } from '@app/lib/dates';
import { eventStartLabel } from '@app/lib/eventWhen';
import { inviteTone, invitePalette, deepenForLight } from '@app/lib/inviteTone';
// Optional contact at RSVP (host-approved 2026-07-14): ONE formatter/validator
// with the host shell (lib/contactFormat — zero imports, so the guest bundle
// pays nothing), so a number typed here reads identically in the roster and
// the host's call/text/email affordances.
import { formatPhoneUS, isIncompletePhone, isValidPhone, isMalformedEmail, normalizePhone } from '@app/lib/contactFormat';
import { detectCoupleNames } from '@app/lib/guestSplit';
import { venueFor } from '@app/lib/venueFor';
import { guestItinerary, dayLabelFor } from '@app/lib/itinerary';
// GUEST PAYLOAD: this page used buildExperienceContext for exactly ONE thing —
// ctx.eventIdentity, to choose a headline. But experienceContext imports
// assembleRevealEngines, which drags the whole planning engine (and the 40
// playbooks) into the invite chunk. resolveEventIdentity is the OWNER of that
// field (experienceContext.js:48 just calls it) and has ZERO imports of its own.
// Same function, same result, none of the freight.
import { resolveEventIdentity } from '@app/lib/eventIdentityEngine';
import { geocodeVenue } from '@app/lib/weather';
import { dark as steelPalette } from '@app/theme/palette';
// Pulls ONLY the event pool + artwork resolver — not the 8,500-line host shell.
// This is the code-split: a guest opening ?rsvp=CODE no longer downloads
// HostShellV2 just to say yes.
// GUEST PAYLOAD: the heavy symbol is ALL_SAMPLES — importing it statically pulled
// eventPool (and, through it, ALL 40 PLAYBOOKS) into the invite chunk, so a guest
// downloaded ~490 KB gzip to tap "yes" while the invite's own code is 9 KB. The four
// small things live in inviteShared (free); the pool is dynamic-imported inside
// findInviteEvent, off the critical path. Same pool, same patch layers, same truth.
import { LS_PATCH, LS_CUSTOM, eventArtworkFile, AVA_TINTS } from './inviteShared.js';

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
    // Same derivation experienceContext.js:40-48 performs before handing the result
    // to eventIdentity — reproduced here so the invite reads the identity WITHOUT
    // importing the planning engine. One owner (resolveEventIdentity), same inputs.
    const typeWords = String(event.type || '').toLowerCase().split(/\s+/).filter(Boolean);
    const nameSansType = String(event.name || '').split(/\s+/)
      .filter(w => !typeWords.includes(w.toLowerCase())).join(' ');
    const freeText = [nameSansType, event.secondaryType, event.honoree, event.theme]
      .filter(Boolean).join('. ');
    const id = resolveEventIdentity(event, event.type, 'self', freeText);
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
    // Color audit I1: normalized to α0.10 to match the host (was .14/12% — the
    // exact density the host-side pass moved off of).
    '--ok-tint': pal.dark ? 'rgba(79,174,122,.10)' : 'color-mix(in srgb, #1e7a46 10%, transparent)',
    '--danger': pal.dark ? '#F27A70' : '#c03838',
    '--danger-tint': pal.dark ? 'rgba(242,122,112,.10)' : 'color-mix(in srgb, #c03838 10%, transparent)',
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
async function findInviteEvent(code) {
  try {
    const c = String(code || '').trim();
    if (!c) return null;
    let custom = null;
    try { custom = JSON.parse(localStorage.getItem(LS_CUSTOM)) || null; } catch { custom = null; }
    // The pool (and the playbook engine behind it) loads HERE, not at module scope —
    // so it never blocks the invite's first paint, and a guest whose invite resolves
    // from the backend never pays for it at all.
    const { ALL_SAMPLES } = await import('./eventPool.js');
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
  // The local pool is now a DYNAMIC import (it drags the playbook engine), so this
  // is async. `undefined` = the pool is still loading — distinct from `null` = the
  // code genuinely isn't in the pool. Conflating those would flash "link is dead"
  // for a beat on every invite, which is exactly the failure this page already goes
  // out of its way to avoid for the backend lookup.
  const [localEvent, setLocalEvent] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    setLocalEvent(undefined);
    (async () => {
      const ev = await findInviteEvent(code);
      if (!cancelled) setLocalEvent(ev || null);
    })();
    return () => { cancelled = true; };
  }, [code]);

  // undefined = a lookup is in flight; { event: null } = genuinely not found;
  // { event: null, failed: true } = the lookup itself failed (offline/5xx) — a
  // retryable state, NOT "this link is dead." retryTick re-runs the effect.
  const [resolved, setResolved] = useState(undefined);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (localEvent === undefined) { setResolved(undefined); return undefined; }  // pool still loading
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
  // What time to arrive — the one thing an invitation exists to say. See lib/eventWhen.
  const whenLabel = useMemo(() => { try { return eventStartLabel(event); } catch { return null; } }, [event]);
  // A crab feast's biggest cost is sized by how many people PICK, not how many come
  // (lib/playbooks — pickers size the shellfish). That count is currently the HOST's
  // guess. The guests are the only ones who know, and they are already right here
  // saying yes. Ask them. The answer flows back on the reply as `picksCrabs`.
  const isCrabEvent = useMemo(
    () => /crab|crawfish|low.?country|seafood boil/i.test(String((event && event.type) || '') + ' ' + String((event && event.name) || '')),
    [event],
  );
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
  // null = not asked/not answered; true/false = the guest told us. Never defaulted —
  // an unanswered picker question must not be counted as a 'no' (or a 'yes').
  const [picksCrabs, setPicksCrabs] = useState(null);
  // ── WHERE WOULD YOU RATHER STAY (rental-house engine, migration 016) ────────
  // The host shares a shortlist from the app; the group weighs in from here. The
  // answer is an OPINION that rides the same per-guest upsert as everything else
  // (`lodging_pick`) — never a booking, never a commitment. Renders only when the
  // host has actually published options, so it can't ask about nothing.
  const [lodgingPick, setLodgingPick] = useState('');
  const lodgingChoices = useMemo(() => {
    // `event` is NULL while the public code is still resolving — every other read
    // in this component sits behind that gate, and mine did not. Driving the real
    // invite URL caught it as a white screen for every guest, before ship.
    const raw = Array.isArray(event && event.lodgingOptions) ? event.lodgingOptions : [];
    return raw.filter(Boolean).map((o, i) => ({
      id: String((o && o.id) || `lodge-${i + 1}`),
      label: String((o && o.label) || `Option ${i + 1}`).trim() || `Option ${i + 1}`,
      // Only facts the host typed — never a computed claim on the guest's screen.
      sub: [
        o && Number(o.sleeps) > 0 ? `sleeps ${Number(o.sleeps)}` : null,
        o && Number(o.beds) > 0 ? `${Number(o.beds)} beds` : null,
        o && Number(o.totalPrice) > 0 ? `$${Number(o.totalPrice).toLocaleString()} total` : null,
      ].filter(Boolean).join(' · '),
      // The picture and the listing the host actually pasted. Guests were being
      // asked to choose a house from a NAME (host question 2026-07-28: "where are
      // the guests seeing the information, picture, link"). https-only, same gate
      // the host-side engine applies, so a stray string can never become a request.
      photoUrl: /^https:\/\//i.test(String((o && o.photoUrl) || '').trim()) ? String(o.photoUrl).trim() : '',
      url: /^https:\/\//i.test(String((o && o.url) || '').trim()) ? String(o.url).trim() : '',
      note: String((o && o.notes) || '').trim(),
    }));
  }, [event]);
  const [note, setNote] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  // Optional contact — phone OR email, both skippable. Never gates the reply:
  // an incomplete/garbled value simply isn't sent (inline hint says so), the
  // RSVP itself always goes through. Host-side only; never shown to guests.
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
      // venueFor constitution (ratchet shrink): name + gated city/state from the
      // one accessor. Same state-suffix disambiguation as the shell's weather
      // query — a bare city can silently geocode to the wrong same-named city.
      const vf = venueFor(event);
      const zipRaw = String((event && event.venueCity) || '').trim(); // venue-exempt: ZIP passthrough — the city gate rejects digits by design, but the geocoder accepts a bare ZIP
      const homeish = /^(backyard|back\s?yard|home|house|my place)$/i.test(vf.name);
      const vc = /^\d{5}$/.test(zipRaw) ? zipRaw : vf.city;
      const vs = vf.state;
      const q = (vc && !/^\d{5}$/.test(vc) && vs ? `${vc}, ${vs}, US` : vc) || (!homeish ? vf.name : '');
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
    // Span-aware (R1): past means past the LAST day — day 2 of a June 12–14
    // event must not read as a memory while guests are still living it.
    try { const d = daysUntilEnd(event); past = d != null && d < 0; } catch { /* undated → not past */ }
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

  const days = (() => { try { return daysUntil(event.date); } catch { return null; } })(); // countdown → FIRST day
  const daysEnd = (() => { try { return daysUntilEnd(event); } catch { return null; } })(); // tense → LAST day
  const rsvpBy = (() => { try { return rsvpDeadlineFor(event); } catch { return null; } })();
  // Only a date the HOST set is a date a guest can be held to. 'derived' is our own
  // event.date − 7d guess; printing it as "replies by" puts words in the host's mouth.
  const rsvpByIsReal = !!(rsvpBy && rsvpBy.iso && rsvpBy.source === 'override');
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
  // AVA_TINTS now shared from eventPool (audit Cr1) — one source with the host roster.
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
  // Span-aware (R1): the recap flip waits for the LAST day to pass. On a
  // multi-day event `days` goes negative on day 2 while the party is still on —
  // keying isPast on it locked guests out of the RSVP form mid-event.
  const isPast = daysEnd != null && daysEnd < 0;
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
      // Only send it when they actually answered AND they're coming — an absent answer
      // stays absent rather than becoming a fabricated false.
      ...(rsvp === 'Yes' && isCrabEvent && picksCrabs !== null ? { picksCrabs } : {}),
      // Same rule as picksCrabs: only when they're actually coming AND they answered.
      ...(rsvp === 'Yes' && lodgingChoices.length && lodgingPick ? { lodgingPick } : {}),
      note: note.trim(),
      ...(event.collectAddresses && mailingAddress.trim() ? { mailingAddress: mailingAddress.trim() } : {}),
      // Contact rides along ONLY when it's real: a complete US-shaped phone
      // (stored in the roster's one display format) or an email-shaped email.
      // Garbage is dropped here — the inline hints already said it wouldn't
      // send — and the reply itself is never held up by it.
      ...(normalizePhone(contactPhone) && isValidPhone(contactPhone) ? { phone: formatPhoneUS(contactPhone) } : {}),
      ...(contactEmail.trim() && !isMalformedEmail(contactEmail) ? { email: contactEmail.trim() } : {}),
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
          // Structured dietary/access MUST ride the wire — until 2026-07-27 these
          // reached only the same-browser localStorage queue; the server schema
          // dropped them silently, so a remote guest's ALLERGY answer never
          // reached the host's roster. Data-loss class, fixed with the schema.
          ...(payload.allergens?.length ? { allergens: payload.allergens } : {}),
          ...(payload.diets?.length ? { diets: payload.diets } : {}),
          ...(payload.access?.length ? { access: payload.access } : {}),
          ...(payload.mailingAddress ? { mailing_address: payload.mailingAddress } : {}),
          ...(payload.picksCrabs !== undefined ? { picks_crabs: payload.picksCrabs } : {}),
          ...(payload.lodgingPick ? { lodging_pick: payload.lodgingPick } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          ...(payload.email ? { email: payload.email } : {}),
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

  // Add-to-calendar: Google link + a real .ics — all-day, spanning the whole
  // event (DTEND is exclusive, so last day + 1). Before R1 this always booked a
  // one-day block: a guest calendared "June 12" for a June 12–14 reunion.
  const calDate = String(event.date || '').replace(/-/g, '');
  const calEnd = (() => {
    if (!event.date) return '';
    const last = spanEnd(event) || String(event.date).slice(0, 10);
    const d = new Date(last + 'T12:00:00'); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  })();
  // Calendar location: name + GATED city from the constitution (a polluted
  // venueCity no longer rides into guests' calendars).
  const vfLoc = venueFor(event);
  const gcalUrl = event.date
    ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(event.name || 'Event')
      + '&dates=' + calDate + '/' + calEnd
      + (vfLoc.name ? '&location=' + encodeURIComponent(vfLoc.name + (vfLoc.city ? ', ' + vfLoc.city : '')) : '')
    : null;
  const icsHref = event.date
    ? 'data:text/calendar;charset=utf-8,' + encodeURIComponent([
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NGW Event Boss//Guest Invite//EN',
      'BEGIN:VEVENT', `UID:invite-${event.id}-${code}@ngw-events`,
      `DTSTART;VALUE=DATE:${calDate}`, `DTEND;VALUE=DATE:${calEnd}`,
      `SUMMARY:${String(event.name || 'Event').replace(/[,;]/g, ' ')}`,
      ...(vfLoc.name ? [`LOCATION:${vfLoc.name.replace(/[,;]/g, ' ')}`] : []),
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
              {/* F4 — the masthead above already says "An invitation". This eyebrow said
                  "You're invited" 100px below it: the same message, in the same role, twice.
                  So the DEFAULT case is dropped and the masthead carries it.
                  The other two states are NOT redundant — they say something the masthead
                  cannot ("Thank you for coming" on a recap; "Please join us" on a memorial,
                  where "An invitation" would be tonally wrong) — so they still render. */}
              {(isPast || somber) && (
                <div className="inv2-eyebrow lp" style={{ marginTop: mark ? 10 : 22 }}>{isPast ? 'Thank you for coming' : 'Please join us'}</div>
              )}
            </div>
            {/* The dropped eyebrow was carrying the air above the name — without it the
                crest would sit on the title. The space stays; only the duplicate words go. */}
            <h1 {...rv('inv2-name lp-display')} style={(isPast || somber) ? undefined : { marginTop: mark ? 18 : 26 }}>{event.name}</h1>
            <p {...rv('inv2-deck lp')}>{deck}</p>
            <div {...rv()}>
              <hr className="inv2-rule" />
              {/* WHEN — F1 of the invite audit (CRITICAL). This formatted
                  { weekday, month, day } and had NO hour component, for any event —
                  so the invite could not tell a guest what time to arrive. The app
                  KNEW: event.startTime / event.timeOfDay anchor the entire run of
                  show, and the HOST's own cover screen renders "· Afternoon". We
                  showed the time to the host and withheld it from the guest.
                  lib/eventWhen is the one reader (zero imports, so the invite pays
                  nothing for it). An exact time renders as "7:30 PM"; a coarse
                  bucket renders as "Afternoon" — never a clock time invented from a
                  bucket; and when the host has told us nothing, we say nothing
                  rather than guess. */}
              {event.date && (<><div className="inv2-label lp">When</div>
                <div className="inv2-val lp">
                  {dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}
                  {/* Multi-day span (R1): the range the host actually set — never
                      just day 1 of a three-day weekend. */}
                  {spanEnd(event) !== String(event.date).slice(0, 10)
                    ? <> – {dfmt(spanEnd(event), { weekday: 'long', month: 'long', day: 'numeric' })}</>
                    : null}
                  {whenLabel ? <span className="inv2-when-time"> · {whenLabel.label}</span> : null}
                </div></>)}
              {venueFor(event).displayLine && (<><div className="inv2-label lp">Where</div>
                <div className="inv2-val lp">{venueFor(event).displayLine}</div></>)}
              {/* ── Trip Brief v0 (destination events) — host-authored stay +
                  airports, read-only. Renders on DATA presence, never on an
                  inferred flag; nothing here is guest data or money. */}
              {!isPast && event.lodging && event.lodging.hotelName && (<><div className="inv2-label lp">Stay</div>
                <div className="inv2-val lp">
                  {event.lodging.hotelName}
                  {event.lodging.rate ? ` · $${event.lodging.rate}/night group rate` : ''}
                  {event.lodging.code ? ` · code ${event.lodging.code}` : ''}
                  {event.lodging.deadline ? ` · book by ${dfmt(String(event.lodging.deadline).slice(0, 10), { month: 'long', day: 'numeric' })}` : ''}
                </div></>)}
              {!isPast && Array.isArray(event.airportOptions) && event.airportOptions.filter(a => a && (a.code || a.name)).length > 0 && (<><div className="inv2-label lp">Fly into</div>
                <div className="inv2-val lp">{event.airportOptions.filter(a => a && (a.code || a.name)).map(a => [a.code, a.name].filter(Boolean).join(' — ') + (a.note ? ` (${a.note})` : '')).join(' · ')}</div></>)}
              {/* ── The weekend plan (Slice A): HOST-ACCEPTED rows only —
                  guestItinerary without getPlaybook yields source 'host' alone
                  here, so an unaccepted proposal can never leak to guests.
                  Slots, never invented clock times. */}
              {!isPast && (() => {
                const it = guestItinerary(event, null);
                if (!it.relevant || it.source !== 'host') return null;
                const byDay = [];
                for (const r of it.rows) {
                  const last = byDay[byDay.length - 1];
                  if (last && last.day === r.day) last.rows.push(r);
                  else byDay.push({ day: r.day, rows: [r] });
                }
                return (<><div className="inv2-label lp">The plan</div>
                  <div className="inv2-val lp">
                    {byDay.map((g) => (
                      <div key={g.day} style={{ marginBottom: 4 }}>
                        <strong>{dayLabelFor(event, g.day)}</strong>
                        {g.rows.map((r, i) => (
                          <div key={i}>
                            {(r.time || r.slot) ? `${r.time || r.slot} — ` : ''}{r.anchor ? <strong>{r.title}</strong> : r.title}{r.note ? ` · ${r.note}` : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div></>);
              })()}
              {/* Details the host set — the backend already sends these on the
                  public event (whitelisted); the invite just wasn't rendering
                  them. Present-only, and hidden on a past-event recap. */}
              {!isPast && String(event.dressCode || '').trim() && (<><div className="inv2-label lp">Dress</div>
                <div className="inv2-val lp">{event.dressCode}</div></>)}
              {!isPast && String(event.bringNote || '').trim() && (<><div className="inv2-label lp">Bring</div>
                <div className="inv2-val lp">{event.bringNote}</div></>)}
              {/* WHO IS INVITING YOU. Every leader shows this (Partiful: "Hosted by
                  Erin L") and we showed nothing — the event model had no host-name
                  field at all. `hostContact` is an email/phone (seeds hold
                  "gala@hopefoundation.org", "(202) 555-0114"), so rendering IT as
                  "Hosted by" would print an address on the invitation. hostName is a
                  real name, captured in "Make it yours". The contact row still renders
                  below it for the guest who needs to reach someone. */}
              {/* Field-name truth: the local pool carries hostName (singular); the
                  backend whitelist ships hostNames (plural, rsvp.py) — reading only
                  one meant remote invites NEVER showed who's hosting. */}
              {!isPast && String(event.hostName || event.hostNames || '').trim() && (<><div className="inv2-label lp">Hosted by</div>
                <div className="inv2-val lp">{event.hostName || event.hostNames}</div></>)}
              {!isPast && String(event.hostContact || '').trim() && (<><div className="inv2-label lp">Host</div>
                <div className="inv2-val lp">{(() => {
                  // Backend contract (rsvp.py): hostContact renders as a tap-to-message
                  // link, never printed raw. Email → mailto:, anything phone-shaped → sms:.
                  const c = String(event.hostContact).trim();
                  const href = c.includes('@') ? 'mailto:' + c : 'sms:' + c.replace(/[^\d+]/g, '');
                  return <a href={href} style={{ color: 'inherit' }}>Message the host</a>;
                })()}</div></>)}
              {/* A REPLY-BY DATE THE HOST NEVER SET (2026-07-14).
                  rsvpDeadlineFor() returns `source: 'derived'` with `hard: true` when the
                  host set nothing — an invented `event.date − 7d` flagged as FIRM — and this
                  line never read `.source`, so a fabricated deadline printed identically to
                  one the host actually chose. A guest was shown a date nobody committed to.

                  Only the host's own date is presented as an ask. They CAN set one (Guests
                  sheet → "replies by"), and the field is even prefilled with the derived
                  suggestion — a suggestion in the HOST's UI is fine; a claim on a GUEST's
                  invitation is not.

                  Second bug on the same line: the gate read `days` — days to the EVENT — not
                  `rsvpBy.days`, days to the DEADLINE. `rsvpBy.days` was computed and never
                  used, so a reply-by date that had already PASSED kept rendering as live
                  urgency. Now it stops when it lapses. */}
              {!isPast && ((rsvpByIsReal && rsvpBy.days != null && rsvpBy.days >= 0) || social) ? (
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
                    {rsvpByIsReal && rsvpBy.days != null && rsvpBy.days >= 0 ? 'replies by ' + dfmt(rsvpBy.iso, { month: 'long', day: 'numeric' }) : ''}
                    {rsvpByIsReal && rsvpBy.days != null && rsvpBy.days >= 0 && social ? ' · ' : ''}{social || ''}
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
                  {!nameInvalid && detectCoupleNames(guestName) && (
                    // "Ryan and Nicole" in ONE name field = one reply for two
                    // people — the second person vanishes from every count.
                    // Nudge, never auto-split: replying for someone else is
                    // the guest's call, not a regex's.
                    <p className="grounding" style={{ margin: '6px 0 0' }}>Replying for two? Put one name here and add the other under “Bringing someone?” so you’re both counted.</p>
                  )}

                  {rsvp === 'Yes' && (
                    <>
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Meal</div>
                      <div className="chips">{MEALS.map(m => chip(meal === m, m, () => setMeal(m)))}</div>
                      {/* SHELLFISH — SAFETY BEFORE MONEY.
                          The full allergy set lives behind progressive disclosure below,
                          which is right for most events: most guests have no needs, and a
                          wall of chips taxes everyone to catch a few.
                          It is WRONG here. On a crab feast the allergen IS the menu. The
                          app's own risk card rates this severity:'high' and its mitigation
                          literally opens with "Ask ahead." — and the invite is the only
                          place we can ask. Collapsing it while surfacing the money question
                          ("are you picking?") outright meant we protected the host's wallet
                          on the main form and hid the question that protects a guest's life.
                          So on shellfish events we ask it OUTRIGHT, above the picker
                          question. It writes to the SAME allergensSel state the full set
                          uses — one source, no double-collection, no new field. */}
                      {isCrabEvent && (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Shellfish allergy?</div>
                          <div className="chips" role="group" aria-label="Shellfish allergy">
                            {chip(allergensSel.includes('Shellfish'), 'Yes — I’m allergic to shellfish',
                              () => setAllergensSel(s => {
                                const on = !s.includes('Shellfish');
                                // A guest who can't eat shellfish is not a crab picker. Let the
                                // form hold that contradiction and the host would size crabs for
                                // someone who can't touch them — and the picker count is money.
                                if (on) setPicksCrabs(false);
                                return on ? [...s, 'Shellfish'] : s.filter(x => x !== 'Shellfish');
                              }),
                              'sf-yes')}
                          </div>
                          <p className="inv2-fine" style={{ margin: '6px 0 0' }}>
                            The whole menu is shellfish — your host will plan you a separate plate.
                          </p>
                        </>
                      )}
                      {/* PICKERS. The crab order is the biggest cost of the whole event, and
                          it sizes to how many people PICK — not how many come (a third of a
                          table never touches a crab). That count is currently the HOST's
                          guess. The guests know, and they are already right here. One tap
                          turns the guess into truth, and it's a question people enjoy
                          answering. Flows back as `picksCrabs` → crabPlan.crabEatingHeadcount. */}
                      {isCrabEvent && (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Are you picking crabs?</div>
                          <div className="chips">
                            {chip(picksCrabs === true, 'Yes — hand me a mallet', () => setPicksCrabs(true))}
                            {chip(picksCrabs === false, 'Not me — I’ll eat the sides', () => setPicksCrabs(false))}
                          </div>
                          <p className="inv2-fine" style={{ margin: '6px 0 0' }}>
                            It’s how your host knows how many crabs to buy.
                          </p>
                        </>
                      )}
                      {/* The rental shortlist the host published. One tap, and it's
                          explicitly a preference — the host still books it. */}
                      {lodgingChoices.length > 0 && (
                        <>
                          <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Where would you rather stay?</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {lodgingChoices.map(o => {
                              const on = lodgingPick === o.id;
                              return (
                                <div key={'lodge-' + o.id} className="chip"
                                  role="radio" aria-checked={on}
                                  tabIndex={0}
                                  onClick={() => setLodgingPick(on ? '' : o.id)}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLodgingPick(on ? '' : o.id); } }}
                                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left',
                                    width: '100%', cursor: 'pointer', padding: 10, height: 'auto', whiteSpace: 'normal' }}>
                                  {o.photoUrl ? (
                                    <img src={o.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer"
                                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flex: '0 0 auto' }}
                                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                                  ) : null}
                                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <strong style={{ fontWeight: 650 }}>{o.label}</strong>
                                    {o.sub ? <span className="inv2-fine" style={{ margin: 0 }}>{o.sub}</span> : null}
                                    {o.note ? <span className="inv2-fine" style={{ margin: 0 }}>{o.note}</span> : null}
                                    {o.url ? (
                                      <a href={o.url} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{ fontSize: 12, textDecoration: 'underline' }}>See the listing ↗</a>
                                    ) : null}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="inv2-fine" style={{ margin: '6px 0 0' }}>
                            Just a preference — your host makes the call and books it.
                          </p>
                        </>
                      )}
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

                  {rsvp && rsvp !== 'No' && (
                    <>
                      {/* OPTIONAL CONTACT (host-approved "guest contact at RSVP").
                          Lives HERE — well below the one ask, beside the other
                          optional extras — so it never competes with the reply
                          itself. Phone or email, both skippable; the phone
                          formats through the SAME lib/contactFormat the host
                          roster uses, so one number reads one way everywhere.
                          A partial/garbled value gets a plain inline note and is
                          simply left off the reply — it never blocks Send. Only
                          the host sees it (the roster never travels to guests;
                          the invite shows first names only). */}
                      <div className="shelf-label" style={{ margin: '14px 0 6px' }}>How to reach you — optional</div>
                      <p className="grounding" style={{ margin: '0 0 6px' }}>A phone or email lets your host reach you with day-of details. Only your host sees it — skip it if you’d rather not.</p>
                      <input className="field" style={{ maxWidth: 'none', fontSize: 'var(--t-input)' }} placeholder="Phone"
                        inputMode="tel" autoComplete="tel" value={contactPhone}
                        onChange={e => setContactPhone(formatPhoneUS(e.target.value))}
                        aria-label="Your phone — optional" aria-invalid={isIncompletePhone(contactPhone) || undefined} />
                      {isIncompletePhone(contactPhone) && (
                        <p className="inv2-fine" style={{ margin: '4px 0 0' }}>That doesn’t look like a full number — finish it or leave it blank. Your reply sends either way.</p>
                      )}
                      <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 'var(--t-input)' }} placeholder="Email"
                        type="email" inputMode="email" autoComplete="email" value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        aria-label="Your email — optional" aria-invalid={isMalformedEmail(contactEmail) || undefined} />
                      {isMalformedEmail(contactEmail) && (
                        <p className="inv2-fine" style={{ margin: '4px 0 0' }}>That doesn’t look like an email address — check it or leave it blank. Your reply sends either way.</p>
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
                  {rsvp !== 'No' && gcalUrl && <a className="mini" style={{ textDecoration: 'none' }} href={gcalUrl} target="_blank" rel="noreferrer">Add to Google Calendar</a>}
                  {rsvp !== 'No' && icsHref && <a className="mini" style={{ textDecoration: 'none' }} href={icsHref} download={(event.name || 'event') + '.ics'}>Add to Apple Calendar</a>}
                  <button className="mini" onClick={() => setSubmitted(false)}>Change my answer</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Getting there — event day only; unchanged mechanics. ── */}
          {days != null && days <= 0 && !isPast && venueFor(event).isSet && (
            <div className="card no-hover" style={{ marginTop: 14 }}><div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
              <div className="shelf-label" style={{ marginBottom: 4 }}>Getting there — it’s today</div>
              <p className="grounding" style={{ margin: '0 0 8px' }}>{venueFor(event).displayLine}</p>
              <div className="actions-row" style={{ marginTop: 0 }}>
                <a className="mini" style={{ textDecoration: 'none' }} target="_blank" rel="noreferrer"
                  href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(venueFor(event).mapsQuery)}>
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
