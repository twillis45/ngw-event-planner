# UX_05 — Component Patterns and Interaction Rules

Standard component patterns for NGW Event Planner. When building or modifying any interactive element, follow the pattern specified here. Do not invent new patterns.

## Buttons

### Primary Button

- Background: `C.accent`
- Text: white, 13-14px, 600 weight
- Padding: 8-12px vertical, 16-24px horizontal
- Border-radius: 6-8px
- Hover: lighten 10%
- Active: darken 5%
- Rule: Maximum ONE primary button per view section. If you have two primary buttons, one of them should be secondary.

### Secondary Button

- Background: transparent or `rgba(255,255,255,0.06)`
- Text: `C.fg`, 13-14px, 500 weight
- Border: `1px solid ${C.border}`
- Hover: background to `rgba(255,255,255,0.1)`
- Use for: cancel, dismiss, alternative actions.

### Ghost Button

- Background: transparent
- Text: `C.accent` or `C.muted`, 12-13px, 500 weight
- Border: none
- Hover: underline or subtle background
- Use for: "View all", "Show more", tertiary navigation links.

### Destructive Button

- Background: `C.crit` at 15% opacity
- Text: `C.crit`
- Hover: background to 25% opacity
- Use for: delete, remove, cancel event. Never as primary style — always requires confirmation.

### Icon Button

- Size: 32-36px square touch target
- Icon: 16-18px
- Background: transparent
- Hover: `rgba(255,255,255,0.08)` circle
- Must have `aria-label`
- Never use icon-only without aria-label. Screen readers and confused users need it.

### Button States

| State | Treatment |
|---|---|
| Default | Standard colors as above |
| Hover | Lighten/darken background by 10% |
| Active / Pressed | Darken background by 5%, scale(0.98) optional |
| Disabled | 40% opacity, `cursor: not-allowed`, no hover effect |
| Loading | Text replaced with 14px spinner, button width stays fixed |

### Rule: Buttons have verbs, not nouns

- Good: "Create Event", "Send Message", "Confirm Vendor"
- Bad: "Event", "Message", "Vendor"
- Exception: "OK", "Cancel", "Done" — universal actions.

## Chips and Pills

### Filter Chip

- Inactive: `rgba(255,255,255,0.06)` bg, `C.muted` text, 11-12px
- Active: `C.accent` at 15% bg, `C.accent` text
- Padding: 4-6px vertical, 10-14px horizontal
- Border-radius: 14-16px (pill)
- Tap area: minimum 32px height
- Use for: view filters (All, Upcoming, Past), category filters, type filters.

### Status Chip

- Background: status color at 12-15% opacity
- Text: status color at full intensity, 10-11px, 500 weight, uppercase
- Padding: 2-4px vertical, 8-10px horizontal
- Border-radius: 12px (pill)
- Never interactive — display only. Clicking a status chip does nothing.

### Count Badge

- Background: `C.crit` or `C.warn` at full intensity
- Text: white, 10px, 700 weight
- Size: 18-22px circle or pill (for 2+ digits)
- Position: top-right of parent element, offset by -4px
- Only show when count > 0. Hide the badge when count is 0, don't show "0".

## Cards

### Standard Card

```
border-radius: 10px;
background: C.card;
border: 1px solid C.border;
padding: 14-16px;
```

- No shadow (see UX_01 shadow rules).
- Content hierarchy: title → subtitle → body → action.
- Maximum content: title + 2-3 metadata lines + 1 CTA. If more content is needed, link to detail view.

### Priority / Attention Card

Same as standard card, plus:
- Left border: `3px solid C.warn` or `C.crit` (color matches urgency)
- Or: subtle background tint: card bg + 2-3% status color

Use for: priority lane cards, attention items, next-action cards.

### Stat Card

```
border-radius: 8-10px;
background: C.card;
padding: 12-16px;
text-align: left; (not center)
```

Content:
- Number: 22-28px, 700 weight, `C.fg`
- Label: 10-11px, 500 weight, uppercase, `C.muted`
- Optional: sub-label or trend indicator below number

Rule: Stat numbers are LEFT aligned, not centered. Left-alignment creates a stronger visual column when multiple stat cards are side by side.

### Selectable Card / Row

Default state:
- Standard card or row styling

Selected state:
- Background: `rgba(accent, 0.08)` or `C.accent` at 8% opacity
- Left border: `2px solid C.accent`
- Subtle scale: none (no transform on selection)

