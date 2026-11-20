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
// SINCE THE DOMAIN MOVE (11/20/2026) THE SHIPPED BUILD NAMES NO PREFIX AT ALL:
// vite builds with base './', the worker reads its own directory at runtime,
// and index.html reaches the site root as '../'. So one artifact serves both
// /ngw-event-planner/hostv2/ (twillis45.github.io) and /hostv2/
// (events.noguessworksystems.com). What is left here is only where the LOCAL
// preview / e2e harness mounts dist, which stays the old prefix so the
// harness keeps exercising the deep path.
//
//   SITE_BASE=/ npx playwright test …   mounts the harness at /hostv2/ instead
export const SITE_BASE = process.env.SITE_BASE || '/ngw-event-planner/';

/** The hostv2 bundle's own base — always SITE_BASE + 'hostv2/'. */
export const HOSTV2_BASE = `${SITE_BASE}hostv2/`;

/** Absolute URL for the local preview/e2e harness on a given port. */
export const previewUrl = (port) => `http://127.0.0.1:${port}${HOSTV2_BASE}`;

export default SITE_BASE;
