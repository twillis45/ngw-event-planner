# Stage 1 kill check kit: asking three hosts to pay $39

**For:** Todd. Sources:
- Proposal: `ngw-event-planner-workspace/docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md`,
  which draws on `docs/FLAGSHIP_DEMO_AND_PRICING_D2.md` lines 176–180.
- Threshold as amended: **Stage 1 review board, 11/11/2026**.

**Status: not started.** On 11/11/2026 the board confirmed the threshold with
four amendments. It becomes binding when the owner confirms it in one line,
and that date starts the 30-day BLOCKED clock. Nothing below is a result.

**Order matters (proposal §5):**
1. The owner confirms the threshold, and it goes on record (`records.json`,
   then `post-gate-records.mjs --apply`).
2. **Then** ask the hosts. Not before.

---

## 1. The check

> Ask three non-founder hosts who have run the vendor-brief loop to pay for the
> $39 One-Event Pass, in conversation, even if the money is not taken.

## 2. Pre-registered threshold

**Binding only once the owner confirms. Never edit it after the first ask.**
Source: Stage 1 review board, 11/11/2026 (it replaces the proposal §3 text).
Copied verbatim:

> GO if at least 2 of 3 qualifying hosts say yes to $39 with no discount; NO-GO recommended if 0 or 1 of 3; BLOCKED if three qualifying hosts cannot be found within 30 days of the confirmation date (not a no; the unlock is a named source). YES = an unprompted 'yes, I'd pay that' or paying at checkout; 'maybe', 'if it were cheaper', 'I'd pay something' = no. A yes whose purchase the host refunds before the event = no. QUALIFYING = ran the vendor-brief loop on a real event of their own with at least two hired vendors; not the founder, family or a current business partner; friends only if they run real events; given nothing. Every answer, objection and current alternative recorded verbatim; whether they actually bought is recorded but non-binding. Organic purchases by unasked people are recorded separately and never counted. Caps until it clears: $0 paid acquisition, $0 incentives, no price change or promotion code.

**Conditions during the check (Stage 1 review board, 11/11/2026):**
- The pass stays on sale at $39 the whole time.
- Any paid acquisition, any incentive, any price change, any coupon, or any
  Stripe promotion code **voids the check**.

Owner confirmation date: ________ (the 30-day BLOCKED clock starts here)
Date of first ask: ________

---

## 3. Qualification checklist (all must be yes before you ask)

- [ ] Hosting a **real** event of their own, not a test event and not one made up for you.
- [ ] That event has **at least two hired vendors**. With only one, the pass
      unlocks nothing for them.
- [ ] Has **run the vendor-brief loop** on it: added someone they're hiring and
      shared that vendor's brief with the real vendor. (On a host's first
      event, sharing one vendor brief is free, so this needs no pass and no
      payment.)
- [ ] Not you, not family, and not a current business partner.
- [ ] If a friend, they genuinely run real events.
- [ ] Has been given **nothing**: no money, no gift card, no free pass, no
      coupon or promotion code, and no promise of any of these.
- [ ] Hasn't already been told the price in a way that framed it, like "it'll be cheap."

If any box is no, they don't count toward the three. You can still talk to
them; just don't record it as an answer.

### Can a UAT tester double as one of the three?

**Only if they qualify on their own.** A `UAT_KIT.md` session is someone's
first look at the app, so it almost never counts: they haven't run the
vendor-brief loop on a real event of their own. Task 6 in that session doesn't
count either, because you set it. Keep the two separate unless the tester
then goes on, unprompted, to share a real brief with a real vendor for their
real event, and that event has at least two hired vendors. If so, ask them
later, in a separate conversation, with this script.

### Finding hosts (one short message)

> Hi [name], are you planning an event of your own soon? I've built an app
> that sends your vendors a simple brief they can confirm with one tap. I'd
> love for you to try it on your real event. It's free to start, and I'd like
> to hear what you think afterward.

