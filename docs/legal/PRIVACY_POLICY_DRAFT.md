# Privacy Policy — No Guesswork Events

> **DRAFT 2026-11-02 — not yet reviewed by an attorney, not yet in effect, not
> yet linked from the product.** Bracketed `[OWNER: …]` items are facts only
> the owner can supply. Every other statement is written from the code and
> cites it in the margin notes (`⟶ … ⟵`), which are removed before publication.

**Effective:** `[OWNER: effective date]`
**Who we are:** No Guesswork Systems LLC (“we,” “us”), `[OWNER: mailing address]`.
**How to reach us about privacy:** events@noguessworksystems.com. ⟶ `src/lib/brand.js:145` (owner decision 11/11/2026) ⟵

No Guesswork Events (“the app”) helps a person plan an event — a wedding, a
milestone birthday, a reunion — without a paid planner. This policy explains
what we collect, from whom, why, who else sees it, how long we keep it, and
what you can ask us to do. It is written to be read, not skimmed; the short
version is at the end.

---

## 1. Three kinds of people use this app, and we collect different things from each

### Hosts (the person planning the event)

- **Your email address**, when you sign in. Sign-in is by a one-time link sent
  to that address; there is no password. ⟶ `supabase.auth.signInWithOtp`,
  `HostShellV2.jsx:2073` ⟵
- **Your studio or business name and role**, if you enter them in your profile.
  ⟶ `ngw-profile` ⟵
- **Your event plans:** the event name, date, type, venue and town, guest count,
  budget figures, vendor names and contact details you enter, the food plan,
  shopping lists, lodging links you paste, notes, and uploaded photos.
  ⟶ `public.events.data`, `supabase/migrations/001` ⟵
- **Guest lists you import or type**, which can include other people's names,
  and the dietary needs you record for them. ⟶ `src/lib/importHistory.js` ⟵
- **Your purchase of the One-Event Pass**, if you buy one: which event it
  covers and the Stripe session that paid for it. We never see or store your
  card number. ⟶ `supabase/migrations/017_event_passes.sql`,
  `routers/stripe_payments.py` ⟵

### Guests (someone replying to an invitation)

When you open an invitation link and reply, we store what you choose to give.
Only your name and your answer are required; everything else is optional.
⟶ `hostv2/src/InviteV2.jsx:643-646` (name and answer are the only required
fields); `supabase/migrations/009_rsvp_submissions.sql:25-33`;
`supabase/migrations/015_rsvp_guest_details.sql:18-25` ⟵

- **Your name and your answer** (Yes / No / Maybe), so the host knows who is
  coming. ⟶ `009:25-26`; `InviteV2.jsx:659-660` ⟵
- **A meal choice**, if you are coming, so the host can plan the food.
  ⟶ `009:27`; `InviteV2.jsx:660` ⟵
- **Allergies and diet:** allergens picked from a list (peanut, tree nuts,
  milk, egg, fish, shellfish, soy, wheat or gluten, sesame), diet rules (such as
  gluten-free, dairy-free, halal, kosher, or no alcohol), and anything else you
  type, so the host can serve food that is safe for you. ⟶ `InviteV2.jsx:71-72,
  660, 663`; `009:28`; `015:19-20` ⟵
- **Access needs**, such as step-free or wheelchair access or an accessible
  seat, so the host can plan the way in and where you sit. ⟶ `InviteV2.jsx:73,
  663`; `015:21` ⟵
- **A plus-one** (their name, meal, and needs) and **how many children** are
  coming with you, when the host allows them, so the host has a true headcount.
  ⟶ `009:29-32`; `InviteV2.jsx:534-535, 664-666` ⟵
- **A phone number or email**, so the host can reach you with day-of details.
  ⟶ `015:23-24`; `InviteV2.jsx:678-679, 1285` ⟵
- **Your mailing address**, asked only when the host has turned this on and you
  are coming, so the host can mail thank-you notes or favors. ⟶ `015:25`;
  `InviteV2.jsx:673, 1302-1306` ⟵
