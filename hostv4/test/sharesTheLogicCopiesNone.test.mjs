// hostv4 SHARES THE LOGIC AND COPIES NONE (owner, 11/25/2026: a separate shell
// for the new design, beside hostv2). Two shells are only safe if every answer
// either one shows comes from the same shared code (src/, through `@app`). This
// fails if hostv4 imports from hostv2, or reaches into src/ by a relative path
// that would bypass the one alias both shells use.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = readdirSync(src).filter((f) => /\.(js|jsx|mjs)$/.test(f));
const imports = (f) => [...readFileSync(join(src, f), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

describe('hostv4 shares the logic and copies none', () => {
  it('imports nothing from hostv2', () => {
    const bad = files.flatMap((f) => imports(f).filter((p) => /hostv2/.test(p)).map((p) => f + ': ' + p));
    expect(bad).toEqual([]);
  });
  it('reaches the shared code only through @app', () => {
    const bad = files.flatMap((f) => imports(f).filter((p) => /^(\.\.\/)+src\//.test(p)).map((p) => f + ': ' + p));
    expect(bad).toEqual([]);
  });
});
