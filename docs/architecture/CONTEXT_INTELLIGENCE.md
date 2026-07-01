# INTEL-2 — Context Intelligence (Build-Plan Spec)

**Status:** Spec — design only, do NOT build yet. Roadmap #5 of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md) (Level 3 — Context).
**Owner:** Todd. **Drafted:** 2026-07-01.
**Pairs with:** [INTEL_1_HOST_INTELLIGENCE_PROFILE.md](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md) (the tenth-event pillar). This is the first-event pillar. Same vocabulary throughout: *observation · confidence · because · honest-empty · reads-forward through the registry*.
**Grounded in (READ-ONLY, cited):**
- Type table — `src/lib/eventTaxonomy.mjs`: `EVENT_TAXONOMY` (:34), the per-type `cultural` field (Quinceañera :46), `CULTURAL_FLAGS` (:195), `culturalFlagFor` (:260), `resolveCanonicalType` (:213). Crab Feast / Crawfish Boil / Low Country Boil are already canonical types (:88–90).
- Tone/culture guard — `src/lib/doItForMe.js`: `SOMBRE_RE` (:9), `inviteVoice` (:65), `eventCulturalMeta` (:105), `isAtHome` (:124), `placePhrase` (:37).
- Playbook layer — `src/lib/playbooks/index.js`: `getPlaybook` (:72), `REGISTRY` (:64), `attendanceBand`/`sizingGuests`/`eventSizing` (:241/:313/:334), `playbookContingencyForWeather` (:349). The **Crab Feast playbook** (`src/lib/playbooks/data/crabFeast.js`) is the existing proof-of-shape: decisions/tasks/purchases/rentalsGap/schedules/contingencies all reshape the plan by type today.
- Location signal — `src/App.js`: `resolveEventState` (:16253), `STATE_NAME_TO_ABBR` (:16236), `US_STATES` (:16231), `METRO_GEO` (:15501), `eventGeoQuery` (:15526), `useFoodPriceFactor` (:16281, the BLS 4-census-region factor). `src/lib/maps.js` `attachAutocomplete` returns `{city, state, zip, lat, lon}` (:57).
- Season/weather — `src/App.js` `seasonBriefText` (:21091, month→season, **display-only today**); `src/lib/weather.js` `getEventWeatherRisk` (:75), `weatherLogistics` (:186, heat→ice ×2/2.5), `isLikelyOutdoor` (:29).

> **The thesis in one line:** Context Intelligence answers *"what is true about this event, right now?"* and reshapes the plan from four axes that are one family — **where · who · tradition · when** — with **no host input**. A Maryland crab feast should arrive already knowing it needs newspaper, mallets, Old Bay, a hand-wash station, and extra trash cans, because the *place + tradition* say so — not because the host filled anything in. It makes the **first** event smart, exactly as Host Intelligence makes the **tenth** event smart; together they are the two-pillar moat of §3 of the OS.

---

## 0. Principles (non-negotiable — mirror INTEL-1 §0)

1. **Grounded — never invent a cultural fact.** Every context-driven addition traces to an *authored* pack (a playbook / taxonomy entry a human wrote and can cite), never to a model guessing what "people like this" do. If we can't cite it, it doesn't ship. Packs carry the same `provenance`/`verificationStatus` discipline the Crab Feast playbook already uses (`crabFeast.js` `knowledge.verificationStatus: 'synthesized'`).
2. **Backward-compatible.** Context is **derived at render**, additive, and absent-safe. No stored field changes meaning; an event with no resolvable context renders **exactly** as today.
3. **Honest-empty when unknown.** Unknown place/tradition/season ⇒ today's L2 playbook, full stop — **no guess**. A weak signal is *noted, not applied* (same three-tier discipline as INTEL-1 §5). We never fabricate a region or a tradition to have something to say.
4. **Never stereotype — context adjusts the KIT, not the PEOPLE.** Context reshapes *logistics / quantities / the known kit* of a **place or tradition the host named**. It never infers anything about *who the guests are*. A "military" audience axis changes formality/alcohol defaults on the *event*, never a claim about a person.
5. **Tone stays behind the existing guard.** Any sombre/cultural *voice* remains gated by `inviteVoice`/`SOMBRE_RE` (`doItForMe.js:65,9`) and `eventCulturalMeta` (:105) — the one source of truth. Context Intelligence may reshape the *kit and timing*; it may **not** open a second path to festive/sombre tone. A memorial never gets a party template because Context "noticed a season."
6. **Suggestion before silent override at low confidence; default-apply only a strong, cited match** — and always with a **because** and a one-tap remove (§5, §8).

