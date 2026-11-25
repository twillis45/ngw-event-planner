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
import { playbookDecisionOptions, foodApproach, openFoodChoices, getPlaybook, decisionSettledByData, playbookDecisionBoard } from './playbooks';
import { venueKindOf } from './knownFacts';
import { normalizeAsk, questionFrom } from './askVoice';
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
    // Same removal as playbooks/index.js:3531 — the SECOND reader carried its own
    // copy of the fallback, so fixing one would have left this one lying.
    // `why` here stays available on the row below; it is only barred from
    // standing in as the reason for the PROPOSAL.
    proposed: proposed ? { value: proposed, why: dopts.defaultWhy || null } : null,
    why: dopts.why || null,
  };
}

// THE QUESTION A FOOD PANEL ASKS, or null (audit 2 lane A P2-1). "Decide the
// menu." headlined the grill master, the bartender and the Super Bowl: the food
// cue's editor shows a playbook call, but its headline came from the title
// ladder. A call's own ask, else its label as a question; the generic trio
// (phase:food) and a call already answered have none.
export function foodPanelQuestion(nd) {
  if (!nd || nd.id === 'phase:food' || nd.selected != null) return null;
  return normalizeAsk(nd.ask) || (nd.label ? questionFrom(nd.label) : null);
}

// THE FOOD CALL'S ONE NAME (cohesion F2, owner 11/24/2026): the question the
// food item asks, for the records it counts — the same builder the hero panel
// renders (foodDecisionND over the board's open and locked rows), read through
// foodPanelQuestion. The ledger's cue ("<question> · N open") and the hero
// record both read this, so the part-by-part row, the NEXT pill, the hero and
// Calls to make say one name. Null for the generic trio or an answered call.
export function foodCallQuestion(event, claimed, asOf) {
  try {
    const board = playbookDecisionBoard(event, asOf) || {};
    const rows = [...(board.open || []), ...(board.locked || [])];
    return foodPanelQuestion(foodDecisionND(event, (event && event.guests) || [], rows, claimed));
  } catch { return null; }
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
//
// THE NEXT OPEN MENU QUESTION (owner's iPad, 11/21/2026). Once the approach is
// answered, the food item still counts the menu questions left ("2 open"), so
// it offers the first of THOSE, from openFoodChoices — the list the count reads
// — not the settled approach. `claimed` is the record ids the food action
// counts; some are raised as their own cards and are not its to show, and an
// action that claims none (the dietary note) has no menu question to offer.
// Only a question with a board row is offered, so it has a write path.
export function nextOpenFoodChoiceRow(event, boardRows, claimed) {
  if (!Array.isArray(claimed) || !claimed.length) return null;
  const open = (() => { try { return openFoodChoices(event) || []; } catch { return []; } })();
  const claim = new Set(claimed.map(String));
  for (const c of open) {
    if (!claim.has(String(c.id))) continue;
    const row = (boardRows || []).find(x => x && x.id === c.id);
    if (row) return row;
  }
  return null;
}
// A playbook with no food-approach lever may still author ITS OWN food call
// (`foodCall: true` — Crab Feast's steam-or-order). That call stands in for the
// generic trio, whose "A caterer handles it" contradicted the feast's run of
// show (audit 2 lane A P1-5, lane C P0-7). Read from the playbook, not the
// board, so a call the board files for later is still the one asked.
function foodCallOf(event) {
  const pb = (() => { try { return getPlaybook(event && event.type); } catch { return null; } })();
  return (pb && Array.isArray(pb.decisions) && pb.decisions.find(d => d && d.foodCall === true)) || null;
}
// A MEAL AT A RESTAURANT IS SERVED THERE (audit 2 lane A P1-4): a client
// dinner at Harbor Grill, a bachelor party at an ale house and a hotel night
// were offered "We'll cook it" and "Potluck". The place serves it.
const SERVED_AT = { restaurant: 'The restaurant serves it', bar: 'The restaurant serves it', hotel: 'The hotel serves it' };
export function foodDecisionND(event, guests, boardRows, claimed) {
  const picks = (event && event.foodChoices) || {};
  const call = foodCallOf(event);
  const approachSettled = (id) => (id ? picks[id] != null || !!(call && call.id === id && decisionSettledByData(event, call)) : picks.sourcing != null);
  try {
    const fa = foodApproach(event);
    const leverId = (fa && fa.decisionId) || (call && call.id) || null;
    if (approachSettled(leverId)) {
      const next = nextOpenFoodChoiceRow(event, boardRows, claimed);
      const nd = next ? boardDecisionND(event, next) : null;
      if (nd) return { ...nd, selected: null, ask: next.ask || null, label: next.label || null };
    }
    if (leverId) {
      const row = (boardRows || []).find(x => x && x.id === leverId) || (call && call.id === leverId ? call : null);
      const nd = row ? boardDecisionND(event, row) : null;
      if (nd) return { ...nd, selected: picks[leverId] || null, ask: row.ask || null, label: row.label || null };
    }
  } catch { /* fall through to the generic trio */ }
  const place = (() => { try { return venueKindOf(event); } catch { return null; } })();
  const servedAt = place && !place.isHome ? SERVED_AT[place.kind] : null;
  if (servedAt) {
    return {
      id: 'phase:food',
      options: [{ value: 'caterer', label: servedAt, note: null }],
      proposed: { value: 'caterer', why: `${place.name} serves the meal.` },
      selected: picks.sourcing || null,
      why: null,
    };
  }
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
    // The hero already asks `nextDecision`; a body that opens by restating it
    // ("When does the retirement presentation happen? Before, during…") would
    // ask it twice, and the picks under it say the rest (Wanda audit, 11/22/2026).
    why: (blocker.what && !(blocker.nextDecision && String(blocker.what).startsWith(String(blocker.nextDecision)))) ? blocker.what : null,
  };
}
