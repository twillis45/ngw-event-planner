// ─── The kind of games she asked for ─────────────────────────────────────────
// Run 2 (11/6/2026, R2-15): Vida asked for "fun, team-oriented games" and the
// plan had nowhere to put it — reported as "didn't make it into the plan". The
// game-night playbook now carries a "Team games" option; this reads the request
// so creation can record it as hers (choiceSource 'host').
const TEAM = /\bteam[\s-]*(?:oriented|based|style)?\s+games?\b|\bteam\s+play\b|\bplay(?:ing)?\s+in\s+teams\b|\b(?:split|break)\s+(?:us\s+)?into\s+teams\b/i;
const NEGATED = /\b(?:no|not|without|skip)\s+(?:\w+\s+){0,2}$/i;

/** 'Team games' when she asked for team play, else null. */
export function heardGameStyle(text) {
  const t = String(text || '');
  const m = t.match(TEAM);
  if (!m) return null;
  if (NEGATED.test(t.slice(0, m.index))) return null;
  return 'Team games';
}
