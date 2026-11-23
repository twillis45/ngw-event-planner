// ─── A TURNED IPAD MUST LAY OUT AT ITS NEW WIDTH (#236, 11/22/2026) ──────────
// On the owner's iPad (Chrome for iOS, so WebKit), turning the device
// mid-session left the LAYOUT viewport at the old orientation's width while the
// visible area, and window.innerWidth with it, took the new one. Landscape drew
// the app into the left 834pt with bare page beside it; portrait centered the
// board in ~1210pt and ran it off the right edge. Pixel evidence is in
// e2e/anIPadTurnedMidSessionReLaysOut.spec.mjs.
//
// The owner then reloaded in landscape and got the same 834pt page (no rail,
// --bg-band beside it), so the stale width can also be there from the first
// frame; this is checked at load, not only after a turn.
//
// A page cannot resize the layout viewport directly. It can change the viewport
// meta tag, and WebKit re-derives the layout size whenever the tag's arguments
// change. So once a turn has settled, if the layout width
// (documentElement.clientWidth) and the visible width (visualViewport.width,
// at scale 1) disagree, the tag is pinned to `width=<visible>`. The next turn
// puts `width=device-width` back before it measures again, so the pin never
// outlives the orientation it was made for.
//
// Left alone on purpose:
//   · a pinch zoom (scale != 1): the visible area is smaller by the host's own
//     choice, and that is not a stale layout;
//   · any screen where the two widths agree, which is every desktop, every
//     phone, and every clean turn. Nothing is written there.
// Not proven on a device: that iOS lays out at the pinned width. That is
// WebKit's documented handling of the tag, and the owner's iPad is the check.

const settleMs = 250;

export function makeLayoutViewportSync(win) {
  const doc = win.document;
  let pinned = null;      // the content we replaced, while a pin is in place
  let pinnedWidth = 0;
  let timer = null;

  const meta = () => doc.querySelector('meta[name="viewport"]');

  // The visible width. visualViewport.width is the first witness. The owner's
  // reload came up at 834pt with NO rail, so there the page's own widths may
  // all say 834; outerWidth is the web view's frame on iOS and is the second
  // witness. It is believed only on a touch screen (a desktop's outerWidth
  // includes the browser's own frame) and only when it fits on the screen (an
  // old Android reported it in device pixels).
  function visibleWidth(vv) {
    const fromVv = Math.round(vv.width);
    let coarse = false;
    try { coarse = win.matchMedia('(pointer:coarse)').matches; } catch (_) { coarse = false; }
    const ow = Math.round(win.outerWidth || 0);
    const scr = win.screen ? Math.max(win.screen.width || 0, win.screen.height || 0) : 0;
    if (coarse && ow > fromVv + 1 && scr && ow <= scr + 1) return ow;
    return fromVv;
  }

  function check() {
    const vv = win.visualViewport;
    const m = meta();
    if (!vv || !m) return 'none';
    // A pinch zoom shrinks the visible width by choice; it is neither a stale
    // layout nor a turn, so nothing is pinned or restored while zoomed.
    if (Math.abs((vv.scale || 1) - 1) > 0.01) return 'zoomed';
    const visible = visibleWidth(vv);
    if (pinned !== null && visible !== pinnedWidth) {
      // Turned again: give the engine its own device-width back first.
      m.setAttribute('content', pinned);
      pinned = null; pinnedWidth = 0;
      return 'restored';
    }
    if (pinned !== null) return 'pinned';
    const layout = doc.documentElement.clientWidth;
    if (!layout || !visible || Math.abs(layout - visible) <= 1) return 'agree';
    const content = m.getAttribute('content') || '';
    if (!/width\s*=\s*device-width/.test(content)) return 'none';
    pinned = content; pinnedWidth = visible;
    m.setAttribute('content', content.replace(/width\s*=\s*device-width/, `width=${visible}`));
    return 'pinned-now';
  }

  // WebKit re-lays out on a changed tag without firing `resize` or the media
  // lists' `change` (measured: the markup stayed on the old band while the
  // stylesheet had moved on). Everything that reads the width listens for
  // `resize`, so the page announces the change it just caused.
  const announce = () => win.requestAnimationFrame(() => win.dispatchEvent(new win.Event('resize')));

  function schedule() {
    if (timer) win.clearTimeout(timer);
    timer = win.setTimeout(() => {
      timer = null;
      const done = check();
      if (done === 'pinned-now') announce();
      // A restore changes the layout; measure again once it has landed.
      if (done === 'restored') { announce(); schedule(); }
    }, settleMs);
  }

  return { check, schedule };
}

export function watchLayoutViewport(win = typeof window === 'undefined' ? null : window) {
  if (!win || !win.document) return null;
  const sync = makeLayoutViewportSync(win);
  win.addEventListener('resize', sync.schedule);
  win.addEventListener('orientationchange', sync.schedule);
  if (win.visualViewport) win.visualViewport.addEventListener('resize', sync.schedule);
  // Not only after a turn: the owner's iPad also loaded a fresh landscape page
  // at the portrait width (reload screenshot, 11/22 7:31 PM). So it is measured
  // once the page has loaded, and again when a page comes back from the cache.
  win.addEventListener('load', sync.schedule);
  win.addEventListener('pageshow', sync.schedule);
  sync.schedule();
  return sync;
}
