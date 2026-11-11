# Native Store Policy and Submission Packet: iOS and Google Play

**Date:** November 5, 2026 · **Lane:** policy and store submission · **Target:** both stores submitted by Monday, November 9, 2026
**Scope:** a Capacitor thin shell around the hostv2 Vite build. The only paid product is the $39 One-Event Pass, sold through Stripe Checkout.
**Rule:** every policy claim below cites an official page fetched on **11/5/2026**. Items marked **EXTERNAL POLICY VERIFICATION REQUIRED (EPVR)** could not be confirmed from an official page.

Sources (all fetched 11/5/2026):
- [A-GL] developer.apple.com/app-store/review/guidelines/
- [A-DEL] developer.apple.com/support/offering-account-deletion-in-your-app/
- [A-AR] developer.apple.com/distribute/app-review/
- [A-SS] developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- [A-PRIV] developer.apple.com/app-store/app-privacy-details/
- [A-AGE] developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- [G-PAY] support.google.com/googleplay/android-developer/answer/9858738 (Payments policy)
- [G-PAYFAQ] …/answer/10281818 (Understanding the Payments policy)
- [G-US] …/answer/15582165 (US policy update)
- [G-ECL] …/answer/16470497 (US external content links enrollment)
- [G-BC] …/answer/17161464 (billing choice program)
- [G-DEL] …/answer/13327111 (account deletion)
- [G-DS] …/answer/10787469 (Data safety)
- [G-API] …/answer/11926878 (target API)
- [G-TEST] …/answer/14151465 (new-account testing)
- [G-PUB] …/answer/9859751 (Publish your app)

---

## 1. Billing ruling

### iOS

| Option | Compliance confidence | Build effort by 11/9 | Notes |
|---|---|---|---|
| **(i)** US storefront only. A button opens Stripe web checkout in system Safari. No IAP. | **Medium-low (ambiguous text)** | Low: about a day (system-browser open, return link, refresh on resume) | See the analysis below. Depends on NAT-3 and NAT-4 for the return trip. |
| **(ii)** StoreKit IAP for the pass | **High** | **Not feasible by 11/9.** Needs an IAP plugin (none is first-party for Capacitor), server-side transaction verification that writes `event_passes` (which today is keyed on `stripe_session_id NOT NULL UNIQUE`, migration 017), the Paid Apps Agreement with tax and banking, and IAP product review | This is the only option the text of 3.1.1 clearly blesses. |
| **(iii)** No purchase surface, but web-bought passes unlock features in the app | **Medium-low** | Lowest | 3.1.3(b) allows this only "provided those items are also available as in-app purchases." The text does not exempt the US storefront from that proviso. |
| **(iii-b)** No purchase surface, and pass features are web-only (never unlocked in iOS) | **High for billing.** Raises 4.2 risk. | Low | Paying users lose features in the app. |

**Does Apple's current text permit (i) without also offering IAP? The text does not settle it.** Quoted from [A-GL]:

- 3.1.1 still opens: *"If you want to unlock features or functionality within your app, (by way of example: … access to premium content, or unlocking a full version), you must use in-app purchase."* This sentence has no US carve-out.
- 3.1.1(a): *"These entitlements are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps."* The same section's bullet says link entitlements apply to apps that *"may offer in-app purchases and also use"* a link. It then says the link prohibition does not apply in the US storefront: *"except for the United States storefront, where this prohibition does not apply."*
- 3.1.3 intro: *"Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront."* This applies only to apps that are "in this section," and NGW is neither a reader app (3.1.3(a)) nor a 3.1.3(f) companion app.
- 3.1.3(b): *"…provided those items are also available as in-app purchases within the app."*

Reading these together, the US text removes the **prohibition on links**. No sentence removes the **requirement to use IAP** for unlocking features.
**EPVR-1 (Apple App Review, before submission):** "May an app distributed only on the United States storefront unlock a feature, our $39 One-Event Pass, solely through a purchase made on our website and reached by an external link that opens Safari, without offering the same item as an in-app purchase under 3.1.1?"

**Ruling for iOS on 11/9: Model (i), with (iii-b) built as a kill switch.**
- Restrict App Store availability to the United States storefront.
- State the model in the reviewer notes (§4).
- Ship one build flag, `NATIVE_PASS_MODE = 'external_link' | 'none'`. If App Review rejects (i) under 3.1.1 or 3.1.3(b), flip the flag to `none` (iii-b) and resubmit the same day, without new code.
- (ii) is the durable answer if Apple says no. It is post-launch work.

