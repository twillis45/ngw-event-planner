# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: decisionIdentity.spec.mjs >> Game Night — desktop 1440×900 >> the ask, the record and the panel are about ONE thing
- Location: e2e/decisionIdentity.spec.mjs:118:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 401 ()",
+   "Failed to load resource: the server responded with a status of 401 ()",
+ ]
```

# Page snapshot

```yaml
- main [ref=e6]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - button "Menu" [ref=e9] [cursor=pointer]:
        - generic [ref=e14]: 2 DAYS · GAME NIGHT
        - generic [ref=e15]: ▾
      - generic [ref=e16]:
        - heading "Get the food." [level=2] [ref=e18]
        - article [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e23]: due tomorrow
            - heading "Chips, crackers, pretzels & popcorn — 13 snack servings tomorrow" [level=3] [ref=e24]
            - paragraph [ref=e25]: Dry, one-hand snacks keep fingers clean for cards.
            - button "Open the list" [ref=e27] [cursor=pointer]
      - 'img "Active planning. 4 of 6 handled. Still open: Food, Shopping." [ref=e28]':
        - generic [ref=e42]:
          - generic [ref=e43]: 4 of 6 · Food and Shopping open
          - generic [ref=e44]: the rest can wait
    - generic [ref=e45]:
      - generic [ref=e46]: Two days out · your day-before plan
      - heading "17 items to get before the day." [level=3] [ref=e47]
      - generic [ref=e48]:
        - button "Plan steps — nothing open Nothing open. Stop worrying about the plan." [ref=e49] [cursor=pointer]:
          - generic [ref=e50]:
            - generic [ref=e51]: Plan steps — nothing open
            - generic [ref=e52]: Nothing open. Stop worrying about the plan.
          - generic [ref=e53]: ›
        - button "17 items still to get 9 on the food list · 8 supplies & gear — one store run covers it." [ref=e54] [cursor=pointer]:
          - generic [ref=e55]:
            - generic [ref=e56]: 17 items still to get
            - generic [ref=e57]: 9 on the food list · 8 supplies & gear — one store run covers it.
          - generic [ref=e58]: ›
        - button "No rain backup yet No backup spot written down yet." [ref=e59] [cursor=pointer]:
          - generic [ref=e60]:
            - generic [ref=e61]: No rain backup yet
            - generic [ref=e62]: No backup spot written down yet.
          - generic [ref=e63]: ›
        - button "How tomorrow starts 11:00 AM — Pull the games and open every box — count pieces, cards and dice now, not at the table · and 14 more" [ref=e64] [cursor=pointer]:
          - generic [ref=e65]:
            - generic [ref=e66]: How tomorrow starts
            - generic [ref=e67]: 11:00 AM — Pull the games and open every box — count pieces, cards and dice now, not at the table · and 14 more
          - generic [ref=e68]: ›
        - button "Tell your guests A final-details note is written for you — where, when, what to bring." [ref=e69] [cursor=pointer]:
          - generic [ref=e70]:
            - generic [ref=e71]: Tell your guests
            - generic [ref=e72]: A final-details note is written for you — where, when, what to bring.
          - generic [ref=e73]: ›
      - button "Draft the details" [ref=e75] [cursor=pointer]
    - button "then the rest of your list · 2 more · 1 due today" [ref=e76] [cursor=pointer]:
      - generic [ref=e77]: then
      - generic [ref=e78]: the rest of your list · 2 more · 1 due today
      - generic [ref=e79]: ›
    - generic [ref=e80]:
      - text: Where you stand
      - button "Guests 12 planned around · likely 10–13 on the day (usually ~10–15% no-shows, a few plus-ones.)" [ref=e81] [cursor=pointer]:
        - generic [ref=e82]: Guests
        - generic [ref=e83]:
          - generic [ref=e84]: "12"
          - generic [ref=e85]:
            - text: planned around · likely
            - generic [ref=e86]: 10–13
            - text: on the day (usually ~10–15% no-shows, a few plus-ones.)
      - button "Budget $600 $333 spoken for (est.) · $0 spent" [ref=e87] [cursor=pointer]:
        - generic [ref=e88]: Budget
        - generic [ref=e89]:
          - generic [ref=e90]: $600
          - generic [ref=e91]: $333 spoken for (est.) · $0 spent
  - generic [ref=e92]:
    - paragraph [ref=e93]: "The parts of your plan are the date, the venue, the guest count, the food, the rest. This says how many are settled. Next is the shorter thing: what actually needs you today, in order, starting with the one at the top."
    - paragraph [ref=e94]: They read from the same list, so they can’t contradict each other — but they won’t match, and they shouldn’t. A part can be settled and still have one loose end, and a single job can close two parts at once.
    - paragraph [ref=e95]: 4 handled
    - generic [ref=e96]: The 6 parts of your plan this count reads
    - paragraph [ref=e97]: Each part counts once here. The items inside a part — shopping items, people, steps — keep their own counts further down the page.
    - generic [ref=e98]:
      - generic [ref=e99]: datetime
      - generic [ref=e100]: handled
    - generic [ref=e101]:
      - generic [ref=e102]: location
      - generic [ref=e103]: handled
    - generic [ref=e104]:
      - generic [ref=e105]: headcount
      - generic [ref=e106]: handled
    - button "Note dietary needs on the food plan" [ref=e107] [cursor=pointer]:
      - generic [ref=e109]: Note dietary needs on the food plan
      - generic [ref=e110]: ›
    - button "Buy the remaining items · 12 left" [ref=e111] [cursor=pointer]:
      - generic [ref=e113]: Buy the remaining items · 12 left
      - generic [ref=e114]: ›
    - generic [ref=e115]:
      - generic [ref=e116]: budget
      - generic [ref=e117]: handled
    - generic [ref=e118]:
      - paragraph [ref=e119]: "Protect the moment: The headliner game clicks and everyone forgets what time it is."
      - paragraph [ref=e120]: "Also worth protecting: Someone makes a play nobody expected and the table erupts."
      - paragraph [ref=e121]: "Also worth protecting: The room gets so loud with laughter that someone checks if the neighbors can hear."
    - button "Checklist Not set yet — No tasks yet" [ref=e123] [cursor=pointer]:
      - text: Checklist
      - generic [ref=e124]: Not set yet — No tasks yet
    - generic [ref=e126]: Date set
    - generic [ref=e128]: 12 guests
    - generic [ref=e130]: Budget set · $600
    - generic [ref=e132]: Food sourced
  - article [ref=e133]:
    - generic [ref=e134]:
      - generic [ref=e136]: Plan
      - heading "Where is it happening?" [level=3] [ref=e137]
      - paragraph [ref=e138]: Everything hangs off the venue — invites, the rain backup, seats and space.
      - generic [ref=e139]:
        - textbox "Venue" [ref=e140]:
          - /placeholder: Name or address
        - button "Save" [ref=e141] [cursor=pointer]
