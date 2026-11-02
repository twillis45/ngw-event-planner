#!/usr/bin/env python3
"""One-shot Step 6e retrofit of docs/artifact/the-first-recorded-gate.html.

Run once (2026-11-02) against the committed page; kept in the repo so the
transform that produced the current page is inspectable rather than implied.
Re-running it on an already-retrofitted page is refused (the marker check).

What it does, all from ngw-os/docs/path-to-production.md as of a56412a
(2026-10-17) and the Command Center gate cache (skill-index 4d2853b):

1. Four states, not two (path-artifact rule 5, Step 6e): every recorded
   static check mark becomes a checkbox that is CHECKED and DISABLED.
2. Every obligation the current spine and its tracks place on a stage that
   the page lacked is added as a row: handled (checked+disabled) where the
   repo shows it done, owed (live box) where it does not, unreached
   (disabled) where the stage is not entered.
3. A per-stage ratio, filled by the page's own script.
4. A Surfaces panel (Axis 1: facing + platform per surface, reach vs facing).
5. Corrections: the gate record carries no ruledBy for stages 1-5 and 8, and
   the page was built from an older spine.
"""
import re, sys, pathlib

P = pathlib.Path(__file__).resolve().parent.parent / 'docs/artifact/the-first-recorded-gate.html'
s = P.read_text(encoding='utf-8')
MARK = 'data-retrofit="2026-11-02"'
if MARK in s:
    sys.exit('already retrofitted — refusing to run twice')

H = lambda t: f'<li><input type="checkbox" checked disabled aria-label="handled"> {t}</li>'
O = lambda k, t: f'<li><input type="checkbox" data-k="{k}"> {t}</li>'
U = lambda t: f'<li><input type="checkbox" disabled aria-label="unreached"> {t}</li>'
N = lambda t: f'<li><span class="mark skip">&ndash;</span> {t}</li>'
TAG = lambda t: f'<span class="tag">{t}</span>'

# ── 1. four states ──────────────────────────────────────────────────────────
n_marks = s.count('<span class="mark ok">&check;</span>')
s = s.replace('<span class="mark ok">&check;</span>',
              '<input type="checkbox" checked disabled aria-label="handled">')

