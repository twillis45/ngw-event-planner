// Markdown summary of one run, and a diff between two runs.
//   node livecheck/summary.cjs livecheck/<prev>/results.json livecheck/<cur>/results.json
const fs = require('fs');

const flat = (r) => {
  const m = new Map();
  for (const v of r.viewports) for (const s of v.steps) m.set(`${v.id} | ${s.name}`, s);
  return m;
};
const fl = (s) => s.floors && !s.floors.error ? s.floors : null;

function summary(r) {
  const L = [];
  const all = r.viewports.flatMap((v) => v.steps.map((s) => ({ v: v.id, s })));
  const fails = all.filter((x) => !x.s.ok);
  L.push(`# Live check — ${r.meta.sha}`, '', `- Version line: ${r.meta.version || '(not read)'}`, `- Site: ${r.meta.site} (HTTP ${r.meta.siteStatus})`,
    `- Clock: board ${r.meta.clock.now}, Day ${r.meta.clock.day}, After ${r.meta.clock.after} (${r.meta.clock.tz})`,
    `- Steps: ${all.length - fails.length}/${all.length} pass · weather geocode: ${r.meta.weather.ok ? 'pass' : 'FAIL'} (${r.meta.weather.status} → ${r.meta.weather.state})`,
    `- Run time: ${r.meta.seconds}s`, '');
  if (fails.length) { L.push('## Failures', ''); for (const x of fails) L.push(`- **${x.v} · ${x.s.name}** — ${x.s.error}`); L.push(''); }
  L.push('## Floors per step (sideways px / text <11px / targets <44px / console errors)', '');
  L.push('| step | ' + r.viewports.map((v) => v.id).join(' | ') + ' |', '|---|' + r.viewports.map(() => '---').join('|') + '|');
  const names = [...new Set(all.map((x) => x.s.name))];
  for (const n of names) {
    L.push(`| ${n} | ` + r.viewports.map((v) => { const s = v.steps.find((x) => x.name === n); if (!s) return '—'; const f = fl(s);
      return `${s.ok ? '' : '❌ '}${f ? `${f.sideways + f.appSideways}/${f.smallText}/${f.smallTargets}` : 'n/a'}/${s.console.length}`; }).join(' | ') + ' |');
  }
  L.push('', '## Key texts (first viewport where present)', '');
  for (const n of names) {
    const per = r.viewports.map((v) => [v.id, v.steps.find((x) => x.name === n)]).filter(([, s]) => s && Object.keys(s.texts).length);
    if (!per.length) continue;
    L.push(`### ${n}`);
    for (const [id, s] of per) {
      const t = { ...s.texts }; delete t.names;
      L.push(`- ${id}: \`${JSON.stringify(t).slice(0, 700)}\``);
    }
    L.push('');
  }
  const cons = [...new Set(all.flatMap((x) => x.s.console))];
  L.push('## Distinct console errors', '', ...(cons.length ? cons.map((c) => '- `' + c.replace(/`/g, "'") + '`') : ['- none']), '');
  const http = [...new Set(all.flatMap((x) => x.s.http || []))];
  L.push('## HTTP errors seen (status, method, URL)', '', ...(http.length ? http.map((c) => '- ' + c) : ['- none']), '');
  L.push('_ERR_BLOCKED_BY_CLIENT console lines are this check\'s own write guard aborting POSTs (below), not app faults._', '');
  const blocked = [...new Set(all.flatMap((x) => x.s.blocked.map((b) => b.replace(/(challenge-platform\/h\/\w\/).*/, '$1…'))))];
  L.push('## Writes the guard aborted', '', ...(blocked.length ? blocked.map((c) => '- ' + c) : ['- none']), '');
  return L.join('\n');
}

const norm = (c) => c.replace(/cust-[a-z0-9]+-[a-z0-9]+/g, 'cust-…').replace(/challenge-platform\/.*/, 'challenge-platform/…').replace(/(\D)\d{5,}/g, '$1#').replace(/https?:\/\/\S+/g, (u) => u.split('?')[0]);
function diff(a, b) {
  const A = flat(a), B = flat(b);
  const regress = [], fixed = [], texts = [], floors = [], cons = [], other = [];
  for (const [k, sb] of B) {
    const sa = A.get(k);
    if (!sa) { other.push(`new step ${k}${sb.ok ? '' : ' (FAIL: ' + sb.error + ')'}`); if (!sb.ok) regress.push(`${k}: ${sb.error}`); continue; }
    if (sa.ok && !sb.ok) regress.push(`${k}: ${sb.error}`);
    if (!sa.ok && sb.ok) fixed.push(`${k} (was: ${sa.error})`);
    if (!sa.ok && !sb.ok && sa.error !== sb.error) other.push(`${k} still failing, now: ${sb.error}`);
    const fa = fl(sa), fb = fl(sb);
    if (fa && fb) {
      for (const [key, lab] of [['sideways', 'sideways px'], ['appSideways', 'app sideways px'], ['smallText', 'text <11px'], ['smallTargets', 'targets <44px']]) {
        if (fb[key] > fa[key]) floors.push(`${k}: ${lab} ${fa[key]} → ${fb[key]}${key === 'smallText' ? ' e.g. ' + (fb.smallTextSamples[0] || '') : key === 'smallTargets' ? ' e.g. ' + (fb.smallTargetSamples[0] || '') : ''}`);
        else if (fb[key] < fa[key]) other.push(`${k}: ${lab} improved ${fa[key]} → ${fb[key]}`);
      }
    }
    const ha = new Set((sa.http || []).map(norm));
    for (const c of new Set((sb.http || []).map(norm))) if (!ha.has(c)) cons.push(`${k}: HTTP ${c}`);
    const ca = new Set(sa.console.map(norm));
    for (const c of new Set(sb.console.map(norm))) if (!ca.has(c)) cons.push(`${k}: ${c}`);
    const ta = sa.texts, tb = sb.texts;
    for (const key of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
      const x = JSON.stringify(ta[key]), y = JSON.stringify(tb[key]);
      if (x !== y) texts.push(`${k} · ${key}: ${String(x).slice(0, 220)} → ${String(y).slice(0, 220)}`);
    }
  }
  for (const k of A.keys()) if (!B.has(k)) other.push(`step gone: ${k}`);
  if (a.meta.weather.ok && !b.meta.weather.ok) regress.push(`weather geocode: ${b.meta.weather.status} → ${b.meta.weather.state || b.meta.weather.error}`);
  const L = [`# Diff ${a.meta.sha} → ${b.meta.sha}`, ''];
  const sec = (h, xs) => { L.push(`## ${h} (${xs.length})`, '', ...(xs.length ? xs.map((x) => '- ' + x) : ['- none']), ''); };
  sec('New failures', regress); sec('Floors that regressed', floors); sec('New console errors', cons);
  sec('Changed texts / counts', texts); sec('Fixed', fixed); sec('Other', other);
  return { md: L.join('\n'), counts: { regress: regress.length, floors: floors.length, cons: cons.length, texts: texts.length, fixed: fixed.length } };
}

module.exports = { summary, diff };
if (require.main === module) {
  const [p, c] = process.argv.slice(2);
  const d = diff(JSON.parse(fs.readFileSync(p)), JSON.parse(fs.readFileSync(c)));
  console.log(d.md);
}