```

# Test source

```ts
  42  | 
  43  | const VIEWPORTS = [
  44  |   { name: 'mobile 390×844', viewport: { width: 390, height: 844 } },
  45  |   { name: 'desktop 1440×900', viewport: { width: 1440, height: 900 } },
  46  | ];
  47  | 
  48  | const bootGameNight = async (page) => {
  49  |   const d = new Date(); d.setDate(d.getDate() + 2);
  50  |   await page.addInitScript(([ev, patch, iso]) => {
  51  |     localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
  52  |     localStorage.setItem('ngw-hostv2-patch-gn', JSON.stringify(patch));
  53  |     localStorage.setItem('ngw-hostv2-last-event', 'gn');
  54  |     localStorage.setItem('ngw-v2-splash-seen', '1');
  55  |   }, [GN_EVENT, GN_PATCH, localISO(d)]);
  56  | };
  57  | 
  58  | // The solemn control. NOT the ev-x-repast sample — that one carries a fixed
  59  | // past date (2026-07-25) and renders a recap, no hero at all. This is the live
  60  | // repast the fix was verified against: 4 days out, 50 by count, church hall,
  61  | // and its authored food-provider lever still OPEN — the case where a decision
  62  | // panel is exactly right, and must not be collateral damage.
  63  | const RP_EVENT = {
  64  |   id: 'rp', name: 'Repast for Deacon Willie Hayes', type: 'repast', createdAt: '2026-07-29',
  65  |   guestMode: 'count', guestCount: 50, venueKind: 'venue',
  66  |   venue: 'Mount Zion Baptist Church — Fellowship Hall',
  67  |   guests: [], vendors: [], timeline: [], budget: [],
  68  | };
  69  | const RP_PATCH = {
  70  |   startTime: '15:00', startTimeSource: 'derived', startTimeBasis: 'rule-of-thumb',
  71  |   startTimeWhy: 'Most repasts are afternoon gatherings, so we set a 3:00 PM start to plan around — this is a starting point, not your plan. Change it to whatever is true.',
  72  | };
  73  | 
  74  | const bootRepast = async (page) => {
  75  |   const d = new Date(); d.setDate(d.getDate() + 4);
  76  |   await page.addInitScript(([ev, patch, iso]) => {
  77  |     localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
  78  |     localStorage.setItem('ngw-hostv2-patch-rp', JSON.stringify(patch));
  79  |     localStorage.setItem('ngw-hostv2-last-event', 'rp');
  80  |     localStorage.setItem('ngw-v2-splash-seen', '1');
  81  |   }, [RP_EVENT, RP_PATCH, localISO(d)]);
  82  | };
  83  | 
  84  | // What the hero is actually saying, read off the DOM — the ask, the record, and
  85  | // whether a decision panel is attached to it.
  86  | const readHero = (page) => page.evaluate(() => {
  87  |   const card = document.querySelector('.hero-card');
  88  |   const h2 = document.querySelector('h2.ask') || document.querySelector('h2');
  89  |   const cta = card && card.querySelector('button.cta');
  90  |   return {
  91  |     ask: h2 ? h2.textContent.trim() : null,
  92  |     cardId: card ? card.id : null,
  93  |     record: card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : null,
  94  |     hasPanel: !!(card && card.querySelector('.decopts')),
  95  |     options: card ? [...card.querySelectorAll('.decopt-name')].map(n => n.textContent.trim()) : [],
  96  |     chosen: card ? [...card.querySelectorAll('.decopt.pick .decopt-name')].map(n => n.textContent.trim()) : [],
  97  |     ctaText: cta ? cta.textContent.trim() : null,
  98  |     bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  99  |     text: card ? card.textContent : '',
  100 |   };
  101 | });
  102 | 
  103 | const MALFORMED = [/\?\?/, /\.\./, /\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\[object Object\]/];
  104 | 
  105 | const assertClean = (hero) => {
  106 |   const all = [hero.ask, hero.record, hero.ctaText, hero.text].filter(Boolean).join(' • ');
  107 |   for (const re of MALFORMED) expect(all, `malformed: ${re}`).not.toMatch(re);
  108 |   expect(hero.ask).toBeTruthy();
  109 |   expect(hero.ask).not.toBe('?');
  110 |   // No horizontal overflow at any width.
  111 |   expect(hero.bodyOverflow).toBeLessThanOrEqual(0);
  112 | };
  113 | 
  114 | for (const { name, viewport } of VIEWPORTS) {
  115 |   test.describe(`Game Night — ${name}`, () => {
  116 |     test.use({ viewport });
  117 | 
  118 |     test('the ask, the record and the panel are about ONE thing', async ({ page }) => {
  119 |       const errors = [];
  120 |       page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  121 |       page.on('pageerror', e => errors.push(String(e)));
  122 | 
  123 |       await bootGameNight(page);
  124 |       await page.goto('./');
  125 |       await page.waitForSelector('.hero-card', { timeout: 15_000 });
  126 |       const hero = await readHero(page);
  127 | 
  128 |       // The action is the shopping line it always was.
  129 |       expect(hero.cardId).toBe('card-top:operational:p_snacks');
  130 |       expect(hero.record).toMatch(/snack servings/i);
  131 | 
  132 |       // THE REGRESSION: no menu ask, and no provider panel on a non-decision action.
  133 |       expect(hero.ask).not.toMatch(/menu/i);
  134 |       expect(hero.hasPanel).toBe(false);
  135 |       expect(hero.options).toEqual([]);
  136 |       expect(hero.text).not.toMatch(/A caterer handles it|Potluck|We’ll cook it/);
  137 | 
  138 |       // The action still has a way to act, and it is the action's own.
  139 |       expect(hero.ctaText).toBeTruthy();
  140 | 
  141 |       assertClean(hero);
> 142 |       expect(errors).toEqual([]);
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  143 |     });
  144 | 
  145 |     test('the same identity survives three reloads', async ({ page }) => {
  146 |       await bootGameNight(page);
  147 |       const seen = [];
  148 |       for (let i = 0; i < 3; i++) {
  149 |         await page.goto('./');
  150 |         await page.waitForSelector('.hero-card', { timeout: 15_000 });
  151 |         const h = await readHero(page);
  152 |         seen.push(`${h.cardId} | ${h.ask} | panel=${h.hasPanel}`);
  153 |       }
  154 |       expect(new Set(seen).size, `drifted across reloads: ${JSON.stringify(seen, null, 1)}`).toBe(1);
  155 |       expect(seen[0]).toContain('card-top:operational:p_snacks');
  156 |       expect(seen[0]).toContain('panel=false');
  157 |     });
  158 |   });
  159 | 
  160 |   test.describe(`Solemn repast — ${name}`, () => {
  161 |     test.use({ viewport });
  162 | 
  163 |     test('a real open decision still renders, aligned with its ask', async ({ page }) => {
  164 |       const errors = [];
  165 |       page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  166 |       page.on('pageerror', e => errors.push(String(e)));
  167 | 
  168 |       await bootRepast(page);
  169 |       await page.goto('./');
  170 |       await page.waitForSelector('.hero-card', { timeout: 15_000 });
  171 |       const hero = await readHero(page);
  172 | 
  173 |       // The repast's food-provider lever is genuinely open — the panel belongs here.
  174 |       expect(hero.ask).toMatch(/who provides the food/i);
  175 |       expect(hero.hasPanel).toBe(true);
  176 |       expect(hero.options.join(' • ')).toMatch(/church|repast committee/i);
  177 | 
  178 |       // No blame grammar on a solemn day.
  179 |       expect(hero.text).not.toMatch(/past its easy window|past its window|overdue|behind/i);
  180 | 
  181 |       assertClean(hero);
  182 |       expect(errors).toEqual([]);
  183 |     });
  184 |   });
  185 | }
  186 | 
```