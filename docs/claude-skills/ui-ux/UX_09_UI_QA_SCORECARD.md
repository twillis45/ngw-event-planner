# UX_09 — UI QA Scorecard

The final gate before any surface ships. Every surface, component, and layout change must pass this scorecard. Not "mostly passes" — passes. A single FAIL blocks shipping until fixed.

## How to Use This Scorecard

After building or modifying any surface:

1. Run through each section below.
2. Mark each check as PASS, FAIL, or N/A.
3. If any check is FAIL, fix it before reporting the task as complete.
4. Include the scorecard results in the final task report.

## Section 1: Visual Language (UX_01)

| # | Check | PASS/FAIL |
|---|---|---|
| 1.1 | Maximum 3 surface layers visible (bg, card, elevated) | |
| 1.2 | No white or light backgrounds anywhere | |
| 1.3 | Typography uses scale from UX_01 (no rogue sizes) | |
| 1.4 | Page title appears exactly once | |
| 1.5 | All spacing multiples of 4px | |
| 1.6 | No shadows on non-overlay elements | |
| 1.7 | Border-radius consistent within the view | |
| 1.8 | No font-size below 10px | |
| 1.9 | Desktop layout feels dense and productive, not stretched | |
| 1.10 | The 5-second test: purpose, primary action, premium feel | |

## Section 2: Color (UX_02)

