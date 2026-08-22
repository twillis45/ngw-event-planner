# Guest Transport -- Review Board Ruling

Date: August 21, 2026
Stage: 2 (scope and design)
Surface: hostv2, facing public, mobile-flagship web at 390px, OUTWARD-FACING
Question: Should the app send guest-directed messages itself, and if so, what
exactly may it do and claim?
Prior reading: `docs/audits/2026-08-21_COMMS_OUTLET_RULING.md` (6-0, created the
send ledger), `src/lib/sendLedger.js`, `docs/claude-skills/ui-ux/UX_07_CTA_TRUTHFULNESS.md`

---

## THE RULING

DEFER guest transport, and ship a different slice in its place. The board finds
that the product does not have a transport gap with guests -- it has a LEDGER
gap with guests, and the two were confused because the vendor path happens to
have both. The app already reaches every addressable guest today through
`mailto:`/`sms:`/`tel:` rails on the roster row (`hostv2/src/HostShellV2.jsx:19003-19022`),
and those rails record NOTHING, so the ops question the whole outlet exists to
answer -- "who did I tell, when, and did they answer" -- is unanswerable for the
one audience that matters most. Meanwhile the ONE transport the app owns is
measured dead: zero of 126 seeded vendors carry an email address, and exactly one
of 24 draft surfaces in hostv2 passes a `vendorId` at all
(`hostv2/src/HostShellV2.jsx:17914`), so the "Send it to ..." button
(`:15570-15577`) can render on 1 of 24 drafts and does so for no seeded event.
Building a second, wider, outward-facing pipe on top of a first pipe that has
never fired in anger, from a young shared domain, with no proven webhook and no
unsubscribe of any kind, is the failure mode UX_07 opens by naming. What ships
instead: per-recipient handoff recording on the guest rails that already exist,
a roster-level "told / not told" read, and the vendor-email intake that makes
the existing send button reachable. Guest sending is revisited only when the
five preconditions in answer 8 are all met.

**Vote: 6-2 to defer guest transport at the stated scope.**

**Dissent, by name:**

- **Mindy Weiss -- REJECT the scope as too small.** Holds that a planning tool
  that makes a host tap 80 times is not a planning tool, that the deferral
  protects the app's reputation at the host's expense, and that the board should
  have ruled for a batched guest send behind a hard cap rather than none.
- **Karri Saarinen -- REJECT the area entirely, in the other direction.** Would
  not defer guest transport; would DELETE the vendor send path too and take the
  product out of the mail business permanently. Votes no because a deferral
  keeps a door open he believes should be closed and gated.

**Concurring with conditions:** the deliverability seat votes yes only if the
vendor path gains a `reply_to` before any further send work; if that condition
is dropped at build time the vote is recorded as a no (see seat 8).

---

## THE MEASURED BASE

Everything below stands on these numbers. They were taken today, not assumed.

**Draft surfaces reachable in hostv2: 24 distinct `openDraft` titles**, produced
by 21 exported generators in `src/lib` (20 `draft*` in `src/lib/doItForMe.js`,
plus `guestRainMessage` in `src/lib/weather.js`), two local branches of
`rainNoteFor` (`hostv2/src/HostShellV2.jsx:2383-2400`), and one lodging-listing
share (`:13044`). `draftVendorBriefAsk` (`doItForMe.js:849`) is NOT imported by
hostv2 (`HostShellV2.jsx:40`) and is CRA-only -- it is not in the 24.

By addressee class:

| Class | Count | Drafts |
|---|---|---|
| Guest-directed | 13 | Your invite (`:19069`), The guest brief (`:19073`), Update to everyone (`:19074`), The RSVP nudge (`:19083`), Rain note to guests (`:6008`, `:9809`, `:15393`, `:19285`), Day-before details (`:8878`), Parking instructions (`:10244`, `:10788`), The where-to-stay note (`:13352`), The getting-around note (`:13527`), The getting-here note (`:13778`), lodging listing share (`:13044`), The recap (`:10977`), The thank-you (`:10975`, mixed guest+helper) |
| Vendor-directed | 6 | Note to <vendor> (`:17891`), Ask <vendor> for their arrival time (`:17633`), Reconfirm -- <vendor> (`:15081`), Payment reminder (`:17893`), Weather note to vendors (`:15395`), Dietary note (`:16182`, addressed to the cook/caterer) |
| Helper-directed | 3 | Everyone's part today (`:10239`), Heads-up for your helpers (`:15394`), the per-helper confirm queue (`:4583`, `draftHelperConfirm`) |
| Host-only (not outbound) | 2 | Your toast (`:14318`), Your shopping list (`:16304`, `:16393`) |

