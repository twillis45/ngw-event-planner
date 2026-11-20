// ─── ONE BUILD, TWO ADDRESSES (domain move, owner ruling 11/19/2026) ────────
//
// The app moves from twillis45.github.io/ngw-event-planner/ to
// events.noguessworksystems.com/ by setting the custom domain in Pages
// settings, with no code deploy at the moment of the switch. That only works
// while nothing the app ships names either the old host or the old path
// prefix: the bundle is relative (vite base './'), the worker reads its own
// directory, and every public link is built from the address the app is
// running at (lib/publicAppUrl, lib/policyLinks).
//
// So no CODE in hostv2/src, src/lib (tests aside), hostv2/index.html or the
// hostv2 manifest may carry `twillis45.github.io` or a `/ngw-event-planner/`
// path again. Comments may explain history; they are stripped first. The
// allowlist is for a string that is not an address (none needed today).
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOSTV2 = fileURLToPath(new URL('..', import.meta.url));
const REPO = join(HOSTV2, '..');
const FORBIDDEN = /twillis45\.github\.io|\/ngw-event-planner\//;
const ALLOW = new Set([]);

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (n === 'node_modules' || n === '__tests__') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/** Drop comments that stand on their own (line, block, JSX block, HTML). */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
    .replace(/^\s*\/\/.*$/gm, '');
}

function offenders(files) {
  return files.flatMap((f) => {
    const rel = relative(REPO, f);
    if (ALLOW.has(rel)) return [];
    return stripComments(readFileSync(f, 'utf8')).split('\n')
      .filter((line) => FORBIDDEN.test(line))
      .map((line) => `${rel}: ${line.trim().slice(0, 140)}`);
  });
}

const SCANNED = () => [
  ...walk(join(HOSTV2, 'src')),
  ...walk(join(REPO, 'src/lib')),
  join(HOSTV2, 'index.html'),
  join(REPO, 'public/hostv2-manifest.json'),
].filter((f) => /\.(m?js|jsx|html|json)$/.test(f));

describe('nothing the app ships names the old host or path', () => {
  test('hostv2/src, src/lib, index.html and the manifest are host- and prefix-free', () => {
    expect(offenders(SCANNED())).toEqual([]);
  });

  test('the scan is not vacuous: it reads the files that used to carry them', () => {
    const files = SCANNED().map((f) => relative(REPO, f));
    for (const f of ['src/lib/brand.js', 'src/lib/publicAppUrl.js', 'hostv2/src/offline/swTemplate.js',
      'hostv2/index.html', 'public/hostv2-manifest.json']) expect(files).toContain(f);
  });

  test('it catches an address in a string, and ignores one in a comment', () => {
    expect(FORBIDDEN.test(stripComments("const u = 'https://twillis45.github.io/ngw-event-planner/hostv2/';"))).toBe(true);
    expect(FORBIDDEN.test(stripComments('  // moved off https://twillis45.github.io/x'))).toBe(false);
    expect(FORBIDDEN.test(stripComments('<!-- twillis45.github.io/favicon.ico -->'))).toBe(false);
    expect(FORBIDDEN.test(stripComments('{ "src": "/ngw-event-planner/icon-192.png" }'))).toBe(true);
  });
});
