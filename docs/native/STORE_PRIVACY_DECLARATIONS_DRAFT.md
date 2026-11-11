# Store privacy declarations — DRAFT (Apple App Privacy, Google Play Data safety)

**Status: DRAFT, 11/11/2026. Not submitted. Not reviewed by counsel.** Closes nothing on its own: `NAT-8` stays open until the owner enters these answers in App Store Connect and Play Console and the stores accept them.

**This extends an existing draft; it does not replace it.** `docs/audits/2026-11-05_NATIVE_STORE_POLICY_AND_SUBMISSION_PACKET.md` §3 already drafts the declarations as one summary table, with its official sources fetched 11/5 ([A-PRIV], [G-DS], [G-DEL]). This file takes that table to field level: one answer per form field, the deletion path per data type, and the corrections to §3 that the code shows on 11/11 (§0). Where the two disagree, this file is newer; §3 carries a pointer here.

**Grounding.** App code on `main-2utz0n` @ `a36f5073`. Native shell on `origin/codex/native-rc-2026-11-05` @ `09dee315` (Capacitor 8.6, plugins `app`, `filesystem`, `keyboard`, `share`; `native/hostv2/package.json`). Category and field names are as the two forms list them in the 11/5 packet's sources; they were **not re-fetched in this session**. VERIFY each against the live form when entering it.

**Markers.** `VERIFY:` something the code cannot settle, with what to check. `[OWNER: …]` a fact only the owner has.

---

## 0. Corrections to the 11/5 packet §3 and to the privacy draft

| # | Earlier claim | What the code shows on 11/11 | Effect on the forms |
|---|---|---|---|
| C1 | PostHog "identifies only by `studio_<sha256 prefix>`" (packet §3) | hostv2 never calls `identifyStudio`. Its only caller is the frozen CRA shell (`src/App.js:46176`). hostv2 imports only `track` and the opt-out helpers (`hostv2/src/HostShellV2.jsx:144`; `hostv2/src/InviteV2.jsx:18`). PostHog therefore keys hostv2 events to its own random ID in `localStorage` (`src/lib/analytics.js:90`) | Usage data is **not linked** to identity in hostv2 (§2.9). VERIFY in PostHog: persons from the hostv2 host have no `studio_` distinct ID |
| C2 | PostHog runs in the native app | `IS_LOCAL` matches the hostname `localhost` (`src/lib/analytics.js:22`), and the Capacitor shell serves from `capacitor://localhost` (iOS) and `https://localhost` (Android) (`NAT-7`, `docs/audits/2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md:423`). **As the code stands, PostHog sends nothing from the native app.** Sentry is gated only on the DSN and `NODE_ENV` (`src/lib/sentry.js:12`), so it does send | If `NAT-7`'s analytics fix lands before submission, declare Product Interaction (§2.9). If it does not, do not declare it. VERIFY on the build that is submitted, not on this branch |
| C3 | Guest fields: name, email, phone, address, dietary (packet §3) | The RSVP also stores **access needs**, diets, allergens, meal, plus-one and their needs, number of kids, a free-text note, a lodging pick and the crab-picker answer (`backend/app/routers/rsvp.py:172-198`, `:356-404`; `supabase/migrations/015_rsvp_guest_details.sql:13-22`; `016_rsvp_lodging_pick.sql:18`) | Access needs can describe a disability. Adds Apple **Sensitive Info** (§2.3, VERIFY) |
| C4 | Vendor data: names, emails, phones | A vendor who confirms a brief also sends an on-site contact name and phone and a note (`supabase/migrations/014_vendor_brief_confirmations.sql:30-32`; `backend/app/routers/vendor_brief.py:376-395`) | Same Contact Info rows (§2.1) |
| C5 | Not in packet §3 | Typed venue text goes **from the device** to OpenStreetMap Nominatim, or to Google Places when a key is present (`hostv2/src/HostShellV2.jsx:740`, `:1399`). Event content goes to Anthropic or OpenAI through the backend for AI features (`src/lib/aiProxy.js:58-66`; `backend/app/routers/ai.py:52-68`) | Nominatim is not our processor. VERIFY whether Google counts it as **sharing** (§3.3) |
| C6 | Privacy draft: deletion "is not self-serve yet" (`docs/legal/PRIVACY_POLICY_DRAFT.md:160-162`) | Self-serve deletion exists: `DELETE /api/account` (`backend/app/routers/account.py:30-31`), wired in settings (`hostv2/src/HostShellV2.jsx:158`, `:18957`); owner-reported passing on live (`HANDOFF.md:73`) | Deletion: **Yes, in app** (§3.2). The privacy draft needs this correction before publication |
| C7 | Privacy draft: PostHog identity is a hash of the business name (`PRIVACY_POLICY_DRAFT.md:98-99`) | True of the CRA shell only (C1) | Privacy draft correction |
| C8 | Privacy draft: guest fields (`PRIVACY_POLICY_DRAFT.md:42-45`) | Misses phone, email, mailing address and access needs (C3) | Privacy draft correction |
| C9 | Packet §3: geolocation at `InviteV2.jsx:393` | The guest invite watches position and compares it on the device (`hostv2/src/InviteV2.jsx:382-400`). The native `Info.plist` has no location usage string (no `UsageDescription` key on the native branch) | Location: **not collected** (§2.4), on the condition in `NEW-8` |

