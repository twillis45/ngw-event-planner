# Admin console — what an operator can and cannot see

**Created 2026-08-29, at the stage 7 recording.** The Path to Production spine
asks for this at stage 3 and updated at every stage recording afterwards; it had
never existed here, and nothing noticed, because an admin console *does* ship
(`?admin=1`) and its presence read as coverage. The console existing is not the
same as knowing what it does not cover.

The question this answers is narrower and harder than "what does the dashboard
show": **what can an operator not currently SEE or DO?**

For the shipping profile the operator *is* the host. So the question becomes:
what is actually stored, was durable storage ever granted, did a merge silently
resolve a conflict, and can they get their data back out. A tool whose failures
are invisible to the only person who could act on them is the failure mode.

**Method.** Read-only static analysis over the tree, produced by a subagent and
then re-verified by hand — the five load-bearing claims below were each
re-measured before this file was written. Status is what was read. BUILT and
PARTIAL carry a `file:line`; NOT BUILT means the grep found nothing *and* the
reading found nothing. No item was invented to reach a count.

**Not verified at runtime.** The console's live drive needs an admin-role
Supabase sign-in, which this pass did not have. Every status traces to a line,
not to a screen.

---

## SEE IT — the read surface

| Item | Status | Evidence |
|---|---|---|
| Admin audit log view (server actions, newest first) | BUILT | `src/admin/AdminConsole.jsx:8087`; `backend/app/routers/admin.py:107` |
| Per-event sync status + last confirmed sync | BUILT | `hostv2/src/HostShellV2.jsx:15417`; reader `src/lib/api/syncState.js:53` |
| Queued write count and sync-failure state | BUILT | `hostv2/src/HostShellV2.jsx:15420` |
| Save-failure banner naming the cause | BUILT | `hostv2/src/HostShellV2.jsx:6832` — persistent `role="alert"`, not a toast |
| Per-event CSV import history | BUILT | `hostv2/src/HostShellV2.jsx:18602`, keyed per event at `:4883` |
| Local write log — every write and every REFUSED write, last 50, with reason | **PARTIAL** | Written at `src/lib/customEventStore.js:126`. **No reader in app code.** A refused write is invisible to the person it happened to |
| Backup snapshots (10 timestamped, pre-write) | **PARTIAL** | `listBackups()` `:113`, `readBackup()` `:121` — zero non-test callers. They exist and cannot be seen |
| Disclosure that a merge resolved a conflict | **PARTIAL** | `hostv2/src/HostShellV2.jsx:1505` — cloud-wins fires a transient toast. No durable record, no diff, nothing after it clears |
| Admin "This Browser" panels reflect the shipping app | **PARTIAL — MISREPORTING** | `src/admin/AdminConsole.jsx:1323` reads `localStorage['ngw-events']`, the **CRA** key. hostv2 writes `ngw-hostv2-custom-events` (`src/lib/customEventStore.js:30`). Every writer of `ngw-events` is in the frozen `src/App.js`; hostv2's only mention is a comment at `:775`. **These panels read empty against the shipping app while labelled as showing this browser** |
| Durable-storage grant (`navigator.storage.persisted()`) | **NOT BUILT** | Zero hits repo-wide |
| Storage usage vs quota (`estimate()`) | **NOT BUILT** | Zero hits. Quota is discovered only by a failed write (`hostv2/src/HostShellV2.jsx:2513`) |
| Per-event write provenance | **NOT BUILT** | The write log is one global 50-entry array, not per event |
| Build / release identity visible in the running app | **NOT BUILT** | `RELEASE_SHA.txt` is written into the artifact only (`pages-from-source.yml:161`); no reference in any source file |

## DO IT — mutations

*(A read surface is safe and a mutation is not, which is why it comes second.)*

| Item | Status | Evidence |
|---|---|---|
| Corpus publish / advance / archive / rollback — one choke point, confirmed + audited | BUILT | `src/admin/AdminConsole.jsx:2184` (`run()` → `recordAudit`) |
| Revoke an invitation (gated, audited) | BUILT | `backend/app/routers/admin.py:705`, `require_admin` `:713` |
| Add an admin note on a user | BUILT | `backend/app/routers/admin.py:516` |
| Delete a campaign (confirm + audit) | BUILT | `src/admin/AdminConsole.jsx:4967` |
| Retry sync now | BUILT | `hostv2/src/HostShellV2.jsx:15426` |
| Delete an event (explicit flag, backup taken first) | BUILT | `hostv2/src/HostShellV2.jsx:2578`; guard `src/lib/customEventStore.js:158` |
| Undo last CSV import / clear history | BUILT | `hostv2/src/HostShellV2.jsx:4899`, `:4913` |
| Demo seed / reset / remove | BUILT | `hostv2/src/HostShellV2.jsx:19690` |
| Export all events to a file | **PARTIAL** | `hostv2/src/HostShellV2.jsx:6842` — the only "Download a copy" lives **inside the save-failure banner**. A host whose storage is healthy has no export path |
| Restore a backup snapshot | **PARTIAL** | `restoreBackup()` `src/lib/customEventStore.js:196` — implemented, guarded, tested, **zero callers**. Recovery exists in the library and not in the product |
| Import an export back in (merge, non-destructive) | **PARTIAL** | `importCustomEvents()` `:224` — implemented and tested, no caller and no file input. The export above cannot be read back |
| Request persistent storage | **NOT BUILT** | No `storage.persist()` anywhere. Eviction can take the only copy with no request and no notice |

---

## The three questions

**A. Is there an audit log, and does it exist before the first mutating action?**
Server side, yes: `admin_audit_log` is written in the same transaction as the
write (`backend/app/routers/kcr.py:119`), namespace-enforced at
`admin.py:100`. **In the shipping hostv2 app, effectively no.** The only local
trail is the 50-entry write log, which is written before every mutation and has
no reader — so a mutation and a refused mutation are equally invisible.

**B. Which admin surface is reachable from the app that ships?**
**None.** `hostv2/src/main.jsx:44` branches on `?vendor=`, `?rsvp=` and
`?demo=lodging` only; there is no `admin` param and no `AdminConsole` import in
the hostv2 tree. The console is mounted solely by the frozen CRA at
`src/index.js:42`. The shipping app's whole operator surface is the `?demo=1`
bar plus the sync line. The 8/21 review's retirement plan — move the `?admin=1`
gate to whatever shell serves `/` — has not been executed.

**C. The highest-value NOT BUILT item.**
**Durable-storage grant status.** The shipping profile is localStorage-only by
design. The store already carries backups, a drop-guard and an export
serializer, all built because the only copy was lost once — and every one of
them protects against *the app* dropping data while none protects against *the
browser evicting it*. The host learns storage was never durable at the moment a
write fails, which is after the data is gone. It is one API call to ask and one
line to report the answer.

---

## The pattern across both tables

Four recovery functions — `restoreBackup`, `importCustomEvents`, `listBackups`,
`readWriteLog` — are **implemented, guarded, unit-tested, and have zero callers
outside their own tests.** Verified by count, not by eye.

That is not missing work. It is finished work that never reached a surface, and
it is invisible to every instrument this repo has: the functions are covered, so
coverage looks healthy; the tests pass, so the suite looks green. A capability
with no caller fails exactly like one that was never written, and costs more,
because someone already paid for it.
