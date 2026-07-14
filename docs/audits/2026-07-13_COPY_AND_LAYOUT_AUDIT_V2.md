# Copy + Layout Audit — NGW Event Planner V2

> **Ported from published artifact** — this audit was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/a923806a-822b-4932-9aa6-21eb31212512. Ported into the repo 2026-07-14 so it is searchable, diffable, and versioned.
> The artifact remains the editable original; if you change one, change the other.

Date: 2026-07-13 · Source: artifact `a923806a`

---

**Host Shell V2 · Mobile · vs Leaders & 10+**

# Brutal copy & layout audit

Eleven parallel read-only auditors, every one grounded in the planner-language and QA-scorecard standards, scored ~32 surfaces at the 393px phone stage with no grade inflation — a 7 means *shippable but clearly behind a leader*.

| Metric | Value |
| --- | --- |
| ~32 | surfaces audited on mobile |
| 2 | blockers (P0) |
| 6 | systemic cross-cutting issues |
| 7.6/10 | avg copy score |
| 6.9/10 | avg layout (mobile) |

> **The one-line verdict.** The *writing* is the app's strength — honest, plain, jargon-free, zero emojis app-wide, several surfaces at genuine leader parity. The gap is *mobile interaction & layout*: a systemic touch-target hole, "preamble walls" that bury the actual content, and a handful of CTA-truthfulness lapses — two of them P0.

---

## 01 · Blockers — fix first

Each breaks a primary action on a high-traffic surface. Both are one-line fixes.

### Checklist check-off gesture is hijacked

**Blocker · P0**

Every open task row is a full-row toggle button. The nested deep-link `.mini` in its meta line inherits the global 44px `::after` hit-area, which extends the full row height and *overlaps the label above it*. A thumb aiming at the step text fires `action.go()` — navigating away instead of checking the box. This is the primary gesture on the app's most-used sheet, broken on touch.

Files: `HostShellV2.jsx:7024` · `styles.css:613`

**Fix:** constrain the nested `.mini::after` to its own box (bounded height + `contain`), or move the deep-link into a trailing icon cell that doesn't vertically overlap the label.

### "Sent — next" claims a message went out — nothing is sent

**Blocker · P0**

The thank-you confirm button fires `writeGuest(i,{thankYouSent:true})` — a purely local record — but the label asserts the message was *sent*. A host can tap it without ever tapping the real "Text it" link, and the app then claims a thank-you was delivered. Textbook record-only / CTA-truthfulness violation.

Files: `HostShellV2.jsx:6809`

**Fix:** relabel `Mark thanked`; keep the real send on the adjacent `sms:` "Text it" link.

---

## 02 · Systemic — highest leverage

Cross-surface root causes. Fixing these lifts many surfaces at once; each was flagged independently by multiple auditors.

### S1 · The 44px touch-target system is incomplete

**Major** — 5 auditors · live-verified

The `::after` hit-area expander only covers `.chip / .mini / .dock button / .sheet-x / .toast-undo / .vc-pill / .ev-kicker`. Every other interactive class is left at its visual size, and the rule sets *height only*. Measured live on the 393px stage:

