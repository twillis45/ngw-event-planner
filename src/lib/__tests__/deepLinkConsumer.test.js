// Dead-CTA report (2026-07-07, #3 in the series): 'See what's next' targeted a
// purchase id the food plan never renders — a route built from a different
// source than its consumer. DOCTRINE: a route must target an item its
// destination renders; consumers fall back visibly for unknown ids.

import { nextUpcomingTask, playbookFoodPlan } from '../playbooks';
import fs from 'fs';
import path from 'path';

test('1 · nextUpcomingTask only routes to ids present on the RENDERED food plan', () => {
  // the exact repro event shape: bbq with default choices (which filter the raw purchase list)
  const ev = { id: 'e-dl', type: 'bbq', date: '2099-08-01', guestMode: 'count', guestCount: 30, guests: [], foodGot: {}, foodSkip: {} };
  const next = nextUpcomingTask(ev, new Date('2099-07-01'));
  if (next) {
    const rendered = new Set(playbookFoodPlan(ev).list.filter(x => x && !x.skipped).map(x => x.id));
    expect(rendered.has(next.route.foodFocus)).toBe(true);
  }
});

test('2 · every playbook type: preview id is always renderable (sweep)', () => {
  ['bbq', 'crab feast', 'birthday', 'graduation', 'juneteenth', 'baby shower'].forEach(type => {
    const ev = { id: 'e', type, date: '2099-08-01', guestMode: 'count', guestCount: 25, guests: [] };
    const next = nextUpcomingTask(ev, new Date('2099-07-01'));
    if (!next) return;
    const rendered = new Set(playbookFoodPlan(ev).list.filter(x => x && !x.skipped).map(x => x.id));
    expect(rendered.has(next.route.foodFocus)).toBe(true);
  });
});

test('3 · source contract: the focus consumer opens all three layers and falls back visibly on unknown ids', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  expect(app).toMatch(/_acc\.setOpenId\(SHOP_HOME\); else setShopLocal\(true\)/); // opens the shopping home
  expect(app).toMatch(/if \(target && target\.group\) setOpenGroup\(target\.group\)/); // opens the item's group
  expect(app).toMatch(/fp-spread-\$\{event\.id\}`\); if \(card\) card\.scrollIntoView/); // unknown-id fallback lands somewhere real
});
