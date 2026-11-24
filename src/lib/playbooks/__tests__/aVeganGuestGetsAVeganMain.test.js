// ─── A VEGAN GUEST GETS A VEGAN MAIN (owner-approved fix, 11/23/2026) ─────────
//
// The food plan counted vegetarians and vegans apart (dietCounts, rosterDiets)
// and then planned ONE meatless main for both: `playbook.vegMain`, or the
// default "Stuffed peppers + grilled veg platter". Many of those dishes carry
// dairy, eggs, butter or honey (a goat cheese tart, a gruyere puff pastry, a
// mac & cheese plate), so a vegan guest could have nothing safe to eat.
//
//   Vegetarian: no meat or fish; dairy, eggs and honey are fine.
//   Vegan:      no animal products at all.
//
// DECIDED BY DECLARATION, NOT BY DISH WORDS. Each host-shell playbook declares
// `vegMainVegan`, a meatless main its author vouches is vegan. When any guest
// is vegan, the planned main is that one, sized to vegetarians + vegans
// together. The word check below is a SECONDARY guard on the authored names,
// never the rule.
import { ALL_PLAYBOOKS, playbookFoodPlan, plannedVegMain, itemDietaryFlags } from '../index';
import { HOST_TYPES } from '../../smartParseEvent';
import { useFrozenClock } from '../../../testUtils/frozenClock';

useFrozenClock();

const HOST = ALL_PLAYBOOKS.filter((p) => p && HOST_TYPES.includes(p.type));

// The non-vegan words the owner named, plus the meat and fish words. The
// engine's own 'Vegan' and 'Vegetarian' keyword flags run beside it.
const NON_VEGAN = /\b(cheeses?|butter|cream|milk|eggs?|honey|ghee|yogurt|gelatin|mayo|mayonnaise|aioli|custard|lard|beef|pork|chicken|ribs?|brisket|sausages?|bacon|ham|turkey|fish|shrimp|crabs?|wings?|oxtail|seafood|salmon|tuna|lamb|meatballs?|charcuterie|salami|prosciutto|pepperoni|anchov(y|ies))\b/i;
const wordGuard = (name) => [
  ...(NON_VEGAN.test(name) ? [`word: ${name.match(NON_VEGAN)[0]}`] : []),
  ...itemDietaryFlags(name, ['Vegan', 'Vegetarian']).map((f) => `flag: ${JSON.stringify(f)}`),
];

// Every playbook under its defaults and under every single pick, so a state
// where she cooks (and the main is on the list) is reached on each one that has it.
const statesFor = (pb, diet) => {
  const picks = [{}];
  for (const d of pb.decisions || []) for (const o of d.options || []) picks.push({ [d.id]: o });
  return picks.map((fc) => ({ id: 'e', type: pb.type, date: '2027-03-20', guestCount: 24, guests: [], foodChoices: fc, ...diet }));
};
const vegLine = (ev) => (playbookFoodPlan(ev).list || []).find((l) => l.id === 'diet-veg');

describe('every host-shell playbook declares a vegan main', () => {
  test('premise: the host shell offers 44 playbooks', () => {
    expect(HOST.length).toBe(44);
  });

  test('each declares `vegMainVegan`, a named dish', () => {
    const missing = HOST.filter((pb) => !(typeof pb.vegMainVegan === 'string' && pb.vegMainVegan.trim())).map((pb) => pb.type);
    expect(missing).toEqual([]);
  });

  test('secondary guard: no declared vegan main names an animal product', () => {
    const bad = HOST.map((pb) => [pb.type, wordGuard(pb.vegMainVegan || '')]).filter(([, w]) => w.length);
    expect(bad).toEqual([]);
  });
});

