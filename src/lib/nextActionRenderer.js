// Sprint 55M — Producer-side renderer seam (Pattern 011: One Engine, Multiple
// Confidence Layers). PURE projection layer. The engine (_selectEventNextActionInner
// in CommandCenter.jsx) owns reality; this file owns nothing but PHRASING.
//
// Canonical guarantees (enforced structurally below):
//   • renderAction is a pure projection — it carries NO ranking, gating, or routing.
//   • A persona may rewrite ONLY title / consequence / primaryCta.
//   • level · category · primaryRoute · contextLine · compressionSubBadge (and every
//     other field) pass through UNCHANGED — persona can never alter a logic field.
//   • VOICE = {} at launch ⇒ renderAction is the identity function ⇒ the shipped
//     runtime is INERT (zero user-visible change until a voice is authored).
//   • The "kill switch" is this VOICE staying empty; the seam needs no flag.
//
// persona is a v1 PROXY derived from recordKind (event-ownership), NOT a true
// user-sophistication signal — see personaFor. recordKindFor is imported via the
// canonical ESM adapter (the same path App.js uses), so there is no import cycle.

// Sprint 57A-B (Phase 0): persona is no longer derived from recordKind — the 56G/57A
// audit proved recordKind mis-classifies the target users (a grandmother's graduation
// and a bride's wedding both resolve to a 'client' record → planner voice). Persona is
// now driven by a self-declared `event.audience`, behind the `pi.voice` feature flag
// (default OFF → byte-identical to current production: everyone renders 'planner' =
// identity). recordKindFor import intentionally removed.

// The ONLY fields a persona override may ever touch. Everything else is a logic
// field and is structurally excluded from the merge in renderAction.
export const OVERRIDE_FIELDS = ['title', 'consequence', 'primaryCta'];

// Sprint 57A-B (Phase 1): HOST voice for the next-action spine. `category` is the
// EXISTING engine discriminator (na.category) — no new key. Only the `host` persona
// is authored; `planner` has NO entry → renderAction returns the engine string
// unchanged (planner = identity = today's command-desk voice). Entries return only
// the OVERRIDE_FIELDS they intend to change; everything else passes through, so the
// specific engine content (the item to buy, the task name) is preserved where it lives
// in fields we don't override. Goal: reassuring · plain · action-oriented · jargon-free.
const stripDecision = (t) =>
  String(t || '').replace(/^resolve\s+/i, '').replace(/[“”"]/g, '').replace(/\.\s*$/, '');

export const VOICE = {
  decision: { host: (c) => ({
    title: 'Decide: ' + (stripDecision(c && c.title) || 'the open decision') + '.',
    consequence: "Decide this and the rest can move forward — nothing else is waiting on you first.",
    primaryCta: 'Make the call',
  }) },
  caterer: { host: () => ({
    title: "Let's lock the final headcount.",
    consequence: "Your caterer is holding a count that doesn't match your guest list yet — matching them keeps the food and seating right.",
    primaryCta: 'Update the count',
  }) },
  approval: { host: () => ({
    consequence: "A quick send keeps things moving for you.",
    primaryCta: 'Send it',
  }) },
  vendor: { host: () => ({
    consequence: "A quick check-in keeps them on track for your day.",
    primaryCta: 'Send a note',
  }) },
  compression: { host: () => ({
    title: "Things are getting close.",
    consequence: "A little focus now and you're in great shape.",
    primaryCta: 'See what to do',
  }) },
  timeline: { host: () => ({
    consequence: "Getting ahead of this keeps the week relaxed.",
    primaryCta: "See what's next",
  }) },
  comm: { host: () => ({
    consequence: "Someone's waiting to hear back — a quick reply keeps things moving.",
    primaryCta: 'Reply',
  }) },
  operational: { host: () => ({
    consequence: "Grabbing this now keeps the day calm.",
  }) },
  calendar: { host: () => ({
    consequence: "Just so it's on your radar — nothing urgent yet.",
  }) },
  neutral: { host: () => ({
    title: "You're in good shape.",
    consequence: "Nothing needs you right now — enjoy the calm.",
  }) },
};

// pi.voice feature flag (default OFF). When OFF, personaFor always returns 'planner'
// ⇒ no host VOICE entry ⇒ renderAction is identity ⇒ byte-identical to current prod.
// QA/operators enable via `?pi=voice`, localStorage 'ngw-pi-voice'='1', or
// REACT_APP_PI_VOICE='true'.
export function presentationVoiceOn() {
  try {
    if (typeof window !== 'undefined' && /[?&]pi=voice\b/.test(window.location.search || '')) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ngw-pi-voice') === '1') return true;
  } catch (e) { /* storage blocked */ }
  return typeof process !== 'undefined' && process.env && process.env.REACT_APP_PI_VOICE === 'true';
}

// Self-declared audience → voice (Phase 0). NOT recordKind. Unset / 'other' / unknown
// → 'host' (the safer default: plain language never harms a pro; jargon harms a host).
const AUDIENCE_VOICE = {
  self_family: 'host',
  friend: 'host',
  client: 'planner',
  organization: 'planner',
  professional: 'planner',
  other: 'host',
};

// Flag-FREE audience → persona (shared by voice + labels + nav, each gated by its
// own flag). Unset / 'other' / unknown ⇒ 'host' (the safer default).
export function audiencePersona(event) {
  const a = event && event.audience;
  return AUDIENCE_VOICE[a] || 'host';
}

export function personaFor(event) {
  if (!presentationVoiceOn()) return 'planner';        // pi.voice OFF ⇒ identity ⇒ today
  return audiencePersona(event);                       // pi.voice ON ⇒ audience-driven
}

// Pure projection. Returns the SAME cmd reference when there is no override (preserves
// referential equality for any consumer useMemo / === comparison). Can only ever
// change OVERRIDE_FIELDS, and only with a non-empty string (never blanks a field).
// `voice` is injectable purely for tests; production callers use the default VOICE.
export function renderAction(cmd, persona, voice = VOICE) {
  if (!cmd) return cmd;
  const byCategory = voice[cmd.category];
  const entry = byCategory && byCategory[persona];
  if (!entry) return cmd; // VOICE={} ⇒ ALWAYS this path ⇒ identity (same reference)
  const o = (typeof entry === 'function' ? entry(cmd) : entry) || {};
  const out = { ...cmd };
  for (const k of OVERRIDE_FIELDS) {
    if (typeof o[k] === 'string' && o[k].length) out[k] = o[k];
  }
  return out; // level · category · primaryRoute · contextLine · compressionSubBadge untouched
}
