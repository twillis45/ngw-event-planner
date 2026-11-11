# Owner fill sheet — every `[OWNER: …]` placeholder in `docs/legal/`

> **Measured 2026-11-11** by `grep -n "\[OWNER" docs/legal/*_DRAFT.md` after the
> terms draft landed. One row per distinct fact, every file:line it appears at,
> what the owner supplies, and anything the repo already knows. This sheet
> writes placeholders without the opening bracket (`OWNER: …`) so the grep
> above keeps returning only the unfilled slots in the drafts. Re-run it after
> filling; when it returns only the three explanatory header lines
> (`PRIVACY:4`, `REFUND:6`, `TERMS:7`), every slot is filled. (`README.md`
> lists the original five as prose and is not a slot.) Nothing here is legal
> advice.

**Why it is urgent:** production has been live and charging since 11/7/2026
with no published privacy policy, terms, or refund policy (`HANDOFF.md:610`,
`LEGAL-1`). The pass sheet links policies only once `BRAND.policies` holds a
published URL (`src/lib/brand.js:146-151`).

## Already decided — filled in this commit

| Fact | Value | Source | Where it was filled |
|---|---|---|---|
| Support email | events@noguessworksystems.com | Owner decision 11/11/2026, `src/lib/brand.js:145` | `PRIVACY_POLICY_DRAFT.md:10, 156, 250`; `REFUND_POLICY_DRAFT.md:11, 126`; written directly into `TERMS_OF_SERVICE_DRAFT.md:15, 66, 325, 389, 411`; `README.md:21-24` marked decided |

## Open — in the order to do them

| # | Fact (placeholder) | Appears at | What the owner supplies | Known from the repo |
|---|---|---|---|---|
| 1 | **Refund rule** (`OWNER: refund rule — pick one`) | `REFUND_POLICY_DRAFT.md:46`; referenced by `TERMS_OF_SERVICE_DRAFT.md:150` | Pick Option A, B, or C in the refund draft §3 (or write your own); delete the other two, and drop the placeholder from the terms' cross-reference | Nothing decided. Mechanics already fixed in code and stated in the terms §5: full refund revokes (`stripe_payments.py:575-578`), partial refund keeps access (owner ruling 11/5), dispute suspends (`:573-574`). **First because money is being taken today** under no stated rule. |
| 2 | **Governing state** (`OWNER: governing state`) | `PRIVACY_POLICY_DRAFT.md:252`; `TERMS_OF_SERVICE_DRAFT.md:383` | The state where No Guesswork Systems LLC is organized (the attorney may advise another) | Not in the repo. Pick before counsel review: it decides which law counsel reads every other clause against. |
| 3 | **Venue for disputes** (`OWNER: county and state for venue`) | `TERMS_OF_SERVICE_DRAFT.md:386` | County and state whose courts hear disputes — usually where the LLC is based | Not in the repo. Follows #2; counsel may replace it with arbitration (terms §14 COUNSEL note). |
| 4 | **Mailing address** (`OWNER: mailing address`) | `PRIVACY_POLICY_DRAFT.md:9`; `REFUND_POLICY_DRAFT.md:10`; `TERMS_OF_SERVICE_DRAFT.md:14, 410` | A postal address for the LLC. A registered-agent or PO box address is fine (`README.md:25-26`) | Not in the repo. Several state privacy laws require one in the controller's notice. |
| 5 | **Sales-tax treatment** (`OWNER: sales-tax treatment …`) | `TERMS_OF_SERVICE_DRAFT.md:129` | Whether the $39 includes tax, is not taxed, or has tax added — after asking your accountant or counsel | Checkout adds no tax today: Stripe Managed Payments (merchant of record) is turned off per session, owner choice 11/10/2026 (`stripe_payments.py:329-333`), and no tax setting is on the line item (`:319-326`). |
| 6 | **Minimum age** (`OWNER: minimum age — e.g. 18`) | `TERMS_OF_SERVICE_DRAFT.md:41` | The age a host must be to sign up and buy | No age check exists at sign-in (`HostShellV2.jsx:2117-2147`). The privacy draft already says the app is for adults and does not knowingly collect data from children under 13 (§7). |
| 7 | **Liability floor** (`OWNER: dollar floor — e.g. $100`) | `TERMS_OF_SERVICE_DRAFT.md:308` | The dollar amount liability is capped at when it exceeds what the host paid | Not in the repo. Counsel decides whether a cap is enforceable at all (terms §11). |
| 8 | **If the service ends** (`OWNER: notice period and what happens to a paid pass …`) | `TERMS_OF_SERVICE_DRAFT.md:355` | Notice you will give before shutting down or suspending, and what pass holders get (e.g. refund for events not yet held) | No suspension or shutdown mechanism exists in code. |
| 9 | **Effective date** (`OWNER: effective date`) | `PRIVACY_POLICY_DRAFT.md:8`; `REFUND_POLICY_DRAFT.md:9`; `TERMS_OF_SERVICE_DRAFT.md:13` | The day each policy is published at its URL — not the day it was drafted (`README.md:28`) | **Last**, after counsel review and after #1–8. Setting it is the same act as setting `BRAND.policies.{privacy,terms,refunds}` (`src/lib/brand.js:151`). |

## Stale claims found while filling — fix before counsel review

Not placeholders, but false or incomplete against today's code. Counsel should
not review a draft that contradicts the product.

| Where | Says | Code says |
|---|---|---|
| `PRIVACY_POLICY_DRAFT.md:24` | Sign-in "by a one-time link" | A link or a code: `signInWithOtp` (`HostShellV2.jsx:2122`) and `verifyOtp` (`:2147`). Minor. |
| `PRIVACY_POLICY_DRAFT.md:42-44` (Guests) | Guests give name, reply, meal, dietary needs or allergies, plus-one, note | Also structured allergens and diets, **access needs**, and optional **phone, email, and mailing address** (`supabase/migrations/015_rsvp_guest_details.sql:18-25`, `backend/app/routers/rsvp.py:192-197`). Found 11/11/2026 while writing `ATTORNEY_COVER_MEMO.md`. Not minor: the policy under-states what is collected. |

Fixed 11/11/2026 in a follow-up commit (removed from this list): self-serve
account deletion now described in privacy §6 and the README; "can buy the pass
again later" removed from the refund draft; partial-refund and dispute
behavior stated in the refund draft, with COUNSEL notes.

## Then

1. Fill #1–8 above, and fix the stale row.
2. Send `PRIVACY_POLICY_DRAFT.md`, `TERMS_OF_SERVICE_DRAFT.md`,
   `REFUND_POLICY_DRAFT.md`, and `CONSENT_AND_TRACKING_COPY_DRAFT.md` to the
   attorney with every `COUNSEL:` note in the terms and the §3 question in the
   consent draft.
3. Publish on the real domain, set #9, set `BRAND.policies`.