---

## 1. Where context comes from (data model)

**Context is DERIVED, not stored** — the key architectural difference from Host Intelligence (which *persists* reconciled observations on `profile.hostIntelligence`). Context is recomputed every render from signals **already on the event**, so a changed date or venue reflows the whole plan with zero migration. There is **no** `event.context` blob to persist.

| Signal | Source (EXISTS today) | Field(s) | New work? |
|---|---|---|---|
| **Type / tradition** | `resolveCanonicalType` + `EVENT_TAXONOMY` (`eventTaxonomy.mjs:213,34`); `culturalFlagFor` (:260) | `event.type` | EXISTS — reuse the canonical resolver, never re-sniff |
| **At-home vs venue** | `isAtHome` / `placePhrase` (`doItForMe.js:124,37`); `isLikelyOutdoor` (`weather.js:29`) | `event.venue`, `event.notes`, `event.venueKind` | EXISTS |
| **Region / state / climate** | `resolveEventState` (`App.js:16253`), `METRO_GEO` (:15501), `eventGeoQuery` (:15526) | `event.state`/`venueState`/`market`/`city`/`venueZip` | EXISTS — coarse (2-letter state / metro / census region). Climate band per state is **NEW** (a small cited lookup) |
| **Season / month** | `seasonBriefText` month→season (`App.js:21091`) | `event.date` | EXISTS as display-only. Promote month→season into a **pure reader** (NEW: `contextSeason`) |
| **Live weather** | `getEventWeatherRisk` (`weather.js:75`) | lat/lon + date | EXISTS — belongs to Weather→Action (#6), which *consumes* the season/climate context (§10) |
| **Audience / "who"** | none structured today | (proposed `event.audience`, optional) | **NEW** — an optional, host-set enum; never inferred |

**The reader.** One helper, `eventContext(event, profile)`, returns a safe, fully-populated-or-empty shape so no consumer needs a guard (mirrors INTEL-1's `hostIntel(profile)`):

```
eventContext(event, profile) = {
  where:     { state, region, climate, atHome, outdoor, confidence, because } | empty,
  who:       { audience, confidence, because } | empty,     // empty unless host set it
  tradition: { packId, name, confidence, because } | empty, // from the canonical type / cultural flag
  when:      { season, month, daylightShort, confidence, because } | empty,
  additions: [ ContextAddition… ],   // the reshaping, §3/§5 — [] when nothing resolves
}
```

Absent every signal ⇒ every axis `empty` and `additions: []` ⇒ honest-empty, plan identical to today.

---

## 2. The four axes (input → derived facts → reshaping)

Each axis is a pure function of on-event signals. "Reshaping" is expressed as **`ContextAddition`s** the plan layer merges (§3), each with a confidence + because.

### 2a. Where — state / region / climate / at-home
| Input signal | Derived facts | Plan reshaping (examples) |
|---|---|---|
| `resolveEventState` → `AZ`; `isLikelyOutdoor` → true | hot-arid climate band, outdoor | shade + water + **ice ×1.4**, cooling/cold-hold; because *"Arizona outdoors — heat drives ice and shade"* |
| state → coastal `MD`/`LA`/`SC` + boil/seafood type | coastal-seafood sourcing | seafood-market sourcing line, "call ahead — price is seasonal" |
| `isAtHome` true | at-home (no venue ops) | hand-wash station, extra trash cans, parking-on-street note; **suppress** venue-COI/load-in |
| region → BLS census region (`useFoodPriceFactor:16281`) | regional grocery factor | already live — Context just *names* it as a where-fact |

### 2b. Who — audience (OPTIONAL, host-set only)
| Input signal | Derived facts | Plan reshaping |
|---|---|---|
| `event.audience = 'corporate'` | formality high, alcohol default off/cash-bar, no kids ratio | invoice/PO framing, name badges, AV; drinks default dry |
| `= 'church'` / `'family'` / `'neighborhood'` / `'military'` / `'alumni'` | formality + kids ratio + alcohol defaults per audience | kids-plate ratio, dry-by-default for church, potluck framing for neighborhood |

**Guardrail:** `who` is **empty unless the host explicitly set `event.audience`.** It is *never* inferred from names, location, or type. It changes defaults on the *event*, never a statement about a guest (Principle 4).

### 2c. Tradition — the known kit
| Input signal | Derived facts | Plan reshaping |
|---|---|---|
| canonical type `Crab Feast` (`eventTaxonomy.mjs:88`) | the Maryland crab-feast kit (already authored in `crabFeast.js`) | newspaper table cover, mallets + crab knives, Old Bay, cider vinegar, hand-wash/paper towels, extra trash + shell bucket, seafood-market sourcing |
| type `Get-Together` + `event.tradition='texas_bbq'` (or a Texas-BBQ pack) | the BBQ kit | smoker timing, wood/charcoal, brisket **rest** window, butcher paper, low-and-slow ROS anchor |
| `culturalFlagFor` → `latin`/`lunar`/`islamic`/`pan-african` (:260) | the tradition's known-kit **metadata** | pack-scoped additions only; **tone stays with `inviteVoice` (Principle 5)** |

Tradition is the **richest** axis and the one already proven: the Crab Feast playbook *is* a tradition pack (§4).

### 2d. When — season / holiday / daylight
| Input signal | Derived facts | Plan reshaping |
|---|---|---|
| `event.date` month → `contextSeason` (promote `seasonBriefText:21091`) | summer/winter/spring/fall | summer→more ice/shade cue; winter→heat/cover/indoor fallback |
| month + outdoor | short daylight / sunset pressure | "gets dark ~X — plan lighting/golden hour" (real sunset via `weather.js` when in-window) |
| date near a holiday / football weekend (NEW small cited calendar) | competing-attention, timing | "Sat of a holiday weekend — send invites earlier; expect travel" |

---

## 3. How reshaping reaches the plan — the `ContextAddition`

Context does **not** fork the engine. It emits `ContextAddition`s that ride the SAME seams the playbook already feeds:

```
ContextAddition = {
  id,                       // stable, e.g. 'ctx-md-handwash'
  kind: 'purchase'|'task'|'rental'|'ros'|'default',
  target,                   // the seam: a purchases[] row, a tasks[] row, a rentalsGap[] row, a default
  patch,                    // qty multiplier (ice ×1.4) OR a new authored item
  axis: 'where'|'who'|'tradition'|'when',
  packId,                   // provenance — which cited pack authored this
  confidence,               // §5
  because,                  // §5 — required, human sentence
}
```

- **Multipliers** (ice ×1.4 for AZ-outdoor) scale an existing `qtyPerGuest` — they read like Host Intelligence's food ratios, so a later Host override composes cleanly (§6).
- **New kit items** (hand-wash station) are authored rows in a pack, merged into the same `purchases`/`rentalsGap` arrays `playbookTasks`/`playbookRunOfShow` already iterate (`index.js:533,743`) — deduped by `id`.
- **Default flips** (`who=church` → drinks dry) change a decision's *default*, still overridable by the host, exactly like `choicePickFor` (`index.js:400`).

Because additions merge at the playbook read layer, every downstream reader (shopping list, "what's left", budget, ROS, The Day) inherits them for free — the single-source discipline the OS requires.

---

## 4. Context packs — authoring the known kit WITHOUT forking the engine

A **context pack** is authored data attached to the existing playbook/taxonomy layer. **It reuses the shape that already exists** — the Crab Feast playbook proves it. Two placement rules:

1. **Tradition packs = playbook data files** (the primary mechanism). A tradition that maps to its own canonical type (Crab Feast, Crawfish Boil, Low Country Boil — already in `EVENT_TAXONOMY:88–90`, already registered in `ALL_PLAYBOOKS`/`REGISTRY` at `index.js:63`) simply *is* a playbook with the full kit. **No new engine** — `getPlaybook` (:72) already resolves it. To add "Texas BBQ" or "Juneteenth" as a tradition pack: author `src/lib/playbooks/data/<pack>.js`, register it, and (if a new label) add the taxonomy row/alias. This is the same drop-in path the Playbook Engine already documents.

2. **Cross-cutting packs = a small `contextPacks` overlay** keyed by axis, for kit that is *not* a whole event type but a modifier (AZ-outdoor heat kit; at-home hygiene kit; holiday-weekend timing). A pack declares `{ id, axis, when(ctx)→bool, additions:[ContextAddition…], provenance }`. `eventContext` runs each pack's `when` against the resolved axes and collects `additions`. This overlay lives beside the playbook data (e.g. `src/lib/context/packs/`), read by the same layer — still no engine fork, still one merge point (§3).

**Attachment, not replacement:** a pack **adds to** the playbook's authored arrays; it never rewrites the playbook. Crab Feast keeps its authored kit; the AZ-outdoor pack layers ice ×1.4 on top if that crab feast is in Phoenix. Order is deterministic: playbook base → tradition pack → where/when/who overlays → (later) Host Intelligence (§6).

**Provenance is mandatory** — every pack carries `verificationStatus`/`sources` like `crabFeast.js:156`. `synthesized` until a foreground verification pass attaches citations. An un-cited "fact" cannot be a pack.

---

## 5. Confidence + explainability

Even context has confidence — a strong region+type match is not a weak guess.

| Signal strength | Confidence | Behavior |
|---|---|---|
| Structured, unambiguous match (canonical type == a tradition pack; `event.state` set to a climate band; host-set `audience`) | **High** | **default-applied** with because + one-tap remove |
| Resolvable but inferred (state parsed out of a "City, ST" string; season from month for an outdoor event) | **Medium** | **applied, clearly attributed** ("because it's outdoors in July"); one-tap remove |
| Weak / ambiguous (no state, generic type, tradition only hinted) | **Low** | **noted, not applied** — L2 playbook stands; optional "is this a MD crab feast? tap to load the kit" |
| No signal | — | invisible; honest-empty |

**Every context-driven addition carries a `because`** — a plain sentence naming the axis, matching INTEL-1's explainability requirement:
- *"Added a hand-wash station — common at Maryland crab feasts."*
- *"Bumped ice to ~1.4×, and added shade + water — Arizona, outdoors, in July."*
- *"Set drinks to dry by default — you marked this a church event."* (only when host-set)

No silent additions. If the host can't see *why* an item appeared, it doesn't appear.

---

## 6. The Host × Context relationship (the coherence the roadmap wants)

The two pillars **compose**, in a fixed precedence:

```
L2 playbook base  →  Context (L3, first-event default)  →  Host Intelligence (L4, override at Medium+ conf.)
```

- **Context sets the first-event baseline.** With zero history, Context is the smartest the plan can be: *"plan 2 lb Old Bay / 10 guests"* (a cited pack default).
- **Host memory then adjusts it — but only when it has earned the right.** Once `hostIntel(profile).food` reaches **Medium+ confidence AND is stable** (INTEL-1 §5), the host's reconciled ratio **overrides** the Context default, carrying *its own* because: *"You always have Old Bay left over — planning 1½ instead of 2."*
- **Precedence rule:** Context is the **default**; Host memory **overrides** at Medium+ confidence with its because. Below Medium, Context stands and Host memory is merely *noted*. They never both silently apply — the higher-trust, higher-confidence source wins, and the surviving because names which pillar spoke.
- **Composition is clean because both speak in ratios/authored items** (§3): Host's `ratio` multiplies the same `qtyPerGuest` Context multiplied, so the math stacks without special-casing. The `because` swaps from "common at crab feasts" (Context) to "you had leftover last 2 times" (Host) when Host takes over.

This is the two-pillar moat of OS §3 made concrete: the first event is smart from culture+place+season; the tenth is smart from learned reality; the handoff is a confidence-gated override, not a fork.

---

## 7. Reads-forward via the registry

Context, like Host memory, is a **producer** that engines **read forward**. Per the OS's single-source discipline, **no engine may consume a context signal until that signal is declared in `INTELLIGENCE_READERS_REGISTRY.md`** — the reader registry being created alongside this spec (and alongside INTEL-1, which registers `hostIntel` domains the same way). The registry names, for each signal: its producer (`eventContext.<axis>`), its shape, its confidence rule, and the explicit list of engines allowed to read it. A new reader (say the budget engine wanting the regional factor as a *context* fact) registers first, then consumes. This prevents the "N copies of the same guess" drift the Effective Item seam was built to kill.

**First readers allowed (conservative, mirrors INTEL-1 §7):**
1. **Shopping list / "what's left"** — tradition-pack kit items + where/season multipliers (highest leverage, already the seam packs feed). **First.**
2. **Run-of-show** — tradition timing anchors (BBQ rest window, steam-vs-pickup) via `playbookRunOfShow`.
3. **Season/climate → Weather→Action (#6)** — Context *supplies* the season/climate band; Weather→Action reads it (§10).

Everything else (budget auto-frame, audience default-flips) registers and accrues but waits.

---

## 8. Privacy / anti-stereotype guardrails

1. **Context is about the EVENT — place, tradition, season — never inferred demographics of guests.** Nothing about a guest (name, address, ethnicity, RSVP PII) ever drives context. The `who` axis is **host-declared only** and describes the *gathering's* formality/defaults, not the people.
2. **No demographic inference, ever.** We do not guess a tradition from a guest list, a name, or a neighborhood. A tradition pack loads only from the **type the host named** (or an explicit host tap "load the crab-feast kit"). Principle 4 is a hard wall.
3. **Coarse location only.** Context uses the **2-letter state / metro / census region** the host already provided (`resolveEventState`) — never live tracking, never precise geolocation beyond what the host typed. Lat/lon exists only for the opt-in weather fetch (`weather.js`), not for context inference.
4. **Always editable / removable.** Every context-added item shows its because and a one-tap remove; removing it reverts that line to the L2 default. The host can dismiss a whole pack ("this isn't a crab feast"). No lock-in, no silent drift — same guarantee as INTEL-1 §6/§8.
5. **Tone stays gated.** No context path may set a festive/sombre voice outside `inviteVoice`/`eventCulturalMeta` (Principle 5).

---

## 9. What NOT to build

- **No demographic inference** — never guess who the guests are, or a tradition from anything but the host-named type. (Principle 4 / §8.)
- **No prediction / risk / probability** — that's L5 (#7), gated on Host memory. Context is grounded present-fact only.
- **No engine fork** — additions merge at the existing playbook read layer (`getPlaybook`/`playbookTasks`/`playbookRunOfShow`); no parallel runtime, no new state store.
- **No auto-applied cultural tone** beyond the existing `inviteVoice`/`SOMBRE_RE` guard.
- **No location tracking** beyond the coarse region the host typed; no precise geolocation for inference.
- **No un-cited packs** — synthesized-until-verified, `provenance` mandatory. If we can't cite it, it isn't context — it's a guess (OS §2).
- **No persisted `event.context`** — derived at render; there is nothing to migrate or to drift.

---

## 10. Relationship to Weather → Action (#6)

Context Intelligence and Weather→Action are a **producer/consumer pair**, and the boundary is deliberate:

- **Context owns the *ambient, always-available* signal**: season from the month, the state's climate band, at-home/outdoor — knowable for **any** event at **any** distance, with no API. This is the honest baseline (`seasonBriefText` promoted to a reader; a cited state→climate lookup).
- **Weather→Action (#6) owns the *live forecast* signal**: `getEventWeatherRisk`/`weatherLogistics` (`weather.js:75,186`) inside the 14-day window, which turns a real forecast into concrete moves (ice ×2.5, raise the canopy). It **consumes** Context's season/climate band as its fallback and its framing: when there's no forecast yet, Context's "summer, outdoors, AZ" still drives shade/ice; when the forecast lands, Weather→Action refines the number and Context recedes to context. `playbookContingencyForWeather` (`index.js:349`) is the existing hinge — the authored contingency Context/weather both point at.

So: **Context = the season/climate the plan always knows; Weather→Action = the forecast that sharpens it.** #6 registers `eventContext.when`/`eventContext.where.climate` as an input in the readers registry (§7) before consuming them.

---

## 11. Build sequence (phased — do NOT build yet)

- **P1 — `eventContext` reader (inert, no reads-forward).** Add the empty-safe `eventContext(event, profile)` composing the EXISTING signals (`resolveEventState`, `isAtHome`, `isLikelyOutdoor`, promoted `contextSeason`). Ships computing context but changing nothing. Register in the readers registry.
- **P2 — Tradition packs via the playbook path.** Prove the mechanism with **Crab Feast** (already authored) and add **Texas BBQ** + one holiday tradition as playbook data files — the drop-in path (§4.1), no engine change. Verify the kit reshapes the shopping list.
- **P3 — Cross-cutting `contextPacks` overlay (where/when).** AZ-outdoor heat kit (ice ×1.4, shade, water), at-home hygiene kit (hand-wash, trash), season timing. Merge as `ContextAddition`s at the playbook read layer; each carries confidence + because. First read-forward: shopping list.
- **P4 — Confidence surfacing + remove.** Show the because on every added line; one-tap remove; "load the kit?" prompt at Low confidence. Builds trust before anything defaults silently.
- **P5 — Host × Context composition.** Wire the precedence (§6): Host Intelligence overrides Context defaults at Medium+ confidence, swapping the because. Requires INTEL-1 P4 shipped.
- **P6 — Supply season/climate to Weather→Action (#6).** Register and expose `eventContext.when`/`.where.climate` as #6's input.
- **`who` axis** stays optional/host-set throughout; never inferred, shipped only if hosts ask for it.

---

## Summary — the thesis

Context Intelligence is the **first-event** pillar: it reads *what is already true about this event* — **where** (state/climate/at-home), **who** (host-declared audience only), **tradition** (the canonical type's known kit), **when** (season/daylight/calendar) — and reshapes the plan **with no host input**, so a Maryland crab feast arrives already knowing newspaper, mallets, Old Bay, a hand-wash station, and extra trash cans, and an Arizona backyard afternoon already knows shade, water, and 1.4× ice. It is **derived at render** (not stored), **grounded** (cited packs only — never a fabricated cultural fact), **honest-empty** (unknown context ⇒ today's L2 playbook), and it **never stereotypes** — it adjusts the *kit and timing of a place or tradition the host named*, never the people, with sombre/cultural *tone* left entirely to the existing `inviteVoice`/`SOMBRE_RE` guard. Packs attach to the existing playbook/taxonomy layer (the Crab Feast playbook already proves the shape) with **no engine fork**; every addition carries a **because** and a one-tap remove; and each signal **registers in the readers registry before any engine consumes it**. Context sets the smart default; Host Intelligence (L4) overrides it once it has earned Medium+ confidence — the two pillars composing into the moat neither has alone. Weather→Action (#6) then reads Context's season/climate to sharpen the ambient baseline into a live forecast. It ships inert and backward-compatible, and it is grounded present-fact only — never prediction, never inference, never a guess.