**Addresses, in the seeded corpus (`src/data/*.js`):**

- Guests: **199 of 212 carry an email** (94%). Every event in
  `sampleEventsDMV.js` and `sampleEventsExtra.js` seeds 7-8 guests with 7-8
  emails. The flagship persona is the exception: `wandaGoldEvent.js:57-65` seeds
  9 guests and **0** emails.
- Vendors: **0 of 126 carry an email.** The vendor `contact` field holds a
  person's NAME, not an address (`wandaGoldEvent.js:72` -- "Hank Delgado, Post
  Quartermaster").

**Consequence of those two rows, and it is the finding of this sitting:** the
`emailTarget` gate (`:15468-15480`) requires `sheet.vendorId` AND a
regex-valid `v.email` AND `isCommApiConfigured()` AND `session`. `vendorId` is
passed by exactly one call site of twenty-four (`:17914`). No seeded vendor has
an email. **The send button the app already owns renders on zero seeded events.**
The audience with 94% address coverage is the one the app refuses to send to.

**Webhook:** `/api/resend-webhook` exists (`backend/app/main.py:131`) and maps
`email.delivered`/`bounced`/`complained` (`:120-128`), but
`RESEND_WEBHOOK_SECRET` is optional and the handler logs a warning and proceeds
unverified when it is unset (`:159-160`). Nothing in the repo proves the endpoint
is registered in the Resend dashboard. `delivered` therefore cannot honestly
exist for anything, exactly as `sendLedger.js:63-64` already records.

**Consent:** grep for `unsubscribe` across `backend/app`, `src/lib`, and
`hostv2/src` returns exactly one hit, and it is a Supabase realtime
`sub.subscription.unsubscribe()` (`HostShellV2.jsx:1565`). There is no
unsubscribe, no suppression list, no consent record, and no `List-Unsubscribe`
header anywhere in the product.

---

## THE SEATS

### 1. Don Norman -- affordances and error prevention (central seat)

There is a truthful send button. It is the one already shipped, and its copy is
the best in the codebase: `sendStateLine` returns "Accepted by the mail service"
(`sendLedger.js:100`) and the module's own comment pins the reason -- "an sms:
tap proves the composer opened, nothing more" (`sendLedger.js:15-16`). That is a
system that has already thought about this harder than most shipping products.

So my objection is not to the words. It is to the affordance the words sit on.
`:15570` renders "Send it to bethany@caterer.com" as a `.cta` -- primary
styling, which UX_07's treatment table reserves for DONE and DEEP HANDOFF only.
The state that follows is `accepted`, which is Level 1 DONE for the mail
service and Level 6 STUB for the guest, and the host cannot tell those apart from
a green filled pill. With guests that gap becomes catastrophic in a way it never
is with vendors, because a vendor who does not hear from you calls you. A guest
who does not hear from you simply does not come, silently, and the host learns it
at the door.

The board already wrote the rule I would write: "MUST NOT SHIP: 'Delivered'
before the Resend webhook says so" (COMMS_OUTLET_RULING clause 4). I am not
asking to reopen it. I am observing that "Accepted by the mail service" is
tolerable for a caterer who will be chased anyway, and is NOT tolerable as the
terminal state of an invitation, because there is no downstream error-recovery
loop for a guest. Error prevention requires that the system either detect the
failure or make the user's mental model match reality. With no webhook we can do
neither. Defer.

