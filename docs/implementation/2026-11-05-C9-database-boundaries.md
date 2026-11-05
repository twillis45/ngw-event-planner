# C9 database boundaries — November 5, 2026

Scope: S9-1 (public retention RPC) and S9-2 (direct browser RSVP writes), against canonical production source, without merging the audit branch.

## Change and runtime effect

Migration `019_browser_privilege_boundaries.sql` removes PUBLIC/anon EXECUTE from every public SECURITY DEFINER function. Authenticated membership, invitation, and provisioning RPCs retain explicit authenticated access. The signup trigger remains installed; its function has no browser callers. Retention remains available to its owner/owner-created cron job and service_role, never browser roles. All seven functions receive the explicit search path `pg_catalog, public, pg_temp`; table/auth references in their existing bodies are schema-qualified.

The migration removes the browser RSVP insert policy. The existing FastAPI path remains the submission writer, so code resolution, input validation, rate limiting, and idempotency cannot be bypassed through Supabase browser inserts. This does not replace or change the public API contract.

`scripts/check-security-definers.js` evaluates ordered migration declarations, grants/revokes, search paths, and RSVP policies. It masks comments, literals, and dollar-quoted bodies so text inside them cannot impersonate a security control. The Jest gate also tests renamed policies, default PUBLIC policy roles, explicit anon grants after PUBLIC revocation, and CREATE OR REPLACE privilege retention. Unsupported function declarations fail closed. This source guard covers the repository's SQL forms; it is not a complete PostgreSQL parser or a database execution test.

## Verification

- Original source reproduced two failed assertions: anonymous definer access/unsafe search paths and browser-callable retention. Five initial assertions: two failed, three passed (`/tmp/c9-rpc-red.log`).
- Final six-assertion source gate passed. Source CLI enumerates seven definers, with no anonymous grants, unsafe paths, or browser RSVP policies.
- Red-proof: temporarily removed the retention revoke; CLI exited 1 naming `purge_old_rsvp_submissions(integer)`. Added a renamed anonymous insert policy; CLI exited 1 naming it. Restored migration automatically in `finally`; CLI exited 0. Evidence: `/tmp/c9-rpc-redproof.log` (retention fault), tool output (both faults/restoration).
- No PostgreSQL server/client or Docker was available in this environment. No production migration was applied and no production privilege or signup/cron behavior is claimed verified.

## Release gate still required

Apply the migration to a disposable restored Supabase project first, verify authenticated signup/provisioning, membership reads, invite claims, API RSVP submission/read-back, and scheduled retention. Then apply through the canonical migration deployment and record production privileges/RLS. Expected: anon and authenticated cannot execute purge; anon cannot execute any public SECURITY DEFINER RPC; authenticated can execute only the five studio helpers; no browser role can insert into RSVP storage; service-role API write/read still works. Confirm cron job execution and backup/restore evidence. Do not mark S9-1/S9-2 production-closed from this source check alone.
