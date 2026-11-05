# ATTN-2 implementation evidence

Base: production `origin/main` at `d22a9683`. The November 3 audit branch is evidence only. This change does not merge its runtime code.

## Explicit food answer and existing catering roles

Root causes reproduced: `foodApproach()` read authored defaults before the explicit generic `foodChoices.sourcing` answer; `vendorPlan()` kept an explicitly selected catering role optional. The first fault affected 17 playbooks in a corpus probe, including Dinner Party, Graduation, and Repast.

The canonical reader now gives explicit authored meal answers first priority, then the explicit generic answer, then authored defaults. The existing vendor plan marks an authored Catering category required after an explicit catered answer. An unanswered default never creates that obligation. No vendor record, contract, price, or booking lead is invented. `eventPlan()` still ranks the existing `vendor-unbooked` producer.

Verification:

- New five-case unit suite: initially two failures, then green. The two independent faults were reintroduced separately: default precedence failed 2 of 5; optional category failed 1 of 5. Restored afterward.
- Broader affected regression: 11 suites, 282 tests passed, including foodApproach, vendorPlan, decision wiring, decision identity, hostSpending, eventPlan, and effective shopping items.
- HostV2 `e2e:build` passed. Chromium phone (390px) and desktop (1440px): 2 of 2 passed; booking prompt visible, catered food replaces the homemade food, no fabricated vendor, no document overflow. Screenshots are in the worktree's ignored `hostv2/test-results/` project directories.
- Reintroduced default precedence, rebuilt the actual browser bundle, and watched the desktop test fail because the booking prompt disappeared. Restored the source, rebuilt, and reran both browser projects green.

Remaining: twelve playbooks lack an authored Catering role and therefore need a choice-backed role suggestion without an invented price or booking lead. The existing desktop "Then, in order" click failed to open Vendors during investigation; this remains the C5/ATTN-3 routing issue and is not claimed closed here. Canonical menu navigation remains available. Combined release validation and live deployment are the integrating lane's responsibility.
