# Security Parity — Merge & Production Backend Verification

**Date:** 2026-07-31 · **PR #66** · **Merge `27305ee9`**

---

## Recommendation

**ACCEPT.** The merged security code is proven live on the production backend.

---

## Merge

| | |
|---|---|
| PR | **#66** — *security: bring backend auth and SSRF protections to main* |
| PR head | `1d941cc78c49de0406dc6e85708f34188cea56fd` |
| Base before merge | `b4405cd67d180f8d589a38621d3baaf8c9a49376` |
| **Merge SHA** | **`27305ee9a16057a1b444064388eb5a740412274d`** |
| Resulting `main` | `27305ee9` |
| Merged | 2026-07-31T14:28:06Z by `twillis45` |

Fast pre-merge re-check (not a full re-audit): `/api/ai/complete` absent from route
registration with no alias or flag; `require_planner` precedes the limiter,
which precedes any outbound fetch or provider call on both secured routes;
`follow_redirects=False` with per-hop revalidation; mixed DNS answers fail closed
(any non-public address in the resolved set raises); zero `detail=str(e)` on the
secured routes; no unrelated product, deployment or live-mode files; the tracked
hostv2 artifact carries no Supabase URL, backend origin, JWT, planner token or
bypass value.

## Post-merge CI — run `30638719620`

`jest` ✅ · `backend` ✅ · `cra-build` ✅ · `hostv2-drift` ✅ · `e2e` ✅

Backend **196 passed** · Jest **4045 passed** · `✓ hostv2 artifact matches source
(11 files, no drift)` · CRA `Compiled with warnings.`

## Backend deployment

| | |
|---|---|
| Mechanism | **Render auto-deploy** — `render.yaml` sets `autoDeploy: true`, service `ngw-events-api`, `rootDir: backend`, health `/health` |
| Tracked branch | repository default (`main`) |
| Manual action required | **none** — merging `main` triggered it |
| Deployment ID | not retrievable from this environment (no Render API credentials); identity proven behaviourally instead |

### Release identity — proven by behaviour unique to the security commit

A 404 alone would not be proof, so identity rests on behaviour that **did not
exist on `main` before this merge**:

| Route | Pre-merge `main` | Production now |
|---|---|---|
| `POST /api/ai/extract-document` (no auth) | **no auth at all** — proceeded to fetch/provider | **401 Planner authentication required** |
| `POST /api/docusign/send-envelope` (no auth) | **no auth at all** | **401 Planner authentication required** |
| `POST /api/ai/complete` | route existed | **404** |

Three independent behaviours flipped together in the direction of the merged
commit. No environment variable or configuration change could produce that.

## Route verification

| Route | Expected | Actual | Provider/fetch prevented? |
|---|---|---|---|
| `GET /health` | 200 | **200** `{"ok":true,"service":"ngw-events-api"}` | n/a |
| `POST /api/ai/complete` | 404 | **404** `{"detail":"Not Found"}` | yes — route gone |
| `POST /api/ai/extract-document` (no auth) | reject | **401** fixed message | yes — auth precedes fetch and provider |
| `POST /api/ai/extract-document` (invalid token) | reject | **401** fixed message | yes |
| `POST /api/docusign/send-envelope` (no auth) | reject | **401** fixed message | yes — no fetch, no DocuSign call |
| `POST /api/ai/feature` (no auth) | 401, route intact | **401** | yes — no provider spend |
| `GET /api/lodging/unfurl` | anonymous, allowlisted | **400** on all disallowed inputs | yes — refused before any request |

## SSRF verification

| Destination | Result | Rejecting control |
|---|---|---|
| `https://127.0.0.1/` (via extraction) | 401 | **authorization** — runs before URL validation and before any connection |
| `https://169.254.169.254/` (via extraction) | 401 | **authorization** — same |
| `https://127.0.0.1/x` (via unfurl) | 400 | **host allowlist** (https + exact hostname) |
| `http://www.airbnb.com/rooms/1` (via unfurl) | 400 | **scheme check** — http refused even for an allowlisted host |
| `https://evil.example.com/rooms/1` (via unfurl) | 400 | **host allowlist** |

Honest note: the extraction path's IP/DNS guards could **not** be exercised in
production, because authorization correctly rejects first and no planner
credential was created for testing. That ordering is the intended defence in
depth. The address classifier, per-hop redirect revalidation, redirect loop and
bound, size cap, timeout and content-type controls are covered by the 49 CI
tests — including mutation proof that disabling the non-public-address guard
turns 3 red and restoring automatic redirects turns 1 red.

Live public-to-private redirect testing was **not performed** against third-party
sites; doing so would mean hammering Airbnb/Vrbo to induce a redirect. CI covers
it with stubbed transports.

## Rate limiting

Not exercised live — a threshold test would create provider cost and abuse-log
noise for no new information. Verified by code identity (the limiter is in the
deployed commit, keyed by planner id, invoked before the fetch and provider call)
and by the CI tests that drive the real sliding window to 429 with `Retry-After`.

**Process-local**: with multiple workers the effective limit is
`AI_RATE_MAX × workers`.

## Logging and errors

Every production response was a fixed, client-safe message. No stack traces, no
provider exception bodies, no `sk-`/`openai`/`anthropic` strings, no bearer
tokens, no signed URLs. Neither secured route can return `detail=str(e)` — both
generic handlers now log server-side and return a fixed string.

Render runtime logs were not inspected (no dashboard credentials in this
environment); response-surface evidence only, stated as such.

## Frontend

**No frontend deployment performed, and none required.** The security change
touches backend routes the demo frontend does not call: production runs
localStorage-only with no `REACT_APP_API_BASE_URL`, so it makes no backend
requests at all. `public/hostv2` changed in the PR only because hostv2 imports
`@app/lib/aiProxy`; a generated hash change is not a reason to publish.

Production frontend remains `1bf2658819ef…` / `release_profile=demo`, open and
localStorage-only. Live mode remains disabled; no repository variables exist.

## Residual risks (parked, not fixed)

1. Process-local rate limiting.
2. DNS resolution→connect TOCTOU — mitigated by the allowlist, not eliminated.
3. `/api/lodging/unfurl` anonymous by design; bounded by allowlist, address
   checks, per-hop revalidation and a 512 KB cap.
4. `GET /api/docusign/envelope/{id}` takes `access_token` as a query parameter.
5. `detail=str(e)` remains on `envelope_status` and `parse_vendor_reply`.
6. Fixed-endpoint outbound calls (weather, Kroger, BLS, Instacart, emailer,
   webhooks) have timeouts but no explicit response-size bounds.