### Android

| Question | Answer | Source quote |
|---|---|---|
| Is a consumption-only app allowed (no purchase UI, no link, web buyers get access after sign-in)? | **Yes.** | [G-PAYFAQ]: *"Yes. Google Play allows any app to be consumption-only, even if it is part of a paid service."* Example: *"a user could log in when the app opens and access content paid for somewhere else."* Also: *"We do not require parity across platforms."* |
| Is a US external purchase link allowed without enrolling? | **No.** | [G-ECL]: developers must *"successfully complete their enrollment in this program prior to using external content links."* [G-PAY] §4: apps *"may not lead users to a payment method other than Google Play's billing system,"* and that includes the store listing. |
| What does enrollment require, and how long does it take? | Eligibility is *"a mobile or tablet app or game serving users in the United States."* Steps: a declaration form plus onboarding with Google support, then integration of the external links APIs (*"surface an information screen, enable parental controls"* and report transactions), then a per-app toggle in Play Console. Reporting and fees run *"starting October 1, 2026."* The program exists *"in connection with the US District Court's order."* **No processing time is stated.** | [G-ECL], [G-US] |
| Does the June 2026 billing choice program cover the US? | **No.** It covers Australia, the EEA, Japan, and the UK. *"There are no changes to the US programs at this time."* | [G-BC] |

**Ruling for Android on 11/9: consumption-only.** Enrollment in external content links has no stated turnaround and needs an API integration, so it cannot be relied on by 11/9.

### Exact in-app UI rule for Codex

| Surface | iOS (`external_link`) | iOS (`none`) | Android |
|---|---|---|---|
| Pass sheet | Shows the feature list, the "$39, one event" price, and one button, "Continue on the web." The button opens the checkout URL in **system Safari** (an open-URL handoff). It must not use `window.location.assign` (HostShellV2.jsx:17452 today), an in-app webview, or SFSafariViewController. | Not rendered | **Not rendered** |
| Pass-gated entry points (vendor briefs, destination toolkit) | Open the pass sheet | Neutral lock with no price, no link, and no website mention | Same neutral lock as iOS `none`. Use "Not included for this event," with no price, no URL, and no "visit our site." |
| Event that already holds a pass (`event_passes` row) | Unlocked | **Locked** (the 3.1.3(b) proviso) | **Unlocked** |
| Return after purchase | A universal link back into the event, plus a refetch of pass state on app resume (NAT-3 and NAT-4) | n/a | n/a |
| Store listing and screenshots | May mention the web purchase (US exemption) | No purchase mention | **No** price, "buy," or website-purchase mention ([G-PAY] §4 covers the listing) |

Platform detection comes from the Capacitor platform at runtime. The web build stays unchanged.

---

## 2. Account deletion (NAT-2): required behaviors

| Requirement | Apple [A-DEL], 5.1.1(v) | Google [G-DEL] |
|---|---|---|
| Path inside the app | *"Make the account deletion option easy to find… Typically… account settings."* | *"provide users with an in-app path to delete their app accounts and associated data."* |
| Scope of deletion | *"delete the entire account record, along with associated personal data"*. *"only offering to temporarily deactivate… is insufficient."* Includes content shared with others. | *"You must also delete the user data associated with that app account."* |
| Web URL | Allowed only as a direct link to the completion page | **Required:** *"provide a web link resource where users can request app account deletion,"* usable *"without… requiring them to re-download"* the app. The URL goes in the Data safety form. |
| Support-ticket or email deletion | Not allowed for apps outside highly regulated industries | Data safety has *"no prescribed mechanism"* [G-DS], but the in-app path is still required |
| Time to complete and retention | Say how long deletion takes and confirm when it is done. Say what is retained if law requires it. | *"clearly inform users about your data retention practices."* |
| Sign in with Apple | Revoke tokens with the REST API. Not applicable today, because NGW uses magic link only. | n/a |

**Implementation scope Codex must cover:**
- The Supabase auth user.
- `studio_members`, and `studios` when the user is the last owner.
- `events` and `clients` (cascade).
- `rsvp_submissions` for those events.
- `vendor_brief_links` and `vendor_brief_confirmations`.
- `preferred_vendors`, `studio_settings`, and `studio_invitations`.
- `event_passes`: delete, or keep and disclose as a financial record.
- A PostHog person delete for `studio_<hash>`.

Stripe keeps its own payment records. Disclose that.

The current privacy draft routes deletion through `[OWNER: support email]` (docs/legal/PRIVACY_POLICY_DRAFT.md:211). That is not acceptable as the only path on iOS.

