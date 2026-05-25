/**
 * NGW PLANNER COMMAND WORKBOOK — generator (v1)
 * ------------------------------------------------------------------
 * Premium operational system implemented in Google Sheets.
 * Studio Matte aesthetic: dark surfaces, restrained accent, strong hierarchy.
 *
 * HOW TO USE
 *   1. New Google Sheet → Extensions → Apps Script
 *   2. Paste this whole file, Save.
 *   3. Run  buildWorkbook()  (authorize once).
 *   4. Return to the sheet — the full workbook is built + themed + seeded.
 *
 * Re-running rebuilds every tab from scratch (it clears them first), so it
 * is safe to iterate. Your data tabs keep their headers/formulas; only the
 * generator-owned structure is rewritten.
 */

// ─── Studio Matte palette ──────────────────────────────────────────────────
var T = {
  bg:       '#0f0f11',
  surface:  '#17171b',
  zebra:    '#1b1b21',
  header:   '#000000',
  title:    '#101014',
  text:     '#e9e9ee',
  muted:    '#8a8a99',
  border:   '#2a2a31',
  accent:   '#5b8cff', // primary
  teal:     '#15c9a8', // committed / good
  warn:     '#e0a23b', // attention
  danger:   '#e0556b', // overdue / risk
  ok:       '#3fb27f', // confirmed / paid
  font:     'Inter',
};

var TODAY = 'TODAY()';

