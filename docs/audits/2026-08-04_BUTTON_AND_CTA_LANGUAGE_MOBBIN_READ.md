# Buttons and CTA Language -- what the leaders actually ship

Mobbin read 2026-08-04. Continues
[`2026-08-01_CTA_INVENTORY_AND_REDESIGN.md`](2026-08-01_CTA_INVENTORY_AND_REDESIGN.md), which
inventoried our button *system* but sourced its leader claims second-hand from two lodging/layout
reads. This pass goes at the primary button and its LABEL directly, and it **corrects two claims
in that doc**.

| | |
|---|---|
| Screens read on Mobbin | 27 |
| Distinct apps | 27 |
| Our literal button labels measured | 277 |
| Claims in the 2026-08-01 doc corrected | 2 |
| Live label defects found (file:line) | 7 |
| Doctrine amendments proposed | 3 |

Every leader label below is transcribed from the screen image, not from metadata. Our own numbers
come from a scanner over `hostv2/src/`; the command is in section 8. ASCII-only on purpose --
curly quotes in our source are normalised to `'` when quoted here.

---

## 1. Two corrections to the 2026-08-01 doc

### CORRECTED -- "Not one leader read this session uses a gradient on a primary CTA"

False as written. **Airbnb's `Confirm and pay` is a gradient** -- a lateral pink-to-deep-red sweep
across the full-width primary
([screen](https://mobbin.com/screens/a28898c6-3abf-48d9-8d2d-7cdd41662620)).

But the underlying instinct was right, and the precise version is more useful:

> **No leader in the set uses a VERTICAL light-to-dark gradient.** Airbnb's runs sideways and
> shifts HUE within one brand colour. It carries no top-light / bottom-shadow.

That distinction is the whole finding. What dates our `linear-gradient(180deg,#4E6877,#3F5B6A)` is
not "gradient", it is **180deg** -- a simulated bevel, light falling from above onto a raised
object. Airbnb's is a flat object with a coloured sweep, which reads as brand, not as plastic.

So the recommendation survives, restated: **kill the 180deg, not the idea of a gradient.** Flat
`--steel` plus the existing `--sheen` top hairline remains the cheapest correct move, and a lateral
steel sweep is now a legitimate option instead of a banned one.

### CORRECTED -- "Ours is an inline pill with a sentence on it"

Measured against our own source, this overstates the problem. Of **277** literal labels:

```
1-2 words   143  52%
3-4 words    99  36%
5-8 words    31  11%
9+ words      4   1%     <- the actual "sentence on a button" population
```

Four. Not a systemic sentence problem. The doc's own example, `Add a rain backup`, is **four
words** -- squarely mid-distribution and shorter than Alan's shipped `Pay EUR 70 by card`.

The real gap is not length. It is **what the words are doing** (section 3).

---

## 2. Treatment -- the commit button, 13 specimens

| App | Label as shipped | Fill | Width | Where the number sits |
|---|---|---|---|---|
| [Airbnb](https://mobbin.com/screens/a28898c6-3abf-48d9-8d2d-7cdd41662620) | `Confirm and pay` | lateral gradient | full | above (`Total USD $25.00`) |
| [Booking.com](https://mobbin.com/screens/1bd1ec5c-ec0f-4e37-8dc8-f0d130765a39) | `Book now` | flat blue | full | above (`$44`, + green free-cancellation line) |
| [IHG](https://mobbin.com/screens/3dc67c4a-8e53-4a77-a479-d73a4bea2f35) | `Book for 724.61 USD` | flat blue | full | **inside** |
| [Marriott Bonvoy](https://mobbin.com/screens/3ba91323-9304-4e51-92ce-bf40a2fefaf0) | `Book Now 5,748 JPY` | flat black, pill | full | **inside** |
| [Alan](https://mobbin.com/screens/9d51db29-b746-455b-837b-e85767403b33) | `Pay EUR 70 by card` | flat violet | full | **inside** (+ method) |
| [KOHO](https://mobbin.com/screens/42110ebf-a706-4c03-8252-05b35878158c) | `Get $20 Cover bundle` | flat purple | full | **inside** |
| [Cleo AI](https://mobbin.com/screens/13f15185-e75f-48d4-9eda-61c64e03a654) | `Subscribe for $8.99 today` | outline, disabled | full | **inside** |
| [Cuvva](https://mobbin.com/screens/fb4e3dd9-b695-4e72-8b69-2ec29b7d71a8) | `Buy with Apple Pay` | flat black | full | above (`Total GBP 16.80`) |
| [Expedia](https://mobbin.com/screens/80c50c06-08ad-4619-afc2-3ce9385b0572) | `Complete Booking >` | flat blue | full | not on screen |
| [Vestiaire](https://mobbin.com/screens/f62c41ee-7109-4ea9-8ca5-39dcbb6599c6) | `Place order` | flat, disabled | full | above (`Total including fees & taxes`) |
| [CRED](https://mobbin.com/screens/c64dd8d1-e7be-4c92-9e1f-f18e08ede656) | `Pay now ->` + `INSTANT CASHBACK` sub-line | flat black | **inline, right** | left of the button |
| [Shangri-La](https://mobbin.com/screens/b242ab46-ecde-46ac-9f1e-45d0eb1fdb4e) | `Book Now` \| `Next Step` | outline + flat amber | **two side by side** | above |
| [Expensify](https://mobbin.com/screens/28c4f6b0-a536-4837-a6d7-e8876f65a91f) | `Confirm task` | flat green | full | n/a |

**What holds across all 13:**

1. **Full-width is the default, not the flourish.** 11 of 13. The two exceptions both earn it --
   CRED pairs the button with a price block on the same line, Shangri-La is offering two paths.
2. **Nobody bevels.** Zero vertical light-to-dark fills in the set.
3. **The number appears within one glance of the verb, always.** 5 put it inside the label, 6 put
   it directly above or beside. **Zero** make the host correlate a number from elsewhere on the
   screen with the button. This is the pattern our surfaces most often break.
4. **Radius is not a semantic.** The set runs 8px to full-pill with no correlation to consequence.
   Our contested "radius encodes scale" rule gets no support here -- and no contradiction. It is a
   taste call, so stop litigating it.

### The disabled primary -- 4 specimens, and it settles our open question

Our uncommitted `LodgingCockpit.jsx` comment says a dimmed primary with no stated reason "reads as
broken", so the button stays live and focuses the field it needs. The evidence:

| App | Disabled primary | Is the reason stated? |
|---|---|---|
| [Vestiaire](https://mobbin.com/screens/f62c41ee-7109-4ea9-8ca5-39dcbb6599c6) | `Place order` | YES -- numbered rows above: `1. Shipping / Add a shipping address`, `2. Payment / Add a payment method` |
| [Cleo AI](https://mobbin.com/screens/13f15185-e75f-48d4-9eda-61c64e03a654) | `Subscribe for $8.99 today` | YES -- three unchecked consent boxes directly above |
| [Luma](https://mobbin.com/screens/2ecdf3b4-8718-4cae-a96c-1341fb22e24a) | `Next` | YES -- `0 Selected` in the header of the same sheet |
| [Grab](https://mobbin.com/screens/7aa14ff3-0755-46ed-8fc2-ea76a1f83662) | `Next` | NO -- empty fields above are the only clue, nothing names the blocker |

**Ruling this supports:** the rule we wrote is confirmed -- a dim with no stated reason is the
broken-looking case, and Grab is the one app that does it. But the leaders' fix is **dim the button
AND state the blocker as content above it**, not keep the button live. Ours is a third option.

It is defensible on a surface with one field (the blocker is unambiguous and focusing it *is* the
statement), and it should not be generalised to any surface with two or more blockers, where "which
field?" becomes real work. Worth writing down before the pattern spreads.

---

## 3. Language -- the actual finding

### 3a. Sentence case has already won, and our own doctrine is the holdout

UX_06 prescribes Title Case: *"Confirm Vendor", "Send Follow-up", "Add Guest Count"*. Measured,
the app does not do that and has not for a long time:

```
sentence case   179   65%
single-word      84   30%
Title Case       14    5%
```

**93% of our multi-word labels are sentence case** (179 of 193). The leaders agree: `Confirm and
pay`, `Book now`, `Pay EUR 70 by card`, `Confirm task`, `Mark as done`, `Place order`, `Check in
guests`, `Copy event link` -- against a Title Case minority of `Complete Booking`, `Book Now`,
`Next Step`, `Add Friends`.

This is not drift to be corrected. It is a settled house style that the skill file never caught up
with. **Amend UX_06** (section 9) -- otherwise the next agent reads doctrine, writes `Confirm
Vendor`, and imports the 5% minority style into a 95% surface.

### 3b. The object can live in the title OR the button -- never neither

Four apps ship a bare `Done` ([Careem](https://mobbin.com/screens/eb5469bb-9d2d-4c48-9fda-6c3617eec85a),
[Medium](https://mobbin.com/screens/0b1e0b8d-54ee-4863-8847-318d1ea2f932),
[Airtasker](https://mobbin.com/screens/cb46964a-555d-4128-9c8c-0e4f83d46332)) or bare `Next`
(Luma, Grab) -- labels UX_06 explicitly bans.

They get away with it because **the screen title names the object**: `Add a note` + `Done`,
`Invite Guests` + `Next`, `Confirm task` on a sheet titled `Confirm task`. The noun is on screen
exactly once, and the button is the verb.

Our surfaces are mostly **scrolling sheets with many acts and no per-act title**, so a bare verb
has nothing to bind to. The rule that follows is sharper than UX_06's blanket ban:

> A bare verb is legal only when a title within the same frame names the object. On a scrolling
> multi-act sheet, that condition is never met -- so the label carries the object.

This also explains our 7 live defects (section 4): every one of them is a bare verb on a scrolling
sheet.

### 3c. The number in the label is the cheapest borrow available

5 of 13 leaders put the consequence inside the label. We do it **once** in the entire app:

```
HostShellV2.jsx:12344  [cta]  Get the pass -- $39
```

Every other numeric consequence -- guest counts, money-safe dates, fronted totals, group-rate
deadlines -- sits somewhere else on the surface and the host has to correlate it. `Confirm the
count` is weaker than `Confirm the count -- 42 guests`, and the number is already in scope at every
one of those sites.

This is a per-site copy change with no layout cost. It is the highest value-per-risk item in this
whole read.

### 3d. Handoffs are named by destination, and the leaders are good at this

[Apple Invites](https://mobbin.com/screens/3949a994-1cc8-4ae7-ab00-235291b8931d) offers
`Messages`, `Mail`, `Share Link`, `Copy Link` -- four buttons, each naming where the act lands.
[Partiful](https://mobbin.com/screens/875b0f88-f827-413b-af4e-e8316e1fd76b) ships `Download CSV`
(the format, not "export"). [LINE](https://mobbin.com/screens/3b62204c-46f5-4c0c-837b-2f58278ca2b9)
ships `Copy event link`.

This matches UX_07 levels 2-3 exactly, and we are thin here: only **7 of 277** labels use
copy/download/export phrasing. Not a defect on its own -- but any surface that prepares text for
the host to send elsewhere and does not say `Copy` is misfiled, and this read did not enumerate
those sites. **Open, not closed.**

### 3e. Record-only phrasing is nearly absent from our labels

UX_07 requires `Mark ...` or `Record ...` whenever the app records an attestation rather than
performing the act. Measured, we have **two**:

```
HostShellV2.jsx:9119   [mini]  Record it
HostShellV2.jsx:13131  [cta]   Mark thanked
```

Two record-only labels across 277 is not plausible for an app whose vendor, payment and
communication surfaces are largely attestation. **This is a flag, not a finding** -- proving it
needs each candidate traced tap-to-result per UX_07's "classify on the full path" rule, which this
pass did not do. Do not read "2" as "we have 2 record-only actions"; read it as "we label 2 of them
that way".

Named as the next audit, not fixed here.

### 3f. The anti-pattern worth keeping as a specimen

[LINE](https://mobbin.com/screens/3b62204c-46f5-4c0c-837b-2f58278ca2b9) stacks **three full-width
buttons**: `Update Response`, `Send Message to Respondents`, `Copy event link`. Green wins by
colour alone; the other two are the same slab in the same size.

It is the clearest illustration of why our "one `.cta` per view" rule exists, and it is a leader
doing it badly. Worth keeping in the board as the negative case.

---

## 4. Live defects -- 7 bare labels, all file:line verified

Doctrine (UX_06: *"Bad: Go, View, Open, Manage, Details"*) banned these outright. All 7 sit on
scrolling sheets with no title naming the object, so 3b does not excuse them either.

```
HostShellV2.jsx:13620  [mini]  done
HostShellV2.jsx:13739  [mini]  done
HostShellV2.jsx:13805  [mini]  done
HostShellV2.jsx:13856  [mini]  done
HostShellV2.jsx:14573  [mini]  done
HostShellV2.jsx:15463  [mini]  done
HostShellV2.jsx:15023  [mini]  View
```

Two problems, not one: the label is bare, **and `done` is lowercase** -- breaking the case
convention of all 276 others. Six sites, one word each; the fix is naming what is done at each.

**Not yet established:** what each of the six actually completes. Six labels reading `done` in one
file is exactly the case where reading the call site is cheaper than guessing, and this pass did
not open them. Fix requires that read first.

---

## 5. What this says about the uncommitted LodgingCockpit change

The working-tree diff on `hostv2/src/LodgingCockpit.jsx` does two things this read bears on:

1. **Retires the local `.lc-cta` vocabulary for the app's real `.cta` / `.cta soft` atoms.**
   Supported. 27 apps and not one runs two button vocabularies on one surface. Keep.
2. **Merges paste + read into one button whose label follows the box** (`Paste what I copied` when
   empty, `Read what I pasted` when full). Supported by the same evidence as 3b -- one act, one
   button, and the label states which moment it is in. Amie's `Mark as done` sitting beside `Save`
   ([screen](https://mobbin.com/screens/042b1a2e-7880-44d0-b810-65774946dfcf)) is the pattern it
   avoids: two similar-weight controls where the host must work out which is theirs.

Both are consistent with this read. **Neither has been driven live** -- the change is uncommitted
and unbuilt as of this doc.

---

## 6. Proposed doctrine amendments

| # | File | Change | Why |
|---|---|---|---|
| A1 | UX_06 "CTA Language" | Title Case examples -> **sentence case** | 93% of shipped labels and the leader majority; doctrine is the 5% holdout (3a) |
| A2 | UX_06 ban list | Keep the ban, add the exemption: *a bare verb is legal only when a title in the same frame names the object* | Explains why leaders' `Done`/`Next` work and ours do not (3b) |
| A3 | UX_05 / UX_07 | New rule: **the consequence sits within one glance of the verb** -- inside the label or directly above it, never correlated from elsewhere | 11 of 13 leaders; we do it once (3c) |

A4, weaker and offered rather than proposed: record the disabled-primary ruling from section 2 --
dim plus a stated blocker, or live-and-focus on single-blocker surfaces only.

---

## 7. Sequenced, cheapest first

1. **Name the 7 bare labels** -- read the 7 call sites, write what each completes. No layout risk.
   *Blocked on reading the sites; do not guess the words.*
2. **Amend UX_06 / UX_05 per A1-A3.** Documentation, but it stops the next agent importing Title
   Case. Cheap and it compounds.
3. **Kill the 180deg gradient**, keep `#4E6877`, keep `--sheen`. Pure CSS, no reflow. Unchanged
   from 2026-08-01 -- now with the sharper reason (section 1).
4. **Put the number in the label** at the sites that already have it in scope. Per-site copy, no
   layout change (3c).
5. **Classify the record-only surfaces** tap-to-result, then relabel per UX_07 (3e). A real audit,
   not a sweep.
6. **The full-width primary pass** -- still the 42-site layout change the 2026-08-01 doc warned
   against shipping as one commit. Unchanged, still last.

Items 1-4 are copy and CSS. Item 6 is the only one that needs a host ruling on taste.

---

## 8. Reproduce

Leader evidence: Mobbin `search_screens`, platform ios, four queries -- full-width commit buttons
with a total; mark-a-task-complete with a note field; host guest-list with an invite action;
checkout with a disabled primary and helper text. 27 screens, links inline above. **No hands-on
with any competitor product** -- every claim is from a static screen, so flows, states and motion
are out of scope.

Our label numbers, this commit:

```
python3 scratchpad/ctalabels.py hostv2/src/HostShellV2.jsx hostv2/src/LodgingCockpit.jsx
```

277 literal labels; 196 elements had no literal label (icon-only or fully interpolated) and are
**excluded from every percentage here**.

Two scanner traps, both hit and fixed while measuring -- keep them if this is ever re-run:

- `<(button|a)\b[^>]*?>` truncates the opening tag at the `>` inside an `onClick={() => ...}`
  arrow, so handler CODE lands in the "label". Needs a brace-and-quote-aware scan for the real end
  of the tag. First cut reported a 499-word CTA.
- Stripping all descendant tags pulls a wrapper's whole subtree into the label. Take **depth-0 text
  nodes only**.

The interpolated 196 are a real blind spot: a label composed at runtime cannot be measured this
way, and that is where a template like `${n} guests` would hide. Section 3c's "we do it once" is
therefore a floor, not a count.
