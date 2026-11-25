const { chromium } = require('playwright');
const V=['Maple Table Catering','Oak Hall Rentals','Fern DJ Co','Birch Florals','Cedar Photo','Elm Bakery'].map((n,i)=>({id:'v'+i,name:n,category:['Catering','Rentals','DJ','Florist','Photography','Bakery'][i],status:'Considering',cost:300}));
const EV={id:'lc-who',name:'Rosa’s Harvest Dinner',type:'Dinner Party',createdAt:'2026-11-01',date:'2026-12-19',startTime:'18:00',startTimeSource:'host',venue:'Home',venueKind:'home',venueAddress:'42 Elm Ct, Springfield, VA 22150',venueCity:'Springfield',venueState:'VA',guestMode:'list',guestEstimate:12,guestCountSource:'host',totalBudget:3000,guests:[{id:'g1',name:'Ada Pine',rsvp:'Yes'}],vendors:V,budget:[],timeline:[]};
(async()=>{const b=await chromium.launch();
for (const vp of [[390,844],[1440,900]]) {
const ctx=await b.newContext({viewport:{width:vp[0],height:vp[1]},hasTouch:vp[0]<1100,isMobile:vp[0]<1100,timezoneId:'America/New_York'});
await ctx.route('**/*',r=>['POST','PUT','PATCH','DELETE'].includes(r.request().method())?r.abort():r.continue());
const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-12-16T12:00:00-05:00'));
await p.addInitScript(e=>{localStorage.setItem('ngw-hostv2-custom-events',JSON.stringify([e]));localStorage.setItem('ngw-hostv2-last-event',e.id);localStorage.setItem('ngw-v2-splash-seen','x');localStorage.setItem('ngw-welcomed','1');localStorage.setItem('ngw-v2-welcomed','1');},EV);
await p.goto('https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1&elegant=1');await p.waitForTimeout(5000);
const read=()=>p.evaluate(()=>{const s=document.querySelector('[data-who-confirmed]');if(!s)return 'no [data-who-confirmed]';return [...s.querySelectorAll('[data-who-group]')].map(g=>({g:g.getAttribute('data-who-group'),count:(g.querySelector('[data-who-count]')||{}).innerText,rows:g.querySelectorAll('[data-who-row]').length,more:(g.querySelector('[data-who-more]')||{}).innerText||null}))});
const r1=await read();let r2=null;
const m=p.locator('[data-who-more]').first();if(await m.count()){await m.scrollIntoViewIfNeeded();await m.click();await p.waitForTimeout(500);r2=await read();}
console.log(vp[0],JSON.stringify(r1),'| after +more:',JSON.stringify(r2));await ctx.close();}
await b.close();})();
