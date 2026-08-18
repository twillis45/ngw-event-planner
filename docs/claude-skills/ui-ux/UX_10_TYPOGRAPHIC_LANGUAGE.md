# UX_10 — Typographic Language

Status: drafted 2026-08-18 from an 8-seat review board (`convene-review-board`).
Not yet ratified — this is the proposal the board's findings produced, for
review before it becomes doctrine alongside UX_01–UX_09.

## Why this exists

The type *scale* (`demo/src/design/tokens.js` → `type.size`, 13 steps) has
existed for a while. A type *language* — which role to reach for, when, and
what happens at the edges — never has. The board's unanimous finding, reached
independently by three different lenses:

> 151 `<Text>` components exist against **4,846** raw `fontSize:`
> declarations, **806** of them hardcoded literals with no token at all. The
> 7-role ladder reaches only 5 of 13 scale steps. `4xl` has zero uses.
> `weight.medium` (500) is defined and used nowhere.

A scale nobody is routed through is documentation, not infrastructure. This
document is the routing.

## 1. The closed role set

Every role is a **locked quadruple** — size, weight, leading, tracking — plus
a stated job. A role with an undefined quadruple member is not yet specified.

| Role | Size | Weight | Leading | Tracking | Job |
|---|---|---|---|---|---|
| `title` | 22px | 600 | *pending §4* | 0 | Page/screen identity. One per screen. |
| `heading` | 16px | 600 | *pending §4* | 0 | Section identity within a screen. |
| `body` | 14px | 400 | *pending §4* | 0 | Primary reading content. |
| `bodyStrong` | 14px | 600 | *pending §4* | 0 | **Rule, not feel:** emphasis on a single fact within a body block — a number, a name, a decision. Never a whole paragraph. |
| `secondary` | 13px | 400 | *pending §4* | 0 | Supporting context the reader may skip on a first pass but needs on a second. |
| `caption` | *resolve §2* | 400 | *pending §4* | 0 | Metadata about content: timestamp, source, unit. |
| `label` | 11px | 600 | *pending §4* | 0.08em | Chrome only — field names, section eyebrows. **Never data-bearing** (§3). |

**`weight.medium` (500) is retired** unless a role is found for it. An unused
token in the API is an invitation for the next contributor to introduce a
weight tier nobody agreed to.

## 2. Resolve the caption collision — decision required

Three values currently answer to "caption":

| Source | Value |
|---|---|
| `Text variant="caption"` | 11px |
| `type.size.caption` (266 direct uses) | 12px |
| Figma `size/caption` | 11px |

Two fixes were proposed, and they are not the same fix:

- **Bringhurst (proportion):** pick one value. The 1px gap between 11 and 12
  on a scale already crowding six values into 11–14px isn't justified by
  anything — collapse it.
- **Curtis (systems):** picking a value doesn't stop the next drift. The
  underlying problem is Figma and code have no synced source of truth for
  role names, only for hex/px values (fixed 2026-08-18, see
  `docs/audits/2026-08-18_FIGMA_VALUE_DIFF.md`). Fix the sync mechanism, not
  just this instance.

**Recommendation: do both.** Collapse the value now (11px, matching the two
majority sources), *and* treat "role-name sync" as a follow-on to the
value-sync work already done — same mechanism, same discipline, applied to
names instead of just numbers.

## 3. Size and contrast are independent variables

**This is the single highest-leverage finding in the review**, reached
independently by three unrelated populations (first-timer, low-vision, on-site
planner). The current ladder recedes in size *and* color together — every step
down gets smaller **and** dimmer at once:

```
title/heading/body   → text.primary   (bright)
secondary/caption/label → text.secondary/tertiary (dim)
```

Consequence, stated by each lens in its own terms:
- **First-timer:** dimmed content reads as decorative chrome, not "read this
  second" — including labels and status text a first-timer must read to act.
- **Low-vision:** contrast headroom shrinks exactly where size is already
  smallest (`text.tertiary` ≈5.0:1, applied to 9–11px text).
- **On-site planner:** the operational fact needed in a one-second glance
  lives in the tier built to be skipped.

**Rule:** a role may be small without being low-contrast. **Operational or
actionable data may never live in a tier below `--ngw-text-secondary`
contrast**, regardless of size. Decorative/chrome content may be both small
and dim; data never gets both penalties at once.

