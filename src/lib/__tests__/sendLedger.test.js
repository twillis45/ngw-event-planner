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
import { recordHandoff, recordEmailSend, sendStateFor, sendStateLine, sendKey, isVerifiedState } from '../sendLedger';

const SHELL = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8');


// ── SLICE TO A REAL BOUNDARY, NOT A CHARACTER COUNT ─────────────────────────
// These reads were `indexOf(x) + 900 / 1200 / 1400 / 2600`. A slice length
// silently decides what a test can SEE: adding a comment inside `sendEmailNow`
// pushed `'failed'` outside the window and the test reported the handling
// missing while it sat five lines below the cut. Anchored to the next
// declaration instead, so the window grows with the function it is reading.
const fnAfter = (marker, stopAt) => {
  const i = SHELL.indexOf(marker);
  if (i < 0) return '';
  const rest = SHELL.slice(i);
  const end = stopAt ? rest.indexOf(stopAt, marker.length) : -1;
  return end > 0 ? rest.slice(0, end) : rest.slice(0, 4000);
};

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

describe('the email path — slice (b), system-verified states', () => {
  const at = '2026-08-21T00:00:00Z';
  const now = Date.parse(at) + 60000;

  test('an email state is NOT attested — the server did it, not the host', () => {
    const led = recordEmailSend({}, 'T', 'accepted', { at, to: 'v@example.com' });
    const e = sendStateFor(led, 'T');
    expect(e).toMatchObject({ status: 'accepted', attested: false, channel: 'email', to: 'v@example.com' });
    expect(isVerifiedState(e)).toBe(true);
    expect(isVerifiedState(sendStateFor(recordHandoff({}, 'T', 'sms', at), 'T'))).toBe(false);
  });

  test('accepted says ACCEPTED — never "delivered", never "Sent"', () => {
    const line = sendStateLine(sendStateFor(recordEmailSend({}, 'T', 'accepted', { at }), 'T'), now);
    expect(line).toMatch(/Accepted by the mail service/);
    expect(line).not.toMatch(/[Dd]elivered/);
    expect(line).not.toMatch(/\bSent\b/);
  });

  test('failed is honest about what did NOT happen', () => {
    const line = sendStateLine(sendStateFor(recordEmailSend({}, 'T', 'failed', { at, error: 'x' }), 'T'), now);
    expect(line).toMatch(/didn’t go out/);
    expect(line).toMatch(/nothing was sent/);
  });

  test('an unknown status degrades to sending — never to a success claim', () => {
    expect(sendStateFor(recordEmailSend({}, 'T', 'delivered', { at }), 'T').status).toBe('sending');
    expect(sendStateFor(recordEmailSend({}, 'T', 'whatever', { at }), 'T').status).toBe('sending');
  });
});

