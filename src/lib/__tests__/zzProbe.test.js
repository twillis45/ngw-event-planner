import { eventPlan } from '../../CommandCenter';
import { deriveEventPhaseProgress, nextPlanAttentionDate } from '../phaseProgress';
import { playbookChecklist, playbookDecisionBoard } from '../playbooks';
import { taskDueInDays, taskIsOverdue } from '../taskLead';
const wedding = { id:'aud-wedding', name:'Maya & Jordan’s Wedding', type:'Wedding', date:'2027-10-16', startTime:'16:00', startTimeSource:'host',
   venue:'Bluemont Vineyard', venueCity:'Bluemont, VA', state:'VA', guestMode:'count', guestCount:150, guestEstimate:150, totalBudget:45000,
   budget:[], guests:[], createdAt:'2026-12-20T15:00:00.000Z',
   vendors:[
     { id:'aud-w-v1', name:'Bluemont Vineyard', category:'Venue', budgetCategory:'Venue', status:'Confirmed', cost:12000, depositAmt:4000, depositPaid:true, balancePaid:false, payDueDate:'2027-09-16', contractSigned:true },
     { id:'aud-w-v2', name:'Harvest Table Catering', category:'Catering', budgetCategory:'Catering', status:'Quoted', cost:14000, depositPaid:false, contractSigned:false },
     { id:'aud-w-v3', name:'Lens & Light Photo', category:'Photography', budgetCategory:'Photography', status:'Booked', cost:4200, depositAmt:1000, depositPaid:true, balancePaid:false, payDueDate:'2027-10-02', contractSigned:true },
   ] };
const birthday = { id:'aud-bday', name:'Dana’s 40th Potluck', type:'Birthday', milestoneBirthday:40, honoree:'Dana', date:'2027-06-12', startTime:'15:00', startTimeSource:'host',
   venue:'Our backyard', venueCity:'Silver Spring, MD', state:'MD', venueKind:'home', guestMode:'count', guestCount:30, guestEstimate:30, totalBudget:600,
   foodChoices:{ food_style:'Potluck' }, budget:[], vendors:[], guests:[], createdAt:'2026-08-16T14:00:00.000Z' };
const at = (date, d) => { const x = new Date(date + 'T08:00:00'); x.setDate(x.getDate() + d); return x; };
test('probe', () => {
  jest.useFakeTimers();
  for (const ev of [wedding, birthday]) for (const d of [-300, -180, -90, -14, -7, -3, -1]) {
    const now = at(ev.date, d); jest.setSystemTime(now);
    const plan = eventPlan(ev);
    const pc = deriveEventPhaseProgress(ev, now);
    const hz = nextPlanAttentionDate(plan, pc.nextLedgerChange, now);
    const rows = playbookChecklist(ev, now) || [];
    const open = rows.map(r => ({ r, due: taskDueInDays(r, ev, now) })).filter(x => x.due != null && !x.r.done).sort((a,b)=>a.due-b.due);
    const firstFuture = open.find(x => x.due >= 0);
    const b = playbookDecisionBoard(ev, now);
    const late = (b.open||[]).filter(r => r.status === 'overdue').map(r => r.id);
    console.log(ev.type, d, '| ledger', pc.completedCount+'/'+pc.totalCount, (pc.items||[]).map(i=>i.id+(i.handled?'+':'-')).join(','), '| hz', hz && hz.date, hz && hz.id, '| firstStep', firstFuture && firstFuture.due, firstFuture && firstFuture.r.task.slice(0,40), '| overdueSteps', open.filter(x=>taskIsOverdue(x.r, ev, now)).length, '| lateCalls', late.join(','), '| hero', (plan.nextActions||[])[0] && (plan.nextActions||[])[0].title);
  }
  jest.useRealTimers();
});