describe('with a vegan guest, the planned main is the declared vegan one', () => {
  const DIETS = [
    { dietCounts: { Vegan: 1 } },
    { dietCounts: { Vegetarian: 2, Vegan: 1 } },
    { guestMode: 'roster', guests: [{ name: 'A', rsvp: 'Yes', meal: 'Vegan' }, { name: 'B', rsvp: 'Yes', meal: 'Vegetarian' }, { name: 'C', rsvp: 'Yes' }] },
  ];

  test('the reader picks it for every playbook, the vegan default included', () => {
    for (const diet of DIETS) {
      const wrong = [...HOST, { type: 'No authored main' }].map((pb) => [pb.type, plannedVegMain(pb, { type: pb.type, ...diet })])
        .filter(([, m]) => !(m && m.vegan === true && wordGuard(m.name).length === 0));
      expect(wrong).toEqual([]);
    }
    for (const pb of HOST) expect(plannedVegMain(pb, { dietCounts: { Vegan: 1 } }).name).toBe(pb.vegMainVegan.trim());
  });

  test('census: every food-plan line it reaches is the vegan main, sized to both diets', () => {
    const wrong = [];
    const reached = new Set();
    for (const pb of HOST) {
      for (const diet of DIETS) {
        const want = diet.dietCounts ? (diet.dietCounts.Vegetarian || 0) + diet.dietCounts.Vegan : 2;
        for (const ev of statesFor(pb, diet)) {
          const line = vegLine(ev);
          if (!line) continue;
          reached.add(pb.type);
          const ok = line.vegan === true && line.item.startsWith(pb.vegMainVegan.trim()) && line.qty === want && wordGuard(line.item).length === 0;
          if (!ok) wrong.push(`${pb.type}: ${line.item} (qty ${line.qty}, vegan ${line.vegan})`);
        }
      }
    }
    expect(wrong.slice(0, 10)).toEqual([]);
    // Wedding's picks never put the main on her list (a caterer feeds every
    // guest); the reader test above covers its declaration.
    expect(HOST.filter((pb) => !reached.has(pb.type)).map((pb) => pb.type)).toEqual(['Wedding']);
  });

  test('the note says the dish is vegan', () => {
    const line = vegLine({ id: 'c', type: 'The Cookout', guestCount: 30, guests: [], dietCounts: { Vegetarian: 2, Vegan: 1 } });
    expect(line.note).toMatch(/vegan/i);
    expect(line.note).toMatch(/no meat, fish, dairy, eggs or honey/);
  });
});

