#!/usr/bin/env python3
"""Record the 2026-11-02 board ruling on docs/artifact/the-first-recorded-gate.html.

The review board, under the owner's standing delegation (stage 7 record,
2026-09-02), re-ruled stages 3, 4, 5 and 8 on 2026-11-02 — Engineering &
Delivery wing, Panel A (3, 4) and Panel B (5, 8). The gate records are drafted
in ngw-event-planner-workspace docs/gate-records/2026-11-02/ for the owner to
post. This applies the same rulings to the page, in the same commit, so the
page and the record cannot disagree. Refuses to run twice.
"""
import pathlib, sys

P = pathlib.Path(__file__).resolve().parent.parent / 'docs/artifact/the-first-recorded-gate.html'
s = P.read_text(encoding='utf-8')
MARK = 'data-ruling="2026-11-02"'
if MARK in s:
    sys.exit('already recorded — refusing to run twice')

H = '<input type="checkbox" checked disabled aria-label="handled">'
TAG = lambda t: f'<span class="tag">{t}</span>'
def owed(k, t): return f'<li><input type="checkbox" data-k="{k}"> {t}</li>'
def done(t): return f'<li>{H} {t}</li>'

def close(key, note):
    """Turn an owed row into a handled one, keeping its text and adding why."""
    global s
    old = f'<input type="checkbox" data-k="{key}">'
    assert s.count(old) == 1, f'{key}: expected exactly one owed box'
    i = s.index(old); j = s.index('</li>', i)
    s = s[:i] + H + s[i + len(old):j] + f' <b>Closed 2026-11-02:</b> {note}' + s[j:]

def add(stage, rows):
    global s
    head, sep, tail = s.partition('<div class="ladder mktg"')
    i = head.index(f'<div class="sn">{stage}</div>')
    j = head.index('</ul>', i)
    head = head[:j] + '  ' + '\n            '.join(rows) + '\n          ' + head[j:]
    s = head + sep + tail

# ── the stamp: a ruling happened today, so the page's Recorded date moves ──
s = s.replace('<div data-recorded="2026-09-03" hidden>Recorded September 3, 2026</div>',
              '<div data-recorded="2026-11-02" hidden>Recorded November 2, 2026</div>', 1)
s = s.replace('<div>Recorded <b>September 3, 2026</b> &middot; re-measured <b style="white-space:nowrap">2026-11-02</b></div>',
              '<div>Recorded <b>November 2, 2026</b> &middot; stages 3, 4, 5, 8 re-ruled by the board</div>', 1)
s = s.replace('<div>HEAD at last audit <b>34d2931</b> (was c9dd1d05)</div>',
              '<div>HEAD at last audit <b>60e2284</b> (was c9dd1d05)</div>', 1)

