# 09 — Metrics and Feedback (Phase 10)

Sources inspected: `src/lib/analytics.js`, `src/lib/analyticsReader.js`, `src/lib/sentry.js`,
`src/lib/adminApi.js`, and `track()` call sites across `src/`. No external dashboard was
accessed. **No user counts or funnel results are reported — none are available locally.**

## Instrumentation status

| Capability | Status | Evidence |
|---|---|---|
| Product analytics (PostHog) | **Instrumentation exists** | `src/lib/analytics.js` — lazy `import('posthog-js')`, `posthog.init` at :45 |
| Event taxonomy | **Exists** — 31 named events in an `EVENTS` map at `analytics.js:109+` | `evidence/09_event_names.txt` |
| Call sites | **38** `track(...)` call sites across `src/` | grep, this session |
| Error monitoring (Sentry) | **Instrumentation exists** | `src/lib/sentry.js:18` `Sentry.init` |
| Admin metrics read-back | **Exists** — `posthogFunnel(days)` → `GET /api/admin/metrics/posthog/funnel` | `src/lib/adminApi.js:80` |
| Local data availability | **None** | analytics is disabled locally, see gating below |
| External access | **Required** for any actual numbers | PostHog project + admin API |
| Feedback capture (in-product) | **Not found** | no in-app feedback/NPS module located |

## Event taxonomy (verified, 31 names)
Activation/funnel: `account_type_selected`, `intake_committed`, `event_created`,
`event_qualified`, `event_opened`, `first_value`, `first_guest_added`, `first_vendor_added`,
`host_home_viewed`, `assemble_viewed`, `plan_yours_tapped`.
Recommendation interaction: `host_next_step_clicked`, `decision_captured`, `outcome_captured`.
Guest/invite loop: `invite_shared`, `invite_viewed`, `invite_rsvp_submitted`,
`guest_rsvp_received`.
Retention: `returned_d1`, `returned_d7`. Lifecycle: `event_completed`. Plus lodging/intel/ros
events and `page_view`.

## Gaps against the audit's requested list
- **Recommendation views** — `host_next_step_clicked` captures the CTA action; no distinct
  *impression* event was found, so view-to-action rate is not derivable.
- **Dismissals / overrides** — no event found for dismissing or overriding a recommendation.
  `decision_captured` records a settle, not a rejection.
- **Completion** — `event_completed` exists; per-decision completion is not separately tracked.
- **Paid conversion** — no purchase/upgrade event in the taxonomy. `REACT_APP_BILLING_LIVE`
  exists as a flag; no conversion instrumentation was located.

## KNOWN DEFECT · M1 — analytics is disabled in local and non-configured environments
`analytics.js:24` `isAnalyticsConfigured = Boolean(PH_KEY) && !IS_LOCAL`, and `:42`
`if (!PH_KEY || IS_LOCAL) return null`. Opt-outs also honoured: `?noanalytics=1` and a
`ngw-analytics-optout` localStorage key (`:31-32`). Correct behaviour, but it means **this
audit could not observe a single analytics event being emitted**.

## KNOWN DEFECT · M2 — a literal PostHog project key is hardcoded as a source fallback
`src/lib/analytics.js:19` assigns `PH_KEY` from `process.env.REACT_APP_POSTHOG_KEY` **or a
hardcoded `phc_…` literal committed in the repository.** The value is deliberately not
reproduced here. PostHog project keys are client-side/publishable by design, so this is
low-severity for confidentiality, but it means (a) the key ships in the bundle regardless of
env configuration, and (b) any fork or public clone writes into this project's analytics.
Recommend moving to env-only with no literal fallback. Severity: **Medium**.

## Method and limits
Static inspection plus one live run with analytics disabled by design. No dashboard, no
funnel numbers, no user counts. Nothing here is inferred from prior sessions.
