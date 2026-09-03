// ─── THE ROOT package.json IS A RUNTIME DEPENDENCY OF THE SHIPPING APP ──────
//
// A tech-debt pass reported that hostv2 ships five undeclared dependencies and
// recommended declaring them in hostv2/package.json. Declaring them is right —
// but it does NOT make hostv2 standalone, and believing it does is the
// dangerous half.
//
// PROVEN by a clean-room build (2026-09-03): with the root node_modules moved
// aside, `hostv2 npm run build` FAILS on `@sentry/react` imported from
// /demo/src/lib/sentry.js. Node resolves that import from the importing FILE's
// directory upward — /demo/src/lib → /demo/node_modules — and never looks in
// hostv2/node_modules. hostv2 imports 144 modules from the shared src/ tree,
// so every bare package those modules need resolves from the ROOT.
//
// CLAUDE.md schedules the CRA (src/App.js) for deletion post-Sprint-2. The
// hazard is therefore not hostv2's package.json — it is a cleanup that strips
// the root package.json's runtime deps along with the CRA that appeared to be
// their only consumer. The build breaks in the release the CRA was removed in.
//
// This gate enumerates what the shared tree actually imports and asserts the
// root still declares it. It reads the tree rather than naming packages,
// because a hand-written list is how the sixth one survives.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(rootPkg.dependencies || {}),
  ...Object.keys(rootPkg.devDependencies || {}),
]);

// Builtins resolve from Node itself, never from a package.json.
const BUILTINS = new Set(require('module').builtinModules);

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    // Test files are excluded: they do not ship, and their `fs`/`path`
    // imports are Node builtins the bundler never sees.
    else if (/\.(js|jsx)$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

// Bare specifiers only: not relative, not @app, not a node: builtin.
//
// The specifier must be reached through a REAL import statement. A first cut
// matched any `from '…'`, which swept up copy — playbook strings like
// "Price directly sourced from 'x'" arrived as 29 phantom packages and the
// gate failed on prose. So: import/export must open the line, and the pattern
// is anchored per-line rather than run loose over the file.
const bareImports = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const hits = [];
  const RE = /^\s*(?:import|export)\b[^\n]*?\sfrom\s*['"]([^'"]+)['"]|(?:^|[^\w.])import\(\s*['"]([^'"]+)['"]|(?:^|[^\w.])require\(\s*['"]([^'"]+)['"]/gm;
  for (const m of src.matchAll(RE)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith('.') || spec.startsWith('@app/') || spec.startsWith('node:')) continue;
    if (BUILTINS.has(spec)) continue;
    // package name = first segment, or first two for a scope
    const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    hits.push({ pkg, file: path.relative(ROOT, file) });
  }
  return hits;
};

const sharedImports = () => {
  const all = [];
  for (const f of walk(path.join(ROOT, 'src', 'lib'))) all.push(...bareImports(f));
  return all;
};

describe('the shared src/lib tree resolves from the ROOT package.json', () => {
  test('the sweep finds imports at all — the probe is real', () => {
    const found = sharedImports();
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found.map((f) => f.pkg)).size).toBeGreaterThan(2);
  });

  test('every bare package src/lib imports is declared at the ROOT', () => {
    // Not in hostv2/package.json — the root. src/lib resolves from its own
    // directory upward, so hostv2 declaring a package does nothing for it.
    const missing = [...new Set(sharedImports()
      .filter((f) => !declared.has(f.pkg))
      .map((f) => `${f.pkg} (imported by ${f.file})`))];
    expect(missing).toEqual([]);
  });

  test('and the five hostv2 leans on are still there by name', () => {
    // Named explicitly as well as enumerated: these are the ones a CRA cleanup
    // would plausibly remove, because App.js looks like their only consumer.
    for (const p of ['@sentry/react', '@supabase/supabase-js', 'posthog-js', 'papaparse', 'qrcode']) {
      expect(declared.has(p)).toBe(true);
    }
  });

  test('hostv2 declares its OWN direct imports too', () => {
    // Correct but insufficient — it fixes hostv2/src's direct imports only.
    // Kept so the declaration cannot be quietly reverted as redundant.
    const h2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'hostv2', 'package.json'), 'utf8'));
    const d = new Set(Object.keys(h2.dependencies || {}));
    for (const p of ['papaparse', 'qrcode', 'react', 'react-dom']) expect(d.has(p)).toBe(true);
  });

  test('vite dedupes react, so two trees cannot ship two copies', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'hostv2', 'vite.config.js'), 'utf8');
    expect(cfg).toMatch(/dedupe:\s*\[\s*'react',\s*'react-dom'\s*\]/);
  });
});
