# Sprint 52A — Studio Team Readiness Audit

Date: 2026-06-08 · Read-only (no code written) · Evidence with file:line.

## Headline
**Studio Team is two products glued at an unbuilt seam.** The *identity layer* (roster, roles, invitations, multi-tenancy) is production-grade and works end-to-end. The *operations layer* (assigning team members, messaging them, surfacing their readiness, showing them in Command Center / Day-of) is **almost entirely missing**. Nothing lies about it — but a beta user who invites a teammate will find the teammate can't be assigned, messaged, or tracked.

**Overall classification: C) Partial** — identity = A (works), operations = D (missing).

---

## 1. Studio Team inventory

**Built & working (identity layer):**
- `src/components/MembersModal.jsx` (224 lines) — full roster UI: list members, change role, remove, invite by email, cancel invitation, pending-invitations list.
- `src/lib/api/studio.js` — `listStudioMembers`, `listStudioInvitations`, `inviteStudioMember`, `updateStudioMemberRole`, `removeStudioMember`, `cancelStudioInvitation`, `claimPendingInvitations`.
- Supabase schema: `studios`, `studio_members` (role: owner/planner/assistant, RLS-protected), `studio_invitations` (email + role, unique per studio, auto-claim RPC). Migrations 001/003/004.
- Auto-claim: on every sign-in, `claimPendingInvitations()` matches the user's email to pending invites and inserts the membership (App.js auth effect). Idempotent.
- Backend: FastAPI `/admin` reads `studio_members`; comms routes already scope event access by `studio_members`.

**Data model is real and persisted** (Supabase Postgres, not localStorage). Roles gate member management (`isOwner = studio?.role === 'owner'`, MembersModal.jsx:60 — does NOT depend on the `currentUserId={undefined}` prop, which self-resolves via `supabase.auth.getUser()`).

---

## 2. Wiring diagram

```
IDENTITY LAYER  (A — works)                 OPERATIONS LAYER  (D — missing bridge)
┌──────────────────────────┐                ┌───────────────────────────────────┐
│ studios / studio_members │                │ timeline task.owner = FREE TEXT    │  ✗ no ownerId → member
│ studio_invitations + RPC │   ✗  no link   │ GlobalCompose "__team" = internal  │  ✗ notes bucket, not member msg
│ MembersModal (invite/    │ ─────╳───────▶ │ CommandCenter = event/vendor only  │  ✗ zero team refs
│   role/remove)           │                │ EventDayMode = vendor escalation   │  ✗ no staffing/crew
│ auto-claim on sign-in    │                │ readiness = vendor/timeline only   │  ✗ no team capacity
└──────────────────────────┘                └───────────────────────────────────┘
        owners can invite                      members never appear in any workflow
```

The seam: events carry `timeline / vendors / budget / guests / commClient` — **no `teamAssignments`, no `ownerId`, no `crewManifest`.** Member roles exist only for access control.

---

## 3. Reachability analysis

**Reachable, conditionally, and buried.**
- Gate: `auth?.configured && auth?.session` (App.js:11083) — Supabase configured **and** signed in. Prod satisfies both → reachable post-login.
- Path: **profile avatar** (bottom-right sidebar desktop / top-right mobile) → Profile/Settings modal → **"Members"** button (next to "Sign out") → MembersModal. Desktop + mobile both.
- **No nav item, no dashboard card** mentions Team/Members. The primary nav is Home/Pipeline/Calendar/All Events/Clients/Settings — no Team.
- No dead/orphaned entry points; the path is wired correctly.
- Verdict: **(c) reachable but not discoverable** — a planner would likely never find it without being told.

---

## 4. The 8 questions

| # | Question | Answer | Class |
|---|----------|--------|:---:|
| 1 | Does Studio Team exist? | Yes — roster, roles, invitations, multi-tenancy, persisted | **A** |
| 2 | Can users create team members? | Yes — owners invite by email → magic link → auto-added on first sign-in | **A** |
| 3 | Can users assign team members? | No — task `owner` is free text ("Events Team", "You"); no roster picker, no `ownerId` | **D** |
| 4 | Can users communicate with team members? | No — the "Team · Internal note" channel is a local notes bucket, never distributed to members (honestly labeled) | **B** |
| 5 | Can team readiness be surfaced? | No — zero capacity/workload/availability anywhere | **D** |
| 6 | Does Command Center know about Studio Team? | No — event/vendor-scoped only; `owner` shown as free-text string | **D** |
| 7 | Does Day-of Mode know about Studio Team? | No — vendor escalation cockpit; no staffing/crew manifest | **D** |
| 8 | Is Studio Team reachable in current UI? | Yes, conditionally (Supabase + signed in) and buried in Settings | **C** |

---

## 5. Beta blocker analysis

**Is Studio Team a beta blocker for Planner #1 (solo)? — No.**
- The first beta is a solo planner. Team-operations being absent does not block solo use; events, estimator, vendors, budget, comms, documents, day-of all work without team.
- **No truthfulness violation:** the one place "Team" appears (the `__team` channel) is honestly labeled "Internal note," and the roster modal makes no false promises. Nothing claims assignment/messaging that doesn't exist.

**The one real risk (soft, not blocking):** a beta planner who *invites a teammate* (the invite works) will discover the teammate can't be assigned tasks, can't be a message recipient, and never appears in Command Center / Day-of. That's an **expectation gap**, not a broken promise. Because the entry is buried in Settings with no nav item, exposure is low — but if you intend to recruit multi-person studios, this gap becomes prominent fast.

**Recommendation for beta:** ship the solo beta as-is. Either leave Members where it is (buried = low over-promise), or temporarily add a one-line "Team workspace — invites work; shared assignments coming soon" note in the modal so an early multi-seat tester isn't surprised.

---

## 6. Recommended Sprint 52B

**First decide scope:** is multi-person studio in the first beta, or solo-only?

**If solo-only (likely):** *Do not build team-ops.* Optionally add the honest "shared assignments coming soon" line in MembersModal. Defer everything else. This is the cheapest path and matches "no half-built features in front of beta users."

**If team IS in scope, build the bridge in this order (highest leverage first):**
1. **Assign tasks to members.** Add `ownerId` alongside the existing free-text `owner`; render a roster picker (studio members) in the task editor and Run-of-Show. The `owner` field and member list already exist — this is wiring, ~1 surface.
2. **Surface "who owns what" in Command Center.** Once `ownerId` exists, group/annotate open decisions by member; add a light "your items vs. team items" filter.
3. **Team in Day-of.** Crew manifest / who's-on-duty from `ownerId` on Run-of-Show segments.
4. **Real team messaging (optional).** Decide whether the `__team` channel should address members (notifications) or stay honest internal notes. Don't build distribution unless email/notify is real.
5. **Team readiness (last).** Only after assignment exists — capacity/workload from assigned items.

**Do NOT build:** team chat, presence, real-time collaboration, workload auto-balancing — premature without evidence.

---

## Success condition met
We now know exactly: Studio Team **identity is production-ready; team operations are missing; the feature is reachable but buried; and it is not a blocker for a solo Planner #1.** No code was written.