# ── 2. rows per stage, appended to that stage's list in the SPINE ladder ────
ADD = {
 1: [
  H(TAG('Step 3c') + ' <b>Third-party content precondition:</b> answered in the record &mdash; &ldquo;None &mdash; not applicable. Built from original code and the project&rsquo;s own competitive research.&rdquo;'),
  O('s1-basis', TAG('Spine 8/28') + ' <b>Declare the basis at intake</b> &mdash; wedge, execution, distribution, internal use, or portfolio &mdash; because the basis selects which gate applies. <b>Why unchecked:</b> the stage-1 record carries <code>whoHitsThisToday</code> and <code>thirdPartyContent</code> only; no basis is recorded.'),
  O('s1-killgate', TAG('Spine 8/28') + ' <b>Kill-gate board for anything meant to earn:</b> the cheapest check that would kill it, its threshold <b>pre-registered</b>, and a spend cap until it clears. <b>Why unchecked:</b> not in the stage-1 record. The $39 pass is revenue, so the gate applies; D-2&rsquo;s &ldquo;three non-founder hosts asked for money&rdquo; is the nearest thing and was never written as a pre-registered threshold.'),
  H(TAG('Required skill') + ' <code>convene-review-board</code> &mdash; the project core is convened and called for decisions (boards from 2026-08-16 onward; standing delegation recorded 2026-09-02).'),
  H(TAG('Required skill') + ' <code>path-artifact</code> &mdash; this page.'),
  O('s1-skills', TAG('Required skills') + ' <code>demand-scan</code>, <code>claim-verification</code>, <code>superpowers:brainstorming</code>, <code>dispatch-subagents</code>. <b>Why unchecked:</b> the stage-1 record has no <code>skillsUsed</code>, so nothing shows these ran; the competitive reads are supply-side (Mobbin, Triply), and demand-side research is the half the spine says gets skipped.'),
  O('s1-ruler', TAG('Correction') + ' <b>Who ruled stage 1 is not in the record.</b> See Corrections. Confirm you ruled it, or re-rule.'),
 ],
 2: [
  H(TAG('Axis 1') + ' <b>Platform declared, mobile first:</b> hostv2 is <code>web</code>, mobile-flagship, 390px-first (workspace <code>CLAUDE.md</code> surfaces table; <code>UX_03</code>).'),
  H(TAG('Axis 1, 8/28') + ' <b>The admin console declared as its own surface</b> (<code>?admin=1</code>, internal) and reviewed on its own &mdash; <code>docs/audits/2026-08-21_ADMIN_CONSOLE_INTERNAL_REVIEW.md</code>. The stage-2 record itself does not name it.'),
  H(TAG('Security track') + ' <b>Threat-model the data; auth model decided here:</b> data inventory (host email, guest dietary needs as health data, payments via hosted checkout) and the studio-membership authZ model are DONE in <code>docs/audits/2026-08-21_SECURITY_TRACK_CHECKLIST.md</code>. The inventory did not enumerate every <code>public</code> table &mdash; see the stage-5 RLS row.'),
  O('s2-leaders', TAG('Spine 9/6') + ' <b>Name the leaders&rsquo; 3&ndash;4 structural properties, dated before the first generation, and score every board against them.</b> <b>Why unchecked:</b> post-dates this record, and the People redesign (parked 2026-11-02) iterated four rounds against generated reference sheets rather than leaders &mdash; the failure this amendment was written about.'),
  O('s2-clearance', TAG('Required skill, revenue') + ' <code>clearance</code> before a name fronts a revenue line. <b>Why unchecked:</b> <code>src/lib/brand.js</code> records the domain as RDAP-checked and says in its own words that &ldquo;an available domain is not a cleared mark&rdquo; &mdash; no USPTO search or attorney review is recorded.'),
  O('s2-skills', TAG('Required skills') + ' <code>motion-design</code>, <code>pick-generation-model</code>, <code>frontend-design</code>, <code>impeccable</code>, <code>superpowers:writing-plans</code>. <b>Why unchecked:</b> the stage-2 record has no <code>skillsUsed</code>; several ran in later sessions (impeccable, motion work) but none is recorded against the gate.'),
  O('s2-ruler', TAG('Correction') + ' <b>Who ruled stage 2 is not in the record.</b> See Corrections.'),
 ],
 3: [
  H(TAG('Security track') + ' <b>Secrets in env vars, never source or history</b> &mdash; checklist DONE; secret scan DONE.'),
  H(TAG('Security track') + ' <b>Authorization checked server-side on every route</b> &mdash; the per-route sweep, <code>backend/tests/test_protected_routes_sweep.py</code>.'),
  O('s3-scoped', TAG('Security track') + ' <b>Every query scoped to its owner.</b> True for every tenant table (RLS all verbs). <b>Why unchecked:</b> six research tables from <code>012_research_execution.sql</code> were created with RLS off, so the anon key could read and write them through PostgREST. Fixed in repo by <code>018_research_tables_rls.sql</code> and gated by <code>everyPublicTableHasRls.test.js</code>; <b>not live until PR #94 merges</b>, then confirmed by RUNBOOK check A.'),
  O('s3-skills', TAG('Required skill, public') + ' <code>web-design-guidelines</code> on UI code that ships. <b>Why unchecked:</b> not recorded against the gate.'),
  O('s3-ruler', TAG('Correction') + ' <b>Who ruled stage 3 is not in the record.</b> See Corrections.'),
 ],
 4: [
  H(TAG('Re-measured 2026-11-02') + ' <b>The guard script now exists and passes.</b> The stage-4 record says &ldquo;no guard exists&rdquo;; <code>npm run verify:all</code> / <code>verify:fast</code> is that guard &mdash; ten gates, each with its own exit code, <b>10 of 10</b> on 2026-11-02. The record&rsquo;s answer is left standing; this is the measurement after it.'),
  H(TAG('Security track') + ' <b>An enumerating sweep, not a named test:</b> routes (the per-route sweep) and, since 2026-11-02, tables (<code>everyPublicTableHasRls.test.js</code>, which fails by table name on the next one).'),
  H(TAG('Spine 9/6') + ' <b>Every env var the server reads is a declared seam:</b> <code>theBlueprintNamesWhatTheServerNeeds.test.js</code> holds <code>render.yaml</code> against what the server reads.'),
  H(TAG('Spine 9/7') + ' <b>A sweep with an unevaluated row is not a result:</b> the collecting runner reports a per-gate verdict; the last run had none unevaluated.'),
  O('s4-device', TAG('Axis 1') + ' <b>Real device emulation, not a resized viewport.</b> <b>Why unchecked:</b> every matrix project in <code>hostv2/playwright.config.mjs</code> sets a viewport size and nothing else &mdash; no <code>isMobile</code>, no <code>hasTouch</code>, no device descriptor. The meta-viewport bug this rule was written about cannot recur here, but the gate as written is not met.'),
  O('s4-rescore', TAG('Spine 9/6') + ' <b>The builder never scores its own work.</b> <b>Why unchecked:</b> the 2026-11-02 builds (the sync-conflict disclosure, the GOLD closures, the RLS migration) were verified by their own author&rsquo;s red-proofs and have not been re-scored on the code by a board.'),
  O('s4-ruler', TAG('Correction') + ' <b>Who ruled stage 4 is not in the record.</b> See Corrections.'),
 ],
 5: [
  H(TAG('Security track, web') + ' <b>XSS</b> DONE (React escaping, no <code>dangerouslySetInnerHTML</code>); <b>CSRF</b> and <b>session cookie flags</b> NO-OP with reason (no cookie sessions); <b>logout</b> DONE (<code>signOut</code> invalidates the refresh token) &mdash; checklist :160&ndash;168.'),
  H(TAG('Security track') + ' <b>Dependency audit</b> (0 vulnerabilities in the shipped bundle), <b>secret scan</b>, <b>license check</b> &mdash; all DONE 2026-08-21.'),
  O('s5-rls018', TAG('Found 2026-11-02') + ' <b>Six <code>public</code> tables with RLS off</b> (<code>research_*</code>, <code>provider_run_logs</code>). <b>Why unchecked:</b> fixed in repo (<code>018</code>), not on the live project until PR #94 merges; the live exposure could not be probed from a cloud session.'),
  O('s5-consent', TAG('Marketing track') + ' <b>Consent and tracking-prompt copy</b> &mdash; marketing copy with a legal consequence. <b>Why unchecked:</b> not written. The privacy-policy draft (<code>docs/legal/</code>, 2026-11-02) is its input, not it.'),
  H(TAG('Required skill') + ' <code>route-sweep</code> (the sweep exists although the skill is still unbuilt) and <code>security-review</code> &mdash; both RUN, per the stage-6 record&rsquo;s <code>skillsUsed</code>.'),
  O('s5-ruler', TAG('Correction') + ' <b>Who ruled stage 5 is not in the record.</b> See Corrections.'),
 ],
 6: [
  H(TAG('Spine 9/7') + ' <b>How the target deploys is recorded:</b> on every push to <code>main</code> (<code>pages-from-source.yml</code>), so the push authorization is the deploy authorization for the demo profile; publishing <em>live</em> stays a manual dispatch.'),
  H(TAG('Security track') + ' <b>Prod error responses carry no stack traces</b> &mdash; checklist DONE.'),
  O('s6-backup', TAG('Security track') + ' <b>Backup exists and restore is verified.</b> <b>Why unchecked:</b> the same item as condition <code>c-backup</code>; the drill is written as RUNBOOK check B.'),
  H(TAG('Axis 1') + ' <b>Platform deploy:</b> web only, on your schedule; no store review pipeline because store submission is not a target.'),
 ],
 7: [
  H(TAG('Spine 9/6') + ' <b>&ldquo;Wired&rdquo; read from code, client half:</b> five funnel events emitted by the shipping app, each driven in a browser by <code>activationFunnel.spec.mjs</code> (5 of 5 since 2026-11-02). The server half is PostHog&rsquo;s counter, and its arrival is <code>s7-delivery</code>.'),
  O('s7-remember', TAG('Required skill') + ' <code>remember:doctor</code> at the end of every working session. <b>Why unchecked:</b> not available in the cloud sessions that did the recent work; HANDOFF&rsquo;s freshness gate (<code>handoff:check</code>) is what ran instead.'),
 ],
 8: [
  H(TAG('Step 2e') + ' <b>Standing obligation:</b> <code>docs/ADMIN-CONSOLE.md</code> exists.'),
  H(TAG('Step 2e') + ' <b>Standing obligation:</b> <code>verify:all</code> exists (and <code>verify:fast</code>).'),
  O('s8-unmerged', TAG('Step 2e') + ' <b>Standing obligation: <code>origin/main..HEAD</code> is 0.</b> <b>Why unchecked:</b> 14 commits on <code>main-2utz0n</code> await PR #94.'),
  O('s8-deps', TAG('Spine') + ' <b>Dependency review.</b> <b>Why unchecked:</b> the last recorded audit of the shipped bundle is 2026-08-21.'),
  O('s8-ruler', TAG('Correction') + ' <b>Who ruled stage 8 is not in the record.</b> See Corrections.'),
 ],
 9: [
  H(TAG('Required skill') + ' <code>promote-surface</code> &mdash; RUN at stage 7, producing <code>PROMOTION-DEFERRED.md</code>.'),
  O('s9-readiness', TAG('Required skill') + ' <code>readiness</code> before any offer is described as ready. <b>Why unchecked:</b> the stage-7 record says &ldquo;NOT RUN as a named skill&rdquo;; a board answered its question instead.'),
 ],
}

