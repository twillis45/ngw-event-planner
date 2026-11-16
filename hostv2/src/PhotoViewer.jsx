// PhotoViewer — the full-screen photo view (owner, 11/16/2026: "made for
// enjoying the views… built for multiple images").
//
// The grid shows small thumbnails; tapping one opens this. The thumbnail is
// shown at once and the full photo fades in over it when it arrives, so a tap
// never shows an empty screen. Swipe or the arrow keys move between photos,
// the next and previous full photos load ahead, and Escape or Close returns to
// the grid with focus where it was. Signed photo URLs last a few minutes: when
// one has expired, `onExpired` asks the page to fetch fresh ones.
//
// `actions(photo)` renders the controls under the photo (Share, Delete, …), so
// the grid itself stays a quiet wall of pictures.
import { useEffect, useRef, useState } from 'react';

export default function PhotoViewer({ photos, index, onIndex, onClose, label = (i, n) => `Photo ${i + 1} of ${n}`, actions, onExpired }) {
  const n = photos.length;
  const p = photos[index];
  const closeRef = useRef(null);
  const start = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [dx, setDx] = useState(0);

  const go = (d) => { if (n > 1) onIndex((index + d + n) % n); };

  useEffect(() => { setLoaded(false); setDx(0); }, [index, p && p.url]);
  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) closeRef.current.focus();
    return () => { document.body.style.overflow = overflow; if (before && before.focus) before.focus(); };
  }, []);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  // Load the neighbors' full photos ahead, so a swipe lands on a sharp picture.
  useEffect(() => {
    if (n < 2) return;
    [photos[(index + 1) % n], photos[(index - 1 + n) % n]].forEach((q) => {
      if (q && q.url) { const im = new Image(); im.src = q.url; }
    });
  }, [index, photos, n]);

  if (!p) return null;
  const down = (e) => { start.current = e.clientX; };
  const move = (e) => { if (start.current != null) setDx(e.clientX - start.current); };
  const up = () => {
    if (start.current == null) return;
    const d = dx; start.current = null; setDx(0);
    if (d < -50) go(1); else if (d > 50) go(-1);
  };

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={label(index, n)} data-photo-viewer>
      <div className="pv-top">
        <span className="pv-count" data-pv-count>{n > 1 ? `${index + 1} of ${n}` : ''}</span>
        <button ref={closeRef} className="pv-btn" onClick={onClose}>Close</button>
      </div>
      <div className="pv-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}>
        {!loaded && p.thumb && p.thumb !== p.url && <img className="pv-img pv-thumb" src={p.thumb} alt="" aria-hidden="true" draggable="false" />}
        {p.url
          ? <img key={p.url} className={'pv-img pv-full' + (loaded ? ' is-in' : '')} src={p.url} alt={label(index, n)} draggable="false"
              onLoad={() => setLoaded(true)} onError={() => onExpired && onExpired()} />
          : <div className="pv-missing">This photo couldn’t load.</div>}
      </div>
      {n > 1 && (
        <>
          <button className="pv-btn pv-nav pv-prev" aria-label="Previous photo" onClick={() => go(-1)}>‹</button>
          <button className="pv-btn pv-nav pv-next" aria-label="Next photo" onClick={() => go(1)}>›</button>
        </>
      )}
      {actions && <div className="pv-acts">{actions(p, index)}</div>}
    </div>
  );
}

/** The grid of thumbnails. Each cell is a button that opens the viewer. */
export function PhotoWall({ photos, onOpen, badge, label = (i) => `Open photo ${i + 1}`, ...rest }) {
  return (
    <ul className="photo-wall" {...rest}>
      {photos.map((p, i) => (
        <li key={p.id} className="photo-tile" data-status={p.status}>
          <button type="button" className="photo-tile-btn" onClick={() => onOpen(i)} aria-label={label(i, p)}>
            {(p.thumb || p.url)
              ? <img src={p.thumb || p.url} alt="" loading="lazy" decoding="async" width="160" height="160" draggable="false" />
              : <span className="photo-missing">Photo</span>}
            {badge && badge(p) && <span className="photo-badge">{badge(p)}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
