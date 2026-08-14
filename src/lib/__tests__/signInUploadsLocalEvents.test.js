/**
 * SIGNING IN MUST PUSH, NOT ONLY PULL (2026-08-08).
 *
 * hydrate() in HostShellV2 pulled cloud -> local and nothing ever went the other
 * way. A host who used the open demo, built a real event, then signed in kept
 * that event on the device and ONLY on the device — it sat at LOCAL_ONLY until
 * they happened to edit it, because an edit was the only thing that had ever
 * called saveEvent. That is LIVE_MODE_READINESS section 7's first item ("a host
 * who used the demo and then signs in does not lose their local events").
 *
 * The capability already existed: migrateLocalToCloud (api/events.js:204). Its
 * only caller was src/App.js — the CRA shell CLAUDE.md freezes as donor-only. So
 * this was never a missing feature, it was a missing CALL on the live surface,
 * and no test could see that because both halves were individually fine.
 *
 * A source contract, deliberately. The upload lives inside a useEffect that runs
 * only on a real Supabase session, so there is no way to exercise it in jsdom
 * without standing up auth. What CAN be pinned is that the call exists, reads
 * the right store, filters with the right predicate, and reports honestly.
 */
const fs = require('fs');
const path = require('path');

const SHELL = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const EVENTS_API = fs.readFileSync(path.join(__dirname, '../api/events.js'), 'utf8');
const WELCOME = fs.readFileSync(path.join(__dirname, '../welcomeGate.js'), 'utf8');

// The upload block, isolated once so every test reads the same region rather
// than matching loose strings anywhere in an 18k-line file.
const BLOCK = (() => {
  const start = SHELL.indexOf('AND THE OTHER DIRECTION');
  if (start < 0) return '';
  // 4000, not 3000: the first cut ended at 3077 and sliced the toast off the
  // end, so two assertions failed against a block that did not contain the code
  // they were about. A window that silently truncates its own subject is a
  // worse defect than the one being tested for.
  return SHELL.slice(start, start + 4000);
})();

describe('sign-in uploads the local events', () => {
  test('the upload block exists at all', () => {
    expect(BLOCK).not.toBe('');
  });

  test('it reads hostv2 OWN store, not the api layer copy', () => {
    // api/events.js keeps its own localStorage copy under `ngw-events`
    // (events.js:19). hostv2's events live in LS_CUSTOMS. Uploading
    // readLocal()'s set would push the wrong events — a silent no-op on a
    // device whose real work is all in LS_CUSTOMS.
    expect(BLOCK).toMatch(/localStorage\.getItem\(LS_CUSTOMS\)/);
    expect(EVENTS_API).toMatch(/const LOCAL_KEY\s*=\s*'ngw-events'/);
  });

  test('it skips what is already in the cloud, so a second sign-in is a no-op', () => {
    expect(BLOCK).toMatch(/inCloud/);
    expect(BLOCK).toMatch(/!inCloud\.has\(e\.id\)/);
  });

  test('it uploads only genuine host events', () => {
    // Same predicate the welcome gate uses — demo- ids, non-host records and
    // unnamed stubs are not the host's work and must not reach their account.
    expect(BLOCK).toMatch(/isRealHostEvent\(e\)/);
    expect(WELCOME).toMatch(/export function isRealHostEvent/);
    expect(WELCOME).toMatch(/\^demo-/);
  });

  test('each event is stamped from its OWN result, never in bulk', () => {
    // migrateLocalToCloud returns {migrated, failed} with no per-id detail, so
    // stamping from it would claim a cloud copy that may not exist. saveEvent
    // answers per event and recordSaveResult digests that one result.
    expect(BLOCK).toMatch(/cloudSaveEvent\(ev\)/);
    expect(BLOCK).toMatch(/recordSaveResult\(ev, res\)/);
    // A CALL, not a mention: the block's own comment names migrateLocalToCloud
    // to explain why it is not used, and the first version of this assertion
    // matched that comment and failed on correct code. Match the open paren.
    expect(BLOCK).not.toMatch(/migrateEventsToCloud\(|migrateLocalToCloud\(/);
  });

  test('the toast counts what UPLOADED, not what was attempted', () => {
    // The same lie in prose: reporting toUpload.length after a partial run.
    expect(BLOCK).toMatch(/oks\.filter\(Boolean\)\.length/);
    expect(BLOCK).toMatch(/of \$\{toUpload\.length\} events saved/);
    // And silence when nothing went up — better than a false claim.
    expect(BLOCK).toMatch(/if \(!up\) return;/);
  });
});

describe('the capability this replaces', () => {
  test('migrateLocalToCloud still exists and is still counts-only', () => {
    // If it ever grows per-id results, this block should be revisited — the
    // reason for not using it would be gone.
    expect(EVENTS_API).toMatch(/export async function migrateLocalToCloud/);
    expect(EVENTS_API).toMatch(/return \{ migrated, failed, firstError \}/);
  });
});
