// ─── EVERY DRINKS PICK MOVES THE BILL, OR SAYS WHY NOT (11/21/2026) ──────────
//
// The census behind A1, A5 and A7. Every option of every playbook's drinks call
// is priced at 30 guests. Options that buy exactly the same drinks form a
// group, and every group is listed here as the same tier, with the reason. A
// new option that silently prices like its neighbor, or a listed group whose
// picks start pricing apart, fails this file.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';

// Picks that hold the drinks somewhere else, set so the drinks call is the
// thing being measured (their own defaults hand the drinks to the guests).
const CONTEXT = {
  'Watch Party': { potluck: 'Host provides all' },
  'Get-Together': { potluck: 'Host provides all' },
};

const FULL_BAR_IS_BASELINE = 'A full bar is the cited baseline (owner ruling 11/21/2026), and the playbook has no spirits line beyond what this pick already buys.';
const CASH_FOLLOW_UP = 'OWNER CALL: a limited bar or drink tickets is part hosted; the cash-bar follow-up (another batch) asks how much.';

// [type, the picks that price the same, why]
const SAME_TIER = [
  ['Dinner Party', ['Host provides full bar', 'Wine + one cocktail'], FULL_BAR_IS_BASELINE],
  ['Birthday', ['Beer + wine', 'Full bar / signature drink'], FULL_BAR_IS_BASELINE],
  ['Get-Together', ['Beer + soda + water', 'Full cooler bar'], FULL_BAR_IS_BASELINE],
  ['Graduation', ['Beer + wine for adults', 'Separate adult area'], 'Where the adults drink, not what is bought.'],
  ['Watch Party', ['Beer + soda + water', 'Full cooler bar'], FULL_BAR_IS_BASELINE],
  ['Game Night', ['Add one batch cocktail', 'Add one batch mocktail', 'Full bar'], 'One batch at one cited band, cocktail or mocktail; no spirits line beyond it.'],
  ['Housewarming', ['BYOB + host provides mixers/soda', 'Zero-proof / dry'], 'Either way the host buys only the soda, water and ice.'],
  ['Gender Reveal', ['Mocktails + soft drinks + beer/wine', 'Pink/blue punch bar'], 'OWNER CALL: the playbook does not say whether the punch bar pours beer and wine.'],
  ['Engagement Party', ['Beer + wine + signature cocktail', 'Full open bar', 'Cash/limited bar'], `${FULL_BAR_IS_BASELINE} ${CASH_FOLLOW_UP}`],
  ['Anniversary', ['Wine + beer + champagne toast', 'Full bar + signature cocktail'], FULL_BAR_IS_BASELINE],
  ['Holiday Party', ['Hosted full bar, bartender controls pour', 'Hosted full bar, self-serve', 'Beer + wine + one signature cocktail only', 'Drink tickets / cash bar'],
    `Who pours is not what is bought, and the one cocktail pours from the same spirits line. ${CASH_FOLLOW_UP}`],
  ['Retirement Party', ["Beer + wine + honoree's favorite", 'Full open bar', 'Beer/wine + a signature cocktail', 'Limited / cash bar'],
    `${FULL_BAR_IS_BASELINE} The signature cocktail is the honoree's favorite line. ${CASH_FOLLOW_UP}`],
  ['Bachelor Party', ['Beer + whiskey', 'Full bar'], FULL_BAR_IS_BASELINE],
  ['Bachelor Party', ['Beer only / BYOB', 'Light / pace-it'], 'Both buy the beer without the spirits; no source sizes a lighter-drinking crowd.'],
  ['Vow Renewal', ['Wine + beer + champagne toast', 'Full bar + signature cocktail'], FULL_BAR_IS_BASELINE],
  ['Fish Fry', ['Sweet tea + red drink + soda + water', 'Family-friendly / dry'], 'The default pours no alcohol, so dry buys the same.'],
  ['Card Party', ['Brown liquor + mixers + a punch', 'Full bar'], FULL_BAR_IS_BASELINE],
  ['Day Party', ['Signature cocktail + batched punch + beer/wine + water', 'Self-serve punch + beer/wine', 'Hired bartender'],
    'The bartender is a vendor booking, and the punch pours from the same spirits line as the cocktail.'],
  ['Juneteenth Cookout', ['Red drink + soda + water + iced tea', 'Family-friendly / dry'], 'Neither buys the grown-folks line.'],
  ['Crab Feast', ['Beer + soda + water + tea', 'Add a non-alcoholic spread for kids/non-drinkers'], 'OWNER CALL: no sourced line for the kids\' spread yet.'],
  ['Pupusa Gathering', ['Horchata + tamarindo (Salvadoran, morro seed)', 'Aguas frescas + sodas only', 'Add a grown section (Pilsener / Suprema / beer)', 'Coffee + sweet bread to close'],
    'OWNER CALL: one line covers beer or sodas at every pick, and there is no coffee line; no split is sourced.'],
  ['Wedding', ['Open bar (full)', 'Beer + wine + signature'], FULL_BAR_IS_BASELINE],
  ['Client Dinner', ['Wine with dinner only', 'One round, then wine', 'Full bar'], 'OWNER CALL: the playbook has no cocktail or spirits line.'],
  ['Fundraiser / Gala', ['Wine and beer with dinner', 'Open bar included in the ticket', 'Two drink tickets, then cash'], `${FULL_BAR_IS_BASELINE} ${CASH_FOLLOW_UP}`],
  ['Fundraiser / Gala', ['Cash bar', 'Dry'], 'Guests buy every drink at a cash bar, so the host buys what a dry party buys: the zero-proof.'],
];

