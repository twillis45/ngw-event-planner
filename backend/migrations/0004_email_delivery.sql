-- ============================================================================
-- Sprint 58.2: Email delivery tracking
--
-- The delivery result is stored in the existing `metadata` jsonb column under
-- the `delivery` key. No new columns needed — jsonb is the right call here
-- because delivery fields are provider-specific and may evolve (Resend today,
-- SendGrid/SES tomorrow). A partial GIN index makes delivery-status queries
-- fast without bloating the schema.
--
-- Run in Supabase → SQL Editor (after 0001_communication.sql).
-- ============================================================================

-- Index for querying messages by delivery status (e.g. "show all email-sent messages")
create index if not exists idx_msg_delivery_status
  on event_messages using gin ((metadata->'delivery'))
  where metadata->'delivery' is not null;

-- Index for querying messages by delivery intent (e.g. "find all email-intended messages")
create index if not exists idx_msg_delivery_intent
  on event_messages ((metadata->'delivery'->>'intent'))
  where metadata->'delivery'->>'intent' is not null;
