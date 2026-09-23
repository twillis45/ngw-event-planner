// ─── DOES THIS ENGINE REACH THE APP PEOPLE USE? ──────────────────────────────
//
// Three times in one day a change was proved correct by a green unit test and
// reached no host. The last one was the clearest: the air-travel invite floor
// was built into `playbookMilestones`, which has exactly one consumer,
// `playbookAreaNextStep`, which has exactly one consumer, `src/App.js` — the
// A1-FROZEN CRA donor, scheduled for deletion. hostv2 never mentions
// milestones. The tests asserted 88 days; the shipping shell said 18.
//
// Nothing failed. Nothing could: every guard in the repo tests ENGINES, and the
// engine was right.
//
// So this file asks the question those guards cannot: for each exported symbol,
// is there any import path from the shipping entry point to it? It reads the
// real import graph rather than guessing from names.
//
// ── FOUR SURFACES, AND THE ONE THIS FILE FIRST GOT WRONG ────────────────────
//   hostv2   — THE APP. public, shipping, `hostv2/src/main.jsx`.
//   admin    — the internal console at ?admin=1. Legitimate, not dead.
//   planner  — six components under `src/plan/`, hosted inside the CRA today:
//              checklist generator, client intake, comms hub, decision approval,
//              timeline builder, vendor planning workspace.
//   frozen   — `src/App.js`, donor-only since the A1 freeze, deletion scheduled
//              post-Sprint-2.
//
// THE CORRECTION THAT MATTERS. This file originally counted 216 exports as
// reaching "only the frozen donor" and called them work with nowhere to land.
// Host ruling, 2026-09-23: "there are parts of the code that will be used when
// we develop beyond the host shell. we will do the professional shells after the
// host for event planners, coordinators, etc."
//
// So that number was measuring something real and reading it backwards. With the
// planner surface counted as its own entry, 57 of the 216 are already wired to
// components that exist. The rest are not debt either — they are the foundation
// of a product that has not been built yet, and a ratchet pushing that number
// down would have ratcheted against the roadmap.
//
// WHAT THE REAL RISK IS, once that is straight: not that the planner code is
// dead, but that deleting the CRA takes its only importer with it, and the next
// "remove unused exports" pass reads a roadmap item as debt. That is what the
// protection test below stands for.
//
// ── TWO WAYS THIS INSTRUMENT WAS WRONG BEFORE IT WAS RIGHT ──────────────────
// Both were caught by printing an intermediate count instead of trusting the
// verdict, and both are guarded below by the (premise) tests:
//   · the CRA entry was `src/App.js` rather than `src/index.js`, and the admin
//     console was not an entry at all, so legitimate internal engines read as
//     dead;
//   · only STATIC imports were parsed, and `hostv2/src/main.jsx` code-splits its
//     shells with `import('./HostShellV2.jsx')` — so the graph reached 8 modules
//     and reported that almost the whole library was unused.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const HOSTV2_ENTRY = ['hostv2/src/main.jsx'];
const ADMIN_ENTRY = ['src/admin/AdminConsole.jsx'];
const CRA_ENTRY = ['src/index.js'];
// ── THE FOURTH SURFACE, AND THE RULING THAT CORRECTED THIS FILE ─────────────
// Host ruling, 2026-09-23: "there are parts of the code that will be used when
// we develop beyond the host shell. we will do the professional shells after the
// host for event planners, coordinators, etc."
//
// This file first counted 216 exports as reaching "only the frozen donor" and
// called them work with nowhere to land. That was wrong, and wrong in a way that
// mattered: it would have ratcheted AGAINST the roadmap, treating the planner
// product's foundations as debt to be paid down.
//
// The professional surface is not hypothetical — six components already exist
// under src/plan/, hosted inside the CRA today. Counted as their own entry, 57
// of those 216 are already wired to them.
const PLAN_ENTRY = [
  'src/plan/ChecklistGenerator.jsx', 'src/plan/ClientIntakeFlow.jsx',
  'src/plan/CommunicationHub.jsx', 'src/plan/DecisionApprovalCenter.jsx',
  'src/plan/TimelineBuilder.jsx', 'src/plan/VendorPlanningWorkspace.jsx',
];

const files = new Map();
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|build|__tests__|\.git/.test(p)) walk(p); continue; }
    if (!/\.(js|jsx|mjs)$/.test(e.name)) continue;
    if (/\.test\.|\.spec\./.test(e.name)) continue;
    files.set(path.relative(ROOT, p), fs.readFileSync(p, 'utf8'));
  }
};
walk(path.join(ROOT, 'src'));
walk(path.join(ROOT, 'hostv2/src'));

