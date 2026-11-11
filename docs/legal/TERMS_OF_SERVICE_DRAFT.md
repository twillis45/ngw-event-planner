# Terms of Service — No Guesswork Events

> **DRAFT 2026-11-11 — not yet reviewed by an attorney, not yet in effect, not
> yet linked from the product. Nothing here is legal advice.** Written from what
> the code does; every factual statement cites the file that makes it true in a
> margin note (`⟶`), and those notes are removed before publication.
> `[OWNER: …]` items are facts only the owner can supply (collected in
> `OWNER_FILL_SHEET.md`). **`COUNSEL:`** notes mark the points an attorney must
> decide; they are questions, not answers, and are removed before publication.
> The terms only become linkable when `BRAND.policies.terms` is set to the
> published URL (`src/lib/brand.js:151`).

**Effective:** `[OWNER: effective date]`
**Provider:** No Guesswork Systems LLC (“we,” “us”), `[OWNER: mailing address]`
**Contact:** events@noguessworksystems.com ⟶ `src/lib/brand.js:145` (owner decision 11/11/2026)

---

## 1. Who we are and what these terms cover

No Guesswork Events (“the app”) is an event-planning web app made by No
Guesswork Systems LLC. ⟶ `src/lib/brand.js:139, 142` These terms apply to
everyone who uses it:

- **Hosts** — the person planning an event, signed in or not.
- **Guests** — someone who opens an invitation link and replies.
- **Vendors** — a caterer, venue, photographer, or other supplier who opens a
  vendor-brief link a host shared.

Our **Privacy Policy** (what we collect and who sees it) and **Refund Policy**
(the One-Event Pass) are part of these terms. Where they say something more
specific about their subject, they control.

> **COUNSEL:** Is incorporation by reference of the privacy and refund policies
> appropriate, or should the privacy policy stand alone (some state laws treat a
> privacy notice as a disclosure, not a contract term)? Which document controls
> on conflict?

## 2. Eligibility

You must be at least `[OWNER: minimum age — e.g. 18]` to create an account or
buy the pass. The app is built for adults planning events; it has no age check,
so this is a promise you make by using it. ⟶ no age gate exists in
`hostv2/src/HostShellV2.jsx` sign-in (`:2117-2147`); `PRIVACY_POLICY_DRAFT.md` §7

Guests replying to an invitation do not create an account. A host may record a
child's name and needs on a guest list; that is the host's data about their
guest (section 6).

> **COUNSEL:** Minimum age for hosts (18 vs. age of majority vs. 13 with
> parental consent), and whether guests replying through a link — who never see
> these terms before replying — are bound by them at all, or only by a short
> notice on the invitation (`hostv2/src/InviteV2.jsx` footer, per `README.md`
> wiring item 3).

## 3. Accounts and sign-in

- **You can use the app without an account.** Plans made while signed out live
  only in that browser's storage on that device. ⟶ `PRIVACY_POLICY_DRAFT.md` §2
  (`ngw-events`, `ngw-hostv2-custom-events` in `localStorage`)
- **Signing in is by email.** We send a one-time sign-in link and code to the
  address you give; there is no password. ⟶ `HostShellV2.jsx:2122`
  (`signInWithOtp`), `:2147` (`verifyOtp`); sign-in is run by Supabase.
- **Keep your email account secure.** Anyone who can read that inbox can sign
  in as you. You are responsible for what happens under your account, and you
  should tell us promptly at events@noguessworksystems.com if you think someone
  else has used it.
- **Studios.** Signed-in plans belong to a studio; database rules let only that
  studio's members read or change them. ⟶ `supabase/migrations/002_rls_policies.sql`
  If you share a studio with someone, they can see and change its events.

## 4. The free tier and the One-Event Pass

### What is free

Planning is free. Your **first event of your own** — a local, single-day event —
is free to plan end to end: budgets, guests, timeline, every vendor tracked, the
day itself, and **one complete vendor-brief loop**. ⟶ `src/lib/passGate.js:7-8,
137, 188` Budgets, guests, timelines, and reading anything are never behind the
pass on any event. ⟶ `passGate.js:23-25` Sample events are for exploring and
never use up the free event. ⟶ `passGate.js:58-64`

