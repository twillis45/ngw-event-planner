// ─── Public vendor-brief URL bridge (V2 → the one existing brief page) ─────────
//
// There is exactly ONE public vendor-brief surface: PublicVendorBriefRoute in
// the original app (App.js), reached as  {legacy app URL}?vendor={token}. The
// token is either a VB2 short server-resolvable code (lib/api/vendorBrief.js,
// resolved live by the backend) or a legacy frozen base64 snapshot — the route
// handles both. That page is app-independent of whoever MINTED the link.
//
// The V2 host shell ships as a static bundle UNDER the same Pages site, one
// directory down:  {site}/ngw-event-planner/hostv2/  (see hostv2/vite.config
// `base`). So a brief link built naively from the V2 origin+pathname — or any
// vendor link that lands on the V2 path — would dead-end in a HOST shell
// instead of the vendor's brief. This helper computes where such a link really
// belongs: the same query on the parent path, where the original app serves
// the one true brief page. No second brief surface is ever rendered.
//
// Returns null (meaning: do NOT redirect) when
//   - there is no ?vendor= token, or
//   - the app is not mounted under a …/hostv2/ subpath (dev servers run each
//     app at its own root, so the parent path is NOT the legacy app there —
//     redirecting would self-loop or point at nothing).
export function legacyVendorBriefUrl(href) {
  let u;
  try { u = new URL(href); } catch { return null; }
  const token = u.searchParams.get('vendor');
  if (!token || !token.trim()) return null;
  // Only rewrite when the FINAL path segment is hostv2 (with or without a
  // trailing slash / index.html) — the production Pages layout. Anything else
  // (dev root '/', deep links) is not the deployed-next-to-legacy shape.
  const m = u.pathname.match(/^(.*\/)hostv2(?:\/(?:index\.html)?)?$/);
  if (!m) return null;
  return `${u.origin}${m[1]}?vendor=${encodeURIComponent(token)}`;
}