// ─── Schema: data tabs (config-driven) ─────────────────────────────────────
// Each: { name, accent, cols:[...], widths:[...], seed:[[...]], rows, cf:[...] }
// cf rule kinds: status(map), overdue(dateCol,doneCol), number, checkbox.
var DATA_TABS = [
  {
    name: 'Settings', accent: T.muted, note: 'Single source of truth. Command Center + summaries read from here.',
    kv: [
      ['Event Name',        'Sarah & Todd — Wedding'],
      ['Event Date',        '=DATE(2026,9,12)'],
      ['Venue',             'Bluebell Venue'],
      ['Venue Capacity',    150],
      ['RSVP Deadline',     '=DATE(2026,8,1)'],
      ['Planner',           'NGW Events'],
      ['Currency',          'USD'],
    ],
  },
  {
    name: 'Guests', accent: T.accent,
    cols: ['Guest Name','Household','Plus-One','RSVP','Meal','Dietary / Allergies','Accessibility','Invited','Email','Phone','Notes'],
    widths: [170,150,90,90,130,170,150,80,190,130,220],
    seed: [
      ['Sarah Chen','Chen / Williams','—','Yes','Standard','','','Yes','sarah@email.com','(615) 555-0101',''],
      ['Todd Williams','Chen / Williams','—','Yes','Standard','Gluten-free','','Yes','todd@email.com','(615) 555-0102',''],
      ['Maria Lopez','Lopez','Carlos Lopez','Yes','Vegetarian','Nut allergy','Wheelchair access','Yes','maria@email.com','',''],
      ['James Okafor','Okafor','—','Maybe','','','','Yes','james@email.com','',''],
      ['Priya Patel','Patel','—','','','','','Yes','priya@email.com','','Awaiting reply'],
    ],
    rows: 250,
    cf: [
      { kind:'status', col:4, map:{ 'Yes':T.ok, 'No':T.danger, 'Maybe':T.warn } },
      { kind:'flagBlankWhenYes', valCol:5, condCol:4 }, // meal blank while RSVP=Yes → warn
    ],
  },
  {
    name: 'Households', accent: T.accent,
    cols: ['Household','Primary Contact','# in Party','Address','City','Invite Sent','RSVP Status','Notes'],
    widths: [180,170,90,220,130,100,120,220],
    seed: [
      ['Chen / Williams','Sarah Chen',2,'','Nashville','Yes','Confirmed',''],
      ['Lopez','Maria Lopez',2,'','Nashville','Yes','Confirmed',''],
      ['Okafor','James Okafor',1,'','Nashville','Yes','Pending',''],
      ['Patel','Priya Patel',1,'','Nashville','Yes','Pending',''],
    ],
    rows: 120,
    cf: [{ kind:'status', col:7, map:{ 'Confirmed':T.ok, 'Declined':T.danger, 'Pending':T.warn } }],
  },
  {
    name: 'Vendors', accent: T.teal,
    cols: ['Vendor','Category','Status','Contact','Phone / Email','Total Cost','Deposit Paid','Balance Due','Pay Due','Specialty / Cultural Tags','Operational Notes'],
    widths: [170,130,120,150,180,100,100,100,100,200,220],
    seed: [
      ['Bluebell Venue','Venue','Confirmed','events@bluebell.co','(615) 555-0101',4800,1000,'=F2-G2','=DATE(2026,7,1)','Outdoor, High Guest Count',''],
      ['Fork & Flower Catering','Catering','Confirmed','events@ff.com','(615) 555-0134',6500,2000,'=F3-G3','=DATE(2026,8,15)','Halal, Vegan',''],
      ['Lena Kim Photography','Photography','Confirmed','lena@lkp.com','(615) 555-0188',2500,2500,'=F4-G4','','Editorial',''],
      ['Petal & Stem','Florals','Deposit Paid','info@petalstem.com','(615) 555-0210',1800,900,'=F5-G5','=DATE(2026,6,1)','',''],
      ['Sound Wave DJ','Entertainment','Considering','','(615) 555-0299',1200,0,'=F6-G6','','',''],
    ],
    rows: 80,
    cf: [
      { kind:'status', col:3, map:{ 'Confirmed':T.ok, 'Deposit Paid':T.accent, 'Contracted':T.teal, 'Quoted':T.warn, 'Considering':T.muted } },
    ],
  },
  {
    name: 'Preferred Vendors', accent: T.teal,
    note: 'Operational trust library — reliability dominant. Identity/cultural tags are discovery context only, never a ranking.',
    cols: ['Vendor','Category','Service Area','Reliability','Tier','Specialty Tags','Cultural Experience','Languages','Identity (optional)','Events Completed','Notes'],
    widths: [170,130,140,100,110,180,180,130,150,110,200],
    seed: [
      ['Bluebell Venue','Venue','Nashville, TN','=IFERROR(VLOOKUP(A2,\'Vendor Performance\'!A:K,11,FALSE),"")','Elite','Outdoor, High Guest Count','Multicultural','Spanish','Woman-owned',120,''],
      ['Fork & Flower Catering','Catering','Nashville, TN','=IFERROR(VLOOKUP(A3,\'Vendor Performance\'!A:K,11,FALSE),"")','Preferred','Halal, Vegan','South Asian, West African','Spanish, Hindi','',45,''],
    ],
    rows: 80,
    cf: [{ kind:'status', col:5, map:{ 'Certified':T.accent, 'Elite':T.teal, 'Preferred':T.ok, 'Standard':T.muted } }],
  },
  {
    name: 'Vendor Performance', accent: T.teal,
    note: 'Lightweight scoring. Fewer than 3 completed events → "Not enough operational history" (never faked).',
    cols: ['Vendor','Events Completed','On-Time %','Avg Response (hrs)','Comm Quality (1-5)','Issues Handled (1-5)','Planner Trust (1-5)','Repeat Used','Successful %','— ','Reliability'],
    widths: [170,120,90,140,140,150,140,100,100,30,140],
    seed: [
      ['Bluebell Venue',120,98,3,5,5,5,'Yes',98,'',''],
      ['Fork & Flower Catering',45,92,6,4,4,4,'Yes',93,'',''],
      ['Sound Wave DJ',1,'', '', '', '', '','No','','',''],
    ],
    rows: 80,
    // Reliability formula written per-row in postProcess (needs row refs).
    cf: [],
  },
  {
    name: 'Budget', accent: T.warn,
    cols: ['Category','Estimated','Committed','Actual / Spent','Balance Due','% Spent','Status','Notes'],
    widths: [160,110,110,120,110,90,130,240],
    seed: [
      ['Venue',5000,4800,1000,'=C2-D2','=IFERROR(D2/B2,0)','=IF(C2=0,"—",IF(C2>B2,"Over",IF(D2>=C2,"Paid","On track")))',''],
      ['Catering',8000,6500,2000,'=C3-D3','=IFERROR(D3/B3,0)','=IF(C3=0,"—",IF(C3>B3,"Over",IF(D3>=C3,"Paid","On track")))',''],
      ['Photography',2500,2500,2500,'=C4-D4','=IFERROR(D4/B4,0)','=IF(C4=0,"—",IF(C4>B4,"Over",IF(D4>=C4,"Paid","On track")))',''],
      ['Florals',1800,1800,900,'=C5-D5','=IFERROR(D5/B5,0)','=IF(C5=0,"—",IF(C5>B5,"Over",IF(D5>=C5,"Paid","On track")))',''],
      ['Entertainment',1500,0,0,'=C6-D6','=IFERROR(D6/B6,0)','=IF(C6=0,"—",IF(C6>B6,"Over",IF(D6>=C6,"Paid","On track")))',''],
    ],
    rows: 60,
    money: [2,3,4,5], pct: [6],
    cf: [{ kind:'status', col:7, map:{ 'Paid':T.ok, 'On track':T.teal, 'Over':T.danger } }],
    total: { label:'TOTAL', cols:{ 2:'sum', 3:'sum', 4:'sum', 5:'sum' } },
  },
  {
    name: 'Payments', accent: T.warn,
    cols: ['Payee','Linked To','Amount','Due Date','Status','Method','Paid Date','Notes'],
    widths: [180,150,110,110,120,130,110,220],
    seed: [
      ['Bluebell Venue','Venue balance',3800,'=DATE(2026,7,1)','Due','','',''],
      ['Petal & Stem','Florals balance',900,'=DATE(2026,6,1)','Due','','',''],
      ['Fork & Flower','Catering balance',4500,'=DATE(2026,8,15)','Scheduled','','',''],
    ],
    rows: 80, money: [3],
    cf: [
      { kind:'status', col:5, map:{ 'Paid':T.ok, 'Scheduled':T.teal, 'Due':T.warn, 'Overdue':T.danger } },
      { kind:'overdue', dateCol:4, statusCol:5 },
    ],
  },
  {
    name: 'Timeline', accent: T.accent,
    cols: ['Phase / Milestone','Target Date','Owner','Linked Vendor','Status','Depends On','Notes'],
    widths: [200,120,120,160,120,160,240],
    seed: [
      ['Book venue','=DATE(2026,2,1)','Planner','Bluebell Venue','Done','',''],
      ['Send invitations','=DATE(2026,6,15)','Planner','','In progress','Finalize guest list',''],
      ['Final headcount to caterer','=DATE(2026,8,29)','Planner','Fork & Flower','Not started','RSVP deadline',''],
      ['Final walkthrough','=DATE(2026,9,5)','Planner','Bluebell Venue','Not started','',''],
    ],
    rows: 120,
    cf: [{ kind:'status', col:5, map:{ 'Done':T.ok, 'In progress':T.teal, 'Not started':T.muted, 'Blocked':T.danger } },
         { kind:'overdue', dateCol:2, statusCol:5, doneVal:'Done' }],
  },
  {
    name: 'Run of Show', accent: T.accent,
    cols: ['Time','Item','Owner / Lead','Vendor','Arrival','Setup Done By','Duration (min)','Status','Conflict','Notes'],
    widths: [80,200,140,150,90,120,120,110,90,220],
    seed: [
      ['08:00','Venue access / load-in','Planner','Bluebell Venue','08:00','10:00',120,'Confirmed','',''],
      ['12:00','Florals install','Petal & Stem','Petal & Stem','11:00','13:00',120,'Confirmed','',''],
      ['14:00','Catering setup','Fork & Flower','Fork & Flower','13:00','15:30',150,'Confirmed','',''],
      ['16:00','Ceremony','Officiant','','','',30,'Confirmed','',''],
      ['17:00','Reception','Sound Wave DJ','Sound Wave DJ','16:00','','240','Pending','',''],
    ],
    rows: 120,
    cf: [{ kind:'status', col:8, map:{ 'Confirmed':T.ok, 'Pending':T.warn, 'At risk':T.danger } }],
    conflictCol: 9, conflictArrival: 5, // flag overlapping arrival times
  },
  {
    name: 'Tasks', accent: T.accent,
    cols: ['Task','Phase','Owner','Due Date','Done','Priority','Notes'],
    widths: [240,140,120,110,70,100,240],
    seed: [
      ['Confirm final headcount','6 Months Out','Planner','=DATE(2026,8,20)',false,'High',''],
      ['Order florals — finalize vision','6 Months Out','Planner','=DATE(2026,5,1)',false,'High','Overdue example'],
      ['Book DJ / entertainment','6 Months Out','Planner','=DATE(2026,5,10)',false,'High',''],
      ['Send save-the-dates','Booked','Planner','=DATE(2026,3,1)',true,'Medium',''],
    ],
    rows: 200, checkbox: [5],
    cf: [{ kind:'overdueCheckbox', dateCol:4, doneCol:5 }],
  },
  {
    name: 'Client Updates', accent: T.accent,
    note: 'Client-facing log. Type drives tone. Read = client confirmed.',
    cols: ['Date','Type','Message','Sent','Read','Approval Status','Notes'],
    widths: [110,140,320,80,90,140,200],
    seed: [
      ['=DATE(2026,5,1)','Decision','Confirmed dusty-rose + eucalyptus palette','Yes','Yes','—',''],
      ['=DATE(2026,5,10)','Approval Request','Approve upgraded linens (+$320)?','Yes','No','Pending',''],
    ],
    rows: 200,
    cf: [{ kind:'status', col:6, map:{ 'Approved':T.ok, 'Declined':T.danger, 'Pending':T.warn } }],
  },
  {
    name: 'Internal Notes', accent: T.danger,
    note: '⚠ PLANNER-ONLY — never share this tab or its contents with clients or vendors.',
    cols: ['Date','Type','Note','Risk Flag','Follow-up'],
    widths: [110,140,420,120,200],
    seed: [
      ['=DATE(2026,5,2)','Note','Client budget approved through finance','',''],
      ['=DATE(2026,5,12)','Concern','Caterer slow to respond — watch','Watch',''],
    ],
    rows: 200,
    cf: [{ kind:'status', col:4, map:{ 'Watch':T.warn, 'Risk':T.danger } }],
  },
  {
    name: 'Venue & Logistics', accent: T.teal,
    cols: ['Item','Detail','Owner','Status','Notes'],
    widths: [180,300,140,120,240],
    seed: [
      ['Capacity','=\'Settings\'!B5&" guests"','Venue','Confirmed',''],
      ['Load-in window','08:00 – 10:00','Planner','Confirmed',''],
      ['Parking / accessibility','Validated garage; wheelchair ramp at east entry','Venue','Confirmed',''],
      ['Power / AV','In-house projector + 4 circuits','AV','Pending',''],
    ],
    rows: 60,
    cf: [{ kind:'status', col:4, map:{ 'Confirmed':T.ok, 'Pending':T.warn, 'Issue':T.danger } }],
  },
];

