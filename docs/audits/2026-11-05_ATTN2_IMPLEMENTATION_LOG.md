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

## Choice-backed roles without invented quotes or deadlines

Follow-up: an explicit catered answer now adds a required Catering role to the existing vendor plan when its resolved playbook has none. This is a suggestion, not an event vendor record. Its price, price provenance, and booking lead remain absent. The existing `vendor-unbooked` producer raises it with the host's exact food answer as its reason; `eventPlan()` remains the only ranker. An authored future booking deadline stays in the future, and an undated role is not called late. A booked matching provider clears the action.

Corpus-count correction: the first rough scan above used a category-word regex. Reading the canonical category normalizer finds eleven raw playbooks without a Catering-normalized role; Sunday Dinner already has a food-provider alias. The implementation uses that canonical normalizer, not the rough scan.

Verification:

- Extended unit suite: 10 tests. New cases first failed on absent roles and the suppressed future-window action. Covers Crab Feast, Fish Fry, Thanksgiving Hosting, explicit versus default intent, preserved authored deadlines, and booked-provider resolution.
- Independently removed the derived role and restored the old undated exclusion. Each fault failed 3 of 10 cases. Both sources restored.
- Reintroduced the missing-role fault in the runtime source and rebuilt. The desktop browser test failed because the choice-backed booking action disappeared. Source restored and rebuilt.
- Broader regression: 17 suites, 357 tests passed, including the existing vendor-plan, unbooked-vendor, consequence, registry, food, and eventPlan contracts.
- Final browser run: 4 of 4 passed at 390px and 1440px. The missing-role journey follows "Open vendors" to the existing sheet, shows the unpriced Catering suggestion, and adds a minimal provider record only after the host presses Add. No status, contract, or price is fabricated. Measured no document overflow; screenshots inspected under the project-specific ignored test-results paths.

ATTN-2's source/food/role gaps are repaired in this branch. The separate desktop "Then, in order" routing defect remains C5/ATTN-3 and must pass after integration before the complete attention journey is called closed. No push or deployment is included.
