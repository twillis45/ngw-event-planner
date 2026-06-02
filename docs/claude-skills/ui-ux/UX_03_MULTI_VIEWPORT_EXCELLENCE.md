# UX_03 — Multi-Viewport Excellence

NGW Event Planner serves planners on phones during vendor walkthoughs, tablets during client meetings, and desktops during deep planning sessions. Every surface must work at every breakpoint — not "kinda work," not "technically scrollable," but actually good.

## Breakpoint System

| Breakpoint | Token | Range | Device Context |
|---|---|---|---|
| mobile | `bp === 'mobile'` | < 640px | iPhone 14/15/16, Galaxy S, one-handed use |
| tablet | `bp === 'tablet'` | 640-1023px | iPad portrait, small tablets |
| tablet-land | `bp === 'tablet-land'` | 1024-1279px | iPad landscape, small laptops |
| desktop | `bp === 'desktop'` | >= 1280px | Laptops, monitors, production stations |

### Derived Flags

```
isMob  = bp === 'mobile'
isWide = bp === 'desktop' || bp === 'tablet-land'
```

`isWide` = sidebar is visible. `!isWide` = hamburger navigation.

## Per-Breakpoint Layout Rules

### Mobile (< 640px)

**The planner is standing up, possibly at a venue, possibly in bad lighting.**

Rules:
1. Single column. Always. No exceptions.
2. Touch targets minimum 44px tall.
3. No hover-dependent interactions.
4. Primary CTA visible without scrolling (above the fold).
5. No information-dense tables. Use stacked card layouts.
6. Horizontal scroll only for image carousels or explicitly designed swipe lanes (with scroll-snap).
7. No side-by-side stat cards — stack vertically or use a 2-column mini grid.
8. Cards: full-width minus page padding.
9. Page padding: 12-16px.
10. No floating action buttons overlapping content.

**Mobile test: Can the planner tap the primary action with one thumb while holding the phone in the other hand?**

### Tablet Portrait (640-1023px)

**The planner is in a client meeting, showing the screen.**

Rules:
1. Two-column grid allowed for stat cards and compact items.
2. Three-column grid allowed only for small, equal-weight elements (stat cards).
3. List rows can show more metadata inline (date + type + status on one row).
4. Cards may be arranged in 2-column grids if content is short.
5. Priority/attention lanes: horizontal scroll with scroll-snap (not 3-col grid that clips).
6. Sidebar is hidden — hamburger menu.
7. Page padding: 16-20px.
8. Touch targets still 44px minimum.

**Tablet test: Does it look polished enough to show a client? Or does it look like a squished desktop?**

### Tablet Landscape / Small Laptop (1024-1279px)

**Transition zone. Sidebar becomes visible.**

Rules:
1. Sidebar visible — content area is narrower than full desktop.
2. Content must not assume full 1440px width.
3. Three-column stat grids work. Four columns may be tight — test before shipping.
4. List rows can add one more metadata column vs. tablet.
5. Priority lanes: 2-3 column grid or horizontal scroll depending on card count.
6. No right-rail preview panel unless there's enough room (test at 1024px with sidebar).
7. Page padding: 20px.

**Tablet-land test: With the sidebar open, does the content area still breathe? Or is it cramped?**

### Desktop (>= 1280px)

**The planner is in deep work mode at their desk.**

Rules:
1. Use the full width productively — grids, columns, right-rail previews, side-by-side panels.
2. List + detail (master-detail) pattern is ideal for desktop.
3. Four-column stat grids work.
4. Right-rail preview panels appear on click/selection.
5. Information density increases — more metadata per row, more rows visible.
6. Dense but not cluttered. More data, same hierarchy discipline.
7. Page padding: 20-24px.
8. Stat card grids: 3-4 across.
9. Priority/attention lanes: 3 cards in a grid (not scroll).
10. Event list: grid-based rows with type | name | date | status | action columns.

