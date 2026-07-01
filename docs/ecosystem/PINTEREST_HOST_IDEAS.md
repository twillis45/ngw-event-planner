# Pinterest for Host Ideas — Spec (BACK BURNER)

_Status: parked / unscoped. Flagged 2026-06-30. Do not build before activation/PMF (see project_activation_is_the_bottleneck). Host-scoped, US/English._

## The wedge
NGW owns the **logistics** half of hosting — the plan, food math, budget, day-of run-of-show. It does **not** touch the **inspiration / aesthetic** half — theme, decor, tablescape, color, "the vibe" — which is exactly **where most hosts START**, and where Pinterest already dominates.

The unique move is the **bridge**: pull a host's Pinterest inspiration INTO the event, and let NGW's engine translate "this is the look I want" → a grounded **color identity + decor plan + shopping list** scaled to their guest count. Inspiration → execution. Nobody else closes that loop — Partiful/Evite stop at the invite; Pinterest stops at the board.

## Host fit (not planner ops)
This is an **inspiration surface**, never a CRM/mood-board tool. It feeds systems that already exist:
- **Event Identity / theme** — `event.theme`, the identity color tokens (EVT_IDENT), the invite cover.
- **Decor decisions + the day-of "Décor & florals install" cue.**
- **The shopping/supply list** (linens, candles, florals, lighting via SUPPLY_INTEL).

## Phased plan
**Phase 1 — Inspiration capture (light, no Pinterest API).**
Host pastes a board/pin URL **or** uploads 2–4 inspiration images. We extract the **dominant colors** + keep the images as a "Your vibe" card. Output: sets the event's **identity color + theme mood** that the invite cover and decor plan reference. Pure client-side color extraction; no OAuth. Cheapest path to value + a shareable identity (feeds activation).

**Phase 2 — Decor plan from the vibe.**
Host tags the inspiration (tablescape / florals / lighting / color). The engine maps tags → **supply lines** (existing SUPPLY_INTEL: linens $6–15, lighting $12–28…) scaled to guest count, dropped onto the shopping list with the usual "because" provenance.

**Phase 3 — Pinterest OAuth + board import + engine translation (the moat).**
Real Pinterest auth → import boards → auto-suggest the decor shopping list from pinned looks. Heavy (OAuth, API tier, rate limits, ToS) — **post-PMF only**.

## Constraints / guardrails
- **Honesty:** it's the **host's own** inspiration reflected back — never "Pinterest recommends" or fabricated taste.
- **Activation-first:** Phase 1 only until there's a corpus/PMF. Don't build OAuth speculatively.
- **Host-scoped:** an inspiration lens, not a planner deliverable.
- Color extraction: prefer on-device (Phase 1) to avoid backend cost.

## Open questions
1. Does Phase 1 actually pull **activation** (vibe → shareable invite identity), or distract from the core engine? Instrument before scaling.
2. Pinterest API access tier + ToS for Phase 3 — gate the whole moat.
3. Image upload vs URL paste for MVP — which has less friction for a non-pro host?

## Related
project_pinterest_host_ideas (memory) · project_event_identity_system · project_editorial_cover_system · project_competitive_identity_invite · project_activation_is_the_bottleneck
