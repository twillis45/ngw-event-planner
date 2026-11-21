// ─── EXACTLY THREE GRADIENTS, EACH A NAMED TOKEN ─────────────────────────────
//
// Owner ruling 11/20/2026, docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md
// § "Gradients — exactly three, each a named token": the product has three
// gradients — --canvas-glow, --cta-grad, --carbon-panel-grad — and "a gradient
// that is not one of these three tokens is a defect, whatever its angle".
// Consuming a token is legal anywhere; writing a fourth gradient is not.
//
// This reads source only. Every linear-gradient( / radial-gradient( (the
// repeating- forms included) in hostv2/src must sit inside the definition of
// one of the three tokens, or inside a rule named in KNOWN below.
//
// KNOWN is not a licence. It is the list of gradients that existed when this
// test landed (design batch 3, 11/21/2026), each one reported to the owner as
// a doctrine question and left in place rather than silently deleted. Each
// entry pins its COUNT, so a known rule cannot grow another gradient either.
// Remove an entry when the owner rules on it; never add one to make this pass.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../src');
const TOKENS = ['--canvas-glow', '--cta-grad', '--carbon-panel-grad'];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
  return /\.(css|jsx?|mjs)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
});

// Comments out, positions kept. JS strings are kept (CSS-in-JS lives in them),
// and CSS comments inside those strings are removed too.
const blank = (s) => s.replace(/[^\n]/g, ' ');
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank);
const stripJs = (s) => {
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { const e = s.indexOf('\n', i); const end = e < 0 ? s.length : e; out += blank(s.slice(i, end)); i = end; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); const end = e < 0 ? s.length : e + 2; out += blank(s.slice(i, end)); i = end; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; if (c !== '`' && s[j] === '\n') break; j++; }
      out += s.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return stripCssComments(out);
};

// The chain of block preludes enclosing `idx` ("@media … > .sel"), read by
// walking back over balanced braces.
const preludeChain = (text, idx) => {
  const chain = [];
  let depth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth) { depth--; continue; }
      let j = i - 1;
      while (j >= 0 && !'{};`'.includes(text[j])) j--;
      chain.unshift(text.slice(j + 1, i).replace(/\s+/g, ' ').trim());
    }
  }
  return chain.join(' > ');
};

// Which token a gradient defines, if any: a CSS declaration `--x: …` or a
// theme.js `set('--x', …)` that the gradient sits inside.
const definesToken = (text, idx) => {
  const before = text.slice(Math.max(0, idx - 400), idx);
  const css = before.match(/(--[\w-]+)\s*:[^;{}]*$/);
  if (css) return css[1];
  const js = before.match(/set\(\s*['"`](--[\w-]+)['"`]\s*,[^;]*$/);
  return js ? js[1] : null;
};

const GRADIENT = /(?:repeating-)?(?:linear|radial)-gradient\(/g;

const scan = () => {
  const sites = [];
  for (const f of walk(SRC).sort()) {
    const raw = fs.readFileSync(f, 'utf8');
    const text = f.endsWith('.css') ? stripCssComments(raw) : stripJs(raw);
    for (const m of text.matchAll(GRADIENT)) {
      sites.push({
        file: path.relative(SRC, f).split(path.sep).join('/'),
        line: text.slice(0, m.index).split('\n').length,
        token: definesToken(text, m.index),
        rule: preludeChain(text, m.index),
      });
    }
  }
  return sites;
};

// file → rule (the prelude chain, as scan() prints it) → how many gradient
// functions it holds today. Grouped by what the owner is being asked.
const KNOWN = {
  'styles.css': {
    // Alpha MASKS that fade content at an edge. They paint no color of their
    // own, but they are written as gradients, so the doctrine has to say.
    '.app.has-nextbar': 2,
    '.chiprail': 2,
    // The floating dock's glass: a top sheen, and the scrim that fades content
    // beneath it into --bg.
    '.dock::before': 1,
    '.dock::after': 1,
    // The creation reveal (a ceremonial carbon stage, a one-time animation).
    '.reveal-stage': 2,
    '.reveal-stage::after': 2,
    '.rv-mglint': 1,
    '.rv-lightfront': 1,
    '.rv-card::before': 1,
    '.rv-spine-col::before': 1,
    '.rv-shalo': 1,
    '.rv-bloom': 1,
    '.rv-trail': 1,
    '.reveal-stage.rv-settle .rv-namewrap::after': 1,
    '@keyframes rvrow > 0%': 1,
    '@keyframes rvrow > 60%': 1,
    // The welcome screen's splash atmosphere (a glow at the bead's spot, and
    // a vignette).
    '.content.welcome': 1,
    '.content.welcome::after': 2,
    // The invitation's paper, light and dark (the stationery layer the token
    // gate exempts from its color count).
    '.inv2-sheet': 3,
    '.inv2-sheet::before': 2,
    '.inv2-sheet::after': 4,
    '.inv2-dark .inv2-sheet': 3,
    '.inv2-dark .inv2-sheet::before': 2,
    '.inv2-dark .inv2-sheet::after': 2,
    // The boot splash (its own exempt layer in the token gate).
    '.splash': 1,
    '.splash::after': 2,
    '.sp-glow': 1,
    '.sp-dot::before': 1,
    '.sp-dot::after': 1,
    // Momentary attention: the done halo and the spotlight lamp.
    '.eprog.is-done::after': 1,
    '.card.spot::before': 1,
    // The People plate's photo veil and its no-photo plate.
    '.people-plate-veil': 1,
    '@media (min-width:768px) > .people-plate-veil': 1,
    '.people-plate--noimg::before': 2,
  },
  'LodgingCockpit.jsx': {
    // Two edge-fade masks (the shortlist rail, the CTA row) and the scrim over
    // a stay's photo, in the cockpit's own stylesheet.
    '.lc-rail': 2,
    '.lc-ctas': 2,
    '.lc-card-scrim': 1,
  },
};

describe('gradient doctrine: exactly three, each a named token', () => {
  const sites = scan();

  it('finds the three token definitions (premise)', () => {
    const defined = new Set(sites.filter((s) => s.file === 'theme.js').map((s) => s.token));
    expect([...defined].sort()).toEqual([...TOKENS].sort());
  });

  it('no gradient outside the three tokens and the known list', () => {
    const counts = {};
    const strays = [];
    for (const s of sites) {
      if (TOKENS.includes(s.token)) continue;
      const known = KNOWN[s.file] && KNOWN[s.file][s.rule];
      if (known == null) { strays.push(`${s.file}:${s.line} ${s.rule || '(no rule)'}${s.token ? ` (defines ${s.token})` : ''}`); continue; }
      const k = `${s.file} :: ${s.rule}`;
      counts[k] = (counts[k] || 0) + 1;
    }
    expect(strays, 'a gradient that is not one of the three tokens (doctrine 02 § Gradients)').toEqual([]);
    const drift = [];
    for (const [file, rules] of Object.entries(KNOWN)) for (const [rule, n] of Object.entries(rules)) {
      const now = counts[`${file} :: ${rule}`] || 0;
      if (now !== n) drift.push(`${file} :: ${rule}: ${n} -> ${now}`);
    }
    expect(drift, 'a known gradient changed count: update KNOWN only on an owner ruling').toEqual([]);
  });
});
