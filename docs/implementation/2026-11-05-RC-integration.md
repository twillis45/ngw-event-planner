# RC integration — November 5, 2026

The first combined Jest run after C1/C2/C3/C4/C5/C6/ATTN-2/N4 integration reported 635 passing suites, four failing suites (five assertions), 8,665 passing tests, and one standing skip. This was a failed run, not certification. Evidence: `/tmp/rc-integrated-jest.log`.

The failures were inspected individually:

- The new ATTN-2 audit log needed its row in the existing audit index. Added that row; the unindexed ceiling stays unchanged.
- The confirmed-covers delegation guard incorrectly required a one-name import. It now accepts the actual named import alongside `confirmedRsvpCovers`, while still requiring delegation and forbidding an inline rederivation.
- Two knowledge/admin route assertions still equated a useful landing with an anchor/focus. C5 deliberately opens the existing dedicated Date or Venue editor, including when the hero control is unmounted. Added `routeHasControl` to the existing resolver module so the admin's two readers classify those dedicated editors correctly. General food sheets without a focused row still fail this classification. The route shape and host runtime routing remain unchanged; no fabricated anchor is added.

All four failing suites now pass: 67 assertions. This is focused integration verification; a final combined run/build/browser matrix is still required. Production deployment, database gates, live billing, and human UAT remain unverified.