---

## 1. What the app collects, from the code

| Data | From whom | Stored | Code | Leaves to |
|---|---|---|---|---|
| Sign-in email | Host | Supabase Auth; copied into the default studio name `<email>'s Studio` | `supabase/migrations/011_ensure_studio_claim_first.sql:56` | Supabase; Resend (sign-in code email, `HANDOFF.md:104`) |
| Studio name, role | Host | `studios`, `studio_members` | `supabase/migrations/001_initial_schema.sql:15-27` | Supabase |
| Invited collaborator email | Host, about a third party | `studio_invitations.email` | `supabase/migrations/004_studio_invitations.sql:9` | Supabase |
| Event plans: name, date, type, venue, budget, vendors and their contacts, guest list, notes, food, lodging links | Host | `events.data`, `clients.data`, `preferred_vendors.data`, `studio_settings.data` (JSONB) | `001_initial_schema.sql:44-61`; `005_preferred_vendors.sql:10-15`; `006_studio_settings.sql:10-13` | Supabase; Anthropic or OpenAI for AI features (C5); OpenWeather (venue coordinates, `PRIVACY_POLICY_DRAFT.md:122`) |
| Uploaded files: PDF, JPEG, PNG, WebP, HEIC, Word, up to 10 MB | Host | Supabase Storage bucket `event-files` | `src/lib/storage.js:16-28`; `hostv2/src/HostShellV2.jsx:23414` | Supabase; Anthropic or OpenAI when document extraction is used (`src/lib/aiProxy.js:110`) |
| Typed venue text | Host | Not stored by us | `hostv2/src/HostShellV2.jsx:740`, `:1399` | Nominatim or Google Places, directly from the device |
| RSVP: name, reply, meal, diets, allergens, access needs, needs, plus-one, kids, note, phone, email, mailing address, lodging pick | Guest (on the web invite) | `rsvp_submissions` | `backend/app/routers/rsvp.py:356-404`; `009_rsvp_submissions.sql:20-35`; `015`; `016` | Supabase. Never on a public response (`rsvp.py:190-191`) |
| Vendor confirmation: state, on-site name, phone, note | Vendor (on the web brief) | `vendor_brief_confirmations` | `014_vendor_brief_confirmations.sql:23-34` | Supabase |
| Pass record: event, studio, SKU, amount, Stripe session and payment intent, purchaser's user ID | Host (bought on the web) | `event_passes`, `pass_payment_blocks` | `017_event_passes.sql:63-83`; `020_pass_payment_revocations.sql:3-11`; `backend/app/routers/stripe_payments.py:346-351`, `:643-651` | Stripe holds the card and the buyer's checkout details. We store no card data |
| Product events: event names plus `event_type`, `days_out`, `is_solemn`, `is_destination`, counts | Host and guest | PostHog | `src/lib/analytics.js:130-144`; `src/lib/analyticsContext.js:25-54`; `hostv2/src/InviteV2.jsx:363`, `:733`, `:1443` | PostHog (`us.i.posthog.com`, `analytics.js:20`) |
| Errors and 10% of performance traces | Host and guest | Sentry | `src/lib/sentry.js:18-26`, `:32-40` | Sentry |
| Backend error context ("path, user, feature, status") | Host | `admin_error_log.context` | `backend/migrations/0006_admin_errors.sql:20` | Supabase |
| Client IP address | Anyone calling a public route | **Not stored by us.** Used as an in-memory rate-limit key only | `backend/app/routers/rsvp.py:136-148` | Render, PostHog and Sentry receive it as part of any request. VERIFY each provider's IP setting (§2.10) |
| Device position | Guest | Not stored, not sent | `hostv2/src/InviteV2.jsx:382-400` | Nowhere |

