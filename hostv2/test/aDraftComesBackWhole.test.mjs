// "Add their email" from a vendor draft, then Back, rebuilt the draft from a
// PARTIAL parent — { kind:'draft', title, vendorId } with no body — so
// toneBody(undefined) rendered the literal word "undefined" in the draft box,
// next to a "Send it to …" button. Found by the 2026-11-02 Nielsen re-run (N1,
// P1): one tap emails a vendor the word "undefined".
//
// The fix keeps the WHOLE draft sheet as the parent. This guard forbids the
// shape that caused it: a `from:` that rebuilds a draft out of parts.
//
// HONEST LIMIT: this reads the shell as text. The path only renders for a
// signed-in host on a build with the email API configured, and no e2e bundle
// has both today; a browser round-trip test would need a new build mode. This
// is the machine check that exists until then. Red-proofed by restoring the
// partial parent at the "Add their email" link.
import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'HostShellV2.jsx'), 'utf8');

test('no sheet records a draft parent rebuilt from parts', () => {
  const partial = [...SRC.matchAll(/from:\s*\{\s*kind:\s*['"]draft['"][^}]*\}/g)].map((m) => {
    const line = SRC.slice(0, m.index).split('\n').length;
    return `HostShellV2.jsx:${line}  ${m[0].slice(0, 90)}`;
  });
  expect(partial).toEqual([]);
});

test('the "Add their email" link keeps the draft it came from, whole', () => {
  const i = SRC.indexOf("'Add their email'");
  expect(i).toBeGreaterThan(-1);
  const link = SRC.slice(SRC.lastIndexOf('<button', i), i);
  expect(link).toMatch(/kind:\s*'vendors'[^}]*from:\s*sheet\b/);
});
