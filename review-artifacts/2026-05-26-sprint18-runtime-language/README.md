# Sprint 18A — Runtime Language Authenticity Hardening

Page-50 doctrine applied directly to three runtime slices. Figma page 51 created as the canonical operator-session capture template.

## Files
| File | Surface · state |
|---|---|
| `01_vendor_escalation_1440.png` | Vendor slice · escalation (post-refinement) |
| `02_vendor_emergency_1440.png` | Vendor slice · emergency |
| `03_vendor_nominal_1440.png` | Vendor slice · nominal |
| `04_density_nominal_1440.png` | Desktop density · nominal |
| `05_density_cascade_1440.png` | Desktop density · cascade |
| `06_density_emergency_1440.png` | Desktop density · emergency (AV) |
| `07_debrief_1440.png` | Debrief slice · synthesized example |
| `08_page_51_human_validation_findings.png` | Figma page 51 thumbnail (8 sections) |

## Runtime copy refinements applied

### `src/slices/VendorEscalationSlice.jsx` — 7 edits
| Was | Now | Reason |
|---|---|---|
| `'No coverage · cocktail hour at risk'` | `'No contact · cocktail hour at risk'` | "no contact" is comm-line shorthand |
| `'45 min overdue · no ETA'` | `'45 min behind · no ETA'` | planners say "running behind" |
| `'Operations resumed'` (resolved note) | `'Back on timeline'` | "operations resumed" is tech-bro |
| `'Escalate to Supervisor'` | `'Escalate to lead'` | "lead" is what planners actually say |
| `'Open Vendor Actions'` | `'Vendor actions'` | drop "Open" verb prefix |
| `'Catering — no coverage'` / `'45 min overdue'` (alert title) | `'Catering — no contact'` / `'45 min behind'` | as above |
| `'Immediate action required · cocktail hour at risk'` | `'Cocktail hour at risk · contact venue now'` | drop "operational intervention" tone, lead with impact |
| `'Escalation resolved'` (alert title) | `'Stabilized'` | page-50 recovery language |
| `'All vendors nominal. Catering on schedule.'` | `'All vendors nominal · catering on schedule'` | middle-dot separator, no terminal punctuation |
| `'Contact Vendor'`, `'Reroute Timeline'`, `'Mark Resolved'` | lowercased | sentence case for non-emergency commands |

### `src/slices/DesktopDensitySlice.jsx` — 4 edits
| Was | Now | Reason |
|---|---|---|
| MESSAGE.delayed: `'${role} delay · 25 min behind schedule'` | `'${role} · 25 min behind'` | strip "delay" + "schedule" |
| MESSAGE.non_responsive: `'${role} non-responsive · 18 min, no contact'` | `'${role} · 18 min · no contact'` | tighter cadence; "non-responsive" still in role logic but not in subtitle |
| MESSAGE.emergency: `'${role} CRITICAL — direct action required now'` | `'${role} · direct action required now'` | EMERGENCY badge above already carries severity |
| ACTIONS.emergency.secondary: `'Activate backup'` | `'Move to backup'` | "activate" is dramatic; planners "move to backup" |
| `'All clear — no active escalations.'` | `'All clear · no active escalations · monitoring'` | per page-50 nominal vocab |
| `'Nothing else needs attention.'` | `'All other threads nominal · monitoring'` | factual, not friendly |

### `src/slices/DebriefSlice.jsx` — 7 edits
| Was | Now | Reason |
|---|---|---|
| `'Activate backup'` (synth click data) | `'Move to backup'` | consistency with density slice |
| `'Operational recovery took N from first deviation to all-clear.'` | `'Recovery took N from first deviation to all clear.'` | drop "operational" |
| `'Three concurrent escalations occurred during this event — cascade risk profile is elevated.'` | `'Three concurrent escalations during this event · risk elevated.'` | shorten; drop "cascade" doctrine term |
| `WHISPERS — operational memory` (section header) | `WHISPERS — prior patterns` | "operational memory" is design-doctrine speak |
| `'Decompression curve from peak severity back to nominal.'` | `'Time from peak severity back to nominal.'` | "decompression curve" is engineering metaphor |
| `'SYNTHESIZED — observer not active'` (status badge) | `'EXAMPLE — observer not active'` | "synthesized" is too engineered-sounding |
| `Hesitation per action — how long the operator looked before clicking. > 3000ms is worth investigating.` | `Hesitation per action · over 3 s is worth investigating.` | shorter, no narration |

### What was deliberately NOT changed
- Vendor names (`Catering`, `Floral Co.`, `Sound & AV`) — already real
- `CONTACT NOW`, `CONTACT VENUE NOW`, `Call lead directly`, `Check ETA`, `Notify next station`, `Reroute timeline`, `Mark resolved`, `Page backup`, `Escalate to venue` — already operator-real
- EMERGENCY / CRITICAL / ESCALATED badges — operational standard
- The `WHISPERS` label itself (only the descriptor changed)
- `Forensic, not analytical. No score, no grade, no AI recommendation. Memory exists to change the next decision.` — meta-footer, doctrine-correct
- All command-bar copy (compressed in Sprint 13)

### Internal doctrine terms scrubbed from runtime
- "Operational" (3 instances) — removed where it modified operator-visible nouns
- "Synthesized" — replaced with "Example"
- "Decompression curve" — replaced with "Time"
- "Cascade risk" — replaced with "risk"
- "Operational memory" — replaced with "prior patterns"
- "Activate" (as a CTA verb) — replaced with "Move to"
- "Operations resumed" — replaced with "Back on timeline"

### Internal doctrine terms still NOT in runtime (verified clean)
- ❌ containment
- ❌ procedural residue
- ❌ authority inheritance
- ❌ orchestration density
- ❌ environmental cognition
- ❌ runtime degradation
- ❌ suppression lattice
- ❌ command trench
- ❌ procedural unevenness

## Build status
✅ compiles, no new warnings, no console errors

## Reproduction
```bash
cd demo && npm start
# Vendor:
#   http://localhost:3000/?slice=vendor
#   http://localhost:3000/?slice=vendor&state=escalation
#   http://localhost:3000/?slice=vendor&state=emergency
# Desktop density:
#   http://localhost:3000/?slice=desktop-density
#   http://localhost:3000/?slice=desktop-density&state=cascade
#   http://localhost:3000/?slice=desktop-density&state=emergency
# Debrief:
#   http://localhost:3000/?slice=debrief
```

## Figma page 51 — what's now in place
8 sections, institutional/forensic aesthetic. No emojis, no sticky-note imagery, no sentiment charts. Sections:
- A. Session log (per-operator row template)
- B. Hesitation findings (delayed clicks, rereads, authority confusion, etc.)
- C. Language friction (verbatim quotes table)
- D. **False authenticity** (NEW · critical section · catches designer-pretending-to-be-operational)
- E. Trust signals (what felt real — easy to miss but high signal)
- F. Cognitive overload (where operators stopped processing)
- G. Procedural realism (believable / not believable behavior, with operator rationale)
- H. Actionable changes (every finding classified: runtime / doctrine / wording / orchestration / human-training / non-issue)

Page is awaiting real operator sessions. **No findings have been fabricated.**

## What is NOT validated by this sprint
- The new copy has not been read by a real planner yet. The page-50 doctrine is a hypothesis; sessions verify.
- The page 51 template has not been used in a real session yet. Field structure is provisional until first use.
- No motion change — Sprint 18A is text-only.

## Honest read
This sprint moves three slices from "design fiction" toward "operator-authentic" based on page-50 doctrine. The next step is real sessions. Until then, every change is a hypothesis. None of this is validated.
