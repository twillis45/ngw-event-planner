# UAT-1 kit: two first-time-user sessions

**For:** Todd, running `UAT-1` (recertification §17, owner checklist week of 11/9, item 8).
**Status: NOT RUN.** Nothing in this file is a result. Results go in a copy of
`UAT_SESSION_LOG_TEMPLATE.md`.

**Before you book anyone:** §17 says to run this *after* the §4 P0/P1 fixes, or
it only re-finds them. Check `HANDOFF.md` for what has shipped.

---

## 1. Who to recruit

| | Tester A | Tester B |
|---|---|---|
| Who | Someone hosting their own event: a party, reunion, shower, small wedding. **Not** a planner. | A coordinator or planner who runs events for other people. |
| Must be true | Has never seen the app, a demo, or a screenshot of it. | Same. |
| Not allowed | You, family, or a current business partner. | Same. |
| Device | Their own phone, their own browser. | Same. |
| Pay | None. Keep it $0, so a tester who later qualifies can still be asked to pay (see `KILL_CHECK_KIT.md`). | Same. |

A friend is fine if they really host or plan events.

---

## 2. Recruiting messages

Do not name or describe features. You want them to arrive cold.

**Text**

> Hi [name]! I built a web app for people planning their own events, and I need
> to watch someone use it for the first time. It's about an hour on your phone,
> over video or in person. No prep, and you can't do it wrong. Would you be up
> for it sometime this week or next?

**Email**

> Subject: An hour of your time, on your phone?
>
> Hi [name],
>
> I've been building a web app that helps people plan their own events, and
> I've reached the point where I need to watch someone use it who has never
> seen it.
>
> It takes about an hour, on your own phone, in person or over video. There's
> nothing to prepare and no way to get it wrong. If something is confusing,
> that's exactly what I need to see.
>
> Would any of these times work? [two or three times]
>
> Thanks,
> Todd

**Social DM**

> Hey [name], quick ask. I built an app for planning events and need one
> person who's never seen it to try it on their phone while I watch, about an
> hour. Since you [plan events / are hosting something soon], you'd be perfect.
> Interested?

---

## 3. Consent and recording note (read aloud, or send ahead)

> Thanks for doing this. I'm testing the app, not you, so anything that
> confuses you is the app's fault. With your OK, I'd like to record the screen
> and audio so I don't miss anything. Only I will watch it, and I'll delete it
> once my notes are written up. You'll make a real account with your own
> email, and anything you type is saved there. Please don't type anything
> private you don't want me to see, and tell me afterward if you want the
> account deleted. You can stop at any time. Is that OK?

Write "consent: yes / no, recording: yes / no" at the top of the log.

---

## 4. Facilitator script (one page)

**Why this is not `COORDINATOR_TEST_SCRIPT.md` word for word.** §17 says to
run that script verbatim, but it was written for the old desktop shell: Studio
Home, a 13-tab sidebar, sample data, Export XLSX. None of those exist in the
live hostv2 app. Run verbatim, it would test screens that aren't there. The
tasks below follow the same order and intent, mapped onto the live app's own
labels. The sections with no counterpart are listed at the end. If you want it
verbatim anyway, that's your call; record it in the log.

**Setup (5 min).**
- Fresh browser on **their** phone, a private tab if they share it.
- URL: `https://twillis45.github.io/ngw-event-planner/hostv2/`. **Not** `?demo=1`.
- Read the consent note. Start the recording and a timer.
- Say: *"Please think out loud: say what you're looking for and what you expect
  to happen. I'm going to stay quiet, which will feel rude. It's on purpose."*

**Tasks, in order.** Read each one exactly as written, then stop talking.
For A, use their real upcoming event. For B, use a client event they are
working on now, with details changed if they like.

| # | Say this | Maps to coordinator § |
|---|---|---|
| 1 | "Start planning your event." | 14 (start a real workspace) |
| 2 | "Put in the date, where it is, about how many people, and a budget." | 2 |
| 3 | "Look at the top of the screen. In your own words, what is it telling you to do next?" Write their words. | 1, 2 |
| 4 | "Add two guests, then get the invite ready to send." | 7, 9 |
| 5 | "Open the invite the way a guest would, and say yes to it. Then go back and tell me how many people are coming." | 7 |
| 6 | "Add one person you're hiring, like a caterer or a DJ, and send them what they need to know." | 4 |
| 7 | "Tell me how your money looks: what's spent, what's still owed, what's left." | 8 |
| 8 | "Find a decision you still have to make, and mark something on your list done." | 5, 6 |
| 9 | "Show me what the day itself will look like, hour by hour." | 10 |
| 10 | "Close the tab, open the link again, and find what you just did." | 13 |
| 11 | "If you got stuck and wanted help, where would you go?" | (new: support route) |
| 12 | "Is there anything here you'd have to pay for? What does it get you?" **Do not let them buy.** | (pricing comprehension) |

**What to say.** Only the task text, plus:
- *"What are you looking for?"*, *"What did you expect to happen?"*,
  *"Keep going."*, *"What would you do if I weren't here?"*

**What NOT to say.**
- No labels, no pointing, no "try the menu," no "it's at the top."
- No explaining what the app means to do, and no apologizing for it.
- Don't answer "is this right?" Say: *"What do you think?"*
- No reactions: no "good," no wince.

**Assists.** Help only if they are stuck **more than 2 minutes** or about to
quit. Then give the smallest hint you can, and **log it word for word**. Any
assist means the task was not completed unaided.

**Debrief (10 min).**
1. "What is this app for, in one sentence?"
2. "What was the most confusing moment?"
3. "What would you use instead of this today?"
4. "Would you use it for your real event? Why or why not?"
5. "Anything I should have asked?"

Write their words, not your summary.

**Coordinator sections with no hostv2 counterpart (not run):** §3 sidebar
collapse, §11 Manage Event (Consult Script, Export XLSX), and §14's sample
data and clear-sample flow. §12 (mobile) is the whole session, since it runs
on their phone.

---

## 5. Timing (60 min each)

| Minutes | Block |
|---|---|
| 0–5 | Setup, consent, recording |
| 5–45 | Tasks 1–12 (about 3 min each; stop a task at 6 min, log it as not completed, move on) |
| 45–55 | Debrief |
| 55–60 | Buffer; thank them |

Then spend about 30 min per session filling in the log while it's fresh.

---

## 6. How to file results

1. Copy `UAT_SESSION_LOG_TEMPLATE.md` to
   `docs/alpha/UAT_<YYYY-MM-DD>_TESTER_A.md` (and `_TESTER_B`). Keep these in
   `docs/alpha/`; a new file under `docs/audits/` needs an `INDEX.md` row.
2. Fill in every task row, including the ones that went fine.
3. Triage each problem with the severity rules in the template.
4. Fill the summary block. The stage 9 board reads only that, so it must stand
   on its own.
5. Every misread of money or RSVP state becomes a **P1** row in the
   recertification matrix (§17 step 5). Re-run the §4 rows they touch (§17
   step 6).
6. Do **not** mark `UAT-1` passed unless the pass bar in the summary block is
   met by both testers.
7. Delete the recordings once the logs are written, as you promised.