The fee-checkout route (a planner billing their client) also sends `client_name` to Stripe as metadata (`stripe_payments.py:250-254`). VERIFY whether hostv2 reaches that route; the pass route does not send it.

---

## 2. Apple App Privacy, field by field

**Q: Do you or your third-party partners collect data from this app?** **Yes.**

**Q: Is data used to track users?** **No**, for every type below. No ad SDK, IDFA or App Tracking Transparency exists in `hostv2/src` or `src/lib` (11/5 packet §3, re-checked 11/11 by grep). The privacy manifest says `NSPrivacyTracking` false with no tracking domains (`native/hostv2/ios/App/App/PrivacyInfo.xcprivacy:16-19`, native branch).

For each type: **Collected? · Linked to the user? · Tracking? · Purposes · Processor · Optional? · Deletion path.** Deletion paths refer to §4.

### 2.1 Contact Info

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Name | Yes: guests, vendors, collaborators entered by the host; guest and vendor replies | Yes | No | App Functionality | Supabase | Yes; the host chooses to enter them. The RSVP requires a name (`rsvp.py:178`) | D2, D3, D4 |
| Email Address | Yes: host sign-in (required); guest, vendor and invitee emails (optional) | Yes | No | App Functionality | Supabase, Resend | Sign-in email required; others optional | D1, D2, D3 |
| Phone Number | Yes: guest, vendor, on-site contact | Yes | No | App Functionality | Supabase | Yes | D2, D3, D4 |
| Physical Address | Yes: guest mailing address; venue address | Yes | No | App Functionality | Supabase; Nominatim or Google Places for the venue text (C5) | Yes | D2, D3 |

VERIFY (`EPVR-3`, 11/5 packet §3): whether data a host enters about third parties counts as collected. Recommended answer: declare it.

### 2.2 Health & Fitness

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Health | Yes: guest allergens, diets, needs; host-recorded dietary needs | Yes | No | App Functionality | Supabase | Yes | D2, D3 |

Fitness: **Not collected.**

### 2.3 Sensitive Info

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Sensitive Info | **VERIFY.** Guest access needs (`rsvp.py:194`) can state a disability | Yes | No | App Functionality | Supabase | Yes | D2, D3 |

VERIFY: whether access needs fall under Apple's Sensitive Info (which lists disability) or under Health. Declaring both is the conservative answer. `is_solemn` (a funeral or memorial flag) goes to PostHog as a boolean (`analyticsContext.js:42-44`); VERIFY that this is not read as religious information.

### 2.4 Location

Precise Location and Coarse Location: **Not collected.** Position is compared on the device and never sent (C9). This holds only if the native bundle either excludes the guest invite or adds a location usage string (`NEW-8`, 11/5 packet).

### 2.5 Financial Info

