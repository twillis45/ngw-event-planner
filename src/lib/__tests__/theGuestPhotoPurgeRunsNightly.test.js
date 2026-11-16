// ─── THE GUEST PHOTO PURGE RUNS EVERY NIGHT (owner ruling 11/16/2026) ───────
//
// SQL cannot delete a Supabase Storage file, so pg_cron cannot purge guest
// photos the way it purges RSVPs (009) and guest questions (024). The privacy
// draft promises photos go 90 days after the event, and that deleting an event
// deletes its photos; both depend on backend/scripts/purge_guest_photos.py
// actually running. "Not scheduled yet" was the held server's open issue.
//
// The Blueprint is a DECLARATION (render.yaml's own header): the owner still
// approves the new cron service in Render. This pins that the declaration is
// there, runs the right script daily, and is given the three variables the
// script needs, read from the API service rather than typed in twice.
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.join(__dirname, '..', '..', '..');
const blueprint = yaml.load(fs.readFileSync(path.join(ROOT, 'render.yaml'), 'utf8'));
const SCRIPT = path.join(ROOT, 'backend', 'scripts', 'purge_guest_photos.py');

const cron = (blueprint.services || []).find(
  (s) => s && s.type === 'cron' && /scripts\/purge_guest_photos\.py/.test(String(s.startCommand || '')));

test('a cron service runs the guest photo purge from the backend folder', () => {
  expect(cron).toBeTruthy();
  expect(cron.rootDir).toBe('backend');
  expect(cron.runtime).toBe('python');
  expect(cron.buildCommand).toMatch(/pip install -r requirements\.txt/);
  expect(cron.startCommand).toBe('python scripts/purge_guest_photos.py');
  expect(fs.existsSync(SCRIPT)).toBe(true);
});

test('it runs once a day', () => {
  const fields = String(cron.schedule || '').trim().split(/\s+/);
  expect(fields).toHaveLength(5);
  const [min, hour, dom, mon, dow] = fields;
  expect(min).toMatch(/^\d{1,2}$/);
  expect(hour).toMatch(/^\d{1,2}$/);
  expect([dom, mon, dow]).toEqual(['*', '*', '*']);
});

test('it gets the database and the storage key from the API service, not a second copy', () => {
  const vars = Object.fromEntries((cron.envVars || []).map((v) => [v.key, v]));
  for (const key of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    expect(vars[key]).toBeTruthy();
    expect(vars[key].fromService).toEqual({ type: 'web', name: 'ngw-events-api', envVarKey: key });
  }
  // Same pinned Python as the API service: the script imports the app.
  const web = blueprint.services.find((s) => s.type === 'web' && s.name === 'ngw-events-api');
  const py = (svc) => ((svc.envVars || []).find((v) => v.key === 'PYTHON_VERSION') || {}).value;
  expect(py(cron)).toBe(py(web));
});

test('the script no longer says it is unscheduled', () => {
  expect(fs.readFileSync(SCRIPT, 'utf8')).not.toMatch(/NOT SCHEDULED YET/);
});
