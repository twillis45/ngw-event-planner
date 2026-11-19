// ─── THE WEEK-BEFORE REMINDER RUNS EVERY DAY (plan G87, owner 11/19/2026) ───
//
// backend/scripts/send_host_reminders.py emails each host whose event is 7
// days away. It matches the date exactly, so a day it does not run is a day of
// hosts who never get one. The Blueprint is a DECLARATION (render.yaml's own
// header): the owner still approves the new cron service in Render. This pins
// that the declaration is there, runs the right script daily, and reads its
// secrets from the API service rather than a second copy.
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.join(__dirname, '..', '..', '..');
const blueprint = yaml.load(fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8'));
const SCRIPT = path.join(ROOT, 'backend', 'scripts', 'send_host_reminders.py');

const cron = (blueprint.services || []).find(
  (s) => s && s.type === 'cron' && /scripts\/send_host_reminders\.py/.test(String(s.startCommand || '')));

test('a cron service runs the host reminders from the backend folder', () => {
  expect(cron).toBeTruthy();
  expect(cron.rootDir).toBe('backend');
  expect(cron.runtime).toBe('python');
  expect(cron.buildCommand).toMatch(/pip install -r requirements\.txt/);
  expect(cron.startCommand).toBe('python scripts/send_host_reminders.py');
  expect(fs.existsSync(SCRIPT)).toBe(true);
});

test('it runs once a day', () => {
  const [min, hour, dom, mon, dow, ...rest] = String(cron.schedule || '').trim().split(/\s+/);
  expect(rest).toEqual([]);
  expect(min).toMatch(/^\d{1,2}$/);
  expect(hour).toMatch(/^\d{1,2}$/);
  expect([dom, mon, dow]).toEqual(['*', '*', '*']);
});

test('the database and the email settings come from the API service', () => {
  const vars = Object.fromEntries((cron.envVars || []).map((v) => [v.key, v]));
  for (const key of ['DATABASE_URL', 'RESEND_API_KEY', 'COMMUNICATION_EMAIL_FROM', 'RESEND_FROM_NAME']) {
    expect(vars[key]).toBeTruthy();
    expect(vars[key].fromService).toEqual({ type: 'web', name: 'ngw-events-api', envVarKey: key });
  }
  const web = blueprint.services.find((s) => s.type === 'web' && s.name === 'ngw-events-api');
  const val = (svc, k) => ((svc.envVars || []).find((v) => v.key === k) || {}).value;
  expect(val(cron, 'PYTHON_VERSION')).toBe(val(web, 'PYTHON_VERSION'));
  expect(val(cron, 'APP_BASE_URL')).toBe(val(web, 'APP_BASE_URL'));   // "Open your plan" goes to the same app
});
