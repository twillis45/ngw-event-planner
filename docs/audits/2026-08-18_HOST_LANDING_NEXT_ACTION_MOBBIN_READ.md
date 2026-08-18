# Reference scan — host landing: "what needs doing next" without an ops console — 8/18/2026

Source: Mobbin (screens, ios, deep, limit 6 × 3 queries). Checked first: `project_now_view_host_shell`,
`feedback_ruthless_host_lens`, `project_next_step_spine`, and the
[2026-07-29 Mobbin Competitive Read](2026-07-29_MOBBIN_COMPETITIVE_READ.md).

Three intents, run separately.

## 1. One next action above a short remainder list

**Pattern found:** the leaders put a *dismissible single-item prompt* above the list, and the
prompt carries its own CTA — the list below is never the hero.
**Examples:** [Asana — Home](https://mobbin.com/screens/91a91624-c14c-4d13-a760-1dd2ac9e0f79) ·
[Whatnot — Seller Hub](https://mobbin.com/screens/3d9cd38b-74bd-4443-aba7-471f838e791b) ·
[Life Reset — Day 1/66](https://mobbin.com/screens/f9afa979-4998-4fa8-8d21-05dbfb75a695) ·
[Numo — Today](https://mobbin.com/screens/ce69ef20-ae7a-4f09-85e7-cb7e621f5aae)

- Asana leads with a plain sentence ("A task is due in 3 days") + one filled CTA, then *Recents*.
  Our NOW hero is the same shape but names the action instead of the deadline — keep ours.
- **Whatnot is the closest analogue and the one real lesson:** it shows "Today's Tasks — You're all
  caught up" *and* a "Get Started · Step 3 of 4" progress card in the same column. Two competing
  status claims at once. That is the ops-console feel arriving by accumulation, not by any one card.
- Life Reset and Numo both cap the visible list at 3–4 rows with counts on the filter chips, which
  matches our ~3-to-dos-plus-fold cap.

**Our decision:** follow (already do) · **diverge** on Whatnot's stacking.
**Why:** the NOW command hero + Next-Step Spine already is this pattern; the transferable finding is
negative — never let a caught-up state and a progress meter co-render, which our host home can do
today when the spine resolves calm but onboarding chrome persists.

## 2. Host-side event overview / RSVP

**Pattern found:** consumer party apps show *no next action at all* — they show a roster and a share
link. The only next-action-bearing screens are ticketing/ops products.
**Examples:** [Partiful — Manage Guests](https://mobbin.com/screens/3a1ef7f0-69df-4db5-9d2e-110182ca106b) ·
[Luma — Guest List](https://mobbin.com/screens/bf0994ca-cd25-48d0-9af0-ee31324ca47a) ·
[Posh — Event Overview](https://mobbin.com/screens/74308f26-08de-441c-8ee7-257362cf852a) ·
[LINE — Event Details](https://mobbin.com/screens/3b62204c-46f5-4c0c-837b-2f58278ca2b9)

- Partiful: counts live *on the filter pills* (Going 1 · Maybe 0 · Invited 1) — no separate stat row,
  no verdict. Warm gradient, emoji status. The calmest host surface in the set.
- **Posh is the ops console, named:** RSVP 1 · Page Visits 2 as bare stats over a chart, then a
  four-row utility list (Scan Tickets / Orders / Approve Pending Guests). Nothing tells the host what
  to do. This is exactly the read the Ruthless Host Lens rejects.
- LINE compresses the whole RSVP state to `✓2 ?0 ✗0` on one line and spends the rest of the screen
  on three actions.

**Our decision:** follow Partiful/LINE (counts ride on the control, not a stat block) · reject Posh.
**Why:** confirms the 07-29 thesis from the host side — nothing in the consumer category guides,
so our next-action hero is genuine differentiation, but the *counts* around it should stay attached
to the filters they act on rather than becoming a dashboard row.

## 3. The caught-up state

**Pattern found:** universally a centered mark + one short line, and — importantly — **it owns the
whole screen**; nobody renders a caught-up message above more content.
**Examples:** [Notion — Inbox](https://mobbin.com/screens/97a17109-8022-42e1-bbe4-c43480ba8cfe) ·
[Sora](https://mobbin.com/screens/dc59a44b-cfb1-4b5e-a6ba-d678e3f6b3fc) ·
[Kraken](https://mobbin.com/screens/8d7f496d-0d75-4118-a696-520c7bc4ad3e) ·
[Otter AI](https://mobbin.com/screens/ed2a964f-6db5-4296-82cd-51c2eaa9b37e)

Notion is the only one that adds a second line and a tertiary link ("Change filter") — a next move
that isn't work. Sora/CVS decorate; Kraken/Otter are monochrome marks.

**Our decision:** follow, with the size caveat.
**Why:** our ALL CLEAR is an eyebrow chip in a hero that still has sections beneath it. Every leader
gives the exhale the full canvas. Worth testing ALL CLEAR as a full-bleed state on host home rather
than a chip color change — this is the concrete change this scan actually produced.

## Not scanned
Motion/launch asset — deliberately deferred. Direction isn't settled yet; generation happens after.