- `.cta` primary buttons — **38px** tall (every sheet's main action)
- `.field` inputs — **33px** (money entry, capacity, crab per-line)
- `.tag` status pickers — **~24px** (the primary interaction on lodging/rides boards)
- header icon buttons — **27px wide** (expander fixes height, not width)

Files: `styles.css:613`

**Fix:** add `.cta, .field` and the interactive `.tag` pickers to the `::after` selector, and add a `min-width:44px` companion for the narrow icon buttons. One CSS edit, app-wide compliance.

### S2 · CTA-truthfulness lapses beyond the two blockers

**Major**

Several buttons imply the app does something it hands off: draft "Send it…" `6930` opens the OS share sheet; "Tell the guests" `9060` is draft-only; "Verify COI" `8232` is a host attestation, not verification; noun CTAs — "Google Calendar" `InviteV2:887`, "WhatsApp" `6933`, "Open it" `6303` — don't say what happens.

> **The standard already exists in-app:** the Pass sheet's two-gate charge honesty (`6169`) and the "Not wired here yet — in the app this opens…" route toasts are genuine leader-grade. Make every CTA match that discipline.

**Fix:** "Send it…" → `Share…`; "Tell the guests" → `Draft guest note`; "Verify COI" → `Mark insurance verified`; calendar/messaging nouns → verb + object ("Add to Apple Calendar").

### S3 · "Preamble walls" bury the actual content

**Major**

On surface after surface the thing the host came for sits below a stack of decisions and settings:

- Guest **roster** renders below ~8 preamble blocks — pushed off the fold `8725–8809`
- Command hero states "how am I doing" **4 times** in one viewport `3617 / 3798`
- Day-of **"happening now"** card can sit 5–6 blocks down under stress `4472–4533`
- **Space** sheet crowds four unrelated jobs into one 72%-height scroll; the helper roster is last `5099–5275`
- **Shopping list** sits under five decision shelves; **supplies** has no jump link `7061`

**Fix (pattern):** lead every sheet with its titular content; demote settings/decisions/secondary shelves into one collapsed fold beneath it. This is what most separates these surfaces from a leader's ruthless single-message top-of-screen.

### S4 · Raw enum & dev vocabulary leaking to hosts

**Major**

- Risk severity prints the stored value — hosts see a chip that says **"high" / "medium"** `6020`
- Portfolio shelf header **"Samples & tests"** — "tests" reads as unfinished software `6331`
- **COI / "certificate of insurance" / "additional insured" / "load-in"** aimed at an amateur host `8089` + `vendorIntelligence.js:106–218`
- Bare **"waiting"** state pill with no consequence `6609`

**Fix:** map every stored enum to a plain three-state phrase ("Worth planning now" / "Keep an eye on it"); rename "Samples & tests" → "Samples"; de-jargon insurance to "Ask [vendor] for proof they're insured — a lot of venues won't let them set up without it." The app already does this correctly for "Contracted"→"Agreed" — apply the same remap.

### S5 · Booking forms render 2 columns on every real phone

**Major**

`.lodge-form` is 2-column by default and collapses to one only at `max-width:380px` — *below* every common device (390/393/430). An inverted breakpoint: only an iPhone SE gets a single column; every modern phone gets cramped ~171px paired fields on lodging, rides, and flights.

Files: `styles.css:1228`

**Fix:** raise the collapse to `≥520px`, or switch to `repeat(auto-fit,minmax(200px,1fr))`. One line, fixes all three travel sheets.

### S6 · Progressive-disclosure debt

**Minor**

Several editors dump every control at once instead of earning disclosure by the answer: the expanded guest editor (~8 controls), the vendor cockpit (flat field stack, no readiness snapshot), the crabs sheet (densest in the shell), and the space sheet. The Invite flow's earned-disclosure choreography is the model to copy.

**Fix:** show the essential 2–3 fields; fold contact/group/advanced behind a toggle. Add a one-line readiness header to the vendor card ("Still needs: arrival time, deposit").

> **Bonus bug** (Minor) — Not a layout issue, but caught in passing: the onboarding **"Set the date"** foundation carries `focusField:'event-date'`, but `routeSheet` matches on `tab` before `focusField` and scrolls to the **Venue** input — the app's #1 foundation lands on the wrong field. `6221` vs `2080`

---

## 03 · Per-surface scorecard

Copy / Layout(mobile), out of 10. Sorted worst-layout first within each band. Green ≥9 · steel 7–8 · amber 6 · red ≤5.

| Surface | Copy | Layout | Sharpest mobile finding |
| --- | --- | --- | --- |
| Thanks | 5 | 7 | "Sent — next" false send (blocker) |
| Supplies →food | 7 | 5 | Buried mid-scroll in the 850-line food sheet, no jump link |
| Command Center | 7 | 6 | Hero states status 4×; area chips ~18px |
| Guest list | 7 | 6 | Roster buried under ~8 blocks; RSVP tag blind-cycles |
| The Day / Timeline | 7 | 6 | "Now" card can sit 5–6 blocks down |
| Lodging | 9 | 6 | Status pickers ~24px; 2-col form on phones |
| Rides (ground) | 9 | 6 | Same sub-44px pickers / 2-col form |
| Flights (air) | 8 | 6 | Densest sheet; form stays open above the board |
| Seating | 8 | 6 | 8+ control blocks before the table list; button-in-button |
| Space / helpers | 7 | 6 | Four jobs in one sheet; capacity inputs ~34px |
| Tasks / checklist | 8 | 6 | Check-off gesture hijacked (blocker) |
| Crabs | 8 | 6 | Densest editor; per-line money inputs ~31px |
| Vendors | 6 | 7 | COI/insurance jargon on the card face |
| Risks | 7 | 7 | Raw "high"/"medium" enum as chip; not severity-sorted |
| Budget | 8 | 7 | Command tile flags "over" with no $ magnitude |
| Food / Shopping | 7 | 7 | Up to 7 chips on one row → wrap |
| Global chrome | 7 | 7 | Dock labels fail AA over bright tiles; naming drift |
| Sweep | 8 | 7 | float:right ragged reflow; title/content mismatch |
| Rain plan | 7 | 7 | Vague CTAs ("Do it for me" / "The cookout move") |
| Create stage | 8 | 7 | 27px header icons; dense chip+shelf wall |
| Settings | 8 | 7 | Sound toggle reuses .mini instead of a real toggle |
| Palette (find) | 7 | 7 | Keyboard-only hint on a touch-first surface |
| Splash | 7 | 7 | 4750ms first-run hold |
| Decisions | 8 | 8 | Settled rows crowd label+2 buttons at 353px |
| Invite | 7 | 8 | Stiff "favor of a reply" ask; "1 of you" |
| Reveal | 7 | 8 | Raw intake questions mid-magic; 3 CTAs at climax |
| Draft composer | 6 | 8 | "Send it…" overclaims (share, not send) |
| Cost-share | 9 | 8 | Nearly done; just the sub-44px Save CTA |
| Meaning | 9 | 8 | Cleanest surface; only the sub-44px Save button |
| Ask (Q&A) | 8 | 9 | Honest grounded AI; only vague "Open it" |
| QR | 8 | 8 | Clean; deliberate white card is a fair exception |
| Events / portfolio | 6 | 8 | "Samples & tests" leaks dev vocabulary |
| Pass ($39) | 9 | 8 | Gold standard — two-gate charge honesty |

---

## 04 · Don't regress — already at leader parity

The audit's job is to protect these, not just find faults.

**Keep — the writing, and the honesty discipline**

- **Zero emojis app-wide** — a full Unicode-range sweep of 9,184 lines returned no hits.
- **No hospitality jargon** in the travel sheets — the code comments literally forbid "cutoff" / "attrition"; lodging & rides copy both scored **9/10**.
- **Pass sheet** (Copy 9) — two-gate charge honesty, no fake checkout, "Free while in preview" fallback. The truthfulness standard for the whole app.
- **Cost-share** (Copy 9) — plain-language funding models, and it refuses to fake-total the pool.
- **Meaning** (Copy 9) — purpose-first, warm-but-not-cutesy, dirty-gated Save.
- **Reveal choreography** — the name lands last as the conclusion; genuine ceremony.
- Consequence-rich toasts ("marked paid in full — payment reminders stop") and honest route toasts instead of fake buttons.

---

## 05 · Suggested fix order

- **1 · Two blockers** — checklist hit-area `7024` + "Sent — next" relabel `6809`. Minutes each.
- **2 · S1 touch targets** — one `styles.css:613` edit clears sub-44px `.cta`/`.field`/`.tag` + narrow icon buttons app-wide.
- **3 · S5 form breakpoint** — one line fixes 2-col-on-phones across lodging/rides/flights.
- **4 · S2 CTA truthfulness sweep** — relabel the ~6 remaining overclaiming buttons to match the Pass-sheet standard.
- **5 · S4 enum/jargon remap** — severity words, "Samples", COI de-jargon.
- **6 · S3 preamble walls** — the biggest layout lift, per-surface: content first, settings behind a fold. Start with Guest list and the Day-of "now" card.
- **7 · S6 disclosure folds** + the onboarding date-field routing bug `6221`.

---

Method: 11 parallel read-only auditors, each grounding in UX_06 (planner language), UX_07 (CTA truthfulness), UX_08 (source-of-truth), UX_09 (QA scorecard) and reading the actual render code before scoring. Touch-target heights live-verified on the 393px stage. No files were modified. Scores are relative to a leader-grade consumer bar (Partiful et al.), not an internal baseline.
