# Authenticated account deletion — November 5, 2026

The API had no account-deletion route: the new valid-body bare request reproduced 404 before implementation. `DELETE /api/account` now accepts `{ "confirmation": "DELETE" }` with the signed-in account's Bearer token. It never accepts a target user ID. It evicts that token before identity verification, rejects the local development identity, requires exact confirmation, and requires a server-only `SUPABASE_SERVICE_ROLE_KEY`. That key is never returned to the client or included in a capabilities response.

## Deletion boundary

The route preflights under membership/studio locks, then removes disposable personal-event uploads through the real Supabase Storage API. The selection uses actual Storage ownership and known personal event IDs; a user-looking path prefix alone is insufficient. Caller-owned shared/unknown uploads fail closed with `storage_transfer_required` before any files are removed. A sole owner of a shared studio must first make another member an owner (`ownership_transfer_required`). Collaborators' events and shared content are retained.

The real Supabase Auth admin DELETE fires migration021's `auth.users` BEFORE DELETE trigger. Its application cleanup and identity deletion are one database transaction. The trigger locks/rechecks memberships and remaining Storage ownership, deletes solo studios and their non-FK event artifacts, removes memberships/invitations, and scrubs optional purchaser/creator/legacy ownership attribution. Existing studio cascades remove events, clients, studio settings, and preferred vendors. Receipt rows and immutable admin/security records survive, following their existing explicit schema intent. Shared content is retained; this is not a claim that free text across collaborators' records can be reliably attributed and scrubbed.

Storage API deletion happens earlier and cannot join the GoTrue database transaction. If a later step fails, personal files may already be removed; every relevant error says so. Membership table locks protect selection while files are removed; the trigger rechecks after the external phase. A new shared-file/ownership constraint between phases fails identity/application deletion rather than silently deleting collaborators' data. Retrying after reconciling constraints remains possible. No Storage metadata is directly deleted or rewritten.

Migration021 also adds NOT VALID auth.users foreign keys on studio membership and studio creator references. They enforce new writes, preventing an unexpired deleted-user JWT from recreating studios/members through existing RPC/PostgREST paths. Historical orphan rows are deliberately NOT validated by this change; review/cleanup and VALIDATE are separate production evidence. The trigger helper uses `pg_catalog, public, pg_temp`, revokes PUBLIC/anon/authenticated execution, and grants no browser access.

Cache entries for the deleted user are invalidated in the current worker. Every cached authentication also checks shared `auth.users` existence through the database; failure falls back to fresh GoTrue verification. Another worker therefore cannot honor a deleted identity solely from the five-minute local cache.

## UI contract

- Success: `{ "deleted": true, "retained_categories": ["payment_receipts", "security_and_admin_records", "shared_studio_content"] }`.
- Errors use `detail: {code, message}` except the existing authentication 401 contract.
- 400 `confirmation_required`; 403 `signed_in_account_required`.
- 409 `ownership_transfer_required` or `storage_transfer_required`.
- 503 `deletion_unavailable`: missing server configuration or migration.
- 502 `storage_delete_failed`, `deletion_failed`, or `deletion_unconfirmed`. A timeout does not become a success receipt.

Settings UI, local-data clearing/sign-out, and browser/native verification belong to the integrating lane. Do not show success until `deleted:true` arrives. Supabase admin errors are never echoed verbatim; only known safe constraint codes may be surfaced.

## Verification and limits

Full backend: **479 passed, 5 skipped** (standing framework deprecation warnings). API/auth tests exercise self-only admin request, fresh identity, exact confirmation, missing configuration/migration, sole shared owner, shared uploads, preflight-before-removal, real Storage route/payload, HTTP failures/timeouts, cache eviction, and shared deleted-identity cache checks. Four deliberate regressions (ignore shared ownership, remove shared-file guard, skip user-cache eviction, trust cached deleted identity) each failed their tests; source restored byte for byte. The original route-existence test failed 404 before the implementation. Canonical RLS source gate: **14 passed**. Root's SECURITY DEFINER scanner accepts migration021 with no anonymous grant or unsafe search path.

Five executable SQL transaction tests are present in `backend/tests/test_account_deletion_transaction.py`, guarded by a separate `NGW_ACCOUNT_DELETION_TEST_DATABASE_URL` targeting an empty database named `ngw_account_deletion_test...`. They are **SKIPPED here**, because no disposable PostgreSQL is configured. They cover atomic solo cleanup/receipt retention, sole shared owner rollback, transferred studio retention plus stale-JWT FK rejection, Storage constraint rollback, and stale legacy ownership conflicting with another studio's canonical event. Canonical studio ownership always overrides a stale legacy record when selecting deletions. They are database-fixture tests, not a claim of GoTrue/Supabase deployment proof. Actual migration execution, concurrent transfer/invitation behavior, Auth trigger privileges, hosted Storage deletion, and end-to-end account deletion still require a disposable Supabase environment before production. No migration, user, file, or account was deleted in a live project during this work.

Official references: [Supabase user deletion and owned Storage restriction](https://supabase.com/docs/guides/auth/managing-user-data), [Storage ownership](https://supabase.com/docs/guides/storage/security/ownership), and [read-only Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design). Retention duration, published privacy disclosures, and legal sufficiency remain owner/counsel gates; this code invents no legal policy. Root owns shared HANDOFF and WHERE_WE_ARE updates. No new dependencies or deployment.
