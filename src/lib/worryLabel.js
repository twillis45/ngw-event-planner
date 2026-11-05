// ─── A worry row's label ─────────────────────────────────────────────────────
// Moved out of HostShellV2's "Worth having a plan for" lane so it can be tested.
// A playbook risk is raised as "Have a plan for: <trigger>"; the lane header
// already says "Worth having a plan for", so the prefix is dropped — and what
// is left is the trigger, a CONDITION. Shown bare it read as the event's state:
// "Final headcount still not confirmed 4 days out" on an event with no date
// (gold run, GOLD-01, 11/5/2026). It now reads "If final headcount…".
// A worry that states a fact (no prefix) is shown exactly as raised.
export function worryLabel(title, { wide = false } = {}) {
  const raw = String(title || '');
  const isTrigger = /^have a plan for:\s*/i.test(raw);
  let full = raw.replace(/^have a plan for:\s*/i, '').replace(/\bby T-(\d+)d\b/i, 'by $1 days out');
  if (isTrigger && full) {
    // Lowercase the first letter unless the first word is an acronym ("DJ", "AV").
    const first = full.split(/\s+/)[0] || '';
    const lower = /^[A-Z]{2,}/.test(first) ? full : full.charAt(0).toLowerCase() + full.slice(1);
    full = 'If ' + lower;
  }
  // Phone: the first clause only (board anti-pattern 8, 2026-08-07) — a
  // three-clause risk would push the list off the fold at 390px.
  if (wide) return full;
  const parts = full.split(/\s*\/\s*|,\s+(?:or\s+)?/);
  return parts.length > 1 ? parts[0] + ' — and more…' : full;
}
