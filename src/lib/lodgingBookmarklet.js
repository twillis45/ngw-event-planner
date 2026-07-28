// ─── "SEND TO EVENT BOSS" — the zero-paste return trip ───────────────────────
//
// Host, 2026-07-28: "if you initially tested by creating a search on the vrbo and
// airbnb platforms to create a list … why does the host have to pull a url?"
//
// The answer was about WHO does the reading. When this was tested by hand, the
// reading was done by the host's own browser: their profile, their IP, a page
// already open in front of them. The app's server doing the same thing is
// harvesting — the never-build line — and it mostly fails anyway (Vrbo refuses
// our single-page read from Render in production, and that is the easy case).
//
// This closes the gap without moving that line: the host's browser keeps doing
// the reading, on a page they are already looking at, on a click they make. The
// bookmarklet is a DUMB COLLECTOR — it pairs each listing link with the text of
// its card and hands that over. It makes no judgements, keeps no state, contacts
// no server, and runs only when clicked.
//
// WHY A BOOKMARKLET AND NOT AN EXTENSION: no store review, no permissions
// prompt, no background process, nothing installed that can run when the host
// isn't looking. The whole thing is visible in the bookmark's own URL.
//
// WHY IT CARRIES NO PARSER: the interpretation lives in lodgingIntel
// (candidatesFromGroups), which both this and the paste path call. A second copy
// would drift the first time a platform renamed a label — and the copy sitting
// in someone's bookmarks bar is the one we could never re-deploy.

/** Hosts whose result pages this may read. Same list the server unfurl allows. */
export const BOOKMARKLET_HOSTS = ['airbnb.', 'vrbo.com', 'booking.com'];

// Caps. The payload rides in a URL fragment, and a fragment is untrusted input
// even when we wrote the code that produced it — a host could click the
// bookmarklet on any page, and a crafted page could stuff it.
export const MAX_CANDIDATES = 40;
const MAX_LINES = 24;
const MAX_LINE = 120;
const MAX_URL = 400;

/**
 * The bookmarklet source, as a `javascript:` URL.
 *
 * Deliberately readable rather than minified: a host (or their IT) can read
 * exactly what it does before putting it in their bookmarks bar, and "you can
 * read it" is the only real assurance a bookmarklet can offer.
 *
 * @param {string} appUrl where the app lives, e.g. https://…/ngw-event-planner/hostv2/
 */
export function buildBookmarklet(appUrl) {
  const target = String(appUrl || '').split('#')[0];
  // eslint-disable-next-line no-useless-concat
  const src = `(function(){
var L=[].slice.call(document.querySelectorAll('a[href]')),S={},O=[];
for(var i=0;i<L.length;i++){
  var h=L[i].href||'';
  if(!/^https:\\/\\//.test(h))continue;
  if(!(/airbnb\\.[a-z.]+\\/rooms\\/\\d/.test(h)||/vrbo\\.com\\/\\d/.test(h)||/booking\\.com\\/hotel\\//.test(h)))continue;
  var u=h.split('?')[0].split('#')[0];
  if(S[u])continue;S[u]=1;
  var p=L[i],b='';
  for(var j=0;j<6&&p;j++){p=p.parentElement;if(!p)break;var t=(p.innerText||'');if(t.length>b.length)b=t;if(b.length>60)break;}
  var lines=b.split('\\n').map(function(x){return x.replace(/\\s+/g,' ').trim();}).filter(Boolean).slice(0,${MAX_LINES});
  O.push({url:u.slice(0,${MAX_URL}),lines:lines});
  if(O.length>=${MAX_CANDIDATES})break;
}
if(!O.length){alert('No rental listings found on this page. Open a search results page or a listing, then click this again.');return;}
window.open('${target}#lodging='+encodeURIComponent(JSON.stringify(O)),'_blank');
})();`;
  return 'javascript:' + encodeURIComponent(src.replace(/\n\s*/g, ''));
}

/**
 * Read what the bookmarklet sent, defensively.
 *
 * This is UNTRUSTED INPUT. The fragment arrives from whatever page the host had
 * open, and a page we don't control produced the text. Nothing here is
 * evaluated, every string is capped, the array is capped, and any URL that
 * isn't https on a platform we model is dropped — the same rule the server's
 * unfurl allowlist applies, for the same reason.
 *
 * @returns {Array<{url:string, lines:string[]}>} groups ready for
 *   candidatesFromGroups — never null, empty on anything malformed.
 */
export function parseBookmarkletPayload(raw) {
  let text = String(raw || '');
  if (!text) return [];
  try { text = decodeURIComponent(text); } catch (_e) { /* already decoded */ }
  let data;
  try { data = JSON.parse(text); } catch (_e) { return []; }
  if (!Array.isArray(data)) return [];

  const out = [];
  for (const row of data.slice(0, MAX_CANDIDATES)) {
    if (!row || typeof row !== 'object') continue;
    const url = String(row.url || '').slice(0, MAX_URL);
    if (!/^https:\/\//i.test(url)) continue;
    let host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch (_e) { continue; }
    if (!BOOKMARKLET_HOSTS.some((h) => host.includes(h))) continue;
    const lines = (Array.isArray(row.lines) ? row.lines : [])
      .slice(0, MAX_LINES)
      .map((l) => String(l == null ? '' : l).replace(/\s+/g, ' ').trim().slice(0, MAX_LINE))
      .filter(Boolean);
    out.push({ url, lines });
  }
  return out;
}

/** Pull the payload out of a location hash, if one is there. */
export function lodgingHashPayload(hash) {
  const m = String(hash || '').match(/[#&]lodging=([^&]+)/);
  return m ? m[1] : '';
}
