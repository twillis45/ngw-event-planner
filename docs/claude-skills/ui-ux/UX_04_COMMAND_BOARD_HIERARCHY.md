# UX_04 — Command Board Hierarchy and Layout Zones

Every major surface in NGW Event Planner is a command board, not a dashboard. The difference: a dashboard shows data. A command board answers "what should I do next?" and routes the planner to the right work.

## Zone Architecture

Every command-level surface (Home, Events, Event Command, Vendor Detail) follows the same zone pattern. Not every surface has all zones, but they always appear in this order.

### Zone 1: Command Header

**What it is:** Title, subtitle, and summary stats.

**Rules:**
- Title on the left, stat cards on the right (desktop) or below (mobile).
- Title is the page-level heading (20-24px, 700 weight). Appears exactly once.
- Subtitle is a one-line contextual sentence (13px, 400 weight, `C.muted`).
- Stat cards: 3-4 maximum. Each shows one number + one label. No decorative icons in stat cards.
- Stat cards answer: "What is the shape of my world right now?"
- On mobile, stat cards become a 2-column mini grid below the title.

**Stat Card Rules:**
| What | Size | Weight |
|---|---|---|
| Number | 22-28px | 700 |
| Label | 10-11px | 500, uppercase, tracked |
| Card padding | 12-16px | — |
| Card background | `C.card` | — |

Rule: Stat card numbers must be computed from real data. No placeholder numbers. No fake "95% readiness." If the data doesn't exist to compute the stat, don't show the stat card.

### The display-ask clause (board, 2026-08-07)

"Title on the left, stat cards on the right" was written for **Events (L2)** and **Vendor Detail (L4)**, where the title is a 20–24px text label with room beside it. It does not describe **Event Command (L3)**, where the top element is a display-type ask — "Decide the menu." at 60px — which is Zone 1's title and Zone 2's priority ask *in the same element*. Stat figures placed beside it become a tall narrow column that cannot fill: measured at 288×246 of content in a 288×640 column, 61% empty, in one unbroken band.

- **A vertical stat column is legal only when it carries at least three blocks, one of which is a list or a named set.** Stat figures may never occupy a column they cannot fill.
- When the title is a display ask and no third block exists, the figures run as a **horizontal ledger row spanning the content width, placed below the ask and above Zone 3.** Never above the ask — that puts the inventory in front of the decision and demotes the one loud thing to second.
- **The figures may render as hairline rows rather than cards.** The Stat Card Rules table above is a maximum, not a requirement.
- **A Zone 1 figure may not restate a fact already stated elsewhere in the visible viewport.** If the countdown is in the eyebrow, it is not also a tile; if the fraction is in the progress rule, it is not also a tile. Manufacturing a third and fourth figure by looting other elements was rejected 7–0 — the only unanimous verdict in that sitting.

### Zone 2: Priority Lane ("Start Here")

**What it is:** The 1-3 items that need attention RIGHT NOW.

**Rules:**
- Label: "START HERE" or equivalent attention-routing header.
- Maximum 3 items. If more than 3 need attention, the top 3 are in the lane and the rest are in the main list with attention markers.
- Each priority card must show: item name, WHY it needs attention, countdown/urgency, primary CTA.
- Cards are equal-weight within the lane (same size, same structure).
- Desktop: 3-column grid.
- Tablet: horizontal scroll with scroll-snap, min-width 260-280px per card.
- Mobile: vertical stack.
- Priority lane has a distinct visual treatment from the main list: slightly different card style, accent border-left or subtle background tint.

**When to omit Zone 2:**
- When nothing needs attention (show nothing, or a single "All clear" card).
- On surfaces where priority routing doesn't apply (settings, setup).

### Zone 3: Main Content / Working List

**What it is:** The searchable, filterable, sortable list of items.

**Rules:**
- Filter chips at the top: horizontal row, scroll on mobile if needed.
- Active filter chip: accent background. Inactive: muted/transparent.
- Search bar above or inline with filters.
- List rows: consistent height, consistent grid columns.
- Each row has a clear left-to-right reading order: identity → metadata → status → action.
- On desktop, rows use CSS grid with fixed column widths. On mobile, rows stack key info.
- Selection state: subtle background highlight + left accent border.
- Click/tap navigates to detail. No double-click requirement on mobile.

**List Row Anatomy (Desktop):**

```
[Type dot] [Name ............] [Date/countdown] [Status chip] [Chevron/action]
```

- Type dot: 8px circle, `evtCLR` color.
- Name: 14px, 600 weight, `C.fg`. Truncate with ellipsis.
- Date/countdown: 12-13px, 400 weight, `C.muted`.
- Status chip: 10-11px uppercase, tinted background.
- Chevron: 14px, `C.muted`. Desktop may omit if right-rail preview exists.

**List Row Anatomy (Mobile):**

```
[Type dot] [Name]
           [Date · Type · Status chip]
```

Two lines per row. First line: name (primary). Second line: metadata (secondary).

### Zone 4: Context Panel / Right Rail (Desktop Only)

**What it is:** A sticky preview panel that shows detail for the currently selected list item.

**Rules:**
- Only appears on desktop (`isWide` and sufficient width).
- Sticky: `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`.
- Width: 30-40% of the content area (not the full page — the content area minus sidebar).
- Shows: identity, key stats, readiness summary, next action, primary CTA.
- Updates instantly on selection change. No loading spinner for local data.
- Includes a "View Full Detail" link/button to navigate to the full detail view.
- Has a close/dismiss mechanism (X button or click-away).

