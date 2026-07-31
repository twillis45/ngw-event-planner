// 05_measure_decisions.mjs — CURRENT-STATE AUDIT, Phase 5 measurement harness.
//
// METHOD: real JS evaluation, NOT line/regex parsing of source text.
//   Each src/lib/playbooks/data/*.js is a pure ESM data module (`export default`).
//   The repo's package.json has no "type":"module", so a bare `import()` of a .js
//   file fails under Node's CJS default. This script therefore STAGES byte-identical
//   copies with a .mjs extension into a temp dir, rewrites the one relative import
//   that exists in the corpus (crabFeast -> ../../crabServing), dynamic-imports them,
//   and measures the resulting OBJECT GRAPH. Multi-line object literals, nested
//   objects, template strings, escaped apostrophes and trailing commas are therefore
//   handled by the JS parser itself, not by a hand-rolled matcher.
//
// It also stages src/lib/knowledge/timingProvenance.js so `effectiveTimingProvenance`
// is executed for real (the same resolver the board calls at runtime) rather than
// approximated.
//
// READ-ONLY: imports data modules and reads them. Mutates nothing in src/.
// Usage: node docs/current-state-review/2026-07-30/evidence/05_measure_decisions.mjs

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const REPO = path.resolve(process.argv[2] || '/Users/toddwillis/Code/ngw-event-planner/demo');
const DATA_DIR = path.join(REPO, 'src/lib/playbooks/data');
const STAGE = fs.mkdtempSync(path.join(os.tmpdir(), 'ngw-audit-stage-'));

function stage(srcAbs, destName, rewrites = []) {
  let s = fs.readFileSync(srcAbs, 'utf8');
  for (const [re, to] of rewrites) s = s.replace(re, to);
  const dest = path.join(STAGE, destName);
  fs.writeFileSync(dest, s);
  return dest;
}

// ── stage deps ────────────────────────────────────────────────────────────────
stage(path.join(REPO, 'src/lib/crabServing.js'), 'crabServing.mjs');
const timingPath = stage(path.join(REPO, 'src/lib/knowledge/timingProvenance.js'), 'timingProvenance.mjs');

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.js')).sort();
const staged = files.map((f) => stage(
  path.join(DATA_DIR, f),
  f.replace(/\.js$/, '.mjs'),
  [[/from\s+'\.\.\/\.\.\/crabServing'/g, "from './crabServing.mjs'"]],
));

const timing = await import(pathToFileURL(timingPath).href);
const playbooks = [];
for (let i = 0; i < staged.length; i++) {
  const m = await import(pathToFileURL(staged[i]).href);
  playbooks.push({ file: files[i], pb: m.default });
}

// ── ALL_PLAYBOOKS registration check (source-text, index.js) ──────────────────
const indexSrc = fs.readFileSync(path.join(REPO, 'src/lib/playbooks/index.js'), 'utf8');
const allPbLine = /export const ALL_PLAYBOOKS = \[([\s\S]*?)\];/.exec(indexSrc);
const registered = allPbLine ? allPbLine[1].split(',').map((s) => s.trim()).filter(Boolean) : [];

// ── collect decisions ─────────────────────────────────────────────────────────
const rows = [];      // { pbType, file, d }
for (const { file, pb } of playbooks) {
  for (const d of (pb.decisions || [])) rows.push({ pbType: pb.type, file, d });
}

const out = [];
const P = (s = '') => out.push(s);
const num = (n) => String(n);

P('# 05 — Decision-system measurements (independently recomputed 2026-07-30)');
P('');
P('Source of truth: evaluated JS objects from `src/lib/playbooks/data/*.js`.');
P('');

// 1. playbook count
P('## 1. Corpus size');
P('');
P(`- Data modules in \`src/lib/playbooks/data/\`: **${files.length}**`);
P(`- Modules with a truthy default export carrying \`type\`: **${playbooks.filter((x) => x.pb && x.pb.type).length}**`);
P(`- Identifiers listed in \`ALL_PLAYBOOKS\` (index.js:87): **${registered.length}**`);
P(`- Distinct \`pb.type\` values: **${new Set(playbooks.map((x) => x.pb.type)).size}**`);
const noDecisions = playbooks.filter((x) => !(x.pb.decisions || []).length).map((x) => x.pb.type);
P(`- Playbooks with **zero** authored decisions: ${noDecisions.length ? noDecisions.join(', ') : 'none'}`);
P('');

