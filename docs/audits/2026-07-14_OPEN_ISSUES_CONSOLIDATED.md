# Open Issues — Consolidated

Date: 2026-07-14 · **Last updated: 2026-07-14, end of session** · Sources: 12 ported artifact audits + the in-repo audit set + the [claim source-of-truth sweep](2026-07-14_CLAIM_SOURCE_OF_TRUTH_SWEEP.md) + the four-lens SSOT re-sweep.

**Method:** every item below was **verified against current code**. An audit saying "open" does not mean open — audits go stale, and several here were badly stale. Items the docs called open but that verify FIXED are listed in §5 so nobody re-files them. Nothing in this doc is taken on an audit's word.

---

## ⚠️ STATUS: §1 IS NOW CLOSED. The entire claim-truthfulness class shipped on 2026-07-14.

The second, dedicated sweep (four independent lenses: predicate consumers, claim strings, visual/green states, legacy App.js) found that the class had **four root causes**, not one — and that the morning's leaf-level fixes could never have terminated, because the tokens underneath them still lied.

All four roots and all three remaining C-items are now fixed, live-verified, and pinned by tests:

| | Root cause | Commit |
|---|---|---|
| **R1** | **Booked licensed "confirmed."** `buildVendorReadinessRollup` returned `status:'ready'` + *"Nothing needs you here right now"* whenever every vendor was merely BOOKED, and `getEventReadiness` returned `ON_TRACK`. Those are a **published API** — 7 consumers inherited the lie. `'ready'` now means fully confirmed; all-booked gets its own token `'to_confirm'`; the rollup carries `counts.confirmed`/`counts.toConfirm` so **no consumer re-derives them** (that re-derivation, with a drifting vocabulary, *is* the bug class). | `d641aa5` |
| **R2** | **Untracked counted as passing.** `getVendorReadiness` counted `notTracked` and never consulted it — *"All checks passing"* regardless. The cockpit filtered `not_tracked` gates OUT of the denominator, so partial coverage became arithmetically 100%: green **"All set" / "5/5 sorted"** beside an amber **"$5,800 due"** chip, on the DEFAULT path (`payDueDate` is empty by default). The financial axis also returned `'safe'` with the note *"balance pending"* — the note named the money, the level called it a pass. | `7dca0c0` |
| **R3** | **The exhale outranked the engine.** `showLead = !allProgDone && !!na` — the app computed *"Confirm the caterer"*, **HID it**, and printed *"You're all set — everything that needs you is done"* from a 7-axis checklist **with no vendor axis**. New invariant in `lib/exhaleGate.js`: **a checklist may propose calm; only the engine may grant it.** | `bf31fc4` |
| **R4** | **Zero read as done; the clock did the host's work.** The event-day bar counted cues whose *time had passed* as complete (*"Cake handled"* because 4pm arrived; *"All cues run"* to a host who ticked nothing). An empty post-event ledger rendered a **full green bar**. And **Budget could never be red** (`add('budget', true, TRUE, …)`). | `fe00d6d` |
| **C2** | **Presence satisfied an act.** Money tasks were satisfied by `hasNamedVendor` — done because a vendor had a *name* — and the checklist DROPS satisfied rows, so **the app hid the bill**. | `003b401` |
| **C3** | **`'Pending'` was not treated as a reply** — though it is the exact string the app's own importer writes. | `ec2c1c6` |
| **C4** | **A persisted write** marked supply-shopping done off a **food-only** count. | `13451db` |

Two libs came out of it, both fixing bugs of their own:
- **`lib/vendorMoney.js`** — the one vendor money model. `hostSpending()` had **zero vendor terms** because these helpers were trapped in `App.js`. It also fixes money *silently vanishing from the ledger*: `STAGES` omitted `'Booked'` and `'Paid'`, two statuses V2 actively writes, so those vendors' costs dropped out of Total Committed, Balance Due, and every payment alert.
- **`lib/rsvp.js`** — the one RSVP vocabulary. Seven predicates asked "has this guest replied?" with four different vocabularies.

**Nine bug-pinning tests were rewritten, not deleted** — each asserted the defect as correct behaviour — and each got a paired positive case, so the calm states stay reachable and nothing can regress in either direction. Suite: **180 suites / 2713 passing**.

**The rule to keep:**

> **A presence predicate may never license a completion claim. Zero may never read as done. Unknown is not passing. A checklist may propose calm; only the engine may grant it.**

§1 below is kept as the historical record of what was found. **Do not re-file it.** The live open list starts at §2.