**When to omit Zone 4:**
- Mobile and tablet: always omit. Tap goes to full detail.
- Desktop: omit on surfaces where items don't have meaningful preview content (settings, setup).

## Zone Ordering Is Non-Negotiable

The zones always appear in this order, top to bottom:

```
Zone 1: Command Header
Zone 2: Priority Lane (if applicable)
Zone 3: Main Content
Zone 4: Right Rail (desktop only, beside Zone 3)
```

Never put the priority lane below the main list. Never put stats below the filter bar. The order is designed for top-down triage: "What's the shape?" → "What's urgent?" → "What's everything?" → "Tell me more about this one."

## Surface-Specific Zone Mapping

### Home (L1)

| Zone | Content |
|---|---|
| 1 | "Today's Command" + studio-level stats (events, attention, upcoming) |
| 2 | Studio command: the single most important action across all events |
| 3 | Quick actions, upcoming events, schedule preview |
| 4 | Not applicable |

### Events (L2)

| Zone | Content |
|---|---|
| 1 | "Event Portfolio" + portfolio stats (total events, attention count, upcoming, portfolio value) |
| 2 | "Start Here" lane: top 1-3 events by attention count |
| 3 | Filterable event list with type/status/date columns |
| 4 | Selected event preview panel (desktop) |

### Event Command (L3)

| Zone | Content |
|---|---|
| 1 | Event name + date + countdown + readiness summary |
| 2 | Next best action card |
| 3 | Specialist tab grid / attention items |
| 4 | Not applicable (tabs handle detail) |

### Vendor Detail (L4)

| Zone | Content |
|---|---|
| 1 | Vendor name + category + readiness + lifecycle stage |
| 2 | Next action + why it matters |
| 3 | Phase sections (Planning / Day-Of / Closeout) |
| 4 | Not applicable |

## Hierarchy Enforcement Rules

### Rule: Every view has exactly one dominant element

The dominant element is the thing the eye goes to first. It should be Zone 2 (priority/action) if present, or Zone 1's title/stat if Zone 2 is absent.

If everything is the same size and weight, nothing is dominant. Fix it.

### Rule: Cards are not all equal

In any surface showing multiple cards, at least one card must be visually larger, more prominent, or differently styled than the others. Equal-weight card grids communicate "these are all the same importance" — which is almost never true.

Priority cards > regular list rows. Active/selected > inactive. Attention > on-track.

### Rule: No orphaned content

Every piece of visible data must live inside a container (card, panel, section). No floating text, no bare stat numbers outside cards, no raw data at page level.

### Rule: Empty states are designed, not afterthoughts

When a zone has no data (no events, no attention items, no upcoming deadlines):
- Show a message that explains the empty state: "No events yet — create your first event to get started."
- Don't show the zone header with nothing underneath.
- Don't show a blank white/dark rectangle.
- The empty state should feel intentional, not broken.

## Anti-Patterns (Never Do These)

1. **Equal-weight card wall**: 6 cards, all same size, no hierarchy. User doesn't know where to start.
2. **Stats without context**: "42" with no label. "87%" with no explanation of what's measured.
3. **Scroll-to-find-action**: Primary CTA is below the fold. User scrolls twice before finding what to do.
4. **Filter-heavy, content-light**: Elaborate filter system with 8 options, but only 3 items to filter.
5. **Double header**: Zone 1 has a title, and the page wrapper also has a title. Two titles = broken hierarchy.
6. **Ghost zone**: Zone 2 header says "Start Here" but there are no priority items. Remove the zone, don't show an empty container.

7. **Abandoned canvas** (board, 2026-08-07): any contiguous region 200px tall or 320px wide carrying no content, at tablet-land or above. If a zone has nothing to say, the zones below and beside it move up and out to close the region. **Empty space is not a layout element.**

   Anti-patterns 1–6 are all about too MUCH content or mis-ordered content. Not one was about too little — and the defining property of every leader console (Railway, ClickUp, Asana, Airtable, Plane) is that every horizontal band carries something.

8. **Phone disclosure at a desk** (board, 2026-08-07): a progressive-disclosure affordance — a fold handle, a `▸` expander, a `…` truncation, an "and more" tail — may not hide content **at any viewport where the hidden content would fit in visible void.** Truncation and folding are density tools; using them beside empty canvas is a phone habit, not restraint. At desktop and wide, disclosures whose content fits open by default.

   Found live: five of them at once — `Other ways ▸`, `Speeches run long — and more…`, `Too few chairs — and more…`, `0 of 5 confirmed gue…` (cut mid-word), and a fold handle — all beside ~400px of empty column. Every one was correct at 390px and none had been given a desktop clause.

**No density floor is adopted.** It was proposed and rejected 2–1–1: a floor stated in ROWS is a quota, and a quota is an instruction to manufacture content — the same thing anti-pattern 1 forbids. The enforceable form, which the board did adopt: *at desktop, Zone 3 renders every already-computed list its engines produce, or the surface records why it does not.* Our failure was never row count; it was `display:none !important` over a block the engines had already built. And per the workflow seat: **every row rendered in Zone 3 at desktop must be reachable from the row above it by keyboard** — density without traversal is wallpaper.