- **A note to the host.** ⟶ `009:33`; `InviteV2.jsx:672` ⟵
- For some events, **which lodging you would prefer** from options the host
  listed, or **whether you will pick crabs** at a crab feast, so the host can
  plan what to book or buy. ⟶ `015:22`; `016_rsvp_lodging_pick.sql:18`;
  `InviteV2.jsx:669-671` ⟵

**Who sees your reply.** The host of the event sees everything above, and so
does anyone the host shares the event's studio with (section 2). ⟶
`backend/app/routers/rsvp.py:18-22` (public resolver returns whitelisted display
fields only; host read-back requires sign-in and studio access) ⟵ Other guests
do not. An invitation shows other guests only how many people have said yes:
never names, contact details, needs, or notes. ⟶ `rsvp.py:250-262`
(`goingCount`, a number only); `InviteV2.jsx:539-547` ⟵ The one exception is an
invitation opened on the same device where the host's plan is saved, such as
the host previewing it. That view can show the first names of up to two guests
who said yes. ⟶ `InviteV2.jsx:549-562` (local roster only; first names, never
other fields) ⟵

Allergies, diets, and access needs can reveal health information, and **access
needs may describe a disability.** We treat those fields, and your phone number,
email, mailing address, and note, as sensitive. They are stored only for the
purpose listed above and shown only to the host of that event. They never
appear on any public page and are never sent to analytics; the only analytics
event a reply sends is your Yes / No / Maybe and the type of event. They are
never shared with vendors unless the host chooses to pass them on. ⟶ `009:28-33`
and `015:13-16` (marked sensitive; host read-back only); `rsvp.py:186-191`;
`InviteV2.jsx:733` (analytics payload); `src/lib/vendorBrief.js` (vendor payload
is an explicit whitelist) ⟵

> **COUNSEL:** Access needs (step-free or wheelchair access, an accessible
> seat) can describe a disability, and allergies and diets can reveal health
> conditions or religion (halal, kosher). Under state privacy laws that treat
> health, disability, or religious data as "sensitive" (for example Virginia,
> Colorado, Connecticut, or California's "sensitive personal information"), do
> we need opt-in consent at the point of collection on the invite form, a
> specific notice there, or a limit-use right? Is "the host only, never
> analytics, never vendors unless the host passes it on" adequate handling, given
> the host, not us, decides what happens next?

You do not create an account, and we do not set an identity on you. Your
reply is tied to the invitation code and an idempotency key your browser
generates so a double-tap does not double-submit. ⟶ `009:23-24` ⟵

### Guests sharing photos after the event

After the event, a guest can share photos from the invitation link.
⟶ `supabase/migrations/025_guest_photos.sql`, `backend/app/routers/guest_photos.py` ⟵

- **What we store:** the photo, the name you give with it, and the time you
  shared it, tied to the invitation code and your browser's key (the same key
  as your reply), and whether you chose to keep your photos private to the
  event. Photos are accepted only once the event has ended, by the host's end
  (or start) time in your phone's time zone, which your browser tells our
  server; the zone is used for that check and not stored.
  ⟶ `guest_photos.py` (`_opens_at`, `_refuse_outside_window`, the owner's
  defaults at the top) ⟵
- **Location and other hidden details are removed.** Phone photos usually
  carry hidden details: where the photo was taken (GPS), the camera or phone
  model, and the time. Our server removes all of it before the photo is
  stored, by keeping only the picture itself and saving it as a new JPEG. The
  file you sent is never stored. ⟶ `guest_photos.py` (`clean_photo`);
  `backend/tests/test_guest_photos.py` (a photo with GPS goes in, none comes
  out) ⟵
