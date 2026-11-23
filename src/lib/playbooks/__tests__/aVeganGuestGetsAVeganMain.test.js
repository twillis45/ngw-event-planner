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
