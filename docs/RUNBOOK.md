# Runbook — NGW Event Planner

**Owner:** Todd Willis · **Frequency:** every session that touches this repo
**Last Updated:** 2026-09-03 · **Stage:** 8 (Maintain)

### Purpose

The operational half of the handoff. `HANDOFF.md` answers *where is it, is it
green, what's next*; this answers *how do I run it, and what will lie to me*.

Every trap below cost real time in a session and is written with the command
that settles it. They are not hypothetical — each has a date.

---

## Prerequisites

- [ ] **Node 20**: `export PATH=/usr/local/opt/node@20/bin:$PATH` — the default
      node is 16 and playwright and the gates need 20.
- [ ] **The repo root is `demo/`.** The directory above it says "not a git
      repo" and it is lying to you. Every path here is relative to `demo/`.
- [ ] Ports **5233** and **5244** free (playwright's preview servers).
- [ ] `gh` authenticated, for CI reads.

---

## Procedure — before every push

#### Step 1: the whole verification set, one command
```
export PATH=/usr/local/opt/node@20/bin:$PATH
node scripts/verify-all.mjs --fast
```
**Expected:** `✓ all 9 passed`, exit 0. `--fast` skips the 20-minute browser
matrix; drop it to include everything.
**If it fails:** read the per-step table it prints. It COLLECTS rather than
chains, so one red step does not hide the others.

#### Step 2: the browser matrix, when UI changed
```
cd hostv2 && npm run build && nohup npx playwright test --reporter=line > /tmp/matrix.log 2>&1 &
```
**Expected:** ~20 minutes, then `N passed`. Baseline is **909 passed / 190
skipped / 0 failed**.
**If it fails:** see Troubleshooting. Run it DETACHED — a session restart kills
an attached run and the truncation looks exactly like a failure.

#### Step 3: push, and only when CI is idle
```
gh run list --limit 3 --json status --jq '[.[]|select(.status!="completed")]|length'   # must be 0
git push origin main
npm run handoff:stamp && git add HANDOFF.md && git commit -m "Stamp HANDOFF to the pushed SHA" && git push
```
**Expected:** `0` in-flight, then a clean push.
**If it fails:** pushing over a running workflow **cancels it**. Wait, or you
lose the answer you were waiting for. Gate the push on the check — do not merely
run the check before it.

---

## Verification

- [ ] `npm run handoff:check` → green. HANDOFF's SHA is a claim; this is what
      checks it.
- [ ] `git rev-list --count origin/main..HEAD` → **0**. Committing is not
      shipping.
- [ ] CI green on the pushed SHA — read the FAILURE line, not the tail.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| A suite reports "N passed" and you believe it, but something is broken | **`\| tail -2` cuts the "N failed" line directly above the summary.** Cost three wrong diagnoses on 2026-09-02 | `\| grep -E "^\s+[0-9]+ (failed\|passed\|skipped)"` — never `tail` |
| `grep -c` "fails" a script that is working | grep exits **1** when it finds zero matches. The failure signal means "no matches" | Read the exit status of the command you are reporting, not the pipeline's |
| Backend pytest passes by hand, fails to COLLECT under a script | Node 20 is at `/usr/local/opt` — the **Intel** Homebrew prefix — so on Apple Silicon it runs under Rosetta and every child inherits x86_64. `python3` then cannot load `pydantic_core`'s arm64 binary | `arch -arm64 python3 ...`. `verify:all` already guards it. Print `process.arch` before theorising |
| `gate:cra` red locally, green in CI on the same commit | Stale `node_modules/.cache` — babel-loader's lint cache holds a result from before a symbol acquired its use | `rm -rf node_modules/.cache`. **When a gate disagrees with CI, clear the cache before believing either** |
| An e2e change has no effect | The preview server serves the **existing** `hostv2/dist` and never builds | `cd hostv2 && npm run build` first. A red-proof without a rebuild proves nothing |
| A `for f in $VAR` loop silently does nothing | **zsh does not word-split unquoted variables** — the loop runs once with the whole string | `while read -r f; do … done <<< "$VAR"` |
| `npx jest` reports ~1369 failures | It scans `node_modules` | `CI=1 npx react-scripts test --watchAll=false` from `demo/` |
| A chained gate's later steps never run | `gate:hostv2` exits **1 unconditionally** — CI retired it 2026-08-01 and the npm script was never removed | Never chain after it. It is deliberately excluded from `verify:all` |
| A test passes while the thing is visibly broken | `toBeVisible()` does **not** check opacity — an `opacity:0` element passes | Assert `getComputedStyle(el).opacity`. Screenshot after the geometry check |
| A check "cannot fail" | It reads the SOURCE rather than the rendered page | A check that reads the code cannot see what the code renders. Drive the page |
| A dated test fixture behaves oddly | A hardcoded seed date drifts: a "T-3" state was 39 days PAST | `boardMatrix.spec.mjs` now guards every dated label. Patch dates relative to today |
| `cd` in a command "did not work" | The shell cwd resets to `demo/` between calls | Use absolute paths, or `cd` inside the same command |

---

## Rollback

**Take the site down** (fastest first — the first two need no deploy):
```
# 1. Settings > Pages > Source: None      — under a minute, reversible there
# 2. gh repo edit twillis45/ngw-event-planner --visibility private
# 3. gh workflow run "Deploy Pages (from source)" --ref <good-sha>   # content only
```
**Written, never rehearsed.** Run #1 once, deliberately, to confirm the path and
the timing — a procedure nobody has executed is a different thing from one that
has. Recorded as owed in `PROMOTION-DEFERRED.md`.

**Undo a code change:** `git revert <sha>`. Restore a file from a red-proof with
a saved copy, **never `git checkout --`** — that reverts the guarded edit along
with the reintroduced fault.

---

## Escalation

| Situation | Who | Why it cannot be delegated |
|---|---|---|
| Any gate ruling, any design call | The review board | Standing delegation, 2026-09-02, until withdrawn |
| Culturally-specific copy | An **insider** seat, not this board | The general panel correctly declined to rule without one |
| Telemetry proof (PostHog / Sentry consoles) | Todd | Needs his accounts. Presence in the bundle is not arrival |
| Stranger-proof first run | Todd | Needs people who have never seen it |
| Rollback rehearsal | Todd | Takes the live site down |
| Repast copy before it reaches strangers | 3 real community members | A panel of lenses is not consent |

---

## History

| Date | Run by | Notes |
|---|---|---|
| 2026-09-03 | Claude (stage 8) | First runbook. Every trap above was paid for in the 2026-09-02/03 session |