// ════════════════════════════════════════════════════════════════════════════
function buildWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTheme && safeTheme(ss);

  // 1) data + config tabs
  DATA_TABS.forEach(function (cfg) {
    if (cfg.kv) buildKvTab(ss, cfg); else buildDataTab(ss, cfg);
  });

  // 2) per-row formulas that need row indices
  vendorPerformanceFormulas(ss);
  runOfShowConflicts(ss);

  // 3) computed / dashboard tabs
  buildRsvp(ss);
  buildMeals(ss);
  buildFnB(ss);
  buildDashboardMetrics(ss);
  buildEventOverview(ss);
  buildCommandCenter(ss);

  // 4) order: Command Center first, Settings last
  orderTabs(ss);
  ss.setActiveSheet(ss.getSheetByName('Command Center'));
  SpreadsheetApp.getUi && toast(ss, 'Command Workbook built ✓');
}

function toast(ss, m){ try { ss.toast(m, 'NGW', 5); } catch(e){} }
function safeTheme(ss){ /* spreadsheet-level theme API is limited; per-sheet styling below */ }

// ─── generic helpers ────────────────────────────────────────────────────────
function freshSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) { sh.clear(); sh.clearConditionalFormatRules(); sh.setTabColor(null); }
  else sh = ss.insertSheet(name);
  sh.setHiddenGridlines(true);
  return sh;
}
function paintAll(sh, rows, cols) {
  sh.getRange(1, 1, rows, cols).setBackground(T.bg).setFontColor(T.text).setFontFamily(T.font).setFontSize(10);
}
function headerRow(sh, cols, accent) {
  var r = sh.getRange(1, 1, 1, cols.length);
  r.setValues([cols]).setBackground(T.header).setFontColor(accent).setFontWeight('bold')
   .setFontSize(9).setVerticalAlignment('middle').setBorder(false,false,true,false,false,false,T.border,SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(1, 30); sh.setFrozenRows(1);
}
function zebra(sh, startRow, rows, cols) {
  var rng = sh.getRange(startRow, 1, rows, cols);
  var rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=ISEVEN(ROW())')
    .setBackground(T.zebra).setRanges([rng]).build();
  var rules = sh.getConditionalFormatRules(); rules.push(rule); sh.setConditionalFormatRules(rules);
}
function addRule(sh, rule){ var r = sh.getConditionalFormatRules(); r.push(rule); sh.setConditionalFormatRules(r); }
function letter(n){ return String.fromCharCode(64 + n); } // 1->A

// ─── data tab ────────────────────────────────────────────────────────────────
function buildDataTab(ss, cfg) {
  var sh = freshSheet(ss, cfg.name);
  var cols = cfg.cols, n = cols.length, rows = cfg.rows || 100;
  paintAll(sh, rows + 2, n);
  headerRow(sh, cols, cfg.accent);
  (cfg.widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  if (cfg.note) {
    sh.getRange(rows + 2, 1, 1, n).merge().setValue(cfg.note)
      .setFontColor(T.muted).setFontSize(9).setFontStyle('italic').setBackground(T.bg);
  }
  if (cfg.seed && cfg.seed.length) {
    sh.getRange(2, 1, cfg.seed.length, n).setValues(cfg.seed);
  }
  // formats
  (cfg.money || []).forEach(function (c){ sh.getRange(2, c, rows, 1).setNumberFormat('$#,##0'); });
  (cfg.pct   || []).forEach(function (c){ sh.getRange(2, c, rows, 1).setNumberFormat('0%'); });
  (cfg.checkbox || []).forEach(function (c){ sh.getRange(2, c, rows, 1).insertCheckboxes(); });
  // date columns (any header containing "Date"/"Due"/"Deadline")
  cols.forEach(function (h, i){ if (/date|due|deadline|invited|arrival/i.test(h) && !/balance/i.test(h)) {
    // leave Invited/Arrival as text; only true dates:
    if (/date|due|deadline/i.test(h)) sh.getRange(2, i+1, rows, 1).setNumberFormat('mmm d, yyyy');
  }});

  zebra(sh, 2, rows, n);

  (cfg.cf || []).forEach(function (rule){ applyCf(sh, rule, rows); });

  if (cfg.total) buildTotalRow(sh, cfg, rows);
  sh.setTabColor(cfg.accent);
}

function buildTotalRow(sh, cfg, rows) {
  var n = cfg.cols.length, tr = rows + 1; // total just under data block start? place at row 2+seed... simpler: dedicated row after a gap
  // place total at a fixed visible row (below seed area is hidden by size); use row = seedLen+2
  var place = (cfg.seed ? cfg.seed.length : 0) + 3;
  sh.getRange(place, 1).setValue(cfg.total.label).setFontWeight('bold').setFontColor(T.accent);
  Object.keys(cfg.total.cols).forEach(function (c){
    var col = letter(Number(c));
    sh.getRange(place, Number(c)).setFormula('=SUM(' + col + '2:' + col + (rows) + ')').setFontWeight('bold').setFontColor(T.text);
  });
  sh.getRange(place, 1, 1, n).setBackground(T.title).setBorder(true,false,false,false,false,false,T.border,SpreadsheetApp.BorderStyle.SOLID);
}

// ─── key/value (Settings) tab ─────────────────────────────────────────────────
function buildKvTab(ss, cfg) {
  var sh = freshSheet(ss, cfg.name);
  paintAll(sh, cfg.kv.length + 3, 2);
  sh.getRange(1,1,1,2).merge().setValue('⚙  ' + cfg.name).setFontColor(T.text).setFontWeight('bold').setFontSize(13).setBackground(T.title);
  sh.setRowHeight(1, 34);
  sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 280);
  cfg.kv.forEach(function (kv, i){
    var r = i + 2;
    sh.getRange(r,1).setValue(kv[0]).setFontColor(T.muted).setFontSize(10);
    var c = sh.getRange(r,2); if (typeof kv[1]==='string' && kv[1].charAt(0)==='=') c.setFormula(kv[1]); else c.setValue(kv[1]);
    c.setFontColor(T.text).setFontWeight('bold');
    if (/date|deadline/i.test(kv[0])) c.setNumberFormat('mmm d, yyyy');
  });
  if (cfg.note) sh.getRange(cfg.kv.length + 3, 1, 1, 2).merge().setValue(cfg.note).setFontColor(T.muted).setFontStyle('italic').setFontSize(9);
  sh.setTabColor(cfg.accent);
}

// ─── conditional formatting kinds ─────────────────────────────────────────────
function applyCf(sh, rule, rows) {
  var rng;
  if (rule.kind === 'status') {
    rng = sh.getRange(2, rule.col, rows, 1);
    Object.keys(rule.map).forEach(function (k){
      addRule(sh, SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(k).setFontColor(rule.map[k]).setBold(true).setRanges([rng]).build());
    });
  } else if (rule.kind === 'overdue') {
    // date < today AND status not Paid/Done → red text on the date col
    var col = letter(rule.dateCol), scol = letter(rule.statusCol);
    rng = sh.getRange(2, rule.dateCol, rows, 1);
    var done = rule.doneVal || 'Paid';
    addRule(sh, SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($'+col+'2<>"",$'+col+'2<TODAY(),$'+scol+'2<>"'+done+'")')
      .setFontColor(T.danger).setBold(true).setRanges([rng]).build());
  } else if (rule.kind === 'overdueCheckbox') {
    var dc = letter(rule.dateCol), kc = letter(rule.doneCol);
    rng = sh.getRange(2, rule.dateCol, rows, 1);
    addRule(sh, SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($'+dc+'2<>"",$'+dc+'2<TODAY(),$'+kc+'2=FALSE)')
      .setFontColor(T.danger).setBold(true).setRanges([rng]).build());
  } else if (rule.kind === 'flagBlankWhenYes') {
    var vc = letter(rule.valCol), cc = letter(rule.condCol);
    rng = sh.getRange(2, rule.valCol, rows, 1);
    addRule(sh, SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($'+cc+'2="Yes",$'+vc+'2="")')
      .setBackground(T.warn + '22').setFontColor(T.warn).setRanges([rng]).build());
  }
}

// ─── per-row computed formulas ────────────────────────────────────────────────
function vendorPerformanceFormulas(ss) {
  var sh = ss.getSheetByName('Vendor Performance'); if (!sh) return;
  var rows = 80;
  for (var r = 2; r <= rows; r++) {
    // Reliability (col K = 11): blend of on-time, response, comm, issues, trust, success.
    // < 3 events → "Not enough operational history".
    var f = '=IF($A'+r+'="","",IF(N($B'+r+')<3,"Not enough operational history",' +
      'ROUND( 0.25*N($C'+r+') + 0.15*MAX(0,100-N($D'+r+')*6) + 0.15*(N($E'+r+')/5*100) + 0.15*(N($F'+r+')/5*100) + 0.15*(N($G'+r+')/5*100) + 0.15*N($I'+r+') ,0)))';
    sh.getRange(r, 11).setFormula(f);
  }
  // color the reliability column
  var rng = sh.getRange(2, 11, rows, 1);
  addRule(sh, SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(85).setFontColor(T.teal).setBold(true).setRanges([rng]).build());
  addRule(sh, SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(60,84.999).setFontColor(T.warn).setRanges([rng]).build());
  addRule(sh, SpreadsheetApp.newConditionalFormatRule().whenTextContains('Not enough').setFontColor(T.muted).setItalic(true).setRanges([rng]).build());
}

function runOfShowConflicts(ss) {
  var sh = ss.getSheetByName('Run of Show'); if (!sh) return;
  var rows = 120, ac = letter(5); // Arrival col E
  for (var r = 2; r <= rows; r++) {
    // flag if this arrival time duplicates another vendor's arrival
    sh.getRange(r, 9).setFormula('=IF($'+ac+r+'="","",IF(COUNTIF($'+ac+'$2:$'+ac+'$'+rows+',$'+ac+r+')>1,"⚠ overlap",""))');
  }
  var rng = sh.getRange(2, 9, rows, 1);
  addRule(sh, SpreadsheetApp.newConditionalFormatRule().whenTextContains('overlap').setFontColor(T.danger).setBold(true).setRanges([rng]).build());
}

// ─── RSVP (computed) ──────────────────────────────────────────────────────────
function buildRsvp(ss) {
  var sh = freshSheet(ss, 'RSVP'); paintAll(sh, 20, 4);
  panelTitle(sh, 'RSVP TRACKING', T.accent);
  var rsvp = "'Guests'!$D$2:$D";
  var inv = "'Guests'!$H$2:$H";
  metricBlock(sh, 3, [
    ['Invited',        '=COUNTIF('+inv+',"Yes")'],
    ['Confirmed (Yes)','=COUNTIF('+rsvp+',"Yes")'],
    ['Declined (No)',  '=COUNTIF('+rsvp+',"No")'],
    ['Maybe',          '=COUNTIF('+rsvp+',"Maybe")'],
    ['No response',    '=COUNTIF('+inv+',"Yes")-COUNTIF('+rsvp+',"Yes")-COUNTIF('+rsvp+',"No")-COUNTIF('+rsvp+',"Maybe")'],
    ['Response rate',  '=IFERROR((COUNTIF('+rsvp+',"Yes")+COUNTIF('+rsvp+',"No")+COUNTIF('+rsvp+',"Maybe"))/COUNTIF('+inv+',"Yes"),0)'],
    ['Est. attending', '=COUNTIF('+rsvp+',"Yes")+ROUND(COUNTIF('+rsvp+',"Maybe")*0.6,0)'],
    ['RSVP deadline',  "='Settings'!B6"],
    ['Days to deadline',"=IFERROR('Settings'!B6-TODAY(),\"\")"],
  ]);
  sh.getRange(8,2).setNumberFormat('0%'); sh.getRange(10,2).setNumberFormat('mmm d, yyyy');
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 160);
  sh.setTabColor(T.accent);
}

