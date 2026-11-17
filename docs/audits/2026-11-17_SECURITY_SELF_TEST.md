# Security self-test — November 17, 2026

**What this is:** a structured self-test, plus automated scans, of the paid web surface, chosen by the owner in place of hiring a pentest firm (SEC-4).
**What it is not:** independent. Claude wrote most of this code and ran this test, so it checks its own work. The board condition SEC-4 says "external pentest". Closing it on this report alone would need the board to amend the condition (see the end).

## Scope and method

| Area | How it was tested |
|---|---|
| Backend: 24 routers in `backend/app` | Read every route for who is let in and which event they may act on (OWASP ASVS v4 L2: V2 authentication, V4 access control, V5 input, V12 files, V13 API) |
| Payments | Stripe pass grant, refunds, disputes, webhook signature, replay |
| Outbound requests | `safe_fetch` SSRF guards, the webhook relay, the lodging unfurl |
| Email | Every send path: what the caller controls, escaping, limits |
| Database (`supabase/migrations`, 29 files) | Reconstructed the final RLS state of every public table. Checked SECURITY DEFINER functions, storage policies and grants |
| Browser (`hostv2/src`, `src/lib`) | XSS sinks, URL handling, bundled secrets, token storage, `postMessage`, headers |
| Dependencies | `pip-audit` (backend), `npm audit` (hostv2 and root) |
| Static analysis | `bandit` (backend); `semgrep` packs: python, javascript, react, secrets, fastapi |

**Not tested:**
- Nothing was sent to production or the live Supabase project.
- No load or denial-of-service testing.
- No social engineering.
- No live dashboard settings were read. CAPTCHA, the sign-in email quota and the Resend webhook secret are inferred from the repo's 11/11 attestation record.

The manual review ran as three parallel readers. Every High and Medium below was then checked against the code, and each fix has a test that fails on the old code.

## Results

### Fixed in this change

| ID | Severity | Finding | Fix | Proof |
|---|---|---|---|---|
| H1 | **High** | **Any signed-in account could email any address from the product's verified domain.** The account could use a made-up event id (claimed on first touch) and choose the recipient, subject, From name, reply-to and raw HTML body, with no limit. This is a phishing relay | The event must be saved to the account. The recipient must be an address stored on that event, matched exactly. Limit of 40 sends per event per day, counted in the database. Body, name and approval text are escaped. The subject and From name are one line. Reply-to is kept only when it is the sender's own address. "Email this vendor" works unchanged | `test_message_email_is_not_a_relay.py`: 11 tests, 9 failed on the old code |
| F1 | **High** | **A deleted event's id could be taken over.** RSVPs (allergies, phone, email, address), brief and helper links, the pass and files all stay keyed on the id. Every guest sees the id. Anyone could recreate it in their own studio, or rename one of their events to it, and read the old guests' answers | Migration 029: deleted ids are retired. Recreating a retired id, or changing any event's id, is refused by trigger. Ids already orphaned are backfilled | `test_retired_event_ids.py` on PostgreSQL 16: 11 of 11 checks pass with 029. Without 029 the attacker's insert and rename succeed |
| M3 | Medium | **The public Kroger route could overwrite price records anonymously.** The id is built from caller-chosen fields, and the write was an upsert, so it could replace a reviewed record and wipe its audit trail. The list was also unbounded | The write is now insert-if-absent. Lists are capped at 80 lines | `test_kroger_cannot_overwrite_prices.py`: 2 tests, both failed on the old code |
| D1 | Medium | **Backend dependencies with known advisories:** Pillow 12.3.0 (about 40 advisories; guest photo upload decodes untrusted images), Starlette 0.38.6 (multipart denial of service, Host and path URL issues), python-dotenv | Pillow 13.0.0, FastAPI 0.163.1 (Starlette 1.10.0), python-dotenv 1.2.4. `pip-audit` now reports none | Backend suite: 716 passed on the old and the new pins |
| M1 | Medium | **The destination/multi-day pass charge could be skipped.** The server read `passRequired` and `passReasons` from event data the host can edit | Migration 030: once stamped, the stamp survives any edit. A trip or multi-day event saved without its stamp is stamped on insert, using a subset of the client's own rule. Events created unstamped before today stay free (the grandfather rule) | `test_security_mediums_030.py` on PostgreSQL 16, 10 checks. Without 030, removing the stamp and an unstamped insert both succeed |
| M2 | Medium | **AI cost abuse.** The only limit was 15 per minute per user, held in process memory (about 21,600 a day per account) | A daily ceiling per user (200) and for all users together (5,000), counted in `public.rate_counters`. Both are adjustable with `AI_DAILY_PER_USER` and `AI_DAILY_ALL`, and are a starting setting, not a measurement of real use | `test_daily_caps.py`: 5 tests |
| M4 | Medium | **A host could send repeated co-host invite emails.** Invite, remove, invite again: the cap counted current rows, not emails sent | At most 20 invite emails per event per day, counted in the database. Past the cap the invite is undone and nothing is sent | `test_cohosts.py`: a new test, which fails on the old code |
| M5 | Medium (now Low) | **A studio owner could add anyone to their studio as an owner, without consent, and the client could then pick the wrong studio** | Invitations are written only as planner or assistant, by their own inviter (030). The client picks the oldest membership first, which is her own studio | 030 test (both checks fail without 030); `herOwnStudioIsPickedFirst.test.js` fails on the old code. **Still open (Low):** an unsolicited planner-role join still happens on the legacy shell's sign-in. No shipped screen creates invitations. A proper fix is an explicit accept step |

