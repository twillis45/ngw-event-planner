// ─── BACKFILL CLASSIFICATION (Phase 5F.6 W4) ─────────────────────────────────
//
// WHAT THIS CLASSIFIES, AND WHAT IT REFUSES TO.
//
// It sorts the backlog by WHAT KIND OF WORK a line needs — is there a source to cite at
// all? It never concludes that a value is right, that a source's scope reaches an event,
// or that a line is ready to publish. Those are the judgements the whole programme
// exists to keep human, and there is a test asserting this module cannot express them.
//
//   Type A  an approved source exists on this subject      -> safe review workflow
//   Type B  no approved source on this subject             -> research needed
//   Type C  a source exists but a RECORDED conflict applies -> manual decision
//   Type D  nothing to ground, or nothing reads it          -> leave ungrounded
//
// WHY THIS EXISTS. The prior plan treated the backfill as throughput: "237 lines x 15
// interactions". Measured in 5F.5, the scope was 345 ungrounded lines and 41% of them
// sat in categories with no registered source at all. Speed does not touch those. The
// backfill is an evidence-acquisition problem wearing a workflow problem's clothes, and
// this module is what makes that visible per line instead of per anecdote.
//
// PURE: no I/O, no storage, no UI.
import { knowledgeInventory } from './knowledgeInventory';

export const BACKFILL_TYPES = Object.freeze(['A', 'B', 'C', 'D']);

// ── THE SUBJECT MAP IS A DECLARED HUMAN CLAIM, NOT A DERIVATION ──────────────
//
// The source registries carry `org`, `url`, `fetched` and `claim` — they do NOT declare
// which purchase subjects they cover. So the link between "webstaurant-protein-2026" and
// `p_ribs` cannot be computed; somebody has to assert it.
//
// It is written here, in the open, so it can be argued with and tested — rather than
// buried in a regex inside a report. Each entry names the source it depends on, and a
// test asserts every source named here actually exists in a registry.
export const SUBJECT_SOURCES = Object.freeze([
  {
    subject: 'protein',
    source: 'webstaurant-protein-2026',
    ids: ['p_protein', 'p_ribs', 'p_chicken', 'p_burgers_dogs', 'p_wings', 'p_meat',
      'p_turkey', 'p_brisket', 'p_fish', 'p_seafood', 'p_shrimp', 'p_sausage', 'p_ham'],
  },
  {
    subject: 'sides and starches',
    source: 'webstaurant-portions-2026',
    ids: ['p_sides', 'p_greens', 'p_mac', 'p_beans', 'p_salad', 'p_veg', 'p_rice',
      'p_potato', 'p_starch', 'p_bread', 'p_slaw'],
  },
  {
    subject: 'drinks per guest per hour',
    source: 'bar-provision-2026',
    ids: ['p_drinks', 'p_beer', 'p_wine', 'p_water', 'p_soda', 'p_softdrinks', 'p_nonalc',
      'p_mocktail', 'p_champagne', 'p_bubbly', 'p_juice', 'p_tea', 'p_liquor', 'p_bar'],
  },
  {
    subject: 'ice per guest',
    source: 'reddy-ice-2026',
    ids: ['p_ice'],
  },
  // PHASE 5F.7. Deliberately NARROW: only the ids that author a PER-GUEST count.
  //
  // `p_cleanup`, `p_paper`, `p_trash`, `p_clean` and `p_dish` are NOT here, and that is
  // the finding rather than an omission. All 44 of those lines are `qtyFlat: 1,
  // unit: 'kit'` — one kit per event. There is no per-guest quantity for a quantity
  // source to ground, so mapping a cleanup-supplies source onto them would create
  // exactly the "generic source without actual grounding ability" this phase forbids.
  // They stay Type B until a COST source can speak to the $8-15/kit range.
  {
    subject: 'disposable place settings per guest',
    source: 'jollychef-disposables-2026',
    ids: ['p_tableware', 'p_cups', 'p_napkins'],
  },
]);

// ── RECORDED CONFLICTS (Type C) ──────────────────────────────────────────────
//
// Each was found by a human during 5F.3 and written down. A line matching one of these
// has a source on its subject AND a known reason that source may not reach it — so it
// needs a decision, not a workflow.
//
// This list may only grow by a human recording a new conflict. Nothing infers one.
export const RECORDED_CONFLICTS = Object.freeze([
  {
    id: 'p_ice', assets: ['Repast', 'Game Night', 'Board Meeting', 'Conference'],
    why: 'reddy-ice-2026\'s worked example is an OUTDOOR barbecue. No registered source '
      + 'states a rate for a dry or indoor event, so the scope may not reach these.',
  },
  {
    id: 'p_ice', assets: ['Crawfish Boil'],
    why: 'authors 2.5 lb/guest, which exceeds every registered source. Either the source '
      + 'is wrong for a boil or the authored figure is. A human must decide which.',
  },
]);