// 2. decision counts
P('## 2. Decision counts');
P('');
const ids = rows.map((r) => r.d.id).filter(Boolean);
const idSet = new Set(ids);
P(`- Total authored decision objects (data/*.js only): **${rows.length}**`);
P(`- Decisions carrying an \`id\`: **${ids.length}**`);
P(`- **Unique** decision ids across the corpus: **${idSet.size}**`);
P(`- Duplicate-id instances (total − unique): **${ids.length - idSet.size}**`);
const perPb = playbooks.map((x) => [x.pb.type, (x.pb.decisions || []).length]).sort((a, b) => b[1] - a[1]);
P(`- Decisions per playbook — min ${perPb[perPb.length - 1][1]} (${perPb[perPb.length - 1][0]}), max ${perPb[0][1]} (${perPb[0][0]}), mean ${(rows.length / playbooks.length).toFixed(1)}`);
// intra-playbook duplicate ids
const intraDup = [];
for (const { pb } of playbooks) {
  const seen = new Map();
  for (const d of (pb.decisions || [])) { seen.set(d.id, (seen.get(d.id) || 0) + 1); }
  for (const [k, v] of seen) if (v > 1) intraDup.push(`${pb.type}:${k}×${v}`);
}
P(`- Duplicate ids **within a single playbook**: ${intraDup.length ? intraDup.join(', ') : 'none'}`);
P('');

// 3. naming convention distribution
P('## 3. Decision-id naming conventions');
P('');
const conv = (id) => {
  if (/^[a-z0-9]+$/.test(id)) return 'flat lowercase (`venue`)';
  if (/^[a-z]+(_[a-z0-9]+)+$/.test(id)) return 'snake_case (`catering_style`)';
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(id)) return 'camelCase (`guestCount`)';
  if (/^[a-z]+-[a-z0-9-]+$/.test(id)) return 'kebab-case';
  return 'other/mixed';
};
const convCount = {};
const convExamples = {};
for (const id of new Set(ids)) {
  const c = conv(id);
  convCount[c] = (convCount[c] || 0) + 1;
  (convExamples[c] ||= []).push(id);
}
P('| Convention | Unique ids | Examples |');
P('|---|---:|---|');
for (const [k, v] of Object.entries(convCount).sort((a, b) => b[1] - a[1])) {
  P(`| ${k} | ${v} | ${convExamples[k].slice(0, 6).join(', ')} |`);
}
P('');
// prefix families
const prefixes = {};
for (const id of new Set(ids)) {
  const m = /^([a-z]+)[_]/.exec(id);
  if (m) prefixes[m[1]] = (prefixes[m[1]] || 0) + 1;
}
const bigPref = Object.entries(prefixes).filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]);
P(`Namespace prefixes used ≥2×: ${bigPref.length ? bigPref.map(([k, v]) => `\`${k}_\`(${v})`).join(', ') : 'none'}`);
P('');

// 4. recurrence across playbooks
P('## 4. Ids recurring across playbooks + metadata agreement');
P('');
const byId = new Map();
for (const r of rows) {
  if (!r.d.id) continue;
  if (!byId.has(r.d.id)) byId.set(r.d.id, []);
  byId.get(r.d.id).push(r);
}
const recurring = [...byId.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
P(`- Ids appearing in **>1** playbook: **${recurring.length}** (covering ${recurring.reduce((s, [, v]) => s + v.length, 0)} decision instances)`);
P(`- Ids appearing in exactly one playbook: **${idSet.size - recurring.length}**`);
P('');
const FIELDS = ['when', 'weight', 'reversibility', 'emotionalWeight', 'difmCapable', 'deliversHeartMoment', 'label'];
const jd = (v) => (v === undefined ? '∅' : JSON.stringify(v));
P('| Decision id | Playbooks | `when` distinct | `weight` distinct | `reversibility` distinct | `emotionalWeight` distinct | `difmCapable` distinct | label distinct | fully identical? |');
P('|---|---:|---:|---:|---:|---:|---:|---:|---|');
let fullyIdentical = 0;
const deviationDetail = [];
for (const [id, insts] of recurring) {
  const dis = {};
  for (const f of FIELDS) dis[f] = new Set(insts.map((r) => jd(r.d[f]))).size;
  const structural = ['when', 'weight', 'reversibility', 'emotionalWeight', 'difmCapable'];
  const allSame = structural.every((f) => dis[f] === 1) && dis.label === 1;
  if (allSame) fullyIdentical++;
  P(`| \`${id}\` | ${insts.length} | ${dis.when} | ${dis.weight} | ${dis.reversibility} | ${dis.emotionalWeight} | ${dis.difmCapable} | ${dis.label} | ${allSame ? 'yes' : '**no**'} |`);
  if (!allSame) {
    const devFields = structural.filter((f) => dis[f] > 1);
    deviationDetail.push({ id, n: insts.length, devFields, whens: [...new Set(insts.map((r) => `${r.pbType}=${r.d.when}`))] });
  }
}
P('');
P(`**${fullyIdentical} of ${recurring.length}** recurring ids are byte-identical across every playbook that declares them on {when, weight, reversibility, emotionalWeight, difmCapable, label}. **${recurring.length - fullyIdentical}** deviate.`);
P('');
P('Per-field deviation rate across recurring ids:');
for (const f of FIELDS) {
  const devs = recurring.filter(([, insts]) => new Set(insts.map((r) => jd(r.d[f]))).size > 1).length;
  P(`- \`${f}\`: ${devs}/${recurring.length} recurring ids disagree (${Math.round(100 * devs / recurring.length)}%)`);
}
P('');
P('Widest `when` spreads on a recurring id:');
const spreads = recurring.map(([id, insts]) => {
  const lead = (w) => { const m = /T-?(\d+)\s*d/i.exec(String(w || '')); return m ? Number(m[1]) : null; };
  const ls = insts.map((r) => lead(r.d.when)).filter((n) => n != null);
  return { id, n: insts.length, min: ls.length ? Math.min(...ls) : null, max: ls.length ? Math.max(...ls) : null };
}).filter((x) => x.min != null && x.max > x.min).sort((a, b) => (b.max - b.min) - (a.max - a.min)).slice(0, 10);
for (const s of spreads) P(`- \`${s.id}\` (${s.n} playbooks): T-${s.min}d … T-${s.max}d — spread ${s.max - s.min} days`);
P('');