const total = (type, picks) => {
  const fp = playbookFoodPlan({ id: 'census', type, date: '2026-12-12', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host', foodChoices: { ...(CONTEXT[type] || {}), ...picks } });
  const rows = fp.list.filter((l) => l.cat === 'beverage' && !l.skipped);
  return `$${rows.reduce((s, l) => s + l.low, 0)}-${rows.reduce((s, l) => s + l.high, 0)}`;
};

const groupsOf = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const d = (pb.decisions || []).find((x) => x.drinksCall === true);
    if (!d) continue;
    const by = {};
    for (const o of d.options) (by[total(pb.type, { [d.id]: o })] = by[total(pb.type, { [d.id]: o })] || []).push(o);
    for (const picks of Object.values(by)) if (picks.length > 1) out.push([pb.type, picks]);
  }
  return out;
};

test('every drinks pick prices apart from the others, or its group is listed with a reason', () => {
  const key = ([type, picks]) => `${type}: ${[...picks].sort().join(' = ')}`;
  expect(groupsOf().map(key).sort()).toEqual(SAME_TIER.map(key).sort());
  for (const [, , why] of SAME_TIER) expect(why.length).toBeGreaterThan(20);
});

test('the picks the brief named do move the drinks total', () => {
  const moves = [
    ['Wedding', 'bar', 'Dry'], ['Wedding', 'bar', 'Cash bar'],
    ['Fundraiser / Gala', 'bar', 'Dry'], ['Housewarming', 'drinks', 'BYOB + host provides mixers/soda'],
    ['Housewarming', 'drinks', 'Zero-proof / dry'], ['Anniversary', 'beverage', 'Zero-proof / dry'],
    ['Vow Renewal', 'beverage', 'Zero-proof / dry'], ['Juneteenth Cookout', 'drinks', 'Potluck — guests bring drinks'],
    ['Gender Reveal', 'beverage', 'Mocktails + soft drinks only'], ['Get-Together', 'alcohol', 'BYOB'],
    ['Bachelor Party', 'bar', 'Beer only / BYOB'],
  ];
  for (const [type, id, pick] of moves) {
    expect([type, pick, total(type, { [id]: pick }) !== total(type, {})]).toEqual([type, pick, true]);
  }
});
