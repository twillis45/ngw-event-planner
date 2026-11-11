# iOS and Android surface declarations — DRAFT for the workspace surfaces table

**Status: DRAFT, 11/11/2026. Nothing here is declared until the owner pastes it.** The table it belongs in is the "Surfaces (Path to Production declarations)" table in `ngw-event-planner-workspace/CLAUDE.md`, a separate repository. This file does not edit it.

**Why it exists.** The spine requires every surface to declare `facing` and `platform`, and says an undeclared platform "is the first thing to fix", because "every gate below it inherits the wrong defaults" (`ngw-os/docs/path-to-production.md:54-58`, `:70-71`). The iOS and Android apps are undeclared: finding `STAGE2-2`, P1 (`docs/audits/2026-11-03_HOSTV2_PATH_TO_PRODUCTION_RECERTIFICATION.md:45`, `:162`). It is one of the 5 open P0/P1 findings in the 11/11/2026 re-measurement (`HANDOFF.md:610`).

**Choices made in this draft, stated so the owner can reverse them:**
1. **Two surfaces, not one.** The spine allows either: "a web app plus an iOS wrapper is two platforms on one surface, or two surfaces, depending on how much diverges" (`path-to-production.md:56-58`). The two apps diverge on billing (iOS links out to the web; Android shows no purchase surface), on store review, and on deletion and data-safety requirements (`docs/audits/2026-11-05_NATIVE_STORE_POLICY_AND_SUBMISSION_PACKET.md` §1, §2, §5). Each gets its own gate record.
2. **`facing: public` now, not at release.** Both apps are built for the public stores. Declaring `internal` until release would trigger a retroactive stage 9 at store launch, which is how the web app ended up selling before its public gates were ruled (`docs/audits/2026-11-11_STAGE_9_BOARD_PACKET_REFRESH.md`, intro). Declared public, the public-only gates bind before submission. Tester builds (TestFlight, Play internal testing) are reach, not facing.

---

## 1. Rows, ready to paste

Same columns and style as the existing table. Paste below the "Legacy CRA shell" row.

```markdown
| iOS app (`demo/native/hostv2/ios/`) | public | iOS (iPhone; iPad [OWNER: yes/no]) | Capacitor 8.6 thin shell around the bundled hostv2 build; app ID `com.noguessworksystems.events`. **Undeclared until this row (`STAGE2-2`); no stage recorded.** Lives on branch `codex/native-rc-2026-11-05`, not `main`, with no CI. Store builds are refused by `native/hostv2/scripts/nativeChannel.mjs` until billing, signing and device gates pass. Billing model: US storefront, "Continue on the web" to Stripe in Safari (11/5 policy packet §1, unconfirmed by App Review, `EPVR-1`). Gate state lives in `demo/HANDOFF.md`, not this row. |
| Android app (`demo/native/hostv2/android/`) | public | Android (phones) | Same Capacitor shell and app ID; target and compile SDK 36. **Undeclared until this row (`STAGE2-2`); no stage recorded.** Same branch, no CI. Billing model: consumption-only, with no price, purchase control or website mention in the app or listing (11/5 policy packet §1). Gate state lives in `demo/HANDOFF.md`, not this row. |
```

The `demo/` prefixes follow the workspace convention: they resolve on the owner's machine, where the app repo is cloned at `demo/` (`ngw-event-planner-workspace/CLAUDE.md`, "Where `demo/` is"). The native folder exists only on `codex/native-rc-2026-11-05`; on `main` the path resolves to nothing until that branch merges.

**Facts behind the rows:**

