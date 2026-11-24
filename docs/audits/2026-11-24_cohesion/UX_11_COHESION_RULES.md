# UX_11 — Cohesion Rules

Status: owner-approved 11/24/2026 (rules 1–9 from the day's screens; 10–18 from earlier rulings and audit findings, added the same day). These are the patterns the owner ratified one
screen at a time on 11/24/2026 (the guest editor, the food item, the Share &
invite card, the invite message, the plan parts). They now apply to every
screen, every section and every viewport, including the board below the fold
and the iPad layouts.

When a screen breaks one of these, fix it with the screen's family, not one
string at a time. Where a rule can be measured, it is enforced by a test, not by
review.

## The rules

| # | Rule | Ratified on (11/24/2026) |
|---|---|---|
| 1 | **Order and one lit action.** Steps follow the host's order (check, act, share, follow up). One lit, primary action per screen or card, and it moves as the state changes (Send before sending, Nudge after). | Share & invite card |
| 2 | **Open in place, keep her place.** An item opens in place, in labeled groups. Opening scrolls it to the top, with a slim name bar to close it. No unlabeled piles of controls. | Guest editor, food item |
| 3 | **Destructive actions alone.** Remove, delete and skip sit alone at the bottom, name exactly what they remove ("Remove Linda Park and the 2 with them"), and offer undo, or confirm when undo is impossible. | Guest Remove, food Skip |
| 4 | **Host words.** No app shorthand, engine ids or developer copy ("tune", "not pesc.", "this count reads", "brief"). Every price or number says where it came from (est., the store, you paid). See UX_06 and UX_08. | Diet tags, prices, plan parts |
| 5 | **Finished folds.** A finished group collapses to one green row. A reopen lasts only while the group stays finished; finishing again folds it again. | All fold sites (`useReopened`) |
| 6 | **Every tappable thing goes somewhere.** Anything that looks tappable opens something. A chevron appears only on a row that routes. A tap that only toasts is not navigation. | Plan parts open their section |
| 7 | **Draft before send.** Nothing reaches a guest or vendor in one tap. The words are drafted, editable and saved before sending. A confirm step shows who gets what. A record keeps what went out. If the reply link isn't ready, nothing can go out. | Invite message |
| 8 | **One door, one name.** One entry point per destination on a screen, and one name for it everywhere ("Invite page", never also "Your invite"). | Invite page |
| 9 | **Measured floors.** Text contrast at least 4.5:1 (measured at the darkest point of a shaded surface), tap targets at least 44×44 (48 for an aisle checkbox), inputs at least 16px, no text under 11px (12 for anything carrying meaning), no sideways scroll. | Invite palettes, every render |
| 10 | **Decide, confirm, advance.** When she makes a call, one quiet line confirms it ("✓ Decided · Undo") and the screen moves on to the next thing. No dead-end "done" card. | Board ruling: decided → advance; "✓ All covered" |
| 11 | **Ask once, when it's needed.** A fact she gave is never asked again, and nothing is asked before it matters (the street only when the invite goes out; the city once). | Address and city rulings; `nothingKnownIsAskedAgain` |
| 12 | **One source per number; screens agree.** Each count or amount is read from one place, so the board, the sheets and the money never disagree. "All clear" only when nothing is open. | Audit P1-3 and P1-6; "single sources" |
| 13 | **Fits the moment.** Plain dates and plain urgency ("by Tue · others wait on it"); each date shown once. The screen fits where she is (before, the day itself, after); The Day opens on the day; "NOW" only means now. | Timing rulings; "one date once"; audit P2-5 and P2-6 |
| 14 | **Try first, save later.** Never block her on sign-in. An unsaved plan says so plainly ("Not saved yet · Sign in to save") and keeps her work. | Ruling #122; the sign-in row |
| 15 | **Guest-facing pages speak for the host, and stay private.** Guests see her words, her name and only allow-listed fields; the guest list stays private; previews never send, count or record anything. | Invite rulings; the payload privacy test; live-preview mode |
| 16 | **Grounded, never invented.** Every recommendation, price and amount comes from the event's playbook or a cited source; event and culture rules hold (a vegan main when needed; injera is exempt from the bread check). No fake AI. See 06. | Vegan and injera rulings; price sources |
| 17 | **One attention cue at a time.** Only the one thing the hero asks for breathes, then settles. Reduced motion is honored everywhere. | Attention-cue ruling |
| 18 | **Undo over confirm.** A change that can be undone gets Undo in its toast, not an "Are you sure?". Confirm only for what can't be undone or what goes out to guests. | Guest Remove with Undo; the decided line |

## Viewports

Every rule holds at phone (390), 11" iPad portrait (834), 13" iPad portrait
(1024, the tall-iPad board), iPad landscape (1194) and desktop (1440). See UX_03.

## Enforcement

The audit of 11/24/2026 (`scratchpad/cohesion-audit/AUDIT.md`, session record)
proposes which rules become tests. These rules are measurable and become tests:
- 1: one lit button per sheet;
- 4: a host-words list;
- 6: a chevron only on routed rows;
- 9: a floor sweep;
- 11: extend `nothingKnownIsAskedAgain`;
- 12: a cross-screen agreement test for counts and money;
- 15: the guest payload allow-list (privacy test);
- 16: the playbook census tests;
- 17: reduced-motion and single-cue checks.

Rules 2, 3, 5, 7, 8, 10, 13, 14 and 18 are judged in renders before build:
renders come before design changes, every time.
