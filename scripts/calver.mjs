#!/usr/bin/env node
// ─── CALENDAR VERSIONS FOR MAIN MERGES (owner, 11/22/2026) ───────────────────
//
// Every merge to main that the Pages deploy publishes is tagged
// vYYYY.MM.DD.N — the owner's calendar day (America/New_York) and that day's
// count + 1. The deploy computes the name BEFORE the build so hostv2 can bake
// it beside the commit ("Version 2026.11.22.3 (abc1234)"), and pushes the tag
// only after the site is live (pages-from-source.yml, job `tag`).
//
// N is the highest number already used that day + 1. With no gaps that is
// "count + 1"; if a tag was ever deleted it still never hands out a name twice.
// A commit that already carries a calendar tag (a re-run, or a rollback
// dispatch) keeps it instead of getting a second one.
//
//   node scripts/calver.mjs version          → prints e.g. 2026.11.22.3 (and
//                                               tag=… version=… is_new=… lines
//                                               with --github-output)
//   node scripts/calver.mjs check-whats-new  → warns when hostv2/src/whatsNew.json's
//                                               newest entry is older than the
//                                               last release tag's day
//
// Pinned by hostv2/test/releaseVersion.test.mjs and whatsNewIsCurrent.test.mjs.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TZ = 'America/New_York';
const TAG_RE = /^v(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d+)$/;

export function calverDay(now = new Date(), timeZone = TZ) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}.${parts.month}.${parts.day}`;
}

const parse = (tag) => {
  const m = TAG_RE.exec(String(tag || '').trim());
  if (!m) return null;
  const day = `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}`;
  return { day, n: Number(m[4]) };
};

export function nextCalverTag(existingTags = [], now = new Date(), timeZone = TZ) {
  const day = calverDay(now, timeZone);
  const used = existingTags.map(parse).filter((t) => t && t.day === day).map((t) => t.n);
  return `v${day}.${(used.length ? Math.max(...used) : 0) + 1}`;
}

export function releaseVersionFor({ tagsAtHead = [], allTags = [], now = new Date(), timeZone = TZ } = {}) {
  const mine = tagsAtHead.filter((t) => parse(t)).sort((a, b) => {
    const pa = parse(a); const pb = parse(b);
    return pa.day === pb.day ? pb.n - pa.n : (pa.day < pb.day ? 1 : -1);
  });
  const tag = mine[0] || nextCalverTag(allTags, now, timeZone);
  return { tag, version: tag.slice(1), isNew: !mine.length };
}

export function latestCalverDate(tags = []) {
  const days = tags.map(parse).filter(Boolean).map((t) => t.day).sort();
  return days.length ? days[days.length - 1].replaceAll('.', '-') : null;
}

// The What's new guard, PER RELEASE (owner, 11/24/2026). The newest entry
// names the last release it covers (`through`, a calver tag); any later
// release tag means a release went out that What's new never described.
// A newest entry without `through` is behind: a same-day date used to pass
// while eight releases shipped under one entry. No tags (a shallow checkout)
// → nothing to compare against.
const order = (t) => (t ? `${t.day}.${String(t.n).padStart(4, '0')}` : '');
export function whatsNewIsBehind(entries, tags) {
  const last = (tags || []).map(parse).filter(Boolean).map(order).sort().pop();
  if (!last) return false;
  // The list is newest first (whatsNewIsCurrent pins that); among same-day
  // entries the first one is the newest, and it is the one that says `through`.
  const list = entries || [];
  const top = list.map((e) => e.date).sort().pop();
  const newest = list.find((e) => e.date === top);
  if (!newest || !newest.through) return true;
  const covered = parse(newest.through);
  return !covered || order(covered) < last;
}

const git = (...args) => {
  try { return execFileSync('git', args, { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean); } catch { return []; }
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'version') {
    const r = releaseVersionFor({ tagsAtHead: git('tag', '--points-at', 'HEAD', '-l', 'v*'), allTags: git('tag', '-l', 'v*') });
    if (process.argv.includes('--github-output') && process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${r.tag}\nversion=${r.version}\nis_new=${r.isNew}\n`);
    }
    console.log(r.version);
  } else if (cmd === 'check-whats-new') {
    const file = process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'hostv2', 'src', 'whatsNew.json');
    const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    const tags = git('tag', '-l', 'v*');
    const covers = (entries.find((e) => e.through) || {}).through || '(no `through`)';
    const lastTag = tags.filter((t) => /^v\d{4}\./.test(t)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).pop() || null;
    if (whatsNewIsBehind(entries, tags)) {
      console.log(`::warning::What's new is behind: the newest entry covers ${covers}, the last release is ${lastTag}. Add an entry for what shipped to hostv2/src/whatsNew.json and set its \`through\`.`);
    } else {
      console.log(`What's new is current: covers ${covers}, last release ${lastTag || '(no tags fetched)'}.`);
    }
  } else {
    console.error('usage: calver.mjs version [--github-output] | check-whats-new [file]');
    process.exit(2);
  }
}
