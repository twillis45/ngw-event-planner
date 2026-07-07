// WCGW-ROUTE-1 — every risk row must route to the exact place its fix happens
// (deep-link doctrine) or stay honestly informational. The router reuses the
// shared earliest-keyword-wins milestone router; this pins the risk-specific
// layers (weather → rain plan, parking → parking note, schedule → day plan)
// and the no-dead-CTA fallback via the shared router's behavior.

import { milestoneActionRoute } from '../CommandCenter';

// The riskFixRoute wrapper lives inside App.js (component scope); its contract
// is: weather/parking/schedule handled first, then milestoneActionRoute, and a
// Timeline fallback means "informational". These tests pin the shared-router
// half plus the source contract for the risk-specific half.

test('shared router still resolves risk-ish text to real fix surfaces', () => {
  const ev = { vendors: [{ id: 'v1', name: 'Caterer Co', status: 'Quoted' }] };
  expect(milestoneActionRoute('caterer cancels late', ev, null).tab).toBe('Vendors');
  expect(milestoneActionRoute('running out of food for the headcount', ev, null).tab).toBe('Planning'); // 'food' leads — earliest keyword wins
  expect(milestoneActionRoute('costs creep past the budget', ev, null).tab).toBe('Budget');
});

test('source contract: WCGW panel routes weather/parking/schedule risks and guards dead CTAs', () => {
  const fs = require('fs'); const path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
  expect(app).toMatch(/function riskFixRoute/);
  expect(app).toMatch(/rain\|weather\|storm.*Add rain backup.*rain-plan/s);
  expect(app).toMatch(/parking.*parking-notes/s);
  expect(app).toMatch(/r\.tab === 'Timeline'\) return null; \/\/ informational by design/);
  // all four call sites pass onNavTo
  expect((app.match(/<WhatCouldGoWrongPanel[^/]*onNavTo=/g) || []).length).toBe(4);
  expect(app).toMatch(/data-testid=\{`risk-fix-\$\{rid\}`\}/);
});
