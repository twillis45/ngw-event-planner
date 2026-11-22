// Which commit this page was built from (owner, 11/21/2026), as one quiet line
// at the foot of You & settings. The value is baked by vite.config.js `define`
// from the deploy workflow's RELEASE_SHA; a local or e2e build says "dev".
// test/theBuildSaysWhichCommit.test.mjs pins it.

// eslint-disable-next-line no-undef
export const BUILD = typeof __NGW_BUILD__ !== 'undefined' ? __NGW_BUILD__ : { commit: 'dev', builtAt: null };

export function buildLabel(build) {
  const commit = (build && build.commit) || 'dev';
  if (commit === 'dev') return 'Version dev';
  const t = build.builtAt ? new Date(build.builtAt) : null;
  const when = t && Number.isFinite(t.getTime())
    ? ' · ' + t.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  return 'Version ' + commit.slice(0, 7) + when;
}

export default function BuildLine({ build = BUILD }) {
  return (
    <p className="grounding" data-build-line style={{ margin: 'var(--sp-4) 0 0', textAlign: 'center' }}>
      {buildLabel(build)}
    </p>
  );
}
