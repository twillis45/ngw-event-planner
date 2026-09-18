// ─── FOUR FINDINGS FROM THE 2026-09-18 DIFM TRUTHFULNESS AUDIT ───────────────
//
// doItForMe.js itself came back CLEAN — all 30 exports are pure formatters, no
// network, no writes. Every failure was at a render site, where the shell made
// a claim the draft did not support. All four are the same shape: the app
// asserting an act it did not perform.
//
//   2  Copying a draft to the CLIPBOARD was recorded as "you reached out".
//      Three weeks later the app said "You reached out 21 days ago and haven't
//      heard back", listed the vendor as silent, and marked the readiness score
//      down for it — so the host chases a vendor nobody ever wrote to.
//      CONTACT_SOURCES has carried 'drafted' for exactly this case since the
//      module was written, with ZERO call sites anywhere in the repo.
//
//   1  "Reconfirm everyone" ran a 2.2-second "drafting…" cascade built from
//      setTimeout and nothing else. The note is computed synchronously at
//      render and was already in hand before the first timer fired. A host with
//      five vendors could reasonably conclude five reconfirmations went out.
//
//   3  "Skip" wrote `thankYouSent: true` — byte-identical to "Mark thanked" —
//      so skipping six guests still produced "12 of 12 · That's everyone —
//      every yes has a thank-you."
//
//   8  "Update everyone" with no type produces a body whose only content is
//      "[Add the update here]", and hostv2's sheet offered Share… beneath it
//      with no warning. One tap, forty guests, one bracket.
//
// (1), (3) and (8) live in a shell jest cannot execute, so their guards here are
// source assertions — deliberately, and the same call the repo's own
// textGateRatchet asks callers to make. The behavior claims belong in
// hostv2/e2e/.
import { contactState, recordContact, CONTACT_SOURCES, SILENCE_DAYS } from '../vendorContact';
import { draftGuestUpdate } from '../doItForMe';

const fs = require('fs');
const path = require('path');
const SHELL = path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx');
const shellSource = () => fs.readFileSync(SHELL, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe('a draft is not a handoff', () => {
  test("'drafted' is an accepted source, and 'sent' still is not", () => {
    expect(CONTACT_SOURCES).toContain('drafted');
    expect(CONTACT_SOURCES).toContain('host-logged');
    // The app cannot send, so nothing may claim it did. This is the module's
    // own stated rule; assert it rather than trusting the comment.
    expect(CONTACT_SOURCES).not.toContain('sent');
  });

  test('a drafted contact is never awaiting a reply and never silent', () => {
    const v = { name: 'Hearthstone', ...recordContact({ source: 'drafted', at: daysAgo(SILENCE_DAYS + 10) }) };
    const cs = contactState(v);
    expect(cs.known).toBe(true);            // we DO know a draft was prepared
    expect(cs.handedOff).toBe(false);
    expect(cs.awaitingReply).toBe(false);   // they owe nothing — nobody wrote to them
    expect(cs.silent).toBe(false);          // and they cannot have gone quiet
  });

  test('a host-logged contact at the same age IS silent — the guard still bites', () => {
    const v = { name: 'Hearthstone', ...recordContact({ source: 'host-logged', at: daysAgo(SILENCE_DAYS + 10) }) };
    const cs = contactState(v);
    expect(cs.handedOff).toBe(true);
    expect(cs.awaitingReply).toBe(true);
    expect(cs.silent).toBe(true);
  });

  test('a vendor who came back is not awaiting a reply, whatever the source', () => {
    for (const source of ['drafted', 'host-logged']) {
      const v = { name: 'X', status: 'Confirmed', ...recordContact({ source, at: daysAgo(30) }) };
      expect(contactState(v).awaitingReply).toBe(false);
    }
  });

  test('no contact record at all still reads as unknown, not as drafted', () => {
    const cs = contactState({ name: 'X' });
    expect(cs.known).toBe(false);
    expect(cs.handedOff).toBe(false);
  });

  test('the clipboard is the one channel recorded as drafted', () => {
    const src = shellSource();
    expect(src).toMatch(/channel === 'copy' \? 'drafted' : 'host-logged'/);
  });
});

describe('the reconfirm sweep does not perform work it is not doing', () => {
  test('no setTimeout staging remains in runSweepDrafts', () => {
    const src = shellSource();
    const i = src.indexOf('const runSweepDrafts');
    expect(i).toBeGreaterThan(-1);
    const body = src.slice(i, src.indexOf('};', i));
    expect(body).not.toMatch(/setTimeout/);
    expect(body).not.toMatch(/'drafting'/);
  });

  test('the CTA does not promise an act on every vendor', () => {
    // The app sends nothing here; each note is handed to the host.
    expect(shellSource()).not.toMatch(/>Reconfirm everyone</);
  });
});

describe('skipping a thank-you does not record one', () => {
  test('Skip writes thankYouSkipped, never thankYouSent', () => {
    const src = shellSource();
    expect(src).toMatch(/thankYouSkipped: true \}, 'Skipped/);
    expect(src).not.toMatch(/\{ thankYouSent: true \}, 'Skipped/);
  });

  test('the thanked count and the queue read different fields', () => {
    const src = shellSource();
    expect(src).toMatch(/const sent = yes\.filter\(x => x\.g\.thankYouSent\)\.length;/);
    expect(src).toMatch(/const queue = yes\.filter\(x => !x\.g\.thankYouSent && !x\.g\.thankYouSkipped\);/);
  });
});

describe('a draft full of blanks is flagged before it is handed off', () => {
  // The generator is RIGHT to bracket what it does not know — that is the
  // Unknown Rule, not a defect. The defect was shipping it with no warning.
  test('the untyped guest update still brackets rather than inventing', () => {
    const body = String((draftGuestUpdate({ title: 'T', type: 'Birthday' }, {}) || {}).body || '');
    expect(body).toMatch(/\[[^\]]+\]/);
  });

  test('the draft sheet warns when blanks remain', () => {
    const src = shellSource();
    expect(src).toMatch(/blanks still to fill|One blank still to fill/);
  });
});