// ─── Meals (computed) ─────────────────────────────────────────────────────────
function buildMeals(ss) {
  var sh = freshSheet(ss, 'Meals'); paintAll(sh, 20, 4);
  panelTitle(sh, 'MEAL SELECTIONS', T.accent);
  var meal = "'Guests'!$E$2:$E", rsvp="'Guests'!$D$2:$D";
  sh.getRange(3,1,1,2).setValues([['Meal','Count (confirmed)']]).setFontColor(T.muted).setFontWeight('bold');
  var meals = ['Standard','Vegetarian','Vegan','Gluten-Free'];
  meals.forEach(function (m, i){
    sh.getRange(4+i,1).setValue(m).setFontColor(T.text);
    sh.getRange(4+i,2).setFormula('=COUNTIFS('+rsvp+',"Yes",'+meal+',"'+m+'")').setFontColor(T.text).setFontWeight('bold');
  });
  sh.getRange(4+meals.length,1).setValue('Selected total').setFontColor(T.muted);
  sh.getRange(4+meals.length,2).setFormula('=SUM(B4:B'+(3+meals.length)+')').setFontColor(T.text).setFontWeight('bold');
  sh.getRange(5+meals.length,1).setValue('⚠ Meal gaps (Yes, no meal)').setFontColor(T.warn);
  sh.getRange(5+meals.length,2).setFormula('=COUNTIFS('+rsvp+',"Yes",'+meal+',"")').setFontColor(T.warn).setFontWeight('bold');
  sh.getRange(7+meals.length,1).setValue('Dietary / allergy notes').setFontColor(T.muted).setFontWeight('bold');
  sh.getRange(8+meals.length,1).setFormula('=IFERROR(TEXTJOIN(", ",TRUE,\'Guests\'!F2:F),"—")').setFontColor(T.text);
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 160);
  sh.setTabColor(T.accent);
}