| Claim | Source |
|---|---|
| Capacitor 8.6; plugins `app`, `filesystem`, `keyboard`, `share` | `native/hostv2/package.json` on `origin/codex/native-rc-2026-11-05` @ `09dee315` (11/6/2026) |
| App ID `com.noguessworksystems.events`; permanent once published | `HANDOFF.md`, November 6 table, "Native app ID" row; `native/hostv2/capacitor.config.json` |
| Gradle and Xcode builds never run; the branch has no CI | `HANDOFF.md`, November 6 table, same row |
| Store channel refused by the build script | `native/hostv2/scripts/nativeChannel.mjs:1-17` (native branch) |
| Android `targetSdkVersion = 36`, `minSdkVersion = 24` | `native/hostv2/android/variables.gradle:2-4` (native branch) |
| Android requests only `INTERNET` | `native/hostv2/android/app/src/main/AndroidManifest.xml:46` (native branch) |
| Sign-in tokens in Keychain (iOS) and Android Keystore, not WebView storage | `native/hostv2/ios/App/App/AppDelegate.swift:46-58`; `native/hostv2/android/app/src/main/java/com/noguessworksystems/events/SecureAuthStoragePlugin.java:14-28`; `native/hostv2/runtime/bootstrap.js` (`SecureAuthStorage`) |
| The `NATIVE_PASS_MODE` billing flag the 11/5 plan calls for is **not on the branch** | `git grep NATIVE_PASS_MODE origin/codex/native-rc-2026-11-05` returns nothing (11/11/2026). Plan item B2: `docs/audits/2026-11-05_THREE_PLATFORM_EXECUTION_PLAN.md:69` |

`[OWNER: the store display name]`. `capacitor.config.json` still says "NGW Host RC".
`[OWNER: whether the iOS app runs on iPad]`. It changes the screenshot set (11/5 packet §5) and the criteria below.

---

## 2. Stage 2 review criteria: Apple HIG and Material

The spine at stage 2: "Native platforms have their own HIG/Material conventions that override generic web patterns" (`path-to-production.md:65`). At stage 4, "Native platforms need a simulator or a device" (`:66`).

The guideline sources are Apple's Human Interface Guidelines and Google's Material Design 3 with the Android app quality guidelines. **They were not fetched in this session.** Every number below (44 pt, 48 dp, font scale) is the commonly published value. VERIFY each against the current text before the review applies it.

Each criterion names how it is checked. Per the owner's rule, a property that can be measured is measured by a script, not reported as looked at (`ngw-os/CLAUDE.md`, rule 5). "Device" means a simulator or a physical device, never a resized desktop browser (`path-to-production.md:66`).

### 2.1 Both platforms

| # | Criterion | Check | Pass when |
|---|---|---|---|
| B1 | **No web-only affordances.** No hover-only controls, no print, no download link that does nothing in a WebView, no browser-style chrome, no "open in browser" for app features | Inventory script over hostv2 controls in the native build; device pass of every sheet | Zero controls that no-op or depend on hover. Print hidden (`NAT-7`; plan B5, `THREE_PLATFORM_EXECUTION_PLAN.md:74`) |
| B2 | **Billing surface matches the platform's ruling** | Platform matrix test: each mode renders exactly its control (plan B2) | iOS: one "Continue on the web" control that opens the system browser. Android: no price, no purchase control, no website mention, on any screen. **Blocked today:** the flag does not exist (§1) |
| B3 | **Account deletion is easy to find in settings** | Device pass; count taps from home | Reachable from settings in the app without email or a website (11/5 packet §2). Exists in hostv2 settings (`hostv2/src/HostShellV2.jsx:18957`) |
| B4 | **Sign-in completes inside the app** | Device test: request a code, enter it, return to the app signed in; also tap the emailed link | Code entry offers one-time-code autofill (`autoComplete="one-time-code"`, `HostShellV2.jsx:19007`). The link returns through `com.noguessworksystems.events://auth-callback`. **Open: `NAT-4`** |
| B5 | **The system share sheet is used for sharing** | Device test of invite share, brief share and backup export | The platform sheet opens. The shell replaces `navigator.share` with the native plugin (`native/hostv2/runtime/bootstrap.js`) |
| B6 | **Dark mode follows the system setting** | Device pass in both appearances | No unreadable text. Contrast measured by script, not judged |
| B7 | **Screen reader** (VoiceOver, TalkBack): every control has a name, headings are marked, sheets trap focus and announce | Automated accessibility scan inside the WebView, then a device pass with the screen reader on | No unnamed controls. Every sheet reachable and dismissable by gesture. No axe run exists for the web app yet (stage 9 refresh §2, stage 4) |
| B8 | **Large text** | Device at the largest standard text size, and at the largest accessibility size on iOS | No clipped or overlapping text, no horizontal scroll. VERIFY whether the WebView honors the system text size at all. If not, record that as a finding rather than a pass |
| B9 | **No native permission prompts beyond need** | Read the manifest and `Info.plist`; device first-run | Android: `INTERNET` only (§1). iOS: no usage-description prompts. The guest invite's geolocation needs a location string or must be excluded (`NEW-8`, 11/5 packet) |
| B10 | **Plain dialogs, not web dialogs** | grep the native build for `window.alert`, `confirm(`, `prompt(` | None reachable. Confirmations use the app's own sheets |
| B11 | **Offline and resume** | Device: airplane mode, edit, background the app, restore network, resume | A failed save says so (`PROMOTION-DEFERRED.md:59`). Pass state refetches on resume (11/5 packet §1, return row) |

