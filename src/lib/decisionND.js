// ─── THE NORMALIZED-DECISION BUILDERS — pure, so the gates can run them ───────
//
// Lifted out of HostShellV2 (PR #70, 2026-07-31). They were closures over the
// shell's React scope, which meant the ONE thing worth asserting about them —
// which decision a given hero card is actually offering, and whether that
// decision is still open — could not be checked anywhere but by eye. The panel
// on Game Night offered a COMPLETED provider pick under a snack-quantity item
// for weeks with 4,277 tests green.
//
// What moved is the whole payload EXCEPT `settle`. Writing is the shell's job
// (patchEvent, receipts, roll-to-next); deciding what the options are, which one
// is proposed, and which one the host already chose is engine work and belongs
// here. The shell now spreads a `settle` onto these and renders.
//
//   NormalizedDecision = { id, options:[{value,label,note?}], proposed:{value,why}|null,
//                          selected?:string|null, why?:string }
import { playbookDecisionOptions, foodApproach } from './playbooks';
import { decisionApproach } from './doItForMe';

// A playbook `decision:*` board row → its authored options, notes and grounded
// default. Propose-don't-ask: prefer the DIFM-derived pick, but when a decision
// carries no difmCapable (injected military/destination sets) fall back to its
// AUTHORED grounded default — those rows have default+why+src, so a blank ask
// over a real default would be wrong.
export function boardDecisionND(event, dec) {
  if (!dec || dec.id == null) return null;
  const dopts = (() => { try { return playbookDecisionOptions(event, dec.id); } catch { return null; } })();
  if (!dopts || !Array.isArray(dopts.options) || !dopts.options.length) return null;
  const notes = (dopts.optionNotes && typeof dopts.optionNotes === 'object') ? dopts.optionNotes : {};
  const dapproach = dec.difmCapable ? (() => { try { return decisionApproach(dec, dopts); } catch { return null; } })() : null;
  const proposed = (dapproach && dapproach.mode === 'propose' && dapproach.proposed)
    ? dapproach.proposed
    : (dopts.default || null);
  return {
    id: dec.id,
    options: dopts.options.map(o => ({ value: o, label: o, note: notes[o] || null })),
    proposed: proposed ? { value: proposed, why: dopts.defaultWhy || dopts.why || null } : null,
    why: dopts.why || null,
  };
}

// The generic host/caterer/potluck trio, for event types with NO authored
// food-approach lever. Propose-don't-ask ONLY when grounded: at a real headcount,
// cooking for that many is a lot to own on the day, so most hosts hand it to a
// caterer. Below that, honest ask-mode.
export const FOOD_SOURCING_OPTIONS = [['We’ll cook it', 'host cooks'], ['A caterer handles it', 'caterer'], ['Potluck', 'potluck']];
const FOOD_SOURCING_NOTES = {
  'host cooks': 'Most control, most work on the day — best when the count is small.',
  'caterer': 'Hands-off on the day; the biggest line in the food budget.',
  'potluck': 'Low cost and communal — but you can’t plan the exact spread.',
};

// The food-approach decision for this event, whichever kind it is.
//   • When the playbook authors its own lever (repast `food_source`), THAT
//     decision IS the food decision — settling it writes the exact key
//     foodApproach reads, so the pick reshapes buys/tasks/costs.
//   • Otherwise the generic trio, keyed foodChoices.sourcing.
// `selected` is carried in both cases: a food decision the host already answered
// is a RECORD, and callers need to be able to tell that from an open question.
export function foodDecisionND(event, guests, boardRows) {
  try {
    const fa = foodApproach(event);
    if (fa && fa.decisionId) {
      const row = (boardRows || []).find(x => x && x.id === fa.decisionId);
      const nd = row ? boardDecisionND(event, row) : null;
      if (nd) return { ...nd, selected: ((event && event.foodChoices) || {})[fa.decisionId] || null };
    }
  } catch { /* fall through to the generic trio */ }
  const gn = Number(guests) || 0;
  const proposed = gn >= 40
    ? { value: 'caterer', why: `At about ${gn} guests, most hosts hand the food to a caterer — cooking for that many is a lot to own on the day.` }
    : null;
  return {
    id: 'phase:food',
    options: FOOD_SOURCING_OPTIONS.map(([label, value]) => ({ value, label, note: FOOD_SOURCING_NOTES[value] || null })),
    proposed,
    selected: ((event && event.foodChoices) || {}).sourcing || null,
    why: proposed ? null : 'How you handle the food shapes both the budget and your day-of workload.',
  };
}

// A foundational blocker that is a real PICK (fieldKey + options) → its ND.
export function blockerDecisionND(blocker) {
  if (!blocker || !blocker.fieldKey || !Array.isArray(blocker.options) || !blocker.options.length) return null;
  return {
    id: 'blocker:' + blocker.fieldKey,
    options: blocker.options.map(o => ({ value: o.value, label: o.label, note: o.note || null })),
    proposed: null,
    why: blocker.what || null,
  };
}
