# HostV2 native release candidate

Status: local implementation in progress. These are new iOS/Android clients of HostV2, with its existing UI and canonical engines. No store submission or approval is claimed.

Surfaces: iOS — public / iOS; Android — public / Android. Provisional local identifier: `com.example.ngwhostrc`. It must never be submitted. Final owner identifiers, signing, billing/distribution ruling, policies, and store records remain release gates.

## Architecture decision — November 5, 2026

Use Capacitor 8 with bundled HostV2 assets and native adapters. Preserve the four-layer product and existing writers. Do not use `server.url` to load the public site, and do not replace HostV2 with a new SwiftUI/React Native product. The existing `native/RevealConcepts.swift` is an unbuilt visual calibration file, not an application target, and is preserved.

Native work covers secure authentication persistence, cold/warm auth callbacks, Android Back behavior, native sharing/export, keyboard/safe-area behavior, and local packaged launch. Those capabilities require device verification; generated projects alone do not establish minimum functionality or submission readiness.

Dependencies are pinned: Capacitor core/platform packages provide the native runtime; App provides URL/lifecycle/Back events; Share and Filesystem provide real OS export/share handoffs; Keyboard provides native keyboard integration. They are not alternate event stores or business engines.

## Measured environment

Inventory on November 5: Xcode 26.3 selected, iOS SDK 26.2, iOS 26.3 simulator runtimes available. Zero valid code-signing identities and zero provisioning profiles found locally; this does not determine remote account enrollment. Android Studio 2026.1, JDK 21, SDK platforms 34 and 37.0, build-tools 34/36, and Android 34 emulator images exist. No connected Android target was found. Node 22.23.2 works at `/usr/local/opt/node@22`; the default Node 25 executable is broken by a missing simdjson library. SDK 36 and build-tools35 were installed using the existing accepted SDK licenses; compile/target36 debug APK now builds.

Native projects, secure-storage bootstrap, and custom debug callbacks now exist. The shared C8 public URL seam is integrated. Production universal-link associations, iOS custom-origin CORS admission, final account-deletion integration, and store configuration remain unverified. Native debug intentionally defaults to local-only: it reads explicit REACT_APP_NATIVE_API_BASE_URL / SUPABASE_URL / SUPABASE_ANON_KEY rather than inheriting web deployment targets.

## Before an actual submission

- Confirm final app IDs, app name, Apple/Play organization status, countries, and billing mode. Native purchase CTAs stay disabled until that mode is explicitly implemented; do not embed worldwide Stripe checkout.
- Configure production API, Supabase redirects, public web URLs, exact native CORS origins, and app/site association files with final team IDs and certificate fingerprints.
- Implement and prove account deletion, including shared-studio data and auth-cache invalidation. Auth-user deletion alone does not clean this schema's UUID references.
- Produce signed archive/AAB with final IDs, correct privacy manifests/disclosures, support/privacy URLs, screenshots, reviewer access, and physical-device evidence.
- Verify offline persistence/recovery, auth return, export/share, safe areas, keyboard, Back, entitlement restore, and payment/refund behavior on the selected native billing path.
- Record the store's actual submission confirmation. Review approval/publication timing remains external.

## Primary references checked

[Capacitor 8 requirements](https://capacitorjs.com/docs/updating/8-0): Node 22+, Xcode 26+, iOS 15+, Android compile/target 36. [Configuration](https://capacitorjs.com/docs/config): bundled `webDir`; remote `server.url` is for live reload and is not intended for production. [Deep links](https://capacitorjs.com/docs/guides/deep-links) require native registration and website associations. [Supabase mobile redirects](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) require an allowed app redirect and callback handling. Billing-policy research and owner rulings are maintained by the coordinating lane.

## Local debug build

Use Node22 on PATH, run `npm ci` in this directory, then `npm run build:web` and `npm run sync`. For Android set ANDROID_HOME to the installed SDK and JAVA_HOME to JDK21, then run `./gradlew assembleDebug` in `android`. For iOS run `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath artifacts/ios-simulator CODE_SIGN_IDENTITY=- build`. Ad-hoc simulator signing is required for Keychain access; CODE_SIGNING_ALLOWED=NO builds but fails closed at runtime. These commands do not submit anything.

Public links require REACT_APP_PUBLIC_APP_URL (validated HTTPS). Auth has a separate REACT_APP_AUTH_REDIRECT; the debug default is com.example.ngwhostrc://auth-callback and must be allowed by the configured Supabase project. No production credentials or targets are implied. NGW_NATIVE_RELEASE=1 deliberately refuses this provisional packaging profile.

Native billing defaults: Android consumption-only, confirmed server entitlement only; iOS none, paid tools unavailable even for a web-bought pass. Native pass sheets, settings sales rows, prices, and website-purchase links are absent. No external-link exception was selected. The policy owner's iOS external_link option remains an unresolved release decision.

Bridge logging is disabled, including debug, to keep authentication tokens out of native console forwarding. iOS tokens use ThisDeviceOnly Keychain; Android tokens use AES-GCM with a nonexportable Android Keystore key, ciphertext in app-private preferences, and application backup disabled. Existing event persistence stays canonical. Export writes a cache file and hands it to the OS; that handoff does not prove the user saved it. Cache files remain available for the receiving application and are subject to OS cache cleanup.