- **Who sees it:** the host (and anyone the host shares the event's studio
  with) sees every photo with the name you gave. Other guests see a photo only
  after the host approves it, and they see the photo alone, without your name.
  The host can hide or delete any photo. ⟶ `guest_photos.py` (`guest_approved_photos`
  returns id, link, time and whether it may be shared, only) ⟵
- **Sharing a photo, and what can't be undone.** The upload screen says:
  "Approved photos can be shared by your host and other guests. Once someone
  shares a photo to Instagram or Facebook, deleting it here doesn't remove that
  post." Sharing means the app hands the photo to the person's own phone (its
  share sheet) and copies a caption with the event's name and, if the host
  turned one on, the event's hashtag; that person posts it from their own
  account, or doesn't. We never post anything, link any social account, or send
  photos to Instagram or Facebook ourselves. **A photo someone has posted is
  outside this app:** deleting it here, your own delete, the host's delete, and
  the 90-day deletion below do not remove that post. ⟶ `src/lib/photoShare.js` ⟵
- **Stopping sharing.** You can switch on "Keep my photos private to this
  event": then no one gets a Share button on your photos, though guests can
  still see the ones the host approved. The host can also turn sharing off for
  any one photo, because the person in a picture isn't always the one who took
  it. Neither switch can pull back a post someone already made.
  ⟶ `guest_photos.py` (`_shareable`, `/privacy`, `/sharing`);
  `025` (`uploader_private`, `share_blocked`) ⟵
- **Colors.** A phone photo's color profile is converted to standard colors
  (sRGB) and then removed with the rest of the hidden details, so the stored
  photo looks like the one you took. ⟶ `guest_photos.py` (`_to_srgb`) ⟵
- **Where it is kept:** in a private storage area at Supabase that no browser
  can open directly. Each time a photo is shown, our server makes a link that
  stops working after five minutes. ⟶ `025` (private bucket, no storage
  policy); `SIGNED_URL_TTL_SECONDS` ⟵
- **Deleting it:** you can delete your own photos from the same device you
  shared them from. From another device, write to us (section 6).
- **HEIC photos** (an iPhone format) are not accepted; the app asks for a JPEG
  instead. This is a technical limit, not a privacy choice.

### Vendors (a caterer, photographer, venue the host shares a brief with)

If a host shares a vendor brief with you, you receive a link that shows the
event details the host chose to share — date, venue, headcount, timing, the
host's requests — built from the host's current plan through a fixed list of
vendor-safe fields. Guest names and guest dietary details are not in that list.
⟶ `supabase/migrations/013_vendor_brief_links.sql`, `src/lib/vendorBrief.js` ⟵

If you confirm back through that link, we store your confirmation.
⟶ `supabase/migrations/014_vendor_brief_confirmations.sql` ⟵

### Helpers (a friend or relative the host gives a party job)

If a host sends you your job by link ("you're bringing the stuffing"), the
link shows who is asking, the event's name, date, start time and place, and
only the jobs assigned to you, built from the host's current plan through a
fixed list of fields. It shows no other guest's details. The host's message
itself is sent from the host's own phone or email, not by us.
⟶ `supabase/migrations/023_helper_links.sql`, `backend/app/routers/helper_link.py` ⟵

If you answer through that link ("I've got it" or "I can't", with an optional
note), we store your answer and show it to the host.
⟶ `supabase/migrations/023_helper_links.sql` ⟵

### Guests who ask the host a question

From your invitation you can ask the host a question, and the host can reply.
We store your name, your questions, and the host's replies, as plain text.
If you choose, we also store an email address you type and whether you ticked
the box to be emailed; that box starts unticked, and nothing is emailed yet.
⟶ `supabase/migrations/024_guest_messages.sql`,
`backend/app/routers/guest_messages.py` ⟵

**Who sees it.** The host of the event, and anyone the host shares the event's
studio with (section 2). Other guests never see your questions or your name.
The host does not see your email address, only whether you asked to be
emailed. You never see the host's email address. ⟶ `guest_messages.py`
(`_guest_view`, `_host_view`: fixed lists of fields) ⟵

