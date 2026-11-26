// The owner, 11/26/2026: "App is lying somewhere". The checklist said "19 still
// open · 4 already handled by your plan", and the 19 included those 4. "Still
// open" now leaves out what the plan already handles. The count half (The Day's
// banner) is src/lib/__tests__/stillOpenMeansStillOpen.test.js.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/HostShellV2.jsx'), 'utf8');

test('the checklist’s "still open" does not count what the plan already handles', () => {
  expect(src).toMatch(/\$\{openN - inferredN\} still open · \$\{inferredN\} already handled by your plan/);
});