## 4. Leading is a function of size and measure, not a role constant

Current: three leading values (1.2/1.4/1.55) assigned by role. Bringhurst's
finding: this gets the size relationship backwards. Large type needs
*proportionally less* leading; small type needs *proportionally more*, because
the reader is tracking short line-starts. 1.4 applied uniformly to both 22px
titles and 11px captions is two different amounts of whitespace doing the same
nominal job.

**Action required, not yet done:** measure actual rendered line length (the
character-count measure) per role at 390px, and set leading per size-and-measure
pairing rather than per role name. The `*pending §4*` cells in §1's table
resolve here. This needs rendered screens, not token arithmetic — do not fill
those cells from formula alone.

## 5. The size floor — the sentence a size must pass

`2xs` (9px) has 33 uses; `xs` (10px) has 77. Neither currently has a stated
justification. The board's proposed test:

> *"Smallest size, used for **X**, legible at **Y** distance under **Z**
> conditions."*

If a size cannot fill in X/Y/Z, its uses are a content problem, not a type
problem — the fix is removing content, not defending the size. Every use of
`2xs` and `xs` gets audited against this sentence before either is retained.

**Decided 2026-08-18: NGW's mobile surface is an operating interface, not a
reading interface.**

The board split on this — Wroblewski read the 9–13px band as evidence that
progressive disclosure was never done, and would cut content until small
sizes aren't needed; the density archetype read density as legitimate and
would defend a narrower, audited floor instead. The product's own
architecture settles it: `DensityContext` ships a `crisis` mode that actively
*hides* content to protect the active surface, `EscalationContext`
restructures the interface under pressure, and the product's own standard
states the target directly — *"a premium event operations command system, not
a generic SaaS dashboard, spreadsheet skin, or task manager"* (root
`CLAUDE.md`). That is not incidental complexity a content cut would remove;
it is the product's thesis. A command system is scanned, not read.

**This is not a blank check for small type.** Density being legitimate does
not mean every current use of it is earned — it means the standard is the
X/Y/Z sentence below, not "cut until you don't need it." Any `2xs`/`xs` use
that can't fill in X/Y/Z is still wrong; it's simply wrong for being
unjustified density, not for being density at all. The audit below is now
unblocked and runs against that standard.

## 5a. Size-floor audit results — 2026-08-18

Ran against the standard §5 sets, now that §5 is unblocked. **177 real
design-system uses** of `type.size['2xs']` (9px, 33 uses) and `type.size.xs`
(10px, 143 uses) — not the 33+77 figure quoted earlier in this document,
which came from a coarser count; this is the exhaustive one. **19 of the 177
are in `admin/AdminConsole.jsx`**, an internal tool outside this document's
`facing: public` scope — audited separately, lighter bar.

Also found and set aside: **429 additional hardcoded `fontSize: 9` /
`fontSize: 10` literals with no token at all**, of which **404 are in that
same admin file**. That population is a §8 enforcement problem (raw literals,
not tokenized), not a §5 size-floor problem — recorded here so it isn't lost,
not resolved here.

**Method.** Read every hit in context (not the token count alone) and sorted
into the categories below. This is a category-level audit, not a claim that
each of the 177 got individual sign-off — a category verdict applies to every
site matching that pattern.