**Your host can see when you last opened your invite**, but only once you have
replied or asked a question from that device. Every other open is only
counted: how many times the invitation was opened each day, and on how many
devices. To count devices we keep a scrambled code (a salted hash) of a random
number your browser makes, never your IP address. ⟶ `024_guest_messages.sql`
(`invite_opens`, `invite_open_days`, `invite_open_devices`) ⟵

**Deleting it yourself.** From the same device you asked from, you can delete
your questions and the host's replies at once. ⟶ `POST
/api/public/questions/{code}/delete` ⟵

---

## 2. Where your data lives

- **On your device first.** The app works without an account. Plans you make
  while signed out live only in your browser's storage on that device, and
  nothing leaves it except the lookups described in section 4. ⟶ `ngw-events`,
  `ngw-hostv2-custom-events` in `localStorage` ⟵
- **In your account, when you sign in.** Signed-in hosts' plans sync to our
  database so they survive a lost phone and can be shared. The database is
  hosted by **Supabase** in the United States. Each plan belongs to a studio,
  and database-level rules (row level security) allow only that studio's
  members to read or change it — our public API key cannot bypass them.
  ⟶ `supabase/migrations/002_rls_policies.sql`, `docs/MULTITENANCY.md` ⟵
- **If two of your devices disagree,** we do not silently overwrite either: a
  save against a plan another device changed is refused, kept on the device
  that made it, and you are told. ⟶ `src/lib/api/events.js`, 2026-11-02 ⟵

---

## 3. What we use it for

- To run the app: show your plan, compute readiness, send invitations you ask
  us to send, build the briefs you share.
- To take payment for the One-Event Pass, through Stripe's hosted checkout.
- To fix what breaks: error reports go to **Sentry** with personal data
  disabled by default and a 10% sample of performance traces.
  ⟶ `src/lib/sentry.js:25` (`sendDefaultPii: false`), `:23` ⟵
- To learn which parts of the app help: product analytics go to **PostHog**
  with automatic click and form capture **off**, session recording **off**,
  page views tracked by hand, and the identity set to a one-way hash of your
  business name — never the name itself, your email, or your personal name.
  Name, email and phone fields are stripped before any event is sent. You can
  turn analytics off any time in **You & settings → Help improve the app**.
  ⟶ `src/lib/analytics.js:47` (opt-out), `:65` (hash), `:85-89`, `:114`
  (identify), `:139-141` (stripping)
  *(Rewritten 2026-11-02 after the fix: until then the identity carried the
  readable business name and the only opt-out was a URL flag.)* ⟵
- **We do not sell personal data, we do not run advertising, and we do not
  share your data with data brokers.** ⟶ no such code path exists ⟵

---

## 4. Who else sees data, and what they see

These are the services the app calls. Each sees only what the row says.

| Service | What it receives | Why |
|---|---|---|
| Supabase (US) | Everything in section 2 that is synced; your sign-in email | Database and sign-in |
| Render (US) | API requests from the app | Hosts our server |
| GitHub Pages | Your browser's request for the app itself | Serves the app |
| Stripe | The pass's fixed price and label; the event id and your studio id as metadata; whatever you type on Stripe's own checkout page | Payment. Card details go to Stripe directly and never to us ⟶ `stripe_payments.py` ⟵ |
| Resend | The address, subject and body of an email the app sends on your behalf (an invitation, a vendor message, an approval request) | Sending email ⟶ `backend/app/emailer.py` ⟵ |
| OpenWeather | The venue's latitude and longitude (never its name) and the event date | Forecast for outdoor events ⟶ `routers/weather.py:92-98` ⟵ |
| OpenStreetMap (Nominatim), or Google Places if you supply your own key | The venue text you typed, US-restricted | Turning a venue into a map point ⟶ `HostShellV2.jsx:712-727` ⟵ |
| Instacart | The shopping-list item names and quantities | Building a cart when you ask ⟶ `routers/instacart.py` ⟵ |
| Kroger | Item names | Grocery price estimates ⟶ `routers/kroger.py` ⟵ |
| Anthropic / OpenAI | The parts of your plan relevant to the feature you used (an event brief, a vendor follow-up draft, a vendor email to parse), under a prompt our server writes — you cannot send a free-form prompt and neither can anyone else | AI drafting features ⟶ `routers/ai.py:105-120` ⟵ |
| DocuSign | A document you choose to send for signature and the signer's email | E-signature, only when used ⟶ `routers/docusign.py` ⟵ |
| Lodging sites you paste a link from | Our server fetches the public page once to show a preview | Listing previews ⟶ `routers/lodging.py` ⟵ |
| BLS, openFDA, Crossref | No personal data — these are public reference lookups | Cost and food-safety reference data |

Each of these has its own privacy policy for what it does with what it
receives. We do not send them more than the row says.

---

## 5. How long we keep it

- **Your plans and account:** until you delete them or ask us to (section 6).
  Deleting an event in the app deletes its database row. ⟶ `deleteEvent`,
  `src/lib/api/events.js` ⟵
- **Guest replies:** we intend to delete replies 90 days after the event's
  date. The routine that does this exists and is run by hand today; it is not
  yet automatic, and this sentence will change when it is.
  ⟶ `purge_old_rsvp_submissions`, `009:101-130`; not scheduled as of 2026-11-02 ⟵
- **Guest questions, replies, and invitation opens:** deleted 90 days after
  the event's date (or, without a date, 90 days after the last activity). The
  routine runs nightly where the database's scheduler is turned on; until the
  owner confirms it is running there, it is run by hand. The scrambled device
  codes are kept only for one day's count and deleted after two days.
  **When the host deletes the event, its guest questions, the email
  addresses guests gave for answers, and its invitation opens are deleted
  with it, at once** (owner ruling 11/16/2026; migration 028 applied and
  attested in production 11/16/2026, 0 FAIL / 206 PASS).
  ⟶ `purge_old_guest_activity`, `024_guest_messages.sql`;
  `events_drop_guest_activity`, `028_event_delete_drops_guest_activity.sql` ⟵
- **Guest photos:** we intend to delete photos, and the record of who shared
  them, 90 days after the event's last day, and **when the host deletes the
  event, its photos go within a day** (they can't be opened from the moment
  the event is gone). A nightly job does this; it is written into the hosting
  setup but not yet switched on, and this sentence will change when the owner
  confirms it is running. Posts someone made on Instagram or Facebook are not
  ours to delete (section 1). ⟶ `backend/scripts/purge_guest_photos.py`;
  `guest_photos_due_for_purge`, `025`; the `ngw-guest-photo-purge` cron service
  in `render.yaml` ⟵
- **Pass purchases:** kept as a record of what you bought; required for
  refunds and disputes. The receipt survives account deletion, with the link
  to your account removed (section 6). ⟶ `021_account_deletion.sql:71-75` ⟵
- **Error reports and analytics:** on Sentry's and PostHog's default retention
  for our plan; they hold no name or email from us.
- **Email we sent through Resend:** on Resend's default retention.

---

## 6. What you can ask us to do

Write to events@noguessworksystems.com from the address on the account (or, for a
guest, with the invitation code you replied to) and we will, within 30 days:

- **Tell you what we hold** about you and send you a copy.
- **Correct** it.
- **Delete** it. For a guest that means your reply. A host can also delete
  their own account directly — see below.
- **Stop analytics** for you (or just use `?noanalytics=1`).

**Deleting your account yourself.** A signed-in host can delete their account
in the app: **You & settings → Your account → Delete my account…**, then type
`DELETE` to confirm. ⟶ `hostv2/src/HostShellV2.jsx:18935-19000`;
`backend/app/routers/account.py:30-41` (`DELETE /api/account`; the literal
word `DELETE` is required, and only a signed-in session can do it). ⟵ It happens
at once and cannot be undone. It removes:

- your sign-in identity; ⟶ `account.py:88-92` ⟵
- every event that belongs only to you — the events in studios where you are
  the only member, and events you own outside any studio — with their guests'
  replies, vendor-brief links and vendors' confirmations, helper links and
  helpers' answers, guests' questions and your replies, invitation-open
  records, guests' shared photos (the files too), and event messages,
  so those invitation and brief links stop working; ⟶ `account.py:62-70`;
  `supabase/migrations/021_account_deletion.sql:30-59`,
  `023_helper_links.sql` (helper tables), `024_guest_messages.sql` (guest
  questions and invitation opens); `025_guest_photos.sql` and
  `account.py` (photo rows, and their files through the storage service);
  events go with their
  studio, `001_initial_schema.sql:46` (`on delete cascade`) ⟵
- studios where you are the only member, your studio memberships, and studio
  invitations you sent or received; ⟶ `021_account_deletion.sql:76-79` ⟵
- the files you uploaded to those events; ⟶ `account.py:71-87` ⟵
- on that device, the app's copies of the account's events. Plans that were
  only ever saved on the device stay there until you remove them. ⟶
  `HostShellV2.jsx:18961-18986` ⟵

It keeps, and the app says so before you confirm ⟶ `account.py:105`
(`retained_categories`), `HostShellV2.jsx:18990` ⟵:

- **payment receipts** for any pass you bought, with the link to your account
  removed; ⟶ `021_account_deletion.sql:71-75` ⟵
- **security and administrative records**;
- **content in a studio you share with other people**, which stays with them.
  In those studios your name is taken off the events you owned and off
  pinned messages. ⟶ `021_account_deletion.sql:60, 64-69, 77` ⟵

It stops and tells you what to do first if you are the only owner of a studio
other people still use (make someone else an owner), or if you uploaded files
to an event someone else still has (transfer or remove them). ⟶
`account.py:56-61, 76-77`; `021_account_deletion.sql:19-28` ⟵

Signed-out plans never reached us; to delete them, remove them from the device.
If you cannot sign in, write to us and we will do the deletion for you.

We will not treat you differently for asking. If you are in a US state with a
privacy law that gives you these rights by statute (California, Virginia,
Colorado, Connecticut, Utah, and others), this is how you exercise them; we
honor the same requests from everyone. We do not currently respond to browser
"Do Not Track" signals, because the analytics described above do not track you
across sites.

---

## 7. Children

The app is for adults planning events. We do not knowingly collect personal
data from children under 13. A host may record a child's name and dietary needs
on a guest list — that is the host's data about their guest, stored under the
rules above, and a parent may ask us to remove it through section 6.

---

## 8. Security, honestly stated

Data in transit is encrypted (HTTPS). Database access is governed by row level
security so one studio cannot read another's plans. Third-party API keys live
on our server, never in the app you download. Payment is handled on Stripe's
page, not ours. We do not claim certifications we do not hold. No system is
perfectly secure; if we learn of a breach that affects you, we will tell you
without unreasonable delay and as the law requires.

---

## 9. Changes

When this policy changes in a way that matters, we will put the new effective
date at the top and, for hosts with an account, tell you in the app before the
change takes effect.

---

## 10. The short version

- Hosts: we keep your email and your plans so the app works; signed-out plans
  never leave your device.
- Guests: your name, reply, meal and any dietary needs go only to the host.
  Photos you share have their location and other hidden details removed, and
  other guests see one only after the host approves it.
- Vendors see a fixed, limited slice of the plan — never guests' details.
- Payment happens on Stripe; we never see card numbers.
- Analytics are minimal and opt-out; error reports carry no personal data.
- Nothing is sold, nothing is advertised.
- Email events@noguessworksystems.com to see, fix or delete your data.

**Governing law:** `[OWNER: governing state]`, United States.
