# Grounding — what the last 320 synthesized rows actually are

**Date:** 2026-08-18 · **Dimension:** Grounding, held at 8/10
**Question:** the recorded cap says a third sourced is "short of a planner who
can name a price's origin on demand." What lifts it?

**This document reverses its own first two conclusions.** Both are kept, because
each was a plausible reading that measurement killed, and both are the kind of
mistake a future sourcing pass will make again.

## Measured, not inherited

`groundingCensus.mjs` over 498 priced rows: **0 unlabelled**; cited 98,
researched 38, established-consensus 38, synthesized 320. The registry
(`knowledge/costProvenance.js`) holds **79 dated sources** across 52 families,
each with a real URL, fetch date and claim.

## Wrong conclusion #1 — "93 rows are already covered by a registered source"

Name-matching synthesized rows against registry families returned 93 apparent
free wins. Hand-checking the candles family: **zero of eight** genuinely covered.
"Birthday candles + lighter" is not priced by a pillar-and-taper listing; an LED
candle is not a wax candle. A substring match is a hypothesis about a word, not
evidence about a price.

## Wrong conclusion #2 — "86% are composite, therefore unsourceable"

Classifying any row whose name contains a list, slash or `+` as an unsourceable
bundle gave 86%, and a draft ruling that citing bundles was forbidden fake
precision. **A gate written to enforce that ruling failed instantly on 110
existing rows** — because the corpus had already solved the problem properly:

    'Paper goods (plates/cups/cocktail napkins, leftover containers)'
      confidence: 'low'
      sources: [disposable-kit-2026, foil-wrap-2026, disposables-bulk-2026,
                disposables-partyqty-2026]
      claim: 'A SUM of separately-priced components, not one quoted item...
              Every component is cited to its own registered source; the summed
              kit band is low-confidence by construction.'

Every component cited to its own source, the summing declared, confidence marked
down for it. That is not fake precision — it is the honest way to price a kit,
and the draft ruling would have forbidden the corpus's best work.

A second heuristic — "cited bundles must say SUM" — flagged 19 more rows, and
those were fine too: `Disposable plates, cups, napkins, cutlery` derives a
per-guest setting from cited per-plate pricing and explicitly excludes bundles
that are a different product. It simply does not use the word "sum".

**Three heuristics, three false positives, all in one pass.** No gate was
shipped, because each proposed rule condemned deliberate, careful authoring.

## What is actually true

- Grounding's labelling is complete: **0 unlabelled of 498**.
- Sourced (cited + researched + established-consensus) is **174 = 35%**.
- The corpus has **two validated grounding patterns**: a single-commodity row
  citing its source, and a kit citing every component with the summing declared
  and confidence marked low.
- The 320 synthesized rows are not blocked by a missing mechanism. They are
  unsourced because nobody has done the per-row component research yet.

## RULING

**Grounding stays 8/10. The path to 9 is a sourcing programme, not a pass.**

Each remaining row needs its components priced against real, dated retail
sources and registered — the same work the 174 already-sourced rows took. There
is no mechanical shortcut, and this document is the record of three that were
tried and failed.

**Recorded as forbidden:** grounding a row by name-similarity to a registered
source family. It reads as free coverage and is unverified in every case tested.
This is the same failure mode as the labelling codemod that wrote `provenance`
into 89 deliberately vacated slots — a bulk pass that looked like tidying and
was corruption.