// 5. near-duplicate capabilities
P('## 5. Near-duplicate capabilities (different id, same job)');
P('');
const normLabel = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['the', 'a', 'an', 'of', 'or', 'and', 'to', 'for', 'your', 'you', 'is', 'it', 'who', 'what', 'how', 'in', 'on', 'at', 'do', 'we', 'with', 'be', 'are', 'this', 'that', 'will']);
const toks = (s) => new Set(normLabel(s).split(' ').filter((w) => w && !STOP.has(w)));
const jac = (a, b) => { const i = [...a].filter((x) => b.has(x)).length; const u = new Set([...a, ...b]).size; return u ? i / u : 0; };
// canonical instance per id (first seen)
const canon = [...byId.entries()].map(([id, insts]) => ({ id, label: insts[0].d.label, pbs: insts.map((r) => r.pbType), n: insts.length, tk: toks(insts[0].d.label) }));
const near = [];
for (let i = 0; i < canon.length; i++) {
  for (let j = i + 1; j < canon.length; j++) {
    const s = jac(canon[i].tk, canon[j].tk);
    if (s >= 0.6 && canon[i].id !== canon[j].id) near.push({ a: canon[i], b: canon[j], s });
  }
}
near.sort((x, y) => y.s - x.s);
P(`- Distinct-id pairs whose labels overlap ≥0.6 Jaccard on content words: **${near.length}**`);
P('');
P('| id A (n playbooks) | id B (n) | overlap | label A | label B |');
P('|---|---|---:|---|---|');
for (const p of near.slice(0, 25)) P(`| \`${p.a.id}\` (${p.a.n}) | \`${p.b.id}\` (${p.b.n}) | ${p.s.toFixed(2)} | ${p.a.label} | ${p.b.label} |`);
P('');
// id-stem families: same stem, different id
const stem = (id) => id.replace(/^[a-z]+_/, '').replace(/[^a-z]/g, '');
const stemMap = {};
for (const c of canon) (stemMap[stem(c.id)] ||= []).push(c.id);
const stemFam = Object.entries(stemMap).filter(([, v]) => new Set(v).size > 1);
P(`- Distinct ids sharing a stem after stripping a namespace prefix: **${stemFam.length}** — ${stemFam.slice(0, 20).map(([k, v]) => `${k}:{${[...new Set(v)].join('|')}}`).join(', ') || 'none'}`);
P('');

// 6. timingProvenance
P('## 6. Timing provenance');
P('');
let authored = 0, resolverGrounded = 0, ungrounded = 0, noWhen = 0;
const catCount = {};
for (const r of rows) {
  if (r.d.timingProvenance !== undefined) authored++;
  if (!r.d.when) noWhen++;
  const eff = timing.effectiveTimingProvenance(r.d);
  if (eff && timing.isGroundedTiming(eff)) { resolverGrounded++; catCount[eff.category] = (catCount[eff.category] || 0) + 1; }
  else ungrounded++;
}
P(`- Decisions with a **hand-authored** \`timingProvenance\` field: **${authored}** / ${rows.length}`);
P(`- Decisions that resolve to a GROUNDED provenance via \`effectiveTimingProvenance()\` (the runtime path): **${resolverGrounded}** / ${rows.length} (${Math.round(100 * resolverGrounded / rows.length)}%)`);
P(`- Decisions with **no** grounded timing provenance: **${ungrounded}** / ${rows.length} (${Math.round(100 * ungrounded / rows.length)}%)`);
P(`- Decisions with no \`when\` at all: **${noWhen}**`);
P(`- Grounded categories hit: ${Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ') || 'none'}`);
const unusedCats = [];
{
  // which declared categories never fire
  const src = fs.readFileSync(path.join(REPO, 'src/lib/knowledge/timingProvenance.js'), 'utf8');
  for (const m of src.matchAll(/category:\s*'([a-z_]+)'/g)) if (!catCount[m[1]]) unusedCats.push(m[1]);
}
P(`- Declared timing categories that fire on ZERO decisions: ${[...new Set(unusedCats)].join(', ') || 'none'}`);
P('');