---

## 1. The claim-truthfulness class — ✅ CLOSED 2026-07-14 (historical record; do not re-file)

> **A predicate establishing PRESENCE or PARTIAL progress is used to license a claim of COMPLETION.**
> Twin: **an empty collection is read as a finished one.**

This started as one vendor bug. It is now the single largest source of host-facing dishonesty in the app, and it spans money, guests, food, tasks and vendors.

### 1a. Critical — the host is misled into not doing real work

| # | Finding | file:line | What breaks for the host |
|---|---|---|---|
| **C1** | **`hostSpending()` has zero vendor terms** (grep-verified: the string `vendor` does not occur in the file). Host budget claims ignore every dollar owed to vendors. | `lib/hostSpending.js:131`; claims at `App.js:42502`, `CommandCenter.jsx:411/456`, `HostShellV2.jsx:3875/4909` | **"ALL SET — you've got about $39,700 left"** with ~$18,400 of vendor balances owed. `App.js:2241` already defines `vendorBalance` and says every "owed" figure must route through it — the **planner** views do, **no host view does**. Perverse: `unpricedVendorCount` only flags vendors with *no* price, so **the more carefully a host prices their vendors, the more invisible the money becomes.** |
| **C2** | **`taskSatisfied` auto-completes the tasks that tell the host to PAY**, off a presence predicate. No payment/deposit/balance guard exists in the file. | `lib/taskEngine.js:51,56` | Real seeds — *"Confirm all vendors — check balance due status"* (`App.js:4689`), *"Negotiate vendor payment plans"* (`:4684`) — match `/vendor/` → `hasNamedVendor` → **done**, because a vendor has a *name*. `effectiveDone` then **drops them from the checklist**. The app hides the bill. |
| **C3** | **`guestCountResolved` cannot see the RSVP value the app itself writes.** Pending = only `'maybe'` or `''`; `csvParsers.js` writes **`'Pending'`** (lines 20/36/51/66/100/123/145). | `lib/playbooks/index.js:268-271` | Import an 80-row CSV nobody has replied to → `resolved: true` → Guests goes green ✓ → **"You're all set. Everything that needs you is done."** (`App.js:24113`). Eighty people have never been asked. V2 normalises `'Pending'` away (`HostShellV2.jsx:2510`); **legacy does not.** |
| **C4** | **A persisted WRITE marks supply-shopping steps done off a food-only count.** | `HostShellV2.jsx:2615-2624`; counts at `playbooks/index.js:2469` (`isFood = i.group !== 'Supplies'`) | Tick the crabs and corn → **"Buy ice, charcoal and paper goods"** is silently written `done: true` **to the event** and disappears. The same file's *display* rule (`:947`) is **stricter** and refuses empty lists — **the looser predicate is the one that persists.** It is a write, not a render. |

### 1b. Finish SSOT #1 — three surfaces the vendor fix missed

The fix corrected the six surfaces that *speak* the claim. It missed the ones that *aggregate* it.

| # | Finding | file:line | What the host sees |
|---|---|---|---|
| **S1** | `returnNarration` licenses its claim on `isVendorBooked` | `lib/returnNarration.js:51` → claim at `:127` | **"Since last time: every vendor is squared away."** — live-observed on an event whose own vendor sheet read *"All booked — 4 still to confirm."* Found by *using* the app; grep missed it. |
| **S2** | `positiveAttention` lists the vendor axis whenever `status === 'ON_TRACK'`, which still fires with `toConfirm > 0` | `lib/positiveAttention.js:63` → green `p-ok` pill at `HostShellV2.jsx:3993` | A **green "You're Set On ✓"** pill reading *"Vendors — all booked · 2 to confirm."* The note is honest; **the frame is not.** Its own comment ("every vendor confirmed AND contracts signed") is now factually stale. |
| **S3** | `deriveRecommendationLifecycle` maps workstream `status === 'ready'` → `Completed`; `statusFor()` sets `ready` on the **booked** predicate | `CommandCenter.jsx:1481`; `lib/workstreams.js:102` | Hero prints **"N handled · all clear"** (`HostShellV2.jsx:3986`) with confirms outstanding. |

### 1c. Empty reads as complete — violates UX_08 ("Zero is a value, null is missing")

