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
import { BRAND } from '@app/lib/brand';
import { recruitHref } from '@app/lib/acquisition';
import PhotoStrip from './PhotoStrip.jsx';
import PolicyLinks from './PolicyLinks.jsx';
import { photoList, STAY_FROM_PICK, STAY_FROM_PLAN } from '@app/lib/lodgingIntel';
import { dateOptionsOf, rangeLabel } from '@app/lib/datePoll';
import { guestSafeText } from '@app/lib/guestFacing';
import { GUEST_DATA_NOTICE } from '@app/lib/guestDataNotice';
import { track as trackInvite, EVENTS as INVITE_EVENTS } from '@app/lib/analytics';
import { isRsvpApiConfigured, checkRsvpCapability, submitRsvp, rsvpIdempotencyKey, existingRsvpKey, fetchMyRsvp, withdrawRsvp, flushRsvpOutbox, fetchPublicInvite, INVITE_FETCH_FAILED } from '@app/lib/api/rsvp';
import { rsvpDeadlineFor, daysUntil, daysUntilEnd, spanEnd } from '@app/lib/dates';
import { eventStartLabel } from '@app/lib/eventWhen';
import { inviteTone, invitePalette, invitePaletteFor, inviteSheetVars } from '@app/lib/inviteTone';
// Optional contact at RSVP (host-approved 2026-07-14): ONE formatter/validator
// with the host shell (lib/contactFormat — zero imports, so the guest bundle
// pays nothing), so a number typed here reads identically in the roster and
// the host's call/text/email affordances.
import { formatPhoneUS, isIncompletePhone, isValidPhone, isMalformedEmail, normalizePhone } from '@app/lib/contactFormat';
import { detectCoupleNames } from '@app/lib/guestSplit';
import { hashtagLine } from '@app/lib/eventHashtag';
import { venueFor, formatVenueAddress, venueGeoQuery, venueLineParts } from '@app/lib/venueFor';
import { useBreakpoint } from '@app/lib/viewport';
import { guestFacingDays, dayLabelFor } from '@app/lib/itinerary';
// GUEST PAYLOAD: this page used buildExperienceContext for exactly ONE thing —
// ctx.eventIdentity, to choose a headline. But experienceContext imports
// assembleRevealEngines, which drags the whole planning engine (and the 40
// playbooks) into the invite chunk. resolveEventIdentity is the OWNER of that
// field (experienceContext.js:48 just calls it) and has ZERO imports of its own.
// Same function, same result, none of the freight.
import { inviteMessage } from '@app/lib/inviteDeck';
import { publicHostPhotoUrl } from '@app/lib/api/hostPhoto';
import { geocodeVenue } from '@app/lib/weather';
// Pulls ONLY the event pool + artwork resolver — not the 8,500-line host shell.
// This is the code-split: a guest opening ?rsvp=CODE no longer downloads
// HostShellV2 just to say yes.
// GUEST PAYLOAD: the heavy symbol is ALL_SAMPLES — importing it statically pulled
// eventPool (and, through it, ALL 40 PLAYBOOKS) into the invite chunk, so a guest
// downloaded ~490 KB gzip to tap "yes" while the invite's own code is 9 KB. The four
// small things live in inviteShared (free); the pool is dynamic-imported inside
// findInviteEvent, off the critical path. Same pool, same patch layers, same truth.
import { LS_PATCH, LS_CUSTOM, eventArtworkFile, AVA_TINTS, toneVarsFor } from './inviteShared.js';
// Guest questions + "opened" (ruling A) and guest photos (rulings B–D),
// 11/16/2026. Both are server-backed: rendered only for an invite the server
// resolved, never for a same-device preview (localEvent).
import GuestAskV2 from './GuestAskV2.jsx';
import GuestUpdatesV2 from './GuestUpdatesV2.jsx';
import GuestPhotosV2 from './GuestPhotosV2.jsx';
import { isGuestMessagesApiConfigured, recordInviteOpened, inviteDeviceId } from '@app/lib/api/guestMessages';
import { isGuestPhotosApiConfigured } from '@app/lib/api/guestPhotos';
import { MEALS, ALLERGENS, DIET_RULES } from '@app/lib/dietOptions';

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
// Dietary & access, redesigned (host request 2026-07-12) into structured groups
// that each flow to a real consumer — allergens → food item flags, diet → food
// sizing/flags, access → seating. The old flat NEEDS list (Nut allergy /
// Shellfish / Dairy-free / Egg / Kosher / Halal / Wheelchair access) under-
// collected: no Peanut/Milk/Fish/Soy/Sesame, and "Egg" matched nothing
// downstream. ALLERGENS is the FDA "big-9". DIET_RULES are preferences/rules
// (a preference is softer than the same-named allergen — the host sees both).
// The meal, diet and allergen lists are lib/dietOptions (11/25/2026), shared
// with the host's guest sheet in hostv4.
const ACCESS_NEEDS = ['Step-free / wheelchair', 'Needs an accessible seat'];


// The invite speaks the EVENT'S mood (lib/inviteTone — one truth with the
// original): light = warm paper, dark = elegant evening, muted = somber. The
// palette lands as scoped CSS-var overrides so every class retints, and the
// steel identity accent deepens on paper (dark-tuned hues wash out on cream).
// toneVarsFor lives in inviteShared.js: the vendor brief page wears the same paper.

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

// The host's contact as a tap-to-message link (backend contract, rsvp.py):
// email → mailto:, anything phone-shaped → sms:. Never printed raw.
const hostContactHref = (event) => {
  const c = String((event && event.hostContact) || '').trim();
  if (!c) return '';
  return c.includes('@') ? 'mailto:' + c : 'sms:' + c.replace(/[^\d+]/g, '');
};
const initialsOf = (name) => String(name || '').split(/\s*(?:&|\+|\/|,|\band\b)\s*/)[0]
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// THE HOST'S PHOTO (owner, 11/24/2026): her own opt-in photo, by invite code
// (backend host_photos.py), else her initials. A photo that fails to load
// falls back to the initials, never a broken image.
function HostAvatar({ src, name, size }) {
  const [broken, setBroken] = useState(false);
  const cls = 'inv2-hp inv2-hp-' + size;
  if (src && !broken) return <img className={cls} data-host-avatar src={src} alt={name ? 'Photo of ' + name : 'Your host'} onError={() => setBroken(true)} />;
  const ini = initialsOf(name);
  return ini ? <span className={cls + ' ini'} data-host-avatar role="img" aria-label={name}>{ini}</span> : null;
}