---

## 3. Draft privacy declarations, derived from the code

> **Extended 11/11/2026:** field-by-field answers, deletion paths and corrections to this table are in `docs/native/STORE_PRIVACY_DECLARATIONS_DRAFT.md`. Where the two disagree, that file is newer.

Code facts:
- PostHog: `autocapture:false`, session recording disabled, identifies only by `studio_<sha256 prefix>`, has an opt-out (src/lib/analytics.js:83-123).
- Sentry: `sendDefaultPii:false`, `tracesSampleRate:0.1`, no `setUser` (src/lib/sentry.js:18-26).
- No ad SDK, IDFA, or AppTrackingTransparency in hostv2/src or src/lib (grep returned nothing).
- Geolocation in InviteV2.jsx:393 is compared on the device and never sent. Only the venue string is geocoded.
- Guest records carry name, email, phone, mailing address, and dietary needs (HostShellV2.jsx:6546, 6581, 7112; migration 009).

| Data | Apple label [A-PRIV] | Linked | Purpose | Google Data safety [G-DS] |
|---|---|---|---|---|
| Host email (magic-link sign-in) | Contact Info › Email Address | Yes | App Functionality | Personal info › Email |
| Guest and vendor names, emails, phones, mailing addresses | Contact Info › Name, Email, Phone, Physical Address | Yes | App Functionality | Personal info › Name, Email, Phone, Address |
| **Guest dietary and allergy needs** | **Health** (*"any other user provided health or medical data"*) | Yes | App Functionality | **Health info** (*"Information about a user's health"*) |
| Event plans, notes, vendor details, budgets | User Content › Other User Content | Yes | App Functionality | App activity › Other user-generated content |
| Supabase user ID; PostHog `studio_<hash>` | Identifiers › User ID | Yes | App Functionality, Analytics | Personal info › User IDs |
| PostHog anonymous ID (localStorage) | Identifiers › Device ID? **EPVR-2** | Yes | Analytics | Device or other IDs? **EPVR-2** |
| PostHog events | Usage Data › Product Interaction | Yes (identify) | Analytics | App activity › App interactions; optional (opt-out) |
| Sentry errors and traces | Diagnostics › Crash Data, Performance Data | No | App Functionality | App info and performance › Crash logs, Diagnostics |
| Pass record (SKU, amount, purchaser) | Purchases › Purchase History | Yes | App Functionality | Financial info › Purchase history |
| Location | Not collected (processed on the device only) | — | — | Not collected ([G-DS]: *"only processed locally… not sent off device"*) |

**Remaining declarations:**
- **Tracking: No.** Nothing links data with third-party data for ads, and nothing goes to data brokers, which matches the [A-PRIV] definition.
- **Shared (Google): No.** Supabase, Sentry, PostHog, Render, Resend, and Stripe act as service providers [G-DS].
- **Encrypted in transit: Yes.** All endpoints are HTTPS. Confirm that the Render and Supabase URLs have no plain-HTTP fallback.
- **Deletion: Yes,** with the web URL.

**EPVR-2:** "Does PostHog's random, app-scoped `distinct_id` count as Apple 'Device ID' or Google 'Device or other IDs'?"

**EPVR-3:** "Do contact and health details a host enters about **third parties** (guests) count as data collected for the label?" Recommended answer: declare them, the conservative choice.

---

## 4. Reviewer notes and the 4.2 argument

**Demo account blocker.** [A-AR] asks for *"a valid demo account username and password."* NGW signs in only by magic link, and a reviewer has no access to the inbox. A reviewer sign-in path is therefore required before submission: an email-OTP code or a password for one review account. See **NEW-1**.

**App Store "Notes" (draft):**
> NGW Event Planner helps hosts plan one event end to end. Sign in with the review account below, then open the event "Review Demo — Backyard Crab Feast," which is pre-seeded with guests, vendors, and a schedule. The app is distributed on the US storefront only. The optional $39 One-Event Pass is purchased on our website: "Continue on the web" opens Safari under the US storefront provisions of 3.1.1(a). The review event already holds a pass, so all features are visible. To delete the account, go to Settings › Account › Delete account. Native features: on-device durable storage for offline planning, universal links back into events, the share sheet for invites and briefs, the system browser for checkout and policies, and in-app account deletion.

**Play "App access" (draft):** "All functionality requires sign-in. Email: `[OWNER]`. Code or password: `[OWNER]`. Open the event 'Review Demo.' No purchase is possible in the app. Passes bought on the web unlock automatically."

