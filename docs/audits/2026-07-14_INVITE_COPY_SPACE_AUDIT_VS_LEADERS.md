# Invite — Copy & Space Audit vs Leaders

Date: 2026-07-14 · Surface: **guest-facing invite** (`?rsvp=CODE` → `hostv2/src/InviteV2.jsx`)
Leader: **Partiful** (the same leader the per-screen audit assigned this surface)
Method: the house vs-Leaders method — scored against a real named leader, evidence-based, file:line citations, no invented findings.

**Difference from the 2026-07-13 pass:** that audit was explicitly *"source read… no runtime/browser verification in this pass."* This one is **rendered and measured** — every number below is a computed style or a measured bounding-box gap from the live invite, not a code inference. And the leader was **actually opened and read**, not recalled.

---

## Score: **7 → 5 / 10**

A **downgrade**, and the reason matters: the previous pass scored the invite on what the code *contains*. Rendered and measured against a real Partiful invite, the invite fails the only question that matters for this surface —

> **Can a guest who receives this actually come to the event?**

Today, they cannot reliably tell **what time to show up.**

---

## The like-for-like

Both invites, read from the live page.

| | **Partiful** (real event, read 2026-07-14) | **Event Boss** (`?rsvp=crab`) |
|---|---|---|
| Title | `a rooftop play performance :)` | `My Crab Feast` |
| **When** | **`Fri, Jul 24 · 7:30pm — Sun, Jul 26 · 4:30pm`** | `Tuesday, August 4` |
| **Who's inviting** | **`Hosted by · Erin L, sanchi pandey`** | *(absent — `hostContact` renders only if the host set it, and nothing prompts them to)* |
| Where | `1351 Hancock st · Hancock St, Brooklyn, NY` | `Backyard` |
| Social proof | `48 Going · 59 Interested · 3 Maybe` + avatar wall | **`N going` + avatar faces — see the correction below.** The sample event has zero RSVPs, so what I actually saw was the honest EMPTY state. |
| Countdown | **none** | **`21` at 117.9px — the largest element on the page** |
| Secondary action | `Remind me later` | *(none)* |

Partiful spends **zero pixels** on a countdown and spends them on **time, host, address, and a real "remind me later" affordance** instead. We spend our single largest typographic moment on a number the guest did not ask for.

---

## F1 — CRITICAL · The invite cannot tell a guest what time to arrive

`hostv2/src/InviteV2.jsx:681`:

```js
{event.date && (<><div className="inv2-label lp">When</div>
  <div className="inv2-val lp">{dfmt(event.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div></>)}
```

**There is no hour component in that format. Not for this event — for any event.** It is structurally impossible for the invite to display a start time.

And the app **knows the time**:
- `event.timeOfDay` is a real field, consumed by the run-of-show engine to anchor the whole day (`playbooks/index.js:1040`, and `:997` even parses `"18:30"` / `"6:30 PM"` / `"7:00 PM"`).
- The **host's own cover screen renders it**: *"Crab Feast · Saturday, July 11 · **Afternoon**"*.

So the app shows the time to the **host**, uses it to build the schedule, and **withholds it from the guest** — the one person whose entire job is to show up at the right time.

Against Partiful's `Fri, Jul 24 · 7:30pm`, this is not a polish gap. It is the invite failing at being an invitation.

**Severity: CRITICAL.** Nothing else on this page matters if the guest can't arrive.

---

## F2 — HIGH · The countdown outranks the event

Measured computed styles:

| Element | Size | Family |
|---|---|---|
| **`21`** (countdown) | **117.9px** / 700 | Playfair Display |
| `My Crab Feast` (the event) | **35.4px** / 700 | Playfair Display |

**The countdown is 3.3× the event's own name** and is the largest thing a guest sees.

This breaks the Attention System's **one hero per screen** rule, and it invents urgency the doctrine bans — *21 days out is not urgent.* The host's event name should be the hero of the host's invitation. Partiful's countdown: **it doesn't have one.** It has "Remind me later" — an *action* where we put an *ornament*.

---

## F3 — HIGH · The spacing rhythm is inverted: 31% dead space, 0px between the facts

Measured gaps (bounding boxes, live, 852px viewport):

| Between | Gap |
|---|---|
| `Aug 2026` → `You're invited` | **109px** |
| `days to go` → `The favor of a reply` | **152px** |
| — | |
| `When` → `Tuesday, August 4` | **0px** |
| `Where` → `Backyard` | **0px** |
| `Tuesday, August 4` → `Where` | **4px** |
| `Backyard` → `replies by July 28` | **8px** |

