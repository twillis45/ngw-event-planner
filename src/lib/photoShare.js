// ─── SHARE A PHOTO: HAND IT TO THE PERSON'S OWN APP (owner ruling 11/16/2026) ─
//
// "Share to Instagram / Facebook" is the phone's share sheet with the photo as
// a file. Instagram ignores a prefilled caption, so the caption (the event's
// name + the host's hashtag, when the host turned one on) is copied to the
// clipboard FIRST. The app never posts and never links an account; the person
// posts from their own app, or doesn't. Free (board 10–0), never automatic.
//
// UX_07: this is a LIGHT/DEEP handoff. The words say what happened — "Caption
// copied — paste it in Instagram." — never "posted" or "shared" as a fact.
// The board (8–2): the tag is shown, never a call to post publicly.
//
// PURE except for the injected browser pieces (navigator, fetch, File), so
// every branch is tested in jest without a browser.

const clean = (s) => String(s == null ? '' : s).trim();

/** Event name + the host's hashtag. '' when there is nothing true to say. */
export function shareCaption(event) {
  const e = event || {};
  return [clean(e.name), clean(e.hashtag)].filter(Boolean).join(' ');
}

/** True only where the share sheet can take a photo FILE (most phones; not most desktops). */
export function canShareFiles(nav) {
  try {
    if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
    const probe = typeof File === 'function' ? [new File([''], 'probe.jpg', { type: 'image/jpeg' })] : [{}];
    return Boolean(nav.canShare({ files: probe }));
  } catch {
    return false;
  }
}

/** Copy the caption; true only when the clipboard took it. */
export async function copyCaption(caption, nav) {
  try {
    if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function') return false;
    await nav.clipboard.writeText(caption);
    return true;
  } catch {
    return false;
  }
}

/** "Vida’s Friendsgiving" → "Vidas-Friendsgiving-2.jpg". */
export function photoFileName(event, n = 1) {
  const base = clean(event && event.name).replace(/[’']/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || 'photo'}-${n}.jpg`;
}

/**
 * Copy the caption, then open the share sheet with the photo as a JPEG file.
 * @returns {{ outcome: 'opened'|'cancelled'|'unsupported'|'failed', captionCopied: boolean }}
 *   'opened' means the share sheet opened — NOT that anything was posted.
 */
export async function sharePhoto({ url, caption, fileName = 'photo.jpg' }, deps = {}) {
  const nav = deps.navigator !== undefined ? deps.navigator : (typeof navigator !== 'undefined' ? navigator : undefined);
  const doFetch = deps.fetch || (typeof fetch === 'function' ? fetch : null);
  const FileCtor = deps.File || (typeof File === 'function' ? File : null);
  const captionCopied = await copyCaption(caption, nav);
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function' || !FileCtor || !doFetch) {
    return { outcome: 'unsupported', captionCopied };
  }
  let file;
  try {
    const res = await doFetch(url);
    if (!res || !res.ok) return { outcome: 'failed', captionCopied };
    const blob = await res.blob();
    file = new FileCtor([blob], fileName, { type: 'image/jpeg' });
  } catch {
    return { outcome: 'failed', captionCopied };
  }
  let ok = false;
  try { ok = Boolean(nav.canShare({ files: [file] })); } catch { ok = false; }
  if (!ok) return { outcome: 'unsupported', captionCopied };
  try {
    await nav.share({ files: [file], text: caption });
    return { outcome: 'opened', captionCopied };
  } catch (e) {
    if (e && e.name === 'AbortError') return { outcome: 'cancelled', captionCopied };
    return { outcome: 'failed', captionCopied };
  }
}

/** The one line after a share attempt, or null when there is nothing to say. */
export function shareToast(result, caption = '') {
  const r = result || {};
  if (r.outcome === 'cancelled') return null;
  if (r.outcome === 'opened') {
    return r.captionCopied
      ? 'Caption copied — paste it in Instagram.'
      : `Add the caption yourself: ${caption}`.trim();
  }
  if (r.outcome === 'unsupported') {
    return r.captionCopied
      ? 'This browser can’t hand a photo to another app. Caption copied — download the photo to post it.'
      : 'This browser can’t hand a photo to another app. Download the photo to post it.';
  }
  return 'The photo didn’t open in your share sheet. Try again, or download it.';
}

/** Instagram's own page for the tag. null for anything that isn't a plain tag. */
export function instagramTagUrl(hashtag) {
  const body = clean(hashtag).replace(/^#/, '');
  if (!/^[A-Za-z0-9_]{1,30}$/.test(body)) return null;
  return `https://www.instagram.com/explore/tags/${body}/`;
}
