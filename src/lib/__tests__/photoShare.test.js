// ─── SHARE A PHOTO = HAND IT TO THE PERSON'S OWN APP (owner ruling 11/16/2026) ─
//
// "Share to Instagram / Facebook" is the phone's share sheet with the photo as
// a file. Instagram ignores a prefilled caption, so the caption (event name +
// the host's hashtag) is copied FIRST. The app never posts; the person does.
// UX_07: the words say what happened — "Caption copied — paste it in
// Instagram." — never "posted" or "shared" as a fact.
import {
  shareCaption, sharePhoto, canShareFiles, shareToast, copyCaption, instagramTagUrl, photoFileName,
} from '../photoShare';

const EVENT = { name: 'Vida’s Friendsgiving', hashtag: '#VidasFriendsgiving2026' };
const URL = 'https://project.supabase.co/storage/v1/object/sign/guest-photos/e1/p1.jpg?token=t';

const deps = ({ canShare = true, share = async () => {}, clip = true, fetchOk = true } = {}) => {
  const calls = { share: [], clip: [], fetch: [] };
  return {
    calls,
    navigator: {
      canShare: canShare === null ? undefined : (d) => Boolean(canShare && d && d.files),
      share: async (d) => { calls.share.push(d); return share(d); },
      clipboard: clip ? { writeText: async (t) => { calls.clip.push(t); } } : undefined,
    },
    fetch: async (u) => {
      calls.fetch.push(u);
      if (!fetchOk) throw new TypeError('offline');
      return { ok: true, blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }) };
    },
    File: class { constructor(parts, name, opts) { this.parts = parts; this.name = name; this.type = opts && opts.type; } },
  };
};

test('the caption is the event name and the host’s hashtag, and nothing else', () => {
  expect(shareCaption(EVENT)).toBe('Vida’s Friendsgiving #VidasFriendsgiving2026');
  expect(shareCaption({ name: 'Game Night' })).toBe('Game Night');            // no tag until the host turns one on
  expect(shareCaption({ name: 'Game Night', hashtag: '  ' })).toBe('Game Night');
  expect(shareCaption({})).toBe('');
  // The board (8–2): showing the tag is not a call to post. No "share with", no "#tag us".
  expect(shareCaption(EVENT)).not.toMatch(/share|post|tag us|follow/i);
});

test('copies the caption FIRST, then opens the share sheet with the photo as a JPEG file', async () => {
  const d = deps();
  const r = await sharePhoto({ url: URL, caption: shareCaption(EVENT), fileName: 'photo.jpg' }, d);
  expect(r).toEqual({ outcome: 'opened', captionCopied: true });
  expect(d.calls.clip).toEqual(['Vida’s Friendsgiving #VidasFriendsgiving2026']);
  expect(d.calls.share).toHaveLength(1);
  const sent = d.calls.share[0];
  expect(sent.text).toBe('Vida’s Friendsgiving #VidasFriendsgiving2026');
  expect(sent.files).toHaveLength(1);
  expect(sent.files[0].type).toBe('image/jpeg');
  expect(sent.files[0].name).toBe('photo.jpg');
  expect(sent.url).toBeUndefined();          // the photo, not a link to the app
});

test('a cancelled share sheet is the person saying "never mind", not a failure', async () => {
  const d = deps({ share: async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; } });
  expect(await sharePhoto({ url: URL, caption: 'c' }, d)).toEqual({ outcome: 'cancelled', captionCopied: true });
});

test('where files cannot be shared (desktop) it says so and opens nothing', async () => {
  for (const canShare of [false, null]) {
    const d = deps({ canShare });
    expect(canShareFiles(d.navigator)).toBe(false);
    const r = await sharePhoto({ url: URL, caption: 'c' }, d);
    expect(r.outcome).toBe('unsupported');
    expect(d.calls.share).toHaveLength(0);
  }
  expect(canShareFiles(undefined)).toBe(false);
});

test('a photo that will not download, or a share that errors, is a plain failure', async () => {
  expect((await sharePhoto({ url: URL, caption: 'c' }, deps({ fetchOk: false }))).outcome).toBe('failed');
  const d = deps({ share: async () => { throw new Error('NotAllowedError'); } });
  expect((await sharePhoto({ url: URL, caption: 'c' }, d)).outcome).toBe('failed');
});

test('without a clipboard the share still opens, and the caption is not claimed copied', async () => {
  const d = deps({ clip: false });
  expect(await sharePhoto({ url: URL, caption: 'c' }, d)).toEqual({ outcome: 'opened', captionCopied: false });
  expect(await copyCaption('c', d.navigator)).toBe(false);
});

test('the words never say it was posted or shared', () => {
  const lines = [
    shareToast({ outcome: 'opened', captionCopied: true }),
    shareToast({ outcome: 'opened', captionCopied: false }, 'Game Night'),
    shareToast({ outcome: 'failed', captionCopied: true }),
    shareToast({ outcome: 'unsupported', captionCopied: false }),
  ];
  expect(lines[0]).toBe('Caption copied — paste it in Instagram.');
  expect(lines[1]).toMatch(/Game Night/);
  for (const l of lines.filter(Boolean)) expect(l).not.toMatch(/\bposted\b|\bshared\b|\bon Instagram now\b/i);
  expect(shareToast({ outcome: 'cancelled', captionCopied: true })).toBe(null);   // she said never mind
});

test('the Instagram tag link is the tag page itself, for a real tag only', () => {
  expect(instagramTagUrl('#VidasFriendsgiving2026')).toBe('https://www.instagram.com/explore/tags/VidasFriendsgiving2026/');
  expect(instagramTagUrl('')).toBe(null);
  expect(instagramTagUrl('#')).toBe(null);
  expect(instagramTagUrl('#bad tag/../x')).toBe(null);
});

test('the file name is the event, plain', () => {
  expect(photoFileName({ name: 'Vida’s Friendsgiving' }, 2)).toBe('Vidas-Friendsgiving-2.jpg');
  expect(photoFileName({}, 1)).toBe('photo-1.jpg');
});
