// MOBILE-LAYOUT-REPAIR-1 — layout containment contracts. jsdom can't measure
// real layout, so these pin the SOURCE rules that the live-audit fixes rely
// on; the geometry itself was verified in the browser at 360/390/393/430/768
// (gap 12px, zero horizontal overflow, bottom-nav clearance 39px).

import fs from 'fs';
import path from 'path';

const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');

test('1 · ReadinessTrack reserves its own space below the bar (first-card collision fix)', () => {
  const m = app.match(/function ReadinessTrack[\s\S]{0,1600}?height: 4, background: trackBg[^}]*}/);
  expect(m).toBeTruthy();
  expect(m[0]).toMatch(/marginBottom: 12/);
});

test('2 · the track is in document flow — never fixed/absolute overlaying content', () => {
  const m = app.match(/function ReadinessTrack[\s\S]{0,1600}?height: 4[^}]*}/);
  expect(m[0]).toMatch(/position: 'relative'/);
  expect(m[0]).not.toMatch(/position: 'fixed'|position: 'absolute'/);
});

test('3 · editorial/context card uses fluid width, never a fixed height', () => {
  const m = app.match(/function ContextNudgeCard[\s\S]{0,2200}?return \(/);
  expect(m).toBeTruthy();
  const card = app.slice(app.indexOf('function ContextNudgeCard'), app.indexOf('function ContextNudgeCard') + 2600);
  expect(card).toMatch(/maxWidth: 760/);
  expect(card).not.toMatch(/height: \d/);
  expect(card).not.toMatch(/minWidth: \d{3}/);
});
