// ─── THE PRECACHE MANIFEST IS BUILT, NOT WRITTEN ───────────────────────────
//
// The 2026-08-16 offline-shell board upheld the ban on a hand-rolled worker
// and named what a revisit must carry: "a build-time precache manifest, a
// tested update path, and a kill switch". This is the first of the three.
//
// The plugin reads the bundle vite ACTUALLY emitted and writes the list into
// the worker, so the two cannot drift. A hand-kept list is how a worker ends
// up precaching a chunk that no longer exists, failing install, and leaving
// a registration with an empty cache — worse than no worker at all.
import { createHash } from 'node:crypto';
import { SW_TEMPLATE } from './swTemplate.js';

/** Extensions worth precaching: the shell, and nothing that is data. */
const SHELL_EXT = /\.(js|css|html|woff2?|png|svg|ico|webp)$/i;

/**
 * @param {object} [opts]
 * @param {string} [opts.siteBase]  the site root RELATIVE TO THE BUNDLE, where
 *                                  sw-kill.txt lives (default '../')
 */
export default function offlineShell({ siteBase = '../' } = {}) {
  // ── RELATIVE, SO ONE BUILD SERVES TWO ADDRESSES (domain move, 11/20/2026) ─
  // The precache list used to carry the absolute base, `/ngw-event-planner/
  // hostv2/...`. That once bit a `--base=/` build (every entry 404'd and the
  // install cached nothing), and it would bite again at
  // events.noguessworksystems.com/hostv2/, where the same bundle is served
  // under a different prefix. So the list is now relative to the bundle and the
  // worker prefixes it with its own directory at runtime (swTemplate ROOT).
  // Whatever base vite was given, sw.js sits in the bundle directory, so that
  // is always right.
  //
  // ── THE SHELL IS THE DIRECTORY URL, NOT index.html ─────────────────────
  // Caught by the offline drive, which is the whole reason the board demanded
  // one. A NAVIGATION requests the directory (`…/hostv2/`), not
  // `…/hostv2/index.html`, so both are precached: '' (the directory, which the
  // worker turns into ROOT) and 'index.html'.
  return {
    name: 'ngw-offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      // The build id IS the manifest's hash, so an identical bundle produces
      // an identical worker (no needless cache churn) and any change to the
      // shipped assets produces a new cache name. That is the update path.
      const { urls, buildId } = precacheFor(Object.keys(bundle), '');

      const source = SW_TEMPLATE
        .replace('__BUILD_ID__', buildId)
        .replace('__PRECACHE__', JSON.stringify(urls))
        .replace('__BASE__', siteBase);

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/**
 * The manifest logic, shared by the plugin (with base '') and the tests.
 * Same filter, same ordering, same id.
 */
export function precacheFor(fileNames, base) {
  const urls = fileNames.filter((f) => SHELL_EXT.test(f)).map((f) => base + f);
  for (const u of [base, `${base}index.html`]) if (!urls.includes(u)) urls.push(u);
  urls.sort();
  return {
    urls,
    buildId: createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12),
  };
}
