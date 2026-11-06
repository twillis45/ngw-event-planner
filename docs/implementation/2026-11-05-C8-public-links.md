# C8 public URL boundary — November 5, 2026

Added `publicAppUrl()` as the shared web destination for HostV2 RSVP/vendor links, Stripe checkout return URLs, and the auth redirect fallback. `REACT_APP_PUBLIC_APP_URL` must be an HTTPS URL without embedded credentials, query, or fragment. Existing web deployments keep their current origin and path when it is absent; this does not cut over the production domain or migrate browser storage. Native runtimes require the configured public URL. An invalid destination refuses a checkout request or shared link rather than distributing a local native address. The existing explicit `REACT_APP_AUTH_REDIRECT` still controls native authentication callbacks separately.

Supabase auth storage now uses the platform adapter injection contract before client creation; web retains localStorage. This wiring does not claim a native Keychain/Keystore implementation, callback handler, signed build, or successful login. Those belong to the dedicated native lane.

Verification:

- Existing runtime-origin behavior failed ten new URL-boundary checks before the fix.
- Focused URL/actual Stripe request tests plus existing fixed-price tests pass (30 assertions); restored auth-storage contract tests are also included in the final focused run.
- Source red-proof replacing the resolver with the former runtime-origin implementation failed all 11 URL/request assertions; restored automatically in `finally`.
- Built Chromium artifact: 18 RSVP capability cases at 390px/1440px pass without a configured public URL, including refusal to share from a simulated native runtime.
- Configured build uncovered a compiler problem with optional chaining in the native-detection default parameter: two native browser cases failed while ordinary web cases passed. A simpler body expression fixed the actual generated code. Rebuilt with `https://public-app.example.test/hostv2/` and reran all 18 cases, asserting exact public shared URLs with a simulated native runtime. This is a test-only destination, never a production setting.
- Evidence: `/tmp/c8-public-url-red.log`, `/tmp/c8-url-redproof.log`, `/tmp/c8-public-final-unit.log`, `/tmp/c8-links-browser.log`, `/tmp/c8-public-browser-final.log`.

Still open: published legal/privacy/refund/support URLs and runtime links; account deletion; real public-origin and auth allowlist configuration; native callback/device proof; production billing lifecycle. No production deployment, DNS change, legal publication, or store gate pass is claimed.
