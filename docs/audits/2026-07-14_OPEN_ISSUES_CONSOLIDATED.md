# Open Issues — Consolidated

Date: 2026-07-14 · Sources: 12 ported artifact audits + the in-repo audit set + the [claim source-of-truth sweep](2026-07-14_CLAIM_SOURCE_OF_TRUTH_SWEEP.md).

**Method:** every item below was **verified against current code**. An audit saying "open" does not mean open — audits go stale, and several here were badly stale. Items the docs called open but that verify FIXED are listed in §5 so nobody re-files them. Nothing in this doc is taken on an audit's word.

**Status of the SSOT re-sweep:** a second, dedicated sweep of the vendor-SSOT bug class (four independent lenses: predicate consumers, claim strings, visual/green states, legacy App.js) is in flight. §1 will grow when it lands — the first sweep was organised by domain and missed `returnNarration` precisely because that surface belongs to no domain.

---

## 1. The claim-truthfulness class — the through-line of the whole list

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

## 4. Closed today (2026-07-14)

- **Vendor SSOT #1** — `867af98` / `48f6414`: "confirmed" reserved for `isVendorConfirmed` across six surfaces; `dayBefore` vendors row found outside the original blast radius. *(Three aggregator surfaces remain — §1b.)*
- **City autocomplete** — `2cc75b1`: the field the app **blocks** you for had no autocomplete, while `saveCity` **rejects** a bare city. Ported the key-less ~29.7k-entry list from legacy.
- **Address autocomplete on lodging** — `b2bb55e`: hotel/rental + backup fields now use the same lookup as the venue. Disambiguates Charleston SC from Charleston WV.
- **12 audits ported from artifacts** — `696be04`: they existed only as published artifacts and were invisible to any repo search.

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

## 6. Recommended order

1. **C4** — the persisted write. It is the only finding actively corrupting stored data; every day it runs, more events carry false `done: true`.
2. **C2** — hidden bills. One-file fix: a payment-verb guard ahead of the `/cater/` and `/vendor/` branches.
3. **C3** — one token: add `'pending'` to the `guestCountResolved` allow-list. Kills the whole "you're all set" chain for imported rosters.
4. **C1** — give `hostSpending()` a vendor term via the existing `vendorBalance`/`vendorPaid` helpers. Largest blast radius, so it lands after the cheap kills.
5. **§1b (S1–S3)** — finish SSOT #1.
6. **§1c (E1–E5)** — `total > 0` guards + a "nothing planned yet" branch. **Update `dayBefore.test.js` in the same commit** — it currently pins E2.

Then adopt the rule, mechanically checkable:

> **A presence predicate may never license a completion claim. Zero may never read as done.**
