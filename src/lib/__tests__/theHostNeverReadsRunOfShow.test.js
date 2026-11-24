// ─── THE HOST NEVER READS "RUN OF SHOW" (owner, 11/24/2026) ───────────────────
//
// Owner, verbatim: "Host doesn't use run of show language." It is a
// production word (a stage manager's), and it was on the host's board, her
// The Day stage, her checklist steps, the sample plans and What's new.
//
// UX_11 rule 4, swept at the SOURCE: every string literal, template piece and
// JSX text in the modules that can reach the host's screen (hostv2/src,
// src/lib, src/data, whatsNew.json) is read with the real parser. Comments,
// identifiers, ids and test names are not text a host sees, so they are not
// read. The words come from src/lib/hostWords.json (entries marked
// `source: true`); the visible-text sweep (hostv2/e2e/hostWordsOnEveryStage)
// reads the same file.
//
// The replacement is ONE word, in src/lib/scheduleWords.js, so a later change
// of wording is one line.
//
// Left out, each for a stated reason:
//   VENDOR — text a vendor reads is a vendor's word (the owner rules on it
//     separately). NOT_SHIPPED — not in the hostv2 bundle (the frozen CRA
//     planner, an offline solver, an AI tool description a model reads).
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import HOST_WORDS from '../hostWords.json';
import { SCHEDULE, THE_SCHEDULE } from '../scheduleWords';

const ROOT = path.resolve(__dirname, '../../..');
const ROOTS = ['hostv2/src', 'src/lib', 'src/data'];

const VENDOR = new Set([
  'src/lib/vendorBrief.js', 'src/lib/vendorCopilot.js', 'src/lib/vendorQuestions.js',
  'src/lib/vendorAccountability/followUpDrafts.js', 'hostv2/src/VendorBriefV2.jsx',
]);
const NOT_SHIPPED = new Set([
  'src/lib/presentationLabels.js', 'src/lib/shellTabs.js', 'src/lib/playbooks/playbookRegistry.js', // the frozen CRA planner's tabs
  'src/lib/eventSolve.mjs', // offline solver, not imported by hostv2
  'src/lib/orchestratorTools.js', // a tool description the model reads, never rendered
  'src/lib/hostWords.json', // the banned list itself
]);

const RULES = HOST_WORDS.banned.filter((b) => b.source).map((b) => ({
  word: b.word,
  re: new RegExp(b.sourceRe || b.re, b.sourceFlags != null ? b.sourceFlags : (b.flags == null ? 'i' : b.flags)),
}));

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${f}`;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) {
      if (!/^(__tests__|__qa__|node_modules)$/.test(f)) walk(rel);
    } else if (!/\.(test|spec)\./.test(f) && /\.(m?js|jsx|json)$/.test(f)) files.push(rel);
  }
};
ROOTS.forEach(walk);
// The app modules outside src/lib that hostv2 imports (`@app/…`).
files.push('src/CommandCenter.jsx', 'src/components/SignInCheck.jsx', 'src/design/motion.js', 'src/design/tokens.js', 'src/theme/palette.js');

// Every piece of text the module can render, with its line.
const textsOf = (rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const out = [];
  if (rel.endsWith('.json')) {
    JSON.parse(src, (k, v) => { if (typeof v === 'string') out.push({ line: 0, v }); return v; });
    return out;
  }
  const ast = parse(src, { sourceType: 'unambiguous', plugins: ['jsx'], errorRecovery: true });
  const visit = (n) => {
    if (!n || typeof n.type !== 'string') return;
    const v = n.type === 'StringLiteral' || n.type === 'JSXText' ? n.value
      : n.type === 'TemplateElement' ? n.value.cooked : null;
    if (v != null) out.push({ line: n.loc ? n.loc.start.line : 0, v });
    for (const k of Object.keys(n)) {
      if (k === 'loc' || /Comments$/.test(k)) continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c === 'object') visit(c);
    }
  };
  visit(ast.program);
  return out;
};

test('premise: the sweep reads the host’s modules', () => {
  expect(files).toContain('hostv2/src/HostShellV2.jsx');
  expect(files).toContain('hostv2/src/whatsNew.json');
  for (const f of files) expect(fs.existsSync(path.join(ROOT, f))).toBe(true);
  expect(files.filter((f) => f.startsWith('src/lib/playbooks/data/')).length).toBeGreaterThan(30);
  expect(RULES.map((r) => r.word)).toEqual(expect.arrayContaining(['run of show', 'RoS']));
});

test('no text a host can see says "run of show"', () => {
  const found = [];
  for (const rel of files) {
    if (VENDOR.has(rel) || NOT_SHIPPED.has(rel)) continue;
    for (const { line, v } of textsOf(rel)) {
      const hit = RULES.find((r) => r.re.test(v));
      if (hit) found.push(`${rel}:${line} · ${hit.word}: ${v.replace(/\s+/g, ' ').trim().slice(0, 100)}`);
    }
  }
  expect(found).toEqual([]);
});

test('the replacement is one word, said one way', () => {
  expect(THE_SCHEDULE.toLowerCase()).toContain(SCHEDULE.toLowerCase());
  for (const r of RULES) { expect(r.re.test(SCHEDULE)).toBe(false); expect(r.re.test(THE_SCHEDULE)).toBe(false); }
});