Payment Info: **Not collected by the app.** On iOS the pass is bought on Stripe's page in Safari, outside the app, and on Android there is no purchase surface (11/5 packet §1). Card data never reaches us (`stripe_payments.py:318-351`; hosted Checkout).
Credit Info, Other Financial Info: **Not collected.** Budget figures a host types are event content (§2.6).
VERIFY: Apple's treatment of a purchase made on the web and recognized in the app. See §2.8.

### 2.6 User Content

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Photos or Videos | Yes: uploaded images | Yes | No | App Functionality | Supabase Storage; Anthropic or OpenAI when extraction is used | Yes | D1 (files) |
| Other User Content | Yes: event plans, notes, budgets, uploaded documents, guest notes, vendor notes | Yes | No | App Functionality | Supabase; Anthropic or OpenAI for AI features; OpenWeather (coordinates) | Yes | D1, D2, D3 |
| Emails or Text Messages | **VERIFY.** The backend sends email on the host's behalf through Resend (`PRIVACY_POLICY_DRAFT.md:121`) and stores event messages (`backend/migrations/0001_communication.sql`). Check whether hostv2 sends any (`src/lib/commApi.js:73` is imported by hostv2) | Yes | No | App Functionality | Resend, Supabase | Yes | D1 |
| Customer Support | Not collected in the app. Support is by email to `events@noguessworksystems.com` (`src/lib/brand.js:145`) | — | — | — | — | — | — |
| Audio, Gameplay Content | Not collected | — | — | — | — | — | — |

### 2.7 Identifiers

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| User ID | Yes: Supabase user ID; stored as `purchased_by` and in Stripe metadata | Yes | No | App Functionality | Supabase, Stripe | Required for sign-in | D1; nulled on passes (D5) |
| Device ID | **VERIFY (`EPVR-2`).** PostHog's random, app-scoped ID in `localStorage`, only if PostHog runs in the native build (C2) | No (C1) | No | Analytics | PostHog | Yes: opt-out (`analytics.js:47-53`) | D6 |

### 2.8 Purchases

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Purchase History | Yes: which event holds a pass, amount, date | Yes (`purchased_by`) | No | App Functionality | Supabase, Stripe | Yes | D5: retained as a payment record; the user link is removed |

VERIFY: if Apple counts only purchases made in the app, a web purchase may not need declaring. Declaring it is the conservative answer, and it matches the 11/5 packet.

### 2.9 Usage Data

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Product Interaction | **Conditional (C2).** Yes if the submitted build sends PostHog events | **No** (C1) | No | Analytics | PostHog | Yes: in-app opt-out "Help improve the app" (`hostv2/src/HostShellV2.jsx:18706`; `analytics.js:47-53`) | D6 |
| Advertising Data | Not collected | — | — | — | — | — | — |
| Other Usage Data | Not collected | — | — | — | — | — | — |

`autocapture`, page-leave capture and session recording are off; name, email and phone keys are stripped (`analytics.js:83-99`, `:137-143`). VERIFY: PostHog's automatic properties include the current URL, and an invite (`?rsvp=`) or brief URL carries its access code. Check whether the native build's URLs carry codes, and whether `$current_url` should be stripped.

### 2.10 Diagnostics

| Field | Collected | Linked | Tracking | Purposes | Processor | Optional | Deletion |
|---|---|---|---|---|---|---|---|
| Crash Data | Yes, if the build carries a Sentry DSN | No: `sendDefaultPii:false`, no `setUser` (`sentry.js:25`) | No | App Functionality | Sentry | No in-app opt-out | D7 |
| Performance Data | Yes: 10% trace sample (`sentry.js:23`) | No | No | App Functionality | Sentry | No | D7 |
| Other Diagnostic Data | Backend error context with "user" (`0006_admin_errors.sql:20`) | **VERIFY** what "user" holds | No | App Functionality | Supabase | No | Retained as "security_and_admin_records" (`account.py:105`) |

VERIFY: whether the Sentry and PostHog projects discard client IP addresses. `[OWNER: the "Prevent storing of IP addresses" setting in Sentry, and the "Discard client IP data" setting in PostHog]`. If either stores IPs, revisit "Linked: No".

### 2.11 Not collected

