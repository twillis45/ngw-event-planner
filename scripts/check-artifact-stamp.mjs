#!/usr/bin/env node
// ─── THE GATE ARTIFACT'S STAMP IS ASSERTED, NOT READ OFF THE PAGE ───────────
//
// path-artifact (ngw-os, amended 9/6/2026): the page's `Recorded` stamp must
// EQUAL the newest gate record's date, "and the equality is a script's to
// assert, and the script is committed." This file did not exist until
// 2026-11-02, so for two months the stamp was compared by eye — which is how
// the page went on saying "Ruled by Todd Willis" over records that name no
// ruler.
//
// Three checks, each a fail-loud exit 1:
//   1. `data-recorded` on the page == the newest `recordedAt` date (UTC) in
//      the repo copy of the gate record. A measurement is not a ruling, so a
//      re-measured page keeps the last RULING's date.
//   2. HANDOFF.md carries a `| Watch |` row for the artifact with a parseable
//      date. The skill: "it cannot verify the watch itself from a Node script;
//      what it can do is refuse to let the claim be ABSENT."
//   3. The page still renders recorded passes as checked AND disabled boxes
//      (Step 6e), and has no static `mark ok` left — a regression to the old
//      two-state page reads a passed stage as untouched on a first load.
//
// Run: node scripts/check-artifact-stamp.mjs   (also run by jest, see
// src/lib/__tests__/theGateArtifactStampIsChecked.test.js)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = process.env.STAMP_PAGE || join(ROOT, 'docs/artifact/the-first-recorded-gate.html');
const RECORD = process.env.STAMP_RECORD || join(ROOT, 'docs/artifact/the-first-recorded-gate.gate-record.json');
const HANDOFF = process.env.STAMP_HANDOFF || join(ROOT, 'HANDOFF.md');

const fail = [];
const page = readFileSync(PAGE, 'utf8');
const rec = JSON.parse(readFileSync(RECORD, 'utf8'));

// 1 — stamp equals the newest record date
const stamp = (page.match(/data-recorded="(\d{4}-\d{2}-\d{2})"/) || [])[1];
const dates = (rec.records || []).map((r) => new Date(r.recordedAt)).filter((d) => !Number.isNaN(d.getTime()));
if (!dates.length) fail.push('the gate-record copy holds no parseable recordedAt — the check would compare against nothing');
const newest = dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : null;
if (!stamp) fail.push('the page carries no machine-readable data-recorded stamp');
else if (newest && stamp !== newest) fail.push(`stamp ${stamp} != newest gate record ${newest}`);

// 2 — a Watch row exists, with a date
const handoff = readFileSync(HANDOFF, 'utf8');
const watch = handoff.split('\n').find((l) => /^\|\s*Watch\s*\|/.test(l));
if (!watch) fail.push('HANDOFF.md has no "| Watch |" row for the gate artifact');
else if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(watch)) fail.push('the Watch row carries no parseable date');

// 3 — four states survive
if (page.includes('class="mark ok"')) fail.push('a static "mark ok" is back — recorded passes must be checked+disabled boxes');
if (!/type="checkbox" checked disabled/.test(page)) fail.push('no checked+disabled box on the page — the four-state model is gone');

if (fail.length) {
  console.error('✗ gate artifact stamp check:\n  - ' + fail.join('\n  - '));
  process.exit(1);
}
console.log(`✓ gate artifact stamp ${stamp} == newest gate record ${newest}; Watch row dated; four states intact`);