# ── the ruling block, under the 2026-11-02 re-measurement panel ────────────
ruling = f'''
  <section class="state" style="border-left-color:var(--ok)" {MARK}>
    <p class="eyebrow" style="color:var(--ok)">Ruled 2026-11-02 &mdash; the board, under the owner&rsquo;s standing delegation</p>
    <h2>Stages 3, 4, 5 and 8 re-ruled: all passed with conditions, two of them over a dissent.</h2>
    <p>
      Two panels of the roster&rsquo;s Engineering &amp; Delivery wing sat in parallel. Under the
      9/6 rule that a builder never scores its own work, they re-scored this session&rsquo;s
      claims on the code with their own instruments &mdash; Panel A broke the sync guard twice
      and watched it go red (5 of 11, then 1 of 11), and ran the guard script itself (10 of 10);
      Panel B re-counted RLS across both migration folders (27 of 27), re-ran the audits and the
      route sweep, and grepped the built bundle for secrets.
    </p>
    <ul class="items" style="margin-top:4px">
      {done('<b>Stage 3, Build &mdash; passed with conditions, 3&ndash;0</b> (Feathers, Bach/Bolton, Farley). Condition C3-3 is a defect the board found in the builder&rsquo;s own work: a refused save has no way out.')}
      {done('<b>Stage 4, Verify &mdash; passed with conditions, 2&ndash;1.</b> <b>Dissent, Bach/Bolton: not-yet</b> &mdash; device emulation is plainly unmet, &ldquo;a 430px desktop window checked as a phone is checking, not testing,&rdquo; and the security sweep cannot fail when a new router arrives.')}
      {done('<b>Stage 5, Security &mdash; passed with conditions, 2&ndash;1.</b> <b>Dissent, Janca: not-yet</b> &mdash; protection is decided in one hand-written list while eight routers decide for themselves, and the repo cannot prove the live database safe until check A.')}
      {done('<b>Stage 8, Maintain &mdash; passed with conditions, 3&ndash;0</b> (Janca, Forsgren, Fowler).')}
      <li><span class="mark skip">&ndash;</span> <b>Not ruled by the board, deliberately:</b> stages 1 and 2. Whether the owner ruled them on 2026-09-03 is a fact only he holds; their records are drafted for him to confirm or re-rule.</li>
      <li><span class="mark skip">&ndash;</span> <b>Where the records are:</b> drafted with a poster the owner runs locally &mdash; the Command Center is unreachable from a cloud session. Until he posts them, this page is ahead of the server record, and says so here.</li>
    </ul>
  </section>
'''
anchor = '\n  <section class="toolbar">'
assert anchor in s
s = s.replace(anchor, ruling + anchor, 1)

# ── rows the ruling closes ─────────────────────────────────────────────────
for st in (3, 4, 5, 8):
    close(f's{st}-ruler', 'ruled by the review board under the standing delegation &mdash; see the ruling panel above.')
close('s4-rescore', 'Panel A re-scored the 2026-11-02 claims on the code and red-proofed the sync guard itself; four of five claims accepted with caveats, one in full.')
close('c-authz', 'finding #8 is RESOLVED in the checklist body (third pass, 2026-08-21) and enforced by the sweep&rsquo;s stale-entry test; the board ruled it closed. Five owner/external opens remain, not six.')
close('s5-authz', 'same finding, closed by the board &mdash; see condition c-authz.')
close('c-mkt1', '<code>docs/ACQUISITION-THESIS.md</code> records its own ruling &mdash; <b>amend, 2026-09-02</b>, by a six-seat board under the standing delegation, later re-ruled with Decision 1 withdrawn. A leftover &ldquo;this is a draft, not a decision&rdquo; line on the file is what kept this page saying &ldquo;not ruled.&rdquo;')
close('m1-thesis', 'ruled amend 2026-09-02 &mdash; see condition c-mkt1.')
close('m1-unit', 'ruled with the thesis, 2026-09-02.')
close('m1-falsify', 'ruled with the thesis, 2026-09-02.')

# phase 2's "blocked upstream" reasons are no longer true
s = s.replace('Blocked upstream: this phase runs against the thesis in m1-thesis, which is drafted but not yet ruled by the board &mdash; there is nothing to test a rate against until that ruling lands.',
              '<b>Unblocked 2026-11-02:</b> the thesis was ruled on 2026-09-02, so the rate can be pre-registered now. Owed.', 1)
s = s.replace('Same blocker &mdash; the asset is the acquisition unit named in the unruled draft (m1-unit).',
              '<b>Unblocked 2026-11-02:</b> the unit is ruled (&ldquo;one screen: a real event&rsquo;s plan, mid-flight&rdquo;), shot from an event that passes the horizon guard. Owed.', 1)