| # | Check | PASS/FAIL |
|---|---|---|
| 2.1 | Maximum 3 semantic colors per viewport (excluding event-type) | |
| 2.2 | Every colored element communicates operational state | |
| 2.3 | No decorative color usage | |
| 2.4 | Status colors have text explanation (not color alone) | |
| 2.5 | Accent highlights exactly one primary target per section | |
| 2.6 | Maximum 3 chips per list row | |
| 2.7 | Event type colors at low intensity (dots and tinted pills only) | |
| 2.8 | WCAG AA contrast ratios met for all text | |
| 2.9 | No pure white (#FFFFFF) text | |

## Section 3: Responsive (UX_03)

| # | Check | PASS/FAIL |
|---|---|---|
| 3.1 | No horizontal page-level scroll at any breakpoint | |
| 3.2 | Cards don't clip at viewport edges (test at 375px) | |
| 3.3 | Mobile: single column layout | |
| 3.4 | Mobile: touch targets minimum 44px | |
| 3.5 | Mobile: primary CTA visible above fold | |
| 3.6 | Mobile: no hover-dependent interactions | |
| 3.7 | Tablet: layout uses space (not squished mobile, not stretched desktop) | |
| 3.8 | Tablet: horizontal scroll lanes use scroll-snap | |
| 3.9 | Desktop: information density appropriate (not sparse) | |
| 3.10 | Desktop: master-detail or right-rail used where applicable | |
| 3.11 | Breakpoint transitions are smooth (no content jumps between 639px and 641px) | |

### Required Viewport Tests

Verify at these exact dimensions (or report which were tested):

- [ ] 375 x 812 (iPhone SE)
- [ ] 390 x 844 (iPhone 14)
- [ ] 430 x 932 (iPhone 15 Pro Max)
- [ ] 768 x 1024 (iPad portrait)
- [ ] 1024 x 768 (iPad landscape)
- [ ] 1280 x 800 (minimum desktop)
- [ ] 1440 x 900 (standard desktop)
- [ ] 1920 x 1080 (large desktop)

## Section 4: Hierarchy (UX_04)

| # | Check | PASS/FAIL |
|---|---|---|
| 4.1 | Zone order is correct: Header → Priority → Main → Detail | |
| 4.2 | Exactly one dominant visual element per view | |
| 4.3 | Not all cards are equal weight (priority > regular) | |
| 4.4 | Every piece of content inside a container (no orphaned text/data) | |
| 4.5 | Empty states are designed (message + optional CTA), not blank | |
| 4.6 | No double headers (page wrapper + zone header showing same info) | |
| 4.7 | Priority lane shows max 3 items | |
| 4.8 | Filter chips visible without scrolling on desktop | |

## Section 5: Components (UX_05)

| # | Check | PASS/FAIL |
|---|---|---|
| 5.1 | Maximum one primary button per view section | |
| 5.2 | Button labels are verbs, not nouns | |
| 5.3 | All icon-only buttons have aria-label | |
| 5.4 | Disabled buttons show 40% opacity + not-allowed cursor | |
| 5.5 | List row heights are consistent (no variable-height rows) | |
| 5.6 | Form labels above inputs (never inline/left-aligned) | |
| 5.7 | Modals for decisions, drawers for detail (not mixed) | |
| 5.8 | Loading states use skeleton shapes, not spinners | |
| 5.9 | Status chips are non-interactive (display only) | |

## Section 6: Language (UX_06)

| # | Check | PASS/FAIL |
|---|---|---|
| 6.1 | No status labels that say only "Pending" | |
| 6.2 | Every status explains WHY (consequence, not just state) | |
| 6.3 | CTAs use specific verbs | |
| 6.4 | Destructive CTAs name what's being destroyed | |
| 6.5 | Empty states explain what goes here and how to start | |
| 6.6 | Errors say what happened and what to do | |
| 6.7 | Tone is calm/professional (no excited, no robotic) | |
| 6.8 | No greeting text in section headers | |
| 6.9 | Time-relative language is correct (today/tomorrow/Xd) | |

## Section 7: CTA Truthfulness (UX_07)

| # | Check | PASS/FAIL |
|---|---|---|
| 7.1 | Every CTA classified against truthfulness taxonomy | |
| 7.2 | Labels match classification (RECORD-ONLY says "Mark", etc.) | |
| 7.3 | Only DONE/DEEP HANDOFF actions get primary button styling | |
| 7.4 | PLANNED features have NO buttons | |
| 7.5 | STUB features show "(preview)" label | |
| 7.6 | Honest fallbacks degrade gracefully by capability | |
| 7.7 | No "Send" labels when the action is "Copy" or "Record" | |

## Section 8: Data Honesty (UX_08)

| # | Check | PASS/FAIL |
|---|---|---|
| 8.1 | Every displayed number traceable to user data or documented computation | |
| 8.2 | Missing data shows "Not added yet" (not blank, not "-") | |
| 8.3 | Estimates labeled with "est." | |
| 8.4 | AI content labeled and requires user action | |
| 8.5 | Readiness states cite specific evidence | |
| 8.6 | No readiness percentages | |
| 8.7 | Save state reflects actual persistence layer | |
| 8.8 | No fabricated values for visual completeness | |

## Severity Classification

When a check fails, classify the severity:

### P0 — Blocks shipping

- Data dishonesty (fake numbers, misleading status)
- CTA lies (button says "Send" but doesn't send)
- Horizontal scroll on any breakpoint
- Primary action invisible or inaccessible
- Accessibility failure (no keyboard path, no aria-label on interactive elements)

### P1 — Fix before next deploy

- Color violation (decorative color, too many semantic colors)
- Layout issue at a specific breakpoint (cards clip, rows overflow)
- Language violation (vague status, missing consequence)
- Empty state is blank instead of helpful
- Component pattern deviation (wrong button style for classification)

### P2 — Fix in next sprint

- Spacing off-grid (7px instead of 8px)
- Minor typography inconsistency
- Desktop density could be improved
- Transition/animation deviation

## Final Report Template

Include this in every task completion report:

```
## UI QA Scorecard

### Checks Passed: XX/XX
### Checks Failed: XX (list failures)
### Checks N/A: XX

### P0 Issues: (none / list)
### P1 Issues: (none / list)
### P2 Issues: (none / list)

### Viewports Tested: (list dimensions tested)
### Build Status: (passes / fails)
```

## The "Would I Show This to a Client?" Test

The final meta-check: if a planner showed this screen to a client during a meeting, would the planner feel confident in the app? Would the client think the planner uses professional tools?

If the answer is "kinda" or "with some explanation" — the surface isn't done. Professional tools don't need explanation. They communicate competence on sight.