| Category | Count (approx.) | X/Y/Z verdict |
|---|---|---|
| Tracked-uppercase section labels (`EVENT`, `VENDOR`, `TASK`, `DECISION`, `EMAIL`/`CALL`/`WHATSAPP`) | ~40 | **Pass.** Decorative chrome by design, and where a labeled value follows, it correctly renders at a larger size in a sibling node — confirmed in `CommunicationHub.jsx:1409-1419`, where `EMAIL`/`CALL`/`WHATSAPP` sit at `2xs`/tertiary but `{vendorEmail}`/`{vendorPhone}` render at `sm`/accent as siblings. This is the pattern §3 asks for; extend it, don't flag it. |
| Timestamps / "when" metadata (`r.when`, `q.when`, `fmtTs`, `m.editedAt`) | ~8 | **Fail — §3 violation.** Small size paired with `textTertiary`, and a timestamp is exactly the kind of fact a planner scans for. `CommandCenter.jsx:3568`, `:3590`; `CommunicationHub.jsx:1159`. |
| Status / count / due-state (`status`, `count`, `type_`, `due`) | ~6 | **Fail — §3 violation.** `CommandCenter.jsx:3470` (a badge count), `:3704` (a status value under its label) — both dim *and* small on content whose entire job is to be read at a glance. |
| Names and identity (`v.name`) | 1 confirmed, likely more unaudited | **Fail — §3 violation.** A vendor or contact name is data, not chrome; found at `CommandCenter.jsx:3672`. |
| Secondary detail under a primary line (money range, "set when created", italic note) | ~6 | **Borderline pass.** `ClientIntakeFlow.jsx:551,674`; `CommunicationHub.jsx:854`. Genuinely secondary to an adjacent primary line — closer to `secondary`/`caption` role intent than a violation, but at `xs` (10px) they're one step smaller than the `secondary` role (13px) specifies. Recommend promoting these to `secondary` rather than leaving them at a bespoke `xs`.
| Edit/Delete message-action buttons | 2 | **Fail — different failure mode.** `CommunicationHub.jsx:1166,1170`. Not a legibility problem (short, familiar words) but a **touch-target problem outside this document's scope**: 10px text with no stated minimum hit-area is an interaction-design finding, not a typography one. Flagged for `UX_05_COMPONENT_PATTERNS`, not fixed here.
| Everything else in the 177 (dense, mixed contexts across `VendorPlanningWorkspace.jsx` (69 uses — the single largest concentration), `ChecklistGenerator.jsx`, `DecisionApprovalCenter.jsx`) | ~113 | **Not yet categorized.** The two largest files by use-count were not read line-by-line in this pass. This audit is a first sweep establishing the categories and confirming real violations exist in the pattern §3 predicted — it is not exhaustive, and `VendorPlanningWorkspace.jsx` specifically needs its own pass before this section can be called complete. |

## 5b. `VendorPlanningWorkspace.jsx` — full pass, 2026-08-18

The single largest concentration: 69 uses (1 at `2xs`, 68 at `xs`), all read
in context. This file contains the **most severe violations found in the
audit** — not metadata, but contract terms and decision rationale:

| Finding | Where | Severity |
|---|---|---|
| **Decision rationale, truncated.** "Rationale: {why}" — the system's captured answer to *why this vendor was chosen* — renders at `xs`/`textTertiary`/italic with `text-overflow: ellipsis`. The one piece of content specifically designed to prevent a planner re-litigating a decision is small, dim, and can be cut off mid-sentence. | line 830 | 🔴 |
| **Vendor track record, truncated.** "Memory: {line}" — past-event history for this vendor — same treatment, same ellipsis risk. | line 841 | 🔴 |
| **Cancellation policy rendered as the dimmest, smallest text on the card.** `extracted.cancellation_policy` — real contractual terms — at `xs`/`textTertiary`, no truncation but no emphasis either. This is exactly the sentence that matters when a planner needs to cancel and is scanning under time pressure. | line 2505 | 🔴 |
| **Disclaimers, twice.** `extracted.disclaimer` and `result.disclaimer` — both `xs`/`textTertiary`/italic. Whatever a disclaimer is protecting against, dimming it works against that purpose. | lines 2508, 3876 | 🔴 |
| **Verification evidence and its absence-warning share one treatment.** A quoted supporting message (`"{row.evidence}"`) and the warning when *no* quote exists ("No supporting quote — check the original before applying") render identically at `xs`/`textTertiary`. The warning is arguably the more important of the two and gets no more visual weight. | lines 3853, 3857 | 🟡 |
| Transient hints and confirmations (`step.editHint`, "Logged to activity feed.") | lines 1271, 1276 | 🟢 Borderline pass — genuinely transient, italic-hint convention is reasonable |
| "Not attached · track outside the app" — an honest fallback explaining a missing control | line 2570 | 🟡 Arguably under-weighted for an explanation the user needs to not go looking for a button that isn't there |
| "Max 10 MB" file constraint | line 1815 | 🟢 Pass — low-stakes, conventional placement |

**Confirmed working correctly, extend this:** "KEY DATES" (label, `xs`/dim) is
followed by `{d.label}: {d.date}` rendered at `type.size.sm` (11px) in
`textSecondary` — one step up, same split pattern as the `CommunicationHub`
contact rows in §5a. Section labels ("Attributes", "ACTION ITEMS", form
field labels like "Pay via") are correctly chrome — tracked, uppercase,
small, and never carrying the data themselves.