**261px of dead space — 31% of the viewport — while the information a guest actually needs is jammed into 0–8px gaps.** The layout gives its most generous spacing to nothing and its tightest to the facts.

Note the 2026-07-13 audit recorded *"stranded-countdown whitespace resolved"* as **FIXED**. **Measured today, it is not.** The 152px void beneath the countdown is the largest gap on the page. This is precisely why that pass needed a render.

---

## F4 — MED · The same eyebrow is used seven times, and says the same thing twice

Every one of these is the identical role — 11px / 800 weight / ~2px letter-spacing / terracotta `rgb(184,78,30)`:

`An invitation` · `Aug 2026` · `You're invited` · `When` · `Where` · `days to go` · `The favor of a reply`

Two problems:

1. **`An invitation` and `You're invited` say the same thing**, in the same style, 109px apart. One is redundant (Rams: is every element load-bearing? Tufte: kill the redundant signal).
2. **`Aug 2026` duplicates `August 4`.** The month is stated twice.

Seven instances of one style means the style signals nothing. An eyebrow that appears everywhere is not an eyebrow.

---

## ~~F5 — Two messages welded with a middot~~ — **WITHDRAWN. I was wrong.**

I claimed `Be the first to say yes` was a growth nudge welded to the deadline, and that social proof was missing. **Both are false**, and the host caught it.

Social proof is fully resolved, end to end:
- **`backend/app/routers/rsvp.py:211`** computes an anonymized **`goingCount`** — the count only, never names, never the roster. Its own comment states it *"closes the invite's 'zero social proof on backend-resolved events' gap (Partiful's growth mechanic)"*.
- **`InviteV2.jsx:425-445`** reads it (`rosterUnknown` → `goingCount`) and renders **"N going"**; a null count stays silent rather than fabricate a number.
- **Local invites** show real first names *and* the overlapped avatar faces.
- **Zero replies → `Be the first to say yes`.** That is the honest EMPTY STATE, not marketing. The sample event has no RSVPs, so the empty state is what I was looking at — and I mistook it for the feature being absent.

**The per-screen audit's claim that this is "the single highest-leverage 10+ move in the entire report" is STALE.** It shipped. I ported that artifact verbatim, repeated its stale claim, and then built a finding on top of it.

Only the middot remains: on an event that HAS replies, the line reads `replies by July 28 · 6 going`, which is a deadline and a tally sharing one row. That is a typographic nit, not a missing mechanic. Downgraded from MED to **LOW**.

---

## F6 — MED · The deck line is canned, and reads as if the host wrote it

> `Good food, good people`

This is a **default** from the `DECK_LINES` table, selected by event type — but it sits directly under the event name in the host's own typeface, where a guest will read it as *the host's words*. A generic line in the host's voice is a small dishonesty on a surface whose whole job is to feel personal.

---

## F7 — NEW REQUIREMENT · A crab feast invite must ask "are you picking?"

*(Host request, 2026-07-14 — folded in here because it belongs to this surface.)*

We just shipped the fix that makes the crab order size to **pickers**, not heads (`eb8dc81`): declaring 10 pickers on a 24-guest feast moved the order from **21 dozen ($672–$3,948)** to **7.5 dozen ($240–$1,410)**.

But that number is currently the **host's guess**. The people who actually know are the **guests**, and they are already on a form saying yes.

Asking *"Will you be picking crabs?"* on the RSVP turns the single most expensive line item in the flagship event from a guess into **collected truth** — and it costs the guest one tap they'll enjoy answering.

This is the strongest 10+ move available on this surface: it is the only thing here that would make the invite **better than Partiful's**, rather than merely catching up. Partiful has no equivalent — a general-purpose invite tool has no reason to ask.

---

## Ranked fixes

| # | Fix | Sev | Why |
|---|---|---|---|
| 1 | **Render the time.** `dfmt` gains an hour; fall back to the `timeOfDay` bucket ("Afternoon") when no exact time is set; say *"time to come"* honestly if neither exists. | **CRITICAL** | Without it, this is not an invitation. |
| 2 | **Demote the countdown, promote the event.** The name is the hero; the countdown becomes a quiet line (or, following the leader, a "remind me" action). | **HIGH** | One hero per screen; no invented urgency. |
| 3 | **Invert the spacing.** Spend the 261px on the facts; close the two voids. | **HIGH** | The layout currently pads nothing and crushes everything. |
| 4 | **Ask the crab question.** `Will you be picking crabs?` → `crabPlan.crabEatingHeadcount`. | **HIGH** | Turns the biggest line item from a guess into truth. The one move that beats the leader. |
| 5 | **Kill the duplicate eyebrow** (`An invitation` / `You're invited`), and the duplicated month. | MED | Seven uses of one style = the style means nothing. |
| 6 | **Split the deadline from the nudge**; replace `Be the first to say yes` with real counts once they exist. | MED | The leader's actual growth mechanic is the count, not a slogan. |
| 7 | **Prompt the host for their name** so `Hosted by` renders. | MED | Every leader shows who is inviting you. |

