// ─── THE TOKEN GATE: A RATCHET ON LITERALS, AND ZERO UNDEFINED TOKENS ────────
//
// Design audit 2 (11/20/2026) measured what the stylesheet's own header denies:
// styles.css says "ZERO color literals in this file" and carried 234 outside its
// ceremonial layers; 1,656 inline visual literals sat in hostv2 JSX; and seven
// tokens (--hair, --crit, --sec, --surface-2, --i, --dx, --dy) were referenced
// with no definition and no fallback, so the property they fed silently fell
// back to its initial value. This reads source files only; it needs no browser.
//
//   (a) color literals (hex / rgb[a] / hsl[a]) per file, outside the token
//       definitions and the layers styles.css itself declares exempt;
//   (b) every var(--x) with no fallback must have a definition somewhere in
//       hostv2/src — zero from day one;
//   (c) inline style literals in JSX (color, background, fontSize, padding*,
//       margin*, borderRadius, boxShadow, opacity) per file.
//
// (a) and (c) are a RATCHET against tokenGate.baseline.json: a count may not
// rise. A count that falls passes, and prints the line to lower in the baseline.
// To rewrite the baseline after a deliberate cleanup:
//   UPDATE_TOKEN_BASELINE=1 npx vitest run test/tokenGate.test.mjs
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../src');
const BASELINE = path.join(HERE, 'tokenGate.baseline.json');

// Token SOURCES: the files whose job is to hold the values. theme.js writes
// every themed custom property from the locked palette.
const TOKEN_SOURCES = new Set(['theme.js']);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p);
  return /\.(css|jsx?|mjs)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
});

const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// Comments out, positions kept (so line numbers still point at the source).
const blank = (s) => s.replace(/[^\n]/g, ' ');
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank);
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
  return out;
};

const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?)\(/g;

// ── (a) CSS: walk rules, count literals in declaration values only ──────────
// Exempt: :root blocks (the token definitions), @media print (the print sheet),
// and rules whose every selector is in the splash (.sp-*, .splash) or invite
// stationery (.inv2*) layer — the ceremonial layers styles.css names exempt.
const EXEMPT_SEL = /(^|[\s>+~,(])\.(sp-|splash|inv2)/;
const cssColorSites = (raw) => {
  const text = stripCss(raw);
  const sites = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') { stack.push(text.slice(start, i).trim()); start = i + 1; }
    else if (ch === '}' || ch === ';') {
      const decl = text.slice(start, i);
      const prelude = stack[stack.length - 1] || '';
      const exempt = stack.some((p) => /^:root\b/.test(p) || /^@media\s+print/.test(p) || /^@keyframes\s+(sp|spl|inv2)/.test(p))
        || (prelude && !prelude.startsWith('@') && prelude.split(',').every((sel) => EXEMPT_SEL.test(' ' + sel.trim())));
      const colon = decl.indexOf(':');
      if (!exempt && colon > 0 && prelude && !prelude.startsWith('@media') && !prelude.startsWith('@supports') && !prelude.startsWith('@container')) {
        const value = decl.slice(colon + 1);
        for (const m of value.matchAll(COLOR)) sites.push(lineOf(text, start + colon + 1 + m.index));
      }
      if (ch === '}') stack.pop();
      start = i + 1;
    }
  }
  return sites;
};

// (a) JS/JSX: literals inside string and template literals.
const jsColorSites = (raw) => {
  const text = stripJs(raw);
  const sites = [];
  const STR = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const m of text.matchAll(STR)) {
    if (m[1] !== '`' && m[2].includes('\n')) continue;
    for (const c of m[2].matchAll(COLOR)) sites.push(lineOf(text, m.index + 1 + c.index));
  }
  return sites;
};