| # | Claim | file:line | Fires when |
|---|---|---|---|
| E1 | *"Shopping — all in hand · Everything's bought or in hand."* | `lib/dayBefore.js:123` | `playbookFoodPlan` returns **null** for any type with no playbook → counters stay 0 |
| E2 | *"Plan steps — nothing open. **Stop worrying about the plan.**"* | `lib/dayBefore.js:111` | **no `timeline.length` guard** — a checklist that was never generated reads as calm. **Currently pinned by our own test** (`__tests__/dayBefore.test.js:32-35`) — the test encodes the bug and must change with the fix |
| E3 | *"Wrap-up · **All wrapped up**"* at a **100% bar** | `lib/phaseProgress.js:210-211` | `progress: total ? done/total : 1` — an empty ledger literally renders `1` |
| E4 | *"N of N · areas handled — **ready for the day**"* | `HostShellV2.jsx:3817` | no-playbook event → food + shopping never enter the denominator |
| E5 | *"**You're ready. Nothing left that matters — rest up.**"* | `lib/dayBefore.js:201` | the **guests row is a hard-coded `open: 0`** (`:174-179`) — telling the guests can never block "you're ready" |

### 1d. Inference laundering itself into fact

`taskSatisfied` is a regex heuristic; `effectiveDone` promotes it to truth:

- `hasGuests` (a typed estimate) satisfies `/invite|rsvp|guest|head\s?count/` → **"Send the invitations"** reads as done. Nothing was sent. (`taskEngine.js:36,53`)
- `hasVendors` (a named caterer) satisfies `/vendor|photograph|\bdj\b|florist/` → **"Book the DJ"** reads as done. There is no DJ. (`:39,56`)
- `hasFood` (`sourcing: 'potluck'`) satisfies `/menu|food plan/` → **"Plan the menu"** reads as done. There is no menu. (`:40,57`)

Compounded at `HostShellV2.jsx:7122-7133`: the hero prints **"15 of 15 · Every step is handled"** in green when `openN === 0`, and the honest disclosure (*"N already handled by your plan — tap to confirm"*) lives **only in the `openN > 0` branch** — so the one case resting entirely on inference is the one case the host is never told about.

---

## 2. Other confirmed-open findings (verified, ranked by host harm)

| # | Finding | Source | file:line | Sev |
|---|---|---|---|---|
| 1 | **Vendor accountability infers "evidence attached" from a typed price** — sets `sourceType:'system'`; **zero** vendor-UI readers honour it | Layer Rated | `lib/vendorAccountability/derive.js:342,351,355` | HIGH |
| 2 | **Research pipeline fabricates by default** — 4 of 6 provider families simulate; only a human gate stops synthetic citations reaching product data | Layer Rated, Scorecard | `backend/app/research_executor.py:49`; `lib/knowledge/providerExecutors.js:349` | HIGH — **needs a ruling** |
| 3 | **Food engine ignores its own risk layer's "count by pickers"** | Layer Rated | no `picker` token in `playbooks/index.js` food math | HIGH |
| 4 | **Invite route not code-split** — a guest downloads the whole ~657KB host shell to tap "yes" | vs Leaders | no `React.lazy` anywhere in `hostv2/src` | HIGH |
| 5 | **`eventDateStatus 'rushed'` can never fire** — reads `opts.minLeadDays`; **no caller passes it** | Engine Doctrine | `lib/dates.js:29,37` | MED-HIGH |
| 6 | **COI/insurance jargon + "Verify COI"** overclaims verification of a self-attestation | Copy Audit | `lib/vendorIntelligence.js:776,778,990` | MED-HIGH — violates the standing no-jargon rule + UX_07 |
| 7 | **V2 budget estimate carries no metro premium** — omits `metroFactor` (defaults to 1); legacy computes it | Engine Doctrine | `HostShellV2.jsx:3058` vs `App.js:15900` | MED |
| 8 | **≥5 independent day-rounders** (`ceil` vs `round`, local vs UTC) | Layer Rated | `dates.js:17`, `disclosure.js:43`, `dayBefore.js:25`, `phaseProgress.js:35`, `vendorIntelligence.js:35` | MED — two surfaces can disagree by a day |
| 9 | **Identity "confidence" measures input length** — base 0.75, +0.10 for a type (always true), +0.05 if `freeText.length > 50` | Layer Rated | `lib/eventIdentityEngine.js:343-348` | MED |
| 10 | **No shellfish-allergy nudge on a crab feast** — the knowledge exists only as risk copy | Layer Rated | `lib/eventContextNudges.js` (absent) | MED |
| 11 | **Head-start draft queue vanishes on event day** | Agent Audit | `App.js:23848` (`{!isDayOf && …}`) | MED — the drafts vanish on the day they matter |
| 12 | **Food row hides 4 of 5 actions behind "tune"** | Food Friction | `HostShellV2.jsx:7829` | MED |
| 13 | **Lens tabs filter only one list** — `show` has exactly one consumer | Per-Screen | `HostShellV2.jsx:1603` → used once at `:4375` | MED — the control lies about its scope |
| 14 | **V2 renders `positiveAttention` without the `attentionActive()` persona gate** | Engine Doctrine | `HostShellV2.jsx:2355` vs `CommandCenter.jsx:3473` | LOW |
| 15 | Sample badge + "Sample forecast" disclaimer both `opacity: .7` | Per-Screen | `HostShellV2.jsx:6497`, `:9278` | LOW — the two lines that exist to prevent a mistake are the least legible |
| 16 | Coverage debt: no behavioural suites for `api/rsvp`, `estimatorFactors`, `payLinks`, `vendorAccountability/*`, `budgetEstimator/*` | Parity | — | LOW-MED |

