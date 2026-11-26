// EVERY DAY-OF FEATURE HAS A HOME (owner, 11/26/2026: "Don't miss any current
// functionality"). hostv4's The Day is built in batches, so dayFeatureMap.json
// lists every day-of feature hostv2 has (the live view, the day before,
// Afterward) by a piece of hostv2 code that proves it exists, and says where it
// lives in hostv4: built (on the page), linked (a link from the page to the
// current app) or planned (a named batch). This fails:
//   - when a feature's hostv2 anchor is gone (the map is stale);
//   - when a built or linked feature's selector is not on hostv4's DayPage;
//   - when a planned feature names no batch, or any feature has no home.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(join(here, 'dayFeatureMap.json'), 'utf8'));
const v2 = (f) => readFileSync(join(here, '..', '..', 'hostv2', f), 'utf8');
const page = readFileSync(join(here, '..', 'src', 'DayPage.jsx'), 'utf8');

describe('every day-of feature has a home', () => {
  it('ids are unique; every feature has a known home and a stated spot', () => {
    const ids = map.features.map((f) => f.id);
    expect(ids.length).toBe(new Set(ids).size);
    expect(map.features.filter((f) => !map.places[f.home] || !String(f.where || '').trim()).map((f) => f.id)).toEqual([]);
  });
  it('every feature still exists in hostv2', () => {
    expect(map.features.filter((f) => !v2(f.anchor.file).includes(f.anchor.contains)).map((f) => f.id)).toEqual([]);
  });
  it('built and linked features are on hostv4’s The Day', () => {
    expect(map.features.filter((f) => (f.home === 'built' || f.home === 'linked') && !page.includes(f.selector)).map((f) => f.id)).toEqual([]);
  });
  it('planned features name the batch that builds them', () => {
    expect(map.features.filter((f) => f.home === 'planned' && !String(f.batch || '').trim()).map((f) => f.id)).toEqual([]);
  });
});
