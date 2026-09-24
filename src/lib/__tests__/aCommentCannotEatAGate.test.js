// ─── THE TRIGGER THAT SILENTLY GUTS A SOURCE GATE ───────────────────────────
//
// Three tests in this directory read a source file, strip its comments, and
// regex what is left. All three strip BLOCK comments first:
//
//   bookedVsConfirmed.test.js:29   → hostv2/src/HostShellV2.jsx
//   ctaNamesTheAct.test.js:108     → CommandCenter, phaseProgress,
//                                     nextActionRenderer, taskRoute, HostShellV2
//   spacingLadder.test.js:44       → CSS (no `//` comments, not at risk)
//
// A block-first strip is safe only while every `/*` in the file really opens a
// block comment. Put the characters `/*` inside a `//` LINE comment with no
// `*/` after them on that line, and the regex reaches forward to the next `*/`
// anywhere in the file and deletes everything in between.
//
// ── THIS IS NOT THEORETICAL. IT HAPPENED, 2026-09-24 ────────────────────────
//
// A guard written that day used the same idiom. `src/lib/adminApi.js` line 2
// reads:
//
//   // Talks to the FastAPI backend's /api/admin/* routes. Auth is the signed-in
//
// The `/*` in `/api/admin/*` opened nothing. The stripper paired it with a `*/`
// about a thousand characters later and swallowed the code between — including
// two `authHeaders` declarations. The gate then reported 7 copies where the
// files hold 9, and it reported it GREEN-adjacent: a weakened gate does not
// announce itself, it just stops seeing things.
//
// ── WHY A GUARD AND NOT A REWRITE OF THE THREE ──────────────────────────────
//
// Measured on the files those three actually read: exactly ONE trigger exists
// today, at HostShellV2.jsx:9190 — and it is SELF-CLOSING (`{/* … */}` appears
// whole on the line), so it eats that fragment and nothing more. The hazard is
// latent, not live.
//
// Rewriting three working gates to fix a hazard that is not firing is how a
// working gate gets broken — twice in one session, already. Reordering the
// passes just moves the trigger (a `//` containing `*/` inside a block comment
// would then leave the block unterminated), and a real tokenizer is more code
// to get wrong than the thing it protects.
//
// So the trigger is made LOUD instead. If someone writes an `/api/admin/*`-style
// comment into one of those files, this fails and names the line, instead of
// three gates quietly going blind.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

// Every file read by a comment-stripping gate in this directory. Adding a gate
// that strips comments means adding its targets here.
const GUARDED = [
  'hostv2/src/HostShellV2.jsx',
  'src/CommandCenter.jsx',
  'src/lib/phaseProgress.js',
  'src/lib/nextActionRenderer.js',
  'src/lib/taskRoute.js',
].filter((f) => fs.existsSync(path.join(ROOT, f)));

/**
 * Lines where `/*` appears after `//` and is NOT closed on the same line.
 * That is the exact shape that lets a block-comment strip run away.
 */
function runawayOpeners(src) {
  const out = [];
  src.split('\n').forEach((line, i) => {
    const slash = line.indexOf('//');
    if (slash < 0) return;
    const open = line.indexOf('/*', slash);
    if (open < 0) return;
    // Closed on the same line (`{/* … */}`) is harmless — it eats its own
    // fragment and stops. Only an unclosed opener reaches into real code.
    if (line.indexOf('*/', open + 2) >= 0) return;
    out.push({ line: i + 1, text: line.trim().slice(0, 100) });
  });
  return out;
}

describe('a comment cannot eat a source gate', () => {
  test('(premise) there are files to guard', () => {
    // Without this the assertion below passes over an empty list.
    expect(GUARDED.length).toBeGreaterThan(0);
  });

  test('THE GUARD: no file read by a stripping gate opens a runaway block comment', () => {
    const offenders = [];
    for (const f of GUARDED) {
      for (const hit of runawayOpeners(fs.readFileSync(path.join(ROOT, f), 'utf8'))) {
        offenders.push(`${f}:${hit.line}  ${hit.text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('NEGATIVE CONTROL: it recognises the line that actually caused this', () => {
    // The real adminApi.js line, verbatim. A guard that cannot fail is not a
    // guard, and this one is pinned to the case that proved the failure rather
    // than to an invented example.
    const real = "// Talks to the FastAPI backend's /api/admin/* routes. Auth is the signed-in";
    expect(runawayOpeners(real)).toHaveLength(1);

    // …and it does NOT flag the self-closing JSX form, which is safe and which
    // HostShellV2 legitimately contains.
    const safe = '// (Comment sits ABOVE the return: a {/* … */} after `return (` is a';
    expect(runawayOpeners(safe)).toHaveLength(0);

    // Nor a line with no comment at all.
    expect(runawayOpeners('const glob = "/api/admin/*";')).toHaveLength(0);
  });

  test('adminApi.js still carries the line, and is deliberately NOT guarded', () => {
    // The file that caused this is not read by any stripping gate, so its
    // comment is harmless where it is. Asserted so the example in this header
    // cannot quietly stop being true, and so that adding adminApi.js to a
    // stripping gate's target list fails HERE rather than silently.
    const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'adminApi.js'), 'utf8');
    expect(runawayOpeners(src).length).toBeGreaterThan(0);
    expect(GUARDED).not.toContain('src/lib/adminApi.js');
  });
});