// 7. dependsOn graph
P('## 7. `dependsOn` graph');
P('');
let edges = 0, withDeps = 0;
const dangling = [];
const EXTERNAL_DEP_VOCAB = new Set(['headcount', 'count', 'dietary']); // index.js depMet()
for (const { pb } of playbooks) {
  const local = new Set((pb.decisions || []).map((d) => d.id));
  for (const d of (pb.decisions || [])) {
    const deps = Array.isArray(d.dependsOn) ? d.dependsOn : [];
    if (deps.length) withDeps++;
    for (const dep of deps) {
      edges++;
      if (!local.has(dep)) dangling.push({ pb: pb.type, from: d.id, to: dep, externalVocab: EXTERNAL_DEP_VOCAB.has(dep) });
    }
  }
}
P(`- Decisions declaring \`dependsOn\`: **${withDeps}** / ${rows.length} (${Math.round(100 * withDeps / rows.length)}%)`);
P(`- Total \`dependsOn\` edges: **${edges}**`);
const trulyDangling = dangling.filter((x) => !x.externalVocab);
P(`- Edges whose target id does NOT exist in the same playbook: **${dangling.length}**`);
P(`  - …of which the target is in the board's external \`depMet\` vocabulary (\`headcount\`/\`count\`/\`dietary\`, index.js:2387-2392): **${dangling.length - trulyDangling.length}**`);
P(`  - …**genuinely dangling** (no decision, no depMet branch — permanently unmet ⇒ row pinned to \`waiting\` forever): **${trulyDangling.length}**`);
if (trulyDangling.length) {
  P('');
  P('| Playbook | Decision | Unresolvable `dependsOn` target |');
  P('|---|---|---|');
  for (const x of trulyDangling) P(`| ${x.pb} | \`${x.from}\` | \`${x.to}\` |`);
}
P('');
// cycles
const cycles = [];
for (const { pb } of playbooks) {
  const g = new Map();
  for (const d of (pb.decisions || [])) g.set(d.id, (Array.isArray(d.dependsOn) ? d.dependsOn : []).filter((x) => (pb.decisions || []).some((y) => y.id === x)));
  const state = new Map();
  const stack = [];
  const dfs = (n) => {
    state.set(n, 1); stack.push(n);
    for (const m of (g.get(n) || [])) {
      if (state.get(m) === 1) cycles.push(`${pb.type}: ${stack.slice(stack.indexOf(m)).join(' → ')} → ${m}`);
      else if (!state.get(m)) dfs(m);
    }
    stack.pop(); state.set(n, 2);
  };
  for (const n of g.keys()) if (!state.get(n)) dfs(n);
}
P(`- Dependency **cycles** detected (DFS over authored intra-playbook edges): **${cycles.length}** ${cycles.length ? '— ' + cycles.join('; ') : '(graph is a DAG)'}`);
P('');
// timing-order violations
const leadOf = (w) => { const m = /T-?(\d+)\s*d/i.exec(String(w || '')); return m ? Number(m[1]) : null; };
const violations = [];
for (const { pb } of playbooks) {
  const map = new Map((pb.decisions || []).map((d) => [d.id, d]));
  for (const d of (pb.decisions || [])) {
    const cl = leadOf(d.when);
    for (const dep of (Array.isArray(d.dependsOn) ? d.dependsOn : [])) {
      const p = map.get(dep); if (!p) continue;
      const pl = leadOf(p.when);
      if (cl == null || pl == null) continue;
      // child lead must be <= prerequisite lead (child happens LATER, i.e. fewer days out)
      if (cl > pl) violations.push({ pb: pb.type, child: d.id, childWhen: d.when, parent: dep, parentWhen: p.when, gap: cl - pl });
    }
  }
}
P(`- **Timing-order violations** (a decision's \`when\` is EARLIER than a prerequisite it \`dependsOn\`): **${violations.length}** of ${edges - (dangling.length)} resolvable edges`);
if (violations.length) {
  P('');
  P('| Playbook | Child | child `when` | depends on | prereq `when` | child earlier by |');
  P('|---|---|---|---|---|---:|');
  for (const v of violations) P(`| ${v.pb} | \`${v.child}\` | ${v.childWhen} | \`${v.parent}\` | ${v.parentWhen} | ${v.gap}d |`);
}
const ties = [];
for (const { pb } of playbooks) {
  const map = new Map((pb.decisions || []).map((d) => [d.id, d]));
  for (const d of (pb.decisions || [])) {
    for (const dep of (Array.isArray(d.dependsOn) ? d.dependsOn : [])) {
      const p = map.get(dep); if (!p) continue;
      if (leadOf(d.when) != null && leadOf(d.when) === leadOf(p.when)) ties.push(`${pb.type}:${d.id}=${dep}@${d.when}`);
    }
  }
}
P('');
P(`- Edges where child and prerequisite share the SAME \`when\` (simultaneous, so the sequence exists only in the graph, not the calendar): **${ties.length}**`);
P('');

