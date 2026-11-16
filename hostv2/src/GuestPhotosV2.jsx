// GuestPhotosV2 — guests' photos on the invite, after the event (owner ruling
// B–E, board 11/16/2026). Free, inside the built caps (10 per guest, 300 per
// event). Every photo waits for the HOST's approval before other guests see
// it. Uploads open at the event's end in the guest's local time; the SERVER
// decides (uploadsOpen), this page only reports it.
//
// Consent (board, option C): the screen says plainly what sharing means and
// that a post can't be pulled back from here; "Keep my photos private to this
// event" (off by default) removes the Share button from all of her photos;
// the host can also stop sharing one photo. `shareable` from the server is the
// only permission for a Share button.
//
// Share (ruling D): copy the caption, then hand the photo FILE to the phone's
// share sheet. The person posts from their own app; nothing here posts. Where
// a browser can't hand over a file (most desktops): "Download photo" +
// "Copy caption". Never "posted" or "shared" as a fact (lib/photoShare).
import { useEffect, useRef, useState } from 'react';
import {
  isGuestPhotosApiConfigured, uploadGuestPhoto, fetchMyGuestPhotos, deleteMyGuestPhoto,
  fetchApprovedGuestPhotos, setMyPhotosPrivate,
} from '@app/lib/api/guestPhotos';
import { rsvpIdempotencyKey, existingRsvpKey } from '@app/lib/api/rsvp';
import { photoStatusLabel } from '@app/lib/guestInbox';
import { shareCaption, sharePhoto, canShareFiles, shareToast, copyCaption, instagramTagUrl, photoFileName } from '@app/lib/photoShare';

export const CONSENT_LINE = 'Approved photos can be shared by your host and other guests. Once someone shares a photo to Instagram or Facebook, deleting it here doesn’t remove that post.';

// "Download photo" for a cross-origin signed URL: the download attribute is
// ignored across origins, so the bytes come down first.
export async function downloadPhoto(url, fileName) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    return true;
  } catch { return false; }
}

// The Share / Download / Copy caption controls for one shareable photo. Used by
// the guest's gallery here and the host's Guest photos section.
export function PhotoShareControls({ photo, event, index = 1, onLine }) {
  const caption = shareCaption(event);
  const files = canShareFiles(typeof navigator !== 'undefined' ? navigator : undefined);
  const [busy, setBusy] = useState(false);
  const name = photoFileName(event, index);
  const share = async () => {
    if (busy) return;
    setBusy(true);
    const r = await sharePhoto({ url: photo.url, caption, fileName: name });
    setBusy(false);
    onLine(shareToast(r, caption));
  };
  if (!photo || !photo.url) return null;
  return files ? (
    <button className="mini" data-photo-share onClick={share} disabled={busy}>{busy ? 'Opening…' : 'Share'}</button>
  ) : (
    <>
      <button className="mini" data-photo-download onClick={async () => onLine((await downloadPhoto(photo.url, name)) ? null : 'The photo didn’t download. Try again.')}>Download photo</button>
      {caption && (
        <button className="mini" data-photo-copy onClick={async () => onLine((await copyCaption(caption, navigator)) ? 'Caption copied.' : `Copy it yourself: ${caption}`)}>Copy caption</button>
      )}
    </>
  );
}