### What the pass is

The **One-Event Pass** is a single, one-time purchase that unlocks the paid
parts of planning for **one event**. ⟶ `passGate.js:9-11` An event needs the
pass for any of these:

1. sharing vendor briefs with **more than one vendor** on that event;
2. a **destination or multi-day** event (where everyone stays, getting there,
   getting around, the multi-day program);
3. **any event after your first** one of your own.

⟶ `passGate.js:76-84` (the three reasons), `:128-138` (brief gate),
`:147-153` (destination toolkit), `:165-176` (what the app says the pass covers)

Whichever reason applies, one pass unlocks that whole event. Whether an event
needs the pass is decided **once, when you create it**, and the app tells you
then. An event that started free stays free even if you later make it
multi-day or a destination. ⟶ `passGate.js:14-18, 185-195`

A vendor you have already shared a brief with can always keep viewing,
receiving updates to, and confirming that brief; only sharing with a new vendor
can need the pass. ⟶ `passGate.js:19-22, 134`

### What the pass is not

- **Not a subscription.** It is charged once, through checkout you complete
  yourself. Nothing renews and nothing is charged again.
  ⟶ `backend/app/routers/stripe_payments.py:328` (`mode="payment"`)
- **Not transferable.** It belongs to the event it was bought for and cannot be
  moved to another event or another person. ⟶ `stripe_payments.py:306-315`
  (one pass per `event_id`), `supabase/migrations/017_event_passes.sql`
- **Not bought twice.** If an event already has a recorded purchase, checkout
  is refused rather than charging you again. ⟶ `stripe_payments.py:306-315`
- **Not something a vendor pays for.** Vendors are never charged a fee.
  ⟶ standing commitment, `passGate.js:41-46`

### Price, payment, and taxes

- **The price is set by us**, shown in the app before you buy, and charged in
  US dollars. It is fixed on our server; neither the app nor you can change it
  at checkout. Today it is **$39**. ⟶ `stripe_payments.py:66-68` (`PASS_AMOUNT_CENTS`,
  server-set), `:319-326` (`currency: "usd"`); `HostShellV2.jsx:17961`
- We may change the price for future purchases. A change never affects a pass
  you already bought.
- **Payment is taken by Stripe** on its hosted checkout page. We never see or
  store your card number. ⟶ `stripe_payments.py:319-333`; `HostShellV2.jsx:17962`
- **Taxes:** `[OWNER: sales-tax treatment — whether the $39 includes tax, is
  tax-exempt where you are, or has tax added at checkout]`. Checkout does not
  calculate tax today: Stripe's merchant-of-record option is turned off and no
  tax is added to the line item. ⟶ `stripe_payments.py:329-333`
  (`managed_payments={"enabled": False}`, owner choice 11/10/2026)
- **Preview period.** While billing is switched off, every event is fully
  unlocked and nothing is charged; the app says so on the pass sheet and tells
  you before that changes. ⟶ `passGate.js:36-39, 54-56`;
  `HostShellV2.jsx:17970-17974`

