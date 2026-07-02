#!/usr/bin/env node
// Knowledge Impact Index (KCR-2 gap 4) — the CI-side index the RUNTIME preview can't
// build. knowledgeImpactPreview() derives engines/downstream/purchases at runtime, but
// it CANNOT know which AI prompts, tests, or templates a knowledge change touches without
// scanning the repo — so those stay honest-empty in-app. This script is that scan: it
// enumerates the candidate downstream artifacts so CI (or a steward) can cross-check a
// KCR's blast radius before publishing. Coarse + honest — a candidate set, not a claim.
//
// Run:  node scripts/knowledgeImpactIndex.mjs            (human)
//       node scripts/knowledgeImpactIndex.mjs --json     (machine / commit as an index)
import { readFile, readdir } from 'fs/promises';
import path from 'path';

const asJson = process.argv.includes('--json');
const SRC = path.resolve('src');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const files = await walk(SRC);
const rel = (p) => path.relative(process.cwd(), p);

// 1. AI prompt features (the prompt surface a knowledge change can flow into).
let aiFeatures = [];
try {
  const proxy = await readFile(path.join(SRC, 'lib/aiProxy.js'), 'utf8');
  const m = proxy.match(/AI_FEATURES\s*=\s*\[([^\]]*)\]/s);
  if (m) aiFeatures = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
} catch { /* aiProxy absent */ }

// 2. Test files that exercise the knowledge corpus (playbooks / knowledge / quantities).
const testFiles = files.filter((f) => /\.test\.(js|jsx)$/.test(f))
  .filter((f) => /playbook|knowledge|quantit|sourcing|attendance|cost|food/i.test(f) || /playbook|knowledge/i.test(f))
  .map(rel);

// 3. Templates / projection renderers (runbook/checklist/template views derived from knowledge).
const templateFiles = files.filter((f) => /template|runbook|checklist|projection/i.test(path.basename(f))).map(rel);

const index = {
  generatedNote: 'Candidate downstream artifacts for any knowledge change — CI cross-check, not a per-field claim. Stamp the run date from the caller.',
  aiFeatures,
  testFiles,
  templateFiles,
  counts: { aiFeatures: aiFeatures.length, testFiles: testFiles.length, templateFiles: templateFiles.length },
};

if (asJson) {
  console.log(JSON.stringify(index, null, 2));
} else {
  console.log(`\n  KNOWLEDGE IMPACT INDEX (candidate downstream artifacts)\n`);
  console.log(`  AI prompt features (${aiFeatures.length}): ${aiFeatures.join(', ') || '—'}`);
  console.log(`  Corpus test files (${testFiles.length}):`);
  testFiles.slice(0, 20).forEach((f) => console.log(`    ${f}`));
  if (testFiles.length > 20) console.log(`    …and ${testFiles.length - 20} more`);
  console.log(`  Template / projection files (${templateFiles.length}): ${templateFiles.join(', ') || '—'}`);
  console.log('');
}
