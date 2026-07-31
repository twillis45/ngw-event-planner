# AI Proxy & Document Fetch — Security Model

**Status:** implemented 2026-07-30 (Security & Release Integrity sprint, Slices A + B)
**Scope:** backend routes that spend a server-held provider key, or that fetch a
URL supplied by the caller.

This document contains no secrets, tokens, project keys, or exploitable internal
values. Hostnames below are placeholders.

---

## 1. What was wrong

Three routes accepted work from anyone who could reach the backend.

| Route | Auth | Rate limit | Caller-supplied URL fetched |
|---|---|---|---|
| `POST /api/ai/feature` | ✅ planner | ✅ | — |
| `POST /api/ai/complete` | ❌ **none** | ❌ **none** | — (accepted arbitrary `system` prompt; **now removed**) |
| `POST /api/ai/extract-document` | ❌ **none** | ❌ **none** | ✅ **unrestricted** |
| `POST /api/docusign/send-envelope` | ❌ **none** | n/a | ✅ **unrestricted** |
| `GET /api/lodging/unfurl` | n/a (public by design) | n/a | ✅ host-allowlisted, but redirects unchecked |

Three distinct problems followed.

**1.1 — Anyone could spend the server's provider key.**
`/complete` and `/extract-document` called OpenAI with the server's
`OPENAI_API_KEY` for any anonymous caller, with no metering. A script could run
the key to its quota or its bill.

**1.2 — `/complete` was an unrestricted LLM. It has been REMOVED.**
It accepted a caller-supplied `system` prompt (`body.system`) and passed it
straight through. `/feature`'s docstring states that the client cannot supply a
system prompt or call an unrestricted endpoint — `/complete` was exactly that
endpoint. Any prompt, any purpose, on the project's key.

It also had **no reachable consumer**. Its only call site was the proxy branch
of `askClaude()` in `src/App.js`, which required `REACT_APP_API_BASE_URL` to be
set. But `askClaude` is called only by `askNGW()`, which returns via
`callAiFeature()` (`/feature`) whenever `isAiProxyConfigured()` is true — and
that is the *same* variable. So the branch was dead in both directions: with the
base URL set, `askClaude` was never called; without it, the branch was skipped.
All 12 `askNGW` call sites name a server-owned feature from `AI_FEATURES`; none
ever passed `system`.

Because no legitimate consumer needed a distinct approved behaviour, the route
was **deleted** rather than preserved as an authenticated generic AI proxy. The
`CompletionRequest` model went with it, and the dead client branch was removed
from `App.js`. `POST /api/ai/complete` now returns **404**.

Every remaining AI path takes its system prompt from the server-owned
`FEATURE_SYSTEM_PROMPTS` registry, selected by a `feature` name that is rejected
if unknown. Two tests pin this: one asserts the route is gone, and one is a
structural gate asserting that no request model in `routers/ai.py` exposes a
`system` field and that no handler forwards `body.system`.

**1.3 — Server-Side Request Forgery (SSRF).**
`/extract-document` and `/send-envelope` fetched *any* URL the caller sent, with
`follow_redirects=True`, no size cap, and the network error echoed back:

```python
r = await client.get(body.document_url)      # any scheme, any host
...
raise HTTPException(400, detail=f"Could not fetch document: {e}")   # oracle
```

The backend runs inside a private network, next to a cloud instance-metadata
endpoint. That gave an unauthenticated caller a probe for internal services and
for `169.254.169.254`, which on many hosts returns cloud credentials. Even when
the body was not returned, the echoed error distinguished "refused", "timed
out", and "not found" — enough to map internal hosts and ports.

`/lodging/unfurl` already had a correct structural host allowlist, but
`follow_redirects=True` meant an allowlisted listing could redirect the server
anywhere.

---

## 2. What is enforced now

### 2.1 Authentication — one system, not two

Every secured route calls the existing `require_planner(authorization,
x_planner_token)` from `app/auth.py` — the same function `/feature` has always
used. No new auth mechanism was introduced, and no bypass was added to keep an
insecure caller working.

`require_planner` prefers a Supabase JWT. It honours the shared
`X-Planner-Token` **only** when `ALLOW_DEV_TOKEN=true`; otherwise it raises 401.
That dev path is pre-existing, environment-gated, and unchanged by this work.

On the client, `src/lib/apiAuth.js` is now the single derivation of the planner
identity. `aiProxy.js` re-exports it for its existing importers, and
`VendorPlanningWorkspace.jsx` and `lib/docusign.js` use it — both previously
posted with no credentials at all. (`App.js` needed no auth header in the end:
its only unauthenticated call was to `/complete`, which was removed.)

### 2.2 Rate limiting — the planner is the identity

Secured AI routes share `_rate_check(user_id)` in `routers/ai.py`: an in-memory
sliding window keyed by **the authenticated planner id** (`principal["id"]`),
not by IP and not per-route. `/extract-document` draws from the same bucket as
`/feature`, so a caller cannot multiply their budget by rotating endpoints. Limits come from `AI_RATE_MAX` (default 15) and `AI_RATE_WINDOW`
(default 60s); exceeding them returns 429 with `Retry-After`.

The limiter is per-process. With more than one worker the effective limit is
`AI_RATE_MAX × workers`. Moving it to Redis is the fix if the backend is scaled
horizontally — recorded as a known limitation, not a silent assumption.

### 2.3 The guarded fetch path

All caller-supplied URL fetches now go through `app/safe_fetch.py`. Nothing else
may call `httpx` directly with a caller URL.

