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
// The cash-bar follow-up (bar_cover, 11/21/2026) now prices every cash pick on
// the drinks call by what the host still covers, so those picks left the full
// bar's groups. Gala's "Two drink tickets, then cash" raises it too (#220
// Open, 11/22/2026), and prices its two tickets a guest, apart from both.

// [type, the picks that price the same, why]
const SAME_TIER = [
  ['Dinner Party', ['Host provides full bar', 'Wine + one cocktail'], FULL_BAR_IS_BASELINE],
  ['Birthday', ['Beer + wine', 'Full bar / signature drink'], FULL_BAR_IS_BASELINE],
  ['Get-Together', ['Beer + soda + water', 'Full cooler bar'], FULL_BAR_IS_BASELINE],
  ['Graduation', ['Beer + wine for adults', 'Separate adult area'], 'Where the adults drink, not what is bought.'],
  ['Watch Party', ['Beer + soda + water', 'Full cooler bar'], FULL_BAR_IS_BASELINE],
  ['Game Night', ['Add one batch cocktail', 'Add one batch mocktail', 'Full bar'], 'One batch at one cited band, cocktail or mocktail; no spirits line beyond it.'],
  ['Housewarming', ['BYOB + host provides mixers/soda', 'Zero-proof / dry'], 'Either way the host buys only the soda, water and ice.'],
  // Owner, 11/26/2026: Thanksgiving's drinks question.
  ['Thanksgiving Hosting', ['Guests bring the wine; host provides cider and water', 'No alcohol: sparkling cider and water'], 'Either way the host buys only the sparkling cider and the coffee; no wine.'],
  ['Gender Reveal', ['Mocktails + soft drinks + beer/wine', 'Pink/blue punch bar'], 'OWNER CALL: the playbook does not say whether the punch bar pours beer and wine.'],
  ['Engagement Party', ['Beer + wine + signature cocktail', 'Full open bar'], FULL_BAR_IS_BASELINE],
  ['Anniversary', ['Wine + beer + champagne toast', 'Full bar + signature cocktail'], FULL_BAR_IS_BASELINE],
  ['Holiday Party', ['Hosted full bar, bartender controls pour', 'Hosted full bar, self-serve', 'Beer + wine + one signature cocktail only'],
    'Who pours is not what is bought, and the one cocktail pours from the same spirits line.'],
  // Wanda audit P1-4 (11/22/2026): the signature cocktail and the full bar buy
  // the cited batch line Engagement, Holiday and Dinner Party already price, so
  // the honoree's-favorite pick prices apart. The full bar buys nothing beyond
  // it, marked costPending for the owner.
  ['Retirement Party', ['Full open bar', 'Beer/wine + a signature cocktail'],
    `${FULL_BAR_IS_BASELINE} OWNER CALL (costPending): no source splits a full bar's drinks between spirits and the beer and wine already counted.`],
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
  ['Fundraiser / Gala', ['Wine and beer with dinner', 'Open bar included in the ticket'], FULL_BAR_IS_BASELINE],
  ['Fundraiser / Gala', ['Cash bar', 'Dry'], 'Guests buy every drink at a cash bar; before the follow-up is answered the host covers its first set, the zero-proof, which is what a dry party buys. The tickets pick prices apart: its follow-up starts on the tickets, two a guest (owner, 11/22/2026).'],
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
    ['Thanksgiving Hosting', 'drinks', 'No alcohol: sparkling cider and water'],
    ['Thanksgiving Hosting', 'drinks', 'Guests bring the wine; host provides cider and water'],
    // The cash-bar follow-up (integration, 11/21/2026): a cash or limited bar
    // prices below the hosted bar it used to equal.
    ['Engagement Party', 'bar', 'Cash/limited bar'], ['Retirement Party', 'bar', 'Limited / cash bar'],
    ['Retirement Party', 'bar', 'Beer/wine + a signature cocktail'],
    ['Holiday Party', 'alcohol_service', 'Drink tickets / cash bar'],
  ];
  for (const [type, id, pick] of moves) {
    expect([type, pick, total(type, { [id]: pick }) !== total(type, {})]).toEqual([type, pick, true]);
  }
});
