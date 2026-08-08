# Board ruling — how the two engines share one hero

_Convened 2026-08-07 on the finding that hostv2 never renders the surfaceRegistry
raise ledger. Required before wiring `raiseAll`, because the wiring puts two
engines in competition for the same slot._

**Ruling: RAISES OUTRANK DECISIONS, with one exception. Unanimous.**

---

## The finding this rules on

hostv2 imports `raiseCounts` only (`HostShellV2.jsx:119`), uses it at `:5530` for
qidx attention tints, and qidx opens with `if (elegantMode) return null;` — elegant
being the production default. `raiseAll` is imported only by `src/CommandCenter.jsx`,
the frozen CRA. What elegant renders is `decisionBoard = playbookDecisionBoard(...)`
(`:1343`), and `playbooks/index.js` has zero references to the registry.

Net: ~15 registry surfaces raise grounded, tested items that reach no host.

## The question

Wire `raiseAll` in and two engines want the hero:

- **playbookDecisionBoard** — *authored* decisions. "Indoor or outdoor?" Things the
  host has not yet CHOSEN. Known from the moment the event exists.
- **surfaceRegistry raises** — *reactive* conditions. A COI expired, a vendor never
  came back, a refund window closes Friday. Things that became true since.

## The seats

**Norman.** A decision the host hasn't made is a question. A raise is a FACT that
changed. Showing a question above a changed fact means the app knows something and
asks about something else instead. *Raises first.*

**Rams.** Both lists are already ranked internally. Do not invent a third ranking
layer to merge them — concatenate, raises first, and let each keep its own order.
Less machinery, not more.

**Tufte.** The registry carries `severity`; the decision board carries urgency by
position. Do not average them into a score — a synthetic blended rank is the kind
of number that looks precise and means nothing.

**Rafanelli (logistics).** On the day, a vendor who hasn't confirmed outranks any
choice still open. Lived practice is unambiguous.

**Grandmother.** "If something went wrong, tell me that first. I can pick the
tablecloth later." *Decisive.*

**Saarinen — THE EXCEPTION, accepted unanimously.** An UNRESOLVED UPSTREAM decision
must still outrank a downstream raise. If the host has not chosen indoor or outdoor,
chasing the tent vendor is noise — the answer may delete the vendor. This is already
locked in the tree by `5f4691c9` ("unresolved upstream OUTRANKS downstream, and prove
it bites") and that lock must survive the merge, not be overwritten by it.

## The ruling

```
hero order =
  1. unresolved UPSTREAM decisions        (existing rule, unchanged, wins outright)
  2. registry raises, severity order       (critical → attention)
  3. remaining playbook decisions          (existing internal order)
```

**Conditions, all binding:**

1. **No blended score.** Concatenate. Each engine keeps its own internal order.
2. **The upstream lock is not weakened.** `5f4691c9`'s test must still pass
   unchanged after the wiring. If it goes red, the wiring is wrong, not the test.
3. **Provenance survives.** Every merged item still declares which engine produced
   it, per *Decisions Wire to Engines*. A merged hero must not become anonymous.
4. **Cap the raise block.** The registry can raise many items at once (a 12-vendor
   event with stale COIs). The hero shows the top raise; the rest go to the list.
   Grandmother's rule — one loud thing per screen — survives the merge.
5. **Drive it in elegant with NO query string** before it is called done. Every
   failure in this thread was invisible to a passing suite.

## Why this is not a small edit

The wiring itself is an import and a concatenation. The RISK is condition 2: the
upstream rule and the severity rule can disagree on the same event, and the only
proof they don't is the existing test plus a live drive. Budget for that, not for
the import.
