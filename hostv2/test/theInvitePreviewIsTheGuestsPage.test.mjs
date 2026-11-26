// hostv4's Your invite frames ../hostv2/?invite-preview=<plan id> (owner,
// 11/26/2026: "start the invite preview"). That address renders the guest's own
// InviteV2 with `preview` (nothing fetched, sent, counted or stored) for a plan
// saved in THIS browser's plan list, the one both shells write.
//
// HONEST LIMIT: reads main.jsx as text; the browser render is in the PR record.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const main = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/main.jsx'), 'utf8');

test('?invite-preview reads the plan list and renders InviteV2 in preview mode', () => {
  expect(main).toMatch(/get\('invite-preview'\)/);
  expect(main).toMatch(/ngw-hostv2-custom-events/);
  expect(main).toMatch(/<m\.default code=\{[^}]+\} preview=\{plan\} \/>/);
});
test('a plan not in this browser says so, never a blank page', () => {
  expect(main).toMatch(/That plan isn’t saved in this browser/);
});