> **COUNSEL:** (a) Sales-tax treatment of a one-time digital service sold to
> US consumers, given Managed Payments is off — which states, if any, require
> collection at this volume, and does the price need to say "plus tax"? (b) Is
> "we may change the price for future purchases" sufficient, or is a notice
> period needed? (c) Does the preview-period promise ("we'll tell you before
> anything changes") create an obligation that needs defining here?

## 5. Refunds, disputes, and revocation

Refunds are governed by the **Refund Policy**. The refund rule itself — the
window and its conditions — is the owner's decision and is set there, not here.
⟶ `REFUND_POLICY_DRAFT.md` §3 (`[OWNER: refund rule — pick one]`)

What happens mechanically, whatever rule is chosen:

- **A full refund ends the pass.** The event returns to the free tier; nothing
  you planned is deleted. ⟶ `stripe_payments.py:575-578` (`charge.refunded`,
  fully refunded only), `:661-694` (`pass_payment_blocks`);
  `supabase/migrations/020_pass_payment_revocations.sql`
- **A partial refund keeps the pass.** ⟶ `stripe_payments.py:575-576`
  (owner ruling, November 5)
- **A card dispute (chargeback) suspends the pass** as soon as Stripe tells us
  about it. If the dispute is later resolved in our favor, access is not
  restored automatically; write to us. ⟶ `stripe_payments.py:573-574, 662-665`
- **Buying again after a refund or dispute** goes through support, not
  checkout: the app refuses a second purchase on an event with a recorded one.
  ⟶ `stripe_payments.py:306-315`

> **COUNSEL:** Confirm that suspending access on a dispute (before it is
> decided) is enforceable and fairly disclosed, and whether a won dispute
> should restore access by default.

## 6. Hosts: your responsibilities for other people's information

Planning an event means entering information about other people. When you do,
you are the one collecting it, and you are responsible for having the right to.

- **Guests.** You may type or import guest names and record their dietary needs
  and allergies; guests may also give their own when they reply. ⟶
  `src/lib/importHistory.js`; `supabase/migrations/009_rsvp_submissions.sql:25-33`
  Dietary and access needs can be health information. Enter only what you need
  to host people safely, and use it only for that.
- **Vendors.** You may enter vendor names, contacts, and notes. Your private
  notes on a vendor are never shown to that vendor. ⟶
  `backend/app/routers/vendor_brief.py:19-22, 129-147`
- **Email sent for you.** When you ask the app to send an invitation, vendor
  message, or approval request, it is sent through our email provider on your
  behalf, to the addresses you chose. ⟶ `backend/app/emailer.py`
  Send only to people who expect to hear from you about the event.
- **Invite links are keys.** An invitation link carries a long random code, and
  that code is the only thing standing between the invitation and anyone who
  holds it. Anyone with the link can open the invitation — which shows the
  event's public details, including the venue address — and reply. ⟶
  `backend/app/routers/rsvp.py:10-22, 49-55, 214-233`; `rsvp.py:57-74` (the
  venue address is shown on purpose) Share it with the people you are inviting.
  One invitation accepts at most 500 distinct replies by default. ⟶ `rsvp.py:115-122, 346`
- **Shared studios.** Anyone you add to your studio can see and change its
  events, including guest details.

> **COUNSEL:** (a) Under state privacy laws, is the host a separate controller
> of guest data, with us as their service provider — and does that need a
> processor/service-provider clause here? (b) Does a host sending invitations
> through the app make us, the host, or both the "sender" for CAN-SPAM and
> state anti-spam purposes? (c) Is an indemnity from hosts for data they had no
> right to enter appropriate for a consumer product?

## 7. Vendor-brief links

- A vendor brief is a link a host shares with one vendor. It shows a fixed,
  limited slice of the plan: the vendor's own details and the host's note to
  them, the event's name, date, and venue, and that vendor's part of the run of
  show — never guests' details, money, contracts, or other vendors. ⟶
  `vendor_brief.py:129-147, 19-22`
- **It is live.** The brief is rebuilt from the host's current plan every time
  it is opened, so a vendor always sees the latest version. ⟶ `vendor_brief.py:1-6`
- **It stays on until it is switched off by us.** There is no button in the app
  to switch a brief link off yet. A host who needs a link stopped can write to
  us. Deleting your account switches off every brief link on its events. ⟶
  `vendor_brief.py:28-29` (no revoke endpoint; `revoked_at` honored on read),
  `supabase/migrations/021_account_deletion.sql:56`
- **Vendors** do not need an account and are never charged. A vendor can confirm
  the booking or report a problem through the link, and we store that answer for
  the host. ⟶ `vendor_brief.py:331-399`; `passGate.js:41-46`
- The free tier includes one vendor-brief loop per free event; more vendors
  take the pass (section 4).

> **COUNSEL:** Are vendors who open a brief and confirm through it bound by
> these terms (they never agreed to them)? If not, does the acceptable-use
> section need a short notice on the brief page itself?

## 8. Acceptable use

Do not use the app to:

- enter or share personal information about someone you have no right to share;
- send invitations or messages to people who have not asked to hear from you,
  or to harass anyone;
- submit false replies to an invitation, or flood an invitation or brief link
  with automated requests (both are rate-limited and capped) ⟶
  `rsvp.py:108-123, 152-162`; `vendor_brief.py:60-80`;
- try to reach another studio's events, guess invitation or brief codes, or get
  around the database rules that keep studios apart ⟶ `rsvp.py:49-55, 214-222`;
  `supabase/migrations/002_rls_policies.sql`;
- get around the pass, or resell, sublicense, or frame the app;
- upload anything unlawful, or anything you do not have the right to upload;
- misuse the AI drafting features. They run on prompts our server writes; you
  cannot send a free-form prompt, and they are rate-limited. ⟶
  `backend/app/routers/ai.py:12-15, 113-147`

> **COUNSEL:** Whether to reserve a right to remove content or suspend accounts
> for violations — the app has no suspension mechanism today (section 12), so
> any such right would be exercised by hand.

## 9. Your content, and the license you give us

- **Your plans are yours.** You keep whatever rights you have in the plans,
  lists, notes, photos, and documents you put into the app (“your content”).
- **The license you give us** is only what we need to run the app for you: to
  store, copy, display, and transmit your content, and to send it to the
  services the Privacy Policy lists (each sees only what its row says), for as
  long as it is in the app. ⟶ `PRIVACY_POLICY_DRAFT.md` §4
- **We do not sell your data or use it for advertising.** ⟶
  `PRIVACY_POLICY_DRAFT.md` §3 (no such code path exists)
- **AI-drafted text** (an event brief, a vendor follow-up, a summary of a
  document) is generated by a third-party AI model from the parts of your plan
  that feature needs. It can be wrong. Check it against the original before you
  rely on it or send it. ⟶ `ai.py:116-121` (server-owned prompts; the summary
  prompt itself says "the planner must verify against the original document")
- **Feedback.** If you send us suggestions, we may use them without owing you
  anything.
- **The app is ours.** The software, the name “No Guesswork Events,” and the
  design belong to No Guesswork Systems LLC. These terms do not give you any
  right to them beyond using the app.

> **COUNSEL:** (a) Scope and duration of the content license (does it need to
> survive deletion for backups, receipts, and shared-studio content that is
> retained — see section 12?). (b) Ownership of AI output. (c) The name is not
> trademark-cleared — `src/lib/brand.js:22-24, 62-64, 66-78` records that no
> USPTO search has been run and that "No Guesswork" is in use by another party
> in another class. Confirm the "belongs to" wording is not overclaiming.

## 10. Availability and no warranty

The app is run by a small company on third-party services — hosting (Render),
database and sign-in (Supabase), payments (Stripe), email (Resend), and others
in the Privacy Policy. ⟶ `PRIVACY_POLICY_DRAFT.md` §4 We work to keep it
running and your data safe, but we do not promise it will always be available,
error-free, or that nothing will ever be lost. **Keep your own copy of anything
you cannot afford to lose**, such as vendor contracts and guest contact details.

Readiness scores, reminders, forecasts, cost estimates, and food-safety notes
are planning aids drawn from what you entered and from public reference data.
They are not professional advice and do not replace your own judgment, your
vendors' instructions, or a guest's word about their own allergy.

To the fullest extent the law allows, the app is provided **“as is” and “as
available,”** without warranties of any kind, express or implied, including
merchantability, fitness for a particular purpose, and non-infringement.

> **COUNSEL:** Disclaimer wording and conspicuousness for the governing state;
> whether allergy/food-safety content needs a stronger, separate disclaimer
> given that guests' allergies flow through the app.

## 11. Limitation of liability

To the fullest extent the law allows, we are not liable for indirect,
incidental, special, consequential, or punitive damages, or for lost profits,
lost data, or a missed or disrupted event, arising from the app. Our total
liability for any claim is limited to the greater of what you paid us in the
12 months before the claim or `[OWNER: dollar floor — e.g. $100]`.

Some states do not allow some of these limits; where they do not, they apply
only as far as the law allows.

> **COUNSEL:** The cap and floor amount; carve-outs required by the governing
> state; whether a consumer-facing cap tied to a $39 purchase is enforceable;
> whether to add an indemnity from hosts (section 6(c)).

## 12. Ending your use, and deleting your account

**You can stop at any time.** Nothing renews, so there is nothing to cancel.

**You can delete your account yourself**, in the app: **You & settings → Your
account → Delete my account…**, then type `DELETE` to confirm.
⟶ `hostv2/src/HostShellV2.jsx:18935-19000`; `backend/app/routers/account.py:30-41`
(`DELETE /api/account`, literal `DELETE` required). You can also ask us at
events@noguessworksystems.com.

Deleting your account permanently removes, at once:

- your sign-in identity; ⟶ `account.py:88-92`
- the events that belong only to you, with their guest lists, guests' replies,
  vendor-brief links and vendors' confirmations, and messages; ⟶
  `supabase/migrations/021_account_deletion.sql:46-64`
- studios that only you belong to, your memberships, and invitations you sent;
  ⟶ `021_account_deletion.sql:76-79`
- the files you uploaded to those events. ⟶ `account.py:71-87`
- on that device, the app's copies of the account's events. Plans that were
  only ever saved on the device stay there until you remove them. ⟶
  `HostShellV2.jsx:18961-18986`

It is not undone. Some things are kept, and the app says so before you confirm:
⟶ `account.py:105` (`retained_categories`); `HostShellV2.jsx:18990`

- **payment receipts** for any pass you bought — with the link to your account
  removed; ⟶ `021_account_deletion.sql:71-75`
- **security and administrative records**;
- **content in a studio you share with others**, which stays with your
  collaborators.

Deletion will stop and tell you what to do first if you are the only owner of a
studio other people still use (make someone else an owner), or if you uploaded
files to an event someone else still has (transfer or remove them). ⟶
`account.py:56-61, 76-77`

**We may suspend or end your access** if you break these terms or the law, or
if we stop offering the app. `[OWNER: notice period and what happens to a paid
pass if we end the service — e.g. 30 days' notice and a refund of passes for
events not yet held]`. ⟶ no suspension mechanism exists in the code today;
any suspension would be done by hand.

Sections 6, 9 (feedback and our ownership), 10, 11, 13, and 14 survive the end
of your use.

> **COUNSEL:** (a) Retention of "security and administrative records" is named
> in code (`account.py:105`) but not itemized — confirm the description is
> adequate. (b) What a pass holder is owed if we discontinue the service.
> (c) `PRIVACY_POLICY_DRAFT.md` §6 describes the same deletion (corrected
> 2026-11-11); the two must stay in agreement before either is published.

## 13. Changes to these terms

When these terms change in a way that matters, we will put the new effective
date at the top and, for hosts with an account, tell you in the app before the
change takes effect. If you keep using the app after that, the new terms apply.
A change never takes away a pass you already bought, and the refund rule in
force when you bought a pass is the one that applies to it. ⟶ mirrors
`PRIVACY_POLICY_DRAFT.md` §9 and `REFUND_POLICY_DRAFT.md` §7

> **COUNSEL:** Is in-app notice to signed-in hosts enough, given there is no
> email-notice mechanism for policy changes and signed-out hosts get none?

## 14. Governing law and disputes

These terms are governed by the laws of `[OWNER: governing state]`, United
States, without regard to its conflict-of-law rules. Any dispute that is not
resolved informally will be heard in the state or federal courts located in
`[OWNER: county and state for venue]`, unless the law where you live gives you
the right to bring it elsewhere.

Before filing anything, please write to us at events@noguessworksystems.com —
almost every problem with a $39 product is faster to fix by email.

> **COUNSEL:** (a) Courts vs. binding arbitration, and if arbitration, a
> class-action waiver and small-claims carve-out — and whether either is worth
> its cost at this price point. (b) Consumer-protection overrides in states
> where hosts live. (c) Whether an informal-resolution period should be
> mandatory before suit.

## 15. Everything else

These terms, with the Privacy Policy and Refund Policy, are the whole agreement
between you and us about the app. If a part is found unenforceable, the rest
still applies. If we do not enforce a part right away, we have not given it up.
You may not transfer these terms; we may transfer them to a successor to the
business. ⟶ `COUNSEL:` standard boilerplate — confirm each clause for the
governing state.

## 16. Contact

No Guesswork Systems LLC
`[OWNER: mailing address]`
events@noguessworksystems.com ⟶ `src/lib/brand.js:145`