const subjectFor = (purchaseId) => SUBJECT_SOURCES.find((s) => s.ids.includes(purchaseId)) || null;
const conflictFor = (assetId, purchaseId) => RECORDED_CONFLICTS.find(
  (c) => c.id === purchaseId && c.assets.includes(assetId),
) || null;

/**
 * classifyLine(assetId, purchase, state) -> { type, subject, source, action, why }
 *
 * `state` is the line's inventory state, so the two views cannot disagree about what is
 * already done.
 */
export function classifyLine(assetId, purchase, state) {
  // D — nothing to ground, or nothing reads it. Not work; a standing fact.
  if (state === 'unsupported' || state === 'blocked') {
    return {
      type: 'D',
      subject: null,
      source: null,
      action: 'leave ungrounded',
      why: state === 'blocked'
        ? 'No governable field on this line drives runtime, so grounding it would change nothing.'
        : 'The line carries no costed or quantified claim, so there is nothing to ground.',
    };
  }

  const conflict = conflictFor(assetId, purchase.id);
  if (conflict) {
    return {
      type: 'C',
      subject: (subjectFor(purchase.id) || {}).subject || null,
      source: (subjectFor(purchase.id) || {}).source || null,
      action: 'manual decision',
      why: conflict.why,
    };
  }

  const subj = subjectFor(purchase.id);
  if (subj) {
    return {
      type: 'A',
      subject: subj.subject,
      source: subj.source,
      action: 'safe review workflow',
      // Deliberately worded as availability, never as readiness.
      why: `An approved source exists on ${subj.subject} (${subj.source}). Whether its scope `
        + 'reaches this event is still a human decision.',
    };
  }

  return {
    type: 'B',
    subject: null,
    source: null,
    action: 'research needed',
    why: 'No approved source covers this subject. The line cannot be grounded until one is '
      + 'registered — no amount of workflow speed reaches it.',
  };
}

/**
 * backfillClassification(playbooks, publishedEntries) ->
 *   { total, needsWork, counts, bySubject, byCategory, rows }
 *
 * `total` is the whole corpus; `needsWork` excludes lines already grounded or reviewed,
 * so the two numbers can be reconciled against `knowledgeInventory` rather than floating
 * free.
 */
export function backfillClassification(playbooks = [], publishedEntries = []) {
  const inv = knowledgeInventory(playbooks, publishedEntries);
  const stateById = new Map(inv.rows.map((r) => [`${r.assetId} ${r.id}`, r.state]));

  const rows = [];
  for (const pb of (playbooks || [])) {
    for (const p of (pb.purchases || [])) {
      if (!p || !p.id) continue;
      const state = stateById.get(`${pb.type} ${p.id}`);
      if (state === 'grounded' || state === 'reviewed') continue;   // already done
      const c = classifyLine(pb.type, p, state);
      rows.push({ assetId: pb.type, id: p.id, item: p.item, category: p.category || 'other', state, ...c });
    }
  }

  const counts = Object.fromEntries(BACKFILL_TYPES.map((t) => [t, rows.filter((r) => r.type === t).length]));
  const bySubject = {};
  for (const r of rows.filter((x) => x.subject)) bySubject[r.subject] = (bySubject[r.subject] || 0) + 1;
  const byCategory = {};
  for (const r of rows) {
    byCategory[r.category] = byCategory[r.category] || Object.fromEntries(BACKFILL_TYPES.map((t) => [t, 0]));
    byCategory[r.category][r.type] += 1;
  }

  return { total: inv.total, needsWork: rows.length, counts, bySubject, byCategory, rows };
}

/**
 * Measured cost, stated so it cannot be mistaken for a plan. 15 interactions per
 * correction is the observed figure across 7 driven corrections (5F.3).
 */
export const INTERACTIONS_PER_CORRECTION = 15;

export function effortEstimate(cls) {
  if (!cls) return null;
  const reachable = cls.counts.A;                 // has a source today
  const blocked = cls.counts.B + cls.counts.C;    // needs research or a decision first
  return {
    reachableLines: reachable,
    reachableInteractions: reachable * INTERACTIONS_PER_CORRECTION,
    blockedLines: blocked,
    // Deliberately NOT costed: the research is the work, and its size is unknown until
    // somebody looks for a source. Putting a number here would invent one.
    blockedInteractions: null,
    leaveAlone: cls.counts.D,
  };
}

/** One line for an operator. */
export function classificationSummary(cls) {
  if (!cls || !cls.needsWork) return 'Nothing outstanding.';
  const c = cls.counts;
  return `${cls.needsWork} lines need work of ${cls.total}: `
    + `${c.A} have a source (review), ${c.B} need research, ${c.C} need a decision, `
    + `${c.D} cannot be grounded. Classification sorts WORK, not evidence.`;
}
