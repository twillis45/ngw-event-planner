#!/usr/bin/env node
/**
 * hostv4 into the release: build it from source and place it at public/hostv4,
 * so the site build ships it beside hostv2 (owner, 11/25/2026: hostv4 is the
 * simplified design's own shell, at /hostv4/). Like public/hostv2 it is
 * gitignored and regenerated on every release; nothing depends on a stale copy.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOSTV4 = join(ROOT, 'hostv4');
const OUT = join(ROOT, 'public/hostv4');

console.log('· building hostv4 from source …');
const build = spawnSync('npm', ['run', 'build'], { cwd: HOSTV4, encoding: 'utf8', stdio: 'inherit' });
if (build.status !== 0) { console.error('✗ hostv4 build failed'); process.exit(build.status || 1); }
const dist = join(HOSTV4, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('✗ hostv4/dist/index.html missing after build'); process.exit(1); }
rmSync(OUT, { recursive: true, force: true });
cpSync(dist, OUT, { recursive: true });
console.log('✓ hostv4 synced to public/hostv4');
