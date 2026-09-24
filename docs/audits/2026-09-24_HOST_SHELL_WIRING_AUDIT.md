# Host shell wiring audit — what is swallowed, what is wired and unused, what is not wired

Date: 2026-09-24
Surface: `hostv2/` (26,170 lines; `HostShellV2.jsx` is 21,692 of them)
Method: static measurement against the real files — import graph, transitive
reachability from the host's own entry points, and a classified sweep of every
empty `catch`. Nothing here is a runtime observation; where a finding needs a
runtime proof to become a defect, that is said.

---

## 0. The three headline numbers

> **AMENDED 2026-09-24, after an independent instrument disagreed.** The first
> version of this audit led with "146 empty-or-comment-only catches", counted by
> a script written for this audit. ESLint's own `no-empty` rule, run against the
> same file, reported **21**. The gap is real and the correction matters:
> `no-empty` does not flag a block containing a comment, because **a comment is
> a decision**. Re-counted, the file holds **23 bare `catch {}`** (ESLint says
> 21 — the two extra are multi-line forms it folds differently) and **101
> comment-only** catches. 146 was inflated and it blurred the only distinction
> that matters here. §1 is rewritten below; **the priority did not move** — all
> six of the worst sites turn out to be bare.

| question | measured |
|---|---|
| results swallowed in silence | **23 bare `catch {}`** (ESLint `no-empty`: 21) + 101 comment-only. **6 of the 23 bare ones sit around the code that builds the host's next-steps list** |
| wired and not used | **18** unused imports, **6** dead components and **17** unused locals — 41 dead bindings in one file (ESLint `no-unused-vars`) |
| not wired that should be | 329 `src/lib` modules · **217 bundled** into the host shell · 112 not · 82 admin/knowledge (correctly out) · **30 left**. Re-measured against the real rollup module graph after the fixes landed — `feedback.js` moved into the bundle, which is the fold showing up in the graph rather than in a claim |

---

## 1. SWALLOWED — 16 catches that can drop host-visible content

`HostShellV2.jsx` contains 417 `catch` clauses. Of the ones that swallow:

| | count | what it means |
|---|---|---|
| `catch { /* the pointer is gone */ }` — **comment-only** | **101** | somebody decided, and said why. Mostly storage, DOM and browser-capability idioms where a throw genuinely means "this browser said no" |
| `catch {}` — **bare** | **23** | nothing says why. ESLint's `no-empty` flags exactly these (it reports 21; the two extra are multi-line forms it folds differently) and **that rule's whole design is the distinction above** |

The bare 23 are the finding. And the concentration is the point: **six of them
sit in one function — the host's next-steps list.**

| site | what a throw silently removes |
|---|---|
| `HostShellV2.jsx:2066` | **every "Decide: …" row**, the whole `decisionBoard.open` loop |
| `HostShellV2.jsx:2095` | **every task row** |
| `HostShellV2.jsx:2107` | the lodging row — *"Group rate ends — N of M have no room yet"* |
| `HostShellV2.jsx:2123` | the ground row — *"N people still need a ride back"* |
| `HostShellV2.jsx:2142` | the air row — *"their flight lands after the day starts"* |

Each is `try { …push rows… } catch {}`. The host sees a shorter list and has no
way to know one exists. A group-rate deadline or a guest with no ride back is
exactly the row whose absence costs money, and it is the row most cheaply lost.

`:2029` is the sixth, in the same region: `try { if (effectiveDone(event, t))
return true; } catch {}` — a throw makes a **completed task read as not done**.
Wrong state, not missing state.

All six are BARE. Not one carries a comment. The 101 commented catches in this
file represent someone weighing a failure mode and writing down the answer; the
rows that carry the host's money and their guests' rides are guarded by the
ones where nobody did.

**One more, commented but worth naming:** `HostShellV2.jsx:3100`, the COI
next-action walk. A throw drops a **compliance prompt**. Its comment says
`/* no coi engine */`, which is true of one cause and silent about the others.

**What this audit does NOT claim.** None of these has been observed throwing.
The finding is that if one did, nothing — not a log, not a chip, not a degraded
state — would say so. The fix is not to remove the guards; it is that a catch
around content should record that it fired, so the gap is visible instead of
indistinguishable from "there was nothing to show".

---

## 2. WIRED AND NOT USED — 41 dead bindings, not 4

> **AMENDED 2026-09-24.** The first version said **4**. ESLint's `no-unused-vars`
> says **18 unused imports**, plus 6 dead components and 17 unused locals — 41 in
> all. My script counted a name appearing IN A COMMENT as a use, so `foodApproach`
> and `PhotoStrip` (both mentioned in comments, both never called) read as live.
> I found 4 of 18. Second hand-rolled count in this document to be wrong, and
> wrong in the same direction: the linter saw what a regex could not.

