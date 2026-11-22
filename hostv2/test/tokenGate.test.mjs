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
//
// Baseline history:
//   11/20/2026  368 color, 888 inline (design audit 2, first measurement).
//   11/21/2026  366 color, 886 inline (design audit batch 3, item 1). Every
//               counted literal was compared with every token's resolved value
//               in BOTH themes; only two matched exactly (ErrorBoundary.jsx's
//               #eef0f4, now --carbon-ink and --on-steel). Most tokens move with
//               the theme while a literal does not, so nothing else qualified.
//   11/21/2026  268 color, 884 inline (design batch 3b, item 1). The file
//               counts summed to 361, not the 366 the totals line said. Named
//               at exact values in theme.js: a shadow scale, white hairlines,
//               the key edge, the fixed carbon stage and its two quiet inks,
//               the reveal bead and its shadows, text on a photo, and the
//               mask stop. Zero pixels moved.
//   11/21/2026  265 color, 883 inline (design batch 3b, item 2). #4E6877, two
//               units from --steel (#4c6675) in every channel and theme, now
//               reads --steel: the lit reveal bead (twice) and the error
//               screen's button. Its label goes 5.16 -> 5.31:1.
//   11/21/2026  281 color, 883 inline (design batch 3c, item 20). A scanner
//               fix, not a loosened ratchet: no source file changed. The JS
//               scan now parses instead of pairing quotes. LodgingCockpit.jsx
//               8 -> 3: five hex/rgba in CSS comments inside its style template
//               (lines 3700 x2, 3701, 4064, 4109) were counted. HostShellV2.jsx
//               8 -> 30: the regex literal at 11908 (/[\w'’]+/) flipped the
//               quote pairing, hiding 22 real literals from 12918 on (two
//               var() fallbacks on the handled segments, the "done" glow x2,
//               GROUP_COLORS x5, the seated table puck's shadow, the contract
//               pop-out window x2, the demo tools bar x10).
//               parity/check-parity.mjs 1 -> 0: the one it counted sat inside a
//               regex literal (line 124), not a string.
//   11/21/2026  280 color, 883 inline (design batch 3c, item 21). The dead
//               .hero.elegant .whytog rule, rendered nowhere, took its #20242a
//               with it: styles.css 129 -> 128.
//   11/21/2026  272 color, 883 inline (design batch 3c, item 3; owner:
//               "Snap + remove dead CSS"). styles.css 128 -> 120: .gav's
//               #e8edf2 now reads --carbon-ink; the unrendered reveal rules
//               took #f4f6f8 (.rv-mname), #f2f4f7 (.rv-card-what) and the five
//               in @keyframes rvignite (.rv-name .rv-L) with them.
//   11/22/2026  269 color, 880 inline (the Linen theme, owner: "B with the C
//               touches"). The board's progress strips moved from an inline
//               style (two var() fallbacks, #6f9f7f / #7d8590, plus background
//               and opacity) to .eprog-seg and the --seg-done / --seg-open
//               tokens: HostShellV2.jsx 30 -> 28 color, 636 -> 634 inline.
//   11/22/2026  the two sheet scrims (rgba(0,0,0,.42), rgba(6,9,12,.55)) read
//               --scrim / --scrim-deep, warm umber in light: styles.css 119 -> 117.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

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

// (a) JS/JSX: literals inside string and template literals, found by PARSING.
// Until 11/21/2026 a regex paired quote characters over the comment-stripped
// text. A quote it could not see as code (inside a regex literal like
// /[\w']+/, or an apostrophe in JSX text) flipped every later pairing in the
// file, so real strings read as the gaps between strings and were skipped;
// and CSS comments inside template strings were counted. @babel/parser is the
// parser @vitejs/plugin-react already compiles this tree's JSX with (via
// @babel/core), so it adds no package. JSX text is copy, not paint, and is not
// a string here.
const jsColorSites = (raw) => {
  const sites = [];
  const visit = (n) => {
    if (n.type === 'StringLiteral' || n.type === 'TemplateElement') {
      const body = raw.slice(n.start, n.end);
      const scanned = n.type === 'TemplateElement' ? stripCss(body) : body;
      for (const c of scanned.matchAll(COLOR)) sites.push(lineOf(raw, n.start + c.index));
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === 'loc' || /Comments$/.test(k)) continue;
      for (const child of Array.isArray(v) ? v : [v]) if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(parse(raw, { sourceType: 'module', plugins: ['jsx'] }).program);
  return sites.sort((a, b) => a - b);
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

// ── THE COLOR SCANNER BITES: synthetic samples, one per miscount ──────────
// Each sample holds a known number of real color literals. Both cases failed
// on the scanner before 11/21/2026: (1) counted 3, (2) and (3) counted 0.
describe('the color scanner counts what a file paints, and nothing else', () => {
  it('a CSS comment inside a template string is not a literal', () => {
    const src = 'const css = `\n/* the ramp has no middle step (#eef0f4, #9a9ca0) */\n.a{color:#101010}\n`;\n';
    expect(jsColorSites(src)).toEqual([3]);
  });
  it('a quote inside a regex literal does not hide the strings after it', () => {
    const src = "const r = /^[\\w']+$/;\nconst a = 'x';\nconst s = { color: '#123456' };\n";
    expect(jsColorSites(src)).toEqual([3]);
  });
  it('an apostrophe in JSX text does not hide the strings after it', () => {
    const src = "const C = () => (<div>\n  <p>Maya's day</p>\n  <b style={{ color: '#abcdef' }}>x</b>\n</div>);\n";
    expect(jsColorSites(src)).toEqual([3]);
  });
});

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
