const p=require('puppeteer-core');const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';const BASE='http://localhost:3000/ngw-event-planner/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await p.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});const pg=await b.newPage();const errs=[];pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});pg.on('pageerror',e=>errs.push('PAGEERROR: '+(e.message||'').slice(0,300)));
await pg.goto(BASE,{waitUntil:'domcontentloaded',timeout:35000});await sleep(4000);
const len=await pg.evaluate(()=>document.body.innerText.replace(/\s/g,'').length);
console.log('body text length:',len);
console.log('ERRORS:\n'+errs.slice(0,6).join('\n'));
await b.close();})();
