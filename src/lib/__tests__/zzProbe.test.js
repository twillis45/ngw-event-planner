import { playbookRunOfShow } from '../playbooks';
test('p', () => { const r = playbookRunOfShow({ id: 'c', type: 'Crab Feast', date: '2027-07-24', startTime: '14:00', foodChoices: { steam_vs_order: 'Steam them myself' } }); console.log(JSON.stringify(r).slice(0, 1500)); });
