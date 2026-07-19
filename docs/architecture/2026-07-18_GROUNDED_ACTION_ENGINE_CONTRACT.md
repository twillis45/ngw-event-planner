# Grounded Action Engine Contract

**Status:** SPEC (2026-07-18). Gates the runtime build of the grounded action loop
(Figma direction, host ruling "this is the thing"). No UI work until this contract is real.

## Why this exists

The elegant hero is designed to **be the action**, not a gateway to it: it surfaces the
FIRST item of a bundle with its fix already proposed, the reasoning shown, resolvable in one
tap — then the next rises. See the Figma nodes + `project_grounded_action_loop` memory.

**The gap:** today the board hands the hero only a bundle **count** (`{kind:'bundle', title,
count, items, route}`). The loop needs, *per item*: the thing, a proposed resolution, the
reasoning, the provenance, the downstream impact, and its lock state. That is real
decision-engine work — the design is a forcing function for the "seasoned planner, held to
10+" bar (`feedback_decision_engine_is_10plus`).

## The contract — what the engine must produce per item

```ts
type ActionItem = {
  id: string;                       // stable per item
  // ── THE THING ──
  ask: string;                      // the one loud line, host-plain ("Two vendors want the same hour.")
  detail: string;                   // the guide-voice sentence (serif), states the specific situation

  // ── THE PROPOSED RESOLUTION (propose-don't-ask) ──
  resolution: Resolution;           // see below — the fix, pre-filled OR a real choice

  // ── THE INTELLIGENCE (non-negotiable: no fix without a why) ──
  why: string;                      // grounded reason, references real constraints
  sources: SourceId[];              // provenance — resolves in a *_SOURCES registry (feedback_hold_source_provenance)
  confidence?: 'proposed' | 'derived' | 'certain';  // how sure the engine is

  // ── DOWNSTREAM ──
  impact: string;                   // what resolving it unlocks/ticks ("the food count locks downstream")
  progressDelta: { done: number; total: number };   // the hairline tick after resolve

  // ── LOCK / DEPENDENCY ──
  lock?: {                          // present ⇒ the action is BLOCKED
    reason: string;                 // "12 of 40 haven't replied"
    unlocksWhen: string;            // "RSVPs close · Aug 22"
    unlockAction?: ActionItem;      // THE MOVE that clears the block ("Nudge the 12…") — recursive
  };
};

type Resolution =
  | { kind: 'confirm';  label: string }                                  // one tap
  | { kind: 'number';   label: string; value: number; unit?: string; min?: number; max?: number }  // pre-set stepper
  | { kind: 'time';     label: string; value: string; options?: string[] }  // pre-selected + alternatives
  | { kind: 'choice';   options: { label: string; sub?: string }[] }     // genuine either/or (no default)
  | { kind: 'message';  label: string; to: string; draft: string }       // pre-drafted, approve-don't-compose
  ;
```

### Resolution shape MUST match the situation (the honesty rule)
- Engine knows the right fix → `confirm` / `number` / `time` / `message` with it **pre-filled**.
- Genuine judgment call, no defensible default → `choice` (two real options). Never fake a
  default to look decisive; never dump a `choice` when a fix is obvious.

## Hard requirements

1. **No fix without a `why`.** Every `resolution` carries a `why` grounded in real constraints
   (room unlock time, setup duration, RSVP counts, deadlines) with `sources`. A proposal the
   engine can't explain is not shipped — it degrades to `choice` or stays a plain surface.
   This is the line between real and fake intelligence (`06_AI_GROUNDING_NO_FAKE_INTELLIGENCE`).
2. **Ordering unchanged.** The loop consumes `decisionBoard`'s existing sort; overwhelm pacing
   still caps the queue. The engine picks item[0]; the loop never re-orders.
3. **Locked items are honest, not hidden.** A blocked item returns `lock` (never a fake button)
   and, where possible, `lock.unlockAction` — the move that clears it (design: recessed lock
   panel + raised unlock CTA). A lock with no unlock action still shows reason + unlocksWhen.
4. **Completion is a real signal.** When `done === total` the engine emits a payoff state
   (the "all in sync" reward), not silence.
5. **Undo.** Every resolve is reversible for a window (the receipt's Undo) — the engine action
   must be idempotent-reversible.

## Color rule (host ruling 2026-07-18) — GREEN IS EARNED
Green (`--ok`) means **done / success / on-track**, spent only there. The progress hairline is a
neutral **steel** while filling and turns **green only at completion** — green becomes the reward,
never an in-progress "looks good". A **locked/blocked** state carries NO green (a block is not
good): steel progress, neutral grounding dots, amber eyebrow if waiting. Applies to progress bars,
the grounding "why" dot, and every state across the loop + runtime.

## Where it wires (runtime)
- Producer: extend the bundle contract in the decision engine (`lib/` + `decisionBoard`) from
  `{count}` to `items: ActionItem[]`. The `why`/`sources`/`impact` come from the same grounding
  the engine already computes for ordering — surfaced per item instead of collapsed to a count.
- Consumer: the elegant hero (`HostShellV2.jsx`, `?elegant=1`) renders `items[0]` as the
  grounded action; resolve → `onCta`/patch → receipt/beat → `items[1]` rises; hairline reads
  `progressDelta`. Resolution `kind` selects the inline control (confirm button / stepper /
  time chips / choice cards / message card / locked panel).
- Motion/aliveness (tactile depress, haptic `vibrate(8)`, tock/chime, breath) per the
  loop-motion prototype — carry to runtime on build.

## Decisions (host ruling 2026-07-18 "do recommendation" — LOCKED)
- **First domain: VENDOR CONFLICTS.** Richest `why`, clearest impact, Margaret/Wanda flagship.
  Decisions is the generalizer, ships second.
- **`why` = sentence in-hero; `sources` available on tap.** Keeps the hero calm; provenance is
  there when challenged, not cluttering the surface.
- **`confidence` is ENGINE-INTERNAL.** Never shown in-hero (a visible "70% sure" undercuts the
  calm authority). Kept on the type for engine logic / degrade-to-choice decisions only.
- **Resolution kinds for slice 1 = confirm · number · time · choice · message.** `review` (read
  a contract/doc) and `delegate` (hand to a helper) are REAL future kinds — added post-slice-1,
  not needed for vendor conflicts.
- **`impact` stays a STRING for slice 1.** Structuring it (which item it unlocks, for visual
  chaining) is a later enhancement; the string carries the meaning now.

## Build sequence (once approved)
1. Define `ActionItem` + `Resolution` types in `lib/`; unit-test the producer for ONE domain
   (vendor conflicts) with real seed data (Margaret / Wanda).
2. Wire the hero consumer behind `?elegant=1` for that one domain; drive the loop live.
3. Add resolution controls one `kind` at a time (confirm → time → choice → message → locked).
4. Motion/aliveness + completion payoff.
5. Expand domains. Re-score the decision engine — this contract IS the "per-item intelligence"
   the 10+ bar demands.
