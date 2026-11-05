# Three-platform execution plan: paid web, iOS and Android by Monday, November 9, 2026

**Written Thursday, November 5, 2026 (EST).** This supersedes the web-only target in `2026-11-03_ONE_WEEK_PAID_WEB_RC_PLAN.md`. That plan's clusters C1–C9 become **Track A** here unchanged.

**Roles:**
- **Codex** implements, builds, integrates and prepares submissions.
- **Claude** does independent architecture, policy, QA and Path-to-Production verification. It does not score Codex's work by reading Codex's summary; it re-runs the tests and red-proofs them.
- **Todd** holds the accounts, makes the rulings, and handles the people.

**Hard boundaries:**
- Legacy frozen; HostV2 only; no HostV3; no cosmetic redesign.
- No fabricated gate passes, and no weakening of financial, security, privacy or payment controls.
- **No website wrapper passed off as a native app.**
- **No claim that an app is "submitted" without store-side confirmation** (App Store Connect or Play Console status, screenshot or API response).

---

## 1. Where things stand, measured November 5

| Item | Measured state |
|---|---|
| `main` | `d22a9683` (11/3). **Nothing has merged since.** |
| Live site | `d22a9683`, profile `services` (no sign-in, localStorage only). `RELEASE_SHA.txt` read 11/5 |
| Track A engineering (C1–C9, 109 h) | **0 h merged.** No Codex branch has been pushed since 10/18 |
| Plan and gate documents | On `main-2utz0n` (`ac1d085d`), **not merged to `main`** |
| Owner items (RUNBOOK §A–D, legal, domain, live Stripe, UAT recruiting, pentest booking, Google enrollment) | **Unknown to this session.** Nothing reported back. Apple Developer enrollment was submitted 11/3 |
| Native projects | **None.** No Capacitor config, no Xcode project, no Android/Gradle project, no Expo or React Native, no mobile CI workflow. `native/RevealConcepts.swift` is a single SwiftUI design-concept file (reveal animation studies), not an app |
| Build capability | **Android:** buildable in a Linux container (JDK and Gradle present; Android SDK downloadable from `dl.google.com`, HTTP 200). **iOS:** needs macOS and Xcode. This container cannot build it. Use a **GitHub Actions macOS runner** (the repo is public, so standard runners are free) or Todd's Mac |
| PWA | hostv2 ships a manifest and service worker (9/27). This is not a store app |

## 2. Native architecture (decided on current code, not preference)

**`THIN SHELL WITH SPECIFIC NATIVE MODULES`** (recertification §22), concretely **Capacitor 8.6.0** (current on npm, 11/5). Packages: `@capacitor/core`, `cli`, `ios`, `android`, `app` 8.1.2, `browser` 8.0.5, `preferences` 8.0.1, plus share and filesystem as needed.

**Why Capacitor:** hostv2 is a Vite 4 + React 19 app with one writer (`patchEvent`) and an offline-capable store. Capacitor bundles that build into the app, so the code under test is the code that ships. React Native would be a rewrite, which the boundaries forbid.

**What keeps it from being a "website wrapper":**
- **Bundled assets.** The web build ships inside the app (`webDir`), **never** `server.url` pointing at the live site. A build that loads the website remotely is rejected by Claude's QA gate.
- **Native modules doing real work:**
  - deep-link and auth return (`App.appUrlOpen`);
  - the share sheet for invite links;
  - the system browser for checkout and policy pages;
  - durable storage of the session;
  - native file save for exports;
  - in-app account deletion.
- **Honest risk statement.** Apple 4.2 ("elevate it beyond a repackaged website") remains a **material rejection risk** on a first submission for any web-shell app. The modules above are the argument, and the reviewer notes must make it. The policy packet records this risk, and no one should promise approval.

## 3. Track A: paid web (Codex primary)

Track A is the 11/3 plan's C1–C9, merge order **C9 → C1 → C2 → C4 → C3 → C5 → C6 → C8**, with C7 proof on the release candidate SHA.