| Control | Behaviour |
|---|---|
| Scheme | `https` only. `http`, `file`, `gopher`, `ftp`, `data` refused. |
| Credentials | URLs containing `user:pass@` refused. |
| Host allowlist | Exact hostname or a dotted subdomain, matched **structurally** on the parsed hostname. Never a substring test — `files.example.supabase.co.attacker.test` does not match. |
| Address check | The host is DNS-resolved **before** connecting. **Every** returned address must be global unicast. Loopback, private, link-local (this covers `169.254.169.254`), multicast, reserved and unspecified are refused — IPv4 and IPv6, including IPv4-mapped IPv6 forms such as `::ffff:169.254.169.254`. One bad answer rejects the whole set. |
| Redirects | Followed manually with `follow_redirects=False`; **every hop is re-validated** against all of the above. Capped at 3. |
| Size | Streamed with a hard byte cap (10 MB default, 512 KB for unfurl); the connection is dropped when exceeded. A missing or lying `Content-Length` cannot bypass it. |
| Content type | Must be in the caller's expected set (PDF/image for documents, HTML for unfurl). |
| Headers | Only headers the server chooses are sent. No caller header is forwarded, and no `Authorization` or cookie is ever attached to a caller-supplied URL. |
| Errors | Fixed, generic reason strings. Internal exception text is logged server-side and never returned. |

**Fail-closed.** The document allowlist is built by `storage_allowed_hosts()`
from the deployment's own `SUPABASE_URL` host plus anything in
`DOCUMENT_FETCH_ALLOWED_HOSTS`. If neither is configured the list is empty and
the fetch is refused with 503 — an unconfigured deployment never means
"any host".

---

## 3. Behaviour change for callers

| Caller | Before | After |
|---|---|---|
| `src/App.js` → `/api/ai/complete` | posted with no credentials | **route removed**; the dead proxy branch was deleted, so `askClaude` is now BYOK-only (its real behaviour all along) |
| `VendorPlanningWorkspace.jsx` → `/api/ai/extract-document` | posted with no credentials | sends the planner token; document URL must be on the storage allowlist |
| `src/lib/docusign.js` → `/api/docusign/send-envelope` | posted with no credentials | sends the planner token; contract URL must be on the storage allowlist |

Documents already live in Supabase Storage, so the allowlist matches the
existing data path. A deployment that stores contracts elsewhere must name that
host in `DOCUMENT_FETCH_ALLOWED_HOSTS` or the fetch will be refused.

---

## 4. Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | Server-side provider key. Never reaches the browser. | unset → 503 |
| `SUPABASE_URL` | Also the source of the document-fetch allowlist host. | unset |
| `DOCUMENT_FETCH_ALLOWED_HOSTS` | Comma-separated extra hosts permitted for document fetch. | empty |
| `AI_RATE_MAX` | Requests per window, per planner. | 15 |
| `AI_RATE_WINDOW` | Window length in seconds. | 60 |
| `ALLOW_DEV_TOKEN` | Pre-existing. Enables the shared `X-Planner-Token` path. **Must be false in production.** | false |

---

## 5. Known residual risks

**5.1 — DNS rebinding (TOCTOU).** `safe_fetch` resolves the hostname and
validates the addresses, then `httpx` resolves again to connect. A DNS record
that changes between those moments could point the connection at an address the
check approved. Fully closing this means pinning the connection to the validated
IP while preserving TLS SNI, which is not implemented. The practical mitigation
is the allowlist: an attacker must already control DNS for an approved host.
Documented rather than assumed away.

**5.2 — RESOLVED.** `/complete` was removed entirely (see 1.2), so no route
accepts a caller-supplied system prompt. A structural test enforces this.

**5.2b — `GET /api/docusign/envelope/{id}` takes `access_token` as a query
parameter.** Out of scope for this slice and unchanged, but a planner's DocuSign
token in a URL query string is recorded in access logs and proxy history. It
should move to a header. Flagged, not fixed.

**5.3 — The rate limiter is per-process.** See 2.2.

**5.4 — `/api/lodging/unfurl` remains unauthenticated.** That is its existing
design (a host-initiated link preview). It is now bounded by the allowlist,
address checks, redirect revalidation and a 512 KB cap, but it is still a route
an anonymous caller can use to make the server fetch two specific third-party
hosts.

**5.5 — Backend tests do not run in CI.** `.github/workflows/checks.yml` runs
jest, the hostv2 build, and Playwright — no `pytest`. The 42 tests added here
therefore gate nothing automatically yet. Wiring backend tests into CI belongs
to Slice C.

---

## 6. Verification

`backend/tests/test_ai_auth_and_ssrf.py` (44) and
`backend/tests/test_docusign_send_envelope_auth.py` (5) — 49 tests, fully
offline. DNS and the HTTP transport are both stubbed, and the provider /
DocuSign clients are spies that fail the test if ever called, so no live request
is made and no credit is spent.

The async tests are wrapped by a local `@sync` decorator into ordinary
synchronous test functions, so they run through **standard pytest discovery**
with no plugin and no conftest hook — behaviour is identical locally and in CI.

Each protection was mutation-tested — removed, observed to turn the suite red,
then restored:

| Mutation | Result |
|---|---|
| Host allowlist check removed | 3 tests red |
| Non-public-address guard removed | 3 tests red |
| `follow_redirects=True` restored | 1 test red |
| `https`-only scheme check removed | 2 tests red |
| `require_planner` removed from `/send-envelope` | 1 test red |

Full backend suite: **202 passed** (153 pre-existing + 49 new).