---

## 3. Needs a human ruling, not code

1. **Research providers** — 4 of 6 families have no free public API. Accept + label as simulated, kill the families, or fund paid partnerships.
2. **`vendor_followup` doctrine conflict** — the DIFM kill-list bans AI-generated vendor messages; the backend ships one, live in the planner cockpit. **Doctrine and code disagree, and this must be reconciled before the send chains are built.**
3. **The 393×852 phone-frame ruling** — it hard-caps Responsive, Findability and Command-speed in the launch gate. Keep or lift.
4. **`becauseLayer` / `valueConfidence`** — the fields they render are never populated anywhere. Build producers, or delete.
5. **Pooled-dues caption** — doctrine says never total the pool; a one-line disclosure may still be owed.
6. **Co-hosting + localisation** — on the roadmap or explicitly out (both score 2/10 in the launch gate).

---

## 4. Closed on 2026-07-14

**The whole claim-truthfulness class** (see the status block at the top):
`d641aa5` R1 · `7dca0c0` R2 · `bf31fc4` R3 · `fe00d6d` R4 · `003b401` C2 · `ec2c1c6` C3 · `13451db` C4.
The earlier leaf-level pass (`867af98` / `48f6414`) is superseded by R1 — and worth remembering *why*: three of its six "fixed" surfaces were **worse than reported**. The "People you're hiring" copy was **unreachable** (the row returned `null` once every vendor was booked, taking the disclosure with it); the vendor hero's **green number** still came from the booked predicate 40px above the corrected subtitle; and the health row went green **and got collapsed into a hidden drawer**, hiding its own disclosure. Words were fixed; pixels and tokens were not.

**Also shipped:**
- **City autocomplete** — `2cc75b1`: the field the app **blocks** you for had no autocomplete, while `saveCity` **rejects** a bare city. Ported the key-less ~29.7k-entry list from legacy.
- **Address autocomplete on lodging** — `b2bb55e`: hotel/rental + backup fields use the same lookup as the venue. Disambiguates Charleston SC from Charleston WV.
- **Food area label** — `ec2c1c6`: the area said "Food" but the bar was only `dietaryResolved`. It now means the menu decisions are made *and* dietary is answered, and the cue names which is missing.
- **12 audits ported from artifacts** — `696be04`: they existed only as published artifacts and were invisible to any repo search.

### Verification limits, stated plainly
- **C3's V2 surfaces are engine-verified, not browser-verified.** I could not stage a roster-mode event in V2 by patching localStorage (the merged sample keeps `guestMode: 'count'`). Proven by 6 tests including the 80-guest all-`'Pending'` import, and the legacy "You're all set" chain was observed absent.
- **An audit claim I had to retract:** the sweep said *"Send the invitations"* was auto-satisfied. It was not — the old regex `/invite/` does not match `"invitations"` (invit**a**tions), so it fell through to `false` **by accident of spelling**. The real defect was *"Chase the RSVPs"*.

---

## 5. Audits that are STALE — do not re-file these

Verified fixed in code despite their doc saying open. **The audits are stale in the pessimistic direction, which means they have been mis-driving fix priorities.**