**4.2 risk, stated honestly.** The planned modules support the argument only if they ship and work:
- Bundled web assets, not a remote URL.
- Durable native storage.
- Universal and app links.
- The native share sheet.
- The system browser.
- Native account deletion.

That still describes a web app with platform integrations. NAT-10's "medium" for a bundled build stands. The (iii-b) fallback raises it, because fewer features are reachable. There is no push notification or other device-only capability in plan. 4.2 rejection remains the most likely non-billing rejection.

---

## 5. Submission checklist

| Item | iOS | Google Play |
|---|---|---|
| Public URLs | Privacy policy, support URL | Privacy policy, **account deletion web URL** [G-DEL] |
| Screenshots | At least one iPhone with Dynamic Island (medium): *"1179 x 2556"* or *"1206 x 2622"* portrait. Plus iPad 13-inch *"2064 x 2752"* **only if the app runs on iPad.** 1–10 per size, no alpha [A-SS] | EPVR-4: current required counts and sizes for phone screenshots and the feature graphic (not fetched) |
| Age rating | Questionnaire of content descriptors, in-app controls, and capabilities. *"An Unrated app can't be published"* [A-AGE]. EPVR-5: whether public invite and RSVP pages count as user-generated content. | IARC questionnaire (not fetched; EPVR-5) |
| Content rights | App Store Connect declaration. The hero photos in hostv2/public need owner-confirmed rights. | Same check |
| Encryption | EPVR-6: the official page body did not load. Expected answer: HTTPS only, exempt (`ITSAppUsesNonExemptEncryption`=NO). Confirm before submitting. | n/a |
| Target API | n/a | *"must target Android 16 (API level 36) or higher,"* in effect since August 31, 2026. Extensions ran *"to November 1, 2026"* and have passed [G-API]. The Capacitor version must support SDK 36 (EPVR-7). |
| New-account testing | n/a | *"a minimum of 12 testers… opted in continuously for at least 14 days"* applies to *"personal developer accounts created after November 13, 2023."* **The page does not mention organization accounts** [G-TEST]. EPVR-8: "Does the 12-tester/14-day closed test apply to organization accounts?" |
| Developer account type | EPVR-9: organization enrollment and D-U-N-S lead time (not fetched) | EPVR-9 |
| Review time | *"at least 50% of submissions in less than 24 hours and 90% in less than 48 hours"* [A-AR] | *"For certain developer accounts… review times of up to seven days or longer in exceptional cases"* [G-PUB] |
| Billing setup | US-only availability (model i) | Consumption-only. ECL is not enrolled. |
| Data declarations | §3 | §3, plus the deletion questions and URL |

---

## NEW blocking findings for November 9 (not already in NAT-1 through NAT-10)

| ID | Finding | Severity |
|---|---|---|
| **NEW-1** | Magic-link-only sign-in cannot satisfy Apple's *"valid demo account username and password,"* and a reviewer cannot receive the link. A review-only OTP or password path is required. NAT-9 names the reviewer login but not this mechanism gap. | P0 |
| **NEW-2** | Apple's text does not settle IAP-free unlocking through a US external link. 3.1.1's "must use in-app purchase" and the 3.1.3(b) proviso stand. This needs EPVR-1 plus a shipped `NATIVE_PASS_MODE` kill switch. | P0 |
| **NEW-3** | Android cannot show any purchase surface: there is no ECL enrollment, no stated turnaround, and a required API integration. The pass sheet must be suppressed and the Play listing must not mention web purchase. | P0 |
| **NEW-4** | If the Play account is personal and was created after November 13, 2023, the 12-tester/14-day closed test alone makes a Play production release on 11/9 impossible. Organization-account status is unconfirmed (EPVR-8). Google states new-account reviews can take up to seven days. | P0 (schedule) |
| **NEW-5** | Target API 36 is mandatory and the extension window closed November 1, 2026. The Capacitor and AGP versions must be confirmed. | P1 |
| **NEW-6** | The deletion scope crosses roughly 10 tables plus PostHog. Rules are needed for multi-member studios (a member leaving versus deleting the studio) and for retaining `event_passes` and Stripe records. The privacy draft's email-only deletion path fails 5.1.1(v). | P1 |
| **NEW-7** | Privacy labels must declare **Health**, contact data for guests (third parties), and Purchase History. Two classification questions are open (EPVR-2 and EPVR-3). | P1 |
| **NEW-8** | If InviteV2 (the guest page) is in the native bundle, its geolocation needs an iOS location usage string, or the page must be excluded from the shell. | P2 |
