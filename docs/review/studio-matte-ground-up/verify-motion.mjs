import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const base=new URL('./',import.meta.url),results=[];
function check(name,pass){results.push({name,pass});if(!pass)throw Error(name)}
try{for(const theme of ['dark','light'])for(const width of [390,768]){
 const page=await browser.newPage({viewport:{width,height:1024},reducedMotion:'no-preference'});
 await page.goto(new URL(`events-${theme}.html#guests`,base).href);
 const prefix=`${theme} ${width}`;
 await page.getByRole('button',{name:'Try demo · v3'}).click();
 await page.locator('[data-action=demo-peek]').click();
 check(prefix+' quick look from guest screen',await page.locator('dialog.peek').isVisible()&&await page.evaluate(()=>location.hash==='#guests'));
 await page.keyboard.press('Escape');
 await page.locator('[data-action=review]').click();await page.locator('[data-action=demo-choices]').click();await page.locator('#decision-card').waitFor();
 const heading=page.locator('#decision-card h2'),box=await heading.boundingBox();
 await page.mouse.move(box.x+box.width-15,box.y+10);await page.mouse.down();await page.mouse.move(box.x+15,box.y+10,{steps:6});
 check(prefix+' card visibly follows drag',await page.locator('#decision-card').evaluate(el=>el.classList.contains('dragging')&&el.style.transform.includes('translateX')));
 await page.mouse.up();
 check(prefix+' swipe changes card',await heading.innerText()==='A buffet with room to talk');
 await page.getByRole('button',{name:'Shortlist',exact:true}).click();
 check(prefix+' selection animation active',await page.locator('#choice-status').evaluate(el=>el.getAnimations().length>0));
 await page.getByRole('button',{name:'Undo last choice'}).click();
 check(prefix+' selection undo visible',await page.locator('#choice-status').innerText()==='Not reviewed');
 await page.locator('[data-action=review]').click();await page.locator('[data-action=demo-completion]').click();
 await page.getByRole('button',{name:'Record confirmation',exact:true}).click();await page.locator('[name=reason]').fill('Sample agreement reviewed.');await page.locator('[name=verified]').check();
 await page.getByRole('button',{name:'Record sample confirmation',exact:true}).click();await page.locator('.receipt').waitFor();
 check(prefix+' completion animation survives navigation',await page.locator('.hero').evaluate(el=>el.getAnimations().length>0));
 await page.waitForTimeout(400);
 await page.screenshot({path:new URL(`screens/${theme}-${width}-completion-v3.png`,base).pathname});
 await page.locator('[data-action=review]').click();await page.locator('[data-action=demo-draft]').click();
 check(prefix+' draft example opens',await page.locator('[name=draft]').isVisible());await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action=review]').click();await page.locator('[data-action=demo-peek]').click();
 check(prefix+' reduced motion has no animation',await page.evaluate(()=>document.getAnimations().length===0));
 await page.keyboard.press('Escape');await page.locator('[data-action=review]').click();
 await page.screenshot({path:new URL(`screens/${theme}-${width}-demo-v3.png`,base).pathname});
 await page.close();
}}finally{await browser.close();writeFileSync(new URL('motion-verification.json',base),JSON.stringify({scope:'Chromium mouse input and viewport emulation; no physical touchscreen validation',results},null,2));console.log(`${results.filter(x=>x.pass).length}/${results.length} interaction checks passed`)}
