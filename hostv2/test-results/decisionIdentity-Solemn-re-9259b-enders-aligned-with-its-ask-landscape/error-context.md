# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: decisionIdentity.spec.mjs >> Solemn repast — mobile 390×844 >> a real open decision still renders, aligned with its ask
- Location: e2e/decisionIdentity.spec.mjs:163:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 401 ()",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - main [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - button "Menu" [ref=e9] [cursor=pointer]:
          - generic [ref=e14]: 4 DAYS · REPAST
          - generic [ref=e15]: ▾
        - generic [ref=e16]:
          - heading "Who provides the food?" [level=2] [ref=e18]
          - article [ref=e20]:
            - generic [ref=e22]:
              - paragraph [ref=e23]: Tap one to settle it — nothing else changes.
              - button "Let the church / repast committee bring it our pick" [ref=e24] [cursor=pointer]:
                - generic [ref=e26]: Let the church / repast committee bring it
                - generic [ref=e29]: our pick
              - button "Other ways ▸" [ref=e30] [cursor=pointer]
        - 'img "Active planning. 2 of 6 handled. Still open: Date & time, Food, Shopping, Budget. One item is past its date." [ref=e31]':
          - generic [ref=e45]:
            - generic [ref=e46]: 2 of 6 plan parts handled
            - generic [ref=e47]: this one first
      - button "Show the rest of your plan" [ref=e48]:
        - generic [ref=e50]: The rest of your plan
      - generic [ref=e51]:
        - generic [ref=e52]: Then, in order
        - generic [ref=e53]:
          - button "Resolve \"Where the repast is held\"" [ref=e54] [cursor=pointer]:
            - generic [ref=e55]: Resolve "Where the repast is held"
            - generic [ref=e57]: →
          - button "Set your budget" [ref=e58] [cursor=pointer]:
            - generic [ref=e59]: Set your budget
            - generic [ref=e61]: →
          - button "Plan the food" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: Plan the food
            - generic [ref=e65]: →
          - button "Buy the remaining items · 6 left" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: Buy the remaining items · 6 left
            - generic [ref=e69]: →
          - button "Confirm the start time" [ref=e70] [cursor=pointer]:
            - generic [ref=e71]: Confirm the start time
            - generic [ref=e73]: →
      - generic [ref=e74]:
        - generic [ref=e75]: Worth keeping an eye on
        - button "The grieving family is being asked to cook or coordinate the meal" [ref=e76] [cursor=pointer]:
          - generic [ref=e78]: The grieving family is being asked to cook or coordinate the meal
        - button "No room reserved for after the burial" [ref=e79] [cursor=pointer]:
          - generic [ref=e81]: No room reserved for after the burial
      - generic [ref=e82]:
        - text: Where you stand
        - button "Guests 50 planned around · likely 40–57 on the day (some no-shows, some plus-ones and walk-ins.)" [ref=e83] [cursor=pointer]:
          - generic [ref=e84]: Guests
          - generic [ref=e85]:
            - generic [ref=e86]: "50"
            - generic [ref=e87]:
              - text: planned around · likely
              - generic [ref=e88]: 40–57
              - text: on the day (some no-shows, some plus-ones and walk-ins.)
        - button "Budget — no number yet — tap to set one" [ref=e89] [cursor=pointer]:
          - generic [ref=e90]: Budget
          - generic [ref=e91]:
            - generic [ref=e92]: —
            - generic [ref=e93]: no number yet — tap to set one
    - generic [ref=e94]:
      - paragraph [ref=e95]: "The parts of your plan are the date, the venue, the guest count, the food, the rest. This says how many are settled. Next is the shorter thing: what actually needs you today, in order, starting with the one at the top."
      - paragraph [ref=e96]: They read from the same list, so they can’t contradict each other — but they won’t match, and they shouldn’t. A part can be settled and still have one loose end, and a single job can close two parts at once.
      - paragraph [ref=e97]: 2 handled · 2 need unblocking
      - generic [ref=e98]: The 6 parts of your plan this count reads
      - paragraph [ref=e99]: Each part counts once here. The items inside a part — shopping items, people, steps — keep their own counts further down the page.
      - button "Confirm the start time" [ref=e100] [cursor=pointer]:
        - generic [ref=e102]: Confirm the start time
        - generic [ref=e103]: ›
      - generic [ref=e104]:
        - generic [ref=e105]: location
        - generic [ref=e106]: handled
      - generic [ref=e107]:
        - generic [ref=e108]: headcount
        - generic [ref=e109]: handled
      - button "Decide what you're serving · 2 open" [ref=e110] [cursor=pointer]:
        - generic [ref=e112]: Decide what you're serving · 2 open
        - generic [ref=e113]: ›
      - button "Buy the remaining items · 6 left" [ref=e114] [cursor=pointer]:
        - generic [ref=e116]: Buy the remaining items · 6 left
        - generic [ref=e117]: ›
      - button "Set your budget" [ref=e118] [cursor=pointer]:
        - generic [ref=e120]: Set your budget
        - generic [ref=e121]: ›
      - generic [ref=e122]:
        - paragraph [ref=e123]: "Protect the moment: The family walks in and the food is already there — they didn't have to do a thing."
        - paragraph [ref=e124]: "Also worth protecting: Someone shares a memory that makes the whole room laugh through tears."
        - paragraph [ref=e125]: "Also worth protecting: An elder gets a seat, a full plate, and someone sits beside them."
      - generic [ref=e126]:
        - button "Calls to make Worth a look — 4 open" [ref=e127] [cursor=pointer]:
          - text: Calls to make
          - generic [ref=e128]: Worth a look — 4 open
        - button "Checklist Not set yet — No tasks yet" [ref=e129] [cursor=pointer]:
          - text: Checklist
          - generic [ref=e130]: Not set yet — No tasks yet
      - generic [ref=e132]: Date set
      - generic [ref=e134]: 50 guests
  - button "Skip intro" [ref=e135] [cursor=pointer]:
    - generic [ref=e136]:
      - generic [ref=e137]: Event
      - generic [ref=e139]: Boss
    - generic [ref=e141]: EVENT BOSS
    - generic [ref=e142]:
      - generic [ref=e143]: the details are ours.
      - generic [ref=e144]: the day is yours.
```

# Test source

```ts
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
  142 |       expect(errors).toEqual([]);
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
> 182 |       expect(errors).toEqual([]);
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  183 |     });
  184 |   });
  185 | }
  186 | 
```