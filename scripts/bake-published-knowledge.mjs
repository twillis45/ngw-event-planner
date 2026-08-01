#!/usr/bin/env node
// ─── BAKE PUBLISHED KNOWLEDGE — the Conveyor 1 transport step ─────────────────
//
// Reads governance-approved PUBLISHED KCRs and writes the deterministic snapshot
// the application bundles:
//
//   published KCRs (export from KAS/AdminConsole)
//     -> buildSnapshot()  [governance filter, sort, hash]
//     -> src/lib/knowledge/publishedKnowledge.json
//     -> the app build
//
// USAGE
//   node scripts/bake-published-knowledge.mjs                  # default input, or empty
//   node scripts/bake-published-knowledge.mjs --in <file.json>
//   node scripts/bake-published-knowledge.mjs --at 2026-07-31  # pin the snapshot date
//   node scripts/bake-published-knowledge.mjs --check          # verify, write nothing
//
// INPUT is an admin export: either an array of KCR objects, or { kcrs: [...] } /
// { records: [...] } (the KAS list shape, whose rows carry the KCR under `data`).
// There is deliberately NO network call and NO credential here: the build must be
// reproducible offline and must never hold an admin token. An operator exports
// from the console; this consumes the file.
//
// MISSING INPUT IS NOT AN ERROR. With no export present the script writes the
// empty snapshot, which is exactly today's behavior — every value authored. That
// keeps the build green on any machine and makes "no governed knowledge" a normal
// state rather than a broken one.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSnapshot } from '../src/lib/knowledge/publishedSnapshotBuild.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'src/lib/knowledge/publishedKnowledge.json');
// PHASE 5D (P0): the KCR export moved INTO src/ so the app can import it. It was
// outside the CRA module scope, which is why the export had to reconstruct its merge
// base from the SNAPSHOT (heads only) and silently dropped superseded history on every
// round trip. One file, one owner, readable by both the bake and the console.
const DEFAULT_IN = path.join(ROOT, 'src/lib/knowledge/publishedKcrs.json');

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] || null);
};
const has = (name) => argv.includes(name);

const inPath = flag('--in') || DEFAULT_IN;
const at = flag('--at');
const checkOnly = has('--check');

// Accept the three shapes an export can plausibly arrive in; a KAS row wraps the
// KCR in `data` (kas_records.data), so unwrap that when present.
function readKcrs(file) {
  if (!fs.existsSync(file)) return { kcrs: [], found: false };
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    console.error(`x bake: ${file} is not valid JSON - ${e.message}`);
    process.exit(1);
  }
  const list = Array.isArray(raw) ? raw
    : Array.isArray(raw && raw.kcrs) ? raw.kcrs
    : Array.isArray(raw && raw.records) ? raw.records
    : null;
  if (!list) {
    console.error('x bake: expected an array, or { kcrs: [...] } / { records: [...] }');
    process.exit(1);
  }
  return { kcrs: list.map((r) => (r && r.data && !r.status ? r.data : r)), found: true };
}

const { kcrs, found } = readKcrs(inPath);
const { snapshot, accepted, rejected } = buildSnapshot(kcrs, { at });
const json = JSON.stringify(snapshot, null, 2) + '\n';

if (!found) {
  console.log(`- bake: no export at ${path.relative(ROOT, inPath)} - writing the empty snapshot (all values authored).`);
} else {
  console.log(`- bake: read ${kcrs.length} record(s) from ${path.relative(ROOT, inPath)}`);
}
console.log(`  accepted (published): ${accepted}`);
if (rejected.length) {
  // Never drop silently: a refused KCR is a governance outcome and must be visible.
  console.log(`  refused: ${rejected.length}`);
  for (const r of rejected.slice(0, 20)) console.log(`    - ${r.id || '(no id)'}: ${r.reason}`);
  if (rejected.length > 20) console.log(`    ... and ${rejected.length - 20} more`);
}
console.log(`  entries: ${snapshot.entryCount} - version ${snapshot.snapshotVersion} - generatedAt ${snapshot.generatedAt || 'n/a'}`);

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (checkOnly) {
  if (current === json) { console.log('[OK] snapshot is up to date.'); process.exit(0); }
  console.error('x snapshot is STALE - run: npm run bake:knowledge');
  process.exit(1);
}

if (current === json) {
  console.log('[OK] snapshot unchanged (deterministic).');
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  console.log(`[OK] wrote ${path.relative(ROOT, OUT)}`);
}
