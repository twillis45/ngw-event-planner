// EVERY GUEST FEATURE HAS A HOME (owner, 11/25/2026: "build the checklist for
// the test" before the Guests section is rebuilt as UX_12's direction E).
//
// The simplified Guests page must not quietly drop anything a host can do
// today. guestFeatureMap.json lists each feature by a piece of code that proves
// it still exists, and says where it lives in the new design. This test fails:
//   - when a feature's code anchor is gone (the map is stale, or a feature was
//     removed without the map saying so);
//   - when a feature has no valid home;
//   - when the shell declares a new guest-related name nobody placed;
//   - when a new guest component file appears that the map doesn't name.
// When the new screens are built, each feature gains the selector that finds it
// on its screen, and the e2e suite checks that too.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(join(root, 'test', 'guestFeatureMap.json'), 'utf8'));
const read = (f) => readFileSync(join(root, f), 'utf8');

describe('every guest feature has a home', () => {
  it('ids are unique and every home is a known place with a stated spot', () => {
    const ids = map.features.map((f) => f.id);
    expect(ids.length).toBe(new Set(ids).size);
    const bad = map.features.filter((f) => !map.places[f.home] || !String(f.where || '').trim()).map((f) => f.id);
    expect(bad, 'features without a valid home').toEqual([]);
  });

  it('every feature still exists in the code', () => {
    const missing = map.features.filter((f) => {
      const file = join(root, f.anchor.file);
      return !existsSync(file) || !read(f.anchor.file).includes(f.anchor.contains);
    }).map((f) => f.id + ' (' + f.anchor.file + ': ' + f.anchor.contains + ')');
    expect(missing, 'anchors no longer in the code').toEqual([]);
  });

  it('every guest-related name the shell declares is placed', () => {
    const src = read('src/HostShellV2.jsx');
    const re = /^\s*const (\w*(?:Guest|guest|Roster|Rsvp|rsvp|Nudge|nudge|Invite|invite|Csv|Told|told)\w*)\s*=/gm;
    const names = new Set(); let m;
    while ((m = re.exec(src))) names.add(m[1]);
    const ids = new Set(map.features.map((f) => f.id));
    const placed = map.handlers.map;
    const unplaced = [...names].filter((n) => !(n in placed));
    expect(unplaced, 'new guest names: add each to handlers.map with its feature, "internal" or "notGuest"').toEqual([]);
    const dangling = Object.entries(placed).filter(([, v]) => !['internal', 'notGuest'].includes(v) && !ids.has(v)).map(([k]) => k);
    expect(dangling, 'handlers pointing at no feature').toEqual([]);
  });

  it('every guest component file is mapped or marked guest-facing', () => {
    const files = readdirSync(join(root, 'src')).filter((f) => /\.jsx$/.test(f) && /(Guest|Invite|Nudge|People|ShareInvite|HostUpdates|Rsvp)/.test(f)).map((f) => 'src/' + f);
    const known = new Set([...map.features.map((f) => f.anchor.file), ...map.guestFacing.files]);
    expect(files.filter((f) => !known.has(f)), 'guest component files the map does not name').toEqual([]);
  });
});
