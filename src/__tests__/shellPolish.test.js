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

// ── Todd's HostHome report (2026-07-07): eyebrow truth + condensing + city validation
test('5 · HostHome hero eyebrow speaks the real tier — never NEEDS YOU on calm copy', () => {
  const hero = app.slice(app.indexOf('the eyebrow was hardcoded NEEDS YOU'), app.indexOf('the eyebrow was hardcoded NEEDS YOU') + 900);
  expect(hero).toMatch(/na\.category === 'neutral' \? 'ON TRACK'/);
  expect(hero).toMatch(/na\.level === 'critical' \? 'NEEDS YOU' : 'NEXT UP'/);
});

test('6 · calm-tier hero condenses to one row; unanswered moment prompt is one row', () => {
  expect(app).toMatch(/a "nothing needs you" state is one calm row/);
  expect(app).toMatch(/What’s the one moment this event is really for\?/);
  expect(app).not.toMatch(/Name yours and we’ll keep the whole plan pointed at it/);
});

test('7 · city fields carry inline validation (CityFieldNote) on both city inputs', () => {
  expect(app).toMatch(/function CityFieldNote/);
  expect((app.match(/<CityFieldNote value=\{event\.venueCity\} \/>/g) || []).length).toBe(2);
  expect(app).toMatch(/city only here/);
});