**Tally for this file:** ~8 confirmed violations, all clustered around
**vendor decision and contract content** rather than metadata — a sharper
finding than §5a's timestamps, because the cost of missing a cancellation
policy or a truncated rationale is materially higher than missing a
"2h ago." The label/data split pattern is present and correct elsewhere in
the same file, which means the fix is consistency, not invention — the
violations should be promoted to the pattern the file already uses correctly
for dates and contacts.

**What this confirms:** §3's finding wasn't hypothetical. The size+color
recession pattern the board flagged in the token *design* is present in real
call sites — timestamps, statuses, and a name were all found dimmed and
shrunk together. ## 5c. Remaining files — full pass, 2026-08-18

The earlier estimate of "~90 uses remaining" was wrong — the real count
across the 8 unaudited files is **72**, all now read in context:
`CommunicationHub.jsx`(33) · `ClientIntakeFlow.jsx`(10) ·
`DecisionApprovalCenter.jsx`(12) · `ChecklistGenerator.jsx`(6) ·
`OrchestrationSlice.jsx`(4) · `EventDayMode.jsx`(3) ·
`DesktopDensitySlice.jsx`(3) · `ImportWizard.jsx`(1).

**The single most severe violation in the entire audit is here:**

| Finding | Where | Severity |
|---|---|---|
| **A vendor's actual name rendered in `color.text.disabled`** — not `tertiary`, the tier below it, semantically reserved for inactive/unavailable UI. `{vendor.name.split(' ')[0]}` at 10px, disabled-tier color, on a live, actionable vendor. | `OrchestrationSlice.jsx:199` | 🔴 Worst finding in the document — disabled styling applied to active data is a category error, not a contrast tuning question |
| A decision item's relative timestamp (`fmtRelative(item.date)`), same pattern as §5a's `r.when`/`q.when` | `DecisionApprovalCenter.jsx:256` | 🔴 |
| A checklist task's assigned owner, in a tertiary-colored pill — exactly the accountability fact a planner scans for | `ChecklistGenerator.jsx:160` | 🔴 |
| "DUE {task_due}" and a decision "PENDING" badge, and a linked vendor's status word — all rendered at 9-10px. None are dimmed to tertiary (they carry real signal color: red, amber, green), but urgency and decision-state content this small falls below the floor regardless of color. | `CommunicationHub.jsx:1423,1440,1455` | 🟡 Different failure mode than dimming — undersized despite correct color |
| "Owner: {item.owner}" — `textSecondary`, not `tertiary` | `DecisionApprovalCenter.jsx:271` | 🟢 Borderline pass — one contrast tier better than the pattern above; same fact, different file, inconsistent treatment |

**Confirmed correct, multiple times over:** table column headers ("Category" /
"Budgeted" / "Actual" / "Variance" in `ClientIntakeFlow.jsx`), section labels
("Intake Confidence", "OPEN QUESTIONS", "EVENT"/"VENDOR"/"DECISION"/"TASK" in
`CommunicationHub.jsx`), and status/urgency pills that carry real signal color
(amber "missing fields," red "OVERDUE," green/amber vendor status) are all
correctly small **and** correctly not dimmed to tertiary — color carries the
meaning, size carries the emphasis-reduction, and the two aren't fighting each
other. This is the majority pattern across all 72 sites, which is worth
stating plainly: **most of the codebase gets this right.** The violations are
real but they're the exception, not the rule — which makes them easier to
name and fix than if the whole system needed rethinking.

**Also noted, not a §3 finding:** `OrchestrationSlice.jsx`, `EventDayMode.jsx`,
and `DesktopDensitySlice.jsx` all write `type.size.xs || 10` / `|| 11` rather
than trusting the import — a defensive fallback that only makes sense if the
token might be undefined at runtime. That's the same distrust-of-the-system
signal §1/§8 already flagged at the codebase level, showing up as a code
smell in three more files. Worth a lint rule of its own once §8's enforcement
lands.

---

**Total across all 177 design-system uses of `2xs`/`xs`:** every one has now
been read in context. Confirmed §3 violations: **~19** (CommandCenter/misc
~6, VendorPlanningWorkspace ~8, this pass ~5), concentrated in exactly the
content categories the board predicted — decision rationale, contract terms,
timestamps, ownership, and one outright category error. The remaining ~150+
sites are either correct chrome/label treatment or correctly color-signaled
status content, which is the pattern this document asks every violation to be
promoted to.

