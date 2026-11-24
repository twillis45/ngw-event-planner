// HostPhotoRow — the host's own photo, Add / Change / Remove (owner,
// 11/24/2026: renders r3-3 "Your photo" and r3-4 You & settings). One photo
// per account, opt-in; ONE component in both places. The photo is cropped to
// a square here before anything is sent, then the server re-encodes it
// (backend host_photos.py). The profile keeps only its version
// (profile.hostPhoto), never the image. Guests see it beside her name on the
// invite; with none, her initials.
import { useEffect, useRef, useState } from 'react';
import { uploadHostPhoto, removeHostPhoto, myHostPhotoUrl, isHostPhotoApiConfigured } from '@app/lib/api/hostPhoto';

const EDGE = 400;
const initialsOf = (name) => String(name || '').split(/\s*(?:&|\+|\/|,|\band\b)\s*/)[0]
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** The host's photo as an object URL for her own screens (null when none). */
export function useMyHostPhoto(version) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let live = true;
    if (!version) { setUrl(null); return undefined; }
    myHostPhotoUrl(version).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [version]);
  return url;
}

// The centered square of the picked image at this zoom, as a 400x400 canvas.
function cropSquare(img, zoom) {
  const c = document.createElement('canvas');
  c.width = EDGE; c.height = EDGE;
  const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
  const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
  c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, EDGE, EDGE);
  return c;
}

export default function HostPhotoRow({ profile, patchProfile, signedIn, hostName, variant = 'panel' }) {
  const version = (profile && profile.hostPhoto) || null;
  const url = useMyHostPhoto(version);
  const fileRef = useRef(null);
  const [crop, setCrop] = useState(null);       // { img, zoom, preview }
  const [busy, setBusy] = useState('');          // '' | 'up' | 'rm'
  const [err, setErr] = useState('');
  const name = String(hostName || (profile && profile.name) || '').trim();
  const ini = initialsOf(name);
  const canEdit = signedIn && isHostPhotoApiConfigured();

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr('');
    const img = new Image();
    img.onload = () => setCrop({ img, zoom: 1, preview: cropSquare(img, 1).toDataURL('image/jpeg', 0.9) });
    img.onerror = () => setErr('That file isn’t a photo this browser can read. Try a JPEG or PNG.');
    img.src = URL.createObjectURL(f);
  };
  const zoomTo = (z) => setCrop((c) => (c ? { ...c, zoom: z, preview: cropSquare(c.img, z).toDataURL('image/jpeg', 0.9) } : c));
  const use = async () => {
    if (!crop || busy) return;
    setBusy('up'); setErr('');
    try {
      const blob = await new Promise((res, rej) => cropSquare(crop.img, crop.zoom).toBlob((b) => (b ? res(b) : rej(new Error('no photo'))), 'image/jpeg', 0.9));
      const r = await uploadHostPhoto(blob);
      if (!r || !r.version) throw new Error('no version');
      patchProfile({ hostPhoto: r.version }, 'Your photo is on your invites.');
      setCrop(null);
    } catch (e) {
      setErr((e && e.status && e.message) || 'Your photo wasn’t saved. Check your connection and try again.');
    }
    setBusy('');
  };
  const remove = async () => {
    if (busy) return;
    setBusy('rm'); setErr('');
    try {
      await removeHostPhoto();
      patchProfile({ hostPhoto: null }, 'Photo removed — guests see your initials.');
    } catch {
      setErr('Your photo wasn’t removed. Check your connection and try again.');
    }
    setBusy('');
  };

  const disc = url
    ? <img className="hpr-disc" data-host-avatar src={url} alt={name ? 'Your photo, ' + name : 'Your photo'} />
    : version
      ? <span className="hpr-disc" aria-hidden="true" />
      : <span className={'hpr-disc ' + (variant === 'panel' ? 'empty' : 'ini')} aria-hidden="true">{variant === 'panel' ? '+' : ini}</span>;
  const line = variant === 'settings'
    ? 'Guests see it beside your name on your invites. With no photo, they see your initials.'
    : version
      ? 'Shows beside your name on the invite. It’s the same photo as in You & settings.'
      : `Guests see your initials${ini ? ', ' + ini : ''}, until you add one.`;

  return (
    <div className={'hpr hpr-' + variant} data-host-photo-row>
      <div className="hpr-main">
        {disc}
        {/* Her name under the photo; the account line ("Signed in as …") stays
            once, in Your account below. */}
        {variant === 'settings' && name && (
          <div className="hpr-who"><div className="hpr-name">{name}</div></div>
        )}
        {canEdit && (
          <div className="hpr-acts">
            <button type="button" className="mini" disabled={!!busy} onClick={() => fileRef.current && fileRef.current.click()}>
              {version ? (variant === 'settings' ? 'Change photo' : 'Change') : 'Add a photo'}
            </button>
            {version && <button type="button" className="mini hpr-rm" disabled={!!busy} onClick={remove}>{busy === 'rm' ? 'Removing…' : 'Remove'}</button>}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hpr-file" onChange={pick} aria-label="Choose a photo" tabIndex={-1} />
      </div>
      <p className="grounding hpr-line">{canEdit ? line : 'Sign in to add your photo. It’s kept with your account; until then guests see your initials.'}</p>
      {crop && (
        <div className="hpr-crop" data-photo-crop role="group" aria-label="Crop your photo">
          <div className="hpr-frame" data-crop-frame><img src={crop.preview} alt="Your photo, cropped square" /></div>
          <label className="hpr-zoom">
            <span>Zoom</span>
            <input type="range" min="1" max="3" step="0.05" value={crop.zoom} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="Zoom" />
          </label>
          <div className="actions-row">
            <button type="button" className="mini" disabled={busy === 'up'} onClick={use}>{busy === 'up' ? 'Saving…' : 'Use this photo'}</button>
            <button type="button" className="mini" disabled={busy === 'up'} onClick={() => setCrop(null)}>Cancel</button>
          </div>
        </div>
      )}
      {err && <p className="grounding hpr-err" role="alert">{err}</p>}
    </div>
  );
}
