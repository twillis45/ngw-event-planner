// ─── Canonical claim families (Phase 5G-C1) ──────────────────────────────────
//
// A canonical family is a set of playbook fields that mean THE SAME THING: same
// procurement concept, same unit, same role in the plan, same assumptions. The
// approved boundary rule:
//
//   Families are defined by shared meaning, unit, contents, assumptions and
//   adjustment logic — NOT by fieldPath and NOT by a matching number.
//
// Phase A proved why that rule is load-bearing: `p_tableware` shares a field name
// across 18 lines and FOUR different units, and Low Country Boil's "2 set" is paper
// towels, bowls and shell buckets — not a place setting at all. A name-keyed family
// would have governed all 18 as one claim.
//
// THIS LAYER IS A MAPPING, NOT A REWRITE. It records what each authored line means
// and what it rests on. It does not overwrite playbook values, does not normalize
// variants to a single number, and produces no corpus correction.

// ─── food.ice.event_supply ───────────────────────────────────────────────────
//
// SEMANTIC AUDIT (all 29 `p_ice` lines, measured not assumed):
//   unit         'lb'      — all 29, no exceptions
//   category     'beverage'— all 29
//   essential    true      — all 29
//   buyAt        'T0'      — all 29 (day-of, because it melts)
//   qtyFlat      absent    — all 29 are strictly per-guest
//   meaning      chilling beverages + filling coolers + cups, per every authored note
//
// Hidden subtypes were ruled OUT rather than assumed absent. Specifically checked:
// food-display ice, seafood/crawfish HOLDING ice, chilling-only stock, emergency
// reserve, and vendor-supplied ice. None is a separate line. The two boil playbooks
// are the obvious risk and both say drinks in their own words: Crawfish Boil is
// "~2.5 lb/guest for cold drinks", Low Country Boil is "to keep beer and tea cold".
// Quinceanera notes the venue MAY supply it — a sourcing caveat on the same claim,
// not a different claim.
//
// So: one family, 29 members, five authored variants preserved.
export const ICE_FAMILY = Object.freeze({
  id: 'food.ice.event_supply',
  label: 'Ice for drinks and coolers',
  unit: 'lb_per_guest',
  meaning: 'Ice bought day-of to chill beverages, fill coolers and serve in cups. Not food-display ice, not seafood holding ice.',
  purchaseId: 'p_ice',
  // The authored variants. PRESERVED, not normalized — each is a board-authored
  // baseline for the conditions that playbook was written for.
  baselineVariants: Object.freeze([1, 1.25, 1.5, 2, 2.5]),
  defaultBehaviour: 'Use the playbook-authored value. Never substitute a family average.',
});

// How strong the authored evidence for a member's CONDITION is. Three honest levels;
// no level licenses arithmetic.
export const CONDITION_EVIDENCE = Object.freeze({
  // The author wrote a conditional rule WITH a target number.
  authored_rule: 'The playbook states a conditional adjustment in its own words.',
  // The author stated the condition this value was chosen for, without a rule.
  authored_condition: 'The playbook states the condition behind its value.',
  // Nothing about conditions was written down.
  none: 'No condition was recorded for this line.',
});

/**
 * The 29 members, transcribed from the authored `note` of each line by a human read.
 *
 * `authoredCondition` is a HUMAN READING of what the note says, recorded here so it
 * is reviewable, not parsed from prose at runtime. Regex over a display string would
 * be inference dressed as data — the Phase A honesty boundary calls prose "a lead for
 * a human ruling, never a fact".
 */
