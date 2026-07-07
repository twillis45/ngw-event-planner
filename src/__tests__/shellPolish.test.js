// SHELL-POLISH-1 — obstruction + landing-yield source contracts. Geometry was
// verified live at 390×844 (chip 38×38, zero button overlap, expand/collapse
// loop, no overflow); these pin the code shapes those checks rely on.

import fs from 'fs';
import path from 'path';

const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');

test('1 · demo tools rest as a collapsed chip, never the full floating bar', () => {
  const comp = app.slice(app.indexOf('function DemoToolsBar'), app.indexOf('function DemoToolsBar') + 3200);
  expect(comp).toMatch(/const \[open, setOpen\] = useState\(false\)/); // collapsed by default
  expect(comp).toMatch(/data-testid="demo-tools-chip"/);
  expect(comp).toMatch(/safe-area-inset-bottom/); // never under the home indicator
});

test('2 · demo tools stay flag-gated (absent from normal host flow)', () => {
  expect(app).toMatch(/localStorage\.getItem\('ngw-demo-tools'\) === '1'/);
});

test('3 · header cue yields when its wording is inside the hero title (one telling)', () => {
  const track = app.slice(app.indexOf('function ReadinessTrack'), app.indexOf('function ReadinessTrack') + 6000);
  expect(track).toMatch(/the cue never re-tells the hero/i);
  expect(track).toMatch(/norm\(heroNA\.title\)\.includes\(cueN\.slice\(0, 24\)\)/);
});

test('4 · Plan hero still yields to the tapped-step focus card (landing-must-differ)', () => {
  expect(app).toMatch(/\{!openTaskId && <PlanNowHero event=\{event\} profile=\{profile\} onNav=\{\(t, id, opts\) => go\(t, id, opts\)\} \/>\}/);
});