// `preview` (the host's "Your invite" panel, 11/24/2026): render THIS event,
// as typed, with the same component the guest opens: nothing is fetched,
// sent, counted or stored, and the page chrome is left to the panel.
export default function InviteV2({ code, preview = null, previewPhotoUrl = null }) {
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
    if (preview) { setLocalEvent(preview); return undefined; }
    setLocalEvent(undefined);
    (async () => {
      const ev = await findInviteEvent(code);
      if (!cancelled) setLocalEvent(ev || null);
    })();
    return () => { cancelled = true; };
  }, [code, preview]);

  // ── DID THE SHARE LAND? (2026-08-29) ──────────────────────────────────────
  // INVITE_SHARED without INVITE_VIEWED is a host talking to nobody, and until
  // now the shipping app reported neither. Fired once per code, and ONLY for a
  // resolved event: a dead link is not a view, and counting it would inflate
  // the reach half of the only conversion pair this product has.
  const viewedRef = useRef(null);

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
  // A reply tapped in the invite EMAIL (backend invite_email: Yes / Can't make
  // it / Maybe) arrives as ?reply=; it only PRESELECTS. Nothing is sent until
  // the guest adds a name and taps send. Anything else picks nothing.
  const [rsvp, setRsvp] = useState(() => {
    try { const v = new URLSearchParams(window.location.search).get('reply'); return ['Yes', 'No', 'Maybe'].includes(v) ? v : ''; } catch { return ''; }
  });
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
      photos: photoList(o),
      url: /^https:\/\//i.test(String((o && o.url) || '').trim()) ? String(o.url).trim() : '',
      note: String((o && o.notes) || '').trim(),
    }));
  }, [event]);
  // ── WHICH DATES WORK FOR YOU (owner pick B, 11/21/2026, migration 034) ────
  // The host offered up to three ranges; the guest ticks every one that works.
  // Asked BEFORE attendance (the prototype asked after Yes): a guest who can't
  // make one range may make another, and her answer depends on the dates.
  // Rides the same per-guest upsert (`date_picks`); only offered ids are sent.
  const [datePicks, setDatePicks] = useState([]);
  const dateChoices = useMemo(() => dateOptionsOf(event).map((o) => ({ id: String(o.id), label: rangeLabel(o) })), [event]);
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
  // What the server left out of her reply and why (the host's rules, rsvp.py
  // _reply_rules): the form hides those fields, so this shows only when a
  // stale page sent them.
  const [replyNotice, setReplyNotice] = useState('');
  const [shareState, setShareState] = useState('');
  const [shareError, setShareError] = useState('');
  const shareTimer = useRef(null);
  // ── A GUEST'S OWN REPLY: change it or delete it (11/11/2026) ─────────────
  // This device's key (minted when she first replied) is the only credential,
  // so a returning guest on the same phone sees what she sent and can change
  // or delete it. Another device has no key and sees the blank form.
  const [deleteAsk, setDeleteAsk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteNote, setDeleteNote] = useState('');   // '' | 'done' | 'failed'
  const restoredRef = useRef('');
  const fillFromReply = (r) => {
    const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
    const al = list(r.allergens), di = list(r.diets), ac = list(r.access);
    const structured = new Set([...al, ...di, ...ac]);
    const other = String(r.needs || '').split(',').map((x) => x.trim()).filter((x) => x && !structured.has(x)).join(', ');
    setGuestName(r.guest_name || ''); setRsvp(r.rsvp || '');
    setMeal(MEALS.includes(r.meal) ? r.meal : 'Standard');
    setAllergensSel(al); setRulesSel(di); setAccessSel(ac); setNeedsOther(other);
    setNeedsOpen(!!(al.length || di.length || ac.length || other));
    setHasPlusOne(!!r.plus_one); setPlusOne(r.plus_one || '');
    setPlusOneMeal(MEALS.includes(r.plus_one_meal) ? r.plus_one_meal : 'Standard'); setPlusOneNeeds(r.plus_one_needs || '');
    setKids(Number(r.kids) || 0);
    setPicksCrabs(typeof r.picks_crabs === 'boolean' ? r.picks_crabs : null);
    setLodgingPick(r.lodging_pick || ''); setDatePicks(Array.isArray(r.date_picks) ? r.date_picks.map(String) : []); setNote(r.note || ''); setMailingAddress(r.mailing_address || '');
    setContactPhone(r.phone || ''); setContactEmail(r.email || '');
  };
  const clearReplyForm = () => {
    setGuestName(''); setRsvp(''); setMeal('Standard'); setAllergensSel([]); setRulesSel([]); setAccessSel([]);
    setNeedsOther(''); setNeedsOpen(false); setHasPlusOne(false); setPlusOne(''); setPlusOneMeal('Standard');
    setPlusOneNeeds(''); setKids(0); setPicksCrabs(null); setLodgingPick(''); setDatePicks([]); setNote(''); setMailingAddress('');
    setContactPhone(''); setContactEmail('');
  };
  useEffect(() => {
    const ev = resolved && resolved.event;
    if (!ev || !code || preview || !isRsvpApiConfigured()) return undefined;
    const tag = ev.id + ':' + code;
    if (restoredRef.current === tag) return undefined;
    restoredRef.current = tag;
    const idk = existingRsvpKey(tag);
    if (!idk) return undefined;
    let live = true;
    fetchMyRsvp(code, idk).then((r) => {
      if (!live || !r || !r.rsvp) return;
      fillFromReply(r);
      setQueued(false); setSubmitted(true);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, code]);
  useEffect(() => {
    const ev = resolved && resolved.event;
    if (!ev || preview || viewedRef.current === code) return;
    viewedRef.current = code;
    // No is_past here on purpose: `isPast` is declared far below this effect,
    // so reading it in the dependency array is a temporal dead zone error on
    // every invite render. event_type carries the useful cut anyway.
    try { trackInvite(INVITE_EVENTS.INVITE_VIEWED, { event_type: ev.type }); } catch (_e) { /* a counter never blocks a guest */ }
  }, [resolved, code]);
  // "OPENED YOUR INVITE" (owner ruling A, 11/16/2026): once per load, for an
  // invite the server resolved. Fire-and-forget; the server throttles it and
  // names a guest only when this device already replied or asked (her existing
  // key). Never sent for a same-device preview. The page says so in the foot.
  const openedRef = useRef(null);
  useEffect(() => {
    const ev = resolved && resolved.event;
    if (!ev || localEvent || openedRef.current === code || !isGuestMessagesApiConfigured()) return;
    openedRef.current = code;
    recordInviteOpened(code, { deviceId: inviteDeviceId(), guestKey: existingRsvpKey(ev.id + ':' + code) || undefined });
  }, [resolved, code, localEvent]);
  // Whether the server says photo uploads are open (GuestPhotosV2 reports it);
  // the recap's photo line reads it rather than promising anything itself.
  const [photosOpen, setPhotosOpen] = useState(null);

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
      // The shell's weather query (venueGeoQuery): the ZIP when the event holds
      // one (venueZip or a bare ZIP), else "City, ST, US", so a bare city never
      // geocodes to a same-named one in another state (11/24/2026: venueZip
      // with a town was asked as the town).
      const vf = venueFor(event);
      const homeish = /^(backyard|back\s?yard|home|house|my place)$/i.test(vf.name);
      const q = venueGeoQuery(event) || (!homeish ? vf.name : '');
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
  // THE HOST'S COLORS (owner-approved palettes, 11/24/2026): a palette or a
  // rearrangement of one, from event.inviteStyle (lib/inviteTone). null keeps
  // today's stock (cream, dark, muted) exactly as it was.
  const colors = useMemo(() => { try { return invitePaletteFor(event || {}); } catch { return null; } }, [event]);
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
    return inviteMessage(event, { somber: tone === 'muted', past });
  }, [event, tone]);
  // Opened from the reply's calendar door before a reply (11/24/2026).
  const [calOpen, setCalOpen] = useState(false);

  // Flush anything queued offline for this event once we're back (parity with
  // the original's PublicRsvpRoute; a no-op while no backend is configured).
  useEffect(() => {
    if (!event || preview || !isRsvpApiConfigured()) return undefined;
    // An emptied outbox means the held reply reached the host: stop saying
    // "not delivered" (it stayed on screen after a successful flush).
    const flush = () => { flushRsvpOutbox(event.id, code).then((r) => { if (r && r.flushed && !r.remaining) setQueued(false); }).catch(() => {}); };
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
  // FULL SCREEN AT 1024 AND UP (owner, 11/11/2026): the invitation on the left,
  // the reply on the right. Same breakpoint as the stylesheet's two-column rule
  // (lib/viewport: tablet-land starts at 1024). Read here only so the countdown
  // keeps its full size there: it sits beside the reply, not above it, so there
  // is nothing to make room for, and condensing it would shift the left column.
  const bp = useBreakpoint();
  const twoColumn = !preview && (bp === 'tablet-land' || bp === 'desktop');
  // A guest scrolls down the form to reach "Send my reply"; sending collapses the
  // form, and the page stayed scrolled to where the button was — the
  // confirmation opened with the top of the card cut off. Show the whole card
  // when it fits the screen; when it doesn't, at least the whole confirmation.
  const doneRef = useRef(null);
  // THE CARD HOLDS STILL WHEN THE FORM OPENS. The card centers its content
  // (theInviteSitsBalanced), and the form outgrows it, so the centering slack
  // vanished and everything slid up under the guest's finger: measured 140px on
  // a 768x1024 tablet. On the first tap the content's current offset is pinned
  // as top padding, so the form grows downward only.
  const sheetRef = useRef(null);
  const [holdTop, setHoldTop] = useState(null);
  const pinSheet = () => {
    const sheet = sheetRef.current;
    const mast = sheet && sheet.querySelector('.inv2-mast');
    if (!sheet || !mast || holdTop != null) return;
    setHoldTop(Math.round(mast.parentElement.getBoundingClientRect().top - sheet.getBoundingClientRect().top));
  };
  useEffect(() => { if (submitted) setHoldTop(null); }, [submitted]);
  useEffect(() => {
    const done = doneRef.current;
    if (!submitted || !done) return;
    const scroller = done.closest('.app');
    const card = done.closest('.inv2-sheet');
    if (!scroller || !card) return;
    const top = scroller.scrollTop + card.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const fits = done.getBoundingClientRect().bottom - card.getBoundingClientRect().top <= scroller.clientHeight;
    if (fits) scroller.scrollTo({ top: Math.max(0, top - 14) });
    else if (done.scrollIntoView) done.scrollIntoView({ block: 'nearest' });
  }, [submitted]);
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
  // Guest photos are offered on the event day and after, for an invite the
  // server resolved; the server decides when uploads actually open.
  const photosOffered = !localEvent && isGuestPhotosApiConfigured() && days != null && days <= 0;
  const asksOffered = !localEvent && isGuestMessagesApiConfigured();
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
      if (n <= 0) return null;   // owner, 11/11/2026: no "Be the first to say yes"
      // A count of REPLIES, not people (audit 2 E P2-1, 11/22/2026): one yes
      // can bring a plus-one, and "7 going" sat beside the host's 17 people.
      return n === 1 ? '1 has said yes' : `${n} have said yes`;
    }
    const yes = (event.guests || []).filter(g => g && g.rsvp === 'Yes');
    if (!yes.length) return null;
    const names = [];
    for (const g of yes) {
      const n = String(g.name || '').trim();
      if (!n || /\(|group|table|family|team|&| and /i.test(n)) continue;
      const first = n.split(/\s+/)[0];
      if (first && !names.includes(first)) names.push(first);
      if (names.length >= 2) break;
    }
    if (names.length >= 2 && yes.length > 2) return `${names[0]}, ${names[1]} + ${yes.length - 2} more said yes`;
    if (names.length >= 2) return `${names[0]} & ${names[1]} are in`;
    if (names.length === 1 && yes.length > 1) return `${names[0]} + ${yes.length - 1} more said yes`;
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
    setErr(''); setNameInvalid(false); setAttendInvalid(false); setDeleteNote('');
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
      // The date poll: whatever the answer — the ticks are why a Maybe is a Maybe.
      ...(dateChoices.length && datePicks.some((id) => dateChoices.some((o) => o.id === id))
        ? { datePicks: dateChoices.map((o) => o.id).filter((id) => datePicks.includes(id)) } : {}),
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
    let savedLocally = false;
    try {
      const q = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [...(Array.isArray(q) ? q : []).filter(e => e.idempotencyKey !== idk),
        { ...payload, idempotencyKey: idk, submittedAt: Date.now() }];
      localStorage.setItem(key, JSON.stringify(next));
      savedLocally = true;
    } catch { /* storage blocked — the server path below may still deliver */ }

    let delivered = false;
    if (isRsvpApiConfigured()) {
      setSending(true);
      try {
        const sent = await submitRsvp(code, {
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
          ...(payload.datePicks ? { date_picks: payload.datePicks } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          ...(payload.email ? { email: payload.email } : {}),
        });
        delivered = true;
        setReplyNotice(String((sent && sent.notice) || ''));
        try {
          const q = JSON.parse(localStorage.getItem(key) || '[]');
          const rest = q.filter(e => e.idempotencyKey !== idk);
          if (rest.length) localStorage.setItem(key, JSON.stringify(rest));
          else localStorage.removeItem(key);
        } catch { /* delivered anyway */ }
      } catch { delivered = false; }
      setSending(false);
    }
    if (!delivered && !savedLocally) {
      setErr('Your reply was not sent or saved. Try again, or contact your host directly.');
      return;
    }
    setQueued(!delivered);
    setSubmitted(true);
    // `delivered` separates a reply that reached the host from one sitting in
    // this browser's outbox. Both are guest intent; only one is a reply the
    // host can act on, and collapsing them would overstate the conversion.
    // Behavioural only — the guest's name, meal and notes never ride along.
    try { trackInvite(INVITE_EVENTS.INVITE_RSVP_SUBMITTED, { rsvp: payload.rsvp, delivered, event_type: event && event.type }); } catch (_e) { /* a counter never blocks a reply */ }
    try { if (navigator.vibrate) navigator.vibrate([12, 70, 12]); } catch { /* no haptics */ }
  };

  // Delete her reply: the server wipes every answer (and the host's app takes
  // its copy off the list on its next read); this device forgets it too. Only
  // a confirmed delete says "deleted".
  const deleteReply = async () => {
    if (deleting) return;
    const tag = event.id + ':' + code;
    const idk = existingRsvpKey(tag);
    setDeleting(true); setDeleteNote('');
    let ok = false;
    if (isRsvpApiConfigured() && idk) {
      try { await withdrawRsvp(code, idk); ok = true; } catch { ok = false; }
    } else {
      ok = true;   // never left this device: forgetting it here is the whole delete
    }
    if (ok) {
      try {
        const key = 'ngw-rsvp-queue-' + event.id;
        const q = JSON.parse(localStorage.getItem(key) || '[]');
        const rest = (Array.isArray(q) ? q : []).filter((e) => e.idempotencyKey !== idk);
        if (rest.length) localStorage.setItem(key, JSON.stringify(rest)); else localStorage.removeItem(key);
      } catch { /* nothing stored here */ }
      clearReplyForm(); setDeleteAsk(false); setSubmitted(false); setQueued(false);
    }
    setDeleteNote(ok ? 'done' : 'failed');
    setDeleting(false);
  };

  // "I'm in" forward — the guest recruits the next guest with the SAME link.
  const shareForward = async (own) => {
    setShareError('');
    const capability = await checkRsvpCapability(event);
    if (!capability.ready) {
      setShareError('This invite is not verified for sharing. Nothing was shared — contact the host for an invitation.');
      return;
    }
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
  // The whole place, street, City, ST ZIP (formatVenueAddress), when there is a
  // name or a street; a town alone is not a calendar location.
  const calLoc = (vfLoc.name || vfLoc.address) ? formatVenueAddress(event).replace(' · ', ', ') : '';
  // The host's photo tag rides into the guest's calendar entry (11/16/2026).
  const calNote = hashtagLine(event);
  const gcalUrl = event.date
    ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(event.name || 'Event')
      + '&dates=' + calDate + '/' + calEnd
      + (calLoc ? '&location=' + encodeURIComponent(calLoc) : '')
      + (calNote ? '&details=' + encodeURIComponent(calNote) : '')
    : null;
  const icsHref = event.date
    ? 'data:text/calendar;charset=utf-8,' + encodeURIComponent([
      'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//NGW ${BRAND.full}//Guest Invite//EN`,
      'BEGIN:VEVENT', `UID:invite-${event.id}-${code}@ngw-events`,
      `DTSTART;VALUE=DATE:${calDate}`, `DTEND;VALUE=DATE:${calEnd}`,
      `SUMMARY:${String(event.name || 'Event').replace(/[,;]/g, ' ')}`,
      // RFC 5545 text: a comma or semicolon is escaped, so the address keeps them.
      ...(calLoc ? [`LOCATION:${calLoc.replace(/([\\,;])/g, '\\$1')}`] : []),
      ...(calNote ? [`DESCRIPTION:${calNote.replace(/[,;\\]/g, ' ')}`] : []),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n'))
    : null;

  // `radio` opts into radiogroup semantics (role=radio + aria-checked) for the
  // single-select attendance chips inside role="radiogroup"; without it a chip
  // renders aria-pressed (toggle-button), which is invalid as a radiogroup child.
  // Multi-select chips (NEEDS) legitimately keep aria-pressed, so this is opt-in.
  const chip = (on, label, onClick, key, radio, cls) => (
    <button key={key || label} className={'chip' + (cls ? ' ' + cls : '')}
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? on : undefined}
      aria-pressed={radio ? undefined : on}
      onClick={onClick}>{label}</button>
  );
  const first = guestName.trim().split(/\s+/)[0] || '';

  // TWO LAYOUTS, THE HOST PICKS (owner, 11/24/2026). "Classic" is today's
  // invite (the full countdown stays: the July 14 decision); "At a glance"
  // lists the facts as tappable rows, says "In N days" in the masthead and
  // brings the reply up. Stored as event.inviteLayout; the paper is inviteStyle.
  const glance = event.inviteLayout === 'glance';
  const mastRight = glance && days != null && days > 0
    ? (days === 1 ? 'Tomorrow' : `In ${days} days`)
    : (event.date ? dfmt(event.date, { month: 'short', year: 'numeric' }) : '');
  // The facts, each read once, for both layouts.
  const hostLine = String(event.hostName || event.hostNames || '').trim();
  const hostFirst = hostLine.split(/\s*(?:&|\+|\/|,|\band\b)\s*/)[0].split(/\s+/)[0] || '';
  const contactHref = hostContactHref(event);
  const photoSrc = preview ? previewPhotoUrl : publicHostPhotoUrl(code, event.hostPhoto);
  const place = formatVenueAddress(event) ? venueLineParts(event) : null;
  const mapsHref = place && place.mapsQuery ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place.mapsQuery) : '';
  const dayText = event.date ? (dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })
    + (spanEnd(event) !== String(event.date).slice(0, 10) ? ' – ' + dfmt(spanEnd(event), { weekday: 'long', month: 'long', day: 'numeric' }) : '')) : '';
  const timeText = whenLabel ? whenLabel.label + (whenLabel.serveLabel ? `, dinner at ${whenLabel.serveLabel}` : '') : '';
  const replyByLive = !isPast && rsvpByIsReal && rsvpBy.days != null && rsvpBy.days >= 0;
  // "Add to calendar" before a reply: the SAME Google and Apple links the
  // confirmation offers (gcalUrl / icsHref above), shown on a tap.
  const calChoices = calOpen && (gcalUrl || icsHref) ? (
    <div className="actions-row inv2-calchoices" data-invite-calchoices>
      {gcalUrl && <a className="mini" href={gcalUrl} target="_blank" rel="noreferrer">Google Calendar</a>}
      {icsHref && <a className="mini" href={icsHref} download={(event.name || 'event') + '.ics'}>Apple Calendar</a>}
    </div>
  ) : null;
  const calIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>;
  const pinIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
  const chev = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;
  const mark = markUrlFor(event);

  let rvIdx = 0;
  const rv = (extra) => ({
    className: 'rv' + (rvOn ? ' in' : '') + (extra ? ' ' + extra : ''),
    style: { transitionDelay: rvOn ? (0.15 + (rvIdx++) * 0.28) + 's' : '0s' },
  });

  const toneClass = pal.dark ? 'inv2-dark' : somber ? 'inv2-muted' : '';
  // The countdown condenses once the reply is SENT (it used to on the first tap,
  // which yanked the reply buttons ~115px up under the guest's thumb).
  const condensed = submitted && !twoColumn;

  // THE NOTE AND FORWARD SIT UNDER THE REPLY (owner, 11/11/2026). They lived
  // below the card, under the fold on every viewport, so a guest read "Yes, I'm
  // in" without the line that says where the reply goes. Same conditions as
  // before: Forward stays after Maybe/No (a guest who answered either way can
  // still pass the invite on), hides only where the Yes recruit button already
  // forwards, and never shows on a somber invite; a past-event recap carries its
  // own "Share the memory" and no reply, so neither renders there.
  const replyFoot = isPast ? null : (
    <div className="inv2-replyfoot">
      <p className="grounding inv2-delivery">{localEvent ? (
        // THE PREVIEW NOTICE (owner, 11/24/2026): where a reply made here goes,
        // and the two ways that do reach the host. Same condition as before.
        <>Just a preview — replies here stay on this phone. To answer, use the invite link you were sent, or {contactHref
          ? <a className="slink" href={contactHref}>{'message ' + (hostFirst || 'your host')}</a>
          : 'message ' + (hostFirst || 'your host')}.</>
      ) : 'Your reply goes straight to your host’s plan — nothing to install, no account. Only your host sees it; the guest list stays private.'}</p>
      {shareError && <p className="grounding" role="alert">{shareError}</p>}
      {!somber && !(submitted && rsvp === 'Yes' && !queued) && (
        <div className="actions-row inv2-forward">
          <button className="mini" onClick={() => shareForward(false)}>
            {shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'Forward this invite'}
          </button>
        </div>
      )}
    </div>
  );

  const page = (
        <section className={'inv2 ' + toneClass + (condensed ? ' answered' : '')} style={twoColumn ? undefined : { paddingTop: 14 }}>
          {/* ── The stationery — the approved remake: linen stock, letterpress,
              embossed crest, staged reveal, ONE ask, disclosure earned by the
              answer, countdown that condenses but never vanishes. ── */}
          <div className={'inv2-sheet lay-' + (glance ? 'glance' : 'classic')} data-invite-layout={glance ? 'glance' : 'classic'} ref={sheetRef}
            data-pal={colors ? colors.key + (colors.index ? ':' + colors.index : '') : undefined}
            style={{ ...(colors ? inviteSheetVars(colors) : {}), ...(holdTop != null && rsvp && !submitted && !twoColumn ? { paddingTop: holdTop, justifyContent: 'flex-start' } : {}) }}>
            {/* The invitation itself. On a phone this wrapper has no box
                (display:contents) and the column reads exactly as before; at 1024
                and up it is the left column, beside the reply. */}
            <div className="inv2-face">
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
            {/* THE HOST'S MESSAGE (owner, 11/24/2026) in the deck line's place:
                her words signed "— <first name>" (beside her photo on Classic),
                or the suggested line, unsigned (lib/inviteDeck inviteMessage). */}
            <p {...rv('inv2-msg lp')} data-invite-message>
              {deck.text}
              {deck.signedBy && (
                <span className={'sig' + (!glance ? ' sigp' : '')} data-invite-sig>
                  {!glance && <HostAvatar src={photoSrc} name={hostLine} size="sig" />}
                  <span>— {deck.signedBy}</span>
                </span>
              )}
            </p>
            {/* THE HOST'S HASHTAG (owner ruling E, 11/16/2026): shown quietly,
                only when the host turned one on. No call to post (board 8–2). */}
            {String(event.hashtag || '').trim() && (
              <p className="inv2-fine" data-invite-hashtag style={{ margin: '2px 0 0' }}>{String(event.hashtag).trim()}</p>
            )}
            <div {...rv()}>
              {glance ? (
                <div className="inv2-facts">
                  {event.date && (
                    <div className="inv2-fact" data-fact="when">
                      <span className="ico" aria-hidden="true">{calIcon}</span>
                      <span className="tx">
                        <b className="l1" data-invite-date>{dayText}</b>
                        {timeText && <span className="l2" data-invite-time>{timeText}</span>}
                        {!isPast && (gcalUrl || icsHref) && (
                          <button type="button" className="act" data-invite-calendar aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)}>Add to calendar</button>
                        )}
                        {calChoices}
                      </span>
                    </div>
                  )}
                  {place && (
                    <a className="inv2-fact" data-fact="where" data-invite-maps href={mapsHref} target="_blank" rel="noreferrer"
                      aria-label={place.line + '. Open in Maps'}>
                      <span className="ico" aria-hidden="true">{pinIcon}</span>
                      <span className="tx" data-invite-where>
                        <b className="l1" data-invite-street>{place.head}</b>
                        {place.tail && <span className="l2" data-invite-town>{place.tail}</span>}
                        <span className="act">Open in Maps</span>
                      </span>
                      <span className="go" aria-hidden="true">{chev}</span>
                    </a>
                  )}
                  {!isPast && hostLine && (() => {
                    const inner = (<>
                      <span className="ico ph"><HostAvatar src={photoSrc} name={hostLine} size="row" /></span>
                      <span className="tx">
                        <span className="l0">Hosted by</span>
                        <b className="l1">{hostLine}</b>
                        {contactHref && <span className="act">{'Message ' + (hostFirst || 'your host')}</span>}
                      </span>
                      {contactHref && <span className="go" aria-hidden="true">{chev}</span>}
                    </>);
                    return contactHref
                      ? <a className="inv2-fact" data-fact="host" data-invite-host-message href={contactHref} aria-label={`Hosted by ${hostLine}. Message ${hostFirst || 'your host'}`}>{inner}</a>
                      : <div className="inv2-fact" data-fact="host">{inner}</div>;
                  })()}
                </div>
              ) : (<>
              <hr className="inv2-rule" />
              {/* WHEN — F1 of the invite audit: the hour the host set, never one
                  invented from a bucket (lib/eventWhen). The BOLD RULE (owner,
                  11/24/2026): the date bold, the time regular. */}
              {event.date && (<><div className="inv2-label lp">When</div>
                <div className="inv2-val lp">
                  <b data-invite-date>{dayText}</b>
                  {timeText ? <span className="inv2-when-time" data-invite-time> · {timeText}</span> : null}
                </div>
                {!isPast && (gcalUrl || icsHref) && (
                  <div className="inv2-linkrow">
                    <button type="button" className="slink blk" data-invite-calendar aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)}>{calIcon}Add to calendar</button>
                  </div>
                )}
                {calChoices}</>)}
              {/* WHERE opens Maps (owner, 11/24/2026): the street bold, the town regular. */}
              {place && (<><div className="inv2-label lp">Where</div>
                <div className="inv2-val lp" data-invite-where>
                  <a className="addr" data-invite-maps href={mapsHref} target="_blank" rel="noreferrer" aria-label={place.line + '. Opens in Maps'}>
                    <b data-invite-street>{place.head}</b>{place.sep}{place.tail && <span data-invite-town>{place.tail}</span>}
                  </a>
                </div></>)}
              </>)}
              {/* ── Trip Brief v0 (destination events) — host-authored stay +
                  airports, read-only. Renders on DATA presence, never on an
                  inferred flag; nothing here is guest data or money. */}
              {!isPast && event.lodging && event.lodging.hotelName && (<><div className="inv2-label lp">Stay</div>
                <div className="inv2-val lp">
                  {event.lodging.hotelName}
                  {/* "group rate" ONLY when the rooms were actually held — the
                      rate on a picked listing was read off a card, and this is
                      the most guest-facing artifact the app produces. Same gate
                      as draftLodgingNote; it was fixed there and missed here. */}
                  {event.lodging.rate
                    ? ` · $${event.lodging.rate}/night${(String(event.lodging.from || '') !== STAY_FROM_PICK && String(event.lodging.from || '') !== STAY_FROM_PLAN) ? ' group rate' : ''}`
                    : ''}
                  {event.lodging.code ? ` · code ${event.lodging.code}` : ''}
                  {event.lodging.deadline ? ` · book by ${dfmt(String(event.lodging.deadline).slice(0, 10), { month: 'long', day: 'numeric' })}` : ''}
                </div></>)}
              {!isPast && Array.isArray(event.airportOptions) && event.airportOptions.filter(a => a && (a.code || a.name)).length > 0 && (<><div className="inv2-label lp">Fly into</div>
                <div className="inv2-val lp">{event.airportOptions.filter(a => a && (a.code || a.name)).map(a => [a.code, a.name].filter(Boolean).join(' — ') + (a.note ? ` (${a.note})` : '')).join(' · ')}</div></>)}
              {/* ── The weekend plan (Slice A): HOST-DECIDED rows only —
                  the accepted plan, the celebration dinner on its picked
                  night, and the group meals out (guestFacingDays). An
                  unaccepted proposal can never leak to guests.
                  Slots, never invented clock times. */}
              {!isPast && (() => {
                const it = guestFacingDays(event);
                if (!it.relevant) return null;
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
              {/* HOSTED BY, with a "Message" link by the host contact (owner,
                  11/24/2026). Field-name truth: the local pool carries hostName,
                  the backend whitelist ships hostNames too (rsvp.py). On "At a
                  glance" it is the fact row above. */}
              {!glance && !isPast && hostLine && (<><div className="inv2-label lp">Hosted by</div>
                <div className="inv2-val lp">{hostLine}{contactHref && <> · <a className="slink" data-invite-host-message href={contactHref}>Message</a></>}</div></>)}
              {!isPast && !hostLine && contactHref && (<><div className="inv2-label lp">Host</div>
                <div className="inv2-val lp"><a className="slink" data-invite-host-message href={contactHref}>Message the host</a></div></>)}
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
              {!isPast && social ? (
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
                    {social}
                  </p>
                </div>
              ) : null}
            </div>
            {!glance && days != null && days > 0 && (
              <div {...rv('inv2-countflex')}>
                {/* condensed state is INLINE-driven — a deployed-build cascade
                    quirk left the .answered descendant rules matching-but-inert,
                    so the state carries its own styles (transitions stay CSS). */}
                <div className="inv2-countwrap" style={condensed ? { maxHeight: 24, margin: '6px 0 0' } : undefined}>
                  <div className="inv2-count lp-display" style={condensed ? { display: 'inline', fontSize: 11, fontFamily: 'inherit', fontWeight: 800, letterSpacing: '.16em', margin: 0 } : undefined}>{days}</div>
                  <div className="inv2-label lp inv2-countlab" style={condensed ? { display: 'inline', marginLeft: 5, marginTop: 0 } : { marginTop: 2 }}>{days === 1 ? 'day to go' : 'days to go'}</div>
                </div>
              </div>
            )}
            </div>

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
                {/* "Got photos? Share them so everyone can relive it." promised a
                    feature this page didn't have (owner ruling B, 11/16/2026).
                    Now only a true line: the host's album when linked; the
                    upload button when the server says uploads are open; before
                    that, when they open; and nothing when photos aren't offered. */}
                {albumUrl
                  ? <p className="grounding" style={{ margin: '2px 0 0', textAlign: 'center', opacity: .8 }}>The photos from the day are up — take a look.</p>
                  : (photosOffered && photosOpen === false)
                    ? <p className="grounding" data-recap-photos-closed style={{ margin: '2px 0 0', textAlign: 'center', opacity: .8 }}>Photos open after the event.</p>
                    : null}
                <div className="actions-row" style={{ marginTop: 12, justifyContent: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {albumUrl && <a className="mini" href={albumUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>See the photos</a>}
                  {photosOffered && photosOpen === true && (
                    <button className="mini" data-recap-add-photos onClick={() => {
                      const el = document.getElementById('invite-photos');
                      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}>Add your photos</button>
                  )}
                  <button className="mini" onClick={() => shareForward(false)}>{shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Copied!' : 'Share the memory'}</button>
                </div>
                {shareError && <p className="grounding" role="alert">{shareError}</p>}
              </div>
            ) : !submitted ? (
              <div {...rv('inv2-ask')}>
                {deleteNote === 'done' && <p className="grounding" role="status" data-reply-deleted style={{ margin: '0 0 10px' }}>Your reply is deleted. Your host’s list drops it the next time they open their plan. You can reply again below.</p>}
                {/* THE DATE POLL comes FIRST when the host offered ranges (owner
                    pick B, 11/21/2026): which dates work decides whether she can come. */}
                {dateChoices.length > 0 && (
                  <div data-invite-dates className="inv2-dates">
                    <div className="inv2-label lp">Which dates work for you?</div>
                    <div className="inv2-dates-list" role="group" aria-label="Which dates work for you">
                      {dateChoices.map((o) => {
                        const on = datePicks.includes(o.id);
                        const flip = () => setDatePicks((p) => (on ? p.filter((x) => x !== o.id) : [...p, o.id]));
                        return (
                          <button key={'date-' + o.id} type="button" className="lodge-opt" role="checkbox" aria-checked={on} onClick={flip}>
                            <span aria-hidden="true" className={'inv2-datebox' + (on ? ' on' : '')}>{on ? '✓' : ''}</span>
                            <strong style={{ fontWeight: 650 }}>{o.label}</strong>
                          </button>
                        );
                      })}
                    </div>
                    <p className="inv2-fine" aria-live="polite">
                      Tick every one that works. Your host sees the answers and picks the dates.
                    </p>
                  </div>
                )}
                {/* THE ONE ASK — attendance alone; everything else is earned */}
                <div className="inv2-label lp" style={{ textAlign: glance ? 'center' : 'left', margin: replyByLive ? '0 0 4px' : '0 0 8px' }}>The favor of a reply</div>
                {/* The reply-by date the HOST set, bold (owner, 11/24/2026). A date she
                    never set is never printed (2026-07-14), and a lapsed one stops. */}
                {replyByLive && (
                  <p className={'inv2-fine inv2-replyby' + (glance ? ' c' : '')} data-invite-replyby>
                    {glance ? 'by ' : 'Kindly reply by '}<b>{dfmt(rsvpBy.iso, { weekday: 'long', month: 'long', day: 'numeric' })}</b>
                  </p>
                )}
                {/* REPLY IS THE PRIMARY ACTION (owner, 11/11/2026): all three on one
                    row, and "Yes" filled until the guest picks — then the picked
                    one carries the fill, so two buttons never shout at once. */}
                <div className={'chips inv2-replies' + (rsvp ? ' chosen' : '')} role="radiogroup" aria-label="Attendance">
                  {[['Yes', 'Yes, I’m in'], ['No', 'Can’t make it'], ['Maybe', 'Maybe']].map(([val, label]) =>
                    chip(rsvp === val, label, () => { if (!twoColumn) pinSheet(); setRsvp(val); if (attendInvalid) { setAttendInvalid(false); setErr(nameInvalid ? 'Add your name to send.' : ''); } }, val, true, val === 'Yes' ? 'inv2-yes' : ''))}
                </div>
                {attendInvalid && <p className="grounding" style={{ margin: '6px 0 0', color: 'var(--danger)' }}>Let us know if you can make it.</p>}
                {replyFoot}

                <div className={'inv2-more' + (rsvp ? ' open' : '')} aria-hidden={!rsvp}
                  // inert while closed: max-height:0 hides visually but fields would
                  // still take keyboard focus — a Tab trap into invisible inputs.
                  // (set imperatively — React 18 drops the inert attribute prop)
                  ref={el => { if (el) { if (rsvp) el.removeAttribute('inert'); else el.setAttribute('inert', ''); } }}>
                  <div className="inv2-label lp" style={{ textAlign: 'left', margin: '16px 0 6px' }}>
                    {rsvp === 'Yes' ? 'Wonderful — just a few taps' : rsvp === 'Maybe' ? 'Noted — leave a name at least' : 'Thanks for telling us straight'}
                  </div>
                  <input className="field" ref={nameRef} style={{ maxWidth: 'none', ...(nameInvalid ? { borderColor: 'var(--danger)' } : {}) }}
                    autoComplete="name" maxLength={120} placeholder="Your name — first and last" aria-invalid={nameInvalid || undefined}
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
                          {/* Health detail handed over with no published policy yet (stage 9
                              WO #5): say what the code makes true, at the field. One owner-
                              approved sentence — lib/guestDataNotice. */}
                          <p className="inv2-fine" style={{ margin: '4px 0 0' }} data-guest-data-notice="shellfish">{GUEST_DATA_NOTICE}</p>
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
                                <div key={'lodge-' + o.id} className="lodge-opt"
                                  role="radio" aria-checked={on}
                                  tabIndex={0}
                                  onClick={() => setLodgingPick(on ? '' : o.id)}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLodgingPick(on ? '' : o.id); } }}>
                                  <PhotoStrip photos={o.photos} alt={o.label} size={120} />
                                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <strong style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {/* OBVIOUS CONFIRMATION (host 2026-07-28: "guest needs more
                                          obvious confirmation of rental choice"). A tint and a
                                          border is a designer's signal; a guest wants to be TOLD.
                                          A check plus the word, on the row itself. */}
                                      {on ? <span aria-hidden="true" style={{
                                        flex: '0 0 auto', width: 18, height: 18, borderRadius: '50%',
                                        background: '#3E7A5A', color: '#fff', fontSize: 11, lineHeight: '18px',
                                        textAlign: 'center', fontWeight: 800,
                                      }}>✓</span> : null}
                                      {o.label}
                                    </strong>
                                    {o.sub ? <span className="inv2-fine" style={{ margin: 0 }}>{o.sub}</span> : null}
                                    {o.note ? <span className="inv2-fine" style={{ margin: 0 }}>{o.note}</span> : null}
                                    {/* SELECTION MUST NOT EAT THE LINK (host report 2026-07-28).
                                        The card is the radio; the link is a separate act. Click
                                        alone was not enough — the row also reacts to pointerdown
                                        and to Enter/Space, so all three are stopped here. */}
                                    {o.url ? (
                                      <a href={o.url} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        onPointerDown={e => e.stopPropagation()}
                                        onMouseDown={e => e.stopPropagation()}
                                        onKeyDown={e => e.stopPropagation()}
                                        style={{ fontSize: 12, textDecoration: 'underline', width: 'fit-content' }}>See the listing ↗</a>
                                    ) : null}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="inv2-fine" style={{ margin: '6px 0 0' }} aria-live="polite">
                            {lodgingPick
                              ? `Got it — you'd rather stay at ${(lodgingChoices.find(x => x.id === lodgingPick) || {}).label || 'that one'}. It's a preference, not a booking; your host makes the call.`
                              : 'Tap the one you\u2019d rather stay at. It\u2019s a preference, not a booking — your host makes the call and books it.'}
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
                              {/* The plus-one's needs are health details too (owner, 11/11/2026). */}
                              <p className="inv2-fine" style={{ margin: '6px 0 0' }} data-guest-data-notice="plus-one">{GUEST_DATA_NOTICE}</p>
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
                          {/* Same notice, same constant, at the full allergy / diet / access group. */}
                          <p className="inv2-fine" style={{ margin: '6px 0 0' }} data-guest-data-notice="needs">{GUEST_DATA_NOTICE}</p>
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
              <div className="inv2-ask inv2-done" ref={doneRef}>
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
                      {queued ? (isRsvpApiConfigured()
                        ? 'Saved on this device — not delivered. We’ll retry when the connection returns.'
                        : 'Saved on this device only — online replies are not enabled. Tell your host directly.')
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
                {replyNotice && <p className="grounding" role="status" data-reply-notice>{replyNotice}</p>}
                <div className="actions-row" style={{ marginTop: 14, justifyContent: 'center' }}>
                  {rsvp !== 'No' && gcalUrl && <a className="mini" style={{ textDecoration: 'none' }} href={gcalUrl} target="_blank" rel="noreferrer">Add to Google Calendar</a>}
                  {rsvp !== 'No' && icsHref && <a className="mini" style={{ textDecoration: 'none' }} href={icsHref} download={(event.name || 'event') + '.ics'}>Add to Apple Calendar</a>}
                  <button className="mini" onClick={() => { setDeleteAsk(false); setDeleteNote(''); setSubmitted(false); }}>Change my answer</button>
                  {!deleteAsk && <button className="mini" onClick={() => { setDeleteAsk(true); setDeleteNote(''); }}>Delete my reply</button>}
                </div>
                {deleteAsk && (
                  <div role="group" aria-label="Delete your reply" data-delete-reply style={{ marginTop: 12, textAlign: 'center' }}>
                    <p className="grounding" style={{ margin: 0 }}>Delete your reply? Your answers, including any allergies or needs, come off your host’s guest list.</p>
                    <div className="actions-row" style={{ marginTop: 8, justifyContent: 'center' }}>
                      <button className="mini" onClick={deleteReply} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete it'}</button>
                      <button className="mini" onClick={() => setDeleteAsk(false)} disabled={deleting}>Keep it</button>
                    </div>
                  </div>
                )}
                {deleteNote === 'failed' && <p className="grounding" role="alert" style={{ margin: '8px 0 0', textAlign: 'center' }}>Your reply was not deleted. Check your connection and try again.</p>}
                {replyFoot}
              </div>
            )}
          </div>

          {/* ── Photos (rulings B–D) and "Ask your host" (ruling A), 11/16/2026.
              Outside the stationery sheet on purpose: the reply form's geometry
              (G28, theReplyFormHoldsStill) is not touched by either. ── */}
          {photosOffered && (
            <GuestPhotosV2 code={code} event={event} eventKey={event.id + ':' + code} guestName={guestName.trim()}
              anchorId="invite-photos" onOpenChange={setPhotosOpen} />
          )}
          {code && !preview && <GuestUpdatesV2 code={code} hostName={event.hostName || event.hostNames} />}
          {asksOffered && (
            <GuestAskV2 code={code} eventKey={event.id + ':' + code} hostName={event.hostName || event.hostNames} guestName={guestName.trim()} />
          )}

          {/* ── Getting there — event day only; unchanged mechanics. ── */}
          {days != null && days <= 0 && !isPast && venueFor(event).isSet && (
            <div className="card no-hover" style={{ marginTop: 14 }}><div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
              <div className="shelf-label" style={{ marginBottom: 4 }}>Getting there — it’s today</div>
              <p className="grounding" style={{ margin: '0 0 8px' }}>{formatVenueAddress(event)}</p>
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
                  {/* THE PAGE GUESTS ACTUALLY READ. This printed the field
                      verbatim, and the field can hold the app's own bracketed
                      template — a guest could be shown "Parking: Guests can park
                      [street / driveway / nearby lot — pick what fits]." */}
                  {guestSafeText(event.parkingNotes) ? ' Parking: ' + guestSafeText(event.parkingNotes) : ''}
                  {String(event.rainPlan || '').trim() ? ' If the sky turns: ' + event.rainPlan : ''}
                </p>
              )}
              {nearState === 'denied' && <p className="grounding" style={{ margin: '8px 0 0' }}>Location was blocked — directions above still get you there.</p>}
              {nearState === 'nocoords' && <p className="grounding" style={{ margin: '8px 0 0' }}>We couldn’t pin the venue on a map — directions above will ask for the address.</p>}
            </div></div>
          )}

          {/* ── RECRUIT — IN THE FOOTER (host ruling 2026-07-29: "footer") ────────
              Growth loop half (b). Half (a) — the host sharing the link — has been
              live and measured for a while; this is the other end: a guest who
              just admired someone's invite is the warmest possible future host.
              The ruling was footer, NOT the post-RSVP payoff card, so it stays a
              quiet line under the guest's own actions rather than a card competing
              with them. (Both shapes exist in the FROZEN src/App.js; this is the
              V2 invite, which carried neither.)
              SUPPRESSED FOR SOMBER EVENTS — the same line the legacy invite draws.
              Nobody gets marketed to at a repast. That is not a toggle, it is the
              rule; see the solemn register in lib/heartPrompts.
              Fires PLAN_YOURS_TAPPED with its surface so footer-vs-card can be
              compared honestly if the payoff card is ever built. */}
          <div className="inv2-foot">
          {!isPast && !/repast|memorial|funeral|celebration of life|wake|shiva|homegoing/i.test(String((event && event.type) || '')) && (
            <p className="grounding" style={{ marginTop: 16, textAlign: 'center' }}>
              <a
                // The link says where it came from (Marketing & Pricing board,
                // 11/18/2026): the invite, and the event KIND only, so the new
                // host lands on an example for that kind and a later pass can be
                // traced to this page. Nothing about this event or guest travels.
                href={typeof window !== 'undefined' ? recruitHref(window.location.origin + window.location.pathname, { from: 'invite', kind: event && event.type }) : '/'}
                data-plan-yours
                onClick={() => { try { trackInvite(INVITE_EVENTS.PLAN_YOURS_TAPPED, { event_type: event && event.type, surface: 'invite_footer_v2' }); } catch (_e) { /* a counter never blocks a guest */ } }}
                className="tap-44" style={{ color: 'inherit', fontWeight: 650, textDecoration: 'none' }}>
                Planning something of your own? Make it with {BRAND.full} →
              </a>
            </p>
          )}
          {/* Guest-visible brand moment (build-map #6): the locked identity — the
              wordmark + machined brand period — on the one surface every guest
              touches. Tuned to the stationery's own palette, not the app steel. */}
          {/* Guests hand over dietary and access needs without ever signing in,
              so the privacy policy belongs on their door too, once published. */}
          {/* The plain disclosure for "opened" (owner ruling A): only where the
              open was actually recorded. Never "read" or "seen". */}
          {asksOffered && (
            <p className="inv2-fine" data-opened-disclosure style={{ marginTop: 12 }}>Your host can see when you last opened this invite.</p>
          )}
          <PolicyLinks prefix="How your answer is used:" style={{ marginTop: 8, textAlign: 'center' }} />
          <div {...rv('inv2-wordmark')}>{BRAND.full}<span className="inv2-wm-dot" aria-hidden="true" /></div>
          </div>
        </section>
  );
  // The host's panel shows the invitation alone, in its own frame.
  if (preview) return <div className="inv2-preview" style={toneVars}>{page}</div>;
  return (
    <div className="stagewrap inv2-stage">
      <div className="app" style={toneVars}><div className="content">
        {page}
      </div></div>
    </div>
  );
}
