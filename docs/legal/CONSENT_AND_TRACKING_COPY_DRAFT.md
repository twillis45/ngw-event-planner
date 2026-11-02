# Consent and tracking copy — DRAFT for owner ruling and attorney review

**Status: DRAFT, unreviewed, not wired into the product.** Gate row `s5-consent`
(marketing track, stage 5): "consent and tracking-prompt copy — marketing copy
with a legal consequence." Written 2026-11-02 from what the code does today. Not
legal advice; nothing here ships until the owner rules it and an attorney has
read it.

---

## 1. What runs today (measured, with the file that makes it true)

| Fact | Where |
|---|---|
| **PostHog product analytics is ON by default** on every deployed build. There is **no consent prompt**. | `src/lib/analytics.js:7-13, 19` (hardcoded public key fallback) |
| Automatic click/form capture **off**, automatic page views **off**, session recording **off**. | `src/lib/analytics.js:48-51` |
| PostHog keeps its own visitor ID in the browser's `localStorage` (not a cookie). | `src/lib/analytics.js:52` |
| Name, email and phone properties are stripped from every tracked event. | `src/lib/analytics.js:57, 101-103` |
| **Opt-out exists but has no visible control:** only `?noanalytics=1` in the URL or `localStorage['ngw-analytics-optout'] = '1'`. Neither app offers a toggle. | `src/lib/analytics.js:29-35`; no caller in `hostv2/src` or `src/App.js` |
| Never reports from local development. | `src/lib/analytics.js:22, 24` |
| **Sentry** error reports, `sendDefaultPii: false`, 10% performance-trace sample. | `src/lib/sentry.js:18-26` |

## 2. Two things that must be FIXED before any copy can be true

1. **A business name can reach PostHog today.** `identifyStudio()`
   (`src/lib/analytics.js:73-85`) identifies the visitor as
   `studio_<lowercased business name>` and sends `studio_name` as a property. It is
   **not hashed**, and a sole proprietor's business name is often their own name.
   It runs in the frozen CRA shell (`src/App.js:46176`), which the live site
   serves. The privacy draft says "a hashed studio label rather than your email or
   name" — **that sentence is false today** (corrected in §5).
   *Recommended fix (a shared-lib change, allowed under the CRA freeze as a data
   fix):* identify by a SHA-256 of the studio id, and drop `studio_name`. Or stop
   calling `identifyStudio` at all — hostv2 never does.
2. **"You can opt out any time" needs a control a person can find.** A URL flag is
   not an opt-out a host can be expected to know about. The copy below assumes a
   toggle in Settings that writes the existing `ngw-analytics-optout` key — the
   mechanism exists; only the switch does not.

## 3. The choice the owner makes (one of two)

| | A — Notice + visible opt-out (recommended) | B — Ask first (opt-in) |
|---|---|---|
| What happens | Analytics run as today; one line on first open says so and links to the toggle and the policy. | Nothing is sent until the host taps "Allow." |
| Fits | US-only audience, no advertising, no cross-site tracking, no sale or sharing — which is what the code does. | A future EU/UK audience, or if counsel advises consent for any analytics. |
| Cost | Keeps the activation funnel measurable. | Funnel numbers become a self-selected sample of hosts who said yes. |

**Recommendation: A**, with the attorney asked one question: *"Does any state
where we will have hosts require opt-in for first-party product analytics with
no sale, sharing or ad targeting?"* If yes, B.

## 4. The copy (planner-friendly, plain, no hype)

### First-open notice (option A) — one quiet line, dismissible, never a modal

> We count which parts of the app get used so we can make them better. No ads,
> nothing sold, and your guests' details never leave your plan.
> **[Turn this off]** · **[Privacy]**

### First-open prompt (option B, only if chosen)

> **Can we count which parts of the app you use?**
> It helps us fix what's confusing. No ads, nothing sold, and your guests'
> details are never included.
> **[Allow]** **[No thanks]**

*(Both buttons the same size and weight — a "no" that is harder to tap than a
"yes" is not consent.)*

### Settings toggle (both options)

> **Help improve the app**
> Share which features you use — never your guests, your plans' contents, or
> anything you type. **On / Off**

When off, the line under it reads:
> Off. Nothing about how you use the app is sent.

### Footer / pass-sheet link text

> Privacy · Refunds

## 5. Correction to `PRIVACY_POLICY_DRAFT.md` (applied in the same commit)

The analytics bullet claimed "the identity set to a hashed studio label rather
than your email or name." Until §2.1 is fixed that is not true, so the draft now
says so plainly and points here. Once the fix lands, the original sentence can
return — with the file reference to the hashing code.

## 6. Owner checklist

- [ ] Pick **A** or **B** (§3).
- [ ] Rule on the §2.1 fix (hash or remove `identifyStudio`).
- [ ] Approve building the Settings toggle (§2.2).
- [ ] Send this file and the privacy draft to the attorney with the §3 question.