| category | n | names |
|---|---|---|
| **unused imports** | 18 | `Fragment`, `PhotoStrip`, `AskColumn`, `Eyebrow`, `BigValue`, `BigValueInput`, `GuideLine`, `Grounding`, `CtaRow`, `TierRow`, `SettledRow`, `SettledCard`, `OptionList`, `helperStatusLine`, `questionFrom`, `ALL_PLAYBOOKS`, `foodApproach`, `isBillingLive` |
| **dead components** | 6 | `AddressField`, `CityField`, `LodgeDeck`, `SheetHero`, `TweenNum`, `VendorReplyParserV2` |
| unused locals | 17 | `cycleVendorStatus`, `cycleLodging`, `cycleRide`, `planComplete`, `suggestions`, `decisionFor`, … |

The **six dead components** are the sharper half. `AddressField` and `CityField`
are input components with 8-9 props each; `LodgeDeck` and `SheetHero` are layout
components. All four are fully written, and rendered nowhere. Eleven of the
unused imports come from one line — the design-system components `AskColumn`,
`Eyebrow`, `BigValue`, `CtaRow`, `TierRow`, `SettledRow`, `SettledCard`,
`OptionList` — imported and never placed.

That is the signature of a file where things were built, replaced, and the old
version was never removed.

Four of the imports still deserve individual notes, because they are not all the
same kind of dead.

| symbol | from | what is not happening |
|---|---|---|
| **`isBillingLive`** | `@app/lib/passGate` | The host shell imports the billing-live check and **never consults it.** Billing is DORMANT (`REACT_APP_BILLING_LIVE` unset), so whatever the pass surfaces do, they do **not** do it because this said so. Worth a deliberate answer: either the gate belongs on those surfaces, or the import should go. |
| **`questionFrom`** | `@app/lib/askVoice` | **A missing step, not a leftover.** `selectedAction.js` uses the pair as a ladder: `normalizeAsk(row.ask) \|\| questionFrom(row.label) \|\| fallback` — use the authored ask, else turn the label into a question, else fall back. HostShellV2 imports both and uses only the first, so **a row with no authored `ask` has no way to become a question.** Use it; "or delete it" is the wrong reading. |
| **`helperStatusLine`** | `@app/lib/helperResponsibility` | Imported beside `deriveHelperResponsibilities` and `guestHelperRoles`, both used. The line itself — *"Covered by Dana"* / *"Assigned to Dana, but not confirmed"* — renders nowhere. The distinction between assigned and **confirmed** is the whole point of that module and the host never sees it. |
| **`ALL_PLAYBOOKS`** | `@app/lib/playbooks` | Dead weight on the import line. Harmless; delete it. |

`helperStatusLine` is the one with host-visible cost: the module deliberately
returns a different sentence for *assigned* than for *confirmed*, and the shell
shows neither.

---

## 3. NOT WIRED — and two duplicate surfaces

> **VERIFIED 2026-09-24 against the real bundler.** This section's numbers came
> from a hand-written BFS over resolved imports. Re-measured by building hostv2
> with rollup and dumping `this.getModuleIds()` — the actual module graph, with
> vite's aliases, plugins and conditional resolution applied: **216 bundled, 113
> not**, against the BFS's 215/114. Off by one (`usCitiesFull.js`, which the BFS
> missed and the bundler includes). The admin/non-admin split is 82/31 against a
> claimed 82/32. **This claim held**, and both duplicate surfaces below are
> confirmed absent from the host bundle by the bundler itself.

216 of 329 `src/lib` modules are bundled into the host shell
(through anything it imports, not just direct imports — so `recommendedPick`,
reached via `playbooks/index.js`, counts as wired). 114 are not, and **82 of
those are the `knowledge/` and `api/` research and admin trees, correctly out of
the host.**

Of the 32 that remain, these are the two that break a non-negotiable.

### 3a. Two modules own "what a sync state is called"

| | `src/lib/syncStatus.js` | `src/lib/api/syncState.js` |
|---|---|---|
| exports | `SYNC_STATUS`, `SYNC_STATUS_LABEL`, `getEventSyncStatus`, `makeEventSyncRow` | `SYNC_STATUS`, `SYNC_STATUS_LABEL`, `getEventSyncStatus`, + 7 more |
| read by | `src/App.js` (frozen CRA), `src/admin/AdminConsole.jsx` | **hostv2** |

Three names are owned twice. The host shell and the admin console can label the
same sync state differently and no test compares them. This is the
`blockVocabulary` story again — one vocabulary, two owners, silent drift — and
it is a **duplicate surface**, which CLAUDE.md lists as a non-negotiable.

### 3b. The host shell wrote its own haptics instead of using the one that exists

`src/lib/feedback.js` is a **16-function feedback vocabulary** — `feedbackCommit`,
`feedbackSeal`, `feedbackReveal`, `feedbackLock`, `feedbackHeart`,
`feedbackBudget`, `feedbackAlert`, `feedbackDayStart`… each pairing a specific
haptic with a specific tone. `src/App.js` and `ChecklistGenerator.jsx` use it.