### 2.2 iOS (Human Interface Guidelines)

| # | Criterion | Check | Pass when |
|---|---|---|---|
| I1 | **Safe areas.** Content clears the Dynamic Island or notch and the home indicator; the shell sets `contentInset: never`, so the web layer must pad | Script on device screenshots at the smallest and largest supported iPhone: measure every fixed element against `env(safe-area-inset-*)` | No control inside an unsafe inset. Bottom actions sit above the home indicator |
| I2 | **Touch targets at least 44 × 44 pt** | The existing tap-target sweep, run on an iPhone simulator, not a 390px desktop window (`docs/audits/2026-08-07_MOBILE_TAP_TARGET_SWEEP.md`) | Zero targets under the floor, or each exception recorded |
| I3 | **Back navigation.** Every pushed view and sheet has a visible back or close control; edge swipe goes back where a user expects it | Device pass; inventory of sheets | No dead end. VERIFY whether edge-swipe back is enabled in the WebView; if not, every view needs a visible back |
| I4 | **Sheets dismiss as iOS sheets do** | Device: swipe down on each sheet | Swipe-down dismisses, or the sheet shows a visible close and does not look swipeable |
| I5 | **Keyboard does not cover the field being typed** | Device: every form at the smallest iPhone | Focused field and its submit stay visible. The shell shows the accessory bar (`bootstrap.js`, `Keyboard.setAccessoryBarVisible`) |
| I6 | **External purchase opens Safari, not the app's own view** | Device test of the pass sheet | Checkout opens in Safari. Today the web app navigates its own window (`window.location.assign`, 11/5 packet §1, UI table); that must change in the native build |
| I7 | **Launch screen and app icon** | Visual check against HIG; icon sizes from the asset catalog | No blank white flash on launch; icon has no alpha |

### 2.3 Android (Material 3 and app quality)

| # | Criterion | Check | Pass when |
|---|---|---|---|
| A1 | **System back closes the top layer first.** Sheet, then view, then exit | Device: press back from every sheet depth | Never exits from inside a sheet. The shell calls `history.back()` when it can and exits otherwise (`bootstrap.js`, `backButton` listener); hostv2's sheet back-stack must hold an entry per sheet. VERIFY predictive back on Android 14+ |
| A2 | **Edge to edge.** Status and navigation bar insets are respected | Device screenshots on gesture and three-button navigation; measure fixed elements against insets | No control under a system bar. Target SDK 36 makes edge to edge the default (VERIFY against the current Android behavior-change notes) |
| A3 | **Touch targets at least 48 × 48 dp** | The tap-target sweep on an Android emulator | Zero targets under the floor, or each exception recorded |
| A4 | **Font scale up to 200%** | Emulator at the maximum font scale | No clipped text, no horizontal scroll (see B8) |
| A5 | **No purchase, price or website mention, in the app or in the listing** | grep the Android build's rendered strings for "$", "buy", "pass", the site's host; review the listing text | Zero hits outside the neutral lock text (11/5 packet §1). This is a policy criterion, applied here because it shapes the design |
| A6 | **Back from a deep link** | Open an app link cold; press back | Lands on the app's home or exits cleanly, never a blank view |

### 2.4 Owed before these criteria can run

- A native build on a device or simulator. None has run: Gradle and Xcode builds were never run (§1), and the native branch has no CI.
- The billing flag (B2, I6, A5).
- The `NAT-7` shell fixes (B1), including the analytics origin check that today switches PostHog off in the app (`docs/native/STORE_PRIVACY_DECLARATIONS_DRAFT.md`, C2).
- A stage 1 decision for each app. The web app's stage 1 is itself unruled (`STAGE1-1`), and the native apps have no problem statement of their own. `[OWNER: whether the native apps share the web app's stage 1 or need their own]`.
