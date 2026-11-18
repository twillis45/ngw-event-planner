// Sit-down or buffet — ONE reader for the answer, wherever a playbook asks it
// (owner, 11/18/2026). Friendsgiving and Thanksgiving Hosting ask
// `service_style`; Dinner Party already asked `format` (Plated / Family-style /
// Buffet / Grazing), so that answer is read here rather than asked twice.
// Returns 'buffet', 'seated', or null when the event's playbook asks neither.
import { choicePickFor } from './playbooks';

export function serviceStyle(event) {
  let v = null;
  try { v = choicePickFor(event, 'service_style'); } catch { v = null; }
  // `format` means other things elsewhere (an engagement party's "grazing
  // station", a conference's "in-person or virtual"), so only Dinner Party's is read.
  if (v == null && String((event && event.type) || '') === 'Dinner Party') {
    try { v = choicePickFor(event, 'format'); } catch { v = null; }
  }
  const s = String(v || '');
  if (!s) return null;
  if (/buffet|grazing/i.test(s)) return 'buffet';
  if (/sit-?down|plated|family-style|seated/i.test(s)) return 'seated';
  return null;
}