// 8. blocks
P('## 8. `blocks` values');
P('');
const blockVals = [];
let withBlocks = 0, emptyBlocks = 0;
for (const r of rows) {
  if (Array.isArray(r.d.blocks)) {
    if (r.d.blocks.length === 0) emptyBlocks++; else withBlocks++;
    for (const b of r.d.blocks) blockVals.push(b);
  }
}
const blockCount = {};
for (const b of blockVals) blockCount[b] = (blockCount[b] || 0) + 1;
P(`- Decisions declaring a non-empty \`blocks\`: **${withBlocks}** / ${rows.length}`);
P(`- Decisions declaring \`blocks: []\` (present but empty): **${emptyBlocks}**`);
P(`- Total \`blocks\` values: **${blockVals.length}**; distinct tokens: **${Object.keys(blockCount).length}**`);
P('');
// consumer vocabularies (cited)
const ROLE_VOCAB = new Set(['food', 'logistics', 'vendor', 'budget', 'compliance', 'staffing', 'guests', 'timeline']);
const SIT_VOCAB = new Set(['budget', 'logistics', 'vendor', 'food', 'compliance']);
const MENU_RE = /food|menu|drink|beverage|potluck|cater|spread|bar|dish|fish|fillings?|meat|protein|reveal/;
const VENDOR_ROUTE_RE = /vendor|team|hire|staff/;
const resolvable = {}, inert = {};
for (const [tok, n] of Object.entries(blockCount)) {
  const t = String(tok).toLowerCase();
  const hits = [];
  if (ROLE_VOCAB.has(t)) hits.push('BLOCK_ROLE_MAP');
  if (SIT_VOCAB.has(t)) hits.push('situation-scoring');
  if (MENU_RE.test(t)) hits.push('isMenuDecision');
  if (VENDOR_ROUTE_RE.test(t)) hits.push('board vendor-route');
  if (hits.length) resolvable[tok] = { n, hits }; else inert[tok] = n;
}
const resolvableInstances = Object.values(resolvable).reduce((s, x) => s + x.n, 0);
const inertInstances = Object.values(inert).reduce((s, x) => s + x, 0);
P('**Consumer vocabulary** (the only code that reads a `blocks` token — cited):');
P('');
P('| Consumer | file:line | Accepted tokens |');
P('|---|---|---|');
P('| `BLOCK_ROLE_MAP` role relevance | `src/lib/experience/decisionIntelligence.js:10-19` | food, logistics, vendor, budget, compliance, staffing, guests, timeline |');
P('| `ROLES[].decisionBlocks` role filter | `src/lib/experience/experienceContext.js:14,22,30,38,46,54,62` | same 8 tokens (planner = null ⇒ sees all) |');
P('| situation urgency boosts | `src/lib/experience/decisionIntelligence.js:91-96` | budget, logistics, vendor, food, compliance |');
P('| `isMenuDecision` (board route + FoodPlan gate) | `src/lib/playbooks/index.js:2043-2048` | any token matching `/food\\|menu\\|drink\\|beverage\\|potluck\\|cater\\|spread\\|bar\\|dish\\|fish\\|fillings?\\|meat\\|protein\\|reveal/` |');
P('| board vendor deep-link | `src/lib/playbooks/index.js:2488` | any token matching `/vendor\\|team\\|hire\\|staff/` |');
P('');
P(`- **Resolvable** \`blocks\` tokens (matched by ≥1 consumer above): **${Object.keys(resolvable).length}** distinct / **${resolvableInstances}** instances`);
P(`- **Inert** \`blocks\` tokens (matched by NO consumer — authored, stored on the row, read by nothing): **${Object.keys(inert).length}** distinct / **${inertInstances}** instances (${Math.round(100 * inertInstances / blockVals.length)}% of all values)`);
P('');
P('Top resolvable tokens: ' + Object.entries(resolvable).sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([k, v]) => `\`${k}\`(${v.n} via ${v.hits.join('+')})`).join(', '));
P('');
P('Top inert tokens: ' + Object.entries(inert).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `\`${k}\`(${v})`).join(', '));
P('');
// do blocks targets name decision ids?
const blocksNamingDecisionId = blockVals.filter((b) => idSet.has(b)).length;
P(`- \`blocks\` values that are ALSO a decision id somewhere in the corpus: **${blocksNamingDecisionId}** / ${blockVals.length} (${Math.round(100 * blocksNamingDecisionId / blockVals.length)}%) — i.e. \`blocks\` is mostly a free-text CATEGORY tag, not a typed decision reference.`);
{
  let sameFile = 0;
  for (const { pb } of playbooks) {
    const local = new Set((pb.decisions || []).map((d) => d.id));
    for (const d of (pb.decisions || [])) for (const b of (Array.isArray(d.blocks) ? d.blocks : [])) if (local.has(b)) sameFile++;
  }
  P(`- \`blocks\` values naming a decision id **in the same playbook**: **${sameFile}** / ${blockVals.length}`);
}
P('');
// blocks vs dependsOn symmetry
{
  let asym = 0, sym = 0;
  for (const { pb } of playbooks) {
    const map = new Map((pb.decisions || []).map((d) => [d.id, d]));
    for (const d of (pb.decisions || [])) {
      for (const b of (Array.isArray(d.blocks) ? d.blocks : [])) {
        const t = map.get(b); if (!t) continue;
        if ((Array.isArray(t.dependsOn) ? t.dependsOn : []).includes(d.id)) sym++; else asym++;
      }
    }
  }
  P(`- \`blocks\` edges that point at a real sibling decision: **${sym + asym}**; of these the sibling declares the reciprocal \`dependsOn\`: **${sym}**, does NOT: **${asym}** (\`blocks\` and \`dependsOn\` are not kept symmetric).`);
}
P('');

