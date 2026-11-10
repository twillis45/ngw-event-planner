import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--no-zygote']});
const base=new URL('./',import.meta.url),page=await browser.newPage({viewport:{width:1560,height:1120}});
try{for(const theme of ['dark','light']){
 const cards=[['Phone',390,844,'phone'],['Tablet portrait',768,1024,'tablet-portrait'],['Tablet landscape',1024,768,'tablet-landscape']].map(([label,w,h,key])=>`<section><h2>${label}<small>${w} × ${h}</small></h2><img src="data:image/png;base64,${readFileSync(new URL(`screens/${theme}-${key}-overview.png`,base)).toString('base64')}"></section>`).join('');
 await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:${theme==='dark'?'#25262A':'#EDEEF1'};color:${theme==='dark'?'#eef0f4':'#0d0f12'};font:16px system-ui}h1{font-weight:500;font-size:28px;margin:0 0 8px}p{font-size:13px;opacity:.7;margin:0 0 32px}.grid{display:grid;grid-template-columns:300px 520px 1fr;gap:24px}h2{font-size:14px;font-weight:500;margin:0 0 16px}small{margin-left:8px;font-size:10px;opacity:.7}img{width:100%;border:1px solid #80808050;border-radius:12px}</style><h1>No Guesswork Events · Studio Matte / ${theme==='dark'?'Carbon':'Light'}</h1><p>Host shell · Ground-up concept · Actual responsive viewport captures · Fictional sample data</p><div class="grid">${cards}</div></html>`);
 await page.screenshot({path:new URL(`events-${theme}-devices.png`,base).pathname,fullPage:true});
}
}finally{await browser.close()}
