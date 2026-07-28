import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── PhotoStrip — the house, flipped through in place ────────────────────────
//
// Host ask (2026-07-28): "if the other images can be pulled in and advance in
// place for property that would be helpful. the thumbnail should allow click to
// enlarge."
//
// Shared by BOTH sides on purpose: the host sees exactly what the guest sees on
// the invite, because it is the same component. One picture and a name was never
// enough to choose a house from.
//
// RULES:
//   · Photos are host-pasted https URLs, already gated in lib/lodgingIntel
//     (photoList). Nothing here fetches, scrapes or guesses an image.
//   · A photo that fails to load DROPS OUT rather than leaving a broken frame —
//     a dead listing image shouldn't make the option look broken.
//   · Advancing is in place; it never navigates and never casts a vote, so it
//     stops propagation to whatever selectable row it sits inside.
//   · The enlarged view is a real dialog: Escape closes, the arrows still work,
//     and the scrim is the click target for dismissal.

export default function PhotoStrip({ photos, alt, size = 64, radius = 'var(--r-md)' }) {
  const all = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const [dead, setDead] = useState([]);          // urls that failed to load
  const live = all.filter((u) => !dead.includes(u));
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  const n = live.length;
  const idx = n ? ((i % n) + n) % n : 0;
  const step = useCallback((d) => setI((v) => v + d), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, step]);

  if (!n) return null;
  const src = live[idx];
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  const arrow = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  };

  return (
    <>
      <span style={{ position: 'relative', width: size, height: size, flex: '0 0 auto', display: 'block' }}>
        <img
          src={src} alt={alt || ''} loading="lazy" referrerPolicy="no-referrer"
          onClick={(e) => { stop(e); setOpen(true); }}
          style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius, display: 'block', cursor: 'zoom-in' }}
          onError={() => setDead((d) => (d.includes(src) ? d : [...d, src]))}
        />
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" style={{ ...arrow, left: 2 }}
              onClick={(e) => { stop(e); step(-1); }}>‹</button>
            <button type="button" aria-label="Next photo" style={{ ...arrow, right: 2 }}
              onClick={(e) => { stop(e); step(1); }}>›</button>
            <span aria-hidden="true" style={{
              position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.8)',
            }}>{idx + 1}/{n}</span>
          </>
        )}
      </span>

      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={alt || 'Photo'}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
          <img src={src} alt={alt || ''} referrerPolicy="no-referrer"
            onClick={stop}
            style={{ maxWidth: '100%', maxHeight: '86vh', objectFit: 'contain', borderRadius: 10, display: 'block' }} />
          {n > 1 && (
            <>
              <button type="button" aria-label="Previous photo"
                onClick={(e) => { stop(e); step(-1); }}
                style={{ ...arrow, left: 12, width: 40, height: 40, fontSize: 22 }}>‹</button>
              <button type="button" aria-label="Next photo"
                onClick={(e) => { stop(e); step(1); }}
                style={{ ...arrow, right: 12, width: 40, height: 40, fontSize: 22 }}>›</button>
            </>
          )}
          <button type="button" aria-label="Close photo"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', top: 14, right: 14, width: 36, height: 36, borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 18, cursor: 'pointer',
            }}>×</button>
          {n > 1 && (
            <span aria-hidden="true" style={{
              position: 'fixed', bottom: 18, left: 0, right: 0, textAlign: 'center',
              fontSize: 13, fontWeight: 650, color: 'rgba(255,255,255,.85)',
            }}>{idx + 1} of {n}</span>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
