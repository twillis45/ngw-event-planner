# C1 WebKit payment selector — November 5, 2026

The unchanged payment form tap-target assertion failed on actual WebKit: the Budget entry SELECT rendered 25px high despite `min-height: var(--tap-min)`. Computed appearance stayed native (`auto`). Chromium's six viewport checks had passed, so it did not expose this behavior.

An in-browser probe confirmed that explicit `height: var(--tap-min)` renders 46px while retaining the native arrow/appearance. Added only that declaration to the existing payment selector. No global style, token, or control replacement.

Rebuilt the integrated HostV2 e2e artifact and ran the unchanged four money cases on actual WebKit at 390px and 1440px: eight passed, including the >=44px form-control assertion. This proves cents, reload/Undo, the audited paid-caterer totals, and a fresh first expense on those browser geometries. The canonical C7 matrix and final combined release remain separate gates.

Failure/probe evidence: `/tmp/ngw-webkit-money-diag.log`, `/tmp/ngw-webkit-money-trace.zip`, `/tmp/ngw-webkit-select-height-probe.png`. Final build/run: `/tmp/c1-webkit-build.log`, `/tmp/c1-webkit-money.log`. The existing failing test was retained without lowering the tap floor.
