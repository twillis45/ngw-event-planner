// ─── A GUEST MUST NOT DOWNLOAD THE PLAYBOOK CORPUS ──────────────────────────
//
// This gate exists because the fix already happened once and came back.
//
// `hostv2/src/inviteShared.js` opens by describing the original defect: "a guest
// downloaded the entire playbook engine to read an invitation." That was fixed
// by moving four small helpers out of `eventPool` so the corpus stayed off the
// invite path.
//
// On 2026-08-16 the review board found it had fully regressed, through a
// different edge. `InviteV2.jsx` imports `lodgingIntel`, which imported
// `DEST_LODGING_OPTIONS` from `./playbooks` — a FOUR-STRING ARRAY. That single
// named import pulled the whole 1.4MB corpus back onto the critical path of a
// guest tapping an invitation: Ethiopian Coffee Ceremony, Kwanzaa, Board Meeting
// and 36 other playbooks no invite will ever render. Measured guest payload was
// 1.98MB raw.
//
// THE LESSON IS NOT THAT SOMEONE WAS CARELESS. The first fix removed one edge
// and nothing stopped a new edge from recreating it, so the payload silently
// regressed to worse than before with every test still green. A fix without a
// gate is a fix with an expiry date.
//
// So this asserts the PROPERTY rather than the edge: whatever the import graph
// looks like, no chunk a guest loads may contain the corpus. It would have
// caught the regression the day it landed, and it does not care which module
// causes the next one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');

// Markers that exist ONLY in the playbook corpus. Deliberately event types no
// invitation could ever legitimately need to name.
const CORPUS_MARKERS = ['Ethiopian Coffee Ceremony', 'Kwanzaa Gathering', 'Board Meeting'];

/** Static import closure of a chunk — what the browser fetches before it runs. */
function staticClosure(entryFile) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = fs.readFileSync(path.join(DIST, file), 'utf8');
    // Vite emits static imports as `from"./chunk-hash.js"` at the top of the
    // chunk. Dynamic `import("./x.js")` is deliberately NOT followed — that is
    // the whole point of a dynamic import and it is off the critical path.
    for (const m of src.matchAll(/from\s*"\.\/([A-Za-z0-9_.-]+\.js)"/g)) walk(m[1]);
  };
  walk(entryFile);
  return [...seen];
}

const chunkFor = (name) => {
  const hit = fs.readdirSync(DIST).filter((f) => f.startsWith(`${name}-`) && f.endsWith('.js'));
  return hit[0];
};

test.describe('the guest payload', () => {
  test('PREMISE — the invite chunk and the corpus both exist in this build', async () => {
    // Without this the whole file could pass by measuring nothing, which is the
    // failure shape that let the original regression hide.
    expect(fs.existsSync(DIST)).toBe(true);
    expect(chunkFor('InviteV2')).toBeTruthy();
    const all = fs.readdirSync(DIST).filter((f) => f.endsWith('.js'));
    const withCorpus = all.filter((f) => fs.readFileSync(path.join(DIST, f), 'utf8').includes(CORPUS_MARKERS[0]));
    expect(withCorpus.length).toBeGreaterThan(0);   // the corpus IS shipped, to hosts
  });

  test('no chunk on the invite path contains the playbook corpus', async () => {
    // RED-PROOF: point `src/lib/lodgingIntel.js` back at './playbooks' for
    // DEST_LODGING_OPTIONS and this goes red naming the chunk.
    const closure = staticClosure(chunkFor('InviteV2'));
    const offenders = [];
    for (const file of closure) {
      const src = fs.readFileSync(path.join(DIST, file), 'utf8');
      for (const marker of CORPUS_MARKERS) {
        if (src.includes(marker)) offenders.push(`${file} contains "${marker}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('and the invite path stays under a real byte budget', async () => {
    // A marker check alone would pass if the corpus were renamed or minified
    // differently. This is the number a guest actually pays: it was 1.98MB raw
    // before the fix and about 630KB after, so the budget is set where a
    // regression of that size cannot slip through while leaving normal growth
    // room.
    const closure = staticClosure(chunkFor('InviteV2'));
    const bytes = closure.reduce((n, f) => n + fs.statSync(path.join(DIST, f)).size, 0);
    expect(bytes).toBeLessThan(900 * 1024);
  });
});
