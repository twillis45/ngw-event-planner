const { chromium } = require('playwright');
const SENT=["Mom Linda's Thanksgiving dinner for 14 at her house in Springfield, VA","Thanksgiving dinner at Mom Linda's for 14 in Springfield, VA","Mom Linda’s Thanksgiving dinner for 14 at her house in Springfield, VA","Hosting Thanksgiving for Mom Linda, 14 people, Springfield VA"];
(async()=>{const b=await chromium.launch();
for(const t of SENT){const ctx=await b.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:true,timezoneId:'America/New_York'});
await ctx.route('**/*',r=>['POST','PUT','PATCH','DELETE'].includes(r.request().method())?r.abort():r.continue());
const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-05:00'));
await p.goto('https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1&elegant=1');
await p.getByRole('button',{name:'Start my event'}).first().click({timeout:30000});
await p.getByPlaceholder(/crab feast/i).first().fill(t);
await p.getByRole('button',{name:/^Put my plan together$/}).click();
const o=p.getByRole('button',{name:/^Open (your|my) plan/});await o.waitFor({timeout:30000});await o.click();await p.waitForTimeout(3000);
const r=await p.evaluate(()=>({stored:(JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')||'[]').at(-1)||{}).name,honoree:(JSON.parse(localStorage.getItem('ngw-hostv2-custom-events')||'[]').at(-1)||{}).honoree,eyebrow:[...document.querySelectorAll('.ev-eyebrow .eb-text')].map(e=>e.innerText).join(' / ')}));
console.log(JSON.stringify(t),'=>',JSON.stringify(r));await ctx.close();}
await b.close();})();