head, sep, tail = s.partition('<div class="ladder mktg"')
assert sep, 'marketing ladder not found'

def add_rows(chunk, stage, rows):
    m = re.search(r'<div class="sn">%d</div>' % stage, chunk)
    assert m, f'stage {stage} card not found'
    end = chunk.index('</ul>', m.end())
    return chunk[:end] + '  ' + '\n            '.join(rows) + '\n          ' + chunk[end:]

for st, rows in ADD.items():
    head = add_rows(head, st, rows)

# a ratio line under every spine stage's description
head = re.sub(r'(<div class="sn">(\d+)</div>\s*<div class="st">\s*<h3>.*?</h3>\s*<p>.*?</p>)',
              r'\1\n          <p class="ratio" data-ratio></p>', head, flags=re.S)
s = head + sep + tail

# ── 3. Surfaces panel, before the standing conditions ───────────────────────
surfaces = f'''
  <section class="panel" {MARK}>
    <p class="eyebrow">Axis 1 &mdash; surfaces, each declared</p>
    <h2 style="font-family:var(--serif); font-size:22px; font-weight:600; margin:6px 0 6px">Four surfaces, one of them reachable by more people than it faces</h2>
    <p style="margin:0 0 16px; color:var(--ink-soft); max-width:70ch">Each surface traverses the spine on its own, with a declared <code>facing</code> and <code>platform</code>. Reach and facing are independent, and where they disagree the spine calls the disagreement the finding.</p>
    <ul class="items" style="margin:0">
      {H("<b>hostv2 host shell</b> &mdash; facing <b>public</b>, platform <b>web</b> (mobile-flagship, 390px-first), reach <b>public</b>. Facing and reach agree.")}
      {H("<b>Demo tools bar</b> (<code>?demo=1</code>) &mdash; facing internal, web; QA chrome, runbook <code>docs/DEMO_ACCOUNT_RUNBOOK.md</code>.")}
      {H("<b>Legacy CRA shell</b> &mdash; facing internal, web; FROZEN donor, deletion scheduled post-Sprint-2.")}
      {O("sf-admin-reach", "<b>Admin console</b> (<code>?admin=1</code>, CRA) &mdash; facing <b>internal</b>, reach <b>public</b>: it ships in the public bundle. Writes are gated server-side (<code>require_admin</code>), and the 8/21 internal review ruled it standalone-capable. <b>Why unchecked:</b> the mismatch stands, and <code>docs/ADMIN-CONSOLE.md:82</code> records that the review&rsquo;s retirement plan has not been executed.")}
    </ul>
  </section>
'''
anchor = '  <section class="panel" style="border-left:3px solid var(--open)">\n    <p class="eyebrow" style="color:var(--open)">The conditions'
assert anchor in s, 'conditions panel not found'
s = s.replace(anchor, surfaces + anchor, 1)