// ─── F&B Summary ──────────────────────────────────────────────────────────────
function buildFnB(ss) {
  var sh = freshSheet(ss, 'F&B Summary'); paintAll(sh, 24, 4);
  panelTitle(sh, 'FOOD & BEVERAGE SUMMARY', T.teal);
  var rsvp="'Guests'!$D$2:$D", meal="'Guests'!$E$2:$E";
  metricBlock(sh, 3, [
    ['Confirmed headcount','=COUNTIF('+rsvp+',"Yes")'],
    ['Estimated headcount', "='RSVP'!B9"],
    ['Standard',          '=COUNTIFS('+rsvp+',"Yes",'+meal+',"Standard")'],
    ['Vegetarian',        '=COUNTIFS('+rsvp+',"Yes",'+meal+',"Vegetarian")'],
    ['Vegan',             '=COUNTIFS('+rsvp+',"Yes",'+meal+',"Vegan")'],
    ['Gluten-Free',       '=COUNTIFS('+rsvp+',"Yes",'+meal+',"Gluten-Free")'],
    ['Meals unselected',  '=COUNTIFS('+rsvp+',"Yes",'+meal+',"")'],
    ['Est. tables (10/ea)','=ROUNDUP(COUNTIF('+rsvp+',"Yes")/10,0)'],
  ]);
  sh.getRange(20,1).setValue('Copy-ready for caterer — pull these counts after the RSVP deadline.').setFontColor(T.muted).setFontStyle('italic').setFontSize(9);
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 160);
  sh.setTabColor(T.teal);
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
function buildDashboardMetrics(ss) {
  var sh = freshSheet(ss, 'Dashboard Metrics'); paintAll(sh, 30, 4);
  panelTitle(sh, 'DASHBOARD METRICS', T.muted);
  metricBlock(sh, 3, [
    ['Days to event',       "=IFERROR('Settings'!B3-TODAY(),\"\")"],
    ['Guests confirmed',    "='RSVP'!B4"],
    ['Response rate',       "='RSVP'!B8"],
    ['Vendors confirmed',   '=COUNTIF(\'Vendors\'!C2:C,"Confirmed")&" / "&COUNTA(\'Vendors\'!A2:A)'],
    ['Budget estimated',    '=SUM(\'Budget\'!B2:B)'],
    ['Budget committed',    '=SUM(\'Budget\'!C2:C)'],
    ['Spent to date',       '=SUM(\'Budget\'!D2:D)'],
    ['Balance due (vendors)','=SUM(\'Vendors\'!H2:H)'],
    ['Payments overdue',    '=SUMPRODUCT((\'Payments\'!D2:D<TODAY())*(\'Payments\'!D2:D<>"")*(\'Payments\'!E2:E<>"Paid"))'],
    ['Tasks open',          '=COUNTIF(\'Tasks\'!E2:E,FALSE)'],
    ['Tasks overdue',       '=SUMPRODUCT((\'Tasks\'!D2:D<TODAY())*(\'Tasks\'!D2:D<>"")*(\'Tasks\'!E2:E=FALSE))'],
  ]);
  sh.getRange(5,2).setNumberFormat('0%');
  [7,8,9,10].forEach(function(r){ sh.getRange(r,2).setNumberFormat('$#,##0'); });
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 200);
  sh.setTabColor(T.muted);
}

