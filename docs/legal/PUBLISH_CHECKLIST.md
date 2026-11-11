# Publish checklist — after the attorney signs off

Do these steps in order. **Do not start until you have the attorney's written approval of the final text** (`ATTORNEY_COVER_MEMO.md` §6). The publishing script checks only that no markers are left. It cannot check whether a lawyer approved the text, so removing the markers is your sign-off. Nothing here is legal advice.

## The marker convention the script enforces

| In the drafts | Meaning | On publish |
|---|---|---|
| `[OWNER: …]` | A fact only you can supply | **Refused** until filled |
| `COUNSEL` (block or inline) | A question for the attorney | **Refused** until answered and deleted |
| `VERIFY:` | A claim still to be checked | **Refused** until checked and deleted |
| `DRAFT` (the header at the top of each draft) | Not yet reviewed | **Refused** until deleted |
| `⟶ … ⟵` | A code citation or note to the reviewer. It can span lines or sit mid-sentence | **Stripped.** Keep these; they are the record of why each sentence is true |

If a draft has an unclosed `⟶`, a stray `⟵`, or a `⟶` inside an open note, the script refuses. It does not guess where a note ends. A refusal writes nothing, not even the drafts that passed.

## Steps

1. **Fill the facts.** Fill every row of `OWNER_FILL_SHEET.md`, including the stale claims, in all three drafts: `PRIVACY_POLICY_DRAFT.md`, `TERMS_OF_SERVICE_DRAFT.md`, and `REFUND_POLICY_DRAFT.md`. Set the effective date last. It is the day the pages go live, written as `Month D, YYYY`.
2. **Apply the attorney's changes, then remove the markers:**
   - Delete each `COUNSEL` note once its answer is in the text. That includes the inline one in terms §15.
   - Delete the `DRAFT` header blockquote at the top of each draft.
   - **Refund §3:** keep only the option you chose. Delete the other two options, the "Three options, in the order we recommend them…" paragraph, and its `⟶ *Why…* ⟵` notes. Reword "Whichever rule is chosen" to fit the one rule. The script **cannot** catch a leftover option, so read this section yourself.
   - **Terms §5:** remove the refund-rule placeholder from the cross-reference.
3. **Check that nothing is left:**
   `grep -nE "\[OWNER|COUNSEL|VERIFY:|\bDRAFT\b" docs/legal/PRIVACY_POLICY_DRAFT.md docs/legal/TERMS_OF_SERVICE_DRAFT.md docs/legal/REFUND_POLICY_DRAFT.md` should print nothing.
4. **Build the pages:** run `npm run policies:publish` from the app repo root. It writes:
   - `hostv2/public/legal/privacy.html`
   - `hostv2/public/legal/terms.html`
   - `hostv2/public/legal/refunds.html`

   If it refuses, it lists every remaining item as `file:line`. Fix them and run it again. Then open each page in a browser, in light and dark mode and at phone width. **Read each one against the text the attorney approved.** This script runs only when you run it. It is not part of CI or any build.
5. **Turn the links on.** In `src/lib/brand.js`, set `BRAND.policies`:
   ```js
   policies: Object.freeze({
     privacy: 'https://twillis45.github.io/ngw-event-planner/hostv2/legal/privacy.html',
     terms:   'https://twillis45.github.io/ngw-event-planner/hostv2/legal/terms.html',
     refunds: 'https://twillis45.github.io/ngw-event-planner/hostv2/legal/refunds.html',
   }),
   ```
   Also update the first test in `src/lib/__tests__/policyLinks.test.js`, "nothing is published today". It asserts all three are `null`, so change it to assert these URLs. Then run `CI=true npx react-scripts test --watchAll=false --testPathPattern "policy|legal"`.
6. **Open a PR** containing the edited drafts, the three HTML files, `brand.js`, and the test. Merge it once Checks passes. The Pages deploy starts automatically after Checks succeeds on `main`, which takes about 25 minutes (`.github/workflows/pages-from-source.yml`). `hostv2/public/` is copied verbatim into the hostv2 build, and `npm run release` stages that build under `build/hostv2/`.
7. **Confirm the pages are live:**
   ```sh
   for p in privacy terms refunds; do
     curl -s -o /dev/null -w "%{http_code} $p\n" "https://twillis45.github.io/ngw-event-planner/hostv2/legal/$p.html"
   done
   ```
   All three must print `200`. Also check that `https://twillis45.github.io/ngw-event-planner/RELEASE_SHA.txt` names your merge and `release_profile=live`.
8. **Check the app.** It links the published policies automatically wherever `PolicyLinks` renders (`src/lib/policyLinks.js`, `hostv2/src/PolicyLinks.jsx`):
   - the pass sheet (`HostShellV2.jsx`, "Get the pass")
   - the sign-in sheet ("Signing in means you agree to:")
   - the guest invite footer ("How your answer is used:", `InviteV2.jsx`)

   Open each one on the live site and tap each link.
9. **Record it.** Add a line to `HANDOFF.md` with the date, the merge SHA, and the three URLs. That closes LEGAL-1 and half of stage-9 precondition #1.

## Custom domain

These URLs are on `twillis45.github.io` because that is where the site is served today. **They will change when the site moves to its own domain.** `docs/legal/README.md` explains why precondition #1 pairs the domain with the policies. When that happens:

- Update the three URLs in **`BRAND.policies`**. It is the only place the app reads them, and `policyLinks.test.js` checks it.
- Check with `curl -I` whether the old github.io URLs redirect to the new domain. I have not confirmed whether GitHub Pages redirects deep paths for this project site. If they do not redirect, anyone holding an old link gets a 404.
- The pages link to each other with relative paths, so they need no change. Re-run step 7 against the new URLs.

## Later changes to a published policy

Edit the source draft, which no longer carries any markers. Change its effective date, run `npm run policies:publish`, and open a PR. The policies promise in-app notice of changes that matter (privacy §9, terms §13), so the attorney decides whether a change needs one. Never hand-edit the HTML files; each one says so in its first lines.