// 9. priority-axis authoring coverage
P('## 9. Priority-axis authoring coverage');
P('');
const cov = (f, pred) => {
  const n = rows.filter((r) => pred(r.d)).length;
  P(`- \`${f}\`: **${n}** / ${rows.length} (${Math.round(100 * n / rows.length)}%)`);
  return n;
};
cov('weight', (d) => d.weight != null);
cov('reversibility', (d) => d.reversibility != null);
cov('emotionalWeight', (d) => d.emotionalWeight != null);
cov('difmCapable', (d) => d.difmCapable != null);
cov('priorityBasis', (d) => d.priorityBasis != null);
cov('priorityBasis.rationale (non-empty)', (d) => !!(d.priorityBasis && String(d.priorityBasis.rationale || '').trim()));
cov('deliversHeartMoment === true', (d) => d.deliversHeartMoment === true);
cov('dependsOn (non-empty)', (d) => Array.isArray(d.dependsOn) && d.dependsOn.length > 0);
cov('blocks (non-empty)', (d) => Array.isArray(d.blocks) && d.blocks.length > 0);
cov('options (non-empty)', (d) => Array.isArray(d.options) && d.options.length > 0);
cov('default', (d) => d.default != null);
cov('why', (d) => d.why != null);
P('');
const wDist = {}, rDist = {}, eDist = {}, dDist = {};
for (const r of rows) {
  wDist[String(r.d.weight)] = (wDist[String(r.d.weight)] || 0) + 1;
  rDist[String(r.d.reversibility)] = (rDist[String(r.d.reversibility)] || 0) + 1;
  eDist[String(r.d.emotionalWeight)] = (eDist[String(r.d.emotionalWeight)] || 0) + 1;
  dDist[String(r.d.difmCapable)] = (dDist[String(r.d.difmCapable)] || 0) + 1;
}
const dist = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' · ');
P(`- \`weight\` values: ${dist(wDist)}`);
P(`- \`reversibility\` values: ${dist(rDist)}`);
P(`- \`emotionalWeight\` values: ${dist(eDist)}`);
P(`- \`difmCapable\` values: ${dist(dDist)}`);
P('');
// derived-importance exercise rate
P(`- Decisions that would fall through to \`derivedImportanceOf()\` (no authored \`weight\`): **${rows.filter((r) => r.d.weight == null).length}**`);
P('');

// 10. all decision fields + runtime readership
P('## 10. Every authored decision field, and whether anything reads it');
P('');
const fieldCount = {};
for (const r of rows) for (const k of Object.keys(r.d)) fieldCount[k] = (fieldCount[k] || 0) + 1;
// grep readership across runtime code (exclude the data dir + tests + docs)
function grepReaders(field) {
  const roots = [path.join(REPO, 'src'), path.join(REPO, 'hostv2/src')];
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '__tests__') continue; walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name)) continue;
      if (p.includes('/playbooks/data/')) continue;
      if (/\.test\.(js|jsx)$/.test(e.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      const re = new RegExp(`[.\\[\\'"\`]${field}\\b`);
      if (re.test(s)) hits.push(path.relative(REPO, p));
    }
  };
  for (const r of roots) if (fs.existsSync(r)) walk(r);
  return hits;
}
P('| Field | Decisions carrying it | Runtime (non-test, non-data) files referencing it | Verdict |');
P('|---|---:|---:|---|');
const unread = [];
for (const [f, n] of Object.entries(fieldCount).sort((a, b) => b[1] - a[1])) {
  const h = grepReaders(f);
  const v = h.length === 0 ? '**NO READER**' : (h.length === 1 ? `1 (${h[0]})` : `${h.length}`);
  if (h.length === 0) unread.push(f);
  P(`| \`${f}\` | ${n} | ${h.length} | ${v} |`);
}
P('');
P(`Fields authored on decisions with **zero** runtime readers: ${unread.length ? unread.map((x) => '`' + x + '`').join(', ') : 'none'}`);
P('');
P('_(Caveat: a name-based grep over-counts — a field name that collides with an unrelated property elsewhere counts as a "reader". Treat a non-zero count as "possibly read", and a ZERO as a hard fact: nothing anywhere names it.)_');
P('');

