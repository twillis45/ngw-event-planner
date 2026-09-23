// ─── WHERE THIS APP IS SERVED FROM, IN ONE PLACE ─────────────────────────────
//
// `/ngw-event-planner/` was hand-typed across the vite config, index.html, three
// playwright configs, two e2e harnesses and a preview script. Moving the app to
// a domain of its own therefore meant editing nine files and hoping — the same
// shape as the brand name before lib/brand.js owned it, and the diet vocabulary
// before lib/dietRows.js did.
//
// THERE ARE TWO PATHS HERE, NOT ONE, and conflating them is the trap this file
// exists to remove. The Pages project site is served at SITE_BASE
// (`/ngw-event-planner/`); the hostv2 bundle sits UNDER it at HOSTV2_BASE
// (`/ngw-event-planner/hostv2/`); and the PWA manifest and touch icon live at
// the SITE root, one level ABOVE the bundle. A single "base" value cannot
// address all three, which is why index.html's manifest href could not simply
// be swapped for vite's own `%BASE_URL%`.
//
// TO MOVE TO A CUSTOM DOMAIN, CHANGE SITE_BASE TO '/' — that is the whole code
// change, and everything below follows. But DO IT LAST: DNS and the Pages
// custom-domain setting must answer first, because flipping this before the
// domain resolves leaves the live site asking for assets at a path that does
// not exist yet. `homepage` in package.json (which sets CRA's PUBLIC_URL) must
// move in the same commit, and `public/CNAME` must carry the domain.
//
// Overridable by env so a deploy can move without a code change at all:
//   SITE_BASE=/ npm run build
export const SITE_BASE = process.env.SITE_BASE || '/ngw-event-planner/';

/** The hostv2 bundle's own base — always SITE_BASE + 'hostv2/'. */
export const HOSTV2_BASE = `${SITE_BASE}hostv2/`;

/** Absolute URL for the local preview/e2e harness on a given port. */
export const previewUrl = (port) => `http://127.0.0.1:${port}${HOSTV2_BASE}`;

export default SITE_BASE;
