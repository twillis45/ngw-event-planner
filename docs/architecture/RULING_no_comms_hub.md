# Board ruling — Communication gets NO hub

_Convened 2026-08-07 on the host's question: "host shell doesn't need a different
communications hub. Isn't that going to complicate for the different kind of
hosts / Grandmothers?"_

**Ruling: NO HUB. Unanimous, with one qualified dissent on discoverability.**

Communication is an ACT performed on a row, not a PLACE the host visits.

---

## The question, stated precisely

`doItForMe.js` can draft 26 kinds of message and send none. The obvious shape for
closing that gap is a Communication hub — an inbox/outbox surface listing threads
per vendor and guest. The host asked whether that complicates the product for the
hosts we actually serve.

It does. Here is why, seat by seat.

## Design stars (first, per the method)

**Rams — "less, but better."** A hub is a fifth destination in a four-layer
architecture (L1 Studio → L2 Portfolio → L3 Event Command → L4 Specialist Tabs).
It carries no information that does not already exist on the vendor row and the
guest row. It is a container invented to hold acts that already have homes.
*Refuses.*

**Ive — reduce until only the essential remains.** The essential act is "this
caterer has not come back to me, chase them." That act needs a name, a moment and
a place. It has all three already: the vendor's own row. A hub takes an act that
is one tap from where the host noticed the problem and moves it two taps away, to
a screen where they must find the vendor again. *Refuses.*

**Norman — affordances and lying buttons.** The strongest argument against a hub
is that it would LIE. An inbox implies two-way traffic. We have no inbound
channel at all — no mailbox connection, no reply parsing into threads. A hub
would render an empty right-hand column that the host reasonably reads as "no
replies yet" when the truth is "we cannot see replies." *Refuses, most strongly
of the panel.*

**Luke Wroblewski — progressive disclosure.** A hub is the anti-pattern here: it
front-loads every conversation the host might ever have, at a moment when they
want one. Disclosure should run outward from the row, not inward from a lobby.
*Refuses.*

**Tufte — density.** Would normally argue for a consolidated table. Declines to
here: a message list is not dense data, it is a queue of one-line statuses.
Density belongs on the vendor board, which already has it. *Abstains toward no.*

**Karri Saarinen — opinionated workflow.** *DISSENTS, qualified.* Notes that
without a hub there is no single place to answer "what am I waiting on?" Argues
that the answer must therefore exist SOMEWHERE, and if not a hub then the
readiness surface must carry it explicitly. **This dissent is upheld as a
condition — see below.**

## Event pros + Grandmother (react and OVERRIDE)

**Mindy Weiss** — 40 events a year on a laptop and an iPad. Does not want a
second inbox; already has one, and it is her actual email. A hub competes with
the tool she will keep using no matter what we build. *Refuses.*

**Bryan Rafanelli** — run-of-show and logistics. Wants chase state ON the vendor,
next to the arrival time and the COI, because that is where he is standing when
he notices. *Refuses.*

**Venue Operations** — same, from the dock. The question is never "show me my
messages", it is "is the tent guy coming."

**Grandmother — the deciding voice.** A hub is a room she has to learn exists,
enter, understand, and leave. She does not think of what she does as
"communications" — she thinks "I should call the barbecue man back." A screen
called Messages, sitting empty because we cannot receive any, is precisely the
moment she shuts the laptop. *Refuses, decisively.*

> The precedent is exact: this panel already killed a 3-pane cockpit and a 9-cell
> grid as **"the overwhelm we just escaped, repainted."** A comms hub is that
> same instinct wearing a different label.

---

## The ruling, and its condition

**Communication is an act on a row.** Contact state lives on the vendor. The
chase happens where the host noticed the problem.

**Saarinen's dissent is upheld as a binding condition:** "what am I waiting on?"
must be answerable without a hub. It is answered by the readiness surface naming
silence as a row — which is what `silentVendors()` produces — NOT by a new
destination.

## What this authorises, and what it forbids

**Authorised:**
- `lastContactedAt` written from the vendor row, by the host, recording what they
  did. The engine that reads it has existed all along
  (`vendorAccountability/derive.js:187`) and has been scoring against a field
  nothing ever wrote.
- Silence promoted to a named readiness row once it passes the same 21-day line
  the score already uses, so surface and score cannot disagree.

**Forbidden:**
- Any surface called Messages, Inbox, Comms or Hub.
- Any UI implying we can receive. We cannot.
- Any control labelled "Send" until something actually sends. `CONTACT_SOURCES`
  deliberately omits `sent` for this reason: the app may record `host-logged`,
  `drafted` or `imported`, and nothing may claim more.

## The distinction that keeps it honest

Two sentences that must never merge:

| State | What the app knows | What it says |
|---|---|---|
| **Silent** | host logged contact, 21+ days, no signed contract / paid deposit / confirmed status | "You reached out 24 days ago and haven't heard back." |
| **Unknown** | no contact record at all | "No record of reaching out yet." — never "they ignored you" |

A vendor we never logged is not silent. Conflating those is the dishonesty this
whole thread exists to avoid, and it is why `contactState()` returns `known:false`
rather than pretending zero means never.