`HostShellV2.jsx:5621` defines its **own** `feedback(kind)`: eight lines, three
patterns (`magic`, `error`, default). So the flagship surface has a **coarser
feedback vocabulary than the engine already owns**, and a "seal", a "lock", a
"heart" and a "budget warning" all feel identical on the surface where they
matter most.

The host version is not simply worse — its comment records a real audit finding
(muting sound must not kill haptics) that the shared module may not honour.
That is an argument for **folding that rule into the shared module**, not for
keeping two.

### 3c. The rest of the 32, honestly bucketed

| bucket | modules |
|---|---|
| correctly out (fixtures, data, CRA/admin-only) | `__fixtures__/*` (3), `usCitiesFull`, `adminApi`, `analyticsReader`, `legacyCopy`, `vendorAccountability/__qa__`, `vendorAccountability/fixtures` |
| **built this session, deliberately unwired pending the board** | `decisionBlastRadius` (3), `decisionImpacts` (5), `blockVocabulary` (5) — see the blast-radius packet |
| **host-facing capability the shell cannot reach — needs a call** | `severity` (7), `shellTabs` (5), `dateChips` (8), `draftVersions` (8), `vendorBriefConfirm` (8), `vendorCopilot` (4), `presentationNav` (6), `eventDocuments` (5), `maps` (3), `homeNav` (2), `planHeroCopy` (1), `clipboard` (1), `webhookService` (5), `playbookRegistry` (15), `vendorCategoriesByType` (2), `followUpDrafts` (2), `budgetEstimator/BudgetEstimateHint` |

The last bucket is a **list of candidates, not a list of defects.** Several of
those are plausibly CRA-era surfaces the host replaced on purpose. Each needs
one question answered — *does the host already do this another way?* — before it
becomes work. Naming them is the point; assuming they are all gaps would be the
same mistake as assuming `relevantWhen` needed 260 rows.

---

## 4. What to do, in order

1. **Make the six bare catches around the next-steps list audible** — `:2029`,
   `:2066`, `:2095`, `:2107`, `:2123`, `:2142`. Not removed: recorded, so a short
   list is distinguishable from an empty one. Then rule on the other 17 bare
   ones: each either gets a comment saying why swallowing is right, or gets a
   trace. **Leave the 101 commented ones alone** — they are already decisions.
   `no-empty` can then be turned on for this file and hold the line.
2. **Resolve `isBillingLive`.** Consult it or delete it; an imported gate that
   nothing calls is the shape of a paywall that does not know it is dormant.
3. **One sync vocabulary.** Fold `syncStatus.js` into `api/syncState.js` or the
   reverse, and leave one owner.
4. **One feedback vocabulary**, carrying the host's mute-vs-haptics rule.
5. **Render `helperStatusLine`,** or decide out loud that the host does not
   distinguish assigned from confirmed.
6. Walk the last bucket in §3c one module at a time.

Items 1–5 are measured and specific. Item 6 is a question list.

---

## 5. Method, so this can be re-run

- **Swallowed:** every line matching an empty/comment-only `catch`, then the
  guarded region walked back to its `try` (≤40 lines) and matched against
  known-safe idioms; the remainder classified by whether the region pushes rows
  or sets state. **Then cross-checked against ESLint's `no-empty`**, which is
  why this section was rewritten — see the amendment note at the top. The audit
  script and the linter disagreed 146 to 21, and the linter was making a
  distinction the script had flattened. Every hand-rolled count in this document
  is a candidate for the same treatment; `no-empty` and `max-lines` were the two
  claims an off-the-shelf rule could check, and both were run.
- **Wired-unused:** first by a hand-written import counter, then **replaced** by
  ESLint `no-unused-vars`. The hand count said 4; the linter says 18 imports plus
  6 dead components and 17 unused locals. The script counted a name appearing in
  a COMMENT as a use. The linter's number is the one in this document.
- **Not wired:** first a hand-written BFS from the ten host entry points, then
  **confirmed** by building hostv2 and dumping rollup's real module graph
  (`this.getModuleIds()`). 216/113 against the BFS's 215/114 — off by one.
- **Not wired:** BFS from the ten host entry points over resolved `@app/` and
  relative imports, compared against every non-test module under `src/lib`.
  **Transitive on purpose:** a direct-import test would have wrongly called
  `recommendedPick` unwired when the board reaches it through `playbooks/index.js`.

**Score, stated plainly: three claims, two of them wrong on the first pass.**
Swallowed catches (146 → 23 bare) and unused imports (4 → 18) both failed their
cross-check; reachability held. The substantive findings survived every time —
what failed was the counting. Any number in this document that has not been
checked by a second instrument should be read as provisional.
