#!/usr/bin/env node
// npm run policies:publish — turn the three ATTORNEY-APPROVED policy drafts
// into static pages at hostv2/public/legal/{privacy,terms,refunds}.html.
//
// RUN BY HAND ONLY, after sign-off (docs/legal/PUBLISH_CHECKLIST.md). It is not
// wired into CI, `npm run build`, `release`, or verify:all, and must not be:
// publishing a legal page is a decision a person makes, not a build step.
//
// Refuses — exit 1, nothing written — while any draft still carries an
// [OWNER: …], COUNSEL, VERIFY: or DRAFT marker, or an unbalanced ⟶ … ⟵ note,
// and prints every one as file:line. The rules live in policy-publish-core.js.
//
// hostv2/public/ is vite's publicDir, copied verbatim into the hostv2 build,
// which `npm run release` stages under build/hostv2/ for GitHub Pages. So once
// the pages are committed and deployed they are served at
//   <homepage>/hostv2/legal/<slug>.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import core from './policy-publish-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'hostv2', 'public', 'legal');

const sources = core.POLICIES.map((p) => ({ ...p, source: readFileSync(join(ROOT, p.file), 'utf8') }));
const result = core.publishPolicies(sources);

if (!result.ok) {
  console.error(`✗ Not published. ${result.problems.length} item(s) must be resolved in the drafts first:\n`);
  for (const p of result.problems) console.error(`  ${core.formatProblem(p)}`);
  console.error('\nNothing was written. See docs/legal/PUBLISH_CHECKLIST.md.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const homepage = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).homepage.replace(/\/$/, '');
for (const page of result.pages) {
  writeFileSync(join(OUT, `${page.slug}.html`), page.html);
  console.log(`✓ hostv2/public/legal/${page.slug}.html — "${page.title}", effective ${page.effective}`);
  console.log(`    after deploy: ${homepage}/hostv2/legal/${page.slug}.html`);
}
console.log('\nNext: set these URLs in BRAND.policies (src/lib/brand.js) and open a PR — docs/legal/PUBLISH_CHECKLIST.md.');
