# NGW Event Boss — Alpha Testing Program

Welcome. Thanks for agreeing to help test NGW Event Boss in alpha.

**Plain language: this is rough on purpose.** It works end-to-end for the
core flows, but things will break, surprise you, or feel half-finished. That's
the trade we're making — early access in exchange for honest feedback while
the architecture is still flexible enough to change.

---

## What we're trying to learn

We're not asking "do you like it?" — that produces useless feedback at this
stage. We're asking specifically:

1. **Does the core workflow work for a real event?** Plan a wedding / corporate
   event / board meeting end-to-end. Can you get from intake → execution
   without dropping context?
2. **Where does it stop you?** Friction we can't see from inside.
3. **Where does it surprise you?** Both good ("oh, that's smart") and bad
   ("wait, what?").
4. **What's missing that you'd refuse to ship without?** This is the hardest
   question and the most valuable answer.

---

## How the alpha program works

| Phase | What you do | How long |
|---|---|---|
| **1. Onboarding** | Read this README + `KNOWN_ISSUES.md`. Sign in. Load sample data and click around. | 15 min |
| **2. Scenario pass** | Walk through `PROTOCOL.md` — 4 specific scenarios. Take notes as you go. | 60–90 min total, can be split across multiple sessions |
| **3. Bug reports** | Anytime something breaks or confuses, fill out `BUG_REPORT_TEMPLATE.md` and send. One report per issue. | As they come up |
| **4. Exit feedback** | After scenario pass, fill out `FEEDBACK_FORM.md`. | 20 min |

**Total time investment:** ~2 hours, spreadable over a week.

---

## What you're getting access to

- Live app: URL Todd sent you
- Sample data: a populated workspace (wedding, corporate event, board meeting,
  holiday party) so you can explore without committing real data
- The full feature set, including: vendor management, guest list, RSVP page,
  timeline / checklist / planning tasks, budget tracking, decision tracking,
  communication threads, run-of-show planning, calendar view
- Two viewing modes: Studio (your overview) and Event Day Mode (live execution)

---

## What we ask of you

1. **Don't share access.** This is a closed alpha. The URL goes to you, not your team.
2. **Don't run it as a production system.** Real client data is fine to test with,
   but treat it as a backup-of-record only — your primary source of truth
   should still be wherever you currently track events.
3. **Report what breaks, even small things.** A misaligned button, a confusing
   label, a button that does nothing — write it down. Use `BUG_REPORT_TEMPLATE.md`.
4. **Be honest about what's missing.** "Why can't I do X?" is the most useful
   feedback at this stage. Don't soften it.

---

## What you should NOT expect to work yet

These are KNOWN incomplete areas — don't waste effort testing them:

- **File uploads** (logos, contracts, signed documents) — coming soon, not in alpha
- **Email/SMS sending from the app** — composing works, sending requires manual copy-paste for now
- **Payment processing** — tracking only, no Stripe integration yet
- **Multi-user / team permissions** — single-planner only in alpha
- **Mobile native app** — web-only, but mobile browser is supported
- **Calendar integration (Google / Outlook sync)** — manual export only

See `KNOWN_ISSUES.md` for the full list of in-flight gaps.

---

## What to test in priority order

If you only have an hour, do these in order:

1. **Sign in and explore** with sample data (15 min) — does the app make sense at a glance?
2. **Pick one sample event** (we recommend "Todd & Sarah's Wedding") and walk through every tab in the sidebar in order. Note any tab where you got confused or stuck. (30 min)
3. **Try the Manage Event dropdown** — Run Consult Script, Export, Day Mode toggle. (10 min)

That's the 1-hour pass. If you have more time, do the full 4-scenario protocol
in `PROTOCOL.md`.

---

## How to send feedback

Three options, pick whichever is least friction for you:

1. **Best:** Paste the filled-out templates into a shared Google Doc / Notion
   page and send Todd the link.
2. **Good:** Email the markdown files filled in as text. Todd's email is
   todd@toddwillisphoto.com.
3. **Also fine:** 30-min video call to walk through your notes verbally — Todd
   will record it for review later.

---

## What we'll do with your feedback

- **Within 48 hours:** Todd reviews and acknowledges receipt.
- **Within 1 week:** Bug reports get triaged into the active sprint.
- **Within 2 weeks:** "What's missing" feedback gets compared across testers
  and patterns drive the next sprint priority.
- **Within 4 weeks:** Major issues you flagged are fixed or have a documented
  reason for the deferral. You'll get an update.

---

## Why we're doing alpha at all

Most event planning software gets built behind closed doors then launched at
trade shows. We're doing the opposite: ship rough, learn from real planners,
iterate fast. By the time this gets a public launch, it'll have been shaped
by the people who actually have to use it — you. That's the whole point.

Thanks again. Open `PROTOCOL.md` when you're ready to start.