One thing I want fixed regardless of the ruling: `sendEmailNow` (`:15493-15505`)
does not pass `reply_to`. The backend accepts it (`communication.py:349`,
`emailer.py:118`) and the frontend never sets it. Every message the app has ever
sent invites a reply into a shared platform address that nobody reads. That is
already live and it is already wrong.

### 2. Luke Wroblewski -- mobile-first and forms

I was asked whether the address-collection cost is bigger than the sending win.
The measurement says the question is wrong: the addresses are already there. 199
of 212. The intake exists and works -- an email `input` sits on every roster row
(`:18986-18987`), typed, `aria-invalid` wired, writing through `writeGuest`. This
is not an unsolved forms problem.

What IS a forms problem is the one nobody named. At 390px that row already
carries phone (max 140px), email (max 185px), and group (max 120px) in a
flex-wrapping strip. Adding any per-recipient send state to that row -- a chip, a
checkbox, a spinner -- is the fourth thing in a track that is already wrapping to
three lines on a phone. If the board ships per-guest recording, the state belongs
in the existing `actions-row` beneath the row (`:19004`, `:19008`), not in the
field strip, and the roster-level rollup belongs above the list, not repeated 80
times.

The other forms fact: the 13 seeded guests without an email are not evenly
distributed. Nine of them are the flagship Wanda roster
(`wandaGoldEvent.js:57-65`), which has 0 of 9. So the demo event a host is most
likely to see first is the one where a guest-send feature would render nothing
at all. Whatever ships must read correctly at zero addresses, and the app already
has that sentence written (`:19118`: "None of the quiet ones left a phone or
email"). Reuse it; do not write a second one.

I vote to defer transport. I do not accept the framing that collection is the
blocker. It is not. Deliverability and consent are the blockers, and hiding
behind a forms excuse would let us skip them.

### 3. Karri Saarinen -- opinionated workflow (DISSENT: reject, not defer)

What does the app uniquely add by owning the pipe? Nothing. That is the entire
argument and I am not going to dress it up.

The host's own thread has three things this product will never have: their
relationships, their history, and their deliverability. When Gloria's phone shows
a text from her daughter it opens. When it shows an email from
`events@` at a domain she has never seen, carrying the footer "-- Sent via NGW
Events" (`communication.py:341`), it is a marketing email and it is treated like
one. We would be taking a message that arrives with a lifetime of trust behind it
and stripping the trust off it in exchange for a status row in our database.

The product's real position is already written down and it is a good one:
`draftGuestUpdate`'s header says "Editable in the existing DraftSheet before the
host copies/sends -- never auto-sent" (`doItForMe.js:888`), `draftParkingInstructions`
says "nothing here is sent anywhere" (`:946`). Twenty-four surfaces, one voice.
That voice IS the opinion. We write, you send, we remember. It is defensible,
it is differentiated, and it is the only version of this that a host describes
correctly to a friend.

I dissent from a deferral because a deferral is a promise to do it later. I would
close it: delete the vendor send path, keep the ledger, and make the app's
position permanent rather than provisional. Every quarter this door stays ajar,
someone reopens it.

### 4. Mindy Weiss -- high-volume delegation (DISSENT: reject, too small)

How does a planner actually reach eighty guests? They do not. The client does,
from the client's own list, or a stationer does, or an Evite-class tool does. The
planner reaches the twelve people who make the day happen and never touches the
guest list. So on the narrow question -- would a planner route guest comms
through a planning tool -- the honest answer is no, and I would concede that
point if this were a planner tool.

It is not. It is a host tool, and the host IS the client. She is the one with the
list, and she is doing this once, at night, on her phone. Telling her to tap
"Email Gloria" eighty times, from eighty separate rows, in a roster that wraps to
three lines each at 390px, is not a product decision -- it is a refusal dressed
as restraint. Blink does not make you do that. Nobody makes you do that.

Where I agree with the majority: the vendor path is dead and that is
embarrassing. Zero of 126 vendors have an address. The board should be
mortified that the transport it already ruled for, and built, has never been
able to fire.

Where I break: the correct ruling was a capped batch -- one send, one recipient
list, a hard ceiling around twenty-five, the host's own reply-to, an unsubscribe
line, and a per-recipient state row. That is buildable and it is honest. What is
being shipped instead is bookkeeping. The host does not lie awake wondering
whether she told Gloria. She lies awake because she has not told anyone yet. I
record a dissent.

### 5. Bryan Rafanelli -- day-of production

Day-of changes the answer, and it changes it toward the majority, not away.

The day-of guest drafts are the ones with teeth: "Rain note to guests"
(`:15393`, `weather.js:470`), "Parking instructions" (`:10244`), "Day-before
details" (`:8878`). These are the messages where a failure has a physical
consequence -- someone parks in the wrong lot, someone stands in the rain, someone
arrives at the old start time. And these are exactly the messages where email is
the wrong channel regardless of who owns the pipe. Nobody checks email at 4pm on
the day. The app's own day-of surfaces already know this: the roster rails offer
`sms:` and `tel:` before `mailto:` (`:19019-19021`), in that order.

So my position is: on the day, the app must not send, and it must not need to.
What it owes the host on the day is the fastest possible path to the phone's own
Messages app with the right words in it, and a record that it happened. That is
what exists. Do not put an email button on a rain note. If anything, the day-of
build should make `sms:` the primary and demote `mailto:` on those three drafts.

One thing I will not sign: any deferred, scheduled, or queued send. On the day,
a message that goes out ten minutes after the host changed her mind is worse
than no message. The existing ruling already bans scheduled send (clause 4) and
this sitting reaffirms it without qualification.

### 6. "Grandmother" -- first-timer archetype (DECISIVE)

I was asked whether "sent" means sent. I want to answer a smaller question first,
because it is the one that decides it.

If I press a button that says "Send it to Gloria," and it goes green, I have
told Gloria. That is what I will believe. I will not read "Accepted by the mail
service." I do not know what a mail service is. I will see green, and green means
done, and I will stop thinking about Gloria. Six weeks later Gloria does not come
to my granddaughter's graduation, and she is hurt, and I find out that the
message went into a folder called Promotions that I have never opened in my life.

That is not a bug I would report. That is a thing I would never forgive. And I
would not blame the mail service. I would blame me, and then I would blame the
app, and then I would tell everyone I know that it does not work.

Now the part that surprised the room. Nobody has to build me anything for me to
be safe. When I press "Text Gloria" and my own Messages app opens with the words
in it, I can SEE it happen. I press send myself. It is in my thread with her
forever. If she does not answer I can look. That is not a worse product. That is
the only version I understand.

So: the app should not send to my guests. What it should do is remember. Right
now, if I text all forty people on Tuesday, on Wednesday the app does not know I
did it, and it asks me again, and I sit there trying to remember whether I got to
Marcus. That is the thing that is actually hard. Fix that. Do not give me a green
button I will misread once and never trust again. **I vote to defer, and I want
the remembering built now.**

### 7. Privacy and consent practitioner (archetype)

The guest never signed up for anything. That single fact governs everything here,
and the product currently has no machinery for it whatsoever: one grep for
`unsubscribe` across the backend, `src/lib`, and `hostv2/src` returns a Supabase
realtime teardown (`HostShellV2.jsx:1565`) and nothing else. No suppression list.
No consent field on the guest record. No `List-Unsubscribe` header in
`emailer.py:33-38`. No record of where an address came from -- `csvParsers.js`
will import a spreadsheet of a hundred strangers with no provenance at all.

The distinction that matters is between a message the host sends and a message a
platform sends. When Wanda emails Gloria from her own account, that is
correspondence, and no regime in the US or EU treats it as anything else. The
moment `events@` on our domain puts the same words in Gloria's inbox with our
footer on it, we are a sender, and we have obligations Wanda never had and never
agreed to take on. Under CAN-SPAM, transactional and relationship messages get
real latitude -- an invitation to an event a person is actually invited to
plausibly qualifies -- but "plausibly qualifies" is not a thing to build an
outward-facing feature on when the alternative costs the host one tap.

What the app must refuse, today, regardless of this ruling:

- Never send to an address the host did not personally enter or import. No
  enrichment, no lookup, no inference from a name.
- Never use a guest address for anything other than the one event it was entered
  for. No cross-event address book, no reuse when the host creates event two, no
  "people you've invited before."
- Never expose one guest's address to another guest. That means no plural `to:`
  and no `cc:` ever -- if a batch is ever built, it is per-recipient sends, not
  one message with a visible list.
- Never retain a guest address after the event's data is deleted.

If guest sending is ever built, the one-event obligation is not a preference
center. It is: a real unsubscribe link in every guest-directed message, a
suppression list keyed to the address that survives the event's deletion,
`List-Unsubscribe` on the header, and a host-visible line saying that a
suppressed guest will not receive further messages from the app. That is not a
week of work, and it is the floor, not the polish. I vote to defer.

### 8. Deliverability practitioner (archetype)

The technical case is short and it is the strongest reason on the table.

Everything the product sends leaves from one address on one domain
(`COMMUNICATION_EMAIL_FROM`, `config.py:12`, defaulting to `events@example.com`
when unset). That domain is young and has, by the board's own measurement, sent
essentially nothing -- zero seeded vendors have addresses, so the vendor path has
had no volume to build a reputation with. A young domain with no history that
begins emitting 80-recipient event blasts is the exact profile that filters are
built to catch. First it goes to Promotions. Then, after the first few complaints
-- and there will be complaints, because guests did not sign up and there is no
unsubscribe, so the only available button is "report spam" -- it goes to spam
outright, for everyone, on that domain.

That is the part the board must understand: the reputation is shared. There is
one `from`. A guest blast that draws complaints does not degrade guest delivery.
It degrades the DOMAIN, which means the vendor path -- the one transport this
product actually depends on, the one with the confirm-back loop behind it -- goes
to spam too. We would be spending the only sending asset we have on the audience
least likely to tolerate it. Guest sending does not sit beside the vendor path.
It endangers it.

Minimum bar before guest sending is technically discussable: a separate sending
subdomain for guest-class mail so the two reputations cannot poison each other,
SPF/DKIM/DMARC verified on it, `List-Unsubscribe` and `List-Unsubscribe-Post`
honored, the Resend webhook PROVEN live with `RESEND_WEBHOOK_SECRET` set (today
the handler explicitly proceeds unverified, `main.py:159-160`), bounce and
complaint handling that writes to a suppression list, and a warmed volume ramp.
None of that exists.

My concurrence carries one condition and it applies now, not later:
`sendEmailNow` (`:15493`) never sets `reply_to`, so every message the app has
ever sent asks the recipient to reply to an unmonitored shared address. That is
both a deliverability signal and a broken product. Fix it in this slice or record
my vote as a no.

---

## THE EIGHT ANSWERS

1. **Ship, defer, or reject.** DEFER guest transport. SHIP, in its place, a
   three-part slice that contains no new transport: (a) per-recipient handoff
   recording on the guest rails that already exist
   (`HostShellV2.jsx:19003-19022`); (b) a roster-level told/not-told read; (c)
   the vendor-email intake plus `reply_to`, which makes the ALREADY-RULED
   vendor send reachable for the first time. Nothing outward-facing is added.

2. **Which generators may send, by addressee class.** Of the 24 draft surfaces
   measured above:
   - **Vendor-directed (6): MAY send**, unchanged from the prior ruling --
     known address, one at a time, review-then-send. Today only 1 of the 6 is
     even eligible, because only `Note to <vendor>` (`:17914`) passes
     `vendorId`. This slice extends `vendorId` to the other five
     (`:15081`, `:17633`, `:17893`, `:16182` when the dietary note is addressed
     to a booked vendor; `:15395` "Weather note to vendors" stays ineligible --
     it has no single recipient and a multi-vendor send is bulk by another name).
   - **Helper-directed (3): MAY NOT send.** Not on principle -- on measurement.
     Helpers are derived from `timeline.owner` name strings
     (`src/lib/helperResponsibility.js`); there is no helper record and no
     address field anywhere to send to. There is nothing to build.
   - **Guest-directed (13): MAY NOT send.** This is the deferral. All 13 keep
     their existing exits: share sheet, `sms:`, `wa.me`, copy, and the per-guest
     `mailto:`/`sms:`/`tel:` rails.
   - **Host-only (2): not applicable.** `Your toast` and `Your shopping list`
     are not addressed to anyone and must never grow a send control.

3. **What the app may CLAIM at each state.** Exact copy, ASCII rendering; the
   live strings in `sendLedger.js:96-107` use typographic punctuation and that
   is correct in code.

   | State | Who owns it | Exact copy |
   |---|---|---|
   | no entry | -- | (no chip renders) |
   | `handed_off`, share | host | `Handed off from your share sheet - 6d ago` |
   | `handed_off`, sms | host | `Handed off by text - 6d ago` |
   | `handed_off`, email rail | host | `Handed off by email - 6d ago` |
   | `handed_off`, copy | host | `Handed off copied to send - 6d ago` |
   | `handed_off`, other | host | `Handed off yourself - 6d ago` |
   | `sending` | system | `Sending...` |
   | `accepted` | system | `Accepted by the mail service - 2m ago` |
   | `failed` | system | `The email didn't go out - 2m ago - nothing was sent` |

   `delivered` and `bounced` MUST NOT render until `RESEND_WEBHOOK_SECRET` is
   set in production AND a real inbound webhook has been observed updating a
   message row. `accepted` is the ceiling. The word "Sent" appears nowhere, in
   any state, for any class -- the existing copy test in `sendLedger.test.js`
   pins this and must be extended to cover the new per-guest strings.

   New copy this slice introduces, on the guest rails:
   - The record affordance beneath a guest row, after the OS composer opens:
     `Mark it sent to Gloria - I sent it myself`
   - The roster rollup, above the list: `Told 24 of 41 - 17 still to tell`
   - When nobody has been told: `Nobody marked told yet - the app remembers as
     you go`
   - When there are no addresses at all: reuse the existing sentence at
     `:19118` verbatim. Do not write a second one.

4. **Where addresses come from, and what the app must refuse.** Addresses come
   from exactly two places and no third: the per-row `email` input the host
   types (`:18986-18987`), and the host's own CSV import (`src/lib/csvParsers.js`).
   The app must refuse to: enrich, look up, or infer any address; reuse a guest
   address across events; place more than one guest address in a single message
   (`to:` or `cc:`); retain an address after the event is deleted; or expose any
   guest address on the hosted RSVP page. Vendor addresses gain an intake in
   this slice -- one `email` field on the vendor record, typed by the host, with
   the same rules.

5. **What happens on failure, and who is told.** Only the HOST is ever told,
   and only about the one transport the app owns. For a host-side channel
   (share, `sms:`, `wa.me`, `mailto:`, copy) there is no failure state at all --
   a declined share records nothing (`:15553`), and that stays. For the vendor
   email path, `failed` is the single red state, it is system-owned, the chip
   reads `The email didn't go out - nothing was sent`, the toast points at the
   surviving routes ("Your other ways still work.", `:15511`), and the send
   button re-enables because a failed send left nothing behind
   (`:15572`). No recipient is ever told anything about a failure. No retry is
   automatic.

6. **Whether day-of differs.** Yes, and toward less sending, not more. On the
   event date the three day-of guest drafts -- rain note (`:15393`), parking
   (`:10244`), day-before details (`:8878`) -- must present `sms:` first and
   demote `mailto:` in the actions row. No guest email control may ever appear on
   a day-of draft even after this deferral lifts. Scheduled, queued, and
   deferred sends remain banned without qualification.

7. **Consent and unsubscribe: what a one-event product owes a recipient.** As
   long as the host is the sender, the product owes the recipient nothing beyond
   the refusals in answer 4 -- the message arrives from a person the recipient
   knows, in a thread they can already reply to and mute. The obligation is
   created entirely by the app becoming the sender. If guest sending is ever
   built, the floor is: a working unsubscribe link in every guest-class message;
   `List-Unsubscribe` and `List-Unsubscribe-Post` headers; a suppression list
   keyed to the address that outlives the event record; host-visible copy stating
   that a suppressed guest receives nothing further; and a stated retention
   window. Not one of those exists today (measured: zero `unsubscribe` hits in
   product code). A one-event product does not get a lighter obligation for
   being one event -- it gets a simpler one, and it still has to build it.

8. **What is explicitly NOT in scope.** See the list below. Additionally, the
   five preconditions that must ALL hold before guest transport is re-heard:
   (i) a separate verified sending subdomain for guest-class mail, so guest
   reputation cannot poison the vendor path; (ii) `RESEND_WEBHOOK_SECRET` set
   and a real webhook observed updating a message row, so `delivered` becomes
   sayable; (iii) an unsubscribe and suppression list per answer 7; (iv)
   `reply_to` carrying the host's own address on every send; (v) the vendor path
   demonstrably in use -- non-zero vendor addresses on real events and a
   confirm-back observed -- so the second pipe is not built before the first has
   ever run.

---

## WHAT WOULD MAKE THIS A 10

1. **A confirm-back for guests, not a send.** The vendor brief already produces a
   system-verified state from the recipient's own action
   (`sendLedger.js:19-22`). The hosted RSVP page already exists and guests
   already land on it (`inviteLinkUrl()`, `:19069`). A guest who opens the RSVP
   link is the app's proof they were reached -- earned from the recipient's
   behavior rather than asserted by a mail service. That is a truthful
   `confirmed` for the guest class with no transport at all, and it is the single
   strongest unbuilt idea in this document.

2. **Weiss's capped batch, done properly.** Her dissent is not wrong about the
   host's night. It is early. Once the five preconditions hold, a per-recipient
   batch under a hard cap, with the host's reply-to and a real unsubscribe, is
   the right shape -- and the per-guest ledger this slice builds is exactly its
   substrate. Build it second, not first.

3. **Channel truth per draft.** The app currently offers the same five exits on
   all 24 drafts. A rain note on the day and an invite six weeks out are not the
   same message and should not offer the same rails. Ordering the exits by what
   actually works for that draft, at that moment, is a day of work and it is the
   difference between a sheet and a system.

4. **Provenance on the address.** `csvParsers.js` imports a hundred addresses
   with no record of where they came from. If the app ever becomes a sender,
   "the host typed this" and "the host pasted this from a spreadsheet someone
   gave her" are different facts and only one of them is safe.

---

## NOT IN SCOPE

Explicitly excluded. Do not scope-creep these in.

1. Any app-owned send to any guest-directed draft. All 13 keep host-owned exits.
2. Any bulk, batched, multi-recipient, plural-`to:`, or `cc:` send of any kind,
   to any class.
3. Any scheduled, queued, deferred, or automatic send. Reaffirmed from
   COMMS_OUTLET_RULING clause 4 without qualification.
4. `delivered`, `bounced`, `opened`, or `complained` in any UI string, until
   answer 8 precondition (ii) holds.
5. The word "Sent" in any send-state copy, for any class. The ban is total.
6. Any helper-directed send. There is no helper record and no address field;
   this is a measurement, not a preference, and creating one is a separate
   ruling.
7. A guest account, login, or consent record. Guests are not users and this
   ruling does not make them one.
8. Any cross-event guest address book, address reuse, enrichment, or lookup.
9. Any change to the hosted RSVP page or `inviteLinkUrl()`. Named in "what would
   make this a 10"; not this slice.
10. `draftVendorBriefAsk` (`doItForMe.js:849`). It is not imported by hostv2
    (`:40`) and porting it is a separate decision.
11. `Weather note to vendors` (`:15395`) gaining a send control. It has no single
    recipient.
12. Any per-message cost model, metering, or paywall tie-in. Billing is dormant
    (`project_model_d_paywall`) and this ruling does not wake it.
13. Any change to `demo/src/App.js`. Frozen (A1, 2026-07-16); read only.
14. Rewriting the existing `sendStateLine` strings. They are correct
    (`sendLedger.js:96-107`); this slice adds cases, it does not revise them.