# ── 4. corrections ─────────────────────────────────────────────────────────
corr = '''
    <div class="corr">
      <p style="margin:0 0 4px"><span class="was">Stages 1&ndash;5 were ruled by Todd Willis on 3 September 2026.</span></p>
      <p style="margin:0; color:var(--ink-soft)">
        Read off the Command Center gate cache on 2026-11-02, the records for stages <b>1, 2, 3, 4, 5 and 8</b>
        carry <b>no <code>ruledBy</code></b>. Only stage 6 (Todd Willis, 8/29) and stage 7 (the standing board
        delegation, 9/2) name a ruler. The page said &ldquo;ruled by Todd Willis&rdquo; on five stages the record
        does not attribute to anyone, and the spine is plain about what that is: a verdict with no ruler is a
        recommendation that quietly promoted itself. The original lines stay where they were; each stage now
        carries an open row asking for the ruling to be confirmed or made. The standing delegation of 9/2 covers
        &ldquo;every gate ruling&rdquo; from that day, but it delegates to the board, and no board sat on these.
      </p>
    </div>

    <div class="corr">
      <p style="margin:0 0 4px"><span class="was">This page carries every obligation the spine places on this project.</span></p>
      <p style="margin:0; color:var(--ink-soft)">
        It carried the spine of 8/29&ndash;9/3. Amendments since then &mdash; leaders before iterating, the builder
        never scoring its own work, every env var a declared seam, how a target deploys, &ldquo;wired&rdquo; read
        from code &mdash; were never added, and the cross-cutting tracks&rsquo; rows were missing from stages 2, 3,
        5 and 6. Retrofitted 2026-11-02 under Step 6e (spine as of <code>ngw-os@a56412a</code>): every obligation is
        a row, every task is a box, and recorded passes render as <b>checked and disabled</b> rather than as
        text, so a first load with nothing stored can no longer read a passed stage as untouched. The
        transform is <code>scripts/retrofit-gate-artifact.py</code>.
      </p>
    </div>
'''
anchor2 = '''    <div class="corr">
      <p style="margin:0 0 4px"><span class="was">A gate can be recorded as passed once the work is verified.</span></p>'''
