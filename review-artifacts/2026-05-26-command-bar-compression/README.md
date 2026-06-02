# Command Bar Compression — 2026-05-26

Single change. Single file. Before/after evidence on disk.

## File touched
`src/slices/DesktopDensitySlice.jsx` — `DemoDriver` function only. ~80 lines replaced. No tokens, no primitives, no other files.

## Build status
✅ compiles, no new warnings, no console errors at runtime

## Reproduction
```bash
cd demo && npm start
# http://localhost:3000/?slice=desktop-density
```

## Before / After commands

| Old | New | Δ chars |
|---|---|---:|
| `Trigger 3 cascading delays` | `Trigger cascade` | −10 |
| `Cycle Catering` | `Catering` (inside CYCLE cluster) | −6 |
| `Cycle Florist` | `Florist` (inside CYCLE cluster) | −6 |
| `Cycle AV` | `AV` (inside CYCLE cluster) | −6 |
| `Cycle Photo` | `Photo` (inside CYCLE cluster) | −6 |
| `Resolve all` | `Clear all` | −2 |
| `Reset` | `reset` (demoted to lowercase, opacity 0.65, no border) | structural |
| `Active escalations: N` | `● ACTIVE N` (system-status pill with warning ring when N>0) | structural |

## Runtime measurements (live DOM probe)

At 1024 viewport, cascade state (worst case — ACTIVE pill at its widest):

| Element | Width | Position |
|---|---:|---|
| DEMO DRIVER label | 95 | x=16 |
| Trigger cascade | 110 | x=119 |
| CYCLE cluster (CYCLE + 4 vendor buttons) | 249 | x=237 |
| Clear all | 69 | x=494 |
| spacer (flex:1) | ~280 | absorbs remainder |
| reset | 54 | x=859 |
| ACTIVE 3 | 87 | x=921 |
| **Total bar height** | **81px** | **single row** ✅ |

**Spacer slack at 1024 = ~280px** — bar would only wrap below ~750px viewport, well below the desktop floor.

## Captures on disk

| File | What it shows |
|---|---|
| `before_1024.png` | Old verbose bar at 1024 — fits but cramped, "Cycle" word repeats 4× |
| `before_1280.png` / `before_1440.png` | Old bar at wider widths |
| `before_cascade_1280.png` / `before_emergency_1440.png` | Old bar under load |
| `after_1024.png` | New compressed bar — single line, CYCLE cluster reads as one instrument |
| `after_1280.png` / `after_1440.png` | New bar at wider widths |
| `after_cascade_1024.png` / `after_cascade_1280.png` / `after_cascade_1440.png` | New bar with `ACTIVE 3` warning ring |
| `after_emergency_1440.png` | New bar at emergency |