// 11. per-event overrides / context policies / exception density
P('## 11. Overrides, context gates, and exception density');
P('');
const gates = { whenChoice: 0, standsDownWhen: 0, whenKids: 0, optionNotes: 0, defaultWhy: 0, copyByAnswer: 0, costFactors: 0, costFactorProvenance: 0, affects: 0, culturalContext: 0, militaryContext: 0 };
for (const r of rows) for (const k of Object.keys(gates)) if (r.d[k] !== undefined) gates[k]++;
P('Per-decision conditional/override fields (these are the "exceptions" authored inline rather than as a shared policy):');
P('');
for (const [k, v] of Object.entries(gates).sort((a, b) => b[1] - a[1])) P(`- \`${k}\`: **${v}** decisions`);
P('');
// centralized context policies
const knowledgeDir = path.join(REPO, 'src/lib/knowledge');
const ctxFiles = fs.readdirSync(knowledgeDir).filter((f) => /Context\.js$/.test(f) && !/\.test\./.test(f));
P(`**Reusable (centralized) context policies** in \`src/lib/knowledge/\`: **${ctxFiles.length}** — ${ctxFiles.join(', ')}`);
P('');
// per-event-type exception density
const exceptionRows = [];
for (const { pb } of playbooks) {
  const ds = pb.decisions || [];
  let ex = 0;
  for (const d of ds) for (const k of Object.keys(gates)) if (d[k] !== undefined) ex++;
  exceptionRows.push({ type: pb.type, n: ds.length, ex, per: ds.length ? ex / ds.length : 0 });
}
exceptionRows.sort((a, b) => b.per - a.per);
P('Event types with the highest per-decision exception density (top 10):');
P('');
P('| Event type | decisions | inline exception fields | per decision |');
P('|---|---:|---:|---:|');
for (const r of exceptionRows.slice(0, 10)) P(`| ${r.type} | ${r.n} | ${r.ex} | ${r.per.toFixed(2)} |`);
P('');
P('Event types with ZERO inline exception fields: ' + (exceptionRows.filter((r) => r.ex === 0).map((r) => r.type).join(', ') || 'none'));
P('');

// 12. aliases
P('## 12. Aliases');
P('');
{
  const aliasHits = [];
  const scan = (rel) => {
    const p = path.join(REPO, rel);
    if (!fs.existsSync(p)) return;
    const s = fs.readFileSync(p, 'utf8');
    s.split('\n').forEach((line, i) => {
      if (/alias/i.test(line)) aliasHits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
    });
  };
  scan('src/lib/playbooks/index.js');
  scan('src/lib/playbooks/playbookRegistry.js');
  scan('src/lib/eventTaxonomy.mjs');
  P(`- Lines mentioning "alias" in the playbook resolution path: **${aliasHits.length}**`);
  for (const h of aliasHits.slice(0, 20)) P(`  - ${h}`);
  // the actual type→playbook resolution
  const gp = /export function getPlaybook\(eventType\)[\s\S]*?\n}/.exec(indexSrc);
  P('');
  P('`getPlaybook` (index.js:96) verbatim:');
  P('');
  P('```js');
  P(gp ? gp[0] : '(not matched)');
  P('```');
}
P('');

// 13. unknown-id entry
P('## 13. Can an unknown id enter the system?');
P('');
{
  const hasSchemaValidator = /function\s+validateDecision|assertDecision|DECISION_SCHEMA\s*=/.test(indexSrc);
  P(`- Runtime validator on a decision object inside \`playbooks/index.js\`: ${hasSchemaValidator ? 'present' : '**absent**'}`);
  const contract = fs.readFileSync(path.join(REPO, 'src/lib/playbooks/playbookContract.test.js'), 'utf8');
  P(`- \`playbookContract.test.js\` length: ${contract.split('\n').length} lines; asserts on \`decisions\`: ${/decisions/.test(contract) ? 'yes' : 'no'}`);
  const tests = fs.readdirSync(path.join(REPO, 'src/lib/playbooks/__tests__'));
  P(`- Playbook test files: ${tests.length} — ${tests.join(', ')}`);
}
P('');

