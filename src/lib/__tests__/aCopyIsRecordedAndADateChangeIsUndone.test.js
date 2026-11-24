// ─── A COPY IS SAID AND KEPT; A DATE CHANGE IS UNDONE, NOT CONFIRMED (cohesion G, 11/24/2026) ──
// #32: "Copy the settle-up ask" copied silently, with no record. It now says
//      "Copied — paste it in your group chat." and records the send ledger's
//      own "copied to send" handoff, shown as "Settle-up ask copied <date>".
// #53: shrinking a trip's dates asked a native confirm ("Change the dates
//      anyway? Nothing is deleted."). Nothing is deleted, so the change lands
//      and its toast names what now falls after the last day, with Undo
//      (patchEvent's). UX_11 rule 18: a reversible act gets an Undo, not a gate.
// Shell checks (jest cannot run hostv2); the ledger half is the lib's own.
import fs from 'fs';
import path from 'path';
import { recordHandoff, sendStateFor, handoffVia } from '../sendLedger';

const SHELL = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');

test('#32 the settle-up copy records a "copied to send" handoff and says where to paste it', () => {
  const at = SHELL.indexOf('data-settle-copy');
  const btn = SHELL.slice(at, SHELL.indexOf('</button>', at));
  expect(btn).toMatch(/recordHandoff\(event\.sendLedger, SETTLE_UP_TITLE, 'copy'/);
  expect(btn).toMatch(/'Copied — paste it in your group chat\.'/);
  expect(SHELL).toMatch(/Settle-up ask copied \{/);
  const led = recordHandoff({}, 'Settle-up ask', 'copy', '2026-11-24T15:00:00Z', { kind: 'guests' });
  expect(sendStateFor(led, 'Settle-up ask')).toMatchObject({ status: 'handed_off', channel: 'copy', at: '2026-11-24T15:00:00Z' });
  expect(handoffVia('copy')).toBe('copied to send');
});

test('#53 a date change never asks a native confirm; its toast carries what moved, with Undo', () => {
  expect(SHELL).not.toMatch(/Change the dates anyway\?/);
  expect(SHELL).toMatch(/Dates changed\. \$\{stranded\.length\} thing/);
  expect(SHELL).toMatch(/patchEvent\(patch, strandedNote \|\|/);
  // The one confirm that stays: restoring a copy replaces work (cannot be undone).
  expect(SHELL).toMatch(/Put this copy back\?/);
});