### Open: engineering, not yet fixed

| ID | Severity | Finding | Proposed fix |
|---|---|---|---|
| L1 | Low | DocuSign OAuth `state` is never checked, and tokens come back in the URL. This is the frozen legacy shell only | Signed state cookie, tokens kept on the server |
| L2 | Low | The webhook relay can be used for blind internal port probing through DNS rebinding, and returns the raw error text | Fixed error string; pin the connection to the checked address or allow port 443 only |
| L3 | Low | The family and calendar codes have no unique index | Partial unique indexes, as 009 does for `rsvpCode` |
| L4 | Low | Cached sign-ins outlive token expiry and role changes, by up to 5 minutes | Cap the cache at the token's `exp`; re-read the role for admin |
| L5 | Low | Guest email opt-in is not verified | Double opt-in |
| L6 | Low | The client-portal approval token is weak: about 41 bits, compared with `!=` | Server-minted 128-bit token, `compare_digest` |
| L7 | Low | `safe_fetch` lets 100.64.0.0/10 and Teredo through | `ip.is_global` on the original and the unwrapped address |
| L8 | Low | The lodging bookmarklet matches the host by substring (`airbnb.`) | Exact host or `endsWith('.airbnb.com')` |
| L9 | Low | Root (`react-scripts`) has 61 npm advisories (3 critical) | All are in build or dev-server tooling for the frozen legacy shell; none ships to a host's browser. `hostv2`: 0 advisories. Retires with the legacy shell |
| L10 | Low | The route-auth tests can be fooled: one allowlist keys on paths without the router prefix, and a conditional gate counts as gated | Key on full paths; fail on stale entries |

### Open: owner actions (dashboard or account, not code)

| ID | Severity | What | Where |
|---|---|---|---|
| O1 | Medium | **Anyone can use up the project-wide sign-in email limit and lock every host out.** The limit is 25 per hour for the whole project, sign-up is open, and a magic link is the only way in | Supabase → Authentication → turn on CAPTCHA (Turnstile or hCaptcha) and raise the email quota (custom SMTP is on) |
| O2 | Medium | **The sign-in token sits in localStorage on the shared `twillis45.github.io` origin, and there is no CSP.** Any other Pages site under that account shares the origin | Move to the custom domain (NAT-6); then PKCE and a meta CSP |
| O3 | Low | If `RESEND_WEBHOOK_SECRET` is unset on Render, delivery statuses can be faked | Render → confirm it is set (then the code can refuse unsigned requests) |
| O4 | Decision | A deleted event's RSVPs and brief confirmations are still kept. They can no longer be reached (029), but they exist. On 11/16 you ruled that guest questions and invite opens are deleted with the event | Rule: delete RSVPs with the event too, or keep them |

### Checked and sound

- **Stripe pass:**
  - The webhook signature is verified on the raw body.
  - No secret means no grant.
  - Price and SKU are set on the server.
  - A pass is granted only when the session is paid.
  - Replays are harmless.
  - A refund or dispute blocks the pass permanently; a refund that arrives before the grant still blocks it.
  - The success URL never grants anything.
- **Object-level access:** every host route on a synced event checks studio membership (plus co-host where intended). No route let host A act on host B's synced event.
- **Invite, brief and helper codes:** 22+ random characters, unique-indexed.
- **RLS:**
  - Every public table has RLS on.
  - No table has a `using (true)` or anon policy.
  - Browsers have no path into passes.
  - All SECURITY DEFINER functions pin `search_path`.
  - The `guest-photos` bucket has no client policy.
- **Browser:**
  - No `dangerouslySetInnerHTML` or `innerHTML` sinks.
  - No `postMessage` listener without an origin check.
  - No secrets bundled (the publishable anon key only).
- **SSRF:** `safe_fetch` is https-only, matches hosts exactly, checks every resolved address and every redirect hop, and caps size and time.
- **Scanner noise, read and dismissed:**
  - 17 bandit "SQL injection" hits are constants, allowlists, clamped integers or bound parameters.
  - 2 "trojan source" hits are the regex that strips direction-override characters out of guest text.
  - 2 semgrep "credential in log" hits log a Kroger token-endpoint error body, not a token.

## SEC-4: what the board is asked

The condition reads: "external pentest engagement report with no open high or critical findings." This report:
- names no open High or Critical finding;
- fixes the two Highs it found, with tests that fail on the old code;
- lists every remaining finding with an owner.

It is not external.

The owner proposes amending SEC-4 to: **"this self-test, with no open High or Critical, plus one independent check (a freelance tester or an invite-only bug bounty) before paid promotion."** The board should rule on that wording. It should also rule on whether O1 (CAPTCHA) is required before then. O1 is the cheapest remaining fix, and it stops one person from locking every host out.
