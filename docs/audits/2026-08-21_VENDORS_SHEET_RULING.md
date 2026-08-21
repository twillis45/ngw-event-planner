# Vendors sheet ("People you're hiring") — board ruling, 2026-08-21

Eight seats: Rams, Tufte, Norman, Wroblewski, Zhuo, Weiss, Venue Ops,
Grandmother. Convened on the host's report: "I thought we redesigned the
people you're hiring to match the other sections styling?"

## The finding that reframes the complaint

**The sheet is ALREADY an accordion.** `sheet.focus === v.id` single-open
(HostShellV2.jsx:16613) is the same contract Calls-to-make uses
(`decOpenCard`, :2140). Nobody should rebuild this as `.frow` rows — that
misreads the complaint and loses a week.

What is actually wrong: **the collapsed face is four stacked bands** where
every restyled sheet shows one line. Head (40px monogram + 2-line-clamped
name + status pill) → optional status picker → contact band (button +
sentence + ledger chip) → chip row.

**And amber is the DEFAULT, not the exception.** `.vc-chip` base is
`color:var(--warn); background:var(--warn-tint)` (styles.css:2582-2583).
One collapsed card can show FOUR amber marks (vendor-flagged, worry,
Insurance, and a silent contact sentence). Nine vendors ⇒ ~20 amber marks
plus the conflict bar. UX_02 reserves amber for needs-attention; we spend
the whole colour budget on resting state.

Third: five identical "No record of reaching out yet." lines — a constant
rendered five times is zero information five times.

## RULING

1. **The accordion stays.** It is the house idiom already.
2. **The collapsed face reduces to ONE row** in `.frow`/`.sec-row`
   grammar: identity left, money right (tabular-nums), at most one
   exception chip. Everything else below the fold.
3. **Amber becomes an exception, not a default.** `.vc-chip` base goes
   neutral; amber per-instance only, for a dated/stated consequence.
   Cap: one amber mark per collapsed card, ranked.
4. **The repeated null sentence leaves the collapsed face.** Absence of a
   contact record is the default state of the world, not news.
5. **Settled vendors fold** (confirmed + no promise + no COI + nothing
   owed) the way settled decisions do.
6. **The right-hand detail panel is a SEPARATE item**, sequenced last,
   on-demand only — never a permanent third pane.

## Chip rank (the single selector)

1. `Vendor flagged an issue` — amber (they told us)
2. `Silent N days` — amber, only when `contactState(v).silent`
3. `Insurance due <date>` — amber inside its window, neutral outside
   (UX_02: a colour states its reason)
4. else the quiet memory chip, neutral, or nothing.
Suppressed entirely on `isVendorConfirmed && !worry && !coiAct`.

## MUST NOT CHANGE (honesty rails)

- `contactState`'s three distinct sentences — "no record" ≠ "they ignored
  you" ≠ "they came back". Never merged, never inferred.
- Send-ledger attested vs verified (outline vs filled, `--danger` only
  for a system failure); `isVerifiedState` is the only promoter.
- No fake sent states; `logVendorContact` records what the host says.
- The ledger-beats-sentence rule (`vSend ? '' : …`, landed 2026-08-21).
- COI truth + informal-helper clearing; `isVendorConfirmed` stays the
  sole green predicate.
- Pricing hints stay BESIDE the cost, never inside it.

## Sequence (smallest first)

1. **★ FIXES THE COMPLAINT** — collapse the face: status picker + entire
   contact band move into `.vc-more`; null sentence off the face; ranked
   single-chip selector. JSX only.
2. `.frow` metrics: monogram to 20px or gone, `--sp-2` padding, money to
   `.amt` tabular-nums, status as plain text + the `▾`.
3. Flip `.vc-chip` off `--warn` (RED-PROOF: reintroduce a two-amber card
   and confirm a gate fails).
4. Settled fold.
5. Sheet toolbar (search/filter) — matters at 12+.
6. On-demand detail panel ≥1200px. Separate session.

## Risks

- Scope creep into a rewrite (item 1 ≈ 40 lines; item 6 ≈ a week).
- Moving the contact band below the fold could reduce contact logging —
  mitigated by keeping "Silent N days" ON the face, so the prompt
  survives even though the control moves.
- The chip selector can hide a real emergency: rank by time-to-consequence
  and verify a COI-overdue vendor still surfaces past a stale memory line.
- `.vcard.open .vc-more{max-height:1500px}` is a padded guess — measure
  `scrollHeight` on a worst-case vendor after item 1.
- `grid-column:2` targets `.vcard` BY CLASS (styles.css:3957): a new
  wrapper silently kills the wide-canvas exemption (cost an hour on
  `.roster` already).
- Status-as-text may read unclickable: verify the `▾` tap target with
  `elementFromPoint`, not computed geometry.