# ── the conditions the board added ────────────────────────────────────────
add(3, [owed('s3-conflict-exit', TAG('Board 2026-11-02, C3-3') + ' <b>A refused save has no way out.</b> Once a save is refused as a conflict, hydrate keeps the dirty local copy (<code>HostShellV2.jsx:1958</code>) and every later save is refused again against the same stale version &mdash; the device drifts from the account until storage is cleared. <b>Why unchecked:</b> the exit (&ldquo;keep mine&rdquo; / &ldquo;take the newer version&rdquo;) is a design call the board routed for a ruling; then it ships with a red-proofed test.')])
add(4, [
  owed('s4-sweep', TAG('Board 2026-11-02, C4-2') + ' <b>The route sweep must enumerate.</b> <code>test_protected_routes_sweep.py:39</code> hand-lists 8 of the 16 routers <code>main.py</code> mounts; a new router cannot turn it red. Walk the mounted routers, with exclusions argued in an allowlist.'),
  owed('s4-nielsen', TAG('Board 2026-11-02, C4-3') + ' <b>Re-run the behavior-only Nielsen pass</b> against current HEAD &mdash; the last ran 2026-08-21. The stranded conflict is a user-control/freedom finding: P2 by majority, P1 per Bach/Bolton.'),
  owed('s4-skip', TAG('Board 2026-11-02, C4-4') + ' <b>A skip is reported as a pass.</b> <code>verify-all.mjs</code> counts a SKIP as not-failed and still prints &ldquo;all N passed&rdquo;; make a skip visible as a skip.'),
])
add(5, [
  owed('s5-sweep', TAG('Board 2026-11-02, cond. 6') + ' <b>Research, kcr and kas assert 401; weather, food_prices, instacart, kroger and lodging go on the PUBLIC allowlist with written reasons</b> &mdash; including anonymous use of our third-party API quota, which nothing records today.'),
  owed('s5-kaw1', TAG('Board 2026-11-02, cond. 7') + ' <b><code>src/lib/knowledge/kaw1-migration.sql</code> is outside the RLS gate.</b> Seven hand-applied tables, all RLS-enabled today; the gate scans the two migration folders and not this file.'),
])
add(6, [owed('s6-e2e', TAG('Board 2026-11-02, Farley') + ' <b>The browser specs guarding the money path do not gate deployment.</b> They run in <code>checks.yml</code>; <code>pages-from-source.yml</code> runs unit tests, pytest and the release build only, so a red GOLD-09 cannot stop a release. Fix before stage 6 is re-ruled.')])
add(8, [
  owed('s8-cra', TAG('Board 2026-11-02') + ' <b>Re-decide the frozen CRA&rsquo;s dependency disposition.</b> The NO-OP rests on a deletion &ldquo;scheduled post-Sprint-2&rdquo; that no ruling dates, and <code>xlsx</code> (high, no fix) parses user-uploaded files in code that ships (<code>src/App.js:210</code>).'),
  owed('s8-cadence', TAG('Board 2026-11-02') + ' <b>Run the dependency audit on a written cadence, both trees.</b> The 2026-08-21 &ldquo;0 vulnerabilities&rdquo; was false by 2026-11-02 and nothing re-ran it in between.'),
])

# ── one correction ────────────────────────────────────────────────────────
corr = '''
    <div class="corr">
      <p style="margin:0 0 4px"><span class="was">Marketing phase 1 is drafted, not ruled.</span></p>
      <p style="margin:0; color:var(--ink-soft)">
        Said here from 2026-09-03 to 2026-11-02. The thesis file had recorded its own ruling &mdash;
        <b>amend, 2026-09-02</b>, by a six-seat board &mdash; above a leftover sentence calling it a
        draft, and this page read the leftover. Closed with the condition it carried; phase 2 is now
        unblocked and owed.
      </p>
    </div>
'''
anchor2 = '''    <div class="corr">
      <p style="margin:0 0 4px"><span class="was">A gate can be recorded as passed once the work is verified.</span></p>'''
assert anchor2 in s
s = s.replace(anchor2, corr + anchor2, 1)

P.write_text(s, encoding='utf-8')
print('ruling recorded: stamp 2026-11-02; 4 rulers + rescore + #8 + thesis closed; 10 board conditions added')
