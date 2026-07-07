# WHERE-WHEN-CONDENSING-1 — Event Details doctrine redesign

**Date:** 2026-07-07 · **Status:** SHIPPED

## What changed
The Where & when tab was a flat ~15-field form (two `EDTSectionHead` runs).
It now follows the condensing doctrine — four CollapsibleCard sections with
truthful subtitles and done dots:

1. **The basics** — name/type/date/times + personal touches. Done when
   name+type+date exist; starts collapsed when done; subtitle = deduped
   "name · type · Friendly date".
2. **Where it's happening** — Location check card, home/venue toggle, address
   fields, local-help chips. Done via the ONE shared reader
   (`eventLocationStatus !== 'missing'`); collapsed when done.
3. **Day-of notes** — venue contact, load-in, parking, house rules, rain plan,
   COI. Default collapsed; subtitle counts noted fields (no false done dot).
4. **How it went** — OutcomeCapture + DecisionHistory. Default collapsed.

## Truth-function work (the real engineering)
Seven deep-link anchors live inside these now-collapsible sections
(`event-date, event-venue, venue-contact, loadin-notes, parking-notes,
house-rules, rain-plan`). CollapsibleCard unmounts children when closed, which
would have killed those routes. Fixes, all test-locked (`edtCondensing.test.js`, 7 tests):

- **Focus broadcast**: both focus producers (`scrollFocusFieldWithRetry`, used
  by the host shell's `go()` and Location check; EventPlanner's
  `openFocusField` effect) now dispatch `ngw-focus-field` and record a 5s
  pending window. `useFocusFieldForceOpen(ids)` force-opens the card holding
  the target (durable — CollapsibleCard's wasForced keeps it open).
- **Stale-node re-anchor**: a cross-tab route remounts the target; the old
  re-anchor held a detached node and silently no-opped (live-observed:
  rain-plan landed 1050px down). Both paths now re-resolve by id at +900ms.
- **Hidden-document landing**: the preview/background tabs pause rAF, so
  smooth scrolls never run; `calmLandTop` uses instant scroll when
  `document.visibilityState === 'hidden'`.

Live-verified e2e at 375×812: header cue "Add a rain backup →" → tab switch →
Day-of card force-opens → rain-plan mounts, lands (max-scroll floor), textarea
focused.

## Notes
- `EDTSectionHead` retired (comment left in place).
- Card ids `edt-{basics|venue|dayof|history}-{event.id}` — collapse state
  persists per event via `useCollapsed`.
