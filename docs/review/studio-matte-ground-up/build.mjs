import {readFileSync,writeFileSync} from 'node:fs';
import {carbonNeutral,dark,light} from './palette.snapshot.mjs';
const base=new URL('./',import.meta.url);
const template=readFileSync(new URL('concept.template.html',base),'utf8')
 .replace('</style>',readFileSync(new URL('experience.css',base),'utf8')+'\n</style>')
 .replace('</script>',readFileSync(new URL('interaction.js',base),'utf8')+'\n'+readFileSync(new URL('experience.js',base),'utf8')+'\n</script>');
for(const mode of ['dark','light']){
 const c=mode==='dark'?carbonNeutral.mid:carbonNeutral.light,b=mode==='dark'?dark:light;
 const tokens=`:root{color-scheme:${mode};--bg:${c.bg};--panel:${c.panel};--wash:${c.surface2};--line:${c.border};--ink:${b.textPrimary};--muted:${b.textMuted};--steel:${b.steelBlueGradientTop};--steeltext:${mode==='dark'?'#B1C4CE':b.steelBlueDark};--warn:${b.amber};--ok:${b.successGreen};--danger:${b.dangerRed};--onsteel:#FFFFFF}`;
 writeFileSync(new URL(`events-${mode}.html`,base),template.replace('__TOKENS__',tokens).replaceAll('__THEME__',mode).replaceAll('__OTHER__',mode==='dark'?'light':'dark'));
}
console.log('Built both self-contained event concepts.');
