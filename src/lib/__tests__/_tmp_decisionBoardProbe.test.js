import { playbookDecisionBoard } from '../playbooks';
import fs from 'fs';
function localISO(n){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const W=7; const out=[];
function dump(name,ev){
  try{
    const b=playbookDecisionBoard(ev); const open=b.open||[];
    const line=open.map(r=>`${r.label} [${r.status}${r.daysOut!=null?', d='+r.daysOut:''}]`);
    const overdue=open.filter(r=>r.status==='overdue').length;
    const approaching=open.filter(r=>r.status!=='overdue'&&r.daysOut!=null&&r.daysOut>=0&&r.daysOut<=W).length;
    const needsYou=open.filter(r=>r.status==='overdue'||(r.daysOut!=null&&r.daysOut>=0&&r.daysOut<=W)).length;
    out.push({name, allOpen:open.length, overdueOnly:overdue, approaching, needsYou, decisions:line});
  }catch(e){ out.push({name, error:String(e&&e.message)}); }
}
test('probe',()=>{
  dump('CRAB · 21d',{id:'c',type:'Crab Feast',date:localISO(21),guestCount:18,venue:'Backyard',foodChoices:{}});
  dump('DINNER · 1d',{id:'d',type:'Dinner Party',date:localISO(1),guestCount:8,venue:'Ironwood',foodChoices:{}});
  dump('BIRTHDAY · 10d',{id:'b',type:'Birthday',date:localISO(10),guestCount:20,foodChoices:{}});
  fs.writeFileSync('/private/tmp/claude-501/-Users-toddwillis-Code-ngw-event-planner/709cc455-eb40-4608-8e55-e367e7f3172a/scratchpad/_board_probe.json', JSON.stringify(out,null,2));
  expect(true).toBe(true);
});
