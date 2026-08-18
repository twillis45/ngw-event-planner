#!/usr/bin/env node
// ─── ONE ENTRY POINT FOR THE E2E MATRIX, THAT REFUSES TO LIE ────────────────
//
// Added 2026-08-18 after the matrix was reported "running" three times in one
// session when it was not running at all. None of those were reading mistakes
// alone — the invocation had four ways to fail that all LOOK like a finished
// run, and this script closes each:
//
//   1. NO ROOT ENTRY POINT. The script is `test:e2e` inside hostv2/, so
//      `npm run matrix` from the repo root exited instantly as "Missing
//      script" — an empty log that reads exactly like a clean run.
//   2. NODE 16 IS THE DEFAULT ON THIS MACHINE. Playwright needs 20 and dies
//      early, again leaving a short log with no failures in it.
//   3. THE WEBSERVER SERVES THE EXISTING dist. Skip the build and the matrix
//      passes against the previous build — green, and meaningless.
//   4. PORT 5233 IS strictPort. A leftover `vite preview` means the server
//      never starts, and every project reports zero tests.
//
// The last line of output is always VERDICT, and the exit code is playwright's.
// Nothing here parses the log to decide the outcome — the process does.
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HOSTV2 = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'hostv2');
const PORT = 5233;
const die = (msg) => { console.error(`\nMATRIX NOT RUN — ${msg}\nVERDICT: NOT RUN`); process.exit(2); };

// 2 — the interpreter, before anything expensive
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  die(`node ${process.versions.node} cannot run playwright. Re-run with:\n`
    + `  PATH=/usr/local/opt/node@20/bin:$PATH npm run matrix`);
}

// 4 — a stale preview holds the port and every project reports zero tests
const held = spawnSync('lsof', ['-ti', `:${PORT}`], { encoding: 'utf8' }).stdout.trim();
if (held) {
  die(`port ${PORT} is held by pid(s) ${held.split('\n').join(', ')} — the strictPort `
    + `preview cannot bind.\n  kill ${held.split('\n').join(' ')}`);
}

// 3 — the matrix serves the EXISTING dist, so a skipped build tests the last one
console.log('▸ building hostv2 (the matrix serves dist/, not source)');
try {
  execFileSync('npm', ['run', 'build'], { cwd: HOSTV2, stdio: 'inherit' });
} catch {
  die('hostv2 build failed — the matrix would have run against the previous build');
}

console.log(`▸ running the matrix\n`);
const r = spawnSync('npm', ['run', 'test:e2e'], { cwd: HOSTV2, stdio: 'inherit' });

// The exit code is the verdict. A log full of green ticks from an aborted run
// has fooled this session more than once, so nothing here reads the log.
const code = r.status === null ? 1 : r.status;
console.log(`\nVERDICT: ${code === 0 ? 'GREEN' : `RED (exit ${code})`}`);
process.exit(code);
