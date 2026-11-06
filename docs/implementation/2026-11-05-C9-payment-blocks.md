# C9 S9-4 — payment blocks, November 5, 2026

## Scope and data integrity

Full refunds revoke access; disputes suspend it pending reviewed resolution. Receipt rows are retained. A permanent payment-intent block prevents delayed or replayed checkout completion from restoring access, including when the refund arrives first. Grant and block both acquire the same transaction advisory lock before inspecting/writing payment evidence. The active pass read excludes blocked payments. Actual insert rowcount controls PASS GRANTED versus DUPLICATE logging; blocked receipts never log a new active grant.

Migration020 adds only the receipt's payment-intent mapping and an RLS-enabled server-only block table. Historic receipts are mapped through the authenticated Stripe Sessions list filter, never event/host metadata. Stripe/API/database failure propagates to webhook retry. A receipt still prevents purchasing again: the current one-row-per-event model cannot safely represent a second purchase. Support review is named explicitly instead of taking a payment the service cannot grant.

Stripe's primary references confirm the [payment-intent Sessions filter](https://docs.stripe.com/api/checkout/sessions/list), [full versus partial refunded flag](https://docs.stripe.com/api/charges/object), and [disputed payment identity](https://docs.stripe.com/api/disputes/object). Configure the deployed webhook to receive checkout.session.completed, charge.refunded, and charge.dispute.created.

## Verification

Five new core tests failed before implementation. Eleven new stateful tests now pass: refund and replay, refund before checkout, duplicate rowcount log, dispute suspension and refund precedence, shared transaction lock key, verified/unsigned dispatch, historical Stripe mapping, retryable mapping failure, and active-read exclusion. Existing Stripe entitlement tests still pass, with payment intent added to realistic session fixtures and transaction support to the database fake.

Entire backend: **460 passed**. Canonical migration RLS gate: **14 passed**. Deliberate mutations ignoring blocks, logging every duplicate as PASS GRANTED, and removing the grant lock each failed their regression; files were restored byte for byte. No live Stripe requests, database migration, deployment, or payment was performed.

## Outstanding policy and verification boundaries

Owner ruling on November 5: partial refunds KEEP access. A dedicated regression proves a partial refund retains the receipt and creates no access block; a later full refund still blocks it. The handler uses Stripe's full-refund flag, not the existence of a refund event. Won/closed dispute events do not automatically restore access; restoration requires a reviewed support action. There is no automatic repurchase or new receipt-history model. The local environment has no PostgreSQL server/client, so tests use stateful async database fakes; SQL execution, migration application, and true concurrent transaction ordering still need integration proof. Client-only gate enforcement remains the separate S9-5 board question, not closed here. Root owns shared HANDOFF/WHERE_WE_ARE updates.
