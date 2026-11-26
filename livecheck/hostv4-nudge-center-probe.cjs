const { chromium } = require('playwright');
const BASE='https://twillis45.github.io/ngw-event-planner/hostv4/?noanalytics=1';
const NAMES=['Ada Pine','Ben Oak','Cy Fern','Dee Ash','Eli Elm','Fay Yew','Gus Bay','Hal Fir','Ivy Box','Jo Lime'], RS=['Yes','Yes','Yes','Yes','Maybe','Maybe','','','','No'];
const ev=(withEmail)=>({ id:'E2E_TEST_lc-278p', name:'E2E_TEST_ Rosa’s 40th', type:'Birthday', date:'2027-01-04', startTime:'18:00', startTimeSource:'derived', totalBudget:550, guestEstimate:12, guestCountSource:'host', guestMode:'list', plusOnePolicy:'plus_one_ok', kidsPolicy:'kids_welcome', rsvpDeadline:'2026-12-25', invitesSentAt:'2026-11-20T15:00:00Z',
  guests:NAMES.map((n,i)=>({id:'g'+i,name:n,rsvp:RS[i],invitedAt:'2026-11-20T15:00:00Z',...(withEmail?{email:n.toLowerCase().replace(' ','.')+'@example.com'}:{})})), vendors:[] });
(async()=>{ const b=await chromium.launch();
  for (const [w,h] of [[390,844],[834,1194],[844,390]]) {
    const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true}); let writes=0;
    await ctx.route('**/*',(rt)=>['POST','PUT','PATCH','DELETE'].includes(rt.request().method())?(writes++,rt.abort()):rt.continue());
    const p=await ctx.newPage(); p.setDefaultTimeout(6000); await p.goto(BASE);
    for (const withEmail of (w===390?[false,true]:[true])) {
      await p.evaluate((e)=>{localStorage.clear();localStorage.setItem('ngw-hostv2-custom-events',JSON.stringify([e]));localStorage.setItem('ngw-hostv2-last-event',e.id);}, ev(withEmail));
      await p.goto(BASE,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
      const tab=p.getByRole('tab',{name:'Your plan'}); if(await tab.isVisible().catch(()=>false)) await tab.click(); else { const s=p.getByRole('button',{name:'Show places'}); if(await s.isVisible().catch(()=>false)){await s.click();await p.waitForTimeout(300);} await p.locator('aside[aria-label="Places"] button',{hasText:'Your plan'}).first().click(); }
      await p.waitForTimeout(300); await p.locator('[data-plan-row="guests"]').first().click(); await p.waitForSelector('[data-view="guests"]'); await p.waitForTimeout(600);
      const lit=await p.locator('[data-path] [aria-current="step"]').evaluateAll(e=>e.map(x=>x.getAttribute('data-step')+' | '+x.innerText.replace(/\s+/g,' ')));
      const btn=await p.locator('.action .primary').first().innerText().catch(()=>null);
      console.log(w+'x'+h,'emails',withEmail,'lit',JSON.stringify(lit),'button',btn);
    }
    if (w!==390) {
      const g=await p.evaluate(()=>{const m=document.querySelector('[data-view="guests"]');const r=m.getBoundingClientRect();const cs=getComputedStyle(m);
        const sec=document.querySelector('[data-guests]')?.getBoundingClientRect();const back=[...document.querySelectorAll('a,button')].find(e=>/Your plan/.test(e.innerText)&&e.getClientRects().length);const bb=back&&back.getBoundingClientRect();
        const menu=document.querySelector('button[aria-label="Show places"]');const mb=menu&&menu.getClientRects().length&&menu.getBoundingClientRect();
        const more=document.querySelector('button[aria-label="More"]').getBoundingClientRect();
        return {vw:innerWidth,main:[Math.round(r.left),Math.round(r.right)],pad:[cs.paddingLeft,cs.paddingRight],section:sec&&[Math.round(sec.left),Math.round(sec.right)],back:bb&&[Math.round(bb.left),Math.round(bb.right)],menu:mb&&[Math.round(mb.left),Math.round(mb.right)],more:[Math.round(more.left),Math.round(more.right)]};});
      console.log(w+'x'+h,'geo',JSON.stringify(g)); await p.screenshot({path:'/tmp/claude-0/ctr-'+w+'.png'});
    }
    console.log('writes',writes); await ctx.close(); }
  await b.close(); })();