// ── (c) inline style literals in JSX ───────────────────────────────────────
const VISUAL = /^(color|background|backgroundColor|fontSize|padding(Top|Right|Bottom|Left|Inline|Block)?|margin(Top|Right|Bottom|Left|Inline|Block)?|borderRadius|boxShadow|opacity)$/;
const splitTop = (s) => {
  const parts = []; let depth = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === '\\') { cur += s[++i] || ''; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
};
const isLiteral = (v) => {
  const strings = [...v.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
  if (strings.some((s) => !s.includes('var(--') && s.trim() !== '' && s !== 'inherit' && s !== 'transparent' && s !== 'none')) return true;
  const bare = v.replace(/(["'`])((?:\\.|(?!\1).)*)\1/g, ' ');
  return /(^|[^\w.$])(\d*\.\d+|\d+)(?![\w$])/.test(bare);
};
const inlineStyleSites = (raw) => {
  const text = stripJs(raw);
  const sites = [];
  for (const m of text.matchAll(/style=\{\{/g)) {
    let i = m.index + m[0].length, depth = 1, q = null;
    const body0 = i;
    for (; i < text.length && depth; i++) {
      const c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') q = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    const body = text.slice(body0, i - 1);
    let off = 0;
    for (const part of splitTop(body)) {
      const pm = part.match(/^\s*['"]?([\w-]+)['"]?\s*:([\s\S]*)$/);
      if (pm && VISUAL.test(pm[1]) && isLiteral(pm[2])) sites.push(lineOf(text, body0 + off));
      off += part.length + 1;
    }
  }
  return sites;
};

// ── (b) undefined custom properties ────────────────────────────────────────
const definedIn = (text) => [
  ...[...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
  ...[...text.matchAll(/["'`](--[\w-]+)["'`]/g)].map((m) => m[1]),
];
const bareRefs = (text) => [...text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => ({ name: m[1], line: lineOf(text, m.index) }));

const files = walk(SRC).sort();
const scan = () => {
  const counts = {};
  const sites = {};
  const defined = new Set();
  const refs = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const r = rel(f);
    const isCss = f.endsWith('.css');
    const text = isCss ? stripCss(raw) : stripJs(raw);
    definedIn(text).forEach((d) => defined.add(d));
    bareRefs(text).forEach((x) => refs.push({ ...x, file: r }));
    const color = TOKEN_SOURCES.has(path.basename(f)) ? [] : (isCss ? cssColorSites(raw) : jsColorSites(raw));
    const inline = f.endsWith('.jsx') || f.endsWith('.js') ? inlineStyleSites(raw) : [];
    const c = {};
    if (color.length) c.color = color.length;
    if (inline.length) c.inline = inline.length;
    if (Object.keys(c).length) { counts[r] = c; sites[r] = { color, inline }; }
  }
  return { counts, sites, defined, refs };
};

const { counts, sites, defined, refs } = scan();

if (process.env.UPDATE_TOKEN_BASELINE) {
  const totals = Object.values(counts).reduce((t, c) => ({ color: t.color + (c.color || 0), inline: t.inline + (c.inline || 0) }), { color: 0, inline: 0 });
  fs.writeFileSync(BASELINE, JSON.stringify({ totals, files: counts }, null, 2) + '\n');
}
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files;

describe('token gate', () => {
  it('scans the stylesheet and the shell (premise)', () => {
    expect(files.some((f) => f.endsWith('styles.css'))).toBe(true);
    expect(files.some((f) => f.endsWith('HostShellV2.jsx'))).toBe(true);
    expect(defined.has('--ink') && defined.has('--sp-4')).toBe(true);
  });

  it('every var(--x) without a fallback has a definition', () => {
    const missing = refs.filter((x) => !defined.has(x.name)).map((x) => `${x.file}:${x.line} ${x.name}`);
    expect(missing, 'undefined tokens with no fallback').toEqual([]);
  });

  for (const kind of ['color', 'inline']) {
    it(`no file adds ${kind === 'color' ? 'color literals' : 'inline style literals'} (ratchet)`, () => {
      const over = [];
      const stale = [];
      const names = new Set([...Object.keys(counts), ...Object.keys(baseline)]);
      for (const f of names) {
        const now = (counts[f] && counts[f][kind]) || 0;
        const was = (baseline[f] && baseline[f][kind]) || 0;
        if (now > was) over.push(`${f}: ${kind} ${was} -> ${now} (lines ${(sites[f] ? sites[f][kind] : []).join(', ')})`);
        else if (now < was) stale.push(`${f}.${kind}: lower the baseline to ${now} (was ${was})`);
      }
      if (stale.length) process.stderr.write(`[token gate] counts fell — lower test/tokenGate.baseline.json:\n  ${stale.join('\n  ')}\n`);
      expect(over, 'a literal was added: use a token (theme.js / styles.css :root)').toEqual([]);
    });
  }
});
