## Building with the NGW Operational Design System (Studio Matte)

### Wrap everything in both providers, in this order

`Button` and `AlertBanner` read escalation context; `Surface` reads density
context, and `DensityProvider` itself calls `useEscalation()` — so the nesting
order is not optional.

```jsx
import { EscalationProvider, DensityProvider, Surface, Text, Button } from 'ngw-event-boss';

<EscalationProvider initialLevel="nominal">
  <DensityProvider>
    <Surface role="card" pad={5}>
      <Text variant="heading" as="h2">Vendor readiness</Text>
      <Text variant="body">Three vendors have not returned a COI.</Text>
      <Button priority="p1">Chase all three</Button>
    </Surface>
  </DensityProvider>
</EscalationProvider>
```

Without them, escalation-aware components fall back to `nominal` and density
recession never applies.

### This is a DARK system — give it a ground

Text roles are near-white (`--ngw-text-primary: #e8edf2`) because they assume a
carbon canvas. On a default white page the primary text is invisible. Set the
canvas on your root, or render inside a `Surface`:

```jsx
<div style={{ background: 'var(--ngw-surface-canvas)', minHeight: '100vh' }}>
```

### Styling idiom: no CSS classes — inline styles + tokens

The primitives style themselves with inline `style={{}}` and ship no class
vocabulary. There are **no utility classes to use and none to invent**. For your
own layout glue, use either the CSS custom properties or the JS token exports —
both come from the same source and cannot disagree.

CSS custom properties (73 of them, defined in `styles.css`'s import closure):

| Family | Examples |
|---|---|
| Surfaces | `--ngw-surface-canvas` `-card` `-elevated` `-interactive` `-strong` `-overlay` `-dim` |
| Borders | `--ngw-border-subtle` `-default` `-strong` |
| Text | `--ngw-text-primary` `-secondary` `-tertiary` `-disabled` `-inverse` |
| Status | `--ngw-status-confirmed` `-warning` `-risk` `-risk-bright` `-in-progress` `-neutral` + their `*-text` / `*-bg` |
| Space | `--ngw-space-0` … `--ngw-space-12` (2,4,8,12,16,20,24,32,40,48,64px) |
| Radius | `--ngw-radius-sm` `-md` `-lg` `-xl` `-full` |
| Type | `--ngw-size-2xs` … `--ngw-size-5xl`, `--ngw-weight-regular|medium|semibold` |
| Elevation | `--ngw-elevation-base` `-elevated` `-active` `-escalation` `-interrupt` `-card` |

Or in JS: `import { color, space, radius, type, elevation } from 'ngw-event-boss'`.

### Rules that carry meaning, not taste

- **`Surface.pad` is a space-scale KEY (0-12), not pixels.** `pad={5}` is 16px
  and is the default card.
- **Primacy is structural, never louder color.** `Button priority="p1"` gets a
  raised surface, grounding shadow, and a steel keyline. Do not add brightness
  or glow to signal importance.
- **One structural primary per surface.** Under `initialLevel="escalated"` the
  `escalation` button becomes primary and any `p1` demotes automatically — do
  not hand-manage that.
- **Status colors mean status.** Amber = attention, red = critical, green =
  confirmed/safe, lavender (`--ngw-status-in-progress`) = underway. Never borrow
  one for identity, selection, or decoration.
- **Steel is identity and selection.** `--ngw-text-secondary` (#849eb8) is
  doctrine-locked.
- **No bounce, spring, or elastic easing, ever.** Use
  `transitionFor(intent, props)` — intents are `ambient`, `escalation`,
  `emergency`, `recovery`, `sheetRise`, `sheetDismiss`, `press`.
- **`BottomSheet` is `position: fixed; inset: 0`** and needs `open` true plus a
  full-viewport parent to sit over.

### Where the truth lives

Read these before styling — they beat any summary here:

- `styles.css` and its `@import` closure — every token, with real values.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract, including the
  exact enum members. These are hand-written and verified against the source
  maps, so they are trustworthy: if a value is not in the union, the component
  does not implement it and will silently fall back to its default.
- `guidelines/docs/claude-skills/02_STUDIO_MATTE_UI_STANDARD.md` and
  `guidelines/docs/claude-skills/ui-ux/UX_01`–`UX_09` — the visual, color,
  hierarchy, and language doctrine this system encodes.

### One idiomatic build

```jsx
<EscalationProvider initialLevel="nominal">
  <DensityProvider>
    <div style={{ background: 'var(--ngw-surface-canvas)', minHeight: '100vh', padding: 'var(--ngw-space-8)' }}>
      <Text variant="title" as="h1">Saturday, October 18</Text>

      <AlertBanner
        severity="overdue"
        title="Three COIs outstanding"
        body="Lighting, valet, and the band. The venue gate is 48 hours out."
        action={<Button priority="p2" size="sm">Chase all three</Button>}
        style={{ marginTop: 'var(--ngw-space-6)' }}
      />

      <Surface role="card" pad={5} style={{ marginTop: 'var(--ngw-space-5)' }}>
        <Text variant="heading" as="h2">Load-in</Text>
        <Text variant="secondary">North dock opens 6:00 AM</Text>
        <EscalationBadge status="warning" style={{ marginTop: 'var(--ngw-space-4)' }}>
          Freight elevator shared
        </EscalationBadge>
      </Surface>
    </div>
  </DensityProvider>
</EscalationProvider>
```