## 6. Platform is part of the specification, not an assumption

The font stack is `system-ui` (SF Pro on macOS, Segoe UI on Windows) — no
webfont ships, confirmed 2026-08-18 after finding `'Inter'` was declared for
months but never loaded. SF Pro applies optical size compensation below ~20px;
Segoe UI does not. In a scale where adjacent steps are 1px apart, cross-platform
metric variance can exceed the design's own hierarchy steps.

**Requirement:** the type language specifies targets that survive this, not
raw px against an assumed typeface. Concretely:
- Verify rendered x-height and measured contrast **on both SF Pro and Segoe
  UI**, as an automated screenshot check, not eyeballed on one machine.
- Any role whose distinction from its neighbor depends on sub-pixel rendering
  differences between platforms is not a real distinction.

## 7. Accessibility — what was actually checked, not assumed

Looked up rather than asserted from memory:

- **WCAG 1.4.4 (Resize Text)** sets **no minimum font size**. 9px is not a
  violation of 1.4.4 by itself — *if* the layout reflows cleanly at 200% zoom
  with no clipping, overlap, or forced horizontal scroll. **This has never
  been verified by rendering; it is currently unknown, not passing.**
- **WCAG 1.4.12 (Text Spacing)** requires content to survive a user's forced
  override: line-height ≥1.5×, paragraph spacing ≥2×, letter-spacing ≥0.12em,
  word-spacing ≥0.16em. Current leading (1.2/1.4) sits **below** the 1.5 floor
  that override must be able to impose without breaking layout. Not itself a
  violation — 1.4.12 is about surviving the override — but nothing in this
  system has been tested against it.
- **The honest read:** passing contrast *ratios* is not the same as passing
  *usability*. Platform HIG guidance (iOS: nothing under 11pt) treats sub-11px
  UI text as below where low-vision users can read without zooming — meaning
  they hit the 1.4.4 zoom requirement on every screen, for the 89% of text
  under 13px, as **baseline behavior, not an edge case.**

**Required before this document is ratified:** an actual render test — 200%
zoom, 1.4.12 spacing override applied, on both platform fonts — not a token
audit. No lens on this board could validate real-world severity without field
testing with actual low-vision users and actual on-site planners; that
limitation is real and is not closed by this document.

## 8. Enforcement — the part that makes this a language and not a table

Every prior finding traces back to one number: **806 hardcoded `fontSize`
literals with no token.** A role table with no enforcement is what produced
that number the first time. This document does not ship as doctrine without:

- A lint rule or CI check flagging raw `fontSize:` outside the token/role
  system.
- A migration plan for the 806 existing literals — codemod where mechanical,
  manual review where the "right" role is ambiguous (that ambiguity is itself
  a signal the role set is incomplete).
- Every one of the 13 scale steps either reachable through a named role, or
  formally retired from the published scale. `4xl` (26px, zero uses) is the
  first candidate for retirement.

## Open items before ratification

1. §2 — collapse the caption value (mechanical) + extend role-name sync to
   Figma (structural).
2. §4 — measure real leading/measure pairings from rendered screens; fill the
   `*pending §4*` cells.
3. §5/§5a/§5b/§5c — **DONE. All 177 uses read in context, audit complete.**
   ~19 confirmed §3 violations total, across decision rationale, contract
   terms, timestamps, ownership, and one category error (a vendor's name in
   `color.text.disabled`, `OrchestrationSlice.jsx:199` — the worst single
   finding). Most of the 177 (~150+) are correct — chrome/labels properly
   dim, status content properly signal-colored instead of dimmed. The
   violations are real but are the exception, which bounds the fix. Also
   surfaced, tracked separately: 429 hardcoded literals with no token (404 in
   `AdminConsole.jsx`) — an §8 enforcement gap — and a `type.size.xs || 10`
   defensive-fallback pattern in 3 files, a code smell for the same
   system-distrust §1 already named.
4. §6 — automated dual-platform render verification.
5. §7 — actual 200%-zoom + text-spacing-override render test.
6. §8 — land the lint rule before migrating literals, so the 806 doesn't
   regrow while being fixed.
