// ─── THE COOK LEVER — one definition, injected, not copied ───────────────────
//
// WHAT IT ANSWERS. The playbooks asked WHAT food and WHO provides it and never
// HOW it gets cooked, so a host holding a dish since noon and one collecting a
// tray got identical prep. Two shapes of the same question:
//
//   indoor  cook_method — oven / grill / slow cooker / air fryer / store-bought
//   grill   fire_type   — charcoal / gas / smoker / both, because the cookouts
//                         already commit to a fire and hardcoded ONE lead time
//                         for every fuel
//
// WHY IT LIVES HERE AND NOT IN FOURTEEN FILES. The first pass (2026-09-18)
// pasted the decision, five tasks and a risk into each playbook — about 25 lines
// duplicated fourteen times. That is the same defect this corpus already carries
// elsewhere (byte-identical claim text across The Cookout, Repast and Reunion,
// found the day before): copy the text and the ninth copy drifts, or a fix lands
// on one and silently misses its twin. The host directive was explicit —
// systematic, not hardcoded.
//
// So the ENGINE owns the content and each playbook declares only what is
// genuinely its own, in one line:
//
//   cookLever: { decision: 'food_style', hostCooks: ['Host cooks / grills'], kind: 'indoor' }
//
// That is the same division `whenChoice` already uses: the data says which
// answers, the engine says what happens. A playbook with no `cookLever` gets
// nothing, which is why this is additive and why the 30 playbooks that should
// never ask the question simply do not declare it.
//
// WHY A DECLARED LIST RATHER THAN A PREDICATE. A regex over the option text was
// tried first and is not honest: it matches Game Night's 'Host provides snacks'
// (no hot cook at all) and misses Housewarming's 'Light apps + one warm bite'
// (a real one). The judgement of which answer means "this host is cooking" is
// editorial, so it is declared where a human can see and review it — never
// guessed from a string.
//
// PURE: no I/O, no clock, no storage. Injected by playbooks/index.js at the same
// call sites `destinationDecisionsFor` uses.

const INDOOR_OPTIONS = ['Oven or stovetop indoors', 'Grill or smoker outside', 'Slow cooker or warming tray', 'Air fryer, in batches', 'Store-bought hot or delivered'];
const GRILL_OPTIONS = ['Charcoal grill', 'Gas / propane grill', 'Smoker — low and slow', 'A grill and a smoker together'];

/** The playbook's own declaration, validated. Null when it does not opt in. */
export function cookLeverOf(pb) {
  const L = pb && pb.cookLever;
  if (!L || !L.decision || !Array.isArray(L.hostCooks) || !L.hostCooks.length) return null;
  const decs = (pb && Array.isArray(pb.decisions)) ? pb.decisions : [];
  const parent = decs.find((d) => d && d.id === L.decision);
  // A lever pointing at a decision that does not exist, or naming an answer that
  // decision never offers, is a dangling gate — it would silently never fire.
  // Refuse it here rather than let it look configured. cookLeverIntegrity.test.js
  // asserts no playbook ships one.
  if (!parent || !Array.isArray(parent.options)) return null;
  const answers = L.hostCooks.filter((a) => parent.options.includes(a));
  if (!answers.length) return null;
  return { decision: L.decision, hostCooks: answers, kind: L.kind === 'grill' ? 'grill' : 'indoor', parent };
}

/** The decision itself — `cook_method` or `fire_type`, gated to the host-cooks answers. */
export function cookDecisionFor(pb) {
  const L = cookLeverOf(pb);
  if (!L) return null;
  const gate = { id: L.decision, in: L.hostCooks };
  const shared = {
    when: 'T-3d', dependsOn: [L.decision],
    // BLOCKS cook_schedule, NOT food. The method does not change the shopping
    // list, and claiming it did would demand per-method cost multipliers no
    // source supports — the contract test for food-blocking decisions is right
    // to ask for one.
    blocks: ['cook_schedule'], whenChoice: gate,
    weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host',
  };
  if (L.kind === 'grill') {
    return {
      ...shared, id: 'fire_type', label: 'What are you cooking on?',
      options: GRILL_OPTIONS, default: 'Charcoal grill',
      priorityBasis: { rationale: 'The fuel sets the fire-up lead and what has to be bought, and only the host knows which rig is actually coming out.', tier: 'cited', sources: ['grill-preheat-2026'] },
      why: 'Sets your lead time and your shopping. Gas is ready in 5-10 minutes but dies if the tank runs out mid-cook; charcoal needs 15-25 minutes in a chimney before the coals are ready; a smoker is hours, not minutes.',
    };
  }
  return {
    ...shared, id: 'cook_method', label: 'How is the hot food getting cooked?',
    options: INDOOR_OPTIONS, default: 'Oven or stovetop indoors',
    priorityBasis: { rationale: 'The method sets the cook window and the equipment, and only the host knows which one they will actually use — but it stays easy to change until the day before.', tier: 'reasoned' },
    why: 'Changes the prep more than the menu does. A slow cooker has to start hours ahead; a grill needs fuel checked and puts you outside; an air fryer does one tray at a time; store-bought food needs a pickup window that lands before guests do.',
  };
}

