# UX_02 — Color Semantics and Restraint

Color in NGW Event Planner is a communication system, not decoration. Every color usage must answer: "What operational state does this communicate?"

If the answer is "nothing — it just looks nice," remove the color.

## Color Budget Per View

### Rule: Maximum 3 semantic colors visible in any single viewport

A viewport (what the user sees without scrolling) may show at most 3 distinct semantic colors beyond the base palette (bg, card, fg, muted, border, accent).

If a screenshot shows red AND amber AND green AND blue AND purple, the signal-to-noise ratio is destroyed. The user can't tell what's urgent because everything is colorful.

### Exception: Event type colors (`evtCLR`)

Event type color dots/pills are identification, not urgency. They are always used at low opacity (10-15% background, full color text or dot) and do not count against the 3-color signal budget.

## Semantic Color Map

| Color | Token Pattern | Meaning | Usage |
|---|---|---|---|
| Steel blue | `C.accent` | Structure, navigation, selected state, interactive | Active tabs, selected rows, primary buttons, links |
| Amber / warm | `C.warn` or `#F5A623`-range | Needs attention, upcoming deadline, incomplete | Attention badges, warning chips, approaching-deadline text |
| Red / critical | `C.crit` or `#E53E3E`-range | At risk, overdue, blocking, critical issue | Risk indicators, overdue labels, failure states |
| Green / safe | `C.safe` or `#38A169`-range | Complete, on track, confirmed, safe | Completion checks, on-track status, booked confirmation |
| Muted gray | `C.muted` | Inactive, archived, not-yet-relevant, metadata | Secondary text, disabled controls, informational labels |

### Rule: No other semantic colors

No purple. No teal. No pink. No orange distinct from amber. No cyan. The semantic vocabulary is: accent, warn, crit, safe, muted. That's it.

If you need a 6th color, you're overloading the view. Split the information across surfaces instead.

## Status Color Rules

### Three-State Model

Most status surfaces use exactly 3 states:

| State | Color | Label Options |
|---|---|---|
| ON_TRACK | Green (`C.safe`) | On Track, Confirmed, Complete, Safe, Booked |
| ATTENTION | Amber (`C.warn`) | Needs Attention, Approaching, Incomplete, Waiting |
| AT_RISK | Red (`C.crit`) | At Risk, Overdue, Blocking, Critical, Missing |

### Rule: Never invent a 4th status color

If a status doesn't fit ON_TRACK / ATTENTION / AT_RISK, it belongs in one of those three or it's informational (muted). There is no "kinda risky" blue or "sort of fine" teal.

### Rule: Status color requires status justification

Never color something red/amber/green without displaying WHY it has that status. A red dot next to "Catering" with no explanation is anxiety-producing noise. Show the reason: "Final count not confirmed — 8 days until event."

## Chip and Pill Color Rules

### Status Chips

- Background: status color at 12-15% opacity
- Text: status color at full or near-full intensity
- Border: none (the tinted background IS the container)
- Border-radius: pill (12-16px)

```
// Correct status chip
background: rgba(229, 62, 62, 0.12),
color: '#E53E3E',
```

### Identification Chips (Event Type, Category)

- Background: type color at 10-12% opacity
- Text: type color at 80-100% intensity
- These identify WHAT something is, not its urgency

### Rule: Maximum 3 chips per row

If a list row has 4+ chips, it becomes unreadable chip soup. Prioritize: show the 1-2 most important status signals, push the rest to detail view.

### Rule: No gray-on-gray chips

If a chip has gray background and gray text, it's invisible. Either make it muted text (no chip container) or give it purpose.

## Event Type Color Map (`evtCLR`)

| Event Type | Color Token | Usage |
|---|---|---|
| Wedding | `C.accent` (steel blue) | Type dot, type pill bg |
| Birthday | `C.warn` (amber) | Type dot, type pill bg |
| Corporate | `C.fg` (neutral) | Type dot, type pill bg |
| Sweet 16 | `#E882D5` (pink) | Type dot, type pill bg |
| Bar/Bat Mitzvah | `#6C63FF` (indigo) | Type dot, type pill bg |
| Default / Other | `C.muted` | Type dot, type pill bg |

### Rule: Event type colors at LOW intensity only

Event type colors appear as:
- Small dots (6-8px circles) at full color
- Pill backgrounds at 10-12% opacity
- Text at 80-100% of type color

They never appear as full-saturation backgrounds or large color blocks. They are identification, not decoration.

## Accent Color Rules

### Rule: Accent highlights exactly one thing per view section

In any section (card, panel, zone), accent color (`C.accent`) should highlight at most ONE element — the primary interactive target. If three buttons are accent-colored, none of them are primary.

### Rule: Accent is reserved for interactive elements

Accent on a non-interactive element is misleading. If it's accent-colored, the user expects to click/tap it.

Correct uses: primary button, active tab, selected row, link text.
Incorrect uses: decorative line, section header underline, card border (unless selected).

## Dark Mode Opacity Rules

### Rule: Use opacity to create depth, not more colors

- Overlay / modal scrim: `rgba(0,0,0,0.6)`
- Disabled elements: 40% opacity on the element
- Hover feedback: `rgba(255,255,255,0.04)` overlay
- Active press: `rgba(255,255,255,0.08)` overlay
- Dividers: `C.border` at 50-70% opacity

### Rule: Never use pure white text

Maximum text brightness: `C.fg` (which should be ~90-95% white, e.g., `#E8E8E8` or `#F0F0F0`). Pure `#FFFFFF` text is too harsh on dark surfaces. Exception: stat numbers may use slightly brighter text for punch.

## Color Accessibility

### Rule: Minimum 4.5:1 contrast ratio for all text

- Body text on card surface: must meet WCAG AA (4.5:1)
- Caption/label text on card surface: must meet WCAG AA
- Status-colored text on tinted chip backgrounds: verify contrast. Red on 12%-red-bg works. Amber on 12%-amber-bg may be marginal — test.

### Rule: Never communicate state by color alone

Every colored status must also have a text label. A green dot by itself means nothing to a colorblind user. "On Track" with a green dot communicates to everyone.

## Color Review Checklist

Before shipping any surface, verify:

1. No more than 3 semantic colors visible in the viewport (excluding event-type identification)
2. Every colored element communicates an operational state
3. No decorative color usage
4. Status colors have accompanying text explanation
5. Accent color marks exactly one primary target per section
6. Chip count per row is 3 or fewer
7. Contrast ratios meet WCAG AA minimums
8. No pure white text or backgrounds