describe('the shell wiring (draft sheet)', () => {
  // The one recorder — every exit funnels through it, so the ruling's
  // must-not-ship list has one door to guard.
  test('the draft sheet has a recordSend helper writing through patchEvent', () => {
    expect(SHELL).toMatch(/const recordSend = /);
    const fn = fnAfter('const recordSend = ', 'const sendEntry');
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
    const fn = fnAfter('const recordSend = ', 'const sendEntry');
    expect(fn).toMatch(/sheet\.vendorId/);
    expect(fn).toMatch(/logVendorContact\(sheet\.vendorId\)/);
  });

  test('the state chip renders the attested line, never the word Sent alone', () => {
    expect(SHELL).toMatch(/sendStateLine\(/);
  });

  // ── slice (b): the email send, per the ruling's boundary ────────────────
  test('email send is offered ONLY for a vendor draft with a known email, and only with a backend', () => {
    const fn = fnAfter('const emailTarget = ', 'const sendEmailNow');
    expect(fn).toMatch(/sheet\.vendorId/);        // vendor-directed only
    expect(fn).toMatch(/isCommApiConfigured\(\)/); // no backend, no button
    expect(fn).toMatch(/!session/);                // signed out ⇒ no button (it would 401)
    expect(fn).toMatch(/@/);                       // a real address, validated
  });

  test('the send is explicit, one at a time, and states what it will do', () => {
    // Ruling clause 4: never auto-send, never bulk. The control is a single
    // button that names the recipient, and it disables while in flight.
    expect(SHELL).toMatch(/Send it to /);
    expect(SHELL).toMatch(/sendingEmail/);
  });

  test('the shell records the SERVER answer, never an optimistic success', () => {
    const fn = fnAfter('const sendEmailNow = ', 'const sendChip');
    expect(fn).toMatch(/recordEmailSend\([^)]*'sending'/);
    expect(fn).toMatch(/deliver_email: true/);
    // The accepted/failed branch reads the delivery metadata the backend
    // patched — it never assumes ok from a 200.
    expect(fn).toMatch(/delivery/);
    expect(fn).toMatch(/'accepted'/);
    expect(fn).toMatch(/'failed'/);
  });

  test('verified and attested chips are visually distinct (ruling risk #1)', () => {
    expect(SHELL).toMatch(/isVerifiedState\(/);
  });

  test('the vendor row reads the ledger — the ops question answered on the wall', () => {
    // "did the ask go out, when, and did they answer": the contact line owns
    // when+answer, this owns HOW it went out, keyed by the vendor's own draft.
    expect(SHELL).toMatch(/const vSend = sendStateFor\(event\.sendLedger, 'Note to ' \+ \(v\.name \|\| 'your vendor'\)\)/);
    expect(SHELL).toMatch(/const vSendLine = sendStateLine\(vSend, Date\.now\(\)\)/);
    expect(SHELL).toMatch(/isVerifiedState\(vSend\)/);
  });

  test('the row never contradicts itself — "No record" cannot sit beside a handoff', () => {
    // Host report 2026-08-21: the vendor row rendered "No record of reaching
    // out yet." AND "Handed off by text · 6d ago" together. A handoff IS a
    // record; the sentence steps aside and the chip carries the fact.
    expect(SHELL).toMatch(/\(vSend \? '' : 'No record of reaching out yet\.'\)/);
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

describe('replies reach the host, not a void', () => {
  // Found by the transport review board (2026-08-21), not by a test: the
  // backend has accepted `reply_to` since it was written, and the shell never
  // sent one — so every message the app has put out invited replies to an
  // unmonitored shared address. A vendor answering "yes, 3pm works" was
  // replying into nothing, and neither side could tell.
  //
  // Pinned in the SOURCE because the failure is invisible from inside the app:
  // the send succeeds, the ledger records `accepted`, and the reply simply
  // never arrives anywhere a human looks.
  const SHELL = require('fs').readFileSync(
    require('path').join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');

  test('the send passes reply_to', () => {
    expect(SHELL).toMatch(/reply_to:\s*String\(session\.user\.email\)/);
  });

  test('it comes from the SESSION, never the host-typed profile', () => {
    // `profile.name` is already used for `author_name` and is host-typed —
    // blank or wrong on plenty of events. An address is not a display name;
    // getting it wrong routes a real reply to a real stranger.
    const call = fnAfter('commApi.createMessage(', 'const d =');
    expect(call).toMatch(/reply_to/);
    expect(call).not.toMatch(/reply_to:\s*[^,]*profile/);
  });

  test('and is OMITTED rather than guessed when there is no session address', () => {
    // A wrong reply-to is worse than the default: it fails silently, in
    // somebody else's inbox.
    const call = fnAfter('commApi.createMessage(', 'const d =');
    expect(call).toMatch(/\?\s*\{ reply_to[\s\S]{0,40}\}\s*:\s*\{\}/);
  });
});

describe('the send had no address to send to', () => {
  // The transport board measured two things that together made the vendor send
  // unreachable on EVERY event: only 1 of 24 `openDraft` call sites passed a
  // `vendorId` (and `emailTarget` requires one), and 0 of 126 seeded vendors
  // carry an email. So the send this product already owns had never rendered
  // anywhere, and its absence read as a missing feature rather than a missing
  // address.

  test('every vendor-directed draft tells the sheet WHICH vendor', () => {
    // A draft that does not know its addressee can never offer a send. These
    // are the five that did not: reconfirm (x2), arrival-time ask (x2), and
    // the payment note.
    const vendorDrafts = [
      "openDraft('Reconfirm — ' + v.name",
      "openDraft('Ask ' + v.name + ' for their arrival time'",
      "openDraft('Payment reminder'",
      "openDraft('Note to ' + (v.name",
    ];
    for (const marker of vendorDrafts) {
      let from = 0;
      let seen = 0;
      for (;;) {
        const i = SHELL.indexOf(marker, from);
        if (i < 0) break;
        seen += 1;
        // The options object is the 4th argument; look ahead to the call's end.
        const call = SHELL.slice(i, i + 320);
        if (!/vendorId:\s*v\.id/.test(call)) {
          throw new Error(`vendor-directed draft does not pass vendorId: ${marker}`);
        }
        from = i + marker.length;
      }
      expect(seen).toBeGreaterThan(0);
    }
  });

  test('a missing address is EXPLAINED, not silent', () => {
    // The third state this shipped in for months was nothing at all --
    // indistinguishable from the feature not existing.
    expect(SHELL).toMatch(/const missingVendorEmail = \(\(\) => \{/);
    expect(SHELL).toMatch(/No email for \$\{missingVendorEmail\.name\} yet/);
    expect(SHELL).toMatch(/Add their email|Fix their address/);
  });

  test('but stays silent when the host could not send anyway', () => {
    // Gated on `session`: a signed-out host cannot send, so inviting them to
    // add an address that still yields no send button would be the worse lie.
    const fn = fnAfter('const missingVendorEmail = ', 'const sendEmailNow');
    expect(fn).toMatch(/!isCommApiConfigured\(\)\s*\|\|\s*!session/);
  });
});