export const ICE_MEMBERS = Object.freeze([
  // ── 1 lb ──
  { assetId: 'Game Night', value: 1, condition: 'indoor, roughly 3 hours', evidence: 'authored_condition' },
  { assetId: 'Gender Reveal', value: 1, condition: 'baseline; author states 2 lb if hot or outdoor', evidence: 'authored_rule' },
  { assetId: 'Repast', value: 1, condition: null, evidence: 'none' },
  // ── 1.25 lb ──
  { assetId: 'Housewarming', value: 1.25, condition: 'chilling drinks and cups', evidence: 'authored_condition' },
  { assetId: 'Sweet 16', value: 1.25, condition: 'baseline; author states bump to 1.5 for a hot room or outdoor party', evidence: 'authored_rule' },
  // ── 1.5 lb ──
  { assetId: 'Anniversary', value: 1.5, condition: 'chilling and drinks', evidence: 'authored_condition' },
  { assetId: 'Baby Shower', value: 1.5, condition: null, evidence: 'none' },
  { assetId: 'Bachelorette Party', value: 1.5, condition: 'batch cocktail, chilling bubbly, water station', evidence: 'authored_condition' },
  { assetId: 'Birthday', value: 1.5, condition: 'drinks and coolers', evidence: 'authored_condition' },
  { assetId: 'Bridal Shower', value: 1.5, condition: 'mimosa bar, punch, chilling bubbly', evidence: 'authored_condition' },
  { assetId: 'Card Party', value: 1.5, condition: '4-hour night, mixed drinks and a punch bowl', evidence: 'authored_condition' },
  { assetId: 'Dinner Party', value: 1.5, condition: 'chilling and drinks', evidence: 'authored_condition' },
  { assetId: 'Engagement Party', value: 1.5, condition: 'cocktail party; author states add 15-20% for melt', evidence: 'authored_rule' },
  { assetId: 'Fish Fry', value: 1.5, condition: 'cold drinks', evidence: 'authored_condition' },
  { assetId: 'Holiday Party', value: 1.5, condition: 'full bar plus chilling tubs', evidence: 'authored_condition' },
  { assetId: 'Low Country Boil', value: 1.5, condition: 'keeping beer and tea cold all afternoon', evidence: 'authored_condition' },
  { assetId: 'Quinceañera', value: 1.5, condition: 'long event with a bar; venue or caterer may supply it', evidence: 'authored_condition' },
  { assetId: 'Retirement Party', value: 1.5, condition: 'chilling bottles and drink ice; author states add 15-20% for melt', evidence: 'authored_rule' },
  { assetId: 'Vow Renewal', value: 1.5, condition: 'chilling and drinks; author states more in heat', evidence: 'authored_rule' },
  { assetId: 'Watch Party', value: 1.5, condition: 'chilling drinks indoors; top up at halftime', evidence: 'authored_condition' },
  // ── 2 lb ──
  { assetId: 'Bachelor Party', value: 2, condition: 'beer and whiskey bar running all night', evidence: 'authored_condition' },
  { assetId: 'Crab Feast', value: 2, condition: 'hot afternoon, high can/bottle volume', evidence: 'authored_condition' },
  { assetId: 'Day Party', value: 2, condition: 'outdoors in the heat, chilling drinks AND a punch', evidence: 'authored_condition' },
  { assetId: 'Get-Together', value: 2, condition: 'outdoor coolers — more than indoors because it melts', evidence: 'authored_condition' },
  { assetId: 'Graduation', value: 2, condition: 'BOARD-CORRECTED to 2 lb because this is an outdoor event; ice melts faster in the heat', evidence: 'authored_condition' },
  { assetId: 'Juneteenth Cookout', value: 2, condition: 'outdoor June coolers — melts fast in the heat', evidence: 'authored_condition' },
  { assetId: 'Reunion', value: 2, condition: 'outdoors; drink-chilling plus melt buffer', evidence: 'authored_condition' },
  { assetId: 'The Cookout', value: 2, condition: 'all-day outdoor function — melts fast in the heat', evidence: 'authored_condition' },
  // ── 2.5 lb ──
  // Ruled Option A (same family, authored specialty variant). Its own note says the
  // quantity is for COLD DRINKS, so it is not seafood-holding ice, and it is not
  // separated merely for being the highest number. No registered source reaches 2.5,
  // so it is labelled honestly as a planning baseline rather than reduced to fit one.
  { assetId: 'Crawfish Boil', value: 2.5, condition: 'a spring boil burns through ice; author states more on a hot day', evidence: 'authored_rule' },
]);

