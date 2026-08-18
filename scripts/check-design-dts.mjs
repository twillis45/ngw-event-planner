#!/usr/bin/env node
// The hand-written .d.ts must match the primitives' real enum maps.
//
// The source is plain JSX, so index.d.ts is written by hand — and a wrong enum
// there fails in the worst possible way: silently. A consumer writes
// severity="caution", no error fires anywhere, the component falls through to
// its default, and the design looks merely wrong rather than broken.
//
// This caught three on the first pass (2026-08-18): Text.variant, AlertBanner
// .severity, and EscalationBadge.status had all been inferred from
// EscalationContext's LEVELS rather than read from each component's own map.
//
//   node scripts/check-design-dts.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const dts = read('dist-design/index.d.ts');

// Each rule: pull the real keys from the component's own object literal, and
// the declared union from the .d.ts, then compare as sets.
const RULES = [
  { comp: 'Text',            file: 'src/design/primitives/Text.jsx',            map: 'VARIANTS', prop: 'variant',  iface: 'TextProps' },
  { comp: 'AlertBanner',     file: 'src/design/primitives/AlertBanner.jsx',     map: 'SEV',      prop: 'severity', iface: 'AlertBannerProps' },
  { comp: 'EscalationBadge', file: 'src/design/primitives/EscalationBadge.jsx', map: 'STATUS',   prop: 'status',   iface: 'EscalationBadgeProps' },
  { comp: 'Button',          file: 'src/design/primitives/Button.jsx',          map: 'SIZES',    prop: 'size',     iface: 'ButtonProps' },
];

const violations = [];

for (const r of RULES) {
  const src = read(r.file);
  // Handles both the multi-line maps and Button's single-line SIZES.
  const block = src.match(new RegExp(`const ${r.map} = \\{([\\s\\S]*?)\\}\\s*;`));
  if (!block) { violations.push(`${r.comp}: could not find "const ${r.map} = {…}" — the guard cannot verify ${r.prop}.`); continue; }
  // Top-level keys only, tracked by brace depth. A line-anchored regex misses
  // single-line maps (Button's SIZES); an unanchored one picks up the nested
  // keys inside multi-line maps (SEV's bar/label/bg). Depth handles both.
  const real = new Set();
  {
    // Strip comments first. Prose in a `//` line routinely contains a colon
    // ("Measured 5.52:1"), which the extractor below would otherwise read as a
    // key — this guard failed exactly that way when a rationale comment was
    // added inside the STATUS map.
    const body = block[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    let depth = 0, atKey = true, buf = '';
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '{' || ch === '[') { depth++; atKey = false; continue; }
      if (ch === '}' || ch === ']') { depth--; continue; }
      if (depth > 0) continue;
      if (ch === ',') { atKey = true; buf = ''; continue; }
      if (ch === ':') { if (atKey && buf.trim()) real.add(buf.trim().replace(/^['"]|['"]$/g, '')); atKey = false; buf = ''; continue; }
      if (atKey) buf += ch;
    }
  }

  const ifaceBlock = dts.match(new RegExp(`interface ${r.iface} \\{([\\s\\S]*?)\\n\\}`));
  if (!ifaceBlock) { violations.push(`index.d.ts: interface ${r.iface} not found.`); continue; }
  const line = ifaceBlock[1].split('\n').find((l) => new RegExp(`^\\s*${r.prop}\\??:`).test(l));
  if (!line) { violations.push(`${r.iface}: no "${r.prop}" member.`); continue; }
  const declared = new Set([...line.matchAll(/'([^']+)'/g)].map((m) => m[1]));

  const missing = [...real].filter((k) => !declared.has(k));
  const invented = [...declared].filter((k) => !real.has(k));
  if (missing.length) violations.push(`${r.iface}.${r.prop} omits real value(s) ${missing.map((v) => `'${v}'`).join(', ')} — a consumer cannot discover them.`);
  if (invented.length) violations.push(`${r.iface}.${r.prop} declares ${invented.map((v) => `'${v}'`).join(', ')}, which ${r.comp} does not implement — it will silently fall back to its default.`);
}

if (violations.length) {
  console.error('✗ design .d.ts does not match the source enums:');
  for (const v of violations) console.error('  • ' + v);
  console.error('\nindex.d.ts is hand-written in scripts/build-design-lib.mjs. Fix it there, then re-run npm run design:build.');
  process.exit(1);
}
console.log(`✓ design .d.ts matches source — ${RULES.length} enum unions verified against their component maps.`);
