# Analytics events — the 11/20/2026 additions and the signed-out funnel

The source of truth for every client event name is the `EVENTS` table in
`src/lib/analytics.js`; server events are built in `backend/app/analytics.py`.
This page lists the events added on November 20, 2026 (owner: "Yes, build the
six events", then "we are missing activity in posthog"), with their exact
properties, and the funnel they complete. The only older catalog in the repo is
archived (`docs/archive/grounded-decision-surface/2026-07-30/`).

**Rules for all of them.** Counts, booleans, fixed enums and the hashed account
label only — never an email address, a name, a phone number, a message body, a
note, or any other free text. Client events go through `track()` / `trackOnce()`
(the opt-out and super properties apply; nothing is sent from localhost, where
the dev tap `window.__NGW_TRACK__` records them instead). Server events go
through `capture()`: on only where Render runs and `POSTHOG_KEY` is non-empty,
a 3-second timeout, failures logged without details and dropped. The server
cannot see the browser's opt-out switch; the privacy policy says so.

## Client events (`src/lib/flowAnalytics.js`)

| Event | When | Properties |
|---|---|---|
| `nudge_sent` | Once per email run of "Nudge the N who haven't answered" (`NudgeTheList.jsx`) | `emailed`, `email_failed` (counts), `capped` (bool), `texts_queued` (guests with only a phone), `skipped_recent` (nudged in the last 3 days) |
| `nudge_text_sent` | Each text the host marks sent from the one-at-a-time queue | none |
| `messages_view_opened` | The Messages sheet opened, once the server's answer is in (`MessagesSheet.jsx`) | `entry` (`section_list` / `jump` / `route` / `other`), `emails`, `handoffs`, `cohost`, `helper` (counts of rows by kind), `signed_in` (bool) |
| `helper_email_sent` | The app-sent helper ask returned (HostShellV2 `emailHelperFor`) | `ok` (bool); on failure `reason`: `capped` / `stopped` / `refused` (403, or the mail service refused) / `network` / `other` |
| `helper_answered` | The helper's answer was taken by the server (`HelperLinkV2.jsx`, on the helper's device; same opt-out rules as the guest invite page) | `answer`: `yes` / `no` |
| `plan_opened_from_reminder` | The app loaded with `?from=reminder` (the reminder's "Open your plan"); the tag is then removed from the address | none |
| `plan_drafted` | A signed-out visitor's plan was built and shown (held as a draft); once per draft | `event_type`, `is_destination`, `has_date`, `has_headcount` (bools), `came_from` (only when the visitor arrived from an invite or vendor brief) |
| `keep_prompt_shown` | The sign-in sheet opened to keep a plan | `intent`: `plan` / `invite` (the reveal's buttons) / `device_plan` (the "Sign in to keep this plan" banner on a plan made earlier on the device) |
| `sign_in_code_requested` | The sign-in email (link and code) was asked for | `success` (bool: the service took the request), `after_keep_prompt` (bool) |
| `push_enabled` | "Notifications on this device" turned on in You & settings: the browser allowed it and the server took the device (`DeviceNotificationsRow.jsx`) | none |
| `push_disabled` | The same row turned off | none |

## Server events (`backend/app/analytics.py`)

| Event | When | distinct_id | Properties |
|---|---|---|---|
| `host_reminder_sent` | Each week-before reminder email that went (`host_reminders.py`) | studio owner's `host_` label | `catch_up` (`true` when it went the day after a missed 7-day run, 6 days out), `source: server` |
| `email_delivery` | The Resend webhook changed an app-sent email's status (`main.py`); a replayed callback is not a change | the event's studio owner's `host_` label; skipped when unknown | `status`: `delivered` / `bounced` / `complained` / `delayed`; `kind`: `invite` / `message` / `helper` / `cohost` / `approval` / `other`; `source: server` |
| `pass_refunded` | `charge.refunded`, verified, for a payment with a pass row (`stripe_payments.py`) | buyer's `host_` label | `amount_cents` (refunded so far), `currency`, `full_or_partial`, `source: server` |
| `pass_disputed` | `charge.dispute.created`, verified, for a payment with a pass row | buyer's `host_` label | `amount_cents` (disputed), `currency`, `full_or_partial` (full when it reaches the pass's price), `source: server` |

`email_delivery` can only report emails recorded in `event_messages` with a
Resend id: invites, messages, the helper ask, co-host invites and approvals.
The week-before reminder, announcements and reply notices write no such row
today, so their delivery is not reported.

## Page views (11/20/2026)

PostHog's Web analytics tab counts only `$pageview`. Automatic page views stay
off; each screen-level event also records one `$pageview` with a `page`
property (`pageFor` in `src/lib/analytics.js`):

| Event | `page` |
|---|---|
| `host_home_viewed` | `board` |
| `section_opened` | `section/<section>` |
| `invite_viewed` | `invite` |
| `pass_sheet_viewed` | `pass` |
| `messages_view_opened` | `messages` |

Every address PostHog sees (`$current_url`, `$referrer`, the `$initial_*`
person properties) passes `cleanUrl` in `before_send`: ours keeps origin, path
and `utm_*` only (no `?rsvp=`, `?helper=`, `?vendor=`, `?family=`, `?event=`,
`?token=`, no `#hash`); anyone else's keeps its origin only.

## The signed-out funnel

Before 11/20 a signed-out visitor's plan was held as a draft and
`event_created` fired only after sign-in, so everyone who built a plan and
stopped at sign-in was invisible. In order:

1. `host_home_viewed`
2. `plan_drafted`
3. `keep_prompt_shown`
4. `sign_in_code_requested`
5. `signed_up`
6. `event_created`
7. `invite_sent`
8. … `pass_checkout_started`
9. `pass_purchased` (server)