Don't mention the price, a discount, or that you'll ask them to pay.

---

## 4. The ask

Do it after they've used the vendor-brief loop, in conversation, in person or
by phone or video. Text is a last resort. Ask once.

**First ask:**

> "How are you keeping track of your vendors right now?"

Write their answer word for word. This is their current alternative.

**Then say:**

> "Thanks for trying it on [event]. The full version is the One-Event Pass.
> It's $39 for one event, and it lets you share a brief with every vendor, not
> just the first one. Would you pay $39 for that?"

**Then stop talking.** Let the silence sit.

**If they ask a question,** answer it plainly and with facts only:
- "Is there a discount?" → "No, it's $39."
- "What else does it include?" → Point to the pass screen and let them read
  it. Don't add to it.
- "Is it a subscription?" → "No, it's one payment for one event."

**If they say yes:** "Great. If you want it, it's under Get the pass on your
event." Don't push them to check out. An unprompted yes, or paying at
checkout, counts as a yes. Whether they actually bought is recorded but
doesn't decide it, **except** that a yes whose purchase they refund before the
event counts as a **no**.

**If they say anything else:** ask once: *"What would make it a yes or a
no?"* Write down the answer. Don't argue or reframe.

**Never:**
- Offer a lower price, a trial, a coupon, a promotion code, or "I'll give it to
  you for free." Any of these voids the check.
- Say "it's only $39," "less than a centerpiece," or "most people say yes."
- Ask "would you pay *something*?" or "what would you pay?"
- Tell them it's a test, or that their answer decides anything.
- Count a yes from someone who doesn't meet every box in §3.

---

## 5. Recording each answer

- Write the answer **word for word** during the conversation or straight
  after, before anything else.
- Record objections word for word, **even when the answer is yes**.
- Record their **current alternative** word for word, every time.
- Record **bought?** (yes / no / refunded, with dates). It's non-binding,
  except that a purchase refunded before the event turns that yes into a no.
  Check for refunds again after the event date before you call the result.
- If the yes is unclear, it is a no. Write why.
- Don't summarize ("seemed keen"). Quote them.

---

## 6. Result table

Fill this in a copy named `docs/alpha/KILL_CHECK_RESULTS_<first-ask-date>.md`,
so this kit stays clean.

| Host | Qualified? (§3 all yes) | Answer (verbatim) | Current alternative (verbatim) | Counts as yes? | Bought? (non-binding; refunded before event = no) | Objections (verbatim) | Date |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

Qualifying yeses: __ of 3 → **GO / NO-GO recommended / BLOCKED**

### Purchases by people nobody asked (recorded, never counted)

| Date | Event (if known) | How they found it (if known) | Refunded? |
|---|---|---|---|
| | | | |

These never count toward the three, in either direction.

---

## 7. What happens next

| Result | What it means | Next step |
|---|---|---|
| **GO** (2 or 3 of 3) | The kill check passed. | Record the result, the verbatim answers, and the current alternatives on the stage 1 gate record and post it. Stage 1 can close. Objections still go into the backlog. |
| **NO-GO recommended** (0 or 1 of 3) | A recommendation, not a kill. Only you rule. | The basis is "an underserved wedge," so the spine's wedge pass applies (spine lines 99–110): before any NO-GO is final, the same research must say what **is** underserved. The current alternatives you recorded are its first evidence. "Better execution of a commodity" is a fallback that needs its own gate; it is never the silent default. |
| **BLOCKED** (fewer than 3 qualifying hosts within 30 days of the owner's confirmation date) | Not a no. | Name the source qualifying hosts will come from, and record it as the unblock. No paid acquisition, no incentives, and no price change or promotion code to fill the gap. The caps still stand. |
| **Void** | During the check, money was spent on acquisition, an incentive was given, the price changed, or a coupon or Stripe promotion code was used. | The check is void. Record what happened and when; what follows is the owner's ruling. |

Whatever the result, don't change the threshold and re-ask.
