# Phase C2 input - semantic classification of the 18 `p_tableware` lines

**This is a decision artifact, not an implementation.** No family was created, no
value touched. C1 does not depend on resolving the ambiguous rows here.

The approved boundary rule:

> Canonical families are defined by shared meaning, unit, contents, assumptions
> and adjustment logic - not by field name or matching value.

`p_tableware` fails that rule four ways: 18 lines, **four different units**, and
at least one line whose contents are not a place setting at all.

---

## The 18 lines, measured

| Playbook | Value | Unit | Authored contents | Candidate family | Conf. | Decision needed |
|---|---|---|---|---|---|---|
| Birthday | 1.5 | set | Plates, cups, napkins, cutlery | `disposable_place_setting` | High | none - governed |
| Get-Together | 1.5 | set | Disposable plates, cups, napkins, cutlery | `disposable_place_setting` | High | none - governed |
| Fish Fry | 1.5 | set | Disposable plates, cups, napkins, cutlery | `disposable_place_setting` | High | none - governed |
| Juneteenth Cookout | 1.5 | set | Disposable plates, cups, napkins, cutlery | `disposable_place_setting` | High | none - governed |
| Gender Reveal | 1.5 | set | Plates, cups, napkins, cutlery (pink + blue) | `disposable_place_setting` | High | colour is decor, not a claim change |
| Graduation | 1.5 | set | Plates, cups, napkins, cutlery **+ table covers** | `disposable_place_setting` | Med | does the bundled table cover change the unit? |
| Baby Shower | 1.5 | set | Plates, cups, napkins, cutlery **+ linens** | `disposable_place_setting` | Med | linens are reusable - bundled claim |
| Bridal Shower | 1.5 | set | Plates, cups, **champagne flutes**, napkins, cutlery | `disposable_place_setting` | Med | flutes may be reusable/rented |
| Crab Feast | 1.5 | set | Disposable plates, **bowls**, cups, napkins | `disposable_place_setting` | Med | no cutlery; bowls are seafood-specific |
| Kwanzaa Gathering | 1.5 | set | Plates, cups, napkins, cutlery (**or set the good table**) | `disposable_place_setting` | Med | authored alternative is reusable serviceware |
| Watch Party | 2 | set | Paper plates, napkins, cups, cutlery | `disposable_place_setting` | High | why 2 vs 1.5 - variant or different assumption? |
| Bachelorette Party | 2 | set | Cups, **shot glasses, flutes**, plates, napkins, cutlery | `specialty_food_service_supplies` | Low | drinkware-led; may be two claims |
| Pupusa Gathering | 2 | set | Plates, napkins, forks (**sturdy** - pupusas are heavy) | `disposable_place_setting` | Med | no cups; sturdiness is a spec not a qty |
| The Cookout | 3 | set | Disposable plates, cups, napkins, cutlery (sturdy) | `disposable_place_setting` | High | why 3 - highest variant, needs rationale |
| Sweet 16 | 2.5 | plates/cups | Plates, cups, napkins, cutlery, serving utensils | `disposable_place_setting` | Low | **unit mismatch** + serving utensils bundled |
| Quinceañera | 2.5 | place settings/cups | Tableware / disposables (if venue or caterer does not) | `disposable_place_setting` | Low | **unit mismatch**, `essential: false`, vendor-conditional |
| Retirement Party | 6 | pieces | Plates, cutlery, napkins, cups (sturdier disposables) | `disposable_place_setting` | Low | **unit mismatch** - 6 pieces ~ 1.5 sets of 4? |
| **Low Country Boil** | 2 | set | **Paper towels, napkins, small bowls, shell buckets** | `specialty_food_service_supplies` | High | **EXCLUDED by ruling** |

---

## Summary by candidate family

```
  disposable_place_setting        16 candidates, but only 11 unambiguous
  specialty_food_service_supplies  2  (Low Country Boil, Bachelorette Party)
  napkin_service                   0  (no line is napkins-only; all are bundled)
  event_service_kit                0  (no flat kit inside p_tableware)
  reusable_serviceware             0  as a line; 3 lines BUNDLE reusables
  ambiguous                        5  (3 unit mismatches + 2 contents questions)
```

## The clean cohort

The 10 lines already governed in 5F.11 Batch 2 - Birthday, Baby Shower,
Get-Together, Graduation, Bridal Shower, Gender Reveal, Fish Fry, Juneteenth
Cookout, Crab Feast, Kwanzaa Gathering - are all `1.5 set` and all pass the unit
test. **But the host's instruction stands: verify contents rather than assume
the earlier backfill established the boundary.** This table is that verification,
and it flags four of those ten (Graduation, Baby Shower, Bridal Shower, Crab
Feast, Kwanzaa) as bundling something beyond a disposable place setting.

That does not invalidate the existing grounding - the source covers the
plates/cups/cutlery core, and the existing records already disclose the napkin
limitation. It does mean the *family boundary* is narrower than the governed set.

**Provisional clean cohort: 5 lines** - Birthday, Get-Together, Fish Fry,
Juneteenth Cookout, Gender Reveal. Every other 1.5 line bundles an extra item
that a human should rule on before it joins a canonical family.

---

## Rulings needed before C2 can execute

1. Does a bundled non-disposable (table covers, linens, flutes, "the good table")
   remove a line from `disposable_place_setting`, or is it a disclosed limitation
   like napkins already are?
2. Are the three unit mismatches (`plates/cups`, `place settings/cups`, `pieces`)
   convertible to `set`, or must they stay individually governed? Retirement
   Party's 6 pieces is the specific question.
3. Watch Party 2 / The Cookout 3 - authored variants of one family (as with ice),
   or a different assumption about service style?
4. Bachelorette Party - one place-setting claim plus a separate drinkware claim?

None of these blocks C1.