Contacts (the address book is never read; guests are typed or imported from a file, `PRIVACY_POLICY_DRAFT.md:33-34`), Browsing History, Search History, Other Data.

### 2.12 Privacy manifest

VERIFY: `PrivacyInfo.xcprivacy` declares one required-reason API and tracking false, and **no `NSPrivacyCollectedDataTypes`** (native branch, lines 5-19). Check whether App Store Connect's privacy report asks for collected types in the app's manifest, and whether the Sentry and PostHog SDKs ship their own manifests when bundled as web code inside a WebView (they are JavaScript, not native SDKs).

---

## 3. Google Play Data safety, field by field

### 3.1 Data collection and security

| Question | Answer | Basis |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | §1 |
| Is all of the user data collected by your app encrypted in transit? | **Yes, VERIFY.** Every endpoint is `https://` and the Android shell sets `allowMixedContent: false` (native branch `capacitor.config.json`). Check that the Render and Supabase URLs in the submitted build have no plain-HTTP fallback | 11/5 packet §3 |
| Which account creation methods does your app support? | **VERIFY the option name.** Email address with a one-time code (`HANDOFF.md:70`); no password, no third-party sign-in | |
| Do you provide a way for users to request that their data is deleted? | **Yes.** In the app (`account.py:30-31`) and at a web URL Google requires: `[OWNER: deletion request URL]`. It depends on the domain (`NAT-6`) and on a published page | [G-DEL] via 11/5 packet §2 |
| Has your app successfully completed an independent security review? | **No.** No pentest has run (`SEC-4`) | Stage 9 refresh §2 |

### 3.2 Data types

For each: **Collected · Shared · Processed ephemerally · Required or optional · Purposes · Deletion.** Purposes use Google's list: App functionality, Analytics, Developer communications, Advertising or marketing, Fraud prevention, security and compliance, Personalization, Account management.

| Google category › type | Collected | Shared | Ephemeral | Required? | Purposes | Deletion |
|---|---|---|---|---|---|---|
| Personal info › Name | Yes | No (service providers) | No | Optional | App functionality | D2, D3, D4 |
| Personal info › Email address | Yes | No | No | **Required** (sign-in) | App functionality, Account management | D1 |
| Personal info › User IDs | Yes | No | No | Required | App functionality, Account management | D1 |
| Personal info › Address | Yes (guest mailing address, venue) | **VERIFY (§3.3)** | No | Optional | App functionality | D2, D3 |
| Personal info › Phone number | Yes | No | No | Optional | App functionality | D2, D3, D4 |
| Personal info › Other info | **VERIFY:** access needs, if not filed under Health | No | No | Optional | App functionality | D2, D3 |
| Health and fitness › Health info | Yes (dietary, allergy, access needs) | No | No | Optional | App functionality | D2, D3 |
| Financial info › Purchase history | Yes (pass record) | No (Stripe is a service provider) | No | Optional | App functionality | D5 |
| Financial info › User payment info | **No.** No purchase in the Android app (consumption-only, 11/5 packet §1) | — | — | — | — | — |
| Photos and videos › Photos | Yes (uploads) | No | No | Optional | App functionality | D1 |
| Files and docs | Yes (PDF, Word uploads) | No | No | Optional | App functionality | D1 |
| App activity › App interactions | **Conditional (C2)** | No | No | Optional (opt-out) | Analytics | D6 |
| App activity › Other user-generated content | Yes (event plans, notes, guest and vendor notes) | No | No | Optional | App functionality | D1, D2, D3 |
| App info and performance › Crash logs | Yes (Sentry) | No | No | Required (no opt-out) | App functionality | D7 |
| App info and performance › Diagnostics | Yes (traces, backend error context) | No | No | Required | App functionality | D7 |
| Device or other IDs | **VERIFY (`EPVR-2`)**, conditional on C2 | No | No | Optional | Analytics | D6 |
| Location (approximate, precise) | **No** (C9) | — | — | — | — | — |
| Messages › Emails | **VERIFY** (§2.6) | No | No | Optional | App functionality | D1 |
| Contacts, Calendar, Audio, Web browsing, Installed apps | No. The app writes a Google Calendar link (`hostv2/src/InviteV2.jsx:793`); it does not read the calendar | — | — | — | — | — |