// ─── CHECK LABELS (owner ruling 1, 11/23/2026) ───────────────────────────────
// Some vegan dishes lean on a bought item that can hide an animal product:
// pastry (butter), buns (eggs or milk), tortillas and refried beans (lard). The
// line names the ones that apply, by the dish's DECLARATION
// (`vegMainVeganCheck`). The word lists below are this census's guard on the
// declarations, never the rule.
describe('a vegan main that leans on a bought item says to check its label', () => {
  const NAMES = {
    pastry: /\b(pastry|phyllo|filo|wellington)\b/i,
    buns: /\b(buns?|burgers?|sliders?)\b/i,
    tortillas: /\b(tortillas?|wraps?|tacos?|enchiladas?|quesadillas?)\b/i,
    'refried beans': /\b(refried|frijoles)\b/i,
    // Owner ruling 11/24/2026: bread joins the list.
    bread: /\b(breads?|crostini|sandwich(es)?|toasts?|baguettes?|rolls?|biscuits?|croutons?|pitas?|naan|flatbreads?|injera)\b/i,
  };
  const CONTAINS = { pastry: ['butter'], buns: ['eggs', 'milk'], tortillas: ['lard'], 'refried beans': ['lard'], bread: ['milk', 'butter', 'honey'] };
  const declared = (pb) => (Array.isArray(pb.vegMainVeganCheck) ? pb.vegMainVeganCheck : []);
  const list = (xs, joiner) => (xs.length < 3 ? xs.join(` ${joiner} `) : `${xs.slice(0, -1).join(', ')}, ${joiner} ${xs[xs.length - 1]}`);
  const sentence = (keys) => `Check labels: ${list(keys, 'and')} can contain ${list([...new Set(keys.flatMap((k) => CONTAINS[k]))], 'or')}.`;

  test('only known items are declared', () => {
    const bad = HOST.filter((pb) => declared(pb).some((k) => !CONTAINS[k])).map((pb) => [pb.type, declared(pb)]);
    expect(bad).toEqual([]);
  });

  // A dish can name an item and still declare no check, with its reason
  // (`vegMainVeganNoCheck: { <item>: '<why>' }`). Owner, 11/24/2026: injera is
  // teff and water, and a warning that is almost never true teaches hosts to
  // ignore warnings.
  const declaredNone = (pb) => ((pb.vegMainVeganNoCheck && typeof pb.vegMainVeganNoCheck === 'object') ? pb.vegMainVeganNoCheck : {});

  test('census: every vegan dish that names one of the items declares its check, or declares none with a reason', () => {
    const missing = HOST.map((pb) => [pb.type, Object.keys(NAMES).filter((k) => NAMES[k].test(pb.vegMainVegan || '')
      && !declared(pb).includes(k) && !(typeof declaredNone(pb)[k] === 'string' && declaredNone(pb)[k].trim()))])
      .filter(([, m]) => m.length);
    expect(missing).toEqual([]);
    // Twelve dishes lean on one: four puff pastries, three bunned burgers,
    // three tortillas, and two breads (crostini, tea sandwiches).
    expect(HOST.filter((pb) => declared(pb).length).length).toBe(12);
  });

  test('declared none: Ethiopian Coffee Ceremony\'s injera carries no bread check, and says why', () => {
    const withNone = HOST.filter((pb) => Object.keys(declaredNone(pb)).length).map((pb) => [pb.type, declaredNone(pb)]);
    expect(withNone).toEqual([['Ethiopian Coffee Ceremony', { bread: 'Injera is teff and water.' }]]);
    // Never both: a check and a reason for not having it.
    expect(HOST.filter((pb) => declared(pb).some((k) => k in declaredNone(pb))).map((pb) => pb.type)).toEqual([]);
    const pb = HOST.find((p) => p.type === 'Ethiopian Coffee Ceremony');
    expect(plannedVegMain(pb, { dietCounts: { Vegan: 1 } }).check).toEqual([]);
  });

  test('the reader carries the check, and every vegan line the plan reaches shows it', () => {
    const wrong = [];
    for (const pb of HOST) {
      const keys = declared(pb);
      const m = plannedVegMain(pb, { dietCounts: { Vegan: 1 } });
      if (JSON.stringify(m.check) !== JSON.stringify(keys)) wrong.push(`${pb.type}: reader ${JSON.stringify(m.check)}`);
      for (const ev of statesFor(pb, { dietCounts: { Vegetarian: 1, Vegan: 1 } })) {
        const line = vegLine(ev);
        if (!line) continue;
        const shows = keys.length ? line.note.endsWith(` ${sentence(keys)}`) : !/check labels/i.test(line.note);
        if (!shows) { wrong.push(`${pb.type}: ${line.note}`); break; }
      }
    }
    expect(wrong).toEqual([]);
  });

  test('the owner\'s wording, one item and several', () => {
    expect(sentence(['pastry'])).toBe('Check labels: pastry can contain butter.');
    expect(sentence(['pastry', 'buns', 'tortillas'])).toBe('Check labels: pastry, buns, and tortillas can contain butter, eggs, milk, or lard.');
    const line = vegLine({ id: 'c', type: 'The Cookout', guestCount: 30, guests: [], dietCounts: { Vegan: 1 } });
    expect(line.note).toMatch(/Check labels: buns can contain eggs or milk\.$/);
  });

  test('bread: the owner\'s wording', () => {
    expect(sentence(['bread'])).toBe('Check labels: bread can contain milk, butter, or honey.');
    const line = vegLine({ id: 'h', type: 'Housewarming', guestCount: 20, guests: [], dietCounts: { Vegan: 1 } });
    expect(line.note).toMatch(/Check labels: bread can contain milk, butter, or honey\.$/);
  });

  test('a vegetarian-only line carries no label check', () => {
    const line = vegLine({ id: 'c', type: 'The Cookout', guestCount: 30, guests: [], dietCounts: { Vegetarian: 1 } });
    expect(line.note).not.toMatch(/check labels/i);
  });
});

describe('with only vegetarians, nothing changes', () => {
  test('the reader plans the authored vegetarian main, or the old default', () => {
    for (const pb of [...HOST, { type: 'No authored main' }]) {
      const m = plannedVegMain(pb, { dietCounts: { Vegetarian: 2 } });
      const was = (typeof pb.vegMain === 'string' && pb.vegMain.trim()) ? pb.vegMain.trim() : 'Stuffed peppers + grilled veg platter';
      expect(m).toEqual({ name: was, vegan: false });
    }
  });

  test('the line carries no vegan claim and the note is as it was', () => {
    const line = vegLine({ id: 'c', type: 'The Cookout', guestCount: 30, guests: [], dietCounts: { Vegetarian: 2 } });
    expect(line.vegan).toBeUndefined();
    expect(line.note).toBe('So your vegetarian/vegan guests have a real main, not just sides.');
  });
});
