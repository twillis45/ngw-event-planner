# Owner checklist — week of November 9, 2026 (Todd only, runs in parallel with engineering)

Companion to `docs/audits/2026-11-03_ONE_WEEK_PAID_WEB_RC_PLAN.md`. These are things only Todd can do: dashboards, money, counsel, people, and accounts. **Send the evidence back** (a screenshot or pasted output) so it can be recorded in the gate record. A done item without evidence counts as not done. All times are EST.

## Rulings (by Wed 11/4, 12 PM)

- [ ] **D1. Release profile.** Paid release candidate ships on `live` (sign-in on). Recommended: yes.
- [ ] **D2. Stage 1.** Rule `docs/gate-records/2026-11-02/STAGE_1_PROPOSAL.md` (in the workspace repo) and pre-register the kill gate.
- [ ] **D3. Domain cutover timing.** Recommended: DNS this week, web cutover after the release candidate.
- [ ] **D4. Cut line.** Approve the cut order in plan §5.
- [ ] **D5. Name.** Clear the name, or launch under the current one with the risk recorded.
- [ ] **D6. App identifiers.** Pick the iOS bundle ID, Android application ID and store display name. They are permanent once published. Suggested form: `com.noguessworksystems.<app>`.

## Checklist

| # | Action | Exact steps | Est. time | Do by | Evidence to send |
|---|---|---|---|---|---|
| 1 | **RLS production attestation** (`SEC-1`) | `docs/RUNBOOK.md` §A (line 134): run the listed queries in Supabase → SQL editor on the production project. Every public table must show `rowsecurity = true` with its policies | 10 min | Wed 11/4 | Query output |
| 2 | **Backup and restore drill** (`SEC-2`) | `docs/RUNBOOK.md` §B (line 168): confirm daily backups are on (Supabase → Database → Backups). Restore the latest backup to a **new** project, never production, and spot-check one known event's row | 1 h | Thu 11/5 | Backup screen plus restored row |
| 3 | **Auth rate-limit check** (`SEC-3`) | `docs/RUNBOOK.md` §C (line 190): Supabase → Authentication → Rate Limits. Read and record the values; do not tune | 5 min | Wed 11/4 | Screenshot |
| 4 | **Sentry and PostHog arrival** (`OBS-1`) | `docs/RUNBOOK.md` §D (line 204): find one production event in Sentry (last 24 h), or trigger the harmless one the runbook names: a `?rsvp=` code that does not exist. Open the live site in a fresh browser and find the event in PostHog. **Repeat on the release candidate on Fri 11/6** | 15 min × 2 | Wed 11/4, Fri 11/6 | Sentry issue link, PostHog event screenshot |
| 5 | **Legal, privacy, refund and support publishing** (`LEGAL-1`, `NAT-5`) | Send `docs/legal/*` plus `docs/legal/CONSENT_AND_TRACKING_COPY_DRAFT.md` to the attorney **today**, including its §3 question. Choose the support email. After review, publish Privacy, Terms, Refunds and Support at stable URLs and send the URLs | 30 min to send, then attorney turnaround | Send Tue 11/3; publish by Sat 11/7 | Four URLs |
| 6 | **Domain** (`NAT-6`) | Point `noguessworksystems.com` (or an `app.` subdomain) at GitHub Pages: a CNAME to `twillis45.github.io`, the repo's Pages → Custom domain, and Enforce HTTPS. **Do not switch the web app's origin until after the release candidate (D3)** | 30 min plus DNS propagation | Thu 11/5 | `dig` output plus the HTTPS padlock |
| 7 | **Stripe live lifecycle** (`PAY-1`) | Follow `docs/ONE_EVENT_PASS_PURCHASE_RUNBOOK.md` against the release candidate:<br>1. Set live keys and the live webhook secret in Render.<br>2. Buy the pass with a real card, then confirm the entitlement unlocks.<br>3. Refund it from the Stripe dashboard, then confirm the entitlement is revoked.<br>4. Run a declined card and confirm the copy.<br>5. Rotate the keys if any appeared in a log | 1 h | Sat 11/7 | Stripe event IDs, before/after screenshots |
| 8 | **Human UAT** (`UAT-1`) | Recruit **Tester A** (a first-time host, not a planner) and **Tester B** (a coordinator or planner), neither of whom has seen the app. On Sat, run `docs/COORDINATOR_TEST_SCRIPT.md` on their own phones at the release candidate URL (not `?demo=1`). Observe silently and log every assist. The protocol is the recertification §17 | Recruit 1 h; sessions 2 × 60 min | Recruit by Thu 11/5; run Sat 11/7 | Session notes into `docs/alpha/` |
| 9 | **Pentest scheduling** (`SEC-4`) | Contact 2–3 firms today. Scope: the hostv2 web app, FastAPI backend (`ngw-events-api.onrender.com`), Supabase RLS and auth, and the Stripe webhook. **Book a dated start.** The report will not exist by 11/9; the board needs the booking date | 1 h | Book by Thu 11/5 | Signed statement of work or a confirmed date |
| 10 | **Stage 9 board** | Seat it for **Mon 11/9**:<br>- Name the seats (`boardSeats`; principal seated per Command Step 4a).<br>- Circulate the release candidate evidence on Sun.<br>- The board rules on the four retro public gates and, if the pentest is the only open item, hold vs. capped paid cohort (plan §0).<br>- Record `boardVerdict` | 2 h | Seats named by Wed 11/4; convene Mon 11/9 | Seat list, recorded verdict |
| 11 | **Apple and Google accounts plus native policy** (`NAT-1`, `NAT-8`, `NAT-9`) | **Apple: DONE (11/3).** D-U-N-S complete and the Apple Developer Program enrollment submitted. Nothing further here except to answer Apple's verification if it calls.<br><br>**Google (open):** create a Play Console organization account with the same D-U-N-S number, and start verification.<br><br>**Once each account clears:**<br>1. Create the app record. This reserves the store name and is the store collision check for D5.<br>2. Enter the D6 IDs.<br>3. Set up signing: Apple distribution certificate, and an Android upload key with Play App Signing. Keys stay off the repo.<br>4. If cleared by Thu, upload Lane N's internal build to TestFlight internal and the Play internal track (purchase hidden; this is not a submission).<br><br>**Counsel:** send the four billing questions from the recertification §21. Claude will draft the packet. **Do not submit any build for review** | Enrollment 1 h. Records and signing 1–2 h after clearance. Apple's verification call and Google's org verification take days and are outside your control | Apple done; Google enroll Tue 11/3; records and signing when cleared | Enrollment confirmations, app record screenshots, counsel acknowledgment |

## What you do *not* need to do this week

- Approve any engineering PR. Checks gate the merges.
- Watch deploys. The release candidate's live commit is checked from `RELEASE_SHA`.
- Anything in plan §6.