assert anchor2 in s, 'last correction not found'
s = s.replace(anchor2, corr + anchor2, 1)

# ── 5. styles + script: tag chip, ratio line, four-state done test ──────────
css = '''
  .tag{display:inline-block; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
    color:var(--muted); border:1px solid var(--line); border-radius:2px; padding:0 5px; margin-right:4px; text-indent:0}
  .ratio{margin:6px 0 0 !important; font-size:12.5px !important; color:var(--ink-soft) !important; font-variant-numeric:tabular-nums}
  .ratio b{color:var(--ink)}
  .items input[type=checkbox]:disabled:checked{accent-color:var(--ok); opacity:1}
'''
s = s.replace('  [hidden]{display:none !important}', css + '  [hidden]{display:none !important}', 1)

old_done = '''      if (li.querySelector('.mark.ok')) return true;
      var b = li.querySelector('input[type=checkbox][data-k]');
      return !!(b && b.checked);'''
new_done = '''      // Four states (Step 6e): handled = checked AND disabled; owed = a live
      // box; unreached = disabled and unchecked; a note = .mark.skip, never
      // a box and never hidden. Completed is handled, or owed and ticked.
      if (li.querySelector('input[type=checkbox]:disabled:checked')) return true;
      var b = li.querySelector('input[type=checkbox][data-k]');
      return !!(b && b.checked);'''
assert old_done in s, 'isDone body not found'
s = s.replace(old_done, new_done, 1)

old_apply_tail = '''      count.textContent = on'''
new_apply_tail = '''      // Per-stage ratio (Step 6e.4): what is handled, what is owed, what is
      // unreached. Counted off the boxes themselves, so it cannot disagree
      // with the page.
      document.querySelectorAll('.stage').forEach(function (card) {
        var r = card.querySelector('[data-ratio]');
        if (!r) return;
        var lis = card.querySelectorAll('.items li'), hd = 0, ow = 0, un = 0;
        lis.forEach(function (li) {
          var x = li.querySelector('input[type=checkbox]');
          if (!x) return;
          if (x.disabled && x.checked) hd++;
          else if (x.disabled) un++;
          else if (x.checked) hd++;
          else ow++;
        });
        var tot = hd + ow + un;
        r.innerHTML = tot ? ('<b>' + hd + ' of ' + tot + '</b> handled' + (ow ? ' &middot; ' + ow + ' owed' : '') + (un ? ' &middot; ' + un + ' unreached' : '')) : 'No task at this stage.';
        if (!tot) card.hidden = false;
      });
      count.textContent = on'''
assert old_apply_tail in s, 'apply() tail not found'
s = s.replace(old_apply_tail, new_apply_tail, 1)

P.write_text(s, encoding='utf-8')
print(f'converted {n_marks} recorded marks; added rows to stages {sorted(ADD)}; surfaces panel; 2 corrections')
