# Cohesion batch A: renders for owner approval (never merges)

The Day stage's board on the event day, Saturday, March 20, 2027 at 5:00 PM (the clock is mocked). Light theme, dsf 2, full board length.
- **Own plan:** a made-up "Jordan Avery's 60th & Retirement" at 42 Elm Ct, Springfield, VA 22150.
- **Wanda sample:** the built-in sample the audit used.

**before** is the `cohesion-a-2utz0n` head: the host-word and fits-the-moment fixes are already in.
**proposed** adds the layout change below. It is built only on this branch.

## The proposal (audit P1 #2: about ten equal buttons)

On the event day, the board's list under the run-of-show hero holds only:
- what is due today;
- anything critical.

It is headed **"Still to do today · N left"**. The rest of the planning folds behind one row, **"N more from planning, if there's time ▸"**, which opens in place (the existing expander). "Run the day" stays the one lit action.

Wanda's board goes from 6 cards (about 10 buttons) to 4 cards (4 buttons) above the fold row. The own plan goes from 3 cards to 1.

**Owner decision inside this:** the wave-6 guardrail says "the cap yields to safety, never the rows". Past-window cards that are not critical (for example, "Resolve 'Set up a shared photo/notes drop…'") fold on the day. Critical cards never fold.

## Files

| File | What it shows |
|---|---|
| before__day-board__own-plan__390.png | Own plan, phone: the board on the day as it is now |
| before__day-board__own-plan__834.png | Own plan, 11" iPad portrait, now |
| before__day-board__own-plan__1024.png | Own plan, 13" iPad portrait (tall-iPad board), now |
| before__day-board__own-plan__1440.png | Own plan, desktop, now |
| before__day-board__Wanda-sample__390.png | Wanda sample, phone, now (the audit's day__phone) |
| before__day-board__Wanda-sample__834.png | Wanda sample, 11" iPad, now |
| before__day-board__Wanda-sample__1024.png | Wanda sample, 13" iPad, now |
| before__day-board__Wanda-sample__1440.png | Wanda sample, desktop, now |
| proposed__day-board__own-plan__390.png | Own plan, phone: "Still to do today · 1 left", 2 folded |
| proposed__day-board__own-plan__834.png | Own plan, 11" iPad, proposed |
| proposed__day-board__own-plan__1024.png | Own plan, 13" iPad, proposed |
| proposed__day-board__own-plan__1440.png | Own plan, desktop, proposed |
| proposed__day-board__Wanda-sample__390.png | Wanda sample, phone: "Still to do today · 4 left", 2 folded |
| proposed__day-board__Wanda-sample__834.png | Wanda sample, 11" iPad, proposed |
| proposed__day-board__Wanda-sample__1024.png | Wanda sample, 13" iPad, proposed |
| proposed__day-board__Wanda-sample__1440.png | Wanda sample, desktop, proposed |

The prototype code is in `hostv2/src/HostShellV2.jsx` on this branch, marked "RENDER PROPOSAL". The render script is `hostv2/e2e/_renderCohesionA.spec.mjs`.