/**
 * The recovered pattern.
 *
 * THE HONESTY BOUNDARY THIS ENCODES. What we have is stronger than a guess and
 * weaker than a reconstructed board decision, so it is recorded as neither.
 *
 * The pattern is not merely correlational — it is written down. 7 of the 8 lines at
 * 2 lb name outdoor or heat in their own note, Graduation records an explicit board
 * correction ("this is an OUTDOOR event"), and four playbooks state a conditional
 * rule outright (Gender Reveal "2 if hot/outdoor", Sweet 16 "bump to 1.5 for a hot
 * room or outdoor party", Vow Renewal "more in heat", Crawfish Boil "more on a hot
 * day"). That is authored intent, recovered.
 *
 * What it is NOT is a quantified universal rule. No author wrote "heat adds 0.5
 * lb/guest", and deriving one by subtracting variants would be inventing a board
 * decision. So: explain, never compute.
 */
export const ICE_RECOVERED_LOGIC = Object.freeze({
  basis: 'recovered-authored-pattern',
  status: 'pending-board-confirmation',
  observedPattern: 'Higher authored ice values appear on outdoor, warm-weather or high-volume playbooks; lower values on short indoor ones.',
  explicitAuthoredEvidence: Object.freeze([
    'Graduation: board-corrected to ~2 lb/guest because it is an OUTDOOR event.',
    'Juneteenth Cookout: ~2 lb/guest for outdoor June coolers — it melts fast in the heat.',
    'Gender Reveal: ~1 lb/guest, 2 if hot/outdoor.',
    'Sweet 16: ~1 lb/guest baseline; bump to 1.5 for a hot room or outdoor party.',
  ]),
  allowedUse: 'Explain the authored value and name the condition it was written for. Ask the host to confirm that condition.',
  prohibitedUse: 'Compute or change any quantity from this pattern. No numeric adjustment is board-confirmed.',
});

/** Facts that could change an ice recommendation, for the host-facing card. */
export const ICE_CHANGE_FACTORS = Object.freeze([
  'Whether the event is indoors or outdoors',
  'Expected temperature on the day',
  'How long the event runs',
  'How much beverage service there is',
  'Whether a venue or caterer already supplies ice',
]);

const MEMBER_BY_ASSET = new Map(ICE_MEMBERS.map((m) => [m.assetId, m]));

/** The family a given playbook field belongs to, or null. Never guesses from a name. */
export function familyFor(assetId, purchaseId) {
  if (purchaseId !== ICE_FAMILY.purchaseId) return null;
  const member = MEMBER_BY_ASSET.get(assetId);
  if (!member) return null;
  return { family: ICE_FAMILY, member, recovered: ICE_RECOVERED_LOGIC };
}

/**
 * What the host should be told about one ice line.
 *
 * Returns the authored value UNCHANGED, plus the material it takes to explain that
 * value honestly. It deliberately exposes no adjusted number and no arithmetic:
 * `perGuest` is always the authored figure.
 */
export function iceRecommendation(assetId, purchaseId, { guestCount = null, claim = null } = {}) {
  const hit = familyFor(assetId, purchaseId);
  if (!hit) return null;
  const { member } = hit;
  return {
    familyId: ICE_FAMILY.id,
    unit: ICE_FAMILY.unit,
    perGuest: member.value,                                  // authored, never adjusted
    total: guestCount > 0 ? Math.round(member.value * guestCount) : null,
    // The basis label comes from the claim classifier, so this surface can never
    // contradict what the row already renders.
    basisLabel: claim ? claim.hostLabel : null,
    directCitationEligible: claim ? claim.directCitationEligible : false,
    authoredCondition: member.condition,
    conditionEvidence: member.evidence,
    // Present only where the author actually recorded a condition.
    why: member.condition
      ? `This playbook is written for ${member.condition}.`
      : null,
    assumption: member.condition
      ? 'Assumes those conditions still hold — confirm before ordering.'
      : 'No conditions were recorded for this line — confirm before ordering.',
    changeFactors: ICE_CHANGE_FACTORS,
    recoveredStatus: ICE_RECOVERED_LOGIC.status,
  };
}
