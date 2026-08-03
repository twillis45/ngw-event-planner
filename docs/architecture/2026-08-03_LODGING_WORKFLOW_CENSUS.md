# Where everyone stays - workflow census

**Date:** 2026-08-03 - **Scope:** every state the lodging workflow can be in,
and whether code already supports it. Written before designing the Figma flow so
the screens describe the product rather than inventing one.

Every row was verified by inspection at this commit. file:line included.

---

## 1. The engines that exist

| Function | file:line | Renders in hostv2? |
|---|---|---|
| `lodgingSearchBlocked` | lodgingIntel.js:878 | YES - HostShellV2.jsx:10233 |
| `lodgingSearchLinks` (3 doors) | lodgingIntel.js:909 | YES - 10226 |
| `mustHavesFor` / `mustHaveBasis` | lodgingIntel.js:836/844 | YES - 10136-10137 |
| `rankCandidates` | lodgingIntel.js:672 | YES - 3127, 10374 |
| `lodgingRecommendation` | lodgingIntel.js:1000 | YES - 10658, 10697 |
| `stayFromPick` | lodgingIntel.js:1157 | YES - 10068, 11030 |
| `backupFromRunnerUp` | lodgingIntel.js:1174 | YES - 11031 |
| `lodgingCommitted` | lodgingIntel.js:1127 | YES (money rail) |
| `unfurlListing` / `isUnfurlConfigured` | lodgingIntel.js:371/352 | YES (paste path) |
| **`lodgingKitchen`** | lodgingIntel.js:187 | **NO - ZERO render sites** |

---

## 2. THE GAP (the finding)

### 2a. The kitchen fact is never shown where it is decided

`lodgingKitchen(event)` has **zero** consumers on the lodging surface. Measured:

    grep -rn "lodgingKitchen" src hostv2/src | grep -v lodgingIntel.js | grep -v __tests__
      src/lib/foodSpan.js:21,37              (added 2026-08-03)
      src/lib/assembleRevealEngines.js:12,283 (added 2026-08-03)

So the host answers "where does everyone sleep" on the LODGING sheet, and the
consequence of that answer appears only on the FOOD sheet and the reveal. The
surface that owns the decision never states what the decision does.

This is the single largest workflow hole. The Figma flow must include a
kitchen-consequence state on the lodging surface itself.

### 2b. The question that sets the fact can be suppressed

`playbooks/index.js:756`

    if (d.id === 'dest_lodging' && (baseIds.has('lodging') || baseIds.has('room_block'))) return false;

`dest_lodging` ("How are guests staying?") is REMOVED when a `lodging` or
`room_block` base decision already exists. On those events the multiple-choice
path to the kitchen fact never appears, and the ONLY remaining source is a
pasted Airbnb/Vrbo URL (`lodgingKitchen` step 1). A host who books a hotel by
phone and types the name reaches `kitchen === null` permanently, and the food
plan never learns.

### 2c. A stale route on the blocked state

`lodgingIntel.js:905` still returns `route: { tab: 'Event Details', focusField:
'event-venue' }`. That field writes `venue`, not `venueCity` - verified live
earlier this session (`{"venue":"Santa Fe, NM","venueCity":""}`). hostv2 no
longer follows it (it asks for the town in place via `CityField`), so this is
dormant rather than broken, but any new consumer of `lodgingSearchBlocked` that
honours `route` would reproduce the bug.

---

## 3. The states the workflow actually has

Derived from the sheet's own render branches and copy (HostShellV2.jsx
10028-11190).

| # | State | Trigger | Evidence |
|---|---|---|---|
| W1 | **Blocked - no town** | `isDestination` and zero search links | 10233; "Use this town", placeholder "Santa Fe, NM" |
| W2 | **Open - nothing weighed** | `li.options.length === 0` | 10117 empty state; 3 doors at 10226 |
| W3 | **Intake** | host pastes a link / uses clipboard / phone path | "Paste a link from Airbnb or Vrbo", bookmarklet toast, `unfurlListing` |
| W4 | **Weighing** | 2+ options, none chosen | "Places you're weighing", fit count `N fit your M` |
| W5 | **The pick** | one option `status === 'chosen'` | "Make it the pick", `stayFromPick`, backup at 11031 |
| W6 | **Booked / rooms** | room-block model | "Who's booked a room", "Group rate ends", "Fronted so far", "Booking code" |
| W7 | **Kitchen consequence** | `lodgingKitchen` is true / false / null | **NOT BUILT** - see 2a |

Additional real states already in code, worth screens:
- **All declined** - "Everyone on the list has declined - nobody needs a room right now."
- **Money-safe date chain** - "The money-safe dates", "If you had to cancel"
- **Guest preference** - photos ride to the invite; guests tap a preference

---

## 4. What the Figma flow must carry

1. W1 blocked (ask the town in place - never route to `event-venue`)
2. W2 open, three doors, must-haves from the event
3. W3 intake (paste / clipboard / phone)
4. W4 weighing with fit + rank + recommendation
5. W5 the pick + backup + committed money
6. W6 rooms, group-rate deadline, cancel window
7. W7 kitchen consequence -> food  (**new; closes 2a**)

Rule carried from the audit: the flow states what is true and never invents a
stay, a price, or a kitchen. `null` kitchen reads as the open question it is.

---

## 5. Reproduce

    grep -rn "lodgingKitchen" src hostv2/src | grep -v lodgingIntel.js | grep -v __tests__
    grep -n "dest_lodging" src/lib/playbooks/index.js
    grep -n "lodgingSearchBlocked(\|lodgingSearchLinks(\|mustHavesFor(" hostv2/src/HostShellV2.jsx
