// TEST-ONLY: name an authored step by its words, the way a test reads (six
// root causes, cause 1). The app resolves a row's button by the step's id and
// its declared target, never its words; a test that names "the step that says
// X" finds that step's id here and asks the real resolver by id. A string no
// playbook authors finds nothing, so it is routed as a row with no declared
// target (no button), exactly like a row the host wrote herself.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';
import { everyDeclaredStep } from '../stepTarget';
import { checklistRouteFor } from '../taskRoute';

const norm = (x) => String(x || '').trim().replace(/[.\s]+$/, '').toLowerCase();
function variants(s) {
  const out = [s.label];
  if (s.labelWithoutCaterer) out.push(s.labelWithoutCaterer);
  if (s.modeLabel) out.push(...Object.values(s.modeLabel));
  if (s.copyByAnswer) Object.values(s.copyByAnswer).forEach((m) => out.push(...Object.values(m)));
  if (s.kidsLine) out.push(`${s.label} — ${s.kidsLine}`);
  return out.filter(Boolean).map(norm);
}
// Derived rows author their words in the engine; the test names them by those words.
const DERIVED_WORDS = [
  [/^confirm your caterer and send them the final headcount$/, 'fa-caterer'],
  [/^ask who is bringing which dish/, 'fa-bringers'],
  [/· reserve a table for the group (?:breakfast|lunch|dinner)$/, 'tm-out-x'],
  [/^pick the night of the dinner$/, 'cel-night'],
  [/^book the place for the dinner$/, 'cel-place'],
];

/** The id of the authored step these words are, in this event's playbook (or any). */
export function stepIdByWords(words, event) {
  const w = norm(words);
  if (!w) return null;
  const d = DERIVED_WORDS.find(([re]) => re.test(w));
  if (d) return d[1];
  const own = event && event.type ? [getPlaybook(event.type)].filter(Boolean) : [];
  // Exact words first (her event's playbook, then any); then the authored
  // step these words begin (a test may quote a step's opening clause).
  for (const pbs of [own, ALL_PLAYBOOKS]) {
    for (const pb of pbs) {
      const hit = everyDeclaredStep(pb).find((s) => s.label && variants(s).includes(w));
      if (hit) return { id: hit.id, type: pb.type };
    }
  }
  for (const pbs of [own, ALL_PLAYBOOKS]) {
    for (const pb of pbs) {
      const hit = everyDeclaredStep(pb).find((s) => s.label && variants(s).some((v) => v.startsWith(w)));
      if (hit) return { id: hit.id, type: pb.type };
    }
  }
  return null;
}

/** checklistRouteFor for a test that names the step by its words. */
export function routeByWords(words, meta = {}, event = null) {
  if (meta && meta.taskId) return checklistRouteFor(words, meta, event);
  const hit = stepIdByWords(words, event);
  if (!hit) return checklistRouteFor(words, meta, event);
  if (typeof hit === 'string') return checklistRouteFor(words, { ...meta, taskId: hit }, event || { id: 'x', type: 'Birthday' });
  // The row's own playbook: a step quoted from another type is that type's row.
  const ev = event ? (event.type === hit.type ? event : { ...event, type: hit.type }) : { id: 'x', type: hit.type, guests: [], vendors: [] };
  return checklistRouteFor(words, { ...meta, taskId: hit.id }, ev);
}
