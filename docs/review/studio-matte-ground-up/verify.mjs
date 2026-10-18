import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--no-zygote']});
const base=new URL('./',import.meta.url),out=new URL('screens/',base);mkdirSync(out,{recursive:true});
const sizes=[['phone',390,844],['phone-large',430,932],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['laptop',1280,654],['desktop',1440,900],['wide',1920,1080]];
const checks=[],errors=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+' '+JSON.stringify(detail))};
try{for(const theme of ['dark','light']){
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(`events-${theme}.html`,base).href;
 for(const [device,width,height] of sizes){
  await page.setViewportSize({width,height});
  for(const route of ['overview','plan','venue','food','ceremony','guests','budget','day','messages','decisions']){
   await page.goto(url+'#'+route);await page.waitForTimeout(50);
   const m=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('main h1').length}));
   check(`${theme} ${device} ${route} no overflow`,m.scroll<=width,m);check(`${theme} ${device} ${route} heading`,m.h1===1);
   if(route==='overview'){const b=await page.locator('.hero .primary').boundingBox();check(`${theme} ${device} primary above navigation`,b.y+b.height<=height-(width<600?64:0),b)}
   if(['overview','decisions','venue'].includes(route))await page.screenshot({path:new URL(`${theme}-${device}-${route}.png`,out).pathname});
  }
  await page.goto(url+'#venue');await page.getByRole('button',{name:'Record confirmation',exact:true}).click();
  const box=await page.locator('dialog').boundingBox();check(`${theme} ${device} modal fits`,box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1,box);
  await page.keyboard.press('Escape');check(`${theme} ${device} Escape closes`,!(await page.locator('dialog').evaluate(d=>d.open)));
 }
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#overview');await page.locator('.hero [data-action=venue]').click();
 await page.locator('#venue-agreement').waitFor();check(`${theme} hero lands on concrete venue agreement`,await page.locator('#venue-agreement').count()===1);
 await page.getByRole('button',{name:'Record confirmation',exact:true}).click();await page.locator('[name=reason]').fill('Step-free entry and room for our family.');await page.locator('[name=verified]').check();await page.getByRole('button',{name:'Record sample confirmation',exact:true}).click();
 check(`${theme} venue state recorded`,(await page.locator('#venue-agreement').innerText()).includes('Confirmed in preview'));
 await page.goto(url+'#overview');await page.reload(); // hash navigation alone is not a reload
 check(`${theme} reload clears local state`,(await page.locator('.hero').innerText()).includes('Secure the place'));
 await page.locator('.hero [data-action=venue]').click();await page.getByRole('button',{name:'Record confirmation',exact:true}).click();await page.locator('[name=reason]').fill('Accessible venue for the sample gathering.');await page.locator('[name=verified]').check();await page.getByRole('button',{name:'Record sample confirmation',exact:true}).click();
 await page.evaluate(()=>location.hash='overview');await page.waitForTimeout(50);check(`${theme} decision changes downstream priority`,(await page.locator('.hero h2').innerText()).includes('dinner'));
 await page.evaluate(()=>location.hash='food');await page.waitForTimeout(50);check(`${theme} food prerequisite updated`,(await page.locator('main').innerText()).includes('Ready to review'));
 await page.evaluate(()=>location.hash='decisions');await page.waitForTimeout(50);await page.getByRole('button',{name:'Shortlist',exact:true}).click();check(`${theme} shortlist state`,(await page.locator('#choice-status').innerText())==='Shortlisted');await page.getByRole('button',{name:'Undo last choice'}).click();check(`${theme} undo restores`,(await page.locator('#choice-status').innerText())==='Not reviewed');
 await page.getByRole('button',{name:'Next →',exact:true}).click();check(`${theme} button browses`,(await page.locator('#decision-card h2').innerText()).includes('buffet'));await page.locator('#decision-card').focus();await page.keyboard.press('ArrowLeft');check(`${theme} keyboard browses`,await page.locator('#decision-card h2').innerText()==='Community hall');
 const card=await page.locator('#decision-card h2').boundingBox();await page.mouse.move(card.x+card.width-10,card.y+12);await page.mouse.down();await page.mouse.move(card.x+10,card.y+12,{steps:8});await page.mouse.up();check(`${theme} pointer swipe browses`,(await page.locator('#decision-card h2').innerText()).includes('buffet'));check(`${theme} swipe never accepts`,await page.locator('#choice-status').innerText()==='Not reviewed');
 await page.evaluate(()=>location.hash='venue');await page.waitForTimeout(50);await page.getByRole('button',{name:'Prepare this for me'}).click();await page.locator('[name=draft]').fill('Please confirm access and catering rules.');await page.getByRole('button',{name:'Keep draft in this preview'}).click();await page.getByRole('button',{name:'Prepare this for me'}).click();check(`${theme} DIFM edited draft retained`,await page.locator('[name=draft]').inputValue()==='Please confirm access and catering rules.');await page.keyboard.press('Escape');
 await page.keyboard.press('Control+k');await page.locator('#search').fill('guest');await page.locator('#results button').click();await page.waitForTimeout(50);check(`${theme} search deep link`,await page.evaluate(()=>location.hash==='#guests'));await page.locator('#guestsearch').fill('Casey');check(`${theme} guest filter`,await page.locator('.guestrow').count()===1);await page.locator('#guestsearch').fill('zzzzz');check(`${theme} no results recovery`,(await page.locator('#guestrows').innerText()).includes('No matching'));
 await page.evaluate(()=>location.hash='messages');await page.waitForTimeout(50);await page.locator('[name=message]').fill('Sample draft only');await page.getByRole('button',{name:'Save draft',exact:true}).click();check(`${theme} unsent draft labeled`,(await page.locator('.channel').innerText()).includes('Your draft · Not sent'));
 await page.locator('[data-action=review]').click();await page.getByRole('button',{name:'First event / empty state'}).click();check(`${theme} empty state`,(await page.locator('main h1').innerText()).includes('occasion'));await page.locator('[data-action=new]').click();await page.getByRole('button',{name:'Load sample event'}).click();check(`${theme} first-run sample recovers`,await page.locator('main h1').count()===1);
 await page.locator('[data-action=review]').click();await page.getByRole('button',{name:'Simulated connection failure'}).click();check(`${theme} failure explicit`,(await page.locator('main').innerText()).includes('simulated'));await page.getByRole('button',{name:'Try again'}).click();check(`${theme} retry recovers`,!(await page.locator('main').innerText()).includes('couldn’t be loaded'));
 await page.close();
}
check('No script errors',errors.length===0,errors);
}finally{
 const hashes=Object.fromEntries(['concept.template.html','interaction.js','palette.snapshot.mjs'].map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,base))).digest('hex')]));
 writeFileSync(new URL('verification.json',base),JSON.stringify({scope:'Standalone concepts; Chromium viewport simulation. No production runtime, backend, device or live AI verification.',sizes,hashes,checks,errors},null,2));await browser.close();console.log(`${checks.filter(x=>x.pass).length}/${checks.length} checks passed`);
}
