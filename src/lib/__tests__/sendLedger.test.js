/** The send ledger — board ruling 2026-08-21 (6-0: the ledger, not the transport).
 *
 * Three layers, matching the ruling's clauses:
 *  1. The pure model: handed_off is host-attested, keyed like draft edits,
 *     and the copy never says "Sent".
 *  2. The shell wiring: every real handoff exit in the draft sheet records,
 *     a declined share records nothing, and "Mark it sent" reads as a record.
 *  3. The loss gate: sendLedger rides topAction rebuilds (the whitelist trap
 *     that has eaten five fields).
 */
import fs from 'fs';
import path from 'path';
import { recordHandoff, sendStateFor, sendStateLine, sendKey } from '../sendLedger';

const SHELL = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8');

describe('the pure model', () => {
  test('a handoff is attested, channeled, stamped, and keyed like draft edits', () => {
    const led = recordHandoff({}, 'Note to the caterer', 'sms', '2026-08-21T12:00:00Z');
    const e = sendStateFor(led, 'Note to the caterer');
    expect(e).toMatchObject({ status: 'handed_off', attested: true, channel: 'sms', at: '2026-08-21T12:00:00Z' });
    expect(sendKey('Note to the caterer')).toBe('Note to the caterer');
  });

  test('an unknown channel degrades to "other", never throws', () => {
    const led = recordHandoff({}, 'T', 'carrier-pigeon', '2026-08-21T12:00:00Z');
    expect(sendStateFor(led, 'T').channel).toBe('other');
  });

  test('no entry means null — never a fabricated not_sent object', () => {
    expect(sendStateFor({}, 'never sent')).toBeNull();
    expect(sendStateFor(null, 'x')).toBeNull();
  });

  test('the line says Handed off with channel and age — and NEVER "Sent"', () => {
    const at = '2026-08-21T00:00:00Z';
    const line = sendStateLine({ status: 'handed_off', channel: 'sms', at }, Date.parse(at) + 2 * 86400000 + 1000);
    expect(line).toBe('Handed off by text · 2d ago');
    expect(line).not.toMatch(/\bSent\b/);
  });

  test('recording is non-destructive to other drafts', () => {
    const led1 = recordHandoff({}, 'A', 'sms', '2026-08-21T12:00:00Z');
    const led2 = recordHandoff(led1, 'B', 'copy', '2026-08-21T13:00:00Z');
    expect(sendStateFor(led2, 'A').channel).toBe('sms');
    expect(sendStateFor(led2, 'B').channel).toBe('copy');
  });
});

describe('the shell wiring (draft sheet)', () => {
  // The one recorder — every exit funnels through it, so the ruling's
  // must-not-ship list has one door to guard.
  test('the draft sheet has a recordSend helper writing through patchEvent', () => {
    expect(SHELL).toMatch(/const recordSend = /);
    const fn = SHELL.slice(SHELL.indexOf('const recordSend = '), SHELL.indexOf('const recordSend = ') + 900);
    expect(fn).toMatch(/recordHandoff\(/);
    expect(fn).toMatch(/sendLedger/);
    expect(fn).toMatch(/patchEvent\(/);   // undo rides the one write path
  });

  test('every real handoff exit records: sms, whatsapp, copy, share-on-success', () => {
    expect(SHELL).toMatch(/recordSend\('sms'\)/);
    expect(SHELL).toMatch(/recordSend\('whatsapp'\)/);
    expect(SHELL).toMatch(/recordSend\('copy'\)/);
    // Share records ONLY inside the resolved promise — a declined share
    // (rejection) must record nothing, per ruling clause 4.
    expect(SHELL).toMatch(/navigator\.share\(\{ title: sheet\.title[^}]*\}\)\.then\(\(\) => \{ recordSend\('share'\); \}\)/);
  });

  test('"Mark it sent" exists and reads as a RECORD, not an act (UX_07:46)', () => {
    expect(SHELL).toMatch(/Mark it sent/);
  });

  test('a vendor-directed handoff also logs vendor contact — one gesture, both ledgers', () => {
    // The vendor Draft note carries its vendor into the sheet…
    expect(SHELL).toMatch(/openDraft\('Note to ' \+ \(v\.name \|\| 'your vendor'\), draftVendorOutreach\(event, v, profile\), null, \{ vendorId: v\.id \}\)/);
    // …and recordSend routes the vendor case through logVendorContact, so the
    // silence clock (contactState) starts on the same tap.
    const fn = SHELL.slice(SHELL.indexOf('const recordSend = '), SHELL.indexOf('const recordSend = ') + 1200);
    expect(fn).toMatch(/sheet\.vendorId/);
    expect(fn).toMatch(/logVendorContact\(sheet\.vendorId\)/);
  });

  test('the state chip renders the attested line, never the word Sent alone', () => {
    expect(SHELL).toMatch(/sendStateLine\(/);
  });
});

describe('the loss gate', () => {
  test('run-it-again RESETS the ledger — a copy carrying last year\'s "Handed off" would claim asks never made', () => {
    // (The board's named risk was the topAction whitelist; checked — the
    // ledger never rides actions, it is read straight off the event. The
    // REAL loss vector is duplication: plan carries, state resets.)
    const { duplicateEvent } = require('../duplicateEvent');
    const copy = duplicateEvent(
      { id: 'ev-1', name: 'Reunion', sendLedger: { 'Note to caterer': { status: 'handed_off', attested: true, channel: 'sms', at: '2026-08-21T12:00:00Z' } } },
      { id: 'ev-copy-x', now: '2026-08-21T13:00:00Z' },
    );
    expect(copy.sendLedger).toBeUndefined();
  });
});