const CANDIDATES = (base) => [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`,
  path.join(base, 'index.js'), path.join(base, 'index.jsx'), path.join(base, 'index.mjs')];
const resolveSpec = (fromRel, spec) => {
  let base;
  if (spec.startsWith('@app/')) base = path.join('src', spec.slice('@app/'.length));
  else if (spec.startsWith('.')) base = path.normalize(path.join(path.dirname(fromRel), spec));
  else return null;
  for (const c of CANDIDATES(base)) if (files.has(c)) return c;
  return null;
};

const importsOf = new Map();
for (const [rel, src] of files) {
  const m = new Map();
  const add = (t, names) => {
    if (!t) return;
    if (!m.has(t)) m.set(t, new Set());
    for (const n of names) m.get(t).add(n);
  };
  for (const im of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const clause = im[1]; const target = resolveSpec(rel, im[2]);
    if (!target) continue;
    if (/^\*\s+as\s/.test(clause.trim())) { add(target, ['*']); continue; }
    const braces = /\{([\s\S]*?)\}/.exec(clause);
    if (braces) add(target, braces[1].split(',').map((x) => x.split(/\s+as\s+/)[0].trim()).filter(Boolean));
    const def = clause.replace(/\{[\s\S]*?\}/, '').replace(/,/g, '').trim();
    if (def && !def.startsWith('*')) add(target, ['default']);
  }
  // Dynamic imports count — this is how the shipping shell is loaded at all.
  for (const dy of src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) add(resolveSpec(rel, dy[1]), ['*']);
  for (const ex of src.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) add(resolveSpec(rel, ex[1]), ['*']);
  for (const ex of src.matchAll(/export\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    add(resolveSpec(rel, ex[2]), ex[1].split(',').map((x) => x.split(/\s+as\s+/)[0].trim()).filter(Boolean));
  }
  importsOf.set(rel, m);
}

const reachableFrom = (entries) => {
  const seen = new Set(); const stack = entries.filter((e) => files.has(e));
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const t of (importsOf.get(cur) || new Map()).keys()) if (!seen.has(t)) stack.push(t);
  }
  return seen;
};
const HOST_REACH = reachableFrom(HOSTV2_ENTRY);
const ADMIN_REACH = reachableFrom(ADMIN_ENTRY);
const CRA_REACH = reachableFrom(CRA_ENTRY);
const PLAN_REACH = reachableFrom(PLAN_ENTRY);

const exportsIn = (rel) => {
  const src = files.get(rel) || '';
  const out = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^export\s+const\s+([A-Za-z0-9_$]+)/gm)) out.add(m[1]);
  return [...out];
};

const classify = (rel, name) => {
  const importers = [];
  for (const [f, targets] of importsOf) {
    const names = targets.get(rel);
    if (!names) continue;
    if (names.has(name) || names.has('*')) importers.push(f);
  }
  const external = importers.filter((f) => f !== rel);
  return {
    importers: external,
    inHost: external.some((f) => HOST_REACH.has(f)),
    inAdmin: external.some((f) => ADMIN_REACH.has(f)),
    inCra: external.some((f) => CRA_REACH.has(f)),
    inPlan: external.some((f) => PLAN_REACH.has(f)),
  };
};

const allLibRows = () => {
  const rows = [];
  for (const rel of files.keys()) {
    if (!rel.startsWith('src/lib/')) continue;
    for (const name of exportsIn(rel)) rows.push({ rel, name, ...classify(rel, name) });
  }
  return rows;
};

// ── A CALL GRAPH, BECAUSE AN IMPORT LIST IS NOT ONE ─────────────────────────
// An export hostv2 never imports can still do work the host sees, through an
// internal caller that IS imported — `choiceShown` is called by
// `playbookChecklist`, which hostv2 draws. Judging by imports alone condemns
// every internal helper and buries the real finding in noise.
//
// So: split each module into its top-level exported bodies, record which other
// exported names each body mentions, and propagate reachability from the
// symbols host-reachable modules actually import. That is the trace a person
// does by hand, and it is what separates a helper from a dead end.
const bodiesOf = (rel) => {
  const src = files.get(rel) || '';
  const marks = [];
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) marks.push({ name: m[1], at: m.index });
  for (const m of src.matchAll(/^export\s+const\s+([A-Za-z0-9_$]+)/gm)) marks.push({ name: m[1], at: m.index });
  marks.sort((a, b) => a.at - b.at);
  const out = new Map();
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].at : src.length;
    // COMMENTS ARE NOT CALLS. A body slice runs to the NEXT export, so the
    // comment block introducing that next function sits inside this one — and
    // these comments name other functions constantly ("the same predicate the
    // next-step engine uses"). Left in, a mention in prose marks dead code as
    // reachable, which is the one failure mode that makes this whole file lie.
    const body = src.slice(marks[i].at, end)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/\s\/\/[^\n]*$/gm, ' ');
    out.set(marks[i].name, body);
  }
  return out;
};

const LIB_MODULES = [...files.keys()].filter((r) => r.startsWith('src/lib/'));
const BODIES = new Map(LIB_MODULES.map((r) => [r, bodiesOf(r)]));

// key: "rel::name"
const key = (rel, name) => `${rel}::${name}`;
const hostReachableSymbols = () => {
  const seen = new Set();
  const stack = [];
  // Seed: every lib symbol a HOST-REACHABLE module imports by name.
  for (const [f, targets] of importsOf) {
    if (!HOST_REACH.has(f)) continue;
    for (const [target, names] of targets) {
      if (!target.startsWith('src/lib/')) continue;
      const exps = exportsIn(target);
      for (const n of (names.has('*') ? exps : [...names])) {
        if (exps.includes(n)) stack.push(key(target, n));
      }
    }
  }
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    const [rel, name] = cur.split('::');
    const body = (BODIES.get(rel) || new Map()).get(name);
    if (!body) continue;
    // same-module callees
    for (const other of (BODIES.get(rel) || new Map()).keys()) {
      if (other !== name && new RegExp(`\\b${other}\\b`).test(body)) {
        const k = key(rel, other);
        if (!seen.has(k)) stack.push(k);
      }
    }
    // cross-module callees, through this module's own imports
    for (const [target, names] of (importsOf.get(rel) || new Map())) {
      if (!target.startsWith('src/lib/')) continue;
      const exps = exportsIn(target);
      for (const n of (names.has('*') ? exps : [...names])) {
        if (!exps.includes(n)) continue;
        if (!new RegExp(`\\b${n}\\b`).test(body)) continue;
        const k = key(target, n);
        if (!seen.has(k)) stack.push(k);
      }
    }
  }
  return seen;
};
const HOST_SYMBOLS = hostReachableSymbols();

// ── THE HOST ENGINE, AND WHAT IS ALLOWED NOT TO REACH THE HOST ──────────────
// `playbooks/index.js` is hostv2's own engine. An export of it that no path from
// the app can reach is a defect by default — that is exactly how the invite
// floor came to be measured in a shell nobody uses.
//
// Each exception is NAMED with the surface it genuinely serves, so this is a set
// of decisions rather than a number someone raised to go green.
const PLAYBOOK_EXPORTS_NOT_IN_HOSTV2 = {
  // ── Serves the CRA / planner surfaces, not the host app ──────────────────
  playbookAreaNextStep: 'CRA "What needs you" area cards. Its milestone chain was found host-unreachable on 2026-09-23; the air-travel floor now reaches hostv2 through playbookChecklist instead, so the host-facing part no longer depends on this.',
  playbookAbout: 'CRA event-type blurb. hostv2 introduces an event through its own copy.',
  playbookSetupPreview: 'CRA setup preview card; hostv2 draws setup from the day sheet.',
  playbookBudgetCategories: 'The PLANNER surface (src/plan/ClientIntakeFlow), not the host app.',

  // ── Reaches nothing at all. Recorded, not deleted: each is a decision for
  // the owner, and a wrong deletion is harder to undo than a wrong entry here.
  BORROWED_TYPES: 'No consumer anywhere. The borrowed-playbook type list; hostv2 resolves borrowing through getPlaybook.',
  DIET_KEYWORD_KEYS: 'No consumer anywhere. Diet vocabulary moved to lib/dietRows.js, which owns it now.',
  DIET_TAGS_WITHOUT_KEYWORDS: 'No consumer anywhere. Same move as DIET_KEYWORD_KEYS.',
  decisionProposal: 'No consumer anywhere. proposedPickFor carries the live proposal path.',
  destinationDecisionsFor: 'No consumer anywhere — its only two mentions in the repo are comments in cookLever.js and smartParseEvent.js describing it.',
  hostUsesCaterer: 'No consumer anywhere. foodApproach().usesCaterer is the live predicate, and the duplication is the reason this one went unused.',
  playbookPacing: 'No consumer anywhere.',
};

describe('an engine that reaches no host is not a working engine', () => {
  test('(premise) the import graph actually resolved — not 8 modules and a wrong verdict', () => {
    // The instrument failed exactly this way before dynamic imports were parsed.
    // A tiny graph makes every symbol look dead and the whole file a liar.
    expect(files.size).toBeGreaterThan(300);
    expect(HOST_REACH.size).toBeGreaterThan(200);
    expect(CRA_REACH.size).toBeGreaterThan(200);
    expect(ADMIN_REACH.size).toBeGreaterThan(50);
  });

  test('(premise) the shipping entry really does reach the shell and its engine', () => {
    // Names the path rather than trusting a count: if main.jsx stops loading
    // HostShellV2, or the shell stops importing the playbook engine, the whole
    // analysis below is measuring something else.
    expect(HOST_REACH.has('hostv2/src/HostShellV2.jsx')).toBe(true);
    expect(HOST_REACH.has('src/lib/playbooks/index.js')).toBe(true);
    expect(CRA_REACH.has('src/App.js')).toBe(true);
  });

  test('(premise) the call graph reaches deeper than the import list', () => {
    // An internal helper the host never imports but its engine calls. If this
    // ever reads false, the graph collapsed to direct imports and the rule below
    // is measuring the wrong thing.
    expect(HOST_SYMBOLS.has('src/lib/playbooks/index.js::choiceShown')).toBe(true);
    expect(HOST_SYMBOLS.size).toBeGreaterThan(400);
  });

  test('THE RULE: every playbook-engine export is REACHABLE from the app, or is a named exception', () => {
    const unreachable = exportsIn('src/lib/playbooks/index.js')
      .filter((n) => !HOST_SYMBOLS.has(key('src/lib/playbooks/index.js', n)))
      .sort();
    const allowed = Object.keys(PLAYBOOK_EXPORTS_NOT_IN_HOSTV2).sort();
    // Named, not counted. A new engine built into the host's own playbook module
    // that no path from the app can reach is the defect this file exists for,
    // and the failure has to say which one.
    expect(unreachable).toEqual(allowed);
  });

  test('THE CENSUS: every library export is accounted to a surface', () => {
    // Recorded rather than ratcheted, because the ratchet was the wrong shape.
    // Measured 2026-09-23 with the planner surface counted separately:
    //   637  reach hostv2 — the app
    //   339  reach the admin console
    //    57  reach the planner components under src/plan/
    //   159  reach only src/App.js
    //    11  reach no entry at all
    //
    // The bounds below are loose on purpose. This is a census, not a budget —
    // its job is to stay HONEST as the surfaces move, and to fail loudly if the
    // graph collapses and starts reporting everything as dead.
    const rows = allLibRows();
    const inHost = rows.filter((r) => r.inHost);
    const inPlan = rows.filter((r) => r.inPlan && !r.inHost);
    const craOnly = rows.filter((r) => r.importers.length > 0 && !r.inHost && !r.inAdmin && !r.inPlan && r.inCra);
    expect(inHost.length).toBeGreaterThan(400);
    expect(inPlan.length).toBeGreaterThan(20);
    expect(craOnly.length).toBeLessThan(400);
  });

  test('THE THING TO PROTECT: planner-surface engines must OUTLIVE the CRA shell', () => {
    // CLAUDE.md schedules `src/App.js` for deletion post-Sprint-2. The planner
    // components under src/plan/ are hosted inside it today and are the
    // foundation of the professional shell that comes after the host shell.
    //
    // THE RISK IS NOT THAT THIS CODE IS DEAD. It is that deleting the CRA takes
    // its only importer with it, and the next "remove unused exports" pass reads
    // a roadmap item as debt. This test is the standing note that it is not:
    // when App.js goes, these components need a new host, not a delete.
    //
    // Asserted as a live fact rather than a comment — if src/plan/ is emptied or
    // moved, this fails and someone has to say where it went.
    for (const entry of PLAN_ENTRY) expect(files.has(entry)).toBe(true);
    const planEngines = allLibRows().filter((r) => r.inPlan && !r.inHost);
    expect(planEngines.length).toBeGreaterThan(20);
    // A sample of the domain, named so the claim is legible: these are vendor,
    // billing and client-intake engines — planner work, not host work.
    const modules = new Set(planEngines.map((r) => r.rel));
    expect([...modules].some((m) => /vendor/i.test(m))).toBe(true);
  });

  test('NEGATIVE CONTROL: the engines this session wired DO reach the host', () => {
    // The fixes, asserted through the graph rather than through their own tests.
    for (const name of ['playbookChecklist', 'playbookRunOfShow', 'playbookFoodPlan', 'playbookMilestones']) {
      expect(HOST_SYMBOLS.has(key('src/lib/playbooks/index.js', name))).toBe(true);
    }
    // playbookMilestones is in that list ON PURPOSE. Until this session it was
    // reachable only through playbookAreaNextStep -> src/App.js. It is reachable
    // now because playbookChecklist calls it to inherit the air-travel floor —
    // which is the fix, stated as a property of the graph rather than of a test.
    expect(HOST_SYMBOLS.has(key('src/lib/brand.js', 'BRAND'))).toBe(true);
    expect(HOST_SYMBOLS.has(key('src/lib/sectionDirectory.js', 'ASK_LABEL'))).toBe(true);
  });
});