**Native depends on three of them:**

| Cluster | Why native needs it |
|---|---|
| **C9: paid-path security** | Native ships on sign-in (`live`), so `S9-1` (anon-key RSVP purge) must be fixed before **any** build that carries the anon key, web or native |
| **C8: public-origin seam (`NAT-3`)** | In a native shell `window.location.origin` is `capacitor://localhost` or `https://localhost`. Every invite, RSVP and Stripe return link would be broken without it |
| **C2: RSVP truth** | The native app must not promise links that don't resolve |

**Freeze.** Web feature freeze stays **Friday 11/6, 3 PM EST** where feasible. If C1–C9 are not merged by then, the cut line (11/3 plan §5) applies. **C9 is never cut.**

## 4. Track B: native iOS and Android (dedicated lane)

Every item ships in `hostv2/` or the backend, behind a native-platform check where behavior differs. Nothing goes in `src/App.js`.

| # | Item | Findings closed | Acceptance (test that must go red first, then green) | Hours |
|---|---|---|---|---|
| **B1** | Capacitor scaffold: `capacitor.config` (bundled `webDir`, no `server.url`), `ios/` and `android/` projects, app IDs from **D6**, icons and splash from the existing brand assets | `STAGE2-2` (declare iOS/Android surfaces) | A config test fails if `server.url` is set; an Android debug APK builds in CI | 6 |
| **B2** | **Billing UI per store**, per ruling **D-N1** (§6). One build flag, `NATIVE_PASS_MODE`:<br>- **iOS** = `external-link`: "Continue on the web" opens checkout in **system Safari**. Today `HostShellV2.jsx:17452` navigates the app's own view to Stripe (`window.location.assign`), and that must change.<br>- **Android** = `consumption-only`: no pass sheet, no price, no link and no website mention. Pass features show a neutral lock; events with a web-bought pass unlock normally.<br>The fallback `none`, for iOS if Apple rejects, has no purchase surface at all | `NAT-1` | A platform matrix test: each mode renders exactly its control. No Stripe URL is assigned to the app's own window in any native mode | 7 |
| **B9** | **A sign-in App Review can use.** Apple asks for "a valid demo account username and password", and magic-link sign-in can't provide one. Add a reviewer-only password sign-in on one pre-provisioned account, disabled for every other address and logged | `NEW-1` (packet) | A backend test: the password path works for that one account only and refuses every other address | 4 |
| **B10** | **Android target API level 36** (required for new apps; extensions ended 11/1/2026), plus a check that the native bundle requests no location permission the guest page could trigger | `NEW-5`, `NEW-8` (packet) | Gradle config assertion; the merged manifest permission list is diffed in CI | 2 |
| **B3** | **Account deletion:** backend endpoint (deletes the studio's events, RSVPs, members, vendor links and the Supabase user; Stripe customer reference retained only as the law requires), an in-app control in Settings, and a **web deletion URL** (Google requires one) | `NAT-2` | Backend test: after deletion, every table holds no row for that studio; the user cannot sign in. e2e: the Settings control works and confirms | 14 |
| **B4** | **Auth return:** Supabase magic link with PKCE, redirecting to a **custom URL scheme** (for example `com.noguessworksystems.app://auth`), handled by `App.appUrlOpen`. Universal Links and App Links follow once the domain serves `/.well-known` | `NAT-4` | A unit test on the callback parser; device test: tapping the email link opens the app signed in | 8 |
| **B5** | **Shell gaps:** backend CORS allowlist adds `capacitor://localhost` and `https://localhost`; `src/lib/analytics.js` `IS_LOCAL` must not treat the shell origin as local; downloads and print use filesystem/share (print hidden in native); invite share uses the native share sheet | `NAT-7` | Backend CORS test; analytics test with the shell origin; e2e on Android emulator for share/export | 12 |
| **B6** | **Policy, support and deletion links** in Settings and the pass sheet, via the C8 seam | `NAT-5` (engineering half), `N4-9` | Link-presence test per platform | 2 |
| **B7** | **CI:** Android signed AAB (upload key from GitHub secrets) and iOS archive plus upload on a macOS runner (App Store Connect API key from secrets) | `NAT-9` (engineering half) | Green workflow runs producing an AAB and an `.ipa` | 8 |
| **B8** | Store listings: screenshots (iPhone only, per **D-N2**), descriptions, privacy labels and Data safety (from the policy packet), reviewer notes and demo account | `NAT-8`, `NAT-10` | Claude checks each field against the policy packet before Todd presses submit | 6 |

**Track B total: about 69 h** (was 62; +1 B2, +4 B9, +2 B10) of engineering, on top of Track A's 109 h. That is about 178 h in four days. It only fits with **at least five Codex lanes running in parallel** (Track A as planned, plus Track B split across iOS/CI and shared work).

## 5. Critical path to November 9 (EST)

| Day | Codex | Claude | Todd |
|---|---|---|---|
| **Thu 11/5** | C9 starts. B1 scaffold and B7 Android CI start. B3 backend starts | Policy and submission packet (running). PR review harness: re-run and red-proof each PR's tests | **Rulings D1, D-N1, D-N2, D-N3, D6** (§6). Grant access (§7). Report owner-item status |
| **Fri 11/6** | C9, C1, C2 merged. B2–B6 in review. First Android APK installable. iOS archive in CI if Apple enrollment is approved and secrets are set. **Web freeze 3 PM** | Re-score each merged cluster on the code. Stage 4 instruments on the release candidate SHA | RUNBOOK §A–C. Legal pages published (or the release candidate cannot charge). DNS |
| **Sat 11/7** | Release candidate on `live`. Fix only release-blocking regressions. Upload Android internal-test and iOS TestFlight builds | Device QA checklist on Todd's devices (via screenshots and Sentry). Recheck the store fields | Live-key Stripe lifecycle. **UAT testers A and B.** Install the TestFlight build and the Android internal build on real phones |
| **Sun 11/8** | Store-blocking fixes only | Stage 9 packet updated with real evidence. Gate records drafted | **Submit** to App Review and Play review, if §8's checks are green. Send Claude the confirmation screenshots |
| **Mon 11/9** | — | Board support | **Stage 9 board sits** (web). Store status as each store reports it |

## 6. Decisions only Todd can make (needed Thursday 11/5)

| ID | Decision | Recommendation | Why it is yours |
|---|---|---|---|
| **D1** | Paid web ships on the `live` profile (sign-in on) | **Yes.** Native needs it too | It changes what the product is for every visitor |
| **D-N1** | Native billing model per store | **Packet done 11/5** (`2026-11-05_NATIVE_STORE_POLICY_AND_SUBMISSION_PACKET.md`), both load-bearing quotes re-verified by Claude. **Recommend:**<br>- **Android: consumption-only.** Google, "Understanding the Payments policy" (answer/10281818): "Google Play allows any app to be consumption-only, even if it is part of a paid service." No purchase may happen in the app.<br>- **iOS: US-only, with an external link to web checkout in Safari**, behind the `NATIVE_PASS_MODE` flag. **This is not settled by Apple's text.** The US exemption lifts the ban on links, but 3.1.1 still says "you must use in-app purchase" to unlock features, and 3.1.3(b) requires web-bought items to be "also available as in-app purchases." Expect possible rejection; the fallback flag `none` removes the purchase surface, so a resubmission takes minutes. StoreKit is the certain path but cannot be built by 11/9. Earlier candidates, for the record: The leading candidates: **iOS:** US storefront only, with an external link that opens the web checkout in Safari and no in-app purchase. Apple's current 3.1.1(a) text says entitlements "are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps". **Android:** a consumption-only app (no purchase surface; a pass bought on the web works after sign-in) if Google's policy permits it, or Play Billing if not | Revenue model and legal risk |
| **D-N2** | iPhone only, no iPad build | **Yes.** It removes the iPad screenshot set and iPad review scope | Product scope |
| **D-N3** | US-only distribution on both stores | **Yes.** The billing ruling depends on the US storefront, and the legal drafts are US-only | Market scope |
| **D6** | Bundle ID, application ID and store name | `com.noguessworksystems.<app>` and the cleared name (D5) | Permanent once published |

## 7. Access Codex needs, and only Todd can grant

| Access | Where | Used for |
|---|---|---|
| **App Store Connect API key** (`.p8` plus Key ID and Issuer ID, App Manager role) | App Store Connect → Users and Access → Integrations | CI upload to TestFlight and App Store Connect. Stored as GitHub secrets, never in the repo |
| **Apple enrollment approved,** and the app record created with the D6 bundle ID | developer.apple.com | Signing and TestFlight. **Unknown whether Apple has approved yet** |
| Apple signing: distribution certificate and provisioning profile, **or** automatic signing via the API key | Apple Developer | iOS archive |
| **Google Play Console organization account, verified** | play.google.com/console | Every Android store step. **Not yet submitted as of 11/3** |
| **Play service account** JSON with release permissions | Play Console → API access | CI upload to internal testing and production |
| Android upload keystore, with Play App Signing enrolled | Generated once, stored in GitHub secrets | Signed AAB |
| GitHub Actions secrets write access for the above | Repo settings | CI |
| A Supabase redirect URL allowlisted for the custom scheme | Supabase → Authentication → URL configuration | B4 sign-in return |

## 8. Submission gate for each store (Claude checks; nothing is "submitted" without store confirmation)

A store submission goes ahead only when **all** of these are true. Each is a check, not a feeling.
0. **App Review demo sign-in exists (B9)** and the Android build targets API 36 (B10).
1. C9 is merged, and `has_function_privilege('anon', …purge…)` is `false` in production.
2. B3 account deletion works on a real device and the web deletion URL resolves.
3. The privacy, support and deletion URLs are published and return 200.
4. The billing UI matches the D-N1 ruling on that store's build; there is no in-app Stripe webview.
5. A signed build is installed on a real phone and the core journey passes (create, guests, RSVP link, money, sign in by magic link, delete account).
6. Privacy labels and Data safety are filled from the policy packet.
7. Reviewer notes include a working demo account.

## 9. What is realistically achievable by November 9

| Deliverable | Realistic? | Depends on |
|---|---|---|
| Paid web release candidate, built, tested and deployed on `live` | **Likely, if** C9, C1, C2, C6 and C8 merge by Saturday | Codex parallelism; D1 |
| **Paid web production launch** | **Possible, not likely.** The pentest cannot report by 11/9, so the board's best outcome is a **capped, invited paid cohort** with the pentest booked. The board may hold instead | Legal pages published, live Stripe test, UAT, board ruling |
| Android signed build installable on a real phone | **Likely** | B1, B7; D6 |
| Android upload to the internal testing track | **Likely, if** the Play organization account is verified in time | Google verification, outside our control |
| Android production submission | **Possible** | Account verified; B2–B6; policies published; §8 green |
| Android approved and published by 11/9 | **Unlikely and not controllable.** Google states reviews for certain developer accounts can take "up to seven days or longer in exceptional cases". If Google applies the 12-tester, 14-day closed test (stated for personal accounts; silent on organization accounts), production is weeks away | — |
| iOS build on TestFlight (internal) | **Possible, if** Apple has approved the enrollment and the API key is in CI by Friday | Apple verification, outside our control |
| iOS App Store submission | **Possible** | Same, plus B2–B6, §8 green |
| iOS approved and published by 11/9 | **Not controllable, and not impossible.** Apple states "at least 50% of submissions in less than 24 hours and 90% in less than 48 hours", but the 3.1.1 and 4.2 rejection risk on a first submission is material. A Sunday submission could come back approved, or rejected, before Monday | — |

**The honest ceiling for November 9:**
- A paid web release candidate, and a stage 9 ruling on it.
- Both apps built, on real phones, and **submitted** if the §8 gate is green.
- Approval and publication on either store cannot be promised by anyone this week.
