// ─── IS THIS A DAY THAT NEEDS A GENTLER VOICE? ────────────────────────────────
//
// Extracted from HostShellV2 (2026-07-30) because the shell knew and the shared copy
// engine did not — the same "capability exists but never reaches the consumer" shape
// this codebase keeps paying for.
//
// What it cost while it lived in one file: `planHeroCopy` is event-type-agnostic, so a
// repast four days out rendered, verbatim, to a family that had just buried someone:
//
//   "Settle: Who provides the food."
//   "2 decisions are past their easy window — this one first.
//    The spread and shopping list size from them."
//
// Both halves are wrong, and repast.js — same repo, researched, `verificationStatus:
// 'researched'` — says why in its own culturalContext: "The heart of the tradition is
// that the family does NOT cook — a church, repast committee, or neighbors carry the
// meal." So the app scolded a grieving family for being late to accept food their
// church was already bringing, and told them to go shopping.
//
// The repast author could not have prevented it. There is no `when`, `weight`, or
// `emotionalWeight` that reaches a global copy string. That is the argument for a
// shared capability rather than 39 independent authors, made by the codebase itself.
//
// Kept as a PURE predicate with no React and no event mutation so both the shell and
// the copy engine read one derivation.

// Repast is a real, fully-authored somber playbook (repast.js), not a guess. Feeds the
// parity kit's `tone="solemn"`. See parity/MANIFEST.md fast-follow #1.
export const SOLEMN_RE = /repast|memorial|funeral|celebration of life|homegoing|in memoriam/i;

export function isSolemnEvent(event) {
  try { return SOLEMN_RE.test(String((event && event.type) || '') + ' ' + String((event && event.name) || '')); }
  catch { return false; }
}