Rule: Selection state is additive (background tint + border), not replacement (don't swap the entire card style).

## Lists and Rows

### List Row (Desktop)

```
display: grid;
grid-template-columns: [type] [name] [date] [status] [action];
align-items: center;
padding: 10-12px 16px;
border-bottom: 1px solid rgba(C.border, 0.5);
cursor: pointer;
```

Hover: `rgba(255,255,255,0.03)` background.
Selected: `rgba(C.accent, 0.08)` background + `2px solid C.accent` left border.

### List Row (Mobile)

```
display: flex;
flex-direction: column;
padding: 12-14px 12-16px;
border-bottom: 1px solid rgba(C.border, 0.5);
gap: 4px;
```

First line: name (primary text).
Second line: metadata row (date + type + status, smaller text).

### Rule: Row height consistency

All rows in a list must be the same height. Variable-height rows create a ragged, unprofessional layout. If content varies in length, truncate — don't expand.

Exception: expanded/detail rows in an accordion pattern (explicitly toggled).

## Modals and Drawers

### Modal

- Scrim: `rgba(0,0,0,0.6)`
- Panel: `C.card` background, 10-12px radius, max-width 640px
- Shadow: `0 8px 32px rgba(0,0,0,0.5)`
- Padding: 20-24px
- Header: title (17px, 600) + close button (X)
- Footer: action buttons right-aligned, primary on right
- Mobile: modal becomes near-full-screen (width: 100%, max-height: 90vh)

### Drawer

- Slides from right on desktop, from bottom on mobile
- Width: 400-480px desktop, 100% mobile
- Same surface treatment as modal panel
- Has a visible close mechanism (X button + click-outside on desktop)

### Rule: Modals for decisions, drawers for detail

Use modal for: confirmation dialogs, create/edit forms, destructive action confirmations.
Use drawer for: previewing detail, settings panels, supplementary information.

Never use modal for: showing a list, browsing items, anything that needs scrolling of many items.

## Form Elements

### Text Input

```
background: C.inputBg;
border: 1px solid C.border;
border-radius: 6-8px;
padding: 10-12px;
color: C.fg;
font-size: 14px;
```

Focus: `border-color: C.accent`, subtle glow `box-shadow: 0 0 0 2px rgba(accent, 0.2)`.
Error: `border-color: C.crit`.
Disabled: 40% opacity, `cursor: not-allowed`.

### Label

- Position: ABOVE the input, always.
- Size: 12px, 500 weight, `C.muted`.
- Gap: 4-6px between label and input.
- Never inline/left-aligned labels. They break on mobile.

### Select / Dropdown

Same styling as text input. Custom dropdown panel uses `C.card` background with `C.border` border.

### Textarea

Same as text input, minimum height: 80px. Resize: vertical only.

### Checkbox / Toggle

- Unchecked: `C.border` outline, transparent fill
- Checked: `C.accent` fill, white checkmark
- Size: 18-20px square (checkbox), 36x20px (toggle)
- Label: 13-14px, beside the control

## Navigation

### Sidebar (isWide)

- Width: 220-260px
- Background: one step darker than page canvas
- Items: 14px text, 40px row height, 12px horizontal padding
- Active item: `C.accent` left border + `C.accent` text + subtle bg tint
- Hover: `rgba(255,255,255,0.04)` background
- Group headers: 10-11px, uppercase, `C.muted`, 500 weight

### Tab Bar (L4 specialist tabs)

- Horizontal scrollable on mobile
- Active tab: `C.accent` text + bottom border `2px solid C.accent`
- Inactive tab: `C.muted` text
- Tab size: 13-14px, 500-600 weight
- Tab padding: 8-12px vertical, 12-16px horizontal
- No background color on tabs — underline indicator only

### Breadcrumb

- Not used. NGW uses sidebar + tab navigation. No breadcrumbs.

## Tooltips

- Background: `#1A1A1A` (near-black)
- Text: `C.fg`, 12px
- Padding: 6-8px
- Border-radius: 6px
- Shadow: `0 4px 12px rgba(0,0,0,0.4)`
- Max-width: 240px
- Trigger: hover (desktop), long-press (mobile)
- Position: above the trigger element, centered

## Loading States

### Skeleton Loader

- Shape matches the content it's loading (rectangular for text, circle for avatars)
- Color: pulse between `C.card` and `rgba(255,255,255,0.06)`
- Animation: 1.5s ease-in-out infinite
- No text in skeleton loaders. Just shapes.

### Inline Spinner

- 16-20px circle
- `C.accent` partial arc, rotating
- Duration: 750ms
- Use ONLY inside buttons or small inline contexts
- Never a full-page spinner. Use skeleton loaders for full-page loading.
