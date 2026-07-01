# The Invite / RSVP Information Model

**Status:** Spec — review-board discussion captured for build
**Product:** NGW Event Boss (repo `ngw-event-planner`)
**Scope:** Host persona (Ruthless Host Lens). Grounded in the existing draft-and-share and playbook infrastructure — this is a data-model + surfacing spec, not a new engine.
**Related:** `src/lib/doItForMe.js` (drafting), `src/lib/playbooks/index.js` (derivation), `src/lib/dates.js` (deadlines), Do-It-For-Me doctrine, Comms-Frozen doctrine.

---

## 1. The reframe: an RSVP is a two-way information contract

An invitation is not a one-way announcement and an RSVP is not a single yes/no. It is a **two-way information contract**. Information flows in both directions, and each direction is its own list with its own owner:

| Direction | Owner of the answer | What it is |
|-----------|---------------------|------------|
| **IN** — collect FROM guests | the guest | the facts the host needs to plan correctly (who's coming, how many, what they can't eat) |
| **OUT** — tell guests | the host / the app | the facts the guest needs to show up right (when, where, what to bring, what to wear) |

Today the product treats the invite as OUT-only (`draftInvite`) and the roster as a place the host manually types IN. The reframe: **model both lists explicitly**, derive as much as possible, and let the guest fill the IN list themselves so the host stops chasing it in a group text.

The whole thesis: **the host should choose 2–3 things; the app drafts the rest; the guest supplies the facts only the guest knows.**

---

## 2. Collect FROM guests (the IN list)

The minimum honest set. Every field maps to something the engine already consumes.

| Field | Type | Required? | Feeds |
|-------|------|-----------|-------|
| **Attending?** | `Yes` / `No` / `Maybe` | required | `guests[].rsvp` → `attendanceBand()`, `guestCountResolved()` |
| **Head count / +1** | integer (self + guests they bring) | required when +1 policy allows | headcount → `sizingGuests()`, food/seating/budget |
| **Dietary / allergies** | free text | optional | `guests[].needs` → `dietaryResolved()`, `draftDietaryNote()` |
| **Note to host** | short free text | optional | display-only ("running late," "so happy for you") |
| **Mailing address** | postal address | **conditional — OFF by default** | thank-yous / favors / paper invites only (see §4) |

Design rules for the IN list:
- **Map to existing guest shape.** A guest today is `{ name, rsvp, needs }`. Attendance → `rsvp` (the band reader already normalizes `yes/attending/accepted`, `maybe`, `no/declined/regret`, and blank=pending). Dietary → `needs` (already read by `dietaryResolved` at index.js:365 and `draftDietaryNote`). No new normalization layer.
- **Never require what you don't need.** Address is never in this set by default. Note-to-host is optional and display-only.
- **The reply grows the headcount that sizes everything.** This is why RSVP capture is the highest-leverage IN field — `attendanceBand` → `sizingGuests` → food plan, seating, budget all move off it.

---

## 3. Tell guests — the "Guest brief" (the OUT list)

Everything a guest needs to arrive correctly and comfortably. This is a superset of today's `draftInvite` + `draftDayBeforeDetails`. Each line is either **derived** (the app fills it) or a **host override** (the host chose it).

| Brief line | Derived from | Host override field |
|------------|--------------|---------------------|
| **When** | `event.date` + `event.startTime`/`timeOfDay` (`fmtLongDate`, `timePhrase`) | — |
| **Where** | `event.venue` (`placePhrase`, `localityAnchor`) + Maps/rideshare link | — |
| **Parking / rideshare** | venue type + `isAtHome()` (backyard/home → "street parking," "rideshare drop at the door") | `event.guestBrief.parking` |
| **What to bring** | playbook (potluck/BYO signal, `event.giftWish` if potluck) | `event.guestBring` / `whatToBring` / `bringNote` (already read by `draftDayBeforeDetails`) |
| **Gift / registry wish** | `event.giftWish` (§5) | `event.giftWish` |
| **Dress / vibe** | playbook + venue (backyard July → "backyard casual") | `event.guestBrief.dress` |
| **Arrival window** | `startTime` + playbook (come-anytime vs seated-start) | `event.guestBrief.arrival` |
| **Kids & plus-ones policy** | `event.plusOnePolicy`, `event.kidsPolicy` (§6) | those fields |
| **Day-of contact** | host profile name/number | `event.guestBrief.contact` |
| **Weather / rain plan** | live weather window + `playbookContingencyForWeather()` (already authored) | `event.guestBrief.rainPlan` |
| **Accessibility** | venue signal (stairs/step-free unknown → omit, never guess) | `event.guestBrief.accessibility` |