export default function GuestPhotosV2({ code, event, eventKey, guestName, anchorId, onOpenChange }) {
  const [mine, setMine] = useState(null);          // { photos, remaining, uploadsOpen, keepPrivate } | null
  const [loadFailed, setLoadFailed] = useState(false);
  const [approved, setApproved] = useState([]);
  const [name, setName] = useState('');
  const [keepPrivate, setKeepPrivate] = useState(false);
  const [busy, setBusy] = useState('');            // '' | 'upload' | photo id
  const [line, setLine] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    // A key is minted only here, on a page that offers photos: listing her own
    // photos with a fresh key is an empty list, never another guest's.
    const key = existingRsvpKey(eventKey) || rsvpIdempotencyKey(eventKey);
    const [m, a] = await Promise.all([fetchMyGuestPhotos(code, key), fetchApprovedGuestPhotos(code)]);
    if (m.ok) { setMine(m); setKeepPrivate(m.keepPrivate); setLoadFailed(false); } else setLoadFailed(true);
    if (onOpenChange) onOpenChange(m.ok ? m.uploadsOpen : null);
    if (a.ok) setApproved(a.photos);
  };
  useEffect(() => { load(); }, [code, eventKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!name && guestName) setName(guestName); }, [guestName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isGuestPhotosApiConfigured()) return null;
  if (loadFailed && !mine) {
    return (
      <div className="card no-hover guest-photos" id={anchorId} data-guest-photos style={{ marginTop: 14 }}>
        <div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
          <h2 className="shelf-label" style={{ margin: '0 0 6px' }}>Photos from the day</h2>
          <p className="grounding" style={{ margin: 0 }}>Photos couldn’t load. Check your connection and reopen this invite.</p>
        </div>
      </div>
    );
  }
  if (!mine) return null;

  const key = () => existingRsvpKey(eventKey) || rsvpIdempotencyKey(eventKey);
  const tag = String((event && event.hashtag) || '').trim();
  const tagUrl = instagramTagUrl(tag);

  const onFiles = async (list) => {
    const files = Array.from(list || []).slice(0, Math.max(0, mine.remaining));
    if (!files.length) return;
    if (!name.trim()) { setErr('Add your name so your host knows whose photos these are.'); return; }
    setErr(''); setLine(''); setBusy('upload');
    let added = 0;
    for (const file of files) {
      try {
        await uploadGuestPhoto(code, { guestKey: key(), name: name.trim(), file, keepPrivate });
        added += 1;
      } catch (e) {
        setErr(e && e.message && e.status && e.status !== 500 ? e.message : 'A photo didn’t upload. Try it again.');
        break;
      }
    }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
    if (added) setLine(`${added === 1 ? 'Photo added' : `${added} photos added`} — your host approves each one before other guests see it.`);
    await load();
  };

  const toggleKeepPrivate = async (on) => {
    setKeepPrivate(on); setErr('');
    if (!(mine.photos || []).length) return;     // rides the next upload instead
    try { await setMyPhotosPrivate(code, key(), on); await load(); }
    catch { setKeepPrivate(!on); setErr('That didn’t save. Check your connection and try again.'); }
  };

  const removeMine = async (id) => {
    setBusy(id); setErr(''); setLine('');
    try { await deleteMyGuestPhoto(code, key(), id); setLine('Photo deleted.'); }
    catch { setErr('That photo was not deleted. Try again.'); }
    setBusy('');
    await load();
  };

  const myPhotos = mine.photos || [];
  return (
    <div className="card no-hover guest-photos" id={anchorId} data-guest-photos style={{ marginTop: 14 }}>
      <div className="card-head" style={{ cursor: 'default', padding: '14px 18px' }}>
        <h2 className="shelf-label" style={{ margin: '0 0 6px' }}>Photos from the day</h2>
        {tag && (
          <p className="grounding" data-photos-tag style={{ margin: '0 0 8px' }}>
            {tag}
            {tagUrl && <> · <a href={tagUrl} target="_blank" rel="noopener noreferrer" className="tap-44" style={{ color: 'inherit' }}>See posts with this tag on Instagram</a></>}
          </p>
        )}
        {!mine.uploadsOpen ? (
          <p className="grounding" data-photos-closed style={{ margin: 0 }}>Photos open after the event.</p>
        ) : (
          <>
            <p className="grounding" data-photo-consent style={{ margin: '0 0 8px' }}>{CONSENT_LINE}</p>
            <label className="guest-optin" data-keep-private>
              <input type="checkbox" checked={keepPrivate} onChange={(e) => toggleKeepPrivate(e.target.checked)} />
              <span>Keep my photos private to this event</span>
            </label>
            {!myPhotos.length && (
              <input className="field" style={{ maxWidth: 'none', marginTop: 8, fontSize: 'var(--t-input)' }} placeholder="Your name"
                autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name to go with your photos" />
            )}
            {mine.remaining > 0 ? (
              <div className="actions-row" style={{ marginTop: 10, alignItems: 'center' }}>
                <label className="cta guest-photo-pick" aria-disabled={busy === 'upload' || undefined}>
                  {busy === 'upload' ? 'Adding…' : 'Add your photos'}
                  {/* No HEIC in accept: iOS converts to JPEG for a web page that asks for one. */}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                    disabled={busy === 'upload'} onChange={(e) => onFiles(e.target.files)} data-photo-input />
                </label>
                <span className="of">You can add {mine.remaining} more.</span>
              </div>
            ) : (
              <p className="grounding" style={{ margin: '10px 0 0' }}>You’ve added 10 photos, the most one guest can. Delete one to add another.</p>
            )}
          </>
        )}
        {err && <p className="grounding" role="alert" style={{ margin: '8px 0 0', color: 'var(--danger)' }}>{err}</p>}
        {line && <p className="grounding" role="status" data-photos-status style={{ margin: '8px 0 0' }}>{line}</p>}

        {myPhotos.length > 0 && (
          <>
            <div className="shelf-label" style={{ margin: '14px 0 6px' }}>Your photos</div>
            <ul className="photo-grid" data-my-photos>
              {myPhotos.map((p) => (
                <li key={p.id} className="photo-cell" data-status={p.status}>
                  {p.url ? <img src={p.url} alt="A photo you added" loading="lazy" /> : <div className="photo-missing">Photo</div>}
                  <div className="photo-meta">{photoStatusLabel(p.status)}</div>
                  <button className="mini" onClick={() => removeMine(p.id)} disabled={busy === p.id}>{busy === p.id ? 'Deleting…' : 'Delete this photo'}</button>
                </li>
              ))}
            </ul>
          </>
        )}

        {approved.length > 0 && (
          <>
            <div className="shelf-label" style={{ margin: '14px 0 6px' }}>From everyone</div>
            <ul className="photo-grid" data-approved-photos>
              {approved.map((p, i) => (
                <li key={p.id} className="photo-cell">
                  {p.url ? <img src={p.url} alt={`Photo ${i + 1} from the day`} loading="lazy" /> : <div className="photo-missing">Photo</div>}
                  {p.shareable && <div className="actions-row photo-acts"><PhotoShareControls photo={p} event={event} index={i + 1} onLine={(l) => setLine(l || '')} /></div>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
