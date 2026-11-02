# EVENT COVER IMAGERY — HOW THE REVIEW FIXTURES WERE MADE

**Recorded 2026-10-21 at the owner's request**, because part of this may be
useful inside the app later. This is a record of a method, not a decision to
build it.

**Nothing here is authorized for production.** `event.coverImageUrl` still has
no writer anywhere in the repo, and the media pipeline is explicitly out of
scope. What follows is how the design-review fixtures were produced.

---

## 1 · WHAT WORKED, AND WHAT DIDN'T

Three attempts. The first two failed for reasons worth keeping.

| # | Prompt direction | Result | Why it failed |
|---|---|---|---|
| 1 | Procedural CSS/PIL bokeh — warm discs, blur, vignette, grain | Abstract gold blur | No subject. The owner's note: *"I want something people place or thing associated with the event type."* An abstract texture is decoration, which the art direction forbids. |
| 2 | *"long banquet table, black and gold styling, tall tapered candles, gold-rimmed glassware"* | Beautiful, and wrong | Read as a luxury wedding brochure. Owner: *"don't make it so formal, this is the host shell."* |
| 2b | *"outdoors under strung cafe lights, mismatched glasses, flowers in jars"* | A Tuscan farmhouse dinner | Overcorrected. Owner: *"keep in mind the possible venues and what the event is for."* |
| **3** | **The actual event, at an actual venue** | **Correct** | See below. |

### The rule that made attempt 3 work

> **Derive the image brief from the event's own facts, not from a mood.**

For the standing review fixture those facts are, verbatim from the intake text:
Wanda's 50th birthday **and** a 30-year Army retirement · **~75 guests** ·
**Maryland/DC** · **black and gold** · **formal Army recognition followed by a
celebration** · **$5,000 budget**.

Read together: $5,000 for 75 people is roughly $67 a head, which is a rented
hall, not a ballroom. "Formal recognition followed by a celebration" means a
**stage with a podium**. "Black and gold" is the linen and the chairs. And the
Place flow's own venue filters — `Recommended · Indoor · Outdoor · Hotels ·
Event Spaces · Restaurants · VFW / Military` — name the venue class directly.

None of that is mood. All of it is in the event blob already.

---

## 2 · THE PRODUCING CALL

Model `gpt_image_2_5`, 16:9, 2 variants, **0.25 credits** for the pair
(preflighted with `get_cost: true` before spending).

The prompt that produced the fixture in use:

> Photograph of an indoor event hall set up for an evening celebration of about
> seventy-five guests: round banquet tables with black tablecloths and simple
> gold accents, modest centerpieces of white flowers, chiavari chairs, a small
> stage with a podium and a lectern at the far end, warm amber uplighting on the
> walls, wood floor, string of warm light along the ceiling, dark background,
> shallow depth of field, **no people**, wide crop. A real rented community
> event space or hotel function room, **mid-range and well kept, not a luxury
> ballroom and not a backyard**.

### The clauses that are load-bearing

| Clause | Why it is there |
|---|---|
| **"no people"** | Product rule. No guest image may be inferred, and no photograph may be attached to a named guest unless the data establishes that relationship. A cover with faces in it invites exactly that mistake. |
| **"about seventy-five guests"** | Sets the room's apparent size. Without it the model draws either a wedding for 300 or a dinner for 8. |
| **"a small stage with a podium"** | This is the *recognition* half of the event. It is the single clause that makes the image belong to this event rather than any party. |
| **"mid-range and well kept, not a luxury ballroom and not a backyard"** | The budget, stated as a visual constraint. Negative examples did more work here than positive ones. |
| **"dark background, shallow depth of field"** | The image has to carry overlaid type on its left third. |

---

## 3 · POST-PROCESSING

Two crops, both from the same source:

| Output | Size | Treatment |
|---|---|---|
| `banner.jpg` | 1600 × 895 | Full frame, `background-position: 52% 62%` so the tables sit under the statement and the stage stays visible at right. |
| `banner-phone.jpg` | 1100 × 333 | Cropped to the lower-center band. **A 108px strip of the full frame reads as mush — it needs its own tighter crop**, not a scaled-down copy. |

No color grading is applied, and that was a measured decision — see §4.

---

## 4 · COLOR TEMPERATURE, MEASURED

The owner asked whether the photograph's temperature works against both themes.
Sampled from the generated image and from the owner's own sheet:

| | Hue | Share of frame |
|---|---|---|
| Photograph — shadows | **31°** (warm) | 54% |
| Photograph — midtones | 34° | 26% |
| Photograph — highlights | 34° | 19% |
| Light theme field | 43° | — |
| **Light theme nav / black** | **191°** | — |
| **Dark theme field** | **195°** | — |

A grading pass was tried — pulling the photograph's shadows toward the themes'
blue-black — and then **discarded**. Two reasons:

1. At 3–5% lightness the hue is not visible, so the grade changed nothing a
   person could see.
2. The visible warmth lives in the **midtones**, which are the subject. Cooling
   them would wreck the photography to solve a problem nobody can see.

**The fix was the scrim, not the photo.** A single blue-black (`#040D0F`,
hue 191 — sampled from the owner's own sheet) serves as the nav, the banner
scrim and the dark theme's ground. Where the photograph meets the interface,
it meets that one value, with a hard edge and no blend. The photograph itself
stays warm, which is what the whole family does.

---

## 5 · IF ANY OF THIS EVER REACHES THE APP

Stated as constraints, not as a plan:

1. **A generated cover is a fixture until a host supplies one.** It must be
   visibly labeled and must never persist as though the host set it.
2. **The brief comes from the event blob**, not from a theme picker: event type,
   guest count, budget per head, stated style, and the venue class once Place
   has one. Everything in §1 was derived, not chosen.
3. **No people, ever**, for the reason in §2.
4. **One blue-black.** Whatever the image, the surface it meets is `#040D0F`.
5. **Two crops minimum** — the phone strip is not a scaled desktop banner.
6. **Cost is real.** 0.25 credits for two variants here. Per-event generation on
   a real roster of events is a line item, and `get_cost` exists to preflight it.
7. **It changes nothing about attendance truth.** A cover is decoration on a
   surface whose job is a defensible number.
