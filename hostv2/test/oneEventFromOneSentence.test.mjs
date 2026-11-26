// hostv2's creation builds the event through lib/eventFromSentence, the same
// builder hostv4's Create uses (owner, 11/26/2026: "start Create"), so the same
// sentence makes the same plan in both apps. The builder's behavior is pinned in
// src/lib/__tests__/oneEventFromOneSentence.test.js.
//
// HONEST LIMIT: reads HostShellV2.jsx as text; hostv2's creation e2e drives it.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/HostShellV2.jsx'), 'utf8');
const assemble = src.slice(src.indexOf('const assemble = () => {'), src.indexOf('const revealIdentityFor = '));

test('assemble() builds the event with eventFromSentence', () => {
  expect(assemble).toMatch(/eventFromSentence\(\{/);
});
test('it no longer writes the event inline', () => {
  expect(assemble).not.toMatch(/const ev = \{/);
  expect(assemble).not.toMatch(/playbookChecklist\(ev\)/);
});
test('the create screen reads its answers from effectiveAnswers', () => {
  expect(src).toMatch(/effectiveAnswers\(parsed, createSaid\)/);
  expect(src).not.toMatch(/const effGuests = \(fGuests \?\? parsed\.guests\)/);
});