// Each task carries BOTH gates as an array (AND): this host cooks at all, and
// the method is this one. A single gate is not enough — `choicePickFor` resolves
// a HIDDEN decision's authored default, so gating on the method alone told a
// Birthday host who chose "Order pizza/trays" to plan their oven order.
const INDOOR_TASKS = [
  ['t_cm_grillfuel', 'Grill or smoker outside', 'T-2d', 't1', 'Check propane or charcoal now — a fuel run once guests have arrived costs you the party'],
  ['t_cm_oven', 'Oven or stovetop indoors', 'T-1d', 't1', 'If anything goes in the oven, work out the order — one oven will not hold three dishes at three temperatures'],
  ['t_cm_pickup', 'Store-bought hot or delivered', 'T-1d', 't1', 'Lock the pickup or delivery window so the food arrives BEFORE your guests do, not with them'],
  ['t_cm_slowcooker', 'Slow cooker or warming tray', 'T0 -5:00', 't0', 'Start the slow cooker with thawed ingredients — USDA says it can take SEVERAL HOURS to reach a bacteria-killing temperature, so a late start is a safety problem, not just a timing one'],
  ['t_cm_airfryer', 'Air fryer, in batches', 'T0 -2:30', 't0', 'Work out the batch order — an air fryer does one tray at a time, so decide what cooks first and what holds'],
];

// Fire-up leads are grounded to grill-preheat-2026: gas 5-10 min, charcoal
// 15-25 in a chimney to ash over, a smoker hours. These replace one hardcoded
// "~45 min before" that every fuel got regardless.
const GRILL_TASKS = [
  ['t_ft_charcoal_buy', 'Charcoal grill', 'T-2d', 't1', 'Buy the charcoal — and a chimney starter if you do not own one; it is the difference between coals in 20 minutes and an hour of fussing'],
  ['t_ft_gas', 'Gas / propane grill', 'T-2d', 't1', 'Check the propane and line up a spare tank — a gas grill is hot in 5-10 minutes, so the only thing that can stop the cook is running dry halfway through'],
  ['t_ft_charcoal', 'Charcoal grill', 'T0 -0:45', 't0', 'Light the chimney about 30 minutes before you want to cook — coals need 15-25 of that just to ash over, and lighter fluid is faster but taints the food'],
  ['t_ft_smoker', 'Smoker — low and slow', 'T0 -6:00', 't0', 'Start the smoker hours ahead, not minutes — ribs and brisket are a morning-long cook, and a smoker that starts late cannot be hurried'],
  ['t_ft_both', 'A grill and a smoker together', 'T0 -6:00', 't0', 'Two fires, two clocks: the smoker starts hours ahead for the low-and-slow cuts, the grill lights ~30 minutes out for everything fast'],
];

/** The method tasks, already milestone-bound to this playbook's own late milestones. */
export function cookTasksFor(pb) {
  const L = cookLeverOf(pb);
  if (!L) return [];
  const ms = (pb && Array.isArray(pb.milestones)) ? pb.milestones : [];
  const at = (n) => (ms.find((m) => m && Number(m.offsetDays) === n) || {}).id || null;
  const t1 = at(1) || at(0);
  const t0 = at(0) || at(1);
  // No milestone to hang them on means no tasks: a task with a dangling
  // milestoneId is worse than an absent one. Sweet 16 authors none at all.
  if (!t1 || !t0) return [];
  const phase = ((pb.tasks || []).find((t) => t && t.phase === 'food') ? 'food' : 'setup');
  const rows = L.kind === 'grill' ? GRILL_TASKS : INDOOR_TASKS;
  const id = L.kind === 'grill' ? 'fire_type' : 'cook_method';
  return rows.map(([tid, answer, when, slot, label]) => ({
    id: tid, milestoneId: slot === 't0' ? t0 : t1, phase, label, when,
    whenChoice: [{ id: L.decision, in: L.hostCooks }, { id, in: [answer] }],
  }));
}

/** The grill carbon-monoxide risk, for indoor playbooks where grilling is an option. */
export function cookRisksFor(pb) {
  const L = cookLeverOf(pb);
  if (!L || L.kind === 'grill') return [];   // the cookouts author their own fire safety
  return [{
    id: 'r_cm_grill_indoors',
    trigger: 'Cold or rain tempts the grill into the garage or under an overhang',
    severity: 'high',
    // Follows the charcoal-bag warning already grounded in fireSafetyContext.
    mitigation: 'Never. Burning charcoal indoors can kill you and carbon monoxide has no odor — no grill in a home, garage or tent, and a still-warm grill does not come inside either. Cook under open sky or move the dish to the oven.',
    whenChoice: [{ id: L.decision, in: L.hostCooks }, { id: 'cook_method', in: ['Grill or smoker outside'] }],
  }];
}