Fixes 1–4 are the ones that move the score. 1 and 4 are the ones a guest would notice.

---

## Method note

Rendered at `?rsvp=crab` on the live dev server; every type size, weight, colour and gap above is a computed style or a measured bounding box read from the DOM, not inferred from source. The leader comparison is a **real Partiful event page opened and read on 2026-07-14** — not recalled, per the standing rule that a "vs X" claim requires actually looking at X. Source citations verified in `hostv2/src/InviteV2.jsx` at the lines given.

One claim was **checked and dropped**: the invite *does* carry a street address when the host adds one (`HostShellV2.jsx:4384` appends it to `venue`, and the invite renders `venue + venueCity`). The sample event simply has none. Reporting that as a product gap would have been the same stale-audit error this session spent the day correcting.


---

## Resolution — 2026-07-14 (same day)

### Shipped

| Finding | Outcome |
|---|---|
| **F1 — no time, ever** | ✅ **FIXED.** `lib/eventWhen.js` (zero imports, so the invite pays nothing and there is no second parser to drift). Exact time -> "7:30 PM"; coarse bucket -> "Afternoon"; told nothing -> says nothing. `playbooks` now imports the same reader. |
| **F2 — countdown outranked the event 3.3x** | ✅ **RESOLVED, host's way.** The countdown is a deliberate emotional beat — the thing people screenshot — so the **host ruled it stays at full size** (117.9px). The fix is therefore to **raise the hero, not shrink the number**: the event name went **35.4px -> 43.2px**. The name reads first; the moment still lands. |
| **F3 — spacing rhythm inverted** | ✅ **FIXED.** The void above the reply: **152px -> 34px**. `.inv2-ask` had `margin-top:auto`, which collected every pixel of fixed-canvas slack into one hole — and it GREW to 180px the moment the countdown was shrunk, which is how it was caught. The facts got their rhythm back: label->value **0px -> 3px**, between facts **0px -> 13px**. |
| **F7 — crab-picker question** | ✅ **SHIPPED**, and extended: the invite now also asks the **shellfish allergy outright** (it was collapsed behind progressive disclosure — we were surfacing the question that protects the host's wallet and hiding the one that protects a guest's life); an allergic guest is never counted as a picker; and the **crab order is gated** until allergies are collected. |

### A measurement error in this audit, corrected

**F3 claimed a "109px void at the top." That was wrong.** The measurement walked text leaf-nodes, so the `<img>` crest — the crab artwork — carried no text and its height was recorded as emptiness. It is not dead space; it is the artwork, and it is doing real work.

The real dead space was the **152px above the reply**, and that is what was fixed. Recorded rather than quietly dropped: this audit opened by criticising the previous pass for scoring from source instead of from a render — and then mis-read its own render.

### Still open

- **F4** — one eyebrow role used seven times; `An invitation` (masthead) and `You're invited` (eyebrow) say the same thing; `Aug 2026` duplicates `August 4`.
- **F5** — `replies by July 28 · Be the first to say yes` welds a deadline to a growth nudge. The real fix is the leader's actual mechanic: a genuine count (`48 Going · 59 Interested`), which the per-screen audit already called *"the single highest-leverage 10+ move in the entire report."*
- **F6** — the canned deck line sits in the host's voice.
- **Host name** — `Hosted by` renders only if `hostContact` is set, and nothing prompts the host to set it. Every leader shows who is inviting you.


---

## Postscript — three stale claims in one day

This audit criticised the 2026-07-13 pass for scoring from source instead of from a render. It then:

1. **mis-read its own render** (the "109px top void" is the crab artwork — the measurement walked text nodes and the `<img>` had none), and
2. **repeated a stale claim from the very audit it was correcting** (F5 / social proof, which shipped months of work ago and is live on both the local and backend paths).

Both were caught by the host, not by me. The lesson is the one this codebase spent 2026-07-14 learning in the engine layer, arriving now in the audit layer:

> **A finding inherited from an audit is not evidence. Verify it against the running thing, or do not repeat it.**

The audits are a map of where to look. They are not a record of what is true.
