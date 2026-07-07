# RETURN-NARRATION-1 — One-Line "Since Last Visit" (Test-Framed)

Date: 2026-07-07 · Slice type: retention test slice, built to be killable · Status: SHIPPED (watch)

## 1. Executive verdict
A returning host now gets at most ONE muted line under the phase strip — "Since last time: {one real change}." — derived only from safe diffable markers. It is silent on first visit, on reloads, when nothing meaningful moved, and whenever the hero or cue already tells the same words. No feed, no notifications, no persistence beyond a per-event marker snapshot. During the build the harness caught a genuine contradiction class (narration and header cue using different "location" definitions) — fixed at the source and guard.

## 2. Return Narration Matrix
| Change | Source | Line | Route | Priority |
|---|---|---|---|---|
| Phase → live / post | phase engine | "it's event day." / "the event moved into wrap-up." | none | 1 |
| Location added (venue/address — SAME definition as the phase essential) | venue markers | "the event location was added." | event-venue | 2 |
| Parking / rain added | field markers | "parking details were added." / "the rain backup was added." | parking-notes / rain-plan | 3 |
| Guest count set | count markers | "the guest count was set." (NEVER a word about replies) | guests-entry | 4 |
| Food moved closer | unbought count ↓ | "food moved closer — N items left to buy." / "fully bought." | food-plan | 5 |
| Vendors moved closer | gap count ↓ | "the vendor plan moved closer — N still need a follow-up." (counts only, no names, no paid claims) | vendor-list | 6 |
| Steps checked off | open-task count ↓ | "N steps were checked off." | none | 7 |
| Nothing meaningful | — | **silence** (no "no changes" chatter) | — | — |

## 3–5. Files & snapshot behavior
- `src/lib/returnNarration.js` — `buildReturnSnapshot` (safe markers ONLY: phase, booleans, counts, timestamp — proven by test to exclude coords, guest/vendor names, notes), `read/writeReturnSnapshot` (localStorage `ngw-return-snap-<id>`), `deriveReturnNarration` (first-visit silent; <30min gap silent — a reload is not a return), `narrationDuplicatesTelling` (subject + key-noun guard against hero/cue).
- `src/App.js` — `ReturnNarrationLine` under the host-shell ReadinessTrack: computed ONCE per mount, then the snapshot rewrites (the anti-repeat mechanism — verified live: line silent on the very next reload); session ✕ dismiss; tappable when a route exists.

## 6–9. Placement, copy, one-telling, privacy
One muted caption line, in flow, 12px clear of the first card (measured at 360). Calm past tense, no celebration, no scores, sent/replied/paid claims impossible by construction and test. Contradiction fix: the location marker now matches the phase engine's essential (venue text — a city alone is city_only), and the guard also silences when the line's key noun ("location", "parking", "count") already appears in the hero/cue.

## 10. Mobile
360×740 verified: fits, no overflow, no collision. Same layout at larger widths by construction (caption text wraps).

## 11. Kill criteria assessment
Requires broad persistence? No (one small localStorage key). Duplicate telling? Guarded, tested, live-verified alongside a live cue. Mobile crowding? One caption line. Truthful derivation? Markers only, aligned with existing engines. Stale repeats? Structurally impossible (diff basis rewrites). Feels like a feed? One line, mostly silent. **Kill switch if alpha says noisy: remove the single `<ReturnNarrationLine/>` render — the lib is inert without it.**

## 12–19. Tests, suites, verification
12 contract tests (`src/lib/__tests__/returnNarration.test.js`): first-visit/reload silence, all seven change classes, reply/paid bans, privacy sweep of the snapshot, both duplicate guards incl. the live-found contradiction case. Full frontend **2154/2154 (133 suites)** · backend **97/97** · build clean. Live: planted stale snapshots → truthful lines ("2 steps were checked off" beside a DIFFERENT cue, no contradiction), dismiss works, reload silent, 360 clean. Prod smoke post-deploy.

## 20. Parked
Cross-device snapshot sync (localStorage is per-device — acceptable for a test slice); "draft copied" narration (share state exists but is transient); any second line, ever.

## 21. Recommendation
Accept as a WATCH item — first thing to kill if alpha hosts call it noise. Shell work now stops; the next proof step is the vendor-brief trial with real hosts.
