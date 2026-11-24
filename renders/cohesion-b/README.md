# Cohesion batch B: vendor detail renders (for owner approval, never merges)

Made-up plan: "Jordan's Retirement Party", 42 Elm Ct, Springfield, VA 22150. Vendor shown: Elm Court Catering (Got a price, $1,500).
dsf 2 at 390 (phone), 834 (11" iPad), 1024 (13" iPad portrait), 1440 (desktop). Clock fixed at 12/1/2026.

- `vendor-detail-before__<w>.png`: the opened vendor today, full length, status picker open.
- `vendor-detail-after__<w>.png`: the proposed opened vendor, full length.
- `vendor-detail-{before,after}-screen__<w>.png`: the same, as the sheet shows it on screen.
- `vendor-list-now__<w>.png`: the vendor list today (audit #36 truncation), for reference.

The "after" is the real app with the opened card's body swapped for proposed markup built from the app's own classes (render.spec.mjs). Nothing in the app was changed to make it.
