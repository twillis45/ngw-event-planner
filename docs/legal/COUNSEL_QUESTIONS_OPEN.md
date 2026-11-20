# Open questions for counsel — moved out of the published policies

**Why this file exists.** On 11/20/2026 the owner ruled to **publish now and revise
after the attorney**: production has taken payments since 11/7/2026 with no
published privacy policy, terms, or refund policy. The publishing script refuses
any draft that still carries a `COUNSEL` note, so every such note was moved here,
**verbatim**, and deleted from the drafts. The attorney reviews the published text
(the drafts, effective November 20, 2026) against these questions. When an answer
changes the text, edit the draft, change its effective date, and re-run
`npm run policies:publish` (`PUBLISH_CHECKLIST.md`, "Later changes to a published
policy").

`ATTORNEY_COVER_MEMO.md` §3 numbers the same questions 1–30 for the cover letter;
this file is the source text, grouped by document and by the section heading each
note sat under. **16 notes moved: 1 privacy, 14 terms (13 block notes and 1 inline
note), 1 refund.** Nothing here is legal advice.

Owner rulings of 11/20/2026 that answer part of a question below are recorded
under it as **Filled 11/20**, so counsel sees what the published text now says.
The question itself is unchanged.

---

## Privacy Policy (`PRIVACY_POLICY_DRAFT.md`)

### §1 — Guests (someone replying to an invitation)

> **COUNSEL:** Access needs (step-free or wheelchair access, an accessible
> seat) can describe a disability, and allergies and diets can reveal health
> conditions or religion (halal, kosher). Under state privacy laws that treat
> health, disability, or religious data as "sensitive" (for example Virginia,
> Colorado, Connecticut, or California's "sensitive personal information"), do
> we need opt-in consent at the point of collection on the invite form, a
> specific notice there, or a limit-use right? Is "the host only, never
> analytics, never vendors unless the host passes it on" adequate handling, given
> the host, not us, decides what happens next?

---

## Terms of Service (`TERMS_OF_SERVICE_DRAFT.md`)

### §1 — Who we are and what these terms cover

> **COUNSEL:** Is incorporation by reference of the privacy and refund policies
> appropriate, or should the privacy policy stand alone (some state laws treat a
> privacy notice as a disclosure, not a contract term)? Which document controls
> on conflict?

### §2 — Eligibility

> **COUNSEL:** Minimum age for hosts (18 vs. age of majority vs. 13 with
> parental consent), and whether guests replying through a link — who never see
> these terms before replying — are bound by them at all, or only by a short
> notice on the invitation (`hostv2/src/InviteV2.jsx` footer, per `README.md`
> wiring item 3).

**Filled 11/20:** minimum age 18.

### §4 — The free tier and the One-Event Pass (Price, payment, and taxes)

> **COUNSEL:** (a) Sales-tax treatment of a one-time digital service sold to
> US consumers, given Managed Payments is off — which states, if any, require
> collection at this volume, and does the price need to say "plus tax"? (b) Is
> "we may change the price for future purchases" sufficient, or is a notice
> period needed? (c) Does the preview-period promise ("we'll tell you before
> anything changes") create an obligation that needs defining here?

**Filled 11/20:** the terms now say checkout adds no sales tax today, which is
what `backend/app/routers/stripe_payments.py` does (no tax line, no automatic
tax, Managed Payments off per session). Whether that is the right treatment is
still question (a).

### §5 — Refunds, disputes, and revocation

> **COUNSEL:** Confirm that suspending access on a dispute (before it is
> decided) is enforceable and fairly disclosed, and whether a won dispute
> should restore access by default.

### §6 — Hosts: your responsibilities for other people's information

> **COUNSEL:** (a) Under state privacy laws, is the host a separate controller
> of guest data, with us as their service provider — and does that need a
> processor/service-provider clause here? (b) Does a host sending invitations
> through the app make us, the host, or both the "sender" for CAN-SPAM and
> state anti-spam purposes? (c) Is an indemnity from hosts for data they had no
> right to enter appropriate for a consumer product?

### §7 — Vendor-brief links

> **COUNSEL:** Are vendors who open a brief and confirm through it bound by
> these terms (they never agreed to them)? If not, does the acceptable-use
> section need a short notice on the brief page itself?

### §8 — Acceptable use

> **COUNSEL:** Whether to reserve a right to remove content or suspend accounts
> for violations — the app has no suspension mechanism today (section 12), so
> any such right would be exercised by hand.

### §9 — Your content, and the license you give us

> **COUNSEL:** (a) Scope and duration of the content license (does it need to
> survive deletion for backups, receipts, and shared-studio content that is
> retained — see section 12?). (b) Ownership of AI output. (c) The name is not
> trademark-cleared — `src/lib/brand.js:22-24, 62-64, 66-78` records that no
> USPTO search has been run and that "No Guesswork" is in use by another party
> in another class. Confirm the "belongs to" wording is not overclaiming.

### §10 — Availability and no warranty

> **COUNSEL:** Disclaimer wording and conspicuousness for the governing state;
> whether allergy/food-safety content needs a stronger, separate disclaimer
> given that guests' allergies flow through the app.

**Filled 11/20:** governing state is Maryland.

### §11 — Limitation of liability

> **COUNSEL:** The cap and floor amount; carve-outs required by the governing
> state; whether a consumer-facing cap tied to a $39 purchase is enforceable;
> whether to add an indemnity from hosts (section 6(c)).

**Filled 11/20:** the greater of what the host paid in the 12 months before the
claim, or $100.

### §12 — Ending your use, and deleting your account

> **COUNSEL:** (a) Retention of "security and administrative records" is named
> in code (`account.py:105`) but not itemized — confirm the description is
> adequate. (b) What a pass holder is owed if we discontinue the service.
> (c) `PRIVACY_POLICY_DRAFT.md` §6 describes the same deletion (corrected
> 2026-11-11); the two must stay in agreement before either is published.

**Filled 11/20:** at least 30 days' notice before the service shuts down or is
suspended for everyone, and a refund of the pass for any event not yet held.

### §13 — Changes to these terms

> **COUNSEL:** Is in-app notice to signed-in hosts enough, given there is no
> email-notice mechanism for policy changes and signed-out hosts get none?

### §14 — Governing law and disputes

> **COUNSEL:** (a) Courts vs. binding arbitration, and if arbitration, a
> class-action waiver and small-claims carve-out — and whether either is worth
> its cost at this price point. (b) Consumer-protection overrides in states
> where hosts live. (c) Whether an informal-resolution period should be
> mandatory before suit.

**Filled 11/20:** Maryland law; the state and federal courts located in the State
of Maryland. No county is named (the owner has not chosen one).

### §15 — Everything else (inline note, was inside a `⟶ … ⟵` citation)

> `COUNSEL:` standard boilerplate — confirm each clause for the
> governing state.

---

## Refund Policy (`REFUND_POLICY_DRAFT.md`)

### §3 — Refunds — the rule

> **COUNSEL — the chosen rule against the code** (owner ruling 11/12/2026):
> - **Partial refunds keep the pass,** and are not offered in this text. The
>   board recommended keeping them as a discretionary goodwill remedy for a
>   host who used the pass. Confirm leaving them out of the public policy.
> - **No repurchase after a full refund** on the same event
>   (`stripe_payments.py:320-328`); support handles "refund, then come back"
>   by hand. Confirm the wording above.
> - **A dispute switches the pass off before it is decided**, and a won
>   dispute does not restore it. Is that fair and adequately disclosed in §6?
> - **"One refund per pass"** is enforced by Stripe (a fully refunded charge
>   cannot be refunded again), not by our code — confirm the sentence needs no
>   more.
> - **Briefs sent through the old self-contained link** (before 11/11) are not
>   recorded, so the refund check cannot see them; support refunds when unsure.

---

## `VERIFY:` markers

**None existed** in the three drafts on 11/20/2026 (`grep -n "VERIFY:"` over
`docs/legal/*_DRAFT.md` returned nothing), so none was resolved and none is
recorded here as unverifiable.

## Claims checked against the code on 11/20/2026 and corrected in the text

Not counsel questions; recorded so the attorney knows the published text moved
from the version the cover memo describes.

- **Sign-in** is by a link **or a code** from the email, with Cloudflare's bot
  check on the form (`hostv2/src/HostShellV2.jsx` `signInWithOtp` / `verifyOtp`;
  `src/components/SignInCheck.jsx`).
- **Guest email notices are live:** a guest who ticks the box gets the host's
  answers and the host's posted updates by email, each with a stop link
  (`backend/app/guest_notices.py`). The draft said nothing was emailed yet.
- **Co-hosts** a host invites to one event see that event's replies, questions,
  and photos (`backend/app/routers/cohosts.py`, migration 026). Added wherever
  the draft listed who sees guest data.
- **Analytics identity** is now a one-way hash of the account id; first-visit
  campaign tags and the referring site's host name are sent; the server records
  a pass purchase in PostHog **even when the in-app analytics switch is off**
  (`src/lib/analytics.js`, `backend/app/analytics.py`). The text says so.
- **Host email:** reminders about a host's own plans and offers/news (offers only
  with the unticked sign-in box) go through `backend/app/host_email.py`, each
  with its own stop link. **No reminder or offer is sent from `main` today**;
  the week-before reminder (`backend/app/host_reminders.py`) exists only on an
  unmerged branch. The policy therefore says "may" for reminders and "only if
  you ticked" for offers — nothing it states is untrue while neither sends.
- **Guest photo purge:** the nightly job is running (owner report 11/19/2026,
  `HANDOFF.md`); the draft said it was not yet switched on.
- **Processors** added to the privacy policy's table: PostHog, Sentry,
  Cloudflare (Turnstile).
- **Weather:** the forecast now runs for any event within 14 days that has a
  town, not only outdoor events (`HANDOFF.md`, 11/18/2026); the table row says
  "the event day's forecast."
- **An internal note leaked into published text** (privacy §5, the owner ruling
  and migration 028 attestation in parentheses); moved inside a citation note.
