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

import { recordKindFor } from './eventTaxonomyAdapter';

// The ONLY fields a persona override may ever touch. Everything else is a logic
// field and is structurally excluded from the merge in renderAction.
export const OVERRIDE_FIELDS = ['title', 'consequence', 'primaryCta'];

// Empty at launch — production is inert. Shape (when populated, evidence-gated):
//   { [category]: { [persona]: (cmd) => Partial<{title,consequence,primaryCta}> | object } }
// `category` is the EXISTING engine discriminator (na.category) — no new key.
export const VOICE = {};

// v1 PROXY: event-ownership stands in for user persona.
//   recordKind 'event' (home-hosted) ⇒ 'host'  · everything else ⇒ 'planner'.
// Unknown / errored types fall to 'planner' — the current command-desk voice — so an
// unrecognised event is never accidentally over-simplified.
export function personaFor(event) {
  try {
    return recordKindFor(event && event.type) === 'event' ? 'host' : 'planner';
  } catch (e) {
    return 'planner';
  }
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
