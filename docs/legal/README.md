# `docs/legal/` — policy DRAFTS for stage-9 precondition #1

**Status: DRAFT, unreviewed, not wired into the product.** Written 2026-11-02
from what the code actually does (every claim below cites the file that makes
it true), so an attorney reviews a document that matches the system instead of
a template that does not. Nothing here is legal advice, and nothing here ships
until the owner rules it.

| File | What it is | Grounded in |
|---|---|---|
| `PRIVACY_POLICY_DRAFT.md` | Who we are, what we collect from hosts / guests / vendors, which processors see it, how long it stays, what a person can ask for | `src/lib/analytics.js`, `src/lib/sentry.js`, `supabase/migrations/009`, `013`, `017`, `backend/app/routers/*`, `src/lib/vendorBrief.js` |
| `CONSENT_AND_TRACKING_COPY_DRAFT.md` | Gate row `s5-consent`: the first-open notice (or opt-in prompt), the Settings toggle, and two fixes that must land before the copy is true (business name reaching PostHog; no visible opt-out) | `src/lib/analytics.js`, `src/lib/sentry.js`, `src/App.js:46176` |
| `REFUND_POLICY_DRAFT.md` | The $39 One-Event Pass: what it is, what it is not, and the refund rule (one recommended, two alternatives, owner picks) | `src/lib/passGate.js`, `backend/app/routers/stripe_payments.py`, `supabase/migrations/017_event_passes.sql`, the no-vendor-fees commitment |
| `TERMS_OF_SERVICE_DRAFT.md` | Terms of service (2026-11-11): eligibility, sign-in, free tier and the pass, refund/dispute mechanics, host duties for guest and vendor data, invite and brief links, acceptable use, content license, no warranty, liability, in-app account deletion, governing law. `COUNSEL:` notes mark each point an attorney decides | `src/lib/passGate.js`, `backend/app/routers/stripe_payments.py`, `account.py`, `rsvp.py`, `vendor_brief.py`, `ai.py`, `supabase/migrations/020`, `021`, `src/lib/brand.js` |
| `OWNER_FILL_SHEET.md` | Every `[OWNER: …]` placeholder across these drafts, one row per fact, with file:line, what to supply, what the repo already knows, and the order to do them | grep of `docs/legal/` |
| `ATTORNEY_COVER_MEMO.md` | One page to send with the drafts: the product, what is live, the 30 numbered `COUNSEL` questions, decisions made and pending, what to send back | the drafts' `COUNSEL` notes, `OWNER_FILL_SHEET.md`, `HANDOFF.md` |
| `PUBLISH_CHECKLIST.md` | The steps after sign-off: fill, remove markers, `npm run policies:publish` (refuses while any `[OWNER:`, `COUNSEL`, `VERIFY:` or `DRAFT` remains; strips `⟶ … ⟵` citations), set `BRAND.policies`, PR, curl for 200 | `scripts/publish-policies.mjs`, `scripts/policy-publish-core.js` |

## Placeholders the owner fills before anything ships

Search each draft for `[OWNER:` — every one is a fact only the owner has:

- ~~`[OWNER: support email]`~~ — **decided 11/11/2026:
  events@noguessworksystems.com** (`src/lib/brand.js:145`), filled into every
  draft. D-2's own precondition #5 is "a support/refund story, even if it's one
  email address." This is that address.
- `[OWNER: mailing address]` — required by several US state privacy laws for a
  controller's notice; a registered-agent or PO box address is fine.
- `[OWNER: governing state]` — the LLC's state of organization.
- `[OWNER: effective date]` — the day it goes live, not the day it was drafted.
- `[OWNER: refund rule]` — pick one of the three in the refund draft.
- The terms draft adds five more (minimum age, sales-tax treatment, liability
  floor, venue county, what pass holders get if the service ends).
  `OWNER_FILL_SHEET.md` is the complete, ordered list with file:line for each.

## Where they get wired, once ruled (one link each — not a new surface)

1. **The pass sheet** (`HostShellV2.jsx`, the "Get the pass — $39" block):
   a single "Refunds and privacy" line linking both. That is where money is
   asked for, so that is where the terms belong.
2. **The sign-in sheet** (magic-link email entry): "By continuing you agree to
   the privacy policy" with the link. The email address is the first personal
   data a host hands over.
3. **The guest door** (`InviteV2.jsx`) footer: "How your answer is used" →
   privacy policy, guest section. Guests hand over dietary and allergy
   information; they never signed in and never saw the pass sheet.
4. **Hosting:** publish both as static pages on the real domain (precondition
   #1 pairs the domain with the policies for this reason — a github.io
   subdomain under a policy that names the company undercuts the policy).

## What the drafts deliberately do NOT claim

- No retention schedule that is not actually running. The RSVP purge helper
  exists (`purge_old_rsvp_submissions`, 009:111) and **is not scheduled** —
  the draft says "we intend to" and names the window, not "we do."
- No deletion broader than the code's. Account deletion **is** self-serve
  (You & settings → Delete my account…, `hostv2/src/HostShellV2.jsx:18949`;
  `backend/app/routers/account.py`, `supabase/migrations/021_account_deletion.sql`).
  The privacy draft §6 and terms §12 list exactly what it removes and the
  three categories it keeps (`account.py:105`: payment receipts, security and
  admin records, shared-studio content) — not "everything." (Corrected
  2026-11-11: until then this line said no self-serve deletion existed.)
- No "we never share data with AI providers" — the AI routes send event
  context to Anthropic / OpenAI under server-owned prompts (`routers/ai.py`),
  and the draft says so.
- No SOC 2, no "bank-level security," no certifications. RLS, server-side
  keys, hosted checkout — the things that are true.