// ─── Event Overview ───────────────────────────────────────────────────────────
function buildEventOverview(ss) {
  var sh = freshSheet(ss, 'Event Overview'); paintAll(sh, 24, 4);
  panelTitle(sh, 'EVENT OVERVIEW', T.accent);
  metricBlock(sh, 3, [
    ['Event',        "='Settings'!B2"],
    ['Date',         "='Settings'!B3"],
    ['Venue',        "='Settings'!B4"],
    ['Capacity',     "='Settings'!B5"],
    ['Planner',      "='Settings'!B6"],
    ['Confirmed',    "='RSVP'!B4"],
    ['Est. attending',"='RSVP'!B9"],
    ['Vendors',      '=COUNTA(\'Vendors\'!A2:A)'],
    ['Budget',       '=SUM(\'Budget\'!B2:B)'],
  ]);
  sh.getRange(4,2).setNumberFormat('mmm d, yyyy'); sh.getRange(12,2).setNumberFormat('$#,##0');
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 240);
  sh.setTabColor(T.accent);
}

// ─── COMMAND CENTER (cockpit) ─────────────────────────────────────────────────
function buildCommandCenter(ss) {
  var sh = freshSheet(ss, 'Command Center'); paintAll(sh, 40, 6);
  sh.setColumnWidth(1, 30); sh.setColumnWidth(2, 230); sh.setColumnWidth(3, 150);
  sh.setColumnWidth(4, 30); sh.setColumnWidth(5, 230); sh.setColumnWidth(6, 150);

  sh.getRange(1,1,1,6).merge().setFormula("=\'Settings\'!B2")
    .setFontColor(T.text).setFontWeight('bold').setFontSize(16).setBackground(T.title).setVerticalAlignment('middle');
  sh.setRowHeight(1, 44);
  sh.getRange(2,1,1,6).merge().setFormula('="◷ "&IFERROR(\'Settings\'!B3-TODAY(),"?")&" days to event · "&TEXT(\'Settings\'!B3,"mmm d, yyyy")&" · "&\'Settings\'!B4')
    .setFontColor(T.accent).setFontWeight('bold').setFontSize(11).setBackground(T.title);
  sh.setRowHeight(2, 26);

  // two columns of metric groups
  cmdGroup(sh, 4, 2, 'RSVP & GUESTS', T.accent, [
    ['Confirmed', "='RSVP'!B4"],
    ['Response rate', "='RSVP'!B8"],
    ['No response', "='RSVP'!B7"],
    ['Meal gaps', "='Meals'!B"+ (3+5) ], // computed below uses fixed; safe fallback
  ]);
  // simpler explicit meal gap ref:
  sh.getRange(7,3).setFormula('=COUNTIFS(\'Guests\'!D2:D,"Yes",\'Guests\'!E2:E,"")');

  cmdGroup(sh, 4, 5, 'BUDGET & PAYMENTS', T.warn, [
    ['Committed', '=SUM(\'Budget\'!C2:C)'],
    ['Spent', '=SUM(\'Budget\'!D2:D)'],
    ['Vendor balance due', '=SUM(\'Vendors\'!H2:H)'],
    ['Payments overdue', "='Dashboard Metrics'!B11"],
  ]);
  [5,6,7].forEach(function(r){ sh.getRange(r,6).setNumberFormat('$#,##0'); });
  sh.getRange(5,3).setNumberFormat('$#,##0');

  cmdGroup(sh, 10, 2, 'VENDORS', T.teal, [
    ['Confirmed', '=COUNTIF(\'Vendors\'!C2:C,"Confirmed")'],
    ['Unconfirmed', '=COUNTA(\'Vendors\'!A2:A)-COUNTIF(\'Vendors\'!C2:C,"Confirmed")'],
    ['Run-of-show conflicts', '=COUNTIF(\'Run of Show\'!I2:I,"⚠ overlap")'],
  ]);
  cmdGroup(sh, 10, 5, 'TASKS & TIMELINE', T.accent, [
    ['Tasks open', '=COUNTIF(\'Tasks\'!E2:E,FALSE)'],
    ['Tasks overdue', "='Dashboard Metrics'!B12"],
    ['Pending approvals', '=COUNTIF(\'Client Updates\'!F2:F,"Pending")'],
  ]);

  // ── Operational warnings (live) ──
  var wr = 15;
  sh.getRange(wr,2,1,5).merge().setValue('⚠  OPERATIONAL WARNINGS').setFontColor(T.danger).setFontWeight('bold').setFontSize(10).setBackground(T.title);
  var warnFormula =
    '=TEXTJOIN(CHAR(10),TRUE,' +
    'IF(\'RSVP\'!B8<0.5,"• RSVP response under 50%",""),' +
    'IF(COUNTIFS(\'Guests\'!D2:D,"Yes",\'Guests\'!E2:E,"")>0,"• Meal selections missing for confirmed guests",""),' +
    'IF(COUNTA(\'Vendors\'!A2:A)-COUNTIF(\'Vendors\'!C2:C,"Confirmed")>0,"• Unconfirmed vendors remain",""),' +
    'IF(\'Dashboard Metrics\'!B11>0,"• Payments overdue",""),' +
    'IF(\'Dashboard Metrics\'!B12>0,"• Tasks overdue",""),' +
    'IF(COUNTIF(\'Run of Show\'!I2:I,"⚠ overlap")>0,"• Run-of-show arrival conflicts",""),' +
    'IF(\'RSVP\'!B9>\'Settings\'!B5,"• Estimated attendance exceeds venue capacity",""),' +
    'IF(COUNTIF(\'Client Updates\'!F2:F,"Pending")>0,"• Client approvals pending",""))';
  sh.getRange(wr+1,2,8,5).merge().setFormula('=IF(' + warnFormula + '="","✓ All clear — no operational warnings.",' + warnFormula + ')')
    .setFontColor(T.text).setVerticalAlignment('top').setWrap(true).setBackground(T.surface);
  sh.setTabColor(T.accent);
}

