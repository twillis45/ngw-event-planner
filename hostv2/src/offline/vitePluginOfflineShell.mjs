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
 * @param {object} opts
 * @param {string} opts.base   the bundle's base path (HOSTV2_BASE)
 * @param {string} opts.siteBase  the site root, where sw-kill.txt lives
 */
export default function offlineShell({ base, siteBase }) {
  // THE RESOLVED BASE, NOT THE CONSTANT. Caught by reading the emitted
  // worker: a `--base=/` build (the local sim build does exactly that) still
  // precached `/ngw-event-planner/hostv2/...`, so every entry 404'd, the
  // install cached nothing, and the registration survived with an empty
  // cache — the precise failure the per-URL catch below exists to soften.
  // vite knows the real base; ask it rather than trusting what we passed in.
  let resolvedBase = base;
  let resolvedSite = siteBase;
  return {
    name: 'ngw-offline-shell',
    apply: 'build',
    configResolved(config) {
      if (config.base) {
        resolvedBase = config.base.endsWith('/') ? config.base : `${config.base}/`;
        // The kill file sits at the SITE root, one level above the bundle.
        resolvedSite = resolvedBase.replace(/hostv2\/$/, '');
      }
    },
    generateBundle(_options, bundle) {
      const base = resolvedBase;
      const siteBase = resolvedSite;
      const urls = Object.keys(bundle)
        .filter((f) => SHELL_EXT.test(f))
        .map((f) => base + f);
      // ── THE SHELL IS THE DIRECTORY URL, NOT index.html ─────────────────
      // Caught by the offline drive, which is the whole reason the board
      // demanded one. The first cut precached and matched `<base>index.html`,
      // and a NAVIGATION does not request that — it requests the directory,
      // `/ngw-event-planner/hostv2/`. So the fallback had nothing to match
      // and the offline reload failed, which is precisely how the previous
      // attempt at this worker died.
      //
      // Both are precached: the directory is what a navigation asks for, and
      // index.html is what a deep link to the file itself would ask for.
      const shell = base;
      for (const u of [base, `${base}index.html`]) if (!urls.includes(u)) urls.push(u);
      urls.sort();

      // The build id IS the manifest's hash, so an identical bundle produces
      // an identical worker (no needless cache churn) and any change to the
      // shipped assets produces a new cache name. That is the update path.
      const buildId = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12);

      const source = SW_TEMPLATE
        .replace('__BUILD_ID__', buildId)
        .replace('__PRECACHE__', JSON.stringify(urls))
        .replace('__SHELL__', shell)
        .replace('__BASE__', siteBase);

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/**
 * The manifest logic on its own, so a test can assert what goes in the
 * worker without running a build. Same filter, same ordering, same id.
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
