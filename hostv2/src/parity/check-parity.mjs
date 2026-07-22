#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PARITY DRIFT GATE — the teeth that keep the treadmill from restarting.
//
// Fails (exit 1) if a parity-kit atom's LOCKED value is re-inlined outside
// askKit.jsx. That re-inlining is the exact drift that started all this (the
// budget number wandered 40 vs 44 because the scale was typed by hand in three
// places). Once an atom exists, its magic values live in ONE file; this gate
// enforces it.
//
// Run:  node src/parity/check-parity.mjs   (wire into CI before the vite build)
//
// SCOPE: only INLINE-styled ask surfaces. CSS-class surfaces (day-of .clock /
// .now-label, hero masthead) are already DRY via styles.css and are exempt —
// see parity/MANIFEST.md. Add a rule here whenever a new atom is added to the kit.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const count = (s, re) => (s.match(new RegExp(re, 'g')) || []).length;

const HOST = read('../HostShellV2.jsx');
const KIT = read('./askKit.jsx');
const CSS = read('../styles.css');

const violations = [];

// Each rule: a kit atom's signature that must NOT appear re-inlined in HostShellV2,
// plus the atom to use instead. `mustDefineInKit` guards the atom from silent removal.
const RULES = [
  { sig: "fontSize: 44\\b",       atom: 'BigValue', label: 'the BigValue type scale (fontSize: 44)' },
  { sig: "padding: '13px 16px'",  atom: 'TierRow',  label: "the TierRow padding ('13px 16px')" },
];

for (const r of RULES) {
  const inHost = count(HOST, r.sig);
  if (inHost > 0) violations.push(`HostShellV2.jsx re-inlines ${r.label} ${inHost}× — compose <${r.atom}> from ./parity/askKit instead.`);
  if (count(KIT, r.sig) === 0) violations.push(`askKit.jsx no longer defines ${r.label} — the <${r.atom}> atom lost its lock.`);
}

// The retrofit must be real: the kit has to be imported where the ask surfaces live.
if (count(HOST, "from './parity/askKit'") === 0) {
  violations.push('HostShellV2.jsx does not import ./parity/askKit — ask surfaces are not composing the kit.');
}

// CSS drift gate — SELECTOR-SCOPED (the parity audit 2026-07-19 found the command hero's
// styles.css slipping raw hex + a near-miss tier padding past the JSX-only rules above; the
// conflict-hero `.confrow` was a by-eye parallel of TierRow). Scoped to the specific hero
// selectors, NOT a global value ban — those hexes/pads are legitimately used in other rules.
const CSS_LINES = CSS.split('\n');
const lineFor = (re) => CSS_LINES.find((l) => re.test(l)) || '';
const CSS_RULES = [
  { sel: /\.hero\.elegant \.confrow\{/, bad: /#[0-9a-fA-F]{6}|13px 15px/, label: '.confrow uses a raw hex or 13px-15px pad — it is a TierRow parallel; use var(--card)/13px 16px/var(--r-md)' },
  { sel: /\.hero\.elegant \.confrow:hover\{/, bad: /#[0-9a-fA-F]{6}/, label: '.confrow:hover uses a raw hex — use var(--steel-tint)' },
  { sel: /\.hero\.elegant \.whytog:hover\{/, bad: /#[0-9a-fA-F]{6}/, label: '.whytog:hover uses a raw hex — use var(--steel-tint)' },
  { sel: /\.hero\.elegant \.verdict\{/, bad: /color:\s*#[0-9a-fA-F]{6}/, label: 'the .verdict guide voice uses a raw hex color — use var(--ink-soft)' },
  { sel: /\.app-elegant \.decopt\{/, bad: /#[0-9a-fA-F]{6}|13px 15px/, label: 'the .decopt row uses a raw hex/13px-15px pad — it is a TierRow parallel; use var(--card)/13px 16px/var(--r-md)' },
];
for (const r of CSS_RULES) {
  const line = lineFor(r.sel);
  if (line && r.bad.test(line)) violations.push(`styles.css: ${r.label}.`);
}

if (violations.length) {
  console.error('✗ Parity drift detected:');
  for (const v of violations) console.error('  • ' + v);
  console.error('\nThe parity kit (src/parity/askKit.jsx) is the single source for ask-surface atoms.');
  console.error('CSS-class surfaces (day-of, hero masthead) are exempt — already DRY. See parity/MANIFEST.md.');
  process.exit(1);
}

console.log(`✓ Parity gate passed — ${RULES.length} kit atoms locked + ${CSS_RULES.length} hero CSS selectors token-clean; nothing re-inlined outside askKit.jsx.`);
