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
  // kitOnly: `.mega` headings legitimately use 1.08 inline (they are CSS-class
  // surfaces, exempt); the guard here is only that the kit never loses the fix.
  { sig: "lineHeight: 1\\.08",    atom: 'BigValue', kitOnly: true, label: 'the BigValue wrap leading (lineHeight: 1.08 — the hero/voice overlap fix)' },
  { sig: "padding: '13px 16px'",  atom: 'TierRow',  label: "the TierRow padding ('13px 16px')" },
];

for (const r of RULES) {
  const inHost = count(HOST, r.sig);
  if (!r.kitOnly && inHost > 0) violations.push(`HostShellV2.jsx re-inlines ${r.label} ${inHost}× — compose <${r.atom}> from ./parity/askKit instead.`);
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
  // ONE DECISION-OPTION COMPONENT (2026-07-31). This rule used to read
  // `.app-elegant .decopt{` — when that duplicate was folded into the base
  // component the selector stopped existing, and because a miss is a silent skip
  // the gate would have gone on reporting PASS while checking nothing. Pointed at
  // the consolidated rule, and widened below to the variants that were never
  // covered at all: :hover and .pick:hover both carried #2c3138 for months.
  { sel: /^\.decopt\{/, bad: /#[0-9a-fA-F]{6}|13px 15px/, label: 'the .decopt row uses a raw hex/13px-15px pad — it is a TierRow parallel; use var(--card)/13px 16px/var(--r-md)' },
  { sel: /^\.decopt:hover\{/, bad: /#[0-9a-fA-F]{3,6}/, label: '.decopt:hover uses a raw hex — use var(--steel-tint)' },
  { sel: /^\.decopt\.pick:hover\{/, bad: /#[0-9a-fA-F]{3,6}/, label: '.decopt.pick:hover uses a raw hex — use var(--line)' },
  { sel: /^\.decopt-why\{/, bad: /background:\s*#[0-9a-fA-F]{3,6}|border:1px solid #[0-9a-fA-F]{3,6}/, label: '.decopt-why uses a raw hex surface/border — use var(--carbon-panel)/var(--carbon-line)' },
  // The elegant duplicates must not come back: one component, base specificity.
  { sel: /\.app-elegant \.decopt\{/, bad: /./, label: 'the .app-elegant .decopt duplicate is back — the decision option is ONE base component (host ruling 2026-07-31); do not re-fork it per surface' },
  // THE PRIMARY CTA WAS NOT COVERED (2026-07-31). This gate passed for months
  // while `.hero.elegant .cta` forked the atom with `background:#282d33` — a flat
  // grey where every other `.cta` in the app renders `var(--cta-grad)`. The most
  // important button on the surface was the one nobody was checking. Identity
  // (background/color/radius/size) must come from the atom; layout may not.
  { sel: /\.hero\.elegant \.cta\{/, bad: /background:\s*#[0-9a-fA-F]{3,6}|color:\s*#[0-9a-fA-F]{3,6}|border-radius:\s*\d|font-size:\s*\d/,
    label: 'the elegant hero .cta re-declares atom identity as a literal — background/color must be TOKENS not literals (var(--sheen) ground + var(--ink) label since 2026-08-03), radius var(--r-row), size var(--t-cta-big)' },
  // SOFT TIER, pinned (2026-07-31). The hero command wears .cta.soft's treatment.
  // Asserting the exact two tokens means a drift back to the primary gradient — or
  // to any third colour — fails here rather than shipping.
  { sel: /\.hero\.elegant \.cta\{/, bad: /background:\s*var\(--cta-grad\)/,
    label: 'the elegant hero .cta is back on the PRIMARY gradient — the host ruled it wears the soft tier: background:var(--sheen), with a var(--ink) label' },
];
for (const r of CSS_RULES) {
  const line = lineFor(r.sel);
  if (line && r.bad.test(line)) violations.push(`styles.css: ${r.label}.`);
}

// ── NO WHITE SURFACES (host ruling 2026-07-28) ───────────────────────────────
// "app is not supposed to have … white ctas or confirmations [with] white
// backgrounds." The neutral toast was an INVERTED pill (background:var(--ink)
// = #eef0f4) carrying 84 of 86 toast call sites — a white card in a dark-only
// app. Studio Matte has one surface family: carbon on a hairline.
//
// EXEMPT, deliberately: the public invite (.inv2-*, a paper aesthetic by
// design), the print stylesheet (@media print IS paper), and QR code plates
// (a scanner needs a light quiet-zone to read the code at all).
const WHITE_BG = /background(-color)?:\s*(var\(--ink\)|#fff\b|#ffffff\b|white\b)/i;
// Comments are prose ABOUT the rule (including this fix's own rationale), never
// a painted surface — strip them before scanning, or the gate flags its own note.
const CSS_NO_COMMENTS = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
let printDepth = 0;          // brace depth inside an @media print block
for (const line of CSS_NO_COMMENTS.split('\n')) {
  if (/@media\s+print/.test(line)) printDepth = 1;
  else if (printDepth > 0) {
    printDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (printDepth <= 0) printDepth = 0;
  }
  if (printDepth > 0) continue;                 // print IS paper
  if (/^\s*\.inv2-/.test(line)) continue;        // the public invite is a paper aesthetic
  if (WHITE_BG.test(line)) {
    violations.push(`styles.css: a runtime surface paints a WHITE background ("${line.trim().slice(0, 72)}") — dark-only app; use var(--card) on var(--line-soft), or var(--ok) for a confirmation.`);
  }
}
// The JSX side: an inline white plate is only legitimate behind a QR code (a
// scanner needs the light quiet-zone), so the surrounding block must say so.
const HOST_LINES = HOST.split('\n');
HOST_LINES.forEach((line, i) => {
  if (!/background:\s*'(#fff(fff)?|white)'/i.test(line)) return;
  const near = HOST_LINES.slice(Math.max(0, i - 4), i + 5).join(' ');
  if (/\bqr\b/i.test(near)) return;
  violations.push(`HostShellV2.jsx:${i + 1} inline white plate outside a QR surface ("${line.trim().slice(0, 64)}").`);
});

// ── ONE MEANING PER STATUS COLOUR (amber audit 2026-07-28) ───────────────────
// UX_02's semantic map gives amber exactly one job: ATTENTION. The seating map
// broke that by painting the honoree marker in var(--warn) — the same token as
// the caution marker, on a puck that can carry both classes at once, so one
// colour said "a problem sits here" and "the guest of honour sits here". These
// selectors are IDENTIFICATION and may never wear a status token.
const ID_SELECTORS = [
  { sel: /^\.tp-star\{/, name: '.tp-star (honoree glyph)' },
  { sel: /^\.tpuck\.honoree\{/, name: '.tpuck.honoree (honoree table ring)' },
];
const STATUS_TOKEN = /var\(--(warn|danger|ok)\b/;
for (const r of ID_SELECTORS) {
  const line = CSS_LINES.find((l) => r.sel.test(l.trim()));
  if (!line) { violations.push(`styles.css: ${r.name} disappeared — the amber-audit identification rule lost its subject.`); continue; }
  if (STATUS_TOKEN.test(line)) {
    violations.push(`styles.css: ${r.name} wears a STATUS colour — identification may not borrow amber/red/green (UX_02 semantic map). Use var(--steel-soft).`);
  }
}

// ── EVERY MOTION TOKEN READ MUST EXIST (D1, Figma/code reconciliation 2026-08-18) ──
// theme.js read five durations — micro/fast/base/enter/reveal — that
// motion.duration never defined. Each fell through to its `|| <literal>`
// fallback, so the literals WERE the values while the comment above them
// claimed "Same numbers, one source now." There was no source, and nothing
// errored: a missing token and a present one are indistinguishable at runtime
// once a fallback absorbs the difference. That is the whole failure mode —
// silence, not breakage. A fallback is a safety net, never a source.
const THEME = read('../theme.js');
const TOKENS = read('../../../src/design/tokens.js');

const definedIn = (block) => {
  const m = TOKENS.match(new RegExp(`${block}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`));
  return m ? new Set([...m[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map((x) => x[1])) : null;
};
const readsOf = (ns) =>
  [...new Set([...THEME.matchAll(new RegExp(`\\b${ns}\\.([A-Za-z][A-Za-z0-9]*)`, 'g'))].map((x) => x[1]))];

for (const [ns, block] of [['durations', 'duration'], ['easings', 'ease']]) {
  const defined = definedIn(block);
  if (!defined) {
    violations.push(`tokens.js: motion.${block} block not found — the ${ns} guard cannot verify anything.`);
    continue;
  }
  const missing = readsOf(ns).filter((k) => !defined.has(k));
  for (const k of missing) {
    violations.push(`theme.js reads ${ns}.${k}, which motion.${block} does not define — it silently falls back to an inline literal, so the literal is the real value.`);
  }
}

if (violations.length) {
  console.error('✗ Parity drift detected:');
  for (const v of violations) console.error('  • ' + v);
  console.error('\nThe parity kit (src/parity/askKit.jsx) is the single source for ask-surface atoms.');
  console.error('CSS-class surfaces (day-of, hero masthead) are exempt — already DRY. See parity/MANIFEST.md.');
  process.exit(1);
}

console.log(`✓ Parity gate passed — ${RULES.length} kit atoms locked + ${CSS_RULES.length} hero CSS selectors token-clean; nothing re-inlined outside askKit.jsx.`);
