# Event Boss — Launch-Gate Punch-List

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/a21d24f6-7478-4e22-a165-367cce7f44be. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-13 · Source: artifact `a21d24f6`

---

**Event Boss · V2 · Launch Gate**

# What only you can unblock

The buildable parity work is shipped. What's left to reach the leaders' bar isn't a coding problem — it's your keys, your infra, and a few strategy calls. Here's each gated dimension: where it stands in code, exactly what you do next, and where I plug back in the moment it's unblocked.

Benchmark `279/420 · 66.4%` · after this session's parity push

**Legend:** Gated — needs you · Prepped in code · Strategy call

---

## 01 · Commerce go-live
*Payments 5 · Value 6* — **Gated — needs you**

The One-Event Pass surface is built and honest — it just can't take money yet, on purpose.

**Where it stands**

The **$39 One-Event Pass** sheet exists (Settings → Your plan), with real Stripe rails wired (`createCheckoutSession`). It's double-gated — it only offers a charge when the backend is configured *and* `REACT_APP_BILLING_LIVE=1`. Default: an honest "free while in preview" state. It will never charge by accident.

**What only you can do**

- Decide **what the pass actually gates** — right now the whole app is free/unlocked, so there's no paywall boundary yet. This is the real blocker, and it's a product call, not code.
- Confirm (or add) the backend route `/api/stripe/create-checkout-session` handles a one-event-pass product, with your live Stripe keys.
- Flip `REACT_APP_BILLING_LIVE=1` when you're ready to charge (your D-2 "5 gates").

plug-in: **HostShellV2.jsx** pass sheet → **buyPass()** → success-return (`?stripe_paid=1`) handler + unlock flag. I build that once you've decided the gating boundary.

---

## 02 · Multimodal — receipt OCR / voice-to-fields
*Multimodal 4* — **Gated — needs you**

The one dimension I refuse to fake: no-fake-AI means no pretend parsing.

**Where it stands**

Voice capture already exists in the create flow, but nothing *parses* what's captured, and there's no receipt OCR. Faking it (regex "OCR", canned voice intents) would violate the no-fake-AI doctrine, so it stays unbuilt rather than dishonest.

**What only you can do**

- Provide a **real parse endpoint** — a backend route calling a vision model for receipts, and/or a real speech-intent parser. (A key + endpoint; the model choice is yours.)

plug-in: receipt photo → parse → prefill food/budget line prices; voice → parse → event fields. Wiring is ~a day once a genuine endpoint exists.

---

## 03 · Accessibility — full certification
*A11y 7* — **Prepped in code**

Real fixes shipped; the last mile needs real assistive-tech testing.

**Where it stands**

Shipped this session: keyboard operability on custom controls (Space + Enter), focus-to-CTA on the reveal, `aria-describedby` on the invite error, plus earlier aria-modal / focus-trap / landmarks. And a real WCAG recompute just cleared three small-text tokens that were under 4.5:1. Contrast is now AA-clean by calculation.

**What only you can do**

- Run **real screen-reader passes** — VoiceOver (iOS), TalkBack (Android), NVDA — on a device. Automated checks can't catch reading-order and announcement quality.
- An axe / Lighthouse CI run in your pipeline as a regression gate.

plug-in: I fix whatever the AT passes surface — this is verify-then-fix, not build-blind.

---

## 04 · Security — penetration test
*Security 6* — **Gated — needs you**

Share-link surfaces look sound; only a real pentest can certify them.

**Where it stands**

RSVP and vendor-brief share links use tokens, keep PII out of URLs, and go through tokenized-auth paths. That's good hygiene — but it hasn't been adversarially tested.

**What only you can do**

- Commission a **pentest** of the share-link/token surfaces and backend: Supabase RLS policies, rate limiting, token entropy/expiry, the public resolve/confirm endpoints.

plug-in: I can do a code-level review of the token/link surfaces now if you want a first pass — but a pentest is a person, not a commit.

---

## 05 · Notification discipline
*Notifications 5* — **Gated — needs you**

There's no channel to be disciplined about yet.

**Where it stands**

The app has no push/reminder channel — so "meaningful, non-spammy notifications" can't score. The activation return-card (shipped) rewards a return but can't *pull* the host back without a channel.

**What only you can do**

- Pick the **channel**: web push (needs VAPID keys + a service worker + backend), or email/SMS via a provider (SendGrid / Twilio).
- Provide the keys / provider account.

plug-in: I scaffold the service worker + subscription flow (or the email/SMS triggers off the readiness engine) once the channel + keys exist.

---

## 06 · Command speed · Findability · Responsive
*5 / 6 / 6* — **Strategy call**

Not a defect — a hard cap set by your own phone-frame ruling.

**Where it stands**

These three are capped by the locked 393×852 phone-frame doctrine. Inside that frame the app is at its parity ceiling; the leaders score higher partly by being desktop-capable and search-forward at widths this prototype deliberately doesn't use.

**The call only you make**

- **Keep the phone-frame** as an intentional identity tradeoff (these stay capped, by design) —
- — or **lift it** toward a responsive/desktop shell, which is the only thing that unlocks all three. That's a real build, and a strategy decision first.

plug-in: if you lift the ruling, this becomes a responsive-layout project — scoped separately, not a token tweak.

---

## 07 · Collaboration & Localization
*2 / 2* — **Strategy call**

The two lowest rows — and the benchmark itself calls them strategy, not gaps.

**Where it stands**

No co-hosting/multiplayer and no multi-language. Both are large new surfaces (real-time sync + roles; full string extraction + locale infra), not fixes to existing ones.

**The call only you make**

- Decide if **co-hosting** and/or **localization** are on the roadmap. Each is a project. No code until the product decision — building either speculatively would be waste.

plug-in: on a yes, each becomes its own scoped build with its own plan.

---

## — The honest bottom line —

**Where the needle actually is**

Of the seven, only two have a coding path I can start today — a **security code-review first pass** and, once you decide the paywall boundary, **commerce success-handling**. The rest genuinely wait on you: a parse endpoint, real AT + pentest passes, a push channel, and two strategy calls. That's not the engine falling short — the planning intelligence already rivals the leaders. The remaining gap is the other people, table stakes, and commerce, and most of it is a decision or a key away, not another sprint.

---

Prepared after the parity push · benchmark 268 → 279 / 420. Everything buildable-and-honest from the audit is shipped and pushed to `main`. Tell me which gate you're unblocking and I wire it in.
