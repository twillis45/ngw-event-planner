// Capture 390px host screens for the marketing-video shot list (2026-08-10)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3000/ngw-event-planner/';
const OUT = __dirname + '/../review-artifacts/2026-08-10-marketing-video';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const c=(p,t)=>p.evaluate(t=>{const e=[...document.querySelectorAll('button,a,[role=button],[role=tab],div,span,li')].find(b=>(b.innerText||'').trim()===t)||[...document.querySelectorAll('button,a,[role=button],[role=tab],div,span,li')].find(b=>(b.innerText||'').trim().includes(t));if(!e)return false;let n=e;for(let i=0;i<6&&n;i++){const cs=getComputedStyle(n);if(n.tagName==='BUTTON'||n.tagName==='A'||n.onclick||cs.cursor==='pointer'){n.scrollIntoView({block:'center'});n.click();return true;}n=n.parentElement;}e.click();return true;},t);
const shot=async(p,name)=>{await sleep(400);await p.screenshot({path:`${OUT}/${name}.png`});console.log('shot',name);};
const scrollTo=(p,t)=>p.evaluate(t=>{const e=[...document.querySelectorAll('div,span,h1,h2,h3,button')].find(b=>(b.innerText||'').trim().includes(t));if(e){e.scrollIntoView({block:'center'});return true}return false;},t);
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:35000});
  await p.waitForFunction(()=>document.body.innerText.replace(/\s/g,'').length>150,{timeout:35000}); await sleep(2500);
  await shot(p,'01-home-hero');
  await scrollTo(p,"I’ve made a head start")||await scrollTo(p,"head start"); await shot(p,'02-home-headstart');
  await scrollTo(p,'NEXT UP'); await shot(p,'03-home-nextup');
  await p.evaluate(()=>window.scrollTo(0,0)); await sleep(300);
  await c(p,'Open event'); await sleep(2200); await shot(p,'04-event-overview');
  await scrollTo(p,'DECISIONS'); await shot(p,'05-overview-decisions');
  for(const tab of ['Budget','Guests','Decisions','Planning','Calendar']){
    const ok=await c(p,tab); await sleep(1800);
    if(ok) await shot(p,`06-tab-${tab.toLowerCase()}`); else console.log('MISS tab',tab);
  }
  // shopping list from home
  await p.goto(BASE,{waitUntil:'domcontentloaded'}); await sleep(2200);
  await c(p,'Open & share'); await sleep(1800); await shot(p,'07-shopping-list');
  await p.goto(BASE,{waitUntil:'domcontentloaded'}); await sleep(2200);
  await c(p,'Your invite'); await sleep(1800); await shot(p,'08-invite-host-view');
  // guest-facing identity invite
  await p.goto('http://localhost:3000/?rsvp=juneteenth',{waitUntil:'domcontentloaded'}); await sleep(3000);
  await shot(p,'09-invite-guest-cover');
  await scrollTo(p,'RSVP')||await p.evaluate(()=>window.scrollBy(0,700)); await shot(p,'10-invite-guest-rsvp');
  await b.close(); console.log('DONE ->',OUT);
})().catch(e=>{console.error(e);process.exit(1)});