Rules for the OUT list:
- **Tone follows the occasion.** Reuse `inviteVoice()` — a somber event (`SOMBRE_RE`) never gets "🎉 come celebrate," never a festive brief. This guard already exists and must gate the brief.
- **Never invent a fact.** If parking/accessibility can't be derived and the host didn't set it, the line is omitted — exactly how `draftDayBeforeDetails` only prints a `bring` line when one really exists. No "ample parking available" hallucinations.
- **The brief is one artifact, progressively revealed.** Invite (headline + when/where + RSVP link) is the short form; the full brief is what `draftDayBeforeDetails` becomes.

---

## 4. Guest addresses = NO by default

Collecting mailing addresses from every guest is a privacy cost and an RSVP-friction cost (it's the field that makes people abandon the form). **Address is never a default field.**

**The gate.** Address collection turns on ONLY when the host opts into an outcome that actually needs it:

```
event.collectAddresses === true   // explicit host opt-in, default false/undefined
```

The host reaches that opt-in through a concrete intent, never a generic setting:
- "I want to mail thank-you cards" → enables address on the RSVP.
- "I'm sending favors / gifts by mail."
- "I'm sending formal paper invitations" (the address is needed *before* the invite, so this is a pre-RSVP address-book flow, not RSVP capture).

Rules:
- Default is **off**. `collectAddresses` unset ⇒ the address field never renders on the guest RSVP and never appears in the guest object.
- When on, the field is **clearly optional to the guest** and framed with the reason ("So we can mail you a thank-you"). Presence-first tone, no dark pattern.
- The address lives on the guest record only when supplied: `guests[].mailingAddress` (absent otherwise). Never a required column, never surfaced in the roster unless the host is in a mail flow.

---

## 5. Gift giving — a host "gift wish"

Guests always wonder "do I bring something, and what?" The host answers once; the app puts it plainly on the invite. One field, a small preset list:

```
event.giftWish = {
  mode: 'registry' | 'no_gifts' | 'charity' | 'potluck' | 'contribution',
  detail: string,   // link / cause name / dish-assignment note / $ per head
}
```

| Preset | Reads on the invite as | `detail` holds |
|--------|------------------------|----------------|
| **Registry (link)** | "Registry: [link]" | the registry URL |
| **No gifts** | "Your presence is the gift — no gifts, please." | — |
| **Charity / fund** | "In lieu of gifts, a donation to [cause] means the world." | cause name / link |
| **Bring a dish (potluck)** | "Potluck — bring a dish to share." (feeds "what to bring") | optional dish assignment |
| **Contribution ($/head)** | "We're splitting costs — ~$[X]/person." | dollar amount |

Rules:
- **Default = unset ⇒ the invite says nothing about gifts.** Silence is honest; we don't nudge people to bring gifts.
- **Potluck cross-wires** to the "what to bring" brief line (§3) and, where a playbook supports it, to the food plan's expectation that guests cover some dishes.
- **Somber events**: `giftWish` defaults to charity/none framing; never "registry," never "contribution."

---

## 6. RSVP instructions — mostly derivable

The instructions block on the invite is almost entirely derivable; the host confirms it.

| Instruction | Derivation | Override |
|-------------|-----------|----------|
| **RSVP deadline** | `event.rsvpDeadline` if set, else **derive T-1 week** from `event.date` (see below) | `event.rsvpDeadline` |
| **+1 policy** | `event.plusOnePolicy`: `'named_only'` / `'plus_one_ok'` / `'no_plus_ones'` (default `named_only`) | host picks |
| **Kids welcome** | `event.kidsPolicy`: `'kids_welcome'` / `'adults_only'` / `'unset'` | host picks |
| **Note allergies** | always shown when dietary capture is on: "Let us know any allergies." | — |

**Deriving the deadline** (reuse `src/lib/dates.js`, add no new date math):
- Default deadline = **event date − 7 days**. Compute with the same local-midnight model as `daysUntil`; a helper `rsvpDeadlineFor(event)` returns the ISO date 7 days before `event.date`.
- Clamp: if the event is <7 days out, the deadline is "as soon as you can" (surface via `eventDateStatus` — a `soon`/`rushed`/`tomorrow` event drops the hard date).
- The RSVP-chase nudge (`draftRsvpChase`) keys off this deadline for its timing.

---

## 7. The NGW engine angle — derive the brief, host confirms

The core leverage: **most of the guest brief is derivable from event facts + the matched playbook.** A "backyard crab feast in July" already implies:

- **Dress:** backyard casual (venue = home/backyard via `isAtHome`; playbook = crab feast).
- **Bring:** a chair / a cooler (playbook `crabFeast` BYO signal).
- **Rain plan:** the already-authored `playbookContingencyForWeather()` output.
- **Parking:** street parking (at-home signal).
- **What to eat around:** dietary handling already flows through `dietaryResolved`.

So the flow is the **Do-It-For-Me pattern** (doItForMe.js), extended:

1. The app **drafts the entire guest brief** from `event` + playbook + weather — a new `draftGuestBrief(event, profile, opts)` sibling to `draftInvite` / `draftDayBeforeDetails`, honest-empty on anything it can't derive.
2. The host **confirms and shares** in one tap (`shareOrCopy`), exactly like every existing draft.
3. The host only **chooses the 2–3 non-derivable things**: gifts (`giftWish`), any *unusual* dress ("black tie" — not derivable), and the +1/kids policy. Everything else is pre-filled and editable.

This keeps the host's job tiny and the brief complete. It reuses the invention guardrails already in `doItForMe.js`: never a fabricated fact, tone gated by `inviteVoice`, empty lines simply omitted.

---

## 8. Proposed data model

Additions to the event object. **Stored** = host chose it or a guest supplied it; **Derived** = computed at render, never persisted.

### Stored on `event`

| Field | Shape | Default | Notes |
|-------|-------|---------|-------|
| `giftWish` | `{ mode, detail }` (§5) | unset | unset ⇒ invite silent on gifts |
| `plusOnePolicy` | `'named_only'\|'plus_one_ok'\|'no_plus_ones'` | `'named_only'` | drives head-count capture |
| `kidsPolicy` | `'kids_welcome'\|'adults_only'\|'unset'` | `'unset'` | omitted from brief when unset |
| `rsvpDeadline` | ISO `YYYY-MM-DD` | derived (T-7d) | override only |
| `collectAddresses` | boolean | `false` | the §4 gate |
| `guestBrief` | `{ parking?, dress?, arrival?, contact?, rainPlan?, accessibility? }` | `{}` | **overrides only** — each key omitted ⇒ derive or omit |

`event.guestBring` / `whatToBring` / `bringNote` already exist and are already read by `draftDayBeforeDetails` — reuse, don't duplicate.

### Stored on each `guests[]` entry

| Field | Shape | Default | Notes |
|-------|-------|---------|-------|
| `rsvp` | `'Yes'\|'No'\|'Maybe'\|''` | `''` (pending) | **exists** — feeds `attendanceBand` |
| `needs` | string | `''` | **exists** — dietary/allergies |
| `headcount` | integer | `1` | self + any +1s (only when policy allows) |
| `note` | string | `''` | **new** — display-only note to host |
| `mailingAddress` | string | absent | **new, conditional** — only when `collectAddresses` |

### Derived at render (never stored)

| Derived value | Source |
|---------------|--------|
| RSVP deadline (when not overridden) | `event.date − 7d` via dates.js |
| Attendance band / plan-to number | `attendanceBand()`, `sizingGuests()` |
| Dietary summary for brief/cook | `dietaryResolved()`, `draftDietaryNote()` |
| Dress / parking / bring / rain-plan defaults | playbook + `isAtHome()` + `playbookContingencyForWeather()` |
| Invite tone (festive vs somber) | `inviteVoice()` / `SOMBRE_RE` |

---

## 9. Build sequence

Phased so each phase ships value alone and reuses existing infra.

### P1 — Host-choice fields + derived brief draft (no guest-facing capture)
- Add the stored `event` fields (§8): `giftWish`, `plusOnePolicy`, `kidsPolicy`, `rsvpDeadline`, `guestBrief` overrides.
- Add `rsvpDeadlineFor(event)` to `src/lib/dates.js` (T-7d, clamped).
- Add `draftGuestBrief(event, profile, opts)` to `src/lib/doItForMe.js` — derives the full OUT list, honest-empty, tone-gated by `inviteVoice`. Host confirms + shares via existing `shareOrCopy`.
- **Reuses:** `draftInvite`, `draftDayBeforeDetails`, `placePhrase`, `isAtHome`, `playbookContingencyForWeather`, `inviteVoice`.
- **Outcome:** host answers 2–3 questions; app produces a complete, shareable brief. Zero backend.

### P2 — Guest-facing RSVP capture (dietary + attendance + +1)
- Hosted RSVP page captures `rsvp`, `headcount`, `needs`, `note` → writes back to `guests[]` (the `rsvpUrl` loop `draftInvite`/`draftRsvpChase` already reference).
- Head-count capture respects `plusOnePolicy`; allergies prompt respects the "note allergies" instruction.
- **Reuses:** the existing guest shape, `attendanceBand` normalization (no new states), `draftRsvpChase` for nudges keyed to `rsvpDeadline`.
- **Outcome:** replies flow back and size food/seating/budget automatically — the host stops chasing the group text.

### P3 — Conditional address collection
- Behind `collectAddresses` (§4). Host enables via a mail-intent flow (thank-yous / favors / paper invites).
- Optional field on the RSVP page, reason-framed; writes `guests[].mailingAddress` only when supplied.
- **Outcome:** addresses collected *only* when a real mailing outcome needs them.

---

## 10. What NOT to build

- **No address-by-default.** Never a standing field. Gated on `collectAddresses` + a concrete mail intent (§4).
- **No guest accounts / logins.** RSVP is a link, not a signup. No guest identity system, no passwords.
- **No in-app messaging backend.** Everything stays **draft-and-share** per the Comms-Frozen doctrine: the app writes the message, the host sends it from their own phone (`shareOrCopy`). No send infrastructure, no inbox, no delivery tracking.
- **No CRM bloat.** Ruthless Host Lens: no "guest engagement score," no segments, no lifecycle stages, no invented no-show percentages, no fabricated parking/accessibility facts. The host sees ~3 choices, not a console.
- **No new headcount / dietary system.** Reuse `attendanceBand`, `sizingGuests`, `dietaryResolved`, the existing `{ name, rsvp, needs }` guest shape. Never fork the engine.
- **No festive template on somber events.** The `SOMBRE_RE` / `inviteVoice` guard governs the brief the same way it governs the invite.

---

## Summary — the thesis

An RSVP is a two-way information contract: facts the host needs flow **in** (attending, head count, dietary — mapped to the guest object the engine already reads), and facts the guest needs flow **out** as a single "guest brief" (when, where, bring, dress, gifts, rain plan, contact). Almost the entire brief is **derivable** from event facts plus the matched playbook, so Event Boss **drafts it** (the Do-It-For-Me pattern, honest-empty, tone-gated), the host **confirms and shares** in one tap, and the host personally chooses only the 2–3 things a machine can't know — gifts, unusual dress, and the +1/kids policy. Addresses are collected only behind an explicit mail-intent gate, everything stays draft-and-share (no messaging backend, no guest accounts, no CRM), and no new engine is introduced: the model is a thin set of stored host-choice fields plus derivation over `doItForMe.js`, `attendanceBand`, and `dates.js`.