// 14. routes — executed against the REAL resolveRoute
P('## 14. Routes and deep links (executed against the real `resolveRoute`)');
P('');
{
  const rrPath = stage(path.join(REPO, 'src/lib/routeResolver.js'), 'routeResolver.mjs');
  const rr = await import(pathToFileURL(rrPath).href);
  const probes = [
    ['board: menu/food-choice decision', "index.js:2486", { eventId: 'e', tab: 'Planning', foodFocus: 'menu' }],
    ['board: dietary decision', 'index.js:2487', { eventId: 'e', tab: 'Planning', focusField: 'fp-diet-e' }],
    ['board: vendor decision (a vendor exists)', 'index.js:2476', { eventId: 'e', tab: 'Vendors', vendorId: 'v1' }],
    ['board: vendor decision (NO vendor yet)', 'index.js:2477', { eventId: 'e', tab: 'Vendors', focusField: 'vendor-add' }],
    ['board: free-form food decision', 'index.js:2491', { eventId: 'e', tab: 'Planning', focusField: 'food-plan' }],
    ['board foundation: lock the date', 'index.js:2329', { eventId: 'e', tab: 'Event Details', focusField: 'event-date' }],
    ['board foundation: venue (locked row)', 'index.js:2335', { eventId: 'e', tab: 'Event Details' }],
    ['board foundation: lock guest count', 'index.js:2365', { eventId: 'e', tab: 'Guests', focusField: 'guests-entry' }],
    ['surfaceRegistry `decisions` raise', 'surfaceRegistry.js:578', { tab: 'Decisions', decisionId: 'venue' }],
    ['eventPlan ladder tier 7.8', 'CommandCenter.jsx:2877', { tab: 'Planning', focusField: 'host-decisions' }],
    ['planHeroCopy settle_overdue / settle_ready', 'planHeroCopy.js:78,90,105', { tab: 'Planning', focusField: 'host-decisions' }],
    ['planHeroCopy shopping', 'planHeroCopy.js:125', { tab: 'Planning', foodFocus: 'p_ice' }],
  ];
  P('| Emitter | file:line | route emitted | `resolveRoute` result | lands row-level? |');
  P('|---|---|---|---|---|');
  for (const [name, loc, route] of probes) {
    const res = rr.resolveRoute(route);
    const rowLevel = res == null ? 'NULL — unroutable' : (res.focus != null || res.anchor != null ? 'yes' : '**no — surface top**');
    P(`| ${name} | \`${loc}\` | \`${JSON.stringify(route)}\` | \`${JSON.stringify(res)}\` | ${rowLevel} |`);
  }
  P('');
  // upper bound on decisions that CANNOT get a route
  const VENDOR_RE = /vendor|team|hire|staff/;
  const HAY_RE = /menu|food|dish|course|drink/;
  const isDietary = (d) => d.id === 'dietary' || /dietary|allerg/i.test(d.label || '');
  let neverRoutable = 0;
  const neverList = [];
  for (const r of rows) {
    const d = r.d;
    const blocks = (Array.isArray(d.blocks) ? d.blocks : []).join(' ').toLowerCase();
    const hay = `${d.id || ''} ${d.label || ''} ${blocks}`.toLowerCase();
    if (isDietary(d)) continue;
    if (VENDOR_RE.test(blocks)) continue;
    if (HAY_RE.test(hay)) continue;
    // remaining possibility: the foodFocus branch, which requires membership in
    // playbookFoodPlan().choices — itself gated by isMenuDecision (MENU_DECISION_RE
    // over the same hay). MENU_DECISION_RE is a superset of HAY_RE on food terms,
    // so re-test it to avoid over-claiming.
    if (MENU_RE.test(hay) && Array.isArray(d.options) && d.options.length) continue;
    neverRoutable++;
    neverList.push(`${r.pbType}:${d.id}`);
  }
  P(`- Authored decisions that can NEVER receive a route under the board's four route branches (index.js:2486-2492) — they render as a chevron-less prompt: **${neverRoutable}** / ${rows.length} (${Math.round(100 * neverRoutable / rows.length)}%)`);
  P('');
  P('  Examples: ' + neverList.slice(0, 25).join(', '));
  P('');
}

P('## Method and limits');
P('');
P('- **Method**: every number above is derived from *evaluated JavaScript objects*, obtained by staging byte-identical `.mjs` copies of `src/lib/playbooks/data/*.js` into a temp dir and `import()`-ing them. Multi-line object literals, nested objects, escaped quotes and trailing commas are parsed by V8, not by a regex — this is the specific failure mode a line-based parser has, and it is structurally excluded here. Verification that staging is faithful: the count of modules with a `type` field equals the file count, and the `ALL_PLAYBOOKS` identifier count in index.js is reported alongside for cross-check.');
P('- `effectiveTimingProvenance` / `isGroundedTiming` are the **real runtime functions**, imported from a staged copy of `src/lib/knowledge/timingProvenance.js` — not reimplemented.');
P('- **Limits**:');
P('  - Only `data/*.js` decisions are counted. Decisions injected at board-build time (`destinationDecisionsFor`, `militaryDecisionsFor`) are event-conditional and are counted separately in the prose report, not here.');
P('  - The `blocks` resolvable/inert split uses the consumer vocabularies cited in §8. If a consumer exists that this audit did not find, an "inert" token could be mis-labelled. The cited consumers were located by grepping every `.js`/`.jsx` under `src/` and `hostv2/src/` for `blocks`.');
P('  - §10 readership is a *name* grep, so it over-counts (a `blocks` property on an unrelated object counts). A **zero** is reliable; a non-zero is only "possibly read".');
P('  - Near-duplicate detection (§5) is lexical (Jaccard over content words). It finds label-level twins; it cannot find two capabilities that do the same job under unrelated wording.');
P('  - The cycle/timing-order checks only traverse edges whose target resolves inside the same playbook; dangling edges are reported separately in §7 and are excluded from those two checks by construction.');

fs.writeFileSync(path.join(REPO, 'docs/current-state-review/2026-07-30/evidence/05_measurements.md'), out.join('\n') + '\n');
fs.rmSync(STAGE, { recursive: true, force: true });
console.log('wrote 05_measurements.md');
console.log('QUICK:', JSON.stringify({
  playbooks: playbooks.length, decisions: rows.length, uniqueIds: idSet.size,
  recurring: recurring.length, edges, dangling: trulyDangling.length, cycles: cycles.length,
  violations: violations.length, blockVals: blockVals.length, inertInstances,
  resolverGrounded, ungrounded,
}, null, 2));
