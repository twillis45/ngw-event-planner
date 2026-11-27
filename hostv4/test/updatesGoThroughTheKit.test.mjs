// UPDATES GO THROUGH THE KIT (owner, 11/25/2026: "start the updates and
// questions flow"). hostv4's Updates page posts, removes, replies and blocks
// only through lib/guestUpdatesKit, the hooks hostv2 now uses, so the limits,
// the second tap before an email and every failure are the same in both. It
// may read invite opens; it writes nothing itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'guestsKit', 'UpdatesPage.jsx'), 'utf8');
const imports = [...src.matchAll(/import\s+\{([^}]*)\}\s+from\s+'([^']+)'/g)].map((m) => ({ names: m[1].split(',').map((x) => x.trim()).filter(Boolean), from: m[2] }));

describe('updates go through the kit', () => {
  it('posts and replies only through useGuestUpdates and useGuestQuestions', () => {
    const kit = imports.find((i) => i.from === '@app/lib/guestUpdatesKit');
    expect(kit.names).toEqual(expect.arrayContaining(['useGuestUpdates', 'useGuestQuestions']));
    const writes = imports.flatMap((i) => i.names).filter((n) => ['postAnnouncement', 'removeAnnouncement', 'replyToGuestThread', 'blockGuestThread'].includes(n));
    expect(writes).toEqual([]);
  });
  it('reads only the invite opens from the APIs directly, and never fetches', () => {
    const api = imports.filter((i) => /\/api\//.test(i.from)).flatMap((i) => i.names);
    expect(api.sort()).toEqual(['fetchInviteOpens', 'getLastSyncTime', 'isAnnouncementsApiConfigured', 'isGuestMessagesApiConfigured']);
    expect(src).not.toMatch(/fetch\(|localStorage|patchSavedEvent/);
  });
  it('a second tap stands before any guest is emailed, and it says an email can’t be taken back', () => {
    expect(src).toMatch(/u\.confirm \? postAndEmailLabel\(u\.emailN\)/);
    expect(src).toMatch(/An email can’t be taken back once it’s sent\./);
  });
});