**Desktop test: Does it feel like a production control board? Or a mobile app stretched wide?**

## Responsive Pattern Library

### Pattern: Stat Card Row

```
Mobile:     1-col stack, or 2-col mini grid
Tablet:     2-col grid
Tablet-L:   3-col grid
Desktop:    3-4 col grid
```

Rule: Stat cards must never stretch wider than 300px. If they're stretching, add more columns or constrain max-width.

### Pattern: Priority / Attention Lane

```
Mobile:     vertical stack (2-3 cards max)
Tablet:     horizontal scroll with scroll-snap, min-width per card 260-280px
Tablet-L:   2-3 col grid
Desktop:    3 col grid
```

Rule: Priority lanes never show more than 3 items on desktop. If there are more, the 4th+ items belong in the main list with priority markers, not in the lane.

### Pattern: Event / Vendor / Client List

```
Mobile:     stacked cards (name, date, key status on each card)
Tablet:     denser card rows (inline metadata)
Tablet-L:   table-like grid rows (type | name | date | status | action)
Desktop:    table-like grid rows + optional right-rail preview on select
```

Rule: List rows do NOT become actual `<table>` elements. Use CSS grid or flexbox that degrades gracefully.

### Pattern: Master-Detail (Desktop Only)

```
Mobile:     full-screen list → tap → full-screen detail
Tablet:     full-screen list → tap → full-screen detail
Desktop:    split view — list (60-70%) + sticky detail panel (30-40%)
```

Rule: The detail panel is an enhancement, not a gate. All functionality available via the detail panel must also be accessible by navigating to the full detail view.

### Pattern: Form Layouts

```
Mobile:     single column, full-width inputs
Tablet:     two-column for short fields (date + time side by side)
Desktop:    two or three column for short fields
```

Rule: Labels above inputs always. No inline/left-aligned labels — they break on mobile and create alignment nightmares.

## Overflow Rules

### Rule: No horizontal page-level scroll. Ever.

If the page scrolls horizontally at any breakpoint, that is a critical bug. Fix it before shipping.

Allowed horizontal scroll: explicitly designed scroll lanes (priority cards, image carousels) inside a container, with `overflow-x: auto` and `scroll-snap-type: x mandatory`.

### Rule: Cards must not clip at viewport edges

Every card must fit within `100vw - (2 * page-padding)`. If a card is wider than that, it clips. Test at 375px (iPhone SE) — the narrowest device that matters.

### Rule: Text truncation over wrapping for list rows

In list rows, long event names or vendor names should truncate with ellipsis, not wrap to a second line. The row height stays consistent. Detail view shows the full name.

```
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

## Testing Protocol

Before shipping any surface, verify at these exact sizes:

1. **375 x 812** — iPhone SE / narrow phone (catches clipping)
2. **390 x 844** — iPhone 14 / standard phone
3. **430 x 932** — iPhone 15 Pro Max / large phone
4. **768 x 1024** — iPad portrait / standard tablet
5. **1024 x 768** — iPad landscape / small laptop
6. **1280 x 800** — minimum desktop
7. **1440 x 900** — standard desktop
8. **1920 x 1080** — large desktop (catches stretched layouts)

At each viewport, check:
- No horizontal overflow
- Primary action visible above fold
- Text is readable (not clipped, not overflowing)
- Touch targets adequate on mobile/tablet
- Layout uses available space productively (not stretched, not cramped)

## The "Squished or Stretched" Test

At every breakpoint, ask:
- **Does it look squished?** Content fighting for space, text wrapping badly, chips stacking where they shouldn't. Fix: reduce information density for this breakpoint.
- **Does it look stretched?** Cards spanning 100% width with acres of empty space, stat numbers floating in giant boxes, list rows with huge gaps. Fix: add columns, constrain max-width, increase density.

If either answer is yes, the responsive design isn't done. It's just hidden.
