# Native debug clients — November 5, 2026

This is a reviewable implementation snapshot, not store readiness or submission. Worktree: wt-native-rc, branch codex/native-rc-2026-11-05. Base c282bf76; platform auth-storage contract827e31f1; shared C8 public URL change cherry-picked as ed1d60e0. The web integration branch has advanced independently; account deletion is not integrated into this native snapshot.

## Runtime change

Capacitor8 packages the actual HostV2 UI and engines as local assets, without server.url. Real iOS/Android projects, pinned npm/SPM dependencies, and reproducible build commands live in native/hostv2. Official App/Keyboard/Share/Filesystem adapters provide cold/warm callback routing, Android Back through the existing closeSheet, OS sharing/export, and keyboard integration. An injected storage contract precedes importing Supabase: Keychain on iOS, AES-GCM/Android Keystore on Android. No plaintext auth fallback. Bridge logging is disabled. Dependency rationale and owner gates are in native/hostv2/README.md.

Debug uses com.example.ngwhostrc only and never inherits web cloud targets. Public links and auth callbacks have separate explicit configuration. Native digital Stripe session calls refuse before fetch. The reviewed policy is Android consumption-only and iOS none: no native pass sheet, sales row, price, or website link, neutral locked entries, Android server-confirmed entitlement only, and iOS paid tools remain locked. Web behavior remains unchanged. No iOS external-link model was selected.

## Measured checks

- Native web bundle built from this source; no remote loader or web service worker.
- Android Gradle assembleDebug succeeded, compile/target36, min24. APK: native/hostv2/android/app/build/outputs/apk/debug/app-debug.apk.
- Xcode26.3 simulator Debug build succeeded. App: native/hostv2/artifacts/ios-simulator/Build/Products/Debug-iphonesimulator/App.app. Unsigned build reproduced Keychain -34018 and blocked boot. Local ad-hoc simulator signing (no owner identity) restored Keychain probe and packaged onboarding on iPhone16e/iOS26.3.
- Android APK installed/launched on dedicated ngw-host-rc API34 emulator. CDP measured onboarding, no horizontal overflow, real secure storage set/read, WebView reload, read/delete. It uses dummy test data, not credentials. Script: native/hostv2/scripts/android-cdp-check.mjs.
- HostV2 executable seam6 suites /54 checks passed. Jest6 suites /58 checks passed: platform storage, public URL, pass/entitlement, native policy, checkout refusal. Native callback Node tests4 passed. Removing origin validation made1 callback test fail; restored4 green. Before native checkout guard1 test failed; before native entitlement policy2 tests failed; restored green.
- Evidence logs local /tmp/ngw-native-{android-final,ios-final,unit-final,callback-red,callback-green,checkout-red,policy-red}.log. Screenshots committed beside this record. Binary packages/generated bundles stay ignored; source and lockfiles are committed.

## Open gates and limitations

No store upload, submission, approval, or physical-device pass. No owner signing identities/profiles, final IDs, account enrollment, country availability, or Play testing eligibility verified. Icons/splash are generated placeholders. The minimal native adapter set does not itself establish Apple minimum functionality compliance. Production auth cold/warm flow, universal/App Links, entitlement restore/resume, export/share cancellation, Android Back/keyboard/safe areas, recovery, final privacy/support/deletion URLs, and signed archive/AAB require device and configuration verification. iOS secure writes across process restarts are not yet independently asserted; the successful runtime probe is a Keychain read. Production iOS CORS admission needs exact origin configuration. Privacy manifest includes Filesystem timestamp reason C617.1; final labels/disclosures require owner review.

Weather/lodging failure-reporting follow-up from the previous lane remains preserved as stash8ff757a4370a590d620ea4eda34880fb10bab121;4 tests red, no runtime fix claimed.

## Consumption-only refresh follow-up

The Android native client now asks the canonical entitlement endpoint after sign-in, event open, and native resume even while web Stripe billing is dormant. API configuration and an actual session are required; this does not enable auth/cloud. iOS none does not ask for an entitlement it cannot use. The original billing-only predicate reproduced a failed Android refresh check; fixed Jest6 suites /59 checks pass. Actual consumption-only entitlement restore with a configured live account remains unverified. Removed the unused Browser plugin; no speculative dependency remains. Rebuilt native web, Android Debug (214 tasks), and iOS ad-hoc simulator successfully. Updated artifact hashes correspond to these follow-up packages.
