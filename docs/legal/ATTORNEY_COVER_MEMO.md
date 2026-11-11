# Cover memo — policy drafts for review

**To:** `[OWNER: attorney name]` · **From:** Todd Willis, No Guesswork Systems LLC · **Date:** `[OWNER: date sent]`
**Enclosed:** `PRIVACY_POLICY_DRAFT.md`, `TERMS_OF_SERVICE_DRAFT.md`, `REFUND_POLICY_DRAFT.md`, `CONSENT_AND_TRACKING_COPY_DRAFT.md`

The drafts were written from what the software actually does. Text between `⟶` and `⟵` cites the code that makes a statement true; it is for your review and is removed before publication. Nothing is published until you approve the final text. This memo states facts and questions; it is not legal advice and asks you for yours.

## 1. The product (facts)

- **No Guesswork Events**, a web app for planning an event (wedding, milestone birthday, reunion) without a paid planner, sold by No Guesswork Systems LLC (`src/lib/brand.js:139-142`). US audience.
- **Three kinds of user.** Hosts plan; guests reply to an invitation link with no account; vendors open a brief link a host shares (privacy §1).
- **Hosts** can plan signed out (data stays in the browser) or sign in by an emailed one-time link or code. Signed-in plans are stored with Supabase (US) (privacy §2; terms §3).
- **Money:** a one-time **$39 One-Event Pass** per event, paid on Stripe's hosted checkout. We never see card numbers. The first event is free (terms §4; `stripe_payments.py:66-68`, `passGate.js`).
- **Third parties** that receive data are listed one per row in privacy §4. They include AI drafting (Anthropic or OpenAI), under prompts our server writes (`routers/ai.py`).

## 2. What is live now

- **Charging real customers since 11/7/2026.** Live Stripe keys are in use; a pass was sold, granted, refunded, and revoked in live testing on 11/8–11/10 (`HANDOFF.md:609`). **No privacy policy, terms, or refund policy is published yet.** This is the urgent gap.
- **Guests give health-adjacent data through a public invite link.** They can submit name, reply, meal, dietary needs and allergies (structured allergens and diets, plus free text), **access needs**, a plus-one's meal and needs, optional phone, email, and mailing address, and a note to the host (`supabase/migrations/009_rsvp_submissions.sql:25-33`, `015_rsvp_guest_details.sql:18-25`). Only the host of that event can see these fields.
- **Product analytics (PostHog) run by default.** A notice is shown on first open, and a Settings switch turns analytics off. Error reports go to Sentry with personal data off (consent draft §1–2).
- **Corrected 11/11/2026:** privacy §1 (Guests) now lists every field the invite collects, what each is for, and who sees it. The host sees everything; other guests see only a count of yeses. It says plainly that access needs may describe a disability, and it adds a question for you (No. 1 below).

## 3. Questions for you (30). Answer by number, or strike any that do not apply

1. Privacy §1 (Guests): Access needs can describe a disability, and diets can reveal health conditions or religion. Do the state sensitive-data rules require opt-in, a notice on the invite form itself, or a limit-use right? Is the stated handling adequate when the host decides what happens next?
2. Terms §1: Should the privacy and refund policies be incorporated by reference, or should the privacy policy stand alone? Which document controls if they conflict?
3. Terms §2: What minimum age should hosts have? Are guests who reply through a link bound by these terms, or only by a short notice on the invitation?
4. Terms §4(a): How should sales tax apply to a $39 one-time digital service with Stripe's merchant-of-record option off? Which states require collection, and must the price say "plus tax"?
5. Terms §4(b): Is "we may change the price for future purchases" enough, or do we need a notice period?
6. Terms §4(c): Does the preview-period promise ("we'll tell you before anything changes") create an obligation we must define?
7. Terms §5: Is suspending a pass when a dispute is filed, before it is decided, enforceable and fairly disclosed? Should a won dispute restore access automatically?
8. Terms §6(a): Is the host a separate controller of guest data, with us as their service provider? Do we need a processor clause?
9. Terms §6(b): For invitations sent through the app, who is the "sender" under CAN-SPAM and state anti-spam law: the host, us, or both?
10. Terms §6(c): Is an indemnity from hosts, for data they had no right to enter, appropriate in a consumer product?
11. Terms §7: Are vendors who confirm through a brief link bound by terms they never accepted? Does the brief page need its own notice?
12. Terms §8: Should we reserve a right to remove content or suspend accounts, given that any suspension would be done by hand?
13. Terms §9(a): What scope and duration should the content license have? Must it survive deletion, for backups, receipts, and shared-studio content?
14. Terms §9(b): Who owns AI-drafted output?
15. Terms §9(c): The name has not been trademark-cleared, and another party uses "No Guesswork" in another class (`brand.js:22-24, 62-78`). Does "belongs to" overclaim?
16. Terms §10: What disclaimer wording and conspicuousness does the governing state require? Do allergy and food-safety content need a stronger, separate disclaimer?
17. Terms §11: What should the cap and floor amounts be, and which carve-outs are required? Is a consumer cap tied to a $39 purchase enforceable?
18. Terms §12(a): Is "security and administrative records" (kept after deletion, not itemized) described adequately?
19. Terms §12(b): What is a pass holder owed if we discontinue the service?
20. Terms §12(c): Privacy §6 and Terms §12 describe the same account deletion. Please confirm they agree.
21. Terms §13: Is in-app notice of changes enough for signed-in hosts? Signed-out hosts get no notice, and we do not send email notices.
22. Terms §14(a): Should disputes go to court or binding arbitration? If arbitration, should we add a class waiver and a small-claims carve-out? Is it worth the cost at this price?
23. Terms §14(b): Which consumer-protection rules in hosts' home states override these terms?
24. Terms §14(c): Should an informal-resolution period be mandatory before a lawsuit?
25. Terms §15: Please confirm each boilerplate clause (entire agreement, severability, waiver, assignment) for the governing state.
26. Refund §3: Should the policy mention partial refunds, which keep the pass, or leave them as a discretionary remedy?
27. Refund §3: The same event cannot buy a pass again after a full refund. Does Option C's "second pass … is final" need rewording, and must re-buying go through support?
28. Refund §3 and §6: A dispute switches the pass off before it is decided, and winning the dispute does not restore it. Is that fair and adequately disclosed, especially under Options B and C?
29. Refund §3: Stripe, not our code, enforces "one refund per pass." Does that sentence need more?
30. Consent §3: Does any state where we will have hosts require opt-in for first-party product analytics with no sale, sharing, or ad targeting?

## 4. Decisions already made by the owner

- Support and privacy contact: **events@noguessworksystems.com** (11/11/2026; `brand.js:145`)
- Analytics: notice plus a visible opt-out (option A), with the business-name identity hashed (11/2/2026, built)
- A partial refund keeps the pass (11/5/2026). Stripe's merchant-of-record option is off (11/10/2026)

## 5. Decisions still pending (owner, before or with your review)

The refund rule (Option A, B, or C), the governing state, the venue county, the mailing address, sales-tax treatment, the minimum age, the liability floor, what happens if the service ends, and the effective date (set last). See `OWNER_FILL_SHEET.md`.

## 6. What to send back

1. Your answer to each numbered question, or a redline of the drafts that resolves it.
2. The final text of the privacy policy, terms, and refund policy you approve, with **a note saying they are approved for publication** and the date or version you reviewed.
3. Any change needed to the short in-app lines: the analytics notice, "Signing in means you agree to…", the pass sheet's policy links, and the invite footer "How your answer is used."

Our publishing tool refuses to publish while any question note or placeholder remains, so every item above must be answered or struck before anything goes live.
