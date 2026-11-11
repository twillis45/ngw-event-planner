# Stage 1 kill check kit: asking three hosts to pay $39

**For:** Todd. The source is
`ngw-event-planner-workspace/docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md`,
which draws on `docs/FLAGSHIP_DEMO_AND_PRICING_D2.md` lines 176–180.
**Status: not started.** As of the 11/11 gate remeasurement, stage 1 has no
ruler, basis, or pre-registered threshold on record. Nothing below is a result.

**Order matters (proposal §5):**
1. Rule stage 1 and put the threshold on record (`records.json`, then
   `post-gate-records.mjs --apply`).
2. **Then** ask the hosts. Not before.

---

## 1. The check

> Ask three non-founder hosts who have run the vendor-brief loop to pay for the
> $39 One-Event Pass, in conversation, even if the money is not taken.

## 2. Pre-registered threshold

**Binding only once the owner rules stage 1. Never edit it after the first ask.**
It may be made stricter before the first host is asked, and never after.
Copied verbatim from the proposal §3:

> **GO** if at least **2 of 3** say yes to $39 **without a discount**.
> **NO-GO recommended** if 0 or 1 of 3 say yes.
> **BLOCKED** if three qualifying hosts cannot be found within 30 days of this
> ruling — not the same as a no; the unblock is naming where they come from.
> Every objection is written down **verbatim**, whatever the result.
>
> **What counts as a yes:** an unprompted "yes, I'd pay that," or agreeing to
> pay at checkout. "Maybe," "if it were cheaper," or "I'd pay something" are
> **no**, recorded verbatim.
> **Who qualifies:** a host who has run the vendor-brief loop on a real event of
> their own, and is not the founder, a family member, or a current business
> partner. Friends count only if they run real events.
> **Spend cap until it clears:** **$0** on paid acquisition (consistent with the
> standing condition that no paid spend is authorized) and **$0** in incentives
> to the three hosts — a paid tester's yes is not a buyer's yes.

Date ruled: ________ (the 30-day BLOCKED clock starts here)
Date of first ask: ________

---

## 3. Qualification checklist (all must be yes before you ask)

- [ ] Hosting a **real** event of their own, not a test event and not one made up for you.
- [ ] Has **run the vendor-brief loop** on it: added someone they're hiring and
      shared that vendor's brief with the real vendor. (On a host's first
      event, sharing one vendor brief is free, so this needs no pass and no
      payment.)
- [ ] Not you, not family, and not a current business partner.
- [ ] If a friend, they genuinely run real events.
- [ ] Has been given **nothing**: no money, no gift card, no free pass, no promise of one.
- [ ] Hasn't already been told the price in a way that framed it, like "it'll be cheap."

If any box is no, they don't count toward the three. You can still talk to
them; just don't record it as an answer.

### Can a UAT tester double as one of the three?

**Only if they qualify on their own.** A `UAT_KIT.md` session is someone's
first look at the app, so it almost never counts: they haven't run the
vendor-brief loop on a real event of their own. Task 6 in that session doesn't
count either, because you set it. Keep the two separate unless the tester
then goes on, unprompted, to share a real brief with a real vendor for their
real event. If they do, ask them later, in a separate conversation, with this
script.

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

**Say:**

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
event." Whether or not they buy, a clear, unprompted yes counts. Don't push
them to check out.

**If they say anything else:** ask once: *"What would make it a yes or a
no?"* Write down the answer. Don't argue or reframe.

**Never:**
- Offer a lower price, a trial, a coupon, or "I'll give it to you for free."
- Say "it's only $39," "less than a centerpiece," or "most people say yes."
- Ask "would you pay *something*?" or "what would you pay?"
- Tell them it's a test, or that their answer decides anything.
- Count a yes from someone who doesn't meet every box in §3.

---

## 5. Recording each answer

- Write the answer **word for word** during the conversation or straight
  after, before anything else.
- Record objections word for word, **even when the answer is yes**.
- If the yes is unclear, it is a no (proposal §3). Write why.
- Don't summarize ("seemed keen"). Quote them.

---

## 6. Result table

Fill this in a copy named `docs/alpha/KILL_CHECK_RESULTS_<first-ask-date>.md`,
so this kit stays clean.

| Host | Qualified? (§3 all yes) | Answer (verbatim) | Counts as yes? | Objections (verbatim) | Date |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

Qualifying yeses: __ of 3 → **GO / NO-GO recommended / BLOCKED**

---

## 7. What happens next

| Result | What it means | Next step |
|---|---|---|
| **GO** (2 or 3 of 3) | The kill check passed. | Record the result and the verbatim answers on the stage 1 gate record and post it. Stage 1 can close. Objections still go into the backlog. |
| **NO-GO recommended** (0 or 1 of 3) | A recommendation, not a kill. Only you rule. | The basis is "an underserved wedge," so the spine's wedge pass applies (spine lines 99–110): before any NO-GO is final, the same research must say what **is** underserved. "Better execution of a commodity" is a fallback that needs its own gate; it is never the silent default. |
| **BLOCKED** (fewer than 3 qualifying hosts within 30 days of the ruling) | Not a no. | Name where qualifying hosts will come from, and record that as the unblock. No paid acquisition and no incentives to fill the gap; the $0 caps still stand. |

Whatever the result, don't change the threshold and re-ask.
