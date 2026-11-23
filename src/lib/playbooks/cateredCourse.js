// ─── ONE CATERED COURSE: WHICH ONE? (owner ruling, 11/23/2026) ─────────────────
//
// A caterer for one course is not the meal's caterer (CATERER_OPTION_RE's
// lookahead, audit 2 lane G #5): she still cooks the rest. Batch 11 left that
// course on the shopping list at its grocery price and labeled it "Price
// pending a source", because the pick does not say which course it is. The
// owner's ruling: after a one-course pick, ask one short follow-up, which
// course, from the playbook's own course structure (`courses`, authored as
// [[label, [purchase ids]], …]). Her answer takes that course's grocery lines
// off the Spread and the shopping.
//
// Engine-injected like the cash-bar follow-up (cashBarCover), through the one
// registry (DECISION_INJECTORS). No default: which course the caterer brings is
// hers to say, so nothing leaves the list until she says it.
//
// THE PRICE STAYS PENDING. No registered source prices one catered course per
// guest (the catering guides price a whole drop-off meal), so the covered
// course is not priced from them. Once she names it, the pending reason names
// it too, instead of asking which course it is.

export const CATERED_COURSE_ID = 'catered_course';
// The same reading CATERER_OPTION_RE's lookahead makes of a one-course pick.
export const ONE_COURSE_RE = /\b(?:1|one)\s+course\b/i;

/** The decision offering a one-course catering pick, its one-course picks, and the playbook's courses — or null. */
export function cateredCourseParent(pb) {
  const courses = pb && Array.isArray(pb.courses) ? pb.courses.filter((c) => Array.isArray(c) && c[0] && Array.isArray(c[1])) : [];
  if (courses.length < 2) return null;
  for (const d of (pb.decisions || [])) {
    const picks = (d && Array.isArray(d.options) ? d.options : []).filter((o) => ONE_COURSE_RE.test(String(o)));
    if (picks.length) return { decision: d, picks, courses };
  }
  return null;
}

/** The injected follow-up, shown only after a one-course pick. */
export function cateredCourseDecisionsFor(pb) {
  const parent = cateredCourseParent(pb);
  if (!parent) return [];
  return [{
    id: CATERED_COURSE_ID,
    ask: 'Which course does the caterer bring?',
    label: 'The course the caterer brings',
    options: parent.courses.map(([label]) => label),
    default: null,
    when: parent.decision.when, dependsOn: [parent.decision.id],
    whenChoice: { id: parent.decision.id, in: parent.picks },
    blocks: ['shopping_list'],
    weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host',
    priorityBasis: { rationale: 'The course the caterer brings comes off the shopping list; until she names it, the plan still shops for every course.', tier: 'reasoned' },
    why: 'The caterer brings one course and you make the rest. Pick which one, and it comes off your shopping list.',
    movesBudget: true,
  }];
}

/**
 * The course the caterer brings, when a one-course pick is in effect and she
 * has named it: `{ course, ids }` (ids: the purchase lines it covers) — or null.
 * `pickOf(id)` is the plan's own pick reader (choicePickFor).
 */
export function cateredCourseCovers(pb, pickOf) {
  const parent = cateredCourseParent(pb);
  if (!parent || typeof pickOf !== 'function') return null;
  if (!parent.picks.includes(pickOf(parent.decision.id))) return null;
  const chosen = pickOf(CATERED_COURSE_ID);
  const hit = parent.courses.find(([label]) => label === chosen);
  if (!hit) return null;
  return { decisionId: parent.decision.id, course: hit[0], ids: new Set(hit[1]) };
}

/** The pending reason once the course is named (no source prices one catered course). */
export function cateredCoursePendingWhy(course) {
  const name = String(course || '').trim();
  const lower = /^The /.test(name) ? `the ${name.slice(4)}` : name.toLowerCase();
  return `Your caterer brings ${lower}, so it is off your shopping list. No registered source prices one catered course, so its price is pending until your caterer quotes.`;
}