- **The Copy + Layout audit (07-13) is almost entirely stale** — both P0s and 5 of 6 systemic items are fixed.
- **All five "confirmed live defects"** in the Engine & Doctrine Gap audit are **fixed** (dead `phaseCues.items`; `deriveHelperResponsibilities` object-vs-array; lessons capture; shellfish `DIET_KEYWORDS` key; the `resolveCanonicalType` `backyard` taxonomy bug).
- **"1 Bad / 1 Broken" in Every Intelligence Layer Rated is stale** — both rows are closed.
- **The Scorecard understates V2 by ~3 points** — its `getEventReadiness` row claims "V2 4/10, still open", but V2 now calls the shared `applicableReadinessAxes` (`HostShellV2.jsx:2354`). Its guest-resolution row is also mis-cited (the kids fix landed in `attendanceBand`, not `guestCountResolved`).
- **`--faint` and `--steel-soft` contrast** — retuned in `theme.js`; the Per-Screen audit still lists them open.
- **The headline number everyone quotes is stale**: vs-Leaders is **268/420**, not 249/420.

**Lesson worth keeping:** a stale audit is not harmless. It sends work at problems that are already solved and lends false confidence about ones that aren't.

---

## 6. What to do next

The claim class is closed. The remaining queue, by host harm:

~~1. **C1 — `hostSpending()` has no vendor term.**~~ ✅ **CLOSED** (`f5af294`). `vendorOutstanding()` is wired into `hostSpending()`, so every host money surface sees vendor balances — they all read through that one function. Only the OUTSTANDING balance enters `committed`; money already PAID is deliberately not added to `spent` (a host who also logs it as a budget row would be charged twice). A **real double-count was caught by this repo's own test** — `phaseProgress` had been adding `vendorOutstanding` on top of `committed`; it now reads `committed` and nothing else. Live: the Retirement event went from *"$11,070 spoken for"* with no over-budget signal at all → *"$18,570 spoken for · $4,970 over"*.

1. **Vendor accountability infers "evidence attached" from a typed price** (`vendorAccountability/derive.js:342`) — a vendor reads "confirmed · evidence attached" when the host only entered a cost.
3. **Invite route not code-split** — a guest downloads the whole ~657KB host shell to tap "yes". The one surface non-hosts touch is the slowest thing in the product.
4. **`eventDateStatus 'rushed'` can never fire** (`dates.js:29` reads `opts.minLeadDays`; no caller passes it) — a wedding 10 days out is never flagged as compressed.
5. The rest of §2.

Plus the **rulings** in §3 — the `vendor_followup` doctrine conflict (doctrine bans AI-generated vendor messages; the backend ships one) should be settled before any send-chain work begins.

### The rule, mechanically checkable

> **A presence predicate may never license a completion claim.**
> **Zero may never read as done.**
> **Unknown is not passing.**
> **A checklist may propose calm; only the engine may grant it.**

A cheap standing check: any surface printing an absolute claim ("all", "everyone", "locked in", "set", "covered", "nothing left") must name the predicate licensing it in a comment — as the vendor surfaces now do. If it can't name one, it shouldn't make the claim.

---

## 7. Final state of the claim-truthfulness class (end of 2026-07-14)

**Closed, in full.** Four root causes + four criticals, every one live-verified and pinned by tests.

| | Fix | Commit |
|---|---|---|
| R1 | booked licensed "confirmed" — the rollup's own tokens lied; 7 consumers inherited it | `d641aa5` |
| R2 | untracked counted as passing — green "All set" beside "$5,800 due" | `7dca0c0` |
| R3 | the exhale outranked the engine — it **hid** the real action | `bf31fc4` |
| R4 | zero read as done · the clock did the host's work · Budget could never be red | `fe00d6d` |
| C1 | **`hostSpending()` had no vendor term** — "you've got $39,700 left" with $18,400 owed | `f5af294` |
| C2 | presence satisfied an act — the app **hid the bill** | `003b401` |
| C3 | `'Pending'` was not treated as a reply | `ec2c1c6` |
| C4 | a persisted write marked supplies bought off a food-only count | `13451db` |

**Three new libs, each fixing a bug of its own:** `lib/vendorMoney` (money was *silently vanishing from the ledger* — `STAGES` omitted `'Booked'` and `'Paid'`, two statuses V2 actively writes), `lib/rsvp` (one RSVP vocabulary, replacing four), `lib/exhaleGate` (one named invariant, replacing two inline conditions that had already drifted apart).

**Suite: 181 suites / 2720 passing.** **Ten bug-pinning tests rewritten, not deleted** — each asserted the defect as correct behaviour; each now has a paired positive case, so the calm states stay reachable and the class cannot regress in either direction.

The last fix is the best evidence the approach works: **C1's double-count was caught by a test this repo wrote earlier the same day.** The tests are now doing the job the audits were doing by hand.
