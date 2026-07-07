# Trial Scorecard

## Scoring rules

- One tracker row per vendor run; a row passes only per the README's per-row
  definition (open, understand, respond, act, update — with zero privacy
  issues and zero workarounds).
- **Stand-in reduced weight:** a real-vendor pass counts 1.0; an uncoached
  stand-in pass on their own device counts 0.5. Failures count full weight
  for everyone — a stand-in getting confused is real evidence against.
- Pass rate = (weighted passes) / (weighted total).

## Thresholds (all must hold)

- [ ] Weighted pass rate ≥ 80%
- [ ] Privacy issues = 0 (one leak = automatic overall FAIL + fatal-flaw review)
- [ ] Manual workarounds = 0 (target; any workaround fails its row and must
      be filed as a repair slice)
- [ ] ≥ 3 vendor categories covered
- [ ] Both paths exercised: at least one confirmed AND one issue_reported
- [ ] At least one vendor-side pass on a mobile device
- [ ] At least 2 runs by genuinely external people on their own devices

## Final 10+ readiness decision (circle one)

- **Not proven** — thresholds not met, or trial not run
- **Evidence collected** — trial run, mixed results, repairs filed
- **Candidate strong** — thresholds met with stand-in-heavy evidence; needs
  real-vendor confirmation runs
- **Proven 10+** — thresholds met with real vendors across ≥3 categories;
  hosts report less chasing; update INTELLIGENCE_AUDIT_1.md and doctrine
  scorecards accordingly

Templates alone never move the status. Only filled tracker rows do.
