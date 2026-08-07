# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: boardMatrix.spec.mjs >> Wanda far-out >> fold peek — the pull handle is in the first viewport
- Location: e2e/boardMatrix.spec.mjs:292:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 430
Received:   443.875
```

# Page snapshot

```yaml
- main [ref=e6]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - button "Menu" [ref=e9] [cursor=pointer]:
        - generic [ref=e14]: 225 DAYS · RETIREMENT + BIRTHDAY
        - generic [ref=e15]: ▾
      - generic [ref=e16]:
        - generic [ref=e17]:
          - heading "Decide the menu." [level=2] [ref=e18]
          - paragraph [ref=e19]: Mostly on course — spending is past your number. Worth a look today.
        - article [ref=e21]:
          - generic [ref=e22]:
            - heading "What you're serving · 4 open" [level=3] [ref=e23]
            - generic [ref=e24]:
              - paragraph [ref=e25]: Tap one to settle it — nothing else changes.
              - button "Drop-off catering / buffet our pick" [ref=e26] [cursor=pointer]:
                - generic [ref=e28]: Drop-off catering / buffet
                - generic [ref=e31]: our pick
              - button "Other ways ▸" [ref=e32] [cursor=pointer]
      - 'img "Active planning. 3 of 6 handled. Still open: Food, Vendors, Budget." [ref=e33]':
        - generic [ref=e47]:
          - generic [ref=e48]: 3 of 6 plan parts handled
          - generic [ref=e49]: the rest can wait till Mar 13
    - button "Show the rest of your plan" [ref=e50]:
      - generic [ref=e52]: The rest of your plan
    - generic [ref=e53]:
      - generic [ref=e54]: Then, in order
      - generic [ref=e55]:
        - button "Set your budget" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: Set your budget
          - generic [ref=e59]: →
        - button "Ceremony Timing When does the ceremony happen?" [ref=e60] [cursor=pointer]:
          - generic [ref=e61]: Ceremony Timing
          - generic [ref=e62]: When does the ceremony happen?
    - generic [ref=e63]:
      - generic [ref=e64]: Worth keeping an eye on
      - button "Final headcount not confirmed by 4 days out" [ref=e65] [cursor=pointer]:
        - generic [ref=e67]: Final headcount not confirmed by 4 days out
      - button "Speeches run long — and more…" [ref=e68] [cursor=pointer]:
        - generic [ref=e70]: Speeches run long — and more…
      - button "Too few chairs — and more…" [ref=e71] [cursor=pointer]:
        - generic [ref=e73]: Too few chairs — and more…
      - button "Known costs are $753 over your budget" [ref=e74] [cursor=pointer]:
        - generic [ref=e76]: Known costs are $753 over your budget
    - generic [ref=e77]:
      - text: Where you stand
      - button "Guests 75 planned around · likely 68–75 on the day (usually ~5–10% no-shows, walk-ins rare.)" [ref=e78] [cursor=pointer]:
        - generic [ref=e79]: Guests
        - generic [ref=e80]:
          - generic [ref=e81]: "75"
          - generic [ref=e82]:
            - text: planned around · likely
            - generic [ref=e83]: 68–75
            - text: on the day (usually ~5–10% no-shows, walk-ins rare.)
      - button "Budget $5,000 $5,753 spoken for · $4,163 est. · $840 spent · $753 over" [ref=e84] [cursor=pointer]:
        - generic [ref=e85]: Budget
        - generic [ref=e86]:
          - generic [ref=e87]: $5,000
          - generic [ref=e88]: $5,753 spoken for · $4,163 est. · $840 spent · $753 over
  - generic [ref=e89]:
    - paragraph [ref=e90]: "The parts of your plan are the date, the venue, the guest count, the food, the rest. This says how many are settled. Next is the shorter thing: what actually needs you today, in order, starting with the one at the top."
    - paragraph [ref=e91]: They read from the same list, so they can’t contradict each other — but they won’t match, and they shouldn’t. A part can be settled and still have one loose end, and a single job can close two parts at once.
    - paragraph [ref=e92]: 5 handled · 3 in progress · 1 needs unblocking
    - generic [ref=e93]:
      - generic [ref=e94]:
        - text: Guests
        - generic [ref=e95]: 7 of 9 confirmed
      - generic [ref=e96]:
        - text: Seating
        - generic [ref=e97]: Everyone has a seat
    - generic [ref=e98]: The 6 parts of your plan this count reads
    - paragraph [ref=e99]: Each part counts once here. The items inside a part — shopping items, people, steps — keep their own counts further down the page.
    - generic [ref=e100]:
      - generic [ref=e101]: datetime
      - generic [ref=e102]: handled
    - generic [ref=e103]:
      - generic [ref=e104]: location
      - generic [ref=e105]: handled
    - generic [ref=e106]:
      - generic [ref=e107]: headcount
      - generic [ref=e108]: handled
    - button "Decide what you're serving · 4 open" [ref=e109] [cursor=pointer]:
      - generic [ref=e111]: Decide what you're serving · 4 open
      - generic [ref=e112]: ›
    - button "Follow up with Semper Catering Co." [ref=e113] [cursor=pointer]:
      - generic [ref=e115]: Follow up with Semper Catering Co.
      - generic [ref=e116]: ›
    - button "Set your budget" [ref=e117] [cursor=pointer]:
      - generic [ref=e119]: Set your budget
      - generic [ref=e120]: ›
    - generic [ref=e121]:
      - paragraph [ref=e122]: "Protect the moment: The honoree walks in and the room is already full — they didn't expect that many people."
      - paragraph [ref=e123]: "Also worth protecting: The tribute speech from the person they mentored — the one they didn't know was coming."
      - paragraph [ref=e124]: "Also worth protecting: The slideshow hits a photo from thirty years ago and the whole room goes quiet."
    - generic [ref=e125]:
      - button "Calls to make Worth a look — 8 open" [ref=e126] [cursor=pointer]:
        - text: Calls to make
        - generic [ref=e127]: Worth a look — 8 open
      - button "People Needs you — 4 unconfirmed" [ref=e128] [cursor=pointer]:
        - text: People
        - generic [ref=e129]: Needs you — 4 unconfirmed
      - button "Checklist Worth a look — 2 of 7 done" [ref=e130] [cursor=pointer]:
        - text: Checklist
        - generic [ref=e131]: Worth a look — 2 of 7 done
    - generic [ref=e133]: Date set
    - generic [ref=e135]: 7 guests
    - generic [ref=e137]: Budget set
    - generic [ref=e139]: Food sourced