### 3.3 "Shared" — what to check

Google treats transfers to service providers as not shared ([G-DS] via 11/5 packet §3). Supabase, Render, Sentry, PostHog, Resend, Stripe, Anthropic, OpenAI and OpenWeather act for us under server-owned requests.

VERIFY two transfers that do not fit that pattern:
- **Nominatim or Google Places** receive typed venue text directly from the device (`HostShellV2.jsx:740`, `:1399`). Nominatim is a public service, not under contract to us. Check whether this is "shared" Address data, or exempt as a transfer the user starts and expects.
- **Anthropic and OpenAI** receive event content. `[OWNER: whether data-processing terms are in place with each, and which providers are keyed in production]`. `aiProxy.js:58-66` records the Anthropic key confirmed live on 7/17/2026.

---

## 4. Deletion paths

| Path | What it removes | What it keeps | Code |
|---|---|---|---|
| **D1. Delete account in the app** | The Supabase auth user, hard delete; solo studios and their events, clients, vendors and settings; the user's uploaded files; memberships; invitations they sent or received | Content in a **shared** studio; payment records; security and admin records. Refused until ownership of a shared studio is transferred | `backend/app/routers/account.py:30-105` (`should_soft_delete: False` at `:92`; `retained_categories` at `:105`); `supabase/migrations/021_account_deletion.sql:47-79` |
| **D2. RSVPs** | Deleted with the host's personal events (D1). A purge function removes replies 90 days after the event | **The purge is not scheduled** (`009_rsvp_submissions.sql:101-104`; `docs/legal/README.md:45-47`). `[OWNER: whether it is scheduled in production]` | `021_account_deletion.sql:50`; `009:111-130` |
| **D3. A guest asking for their reply to be removed** | No self-serve path. Guests have no account | By email request | `PRIVACY_POLICY_DRAFT.md:155-157` (its placeholder is now `events@noguessworksystems.com`) |
| **D4. Vendor confirmations and brief links** | Deleted with the host's personal events | — | `021_account_deletion.sql:53`, `:56` |
| **D5. Pass records** | `purchased_by` set to null | The row (event, amount, Stripe IDs) as a payment record. Stripe keeps its own records. `[OWNER: retention period for payment records]` | `021_account_deletion.sql:73-74`; `account.py:105` |
| **D6. PostHog** | Nothing. No code calls PostHog on deletion | Events under a random ID, not linked to the account (C1). `[OWNER: PostHog retention on the current plan]` | `account.py` has no PostHog call |
| **D7. Sentry** | Nothing | Error events without user identity. `[OWNER: Sentry retention on the current plan]` | `sentry.js:25` |
| **D8. On the device** | Uninstalling removes the WebView's `localStorage` (signed-out plans, RSVP outbox) | — | `PRIVACY_POLICY_DRAFT.md:72-75`; `InviteV2.jsx:682-717` |

The 11/5 packet's deletion scope listed "a PostHog person delete for `studio_<hash>`" (11/5 packet §2). Given C1, hostv2 creates no such person. VERIFY in PostHog before deciding it is unneeded.

---

## 5. Before entering any of this

1. Publish the privacy policy with corrections C6–C8, and fill its `[OWNER: …]` placeholders (`docs/legal/README.md:15-26`). Both forms need its URL (`NAT-5`).
2. Decide C2: ship the `NAT-7` analytics fix or not. The Usage Data and Device ID answers follow from it.
3. Answer the `[OWNER: …]` items in §2.10, §3.1, §3.3 and §4.
4. Resolve the VERIFY items in §2.3, §2.5, §2.6, §2.8, §2.9, §2.12 and §3.3 against the live forms.
5. Re-check §1 against the build that is submitted. This draft describes `a36f5073` and the native branch at `09dee315`.
