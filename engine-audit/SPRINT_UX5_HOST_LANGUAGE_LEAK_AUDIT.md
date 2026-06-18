# Sprint UX-5 — Host Language & Planner Leak Audit

**Date:** 2026-06-18 · **Branch:** `main` @ `511e9db` · Suite **250/250** · build compiles.
A subtraction sprint — no new intelligence/memory/planning. Prefer deletion over replacement.

## 1. Leak inventory (host-reachable surfaces only)

| # | Surface | File · loc | Current text | Why it leaks planner thinking | Action |
|---|---|---|---|---|---|
| 1 | **Post-create success modal — the fork** | App.js ~9095 | "How are you capturing the vision? · We're together now — let's talk it through · I'll set it up and **send it to the client** · **Open intake** — then **Share with client** · **Add client** · Skip — just open the event" | A self-host has **no client** to send to, and these buttons route into the fully-planner-framed **Client Intake**. The heaviest leak, at the highest-leverage moment. | **DELETED for hosts** → "Open your event →" + "Add another event" ✅ |
| 2 | **Success modal — NOT DONE receipt** | App.js ~9019 | "Client contacted: No · Messages sent: None · Notifications sent: None · **Payment created: No · Money moved: None**" | CRM/planner honesty receipt — a host has no client to contact, no payment to create. | **Host-framed** → one line "Nothing was sent or charged" (keeps the No-Guesswork honesty) ✅ |
| 3 | **The Intake (entire flow)** | ClientIntakeFlow.jsx | Tab "**Client Intake**"; Step 2 "**Client Contact**", "**PRIMARY CLIENT**", "**SECONDARY CLIENT**" | The whole intake is "planner collects a client's details." **Zero host adaptation.** | **Funnel cut** (via #1) + host nav already hides the tab. Deeper host-framing = **remaining** (see §4). |
| 4 | Create modal — audience picker | App.js ~8281 | "Who are you planning this event for?" → option "A client" | A persona selector that names "client". | **Left** — it's the legitimate self-identification picker (host/operator/planner); low-confidence to touch. |
| 5 | Create kit — corporate | App.js ~8472 | "Approval checkpoints" in the Corporate kit checklist | Planner workflow concept. | **Left** — a self-host won't pick the Corporate kit; very low host traffic. |
| 6 | (Mostly inert) L1 CRM nav, "Pipeline/Clients/Vendor Bank", planner code-comments | various | — | Real leaks, but **already removed from the host journey** by Host Home (UX-2) + host nav hiding them. Comments aren't user-visible. | **N/A** — not host-reachable. |

## 2. Fixes applied
- **Success modal fork → host-clean finish** (deletion). Gated by `accountTypeOf(profile, clients) === 'host'`; planner accounts keep the full fork unchanged.
- **NOT DONE receipt → host-plain "Nothing was sent or charged"** (one-line replacement; the only host-relevant honesty).
- Net effect: the host's **main funnel into the planner intake is removed**, and the create-flow's last visible planner language is gone.

## 3. Screenshots
- `review-artifacts/ux5_host_success.png` — host success: CREATED (host items) · NOT DONE "Nothing was sent or charged" · "Open your event →". No vision/client/intake/payment language.

## 4. Remaining leaks
1. **The intake's internal framing (the #1 remaining leak).** `ClientIntakeFlow.jsx` is planner-only: "Client Intake", "Client Contact", "PRIMARY/SECONDARY CLIENT". A self-host shouldn't see a client-contact step at all. **Why not fixed here:** properly host-ifying it means threading a host flag, relabeling every step, and **dropping the Client-Contact step** — that's an *adaptation*, which crosses this sprint's "do not redesign workflows" guardrail. **Mitigated now:** hosts no longer funnel into it (the host nav hides the tab and the success modal no longer routes there). **Recommend a scoped "Host Intake v1" sprint:** relabel + delete the client-contact step for `recordKind:'event'`, keeping only Event details / Guests / Budget / the meaning step (which powers Event Identity).
2. **Minor:** the create-modal audience option "A client" (#4) and the Corporate kit's "Approval checkpoints" (#5) — both in low-traffic host paths; cosmetic.

## 5. Recommendation
**Ship.** The two fixes remove the highest-confidence, highest-leverage host leaks (the post-create planner fork + the CRM receipt) and sever the host's path into the planner intake — exactly the "exposing too much in the intakes" concern, addressed by *not routing hosts there*. The intake's internal host-framing is real but is an adaptation, not a deletion, so it belongs in a dedicated **Host Intake** pass rather than being half-done under a no-redesign sprint.

**Stop after UX-5.** No new features, no workflow redesign. The deletions are the product.