```

# Test source

```ts
  203 |           const hitIsPinned = hit && hit.closest && hit.closest('.next-bar, .dock, .wxpill');
  204 |           // Hit on a pinned layer → genuinely occluded: count. Hit elsewhere →
  205 |           // covered by non-pinned chrome: skip. Hit on itself → visible.
  206 |           if (!hitIsPinned && (!hit || !(el === hit || el.contains(hit)))) continue;
  207 |           lowestContent = r.bottom; lowestEl = (el.className || el.tagName) + ': ' + (el.innerText || '').slice(0, 40);
  208 |         }
  209 |         const afterH = app ? getComputedStyle(app, '::after').height : null;
  210 |         return { overlaps, pinnedTop, lowestContent, lowestEl, hasLayers: layers.length > 0,
  211 |           scrollTop: app && app.scrollTop, scrollHeight: app && app.scrollHeight, clientHeight: app && app.clientHeight, afterH };
  212 |       });
  213 |       expect(report.overlaps).toEqual([]);
  214 |       if (report.hasLayers && report.lowestContent) {
  215 |         expect(report.lowestContent, 'occluded: ' + report.lowestEl + ' · ' + JSON.stringify({ scrollTop: report.scrollTop, scrollHeight: report.scrollHeight, clientHeight: report.clientHeight, afterH: report.afterH })).toBeLessThanOrEqual(report.pinnedTop + 1);
  216 |       }
  217 |     });
  218 | 
  219 |     if (state.future) {
  220 |       // Routing-audit adds (2026-07-27, queue item ⑥). The nav-layer unit gate
  221 |       // proves every route RESOLVES; these two prove the interaction layer in a
  222 |       // real browser — rows actually open their editors, and a checklist CTA
  223 |       // lands a sheet instead of dying under a fall-through.
  224 |       test('decisions sheet — every unsettled row opens its editor', async ({ page }) => {
  225 |         test.setTimeout(90_000);
  226 |         await boot(page, state);
  227 |         // Deterministic nav: masthead menu → Jump to a section → Calls to make.
  228 |         await page.locator('.ev-eyebrow').first().click({ timeout: 5000 });
  229 |         await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 5000 });
  230 |         const calls = page.locator('.sheet').last().getByText('Calls to make', { exact: false }).first();
  231 |         if (await calls.count() === 0) { test.skip(true, 'no Calls to make section on this state'); return; }
  232 |         await calls.click({ timeout: 5000 });
  233 |         await expect(page.locator('#sheet-title')).toHaveText('Calls to make', { timeout: 5000 });
  234 |         const sheet = page.locator('.sheet').last();
  235 |         const read = () => sheet.innerText({ timeout: 1000 }).catch(() => '');
  236 |         // Sweep the sheet's row-level controls: each tap must CHANGE the sheet
  237 |         // (editor opens, chosen badge moves, row recomposes). Same chosen-row
  238 |         // exemption as loop-advance — a settled value re-render is legit-static.
  239 |         let swept = 0;
  240 |         for (let i = 0; i < 6; i++) {
  241 |           const row = sheet.locator('.frow .chip:visible[aria-pressed="false"], .decopt:visible:not(:has-text("chosen"))').nth(i);
  242 |           if (await row.count() === 0) break;
  243 |           const before = await read();
  244 |           await row.click({ timeout: 4000 }).catch(() => {});
  245 |           await page.waitForTimeout(700);
  246 |           const after = await read();
  247 |           expect(after !== before, `decisions row #${i + 1} changed nothing (dead row)`).toBe(true);
  248 |           swept++;
  249 |           await page.locator('.toast.on').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
  250 |         }
  251 |         if (swept === 0) test.skip(true, 'no unsettled decision rows on this state');
  252 |       });
  253 | 
  254 |       test('checklist CTA — a task action lands a real destination, never a dead tap', async ({ page }) => {
  255 |         test.setTimeout(60_000);
  256 |         await boot(page, state);
  257 |         await page.locator('.ev-eyebrow').first().click({ timeout: 5000 });
  258 |         await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click({ timeout: 5000 });
  259 |         const tasksRow = page.locator('.sheet').last().getByText('Your checklist', { exact: false }).first();
  260 |         if (await tasksRow.count() === 0) { test.skip(true, 'no checklist section on this state'); return; }
  261 |         await tasksRow.click({ timeout: 5000 });
  262 |         await expect(page.locator('#sheet-title')).toHaveText('Your checklist', { timeout: 5000 });
  263 |         // First task-row action CTA (checklistActionFor renders it) — tapping it
  264 |         // must move the host somewhere real: the sheet title changes to the
  265 |         // destination sheet (the RIGHT-sheet claim the unit gate can't make), or
  266 |         // an in-sheet editor opens. Same-title + same-content = the audit's
  267 |         // fall-through dead-end class.
  268 |         const sheet = page.locator('.sheet').last();
  269 |         const cta = sheet.locator('.mini.rowlink:visible').first();
  270 |         if (await cta.count() === 0) { test.skip(true, 'no task CTA on this state'); return; }
  271 |         const focusSig = () => page.evaluate(() => {
  272 |           const f = document.querySelector('.rowfocus');
  273 |           return f ? (f.innerText || '').slice(0, 60) : '';
  274 |         });
  275 |         const beforeTitle = await page.locator('#sheet-title').innerText();
  276 |         const beforeBody = await sheet.innerText({ timeout: 1000 }).catch(() => '');
  277 |         const beforeFocus = await focusSig();
  278 |         await cta.click({ timeout: 4000 });
  279 |         await page.waitForTimeout(1200);
  280 |         // A route may legitimately CLOSE the sheet for a stage landing (the
  281 |         // day-of run of show) — sheet-gone is arrival, not a dead tap. All
  282 |         // reads bounded: a vanished element must answer in a beat, never the
  283 |         // 30s locator default (that wait was itself a probe timeout).
  284 |         const sheetGone = await page.evaluate(() => !document.querySelector('.sheet'));
  285 |         const afterTitle = await page.locator('#sheet-title').innerText({ timeout: 1500 }).catch(() => '');
  286 |         const afterBody = await page.locator('.sheet').last().innerText({ timeout: 1500 }).catch(() => '');
  287 |         const afterFocus = await focusSig();
  288 |         expect(sheetGone || afterTitle !== beforeTitle || afterBody !== beforeBody || afterFocus !== beforeFocus,
  289 |           'task CTA changed nothing — dead tap (fall-through class)').toBe(true);
  290 |       });
  291 | 
  292 |       test('fold peek — the pull handle is in the first viewport', async ({ page }) => {
  293 |         await boot(page, state);
  294 |         const grab = page.locator('.efold-grab');
  295 |         if (await grab.count() === 0) { test.skip(true, 'no fold on this state (calm/day-of)'); return; }
  296 |         // Documented boundary: the peek guarantee applies when the ask FITS the
  297 |         // viewport. When the ask content itself exceeds it (short landscape),
  298 |         // scrolling is already inevitable and the handle follows the content.
  299 |         const askH = await page.locator('.escreen').first().evaluate(el => el.getBoundingClientRect().height).catch(() => 0);
  300 |         if (askH > page.viewportSize().height) { test.skip(true, 'ask exceeds viewport — peek boundary'); return; }
  301 |         const box = await grab.boundingBox();
  302 |         expect(box).not.toBeNull();
> 303 |         expect(box.y).toBeLessThan(page.viewportSize().height); // inside the first viewport
      |                       ^ Error: expect(received).toBeLessThan(expected)
  304 |       });
  305 |     }
  306 |   });
  307 | }
  308 | 
```