function cmdGroup(sh, row, col, title, accent, items) {
  sh.getRange(row, col, 1, 2).merge().setValue(title).setFontColor(accent).setFontWeight('bold').setFontSize(9).setBackground(T.title);
  items.forEach(function (it, i){
    var r = row + 1 + i;
    sh.getRange(r, col).setValue(it[0]).setFontColor(T.muted).setFontSize(10);
    var c = sh.getRange(r, col+1); c.setFormula(it[1]).setFontColor(T.text).setFontWeight('bold').setHorizontalAlignment('right');
  });
}

// ─── small panel helpers ──────────────────────────────────────────────────────
function panelTitle(sh, label, accent) {
  sh.getRange(1,1,1,3).merge().setValue(label).setFontColor(accent).setFontWeight('bold').setFontSize(13).setBackground(T.title).setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
}
function metricBlock(sh, startRow, items) {
  items.forEach(function (it, i){
    var r = startRow + i;
    sh.getRange(r,1).setValue(it[0]).setFontColor(T.muted).setFontSize(10);
    var c = sh.getRange(r,2); c.setFormula(it[1]).setFontColor(T.text).setFontWeight('bold');
  });
}

// ─── tab order ────────────────────────────────────────────────────────────────
function orderTabs(ss) {
  var order = ['Command Center','Event Overview','Guests','Households','RSVP','Meals','Vendors',
    'Preferred Vendors','Vendor Performance','Budget','Payments','Timeline','Run of Show','Tasks',
    'Client Updates','Internal Notes','F&B Summary','Venue & Logistics','Dashboard Metrics','Settings'];
  order.forEach(function (name, i){ var sh = ss.getSheetByName(name); if (sh) ss.setActiveSheet(sh), ss.moveActiveSheet(i + 1); });
}
