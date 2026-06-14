// Event Intelligence Engine — backward-solve core (family-agnostic).
// One algorithm; the graph data per family makes it wedding / corporate / etc.
// Imported by the app (the Next-Step Spine) and the CLI/backtest scripts.
// ESM (.mjs): webpack bundles it and node loads it as a module — both import the
// canonical taxonomy below as real ESM (no CJS module.exports anywhere in the engine).
// Node tuple: [id, name, offset, duration, deps[], owner, gate, firesRule?, shield?]
//   offset = days before D it must COMPLETE (negative = days after D); duration = working days.
import * as taxonomy from './eventTaxonomy.mjs';

const DAY = 86400000;
const d = (D, days) => new Date(D.getTime() - days * DAY);
const daysBetween = (a, b) => Math.round((a - b) / DAY);

const WEDDING = [
  ['date_budget','Set the date & budget',400,14,[],'client',true],
  ['venue','Book & confirm venue',380,14,['date_budget'],'client',true,'celebrate'],
  ['guestlist_draft','Draft guest list',370,21,['date_budget'],'client',false,'client-accountability'],
  ['photographer','Book photographer',360,7,['venue'],'client',false,'vendor-chase'],
  ['deposits','Vendor deposits paid',360,1,['venue'],'client',false],
  ['caterer','Book caterer',300,14,['venue'],'client',true,'vendor-chase'],
  ['officiant','Book officiant',280,7,['venue','date_budget'],'client',true,'vendor-chase'],
  ['band_dj','Book band/DJ',280,10,['venue'],'client',false,'vendor-chase'],
  ['florist','Book florist',250,10,['venue'],'client',false,'vendor-chase'],
  ['attire_order','Order wedding attire',240,90,['date_budget'],'client',false,'client-accountability'],
  ['save_the_dates','Send save-the-dates',240,14,['guestlist_draft','venue'],'client',false,'celebrate'],
  ['cake','Book cake/dessert',180,7,['venue','caterer'],'client',false,'vendor-chase'],
  ['hmua','Book hair & makeup',180,7,['venue'],'client',false,'vendor-chase'],
  ['rentals','Book rentals',150,14,['venue','caterer'],'you',false,'vendor-chase'],
  ['tasting','Menu tasting',120,1,['caterer'],'client',false,'celebrate'],
  ['transport','Book transportation',120,7,['venue'],'client',false,'vendor-chase'],
  ['invitations_design','Design & order invitations',120,21,['guestlist_draft'],'client',false,'client-accountability'],
  ['guestlist_final','Finalize guest list',100,14,['guestlist_draft'],'client',true,'client-accountability'],
  ['invitations_sent','Mail invitations',75,7,['invitations_design','guestlist_final'],'client',false,'celebrate'],
  ['floral_signoff','Approve the floral vision',30,7,['florist'],'client',false,'client-accountability'],
  ['coi_collection','Collect vendor COIs',30,14,['venue','caterer','band_dj','florist','photographer','rentals'],'vendor',true,'vendor-chase',true],
  ['rsvp_close','RSVP / final headcount',28,1,['invitations_sent'],'client',true,'client-accountability'],
  ['timeline_ros','Build day-of run-of-show',21,10,['photographer','caterer','band_dj','florist','officiant'],'you',false],
  ['attire_fitting','Final attire fitting',21,7,['attire_order'],'client',false,'client-accountability'],
  ['final_count_caterer','Final headcount to caterer',14,1,['rsvp_close'],'you',true,'vendor-chase'],
  ['seating_chart','Build seating chart',12,7,['rsvp_close'],'client',false,'reassurance'],
  ['final_payments','Final vendor balances',10,5,['caterer','band_dj','florist','photographer'],'client',true,'vendor-chase'],
  ['reconfirm_pass','T-72h Dock & Reconfirm',3,2,['timeline_ros','coi_collection','final_count_caterer'],'you',true,null,true],
  ['loadin_setup','Load-in & setup',0,1,['reconfirm_pass','coi_collection'],'vendor',true,null,true],
  ['event','The wedding day',0,1,['loadin_setup','seating_chart','final_payments','attire_fitting'],'you',true,'celebrate'],
];

const CORPORATE = [
  ['objective_signoff','Define objective + sponsor sign-off',180,7,[],'you',true,'manage-up'],
  ['budget_approval','Secure budget approval',165,14,['objective_signoff'],'sponsor',true,'manage-up',true],
  ['venue_date','Set date + secure venue',150,14,['budget_approval'],'you',true,'celebrate'],
  ['speakers_confirm','Confirm keynote / speakers',140,21,['venue_date','objective_signoff'],'sponsor',true,'diplomatic-chase'],
  ['av_production','Book AV / production',120,14,['venue_date'],'you',false,'vendor-chase'],
  ['agenda_ros_v1','Lock agenda / run-of-show v1',90,14,['speakers_confirm'],'you',false],
  ['catering','Book catering',90,10,['venue_date'],'you',false,'vendor-chase'],
  ['registration_live','Registration site live',75,14,['agenda_ros_v1'],'you',true,'celebrate'],
  ['invites_open_reg','Open registration',60,7,['registration_live'],'you',false],
  ['swag','Order swag / printed materials',60,21,['budget_approval'],'you',false,'vendor-chase'],
  ['speaker_content','Speaker decks delivered',21,14,['agenda_ros_v1'],'speaker',true,'diplomatic-chase',true],
  ['vendor_coi','Collect vendor COIs',21,14,['venue_date','av_production','catering'],'vendor',true,'vendor-chase',true],
  ['registration_close','Registration close / headcount',14,1,['invites_open_reg'],'you',true],
  ['ros_lock','Run-of-show LOCK',14,5,['speaker_content','av_production','agenda_ros_v1'],'you',true,'planner-calm'],
  ['exec_dryrun','Exec sanity-check / dry run',10,2,['ros_lock'],'you',false,'manage-up'],
  ['final_count_catering','Final headcount to catering',10,1,['registration_close'],'you',true,'vendor-chase'],
  ['attendee_packet','Attendee comms / logistics',7,3,['registration_close'],'you',false],
  ['tech_rehearsal','Tech check / rehearsal',3,1,['ros_lock','av_production'],'you',false,'planner-calm'],
  ['reconfirm_pass','T-72h reconfirm pass',3,2,['ros_lock','vendor_coi','final_count_catering'],'you',true,null,true],
  ['loadin','Load-in & setup',0,1,['reconfirm_pass','vendor_coi'],'vendor',true,null,true],
  ['event','The event / day-of',0,1,['loadin','attendee_packet'],'you',true],
  ['roi_report','Post-event ROI report to leadership',-7,5,['event'],'you',true,'manage-up'],
  ['program_debrief','Debrief + program-memory capture',-14,5,['event'],'you',false,'reflect'],
];

// GALA / FUNDRAISER — the revenue IS the event. Sponsorship + auction + donor
// stewardship, not a party. Tail includes tax-acknowledgment (IRS / donor trust).
const GALA = [
  ['fundraising_goal','Set fundraising goal + gala format',210,10,[],'board',true,'manage-up'],
  ['case_for_support','Build case for support + sponsorship deck',195,14,['fundraising_goal'],'dev',false,'manage-up'],
  ['venue_gala','Secure venue',190,14,['fundraising_goal'],'events',true,'celebrate'],
  ['sponsor_outreach','Launch sponsor + table-captain outreach',165,45,['case_for_support','venue_gala'],'dev',true,'donor-ask'],
  ['honoree_confirm','Confirm honoree(s) + keynote',150,21,['venue_gala'],'dev',true,'diplomatic-chase'],
  ['auctioneer_mc','Confirm auctioneer / MC',120,14,['venue_gala'],'events',false,'vendor-chase'],
  ['catering_gala','Book catering',120,14,['venue_gala'],'events',false,'vendor-chase'],
  ['av_gala','Book AV / livestream',120,14,['venue_gala'],'events',false,'vendor-chase'],
  ['ticket_sales_open','Open ticket + table sales',120,7,['venue_gala','honoree_confirm'],'marketing',true,'celebrate'],
  ['auction_procurement','Procure auction items (silent + live)',90,45,['sponsor_outreach'],'dev',false,'donor-ask'],
  ['decor_gala','Confirm décor + centerpieces',75,14,['venue_gala'],'events',false,'vendor-chase'],
  ['program_design','Design program + paddle-raise script',45,14,['honoree_confirm','auctioneer_mc'],'events',false,'planner-calm'],
  ['mobile_bidding','Set up mobile bidding / bid sheets',30,10,['auction_procurement'],'av',false],
  ['table_assignments','Seating + table assignments (sponsors first)',21,7,['ticket_sales_open'],'events',true,'reassurance'],
  ['vendor_coi_gala','Collect vendor COIs',21,14,['venue_gala','av_gala','catering_gala'],'vendor',true,'vendor-chase',true],
  ['run_of_show_lock','Lock event-day schedule with MC/presenters',14,5,['program_design'],'events',true,'planner-calm'],
  ['catering_count_gala','Final catering count',14,1,['table_assignments'],'events',true,'vendor-chase'],
  ['final_payments_gala','Final vendor balances',10,5,['venue_gala','catering_gala','av_gala'],'events',true,'vendor-chase'],
  ['rehearsal_gala','Sound check + auction run-through',3,1,['run_of_show_lock','av_gala'],'events',false,'planner-calm'],
  ['loadin_gala','Load-in & setup',0,1,['vendor_coi_gala','run_of_show_lock'],'vendor',true,null,true],
  ['event','The gala',0,1,['loadin_gala','table_assignments','final_payments_gala'],'events',true,'celebrate'],
  ['tax_receipts','Send tax-acknowledgment letters',-14,7,['event'],'dev',true,'manage-up'],
  ['donor_thankyou','Donor thank-you + impact report',-21,10,['event'],'dev',false,'reflect'],
];

// QUINCEAÑERA — Latina coming-of-age: a Mass (liturgy) + reception, an honor
// court (damas/chambelanes), padrinos (sponsors), the vals, and symbolic objects.
const QUINCEANERA = [
  ['vision_budget','Set date, budget + padrinos plan',300,14,[],'family',true,'celebrate'],
  ['church_mass','Reserve church + confirm Mass / priest',270,14,['vision_budget'],'family',true,'celebrate'],
  ['venue_quince','Book reception venue',270,14,['vision_budget'],'family',true],
  ['padrinos_confirm','Confirm padrinos (sponsors)',210,30,['vision_budget'],'family',true,'diplomatic-chase'],
  ['court_formation','Form the court — damas & chambelanes',210,21,['vision_budget'],'quinceañera',false,'client-accountability'],
  ['dress_order','Order the gown (vestido)',180,90,['vision_budget'],'family',false,'client-accountability'],
  ['photographer_quince','Book photo + video',160,7,['venue_quince'],'family',false,'vendor-chase'],
  ['caterer_quince','Book caterer',160,14,['venue_quince'],'family',true,'vendor-chase'],
  ['dj_quince','Book DJ / música',150,10,['venue_quince'],'family',false,'vendor-chase'],
  ['choreographer','Book choreographer for the vals',150,7,['court_formation'],'family',false,'vendor-chase'],
  ['court_attire','Coordinate court attire',120,30,['court_formation'],'quinceañera',false,'client-accountability'],
  ['invitations_quince','Order + send invitations',90,21,['venue_quince'],'family',false,'celebrate'],
  ['cake_quince','Order cake (pastel)',75,7,['venue_quince','caterer_quince'],'padrino',false,'vendor-chase'],
  ['ceremony_items','Acquire tiara, last doll, shoes, scepter',60,14,['padrinos_confirm'],'madrina',false,'celebrate'],
  ['choreo_rehearsals','Vals + surprise-dance rehearsals',45,30,['choreographer','court_formation'],'choreographer',false,'client-accountability'],
  ['rsvp_quince','RSVP / final count',28,1,['invitations_quince'],'family',true,'client-accountability'],
  ['vendor_coi_quince','Collect vendor COIs',21,14,['venue_quince','caterer_quince'],'vendor',true,'vendor-chase',true],
  ['final_count_caterer_q','Final headcount to caterer',14,1,['rsvp_quince'],'family',true,'vendor-chase'],
  ['final_payments_quince','Final vendor balances',10,5,['venue_quince','caterer_quince','dj_quince','photographer_quince'],'family',true,'vendor-chase'],
  ['mass_rehearsal','Mass + processional rehearsal',5,1,['choreo_rehearsals'],'family',false,'celebrate'],
  ['loadin_quince','Load-in & setup',0,1,['vendor_coi_quince','final_count_caterer_q'],'vendor',true,null,true],
  ['event','La Quinceañera',0,1,['loadin_quince','final_payments_quince','mass_rehearsal'],'family',true,'celebrate'],
];

// BOARD MEETING — governance, not a party. Bylaws notice, quorum, board packet,
// fiduciary minutes. The binding risks are quorum, packet lead-time, and the record.
const BOARD = [
  ['meeting_notice','Issue official meeting notice (per bylaws)',45,3,[],'secretary',true,'manage-up'],
  ['date_quorum','Confirm date + quorum availability',45,7,[],'chair',true,'diplomatic-chase'],
  ['venue_room','Reserve boardroom / hybrid setup',30,5,['date_quorum'],'coordinator',true],
  ['agenda_draft','Draft agenda with the Chair',21,7,['date_quorum'],'secretary',true,'manage-up'],
  ['financials_ready','Treasurer reports / financials ready',18,10,['agenda_draft'],'treasurer',true,'diplomatic-chase'],
  ['resolutions_prep','Prepare resolutions / motions for vote',14,7,['agenda_draft'],'secretary',false,'manage-up'],
  ['prior_minutes','Circulate prior minutes for approval',14,2,['agenda_draft'],'secretary',false],
  ['board_packet','Compile + distribute board packet',10,5,['agenda_draft','financials_ready'],'secretary',true,'manage-up'],
  ['av_hybrid','Confirm AV / video conferencing',7,3,['venue_room'],'coordinator',false,'planner-calm'],
  ['quorum_confirm','Confirm attendance / quorum secured',7,2,['board_packet'],'secretary',true,'diplomatic-chase'],
  ['catering_board','Arrange catering / refreshments',7,2,['venue_room'],'coordinator',false,'vendor-chase'],
  ['materials_print','Print packets / prepare materials',3,1,['board_packet'],'coordinator',false],
  ['tech_check_board','Tech check for hybrid',1,1,['av_hybrid'],'coordinator',false,'planner-calm'],
  ['event','Board meeting',0,1,['quorum_confirm','materials_print','tech_check_board'],'chair',true],
  ['minutes_draft','Draft + circulate minutes',-7,5,['event'],'secretary',true,'manage-up'],
  ['action_items','Distribute action items / resolutions',-3,2,['event'],'secretary',false],
  ['minutes_approval','Minutes ratified next session',-30,1,['minutes_draft'],'secretary',false,'reflect'],
];

// HOLIDAY PARTY — corporate morale, not content. No speakers/registration; the
// risks are December venue scarcity, headcount, and the recognition program.
const HOLIDAY_PARTY = [
  ['hp_objective','Set date, headcount + budget approval',120,10,[],'you',true,'manage-up'],
  ['hp_venue','Book venue (December books out fast)',110,14,['hp_objective'],'you',true,'celebrate'],
  ['hp_catering','Book catering + bar',90,14,['hp_venue'],'you',true,'vendor-chase'],
  ['hp_entertainment','Book entertainment / DJ / band',80,10,['hp_venue'],'you',false,'vendor-chase'],
  ['hp_theme','Lock theme + décor',75,14,['hp_venue'],'you',false],
  ['hp_av','Book AV / photo booth',70,7,['hp_venue'],'you',false,'vendor-chase'],
  ['hp_invites','Send invitations + RSVP',60,7,['hp_venue'],'you',false,'celebrate'],
  ['hp_awards','Plan awards / recognition program',45,10,['hp_objective'],'you',false,'manage-up'],
  ['hp_gifts','Order gifts / swag / favors',45,21,['hp_objective'],'you',false,'vendor-chase'],
  ['hp_dietary','Collect dietary restrictions',30,7,['hp_invites'],'you',false],
  ['hp_rsvp_close','RSVP close / final headcount',21,1,['hp_invites'],'you',true,'client-accountability'],
  ['hp_coi','Collect vendor COIs',21,14,['hp_venue','hp_catering'],'vendor',true,'vendor-chase',true],
  ['hp_run_of_show','Build run-of-show + program',14,5,['hp_awards','hp_entertainment'],'you',true,'planner-calm'],
  ['hp_final_count','Final count to catering',10,1,['hp_rsvp_close'],'you',true,'vendor-chase'],
  ['hp_final_pay','Final vendor balances',10,5,['hp_venue','hp_catering'],'you',true,'vendor-chase'],
  ['hp_loadin','Load-in & setup',0,1,['hp_coi','hp_run_of_show'],'vendor',true,null,true],
  ['event','The holiday party',0,1,['hp_loadin','hp_final_count','hp_final_pay'],'you',true,'celebrate'],
];

// SWEET 16 — teen milestone. Parents fund, the teen owns the vision; court of
// friends, special dances, candle-lighting. Social-forward, not a wedding.
const SWEET16 = [
  ['s16_vision','Set date, budget + theme with the teen',150,14,[],'parent',true,'client-accountability'],
  ['s16_venue','Book venue',135,14,['s16_vision'],'parent',true],
  ['s16_guestlist','Build guest list (teen + family)',130,14,['s16_vision'],'teen',false,'client-accountability'],
  ['s16_dj','Book DJ / music',120,10,['s16_venue'],'parent',false,'vendor-chase'],
  ['s16_photo','Book photo / video / 360 booth',120,7,['s16_venue'],'parent',false,'vendor-chase'],
  ['s16_catering','Book catering',110,14,['s16_venue'],'parent',true,'vendor-chase'],
  ['s16_theme','Lock theme, décor + color story',105,14,['s16_venue'],'teen',false],
  ['s16_attire','Order the dress / outfit',100,45,['s16_vision'],'teen',false,'client-accountability'],
  ['s16_court','Confirm friend court / special dances',90,21,['s16_guestlist'],'teen',false,'client-accountability'],
  ['s16_entertainment','Book entertainment (host / games / MC)',75,10,['s16_venue'],'parent',false,'vendor-chase'],
  ['s16_invites','Send invitations + RSVP',60,7,['s16_guestlist'],'parent',false,'celebrate'],
  ['s16_cake','Order cake + dessert',45,7,['s16_venue'],'parent',false,'vendor-chase'],
  ['s16_candle','Plan candle-lighting / montage',30,14,['s16_court'],'teen',false,'celebrate'],
  ['s16_rsvp_close','RSVP close / final count',21,1,['s16_invites'],'parent',true,'client-accountability'],
  ['s16_coi','Collect vendor COIs',21,14,['s16_venue','s16_catering'],'vendor',true,'vendor-chase',true],
  ['s16_run_of_show','Build run-of-show with DJ / MC',14,5,['s16_dj','s16_candle'],'parent',true,'planner-calm'],
  ['s16_final_count','Final count to catering',10,1,['s16_rsvp_close'],'parent',true,'vendor-chase'],
  ['s16_final_pay','Final vendor balances',10,5,['s16_venue','s16_catering','s16_dj'],'parent',true,'vendor-chase'],
  ['s16_loadin','Load-in & setup',0,1,['s16_coi','s16_run_of_show'],'vendor',true,null,true],
  ['event','The Sweet 16',0,1,['s16_loadin','s16_final_count','s16_final_pay'],'parent',true,'celebrate'],
];

// BIRTHDAY PARTY — milestone celebration, short runway, flexible scale.
const BIRTHDAY = [
  ['bd_vision','Set date, budget + guest count',75,7,[],'host',true],
  ['bd_venue','Book venue / location',70,10,['bd_vision'],'host',true],
  ['bd_guestlist','Build guest list',68,7,['bd_vision'],'host',false],
  ['bd_catering','Book catering / food plan',55,10,['bd_venue'],'host',false,'vendor-chase'],
  ['bd_entertainment','Book entertainment / activity',50,10,['bd_venue'],'host',false,'vendor-chase'],
  ['bd_theme','Lock theme + décor',45,10,['bd_venue'],'host',false],
  ['bd_cake','Order cake + dessert',30,7,['bd_venue'],'host',false,'vendor-chase'],
  ['bd_invites','Send invitations + RSVP',30,5,['bd_guestlist'],'host',false,'celebrate'],
  ['bd_favors','Order favors / supplies',21,10,['bd_theme'],'host',false],
  ['bd_rsvp_close','RSVP close / final count',10,1,['bd_invites'],'host',true,'client-accountability'],
  ['bd_final_count','Final count to catering',7,1,['bd_rsvp_close'],'host',true,'vendor-chase'],
  ['bd_final_pay','Final vendor balances',5,3,['bd_venue','bd_catering'],'host',true,'vendor-chase'],
  ['bd_loadin','Setup',0,1,['bd_final_count','bd_final_pay'],'host',true,null,true],
  ['event','The birthday party',0,1,['bd_loadin'],'host',true,'celebrate'],
];

// BABY SHOWER — host-driven FOR the parent-to-be (not by them). Registry + games
// + gift logistics; the parent-to-be only owns the guest list and registry.
const BABY_SHOWER = [
  ['bs_host','Confirm host + date with parent-to-be',60,7,[],'host',true,'reassurance'],
  ['bs_venue','Book venue / home setup',55,10,['bs_host'],'host',true],
  ['bs_guestlist','Get guest list from parent-to-be',53,7,['bs_host'],'parent',false,'client-accountability'],
  ['bs_registry','Confirm registry is live + linked',50,3,['bs_host'],'parent',false,'client-accountability'],
  ['bs_theme','Lock theme + color story',45,10,['bs_venue'],'host',false],
  ['bs_catering','Plan catering / brunch / cake',40,10,['bs_venue'],'host',false,'vendor-chase'],
  ['bs_invites','Send invitations + RSVP',35,5,['bs_guestlist','bs_theme'],'host',false,'celebrate'],
  ['bs_games','Plan games + activities',30,7,['bs_theme'],'host',false],
  ['bs_favors','Order favors + décor',28,10,['bs_theme'],'host',false],
  ['bs_gifts','Plan gift logistics / transport home',14,3,['bs_registry'],'host',false,'reassurance'],
  ['bs_rsvp_close','RSVP close / final count',10,1,['bs_invites'],'host',true],
  ['bs_final_count','Final count to catering',5,1,['bs_rsvp_close'],'host',true,'vendor-chase'],
  ['bs_loadin','Setup',0,1,['bs_final_count'],'host',true,null,true],
  ['event','The baby shower',0,1,['bs_loadin'],'host',true,'celebrate'],
];

// BRIDAL SHOWER — host-driven for the engaged; registry ties to the wedding;
// guest list is a subset of the wedding list (must clear with the couple).
const BRIDAL_SHOWER = [
  ['brs_host','Confirm host + date (clear with couple)',60,7,[],'host',true,'reassurance'],
  ['brs_venue','Book venue / home setup',55,10,['brs_host'],'host',true],
  ['brs_guestlist','Get guest list (subset of wedding list)',53,7,['brs_host'],'honoree',false,'client-accountability'],
  ['brs_registry','Confirm registry is live + linked',50,3,['brs_host'],'honoree',false,'client-accountability'],
  ['brs_theme','Lock theme + color story',45,10,['brs_venue'],'host',false],
  ['brs_catering','Plan catering / brunch / cake',40,10,['brs_venue'],'host',false,'vendor-chase'],
  ['brs_invites','Send invitations + RSVP',35,5,['brs_guestlist','brs_theme'],'host',false,'celebrate'],
  ['brs_games','Plan games + activities',30,7,['brs_theme'],'host',false],
  ['brs_favors','Order favors + décor',28,10,['brs_theme'],'host',false],
  ['brs_gifts','Plan gift logistics / transport',14,3,['brs_registry'],'host',false,'reassurance'],
  ['brs_rsvp_close','RSVP close / final count',10,1,['brs_invites'],'host',true],
  ['brs_final_count','Final count to catering',5,1,['brs_rsvp_close'],'host',true,'vendor-chase'],
  ['brs_loadin','Setup',0,1,['brs_final_count'],'host',true,null,true],
  ['event','The bridal shower',0,1,['brs_loadin'],'host',true,'celebrate'],
];

// GRADUATION PARTY — open-house flow; grad-season date conflicts make EARLY
// invitations the binding risk; catering sized for drop-in volume, not a seated count.
const GRADUATION = [
  ['gr_vision','Set date, budget + open-house window',75,7,[],'family',true,'client-accountability'],
  ['gr_venue','Confirm location (home / hall)',70,10,['gr_vision'],'family',true],
  ['gr_guestlist','Build guest list',68,7,['gr_vision'],'family',false],
  ['gr_invites','Order + send invitations EARLY (grad-season conflicts)',55,7,['gr_guestlist'],'family',false,'celebrate'],
  ['gr_catering','Plan catering (open-house volume flow)',55,14,['gr_venue'],'family',false,'vendor-chase'],
  ['gr_photo','Plan photo display / memory table',45,14,['gr_vision'],'grad',false],
  ['gr_rentals','Book rentals (tent / tables / chairs)',45,10,['gr_venue'],'family',false,'vendor-chase'],
  ['gr_theme','Lock school colors + décor',40,10,['gr_venue'],'grad',false],
  ['gr_cake','Order cake + desserts',30,7,['gr_venue'],'family',false,'vendor-chase'],
  ['gr_favors','Order favors / grad supplies',21,10,['gr_theme'],'family',false],
  ['gr_rsvp_close','RSVP / headcount estimate',14,1,['gr_invites'],'family',true,'client-accountability'],
  ['gr_final_count','Final count to catering',7,1,['gr_rsvp_close'],'family',true,'vendor-chase'],
  ['gr_final_pay','Final vendor balances',5,3,['gr_venue','gr_catering'],'family',true,'vendor-chase'],
  ['gr_loadin','Setup',0,1,['gr_final_count','gr_final_pay'],'family',true,null,true],
  ['event','The graduation party',0,1,['gr_loadin'],'family',true,'celebrate'],
];

// ENGAGEMENT PARTY — host-thrown celebration of the engagement; the couple owns
// the guest list, the host owns the party. Short runway, announcement moment.
const ENGAGEMENT_PARTY = [
  ['ep_vision','Set date, budget + guest count',75,7,[],'host',true],
  ['ep_venue','Book venue / location',70,10,['ep_vision'],'host',true],
  ['ep_guestlist','Build guest list with couple',68,7,['ep_vision'],'couple',false,'client-accountability'],
  ['ep_catering','Book catering / bar',55,10,['ep_venue'],'host',false,'vendor-chase'],
  ['ep_photo','Book photographer',50,7,['ep_venue'],'host',false,'vendor-chase'],
  ['ep_theme','Lock theme + décor',45,10,['ep_venue'],'host',false],
  ['ep_cake','Order cake + dessert',30,7,['ep_venue'],'host',false,'vendor-chase'],
  ['ep_invites','Send invitations + RSVP',30,5,['ep_guestlist'],'host',false,'celebrate'],
  ['ep_toasts','Coordinate toasts / announcement moment',21,7,['ep_guestlist'],'host',false,'celebrate'],
  ['ep_rsvp_close','RSVP close / final count',10,1,['ep_invites'],'host',true,'client-accountability'],
  ['ep_final_count','Final count to catering',7,1,['ep_rsvp_close'],'host',true,'vendor-chase'],
  ['ep_final_pay','Final vendor balances',5,3,['ep_venue','ep_catering'],'host',true,'vendor-chase'],
  ['ep_loadin','Setup',0,1,['ep_final_count','ep_final_pay'],'host',true,null,true],
  ['event','The engagement party',0,1,['ep_loadin'],'host',true,'celebrate'],
];

// VOW RENEWAL — a mini-wedding: ceremony + reception, celebrant (no marriage
// license), renewed vows. Often a milestone-anniversary event.
const VOW_RENEWAL = [
  ['vr_vision','Set date, budget + guest count',120,10,[],'couple',true],
  ['vr_venue','Book venue',110,14,['vr_vision'],'couple',true],
  ['vr_officiant','Confirm officiant / celebrant',100,7,['vr_venue'],'couple',false,'vendor-chase'],
  ['vr_guestlist','Build guest list',95,14,['vr_vision'],'couple',false,'client-accountability'],
  ['vr_catering','Book catering',90,14,['vr_venue'],'couple',true,'vendor-chase'],
  ['vr_photo','Book photographer',85,7,['vr_venue'],'couple',false,'vendor-chase'],
  ['vr_music','Book music / DJ',80,10,['vr_venue'],'couple',false,'vendor-chase'],
  ['vr_florals','Book florals / décor',70,10,['vr_venue'],'couple',false,'vendor-chase'],
  ['vr_vows','Write renewed vows',45,21,['vr_officiant'],'couple',false,'celebrate'],
  ['vr_invites','Send invitations + RSVP',45,7,['vr_guestlist'],'couple',false,'celebrate'],
  ['vr_rsvp_close','RSVP close / final count',21,1,['vr_invites'],'couple',true,'client-accountability'],
  ['vr_coi','Collect vendor COIs',21,14,['vr_venue','vr_catering'],'vendor',true,'vendor-chase',true],
  ['vr_ros','Build ceremony + reception run-of-show',14,7,['vr_officiant','vr_music'],'you',true,'planner-calm'],
  ['vr_final_count','Final count to catering',10,1,['vr_rsvp_close'],'couple',true,'vendor-chase'],
  ['vr_final_pay','Final vendor balances',10,5,['vr_venue','vr_catering'],'couple',true,'vendor-chase'],
  ['vr_loadin','Load-in & setup',0,1,['vr_coi','vr_ros'],'vendor',true,null,true],
  ['event','The vow renewal',0,1,['vr_loadin','vr_final_count','vr_final_pay'],'couple',true,'celebrate'],
];

// ANNIVERSARY — milestone celebration, often a surprise; honoree(s) + tribute.
const ANNIVERSARY = [
  ['an_vision','Set date, budget + guest count',75,7,[],'host',true],
  ['an_venue','Book venue / location',70,10,['an_vision'],'host',true],
  ['an_guestlist','Build guest list',68,7,['an_vision'],'host',false],
  ['an_catering','Book catering / bar',55,10,['an_venue'],'host',false,'vendor-chase'],
  ['an_photo','Book photographer',50,7,['an_venue'],'host',false,'vendor-chase'],
  ['an_music','Book music / entertainment',48,10,['an_venue'],'host',false,'vendor-chase'],
  ['an_theme','Lock theme + décor',45,10,['an_venue'],'host',false],
  ['an_montage','Plan tribute / montage / memory display',40,21,['an_vision'],'host',false,'celebrate'],
  ['an_cake','Order cake + dessert',30,7,['an_venue'],'host',false,'vendor-chase'],
  ['an_invites','Send invitations + RSVP',30,5,['an_guestlist'],'host',false,'celebrate'],
  ['an_rsvp_close','RSVP close / final count',10,1,['an_invites'],'host',true,'client-accountability'],
  ['an_final_count','Final count to catering',7,1,['an_rsvp_close'],'host',true,'vendor-chase'],
  ['an_final_pay','Final vendor balances',5,3,['an_venue','an_catering'],'host',true,'vendor-chase'],
  ['an_loadin','Setup',0,1,['an_final_count','an_final_pay'],'host',true,null,true],
  ['event','The anniversary celebration',0,1,['an_loadin'],'host',true,'celebrate'],
];

// RETIREMENT PARTY — honoree-centered; colleagues + family, speeches/tributes,
// group gift, send-off. The binding risk is lining up speakers + the montage.
const RETIREMENT_PARTY = [
  ['rp_vision','Set date, budget + guest count',60,7,[],'host',true],
  ['rp_venue','Book venue',55,10,['rp_vision'],'host',true],
  ['rp_guestlist','Build guest list (colleagues + family)',53,7,['rp_vision'],'host',false],
  ['rp_catering','Book catering / bar',45,10,['rp_venue'],'host',false,'vendor-chase'],
  ['rp_speakers','Line up speakers / tributes',40,14,['rp_guestlist'],'host',false,'diplomatic-chase'],
  ['rp_photo','Book photographer',38,7,['rp_venue'],'host',false,'vendor-chase'],
  ['rp_montage','Build tribute montage / memory board',35,21,['rp_vision'],'host',false,'celebrate'],
  ['rp_gift','Coordinate group gift / send-off',30,14,['rp_guestlist'],'host',false],
  ['rp_invites','Send invitations + RSVP',30,5,['rp_guestlist'],'host',false,'celebrate'],
  ['rp_cake','Order cake + dessert',21,7,['rp_venue'],'host',false,'vendor-chase'],
  ['rp_ros','Build run-of-show (speech order)',12,5,['rp_speakers'],'host',true,'planner-calm'],
  ['rp_rsvp_close','RSVP close / final count',10,1,['rp_invites'],'host',true,'client-accountability'],
  ['rp_final_count','Final count to catering',7,1,['rp_rsvp_close'],'host',true,'vendor-chase'],
  ['rp_final_pay','Final vendor balances',5,3,['rp_venue','rp_catering'],'host',true,'vendor-chase'],
  ['rp_loadin','Setup',0,1,['rp_final_count','rp_final_pay'],'host',true,null,true],
  ['event','The retirement party',0,1,['rp_loadin'],'host',true,'celebrate'],
];

// REUNION — family/class reunion. Long-lead ATTENDEE OUTREACH is the binding
// constraint (people are hard to find); lodging blocks + multi-day logistics.
const REUNION = [
  ['re_vision','Set date, budget + format',150,14,[],'committee',true],
  ['re_venue','Book venue / block lodging',135,21,['re_vision'],'committee',true],
  ['re_outreach','Locate + contact attendees (long lead)',130,60,['re_vision'],'committee',true,'diplomatic-chase'],
  ['re_registration','Open registration / collect fees',90,30,['re_outreach'],'committee',true,'celebrate'],
  ['re_catering','Book catering / meals',90,14,['re_venue'],'committee',false,'vendor-chase'],
  ['re_activities','Plan activities / itinerary',75,21,['re_venue'],'committee',false],
  ['re_memorabilia','Order shirts / memorabilia / name tags',60,21,['re_outreach'],'committee',false,'vendor-chase'],
  ['re_program','Build program / memory slideshow',45,21,['re_outreach'],'committee',false,'celebrate'],
  ['re_lodging_confirm','Confirm lodging block + transport',45,14,['re_venue'],'committee',false,'vendor-chase'],
  ['re_rsvp_close','Registration close / final count',21,1,['re_registration'],'committee',true,'client-accountability'],
  ['re_final_count','Final count to catering',10,1,['re_rsvp_close'],'committee',true,'vendor-chase'],
  ['re_final_pay','Final vendor balances',7,5,['re_venue','re_catering'],'committee',true,'vendor-chase'],
  ['re_loadin','Setup',0,1,['re_final_count','re_final_pay'],'committee',true,null,true],
  ['event','The reunion',0,1,['re_loadin'],'committee',true,'celebrate'],
];

// PRODUCT LAUNCH — marketing event: messaging, press, demo, registration, hype.
// Tail includes lead follow-up (the launch isn't done when the doors close).
const PRODUCT_LAUNCH = [
  ['pl_objective','Define launch goals + budget approval',120,10,[],'you',true,'manage-up'],
  ['pl_venue','Secure venue / livestream platform',110,14,['pl_objective'],'you',true],
  ['pl_messaging','Lock launch messaging + keynote narrative',95,21,['pl_objective'],'marketing',true,'manage-up'],
  ['pl_press','Build press + influencer list / invites',90,21,['pl_messaging'],'pr',true,'diplomatic-chase'],
  ['pl_registration','Registration site live',75,14,['pl_messaging'],'marketing',true,'celebrate'],
  ['pl_demo','Prepare product demo + run-throughs',75,30,['pl_messaging'],'product',true,'planner-calm'],
  ['pl_av','Book AV / production / livestream',75,14,['pl_venue'],'you',false,'vendor-chase'],
  ['pl_catering','Book catering',60,10,['pl_venue'],'you',false,'vendor-chase'],
  ['pl_invites_open','Open registration / send press invites',60,7,['pl_registration','pl_press'],'marketing',false,'celebrate'],
  ['pl_collateral','Produce collateral / press kit',45,21,['pl_messaging'],'marketing',false,'vendor-chase'],
  ['pl_coi','Collect vendor COIs',21,14,['pl_venue','pl_av'],'vendor',true,'vendor-chase',true],
  ['pl_rehearsal','Keynote + demo rehearsal',14,5,['pl_demo','pl_av'],'you',true,'planner-calm'],
  ['pl_reg_close','Registration close / final count',10,1,['pl_invites_open'],'you',true,'client-accountability'],
  ['pl_final_pay','Final vendor balances',10,5,['pl_venue','pl_av'],'you',true,'vendor-chase'],
  ['pl_loadin','Load-in & setup',0,1,['pl_coi','pl_rehearsal'],'vendor',true,null,true],
  ['event','The product launch',0,1,['pl_loadin','pl_reg_close','pl_final_pay'],'you',true,'celebrate'],
  ['pl_followup','Post-launch press + lead follow-up',-7,10,['event'],'marketing',true,'manage-up'],
];

// TEAM RETREAT — offsite: lodging, travel, facilitation, activities. Travel +
// rooming are the binding logistics; tail is the debrief / action items.
const TEAM_RETREAT = [
  ['tr_objective','Define retreat goals + budget approval',90,10,[],'you',true,'manage-up'],
  ['tr_venue','Book offsite venue + lodging',80,21,['tr_objective'],'you',true],
  ['tr_travel','Arrange travel / transport',70,21,['tr_venue'],'you',true,'vendor-chase'],
  ['tr_agenda','Build agenda / facilitation plan',60,21,['tr_objective'],'you',true,'planner-calm'],
  ['tr_facilitator','Confirm facilitator / activities',60,14,['tr_agenda'],'you',false,'diplomatic-chase'],
  ['tr_catering','Arrange meals / catering',45,14,['tr_venue'],'you',false,'vendor-chase'],
  ['tr_rooming','Collect dietary + rooming preferences',30,10,['tr_travel'],'you',false,'client-accountability'],
  ['tr_materials','Prepare materials / workbooks',21,14,['tr_agenda'],'you',false],
  ['tr_headcount','Confirm attendance / headcount',21,1,['tr_travel'],'you',true,'client-accountability'],
  ['tr_coi','Collect vendor COIs',21,14,['tr_venue'],'vendor',true,'vendor-chase',true],
  ['tr_final_count','Final count to catering / lodging',10,1,['tr_headcount'],'you',true,'vendor-chase'],
  ['tr_final_pay','Final vendor balances',10,5,['tr_venue'],'you',true,'vendor-chase'],
  ['tr_loadin','Arrival / setup',0,1,['tr_coi','tr_materials'],'you',true,null,true],
  ['event','The team retreat',0,1,['tr_loadin','tr_final_count','tr_final_pay'],'you',true,'celebrate'],
  ['tr_debrief','Post-retreat debrief + action items',-7,5,['event'],'you',false,'reflect'],
];

// TOWN HALL — all-hands. Short lead, exec content + AV/streaming + Q&A are the
// risks; tail is posting the recording + follow-ups.
const TOWN_HALL = [
  ['th_objective','Define purpose + exec sponsor',45,5,[],'you',true,'manage-up'],
  ['th_date_venue','Confirm date + venue / stream platform',40,7,['th_objective'],'you',true],
  ['th_content','Collect exec content / slides',30,14,['th_objective'],'you',true,'diplomatic-chase'],
  ['th_av','Book AV / livestream + hybrid',28,7,['th_date_venue'],'you',true,'vendor-chase'],
  ['th_agenda','Lock agenda / run-of-show',21,7,['th_content'],'you',true,'planner-calm'],
  ['th_qa','Set up Q&A / polling / submission',18,7,['th_agenda'],'you',false],
  ['th_comms','Send all-hands invite + calendar hold',18,3,['th_date_venue'],'you',false,'celebrate'],
  ['th_catering','Arrange refreshments (if in person)',14,5,['th_date_venue'],'you',false,'vendor-chase'],
  ['th_rehearsal','Exec rehearsal / dry run',7,2,['th_agenda','th_av'],'you',true,'planner-calm'],
  ['th_tech_check','Tech check / stream test',2,1,['th_av'],'you',true,'planner-calm'],
  ['th_final_pay','Final vendor balances',3,2,['th_av'],'you',false,'vendor-chase'],
  ['th_loadin','Setup',0,1,['th_rehearsal','th_tech_check'],'you',true,null,true],
  ['event','The town hall',0,1,['th_loadin'],'you',true],
  ['th_recording','Post + distribute recording / follow-ups',-3,3,['event'],'you',false,'manage-up'],
];

// TRAINING / WORKSHOP — curriculum-led: facilitator, materials, enrollment,
// certificates. Curriculum lock gates materials; tail is evals + follow-up.
const TRAINING_WORKSHOP = [
  ['tw_objective','Define learning objectives + budget',75,10,[],'you',true,'manage-up'],
  ['tw_facilitator','Confirm facilitator / trainer',65,14,['tw_objective'],'you',true,'diplomatic-chase'],
  ['tw_venue','Book venue / training room + platform',60,14,['tw_objective'],'you',true],
  ['tw_curriculum','Finalize curriculum / agenda',50,21,['tw_facilitator'],'you',true,'planner-calm'],
  ['tw_registration','Open registration / enrollment',45,14,['tw_curriculum'],'you',true,'celebrate'],
  ['tw_materials','Develop + print materials / workbooks',35,21,['tw_curriculum'],'you',false,'vendor-chase'],
  ['tw_av','Book AV / equipment',35,7,['tw_venue'],'you',false,'vendor-chase'],
  ['tw_catering','Arrange catering / refreshments',30,10,['tw_venue'],'you',false,'vendor-chase'],
  ['tw_prework','Send pre-work / pre-reads',14,5,['tw_registration','tw_curriculum'],'you',false,'client-accountability'],
  ['tw_certs','Prepare certificates / assessments',14,7,['tw_curriculum'],'you',false],
  ['tw_reg_close','Enrollment close / final count',10,1,['tw_registration'],'you',true,'client-accountability'],
  ['tw_final_pay','Final vendor balances',7,3,['tw_venue','tw_facilitator'],'you',true,'vendor-chase'],
  ['tw_loadin','Room setup',0,1,['tw_materials','tw_av'],'you',true,null,true],
  ['event','The training / workshop',0,1,['tw_loadin','tw_reg_close','tw_final_pay'],'you',true],
  ['tw_followup','Post-training evals + follow-up',-7,5,['event'],'you',false,'reflect'],
];

// AWARD CEREMONY — honorees + program + show production. Categories→honorees is
// the content spine; ticket/table sales + seating like a gala; show rehearsal.
const AWARD_CEREMONY = [
  ['aw_objective','Define program + budget approval',120,10,[],'you',true,'manage-up'],
  ['aw_venue','Secure venue',110,14,['aw_objective'],'you',true],
  ['aw_categories','Finalize award categories + judging',95,21,['aw_objective'],'you',true,'manage-up'],
  ['aw_tickets','Open ticket / table sales',80,14,['aw_venue'],'marketing',true,'celebrate'],
  ['aw_honorees','Select + confirm honorees / nominees',75,21,['aw_categories'],'you',true,'diplomatic-chase'],
  ['aw_host','Confirm host / MC + presenters',70,14,['aw_venue'],'you',false,'diplomatic-chase'],
  ['aw_av','Book AV / production / livestream',70,14,['aw_venue'],'you',false,'vendor-chase'],
  ['aw_catering','Book catering',70,14,['aw_venue'],'you',false,'vendor-chase'],
  ['aw_trophies','Order trophies / certificates',45,30,['aw_categories'],'you',false,'vendor-chase'],
  ['aw_program','Build program + run-of-show + scripts',30,21,['aw_honorees','aw_host'],'you',true,'planner-calm'],
  ['aw_seating','Seating + table assignments',21,7,['aw_tickets'],'you',true,'reassurance'],
  ['aw_coi','Collect vendor COIs',21,14,['aw_venue','aw_av','aw_catering'],'vendor',true,'vendor-chase',true],
  ['aw_rehearsal','Show rehearsal / presenter walk-through',7,2,['aw_program','aw_av'],'you',true,'planner-calm'],
  ['aw_final_count','Final count to catering',10,1,['aw_seating'],'you',true,'vendor-chase'],
  ['aw_final_pay','Final vendor balances',10,5,['aw_venue','aw_av','aw_catering'],'you',true,'vendor-chase'],
  ['aw_loadin','Load-in & setup',0,1,['aw_coi','aw_rehearsal'],'vendor',true,null,true],
  ['event','The award ceremony',0,1,['aw_loadin','aw_final_count','aw_final_pay'],'you',true,'celebrate'],
];

// CLIENT DINNER — intimate, relationship-driven. Short lead, reservation not
// venue-build; the work is the right guests, menu, seating, and the follow-up.
const CLIENT_DINNER = [
  ['cd_objective','Define guest list + objective + budget',30,5,[],'you',true,'manage-up'],
  ['cd_venue','Book restaurant / private room',28,5,['cd_objective'],'you',true,'vendor-chase'],
  ['cd_invites','Send invitations + confirm attendance',21,5,['cd_objective'],'you',true,'diplomatic-chase'],
  ['cd_menu','Pre-select menu / wine + dietary',14,5,['cd_venue'],'you',false,'vendor-chase'],
  ['cd_gifts','Arrange gifts / takeaways',12,7,['cd_objective'],'you',false],
  ['cd_seating','Plan seating / conversation flow',10,3,['cd_invites'],'you',false,'reassurance'],
  ['cd_confirm','Reconfirm headcount + reservation',5,1,['cd_invites','cd_venue'],'you',true,'vendor-chase'],
  ['cd_brief','Brief attendees / talking points',3,2,['cd_seating'],'you',false,'manage-up'],
  ['cd_final_pay','Confirm billing / payment method',2,1,['cd_venue'],'you',true,'vendor-chase'],
  ['event','The client dinner',0,1,['cd_confirm','cd_brief','cd_final_pay'],'you',true],
  ['cd_followup','Post-dinner thank-you + follow-up',-3,3,['event'],'you',true,'manage-up'],
];

// NETWORKING EVENT — mixer/panel: registration + promotion drive attendance;
// name tags + format; optional panelists. Tail is the attendee follow-up list.
const NETWORKING_EVENT = [
  ['ne_objective','Define format, goal + budget',60,7,[],'you',true,'manage-up'],
  ['ne_venue','Book venue',55,14,['ne_objective'],'you',true],
  ['ne_format','Lock the format — mixer, panel, or speed-networking',50,10,['ne_objective'],'you',false],
  ['ne_registration','Registration / ticketing live',45,10,['ne_venue'],'you',true,'celebrate'],
  ['ne_speakers','Confirm speakers / panelists (if any)',45,14,['ne_format'],'you',false,'diplomatic-chase'],
  ['ne_promo','Promote + open registration',40,21,['ne_registration'],'marketing',true,'celebrate'],
  ['ne_catering','Book catering / bar',40,10,['ne_venue'],'you',false,'vendor-chase'],
  ['ne_av','Book AV / mics',35,7,['ne_venue'],'you',false,'vendor-chase'],
  ['ne_nametags','Prepare name tags / attendee list',10,5,['ne_registration'],'you',false],
  ['ne_reg_close','Registration close / final count',7,1,['ne_promo'],'you',true,'client-accountability'],
  ['ne_coi','Collect vendor COIs',21,14,['ne_venue','ne_catering'],'vendor',true,'vendor-chase',true],
  ['ne_final_count','Final count to catering',5,1,['ne_reg_close'],'you',true,'vendor-chase'],
  ['ne_final_pay','Final vendor balances',5,3,['ne_venue','ne_catering'],'you',true,'vendor-chase'],
  ['ne_loadin','Setup',0,1,['ne_coi','ne_nametags'],'you',true,null,true],
  ['event','The networking event',0,1,['ne_loadin','ne_final_count','ne_final_pay'],'you',true,'celebrate'],
  ['ne_followup','Share attendee list / follow-ups',-3,3,['event'],'you',false,'reflect'],
];

// HOME GATHERING — individually hosted, DIY, no vendors/contracts/COI. Covers
// get-togethers, dinner parties, housewarmings, Friendsgiving, game nights.
// Short runway; the "vendor" is the host. This is most people's most common event.
const HOME_GATHERING = [
  ['hg_vision','Pick the date + guest count',21,2,[],'host',true],
  ['hg_guestlist','Invite guests + track RSVP',18,3,['hg_vision'],'host',false,'celebrate'],
  ['hg_menu','Plan menu / potluck assignments',14,3,['hg_vision'],'host',false],
  ['hg_space','Plan the space / seating / vibe',7,2,['hg_vision'],'host',false],
  ['hg_rsvp_close','Confirm final headcount',3,1,['hg_guestlist'],'host',true,'client-accountability'],
  ['hg_shopping','Shop groceries + supplies',2,1,['hg_menu','hg_rsvp_close'],'host',false],
  ['hg_prep','Cook / prep + tidy the space',1,1,['hg_shopping','hg_space'],'host',false],
  ['event','The get-together',0,1,['hg_prep','hg_rsvp_close'],'host',true,'celebrate'],
];

// BACHELOR / BACHELORETTE — multi-day group trip. The binding constraints are
// group budget buy-in and locking lodging/travel before prices move. Group $$ is the risk.
const BACHELORETTE = [
  ['ba_vision','Set dates, budget + vibe with honoree',90,7,[],'host',true,'client-accountability'],
  ['ba_guestlist','Lock guest list + group chat',85,7,['ba_vision'],'host',false,'celebrate'],
  ['ba_destination','Choose destination / city',80,10,['ba_vision'],'host',true],
  ['ba_budget_collect','Collect budget buy-in from the group',75,14,['ba_guestlist','ba_destination'],'host',true,'diplomatic-chase'],
  ['ba_lodging','Book lodging (Airbnb / hotel block)',70,7,['ba_destination','ba_budget_collect'],'host',true,'vendor-chase'],
  ['ba_travel','Book travel / flights',65,14,['ba_destination'],'host',false,'vendor-chase'],
  ['ba_itinerary','Build itinerary (dinners / activities)',45,21,['ba_destination'],'host',false],
  ['ba_reservations','Make reservations (dinner / club / spa)',40,14,['ba_itinerary'],'host',true,'vendor-chase'],
  ['ba_activities','Book activities / experiences',40,14,['ba_itinerary'],'host',false,'vendor-chase'],
  ['ba_decor','Order décor / sashes / favors / shirts',30,14,['ba_guestlist'],'host',false],
  ['ba_payments','Settle group payments / collect balances',14,7,['ba_budget_collect'],'host',true,'diplomatic-chase'],
  ['ba_final_confirm','Reconfirm all reservations',5,2,['ba_reservations','ba_lodging'],'host',true,'vendor-chase'],
  ['event','The bachelorette trip',0,1,['ba_final_confirm','ba_payments'],'host',true,'celebrate'],
];

// SURPRISE PROPOSAL — secrecy is the spine: a hidden photographer, a cover story,
// a tight day-of run-through. Trending niche (dedicated proposal planners).
const PROPOSAL = [
  ['pp_vision','Define vision, budget + the moment',45,5,[],'planner',true,'reassurance'],
  ['pp_ring','Confirm the ring is ready',40,7,['pp_vision'],'client',true,'client-accountability'],
  ['pp_location','Scout + secure location (permits if needed)',35,10,['pp_vision'],'planner',true,'vendor-chase'],
  ['pp_photographer','Book hidden photographer / videographer',30,7,['pp_location'],'planner',true,'vendor-chase'],
  ['pp_design','Design the setup (florals / lighting / signage)',21,14,['pp_location'],'planner',false,'celebrate'],
  ['pp_logistics','Plan secret logistics + cover story',14,7,['pp_location'],'planner',true,'reassurance'],
  ['pp_vendors_confirm','Confirm all vendors + timing',7,3,['pp_design','pp_photographer'],'planner',true,'vendor-chase'],
  ['pp_runthrough','Walk the timeline with the client',3,1,['pp_logistics','pp_vendors_confirm'],'planner',true,'planner-calm'],
  ['pp_setup','Setup + final placement',0,1,['pp_runthrough'],'planner',true,null,true],
  ['event','The proposal',0,1,['pp_setup'],'planner',true,'celebrate'],
  ['pp_celebration','Optional surprise celebration after',-1,2,['event'],'planner',false,'celebrate'],
];

// GENDER REVEAL — small celebration; the reveal mechanism + a keeper-of-the-secret.
const GENDER_REVEAL = [
  ['gx_vision','Set date, budget + guest count',45,5,[],'host',true],
  ['gx_method','Choose reveal method + keeper of the secret',40,7,['gx_vision'],'host',true,'celebrate'],
  ['gx_venue','Confirm location (home / park / venue)',38,7,['gx_vision'],'host',true],
  ['gx_guestlist','Build guest list',35,5,['gx_vision'],'host',false],
  ['gx_reveal_order','Order reveal item (cake / smoke / confetti)',21,14,['gx_method'],'host',true,'vendor-chase'],
  ['gx_catering','Plan food / cake / drinks',21,10,['gx_venue'],'host',false,'vendor-chase'],
  ['gx_theme','Lock theme + décor',18,10,['gx_venue'],'host',false],
  ['gx_invites','Send invitations + RSVP',18,5,['gx_guestlist'],'host',false,'celebrate'],
  ['gx_photo','Book photographer for the reveal',14,5,['gx_venue'],'host',false,'vendor-chase'],
  ['gx_rsvp_close','RSVP close / final count',7,1,['gx_invites'],'host',true,'client-accountability'],
  ['gx_final_pay','Final vendor balances',3,2,['gx_venue','gx_reveal_order'],'host',true,'vendor-chase'],
  ['gx_loadin','Setup',0,1,['gx_rsvp_close','gx_final_pay'],'host',true,null,true],
  ['event','The gender reveal',0,1,['gx_loadin'],'host',true,'celebrate'],
];

// ELOPEMENT / MICRO-WEDDING — intimate, often destination, minimal vendors but
// REAL legal requirements (license, officiant). Trending hard post-2020.
const ELOPEMENT = [
  ['el_vision','Set date, budget + location vision',90,7,[],'couple',true],
  ['el_location','Secure location / destination + permits',80,14,['el_vision'],'couple',true,'vendor-chase'],
  ['el_officiant','Book officiant + confirm legal requirements',75,7,['el_location'],'couple',true,'vendor-chase'],
  ['el_photographer','Book photographer / videographer',70,7,['el_location'],'couple',true,'vendor-chase'],
  ['el_travel','Book travel + lodging',65,14,['el_location'],'couple',false,'vendor-chase'],
  ['el_attire','Order attire',60,45,['el_vision'],'couple',false,'client-accountability'],
  ['el_details','Florals / details / dinner reservation',30,14,['el_location'],'couple',false,'vendor-chase'],
  ['el_vows','Write vows',14,14,['el_vision'],'couple',false,'celebrate'],
  ['el_license','Secure marriage license (local rules)',14,7,['el_officiant'],'couple',true,'client-accountability'],
  ['el_timeline','Confirm day-of timeline with vendors',7,3,['el_photographer','el_officiant'],'couple',true,'planner-calm'],
  ['el_final_pay','Final vendor balances',5,3,['el_location','el_photographer'],'couple',true,'vendor-chase'],
  ['event','The elopement',0,1,['el_timeline','el_license','el_final_pay'],'couple',true,'celebrate'],
];

// WELLNESS RETREAT — consumer retreat (yoga / sound / breathwork). Registration
// fill-rate is the binding business risk; intake/waivers + dietary-heavy meals.
const WELLNESS_RETREAT = [
  ['wr_concept','Define concept, budget + capacity',120,10,[],'host',true],
  ['wr_venue','Book retreat venue + lodging',110,21,['wr_concept'],'host',true],
  ['wr_facilitators','Confirm facilitators / instructors',100,21,['wr_concept'],'host',true,'diplomatic-chase'],
  ['wr_program','Build program / schedule',85,21,['wr_facilitators'],'host',true,'planner-calm'],
  ['wr_registration','Open registration / ticketing',90,14,['wr_program'],'host',true,'celebrate'],
  ['wr_promo','Marketing + fill seats',85,45,['wr_registration'],'marketing',true,'celebrate'],
  ['wr_catering','Arrange meals (dietary-heavy)',60,14,['wr_venue'],'host',false,'vendor-chase'],
  ['wr_travel','Coordinate travel / transport',45,14,['wr_venue'],'host',false,'vendor-chase'],
  ['wr_intake','Collect participant intake / waivers',30,14,['wr_registration'],'host',true,'client-accountability'],
  ['wr_materials','Prepare materials / welcome kits',21,14,['wr_program'],'host',false,'vendor-chase'],
  ['wr_reg_close','Registration close / final count',14,1,['wr_promo'],'host',true,'client-accountability'],
  ['wr_coi','Collect vendor / facilitator COIs',21,14,['wr_venue','wr_facilitators'],'vendor',true,'vendor-chase',true],
  ['wr_final_count','Final count to venue / catering',10,1,['wr_reg_close'],'host',true,'vendor-chase'],
  ['wr_final_pay','Final vendor balances',10,5,['wr_venue'],'host',true,'vendor-chase'],
  ['wr_loadin','Arrival / setup',0,1,['wr_coi','wr_materials'],'host',true,null,true],
  ['event','The wellness retreat',0,1,['wr_loadin','wr_final_count','wr_final_pay'],'host',true,'celebrate'],
  ['wr_followup','Post-retreat community + feedback',-7,7,['event'],'host',false,'reflect'],
];

const tuple = ([id,name,offset,duration,deps,owner,gate,firesRule=null,shield=false]) =>
  ({ id, name, offset, duration, deps, owner, gate, firesRule, shield });

const GRAPHS = {
  // Weddings & Celebrations
  wedding: WEDDING.map(tuple),
  engagement_party: ENGAGEMENT_PARTY.map(tuple),
  vow_renewal: VOW_RENEWAL.map(tuple),
  anniversary: ANNIVERSARY.map(tuple),
  bridal_shower: BRIDAL_SHOWER.map(tuple),
  baby_shower: BABY_SHOWER.map(tuple),
  birthday: BIRTHDAY.map(tuple),
  sweet16: SWEET16.map(tuple),
  quinceanera: QUINCEANERA.map(tuple),
  graduation: GRADUATION.map(tuple),
  retirement_party: RETIREMENT_PARTY.map(tuple),
  reunion: REUNION.map(tuple),
  // Corporate
  corporate: CORPORATE.map(tuple),               // conference / summit / generic corporate
  holiday_party: HOLIDAY_PARTY.map(tuple),
  board: BOARD.map(tuple),
  product_launch: PRODUCT_LAUNCH.map(tuple),
  team_retreat: TEAM_RETREAT.map(tuple),
  town_hall: TOWN_HALL.map(tuple),
  training_workshop: TRAINING_WORKSHOP.map(tuple),
  award_ceremony: AWARD_CEREMONY.map(tuple),
  client_dinner: CLIENT_DINNER.map(tuple),
  // Social & Fundraising
  gala: GALA.map(tuple),
  networking_event: NETWORKING_EVENT.map(tuple),
  // Individually hosted + on-trend
  home_gathering: HOME_GATHERING.map(tuple),
  bachelorette: BACHELORETTE.map(tuple),
  proposal: PROPOSAL.map(tuple),
  gender_reveal: GENDER_REVEAL.map(tuple),
  elopement: ELOPEMENT.map(tuple),
  wellness_retreat: WELLNESS_RETREAT.map(tuple),
};

const DELIVERY = {
  'client-accountability': 'Nudge the couple — frame as ONE easy decision',
  'vendor-chase': 'Chase the vendor (you, not the client)',
  'diplomatic-chase': 'Chase the content/speaker diplomatically (so you’re not personally nagging VPs)',
  'manage-up': 'Produce the upward-defensible artifact for leadership',
  'planner-calm': 'Lock it — the run-of-show is now the source of truth',
  'celebrate': 'Celebrate the moment 🎉',
  'donor-ask': 'Make the ask — frame as partnership + impact, never charity',
  'reassurance': 'Reassure + take it off their plate',
  'reflect': 'Capture program memory for next time',
  null: 'Handle it',
};

// Compute D-independent latest-complete offsets (max of own deadline + successor required-starts).
function withOffsets(graph) {
  const dependents = id => graph.filter(m => m.deps.includes(id));
  const order = [], seen = new Set();
  const visit = m => { if (seen.has(m.id)) return; seen.add(m.id); dependents(m.id).forEach(visit); order.push(m); };
  graph.forEach(visit);
  for (const m of order) {
    let lco = m.offset;
    for (const dep of dependents(m.id)) lco = Math.max(lco, dep._lco + dep.duration);
    m._lco = lco;
  }
  return graph;
}

/**
 * solve — the engine. graph: GRAPHS[family]; D: event Date; completed: Set<id>; asOf: Date (default now).
 * Returns { daysOut, readiness, flag, binding, delivery, dateAtRisk, criticalChain }.
 */
function solve(graph, D, completed, asOf = new Date()) {
  withOffsets(graph);
  const done = id => completed.has(id);
  for (const m of graph) {
    m._lateComplete = d(D, m._lco);
    m._lateStart = d(D, m._lco + m.duration);
    m._slack = daysBetween(m._lateStart, asOf);
  }
  const open = graph.filter(m => !done(m.id));
  const actionable = open.filter(m => m.deps.every(done));
  const binding = actionable.sort((a, b) => a._lateComplete - b._lateComplete)[0] || null;
  const critical = open.filter(m => m._slack <= 0).sort((a, b) => a._lateComplete - b._lateComplete);
  const overdue = critical.filter(m => m._lateStart < asOf);
  const readiness = Math.round(100 * (graph.length - 1 - open.filter(m => m.id !== 'event').length) / (graph.length - 1));
  const flag = overdue.length ? '🔴 behind' : open.some(m => m._slack <= 14) ? '🟡 approaching' : '🟢 on track';
  return {
    daysOut: daysBetween(D, asOf), readiness, flag, binding,
    delivery: binding ? `${DELIVERY[binding.firesRule] || DELIVERY[null]}: "${binding.name}"` : null,
    dateAtRisk: overdue.length > 0,
    criticalChain: critical.map(m => m.name),
  };
}

// ---- app-event → engine preview (real state mapping) ----
// Type→solve-family resolution lives in the canonical taxonomy (lib/eventTaxonomy).
// EACH event type has its OWN model — there is NO wedding default; an unrecognized
// type returns null (no preview) rather than fabricating wedding milestones. The
// keyword/alias logic that used to live here as a local FAMILY_BY_TYPE array is now
// the single ordered resolver shared with intake/budget/vendor classifiers.
// (`taxonomy` is imported at the top of this module.)
function familyFor(event) {
  const t = (event && (event.type || event.kind || event.category)) || '';
  return taxonomy.solveFamilyFor(t); // null when unrecognized — honest, never a wedding.
}

// Map the app event's data → DONE milestones. Real signal where it exists; `undefined`
// falls back to the date-estimate (deadline >21d past = done) so unmapped milestones don't regress.
function completionFromEvent(event, graph, asOf) {
  const cutoff = new Date(asOf.getTime() - 21 * DAY);
  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  // corporate calls them "attendees"; weddings "guests" — same headcount signal.
  const guests = Array.isArray(event.guests) ? event.guests
    : Array.isArray(event.attendees) ? event.attendees : [];
  const isBooked = s => !s || /book|confirm/i.test(s);
  const booked = cat => vendors.some(v => v && v.category === cat && isBooked(v.status));
  const bookedRe = re => vendors.some(v => v && re.test(v.category || '') && isBooked(v.status));
  const bk = vendors.filter(v => v && isBooked(v.status));
  const rsvped = guests.filter(g => g && g.rsvp && !/pending|invited|await|no.?reply/i.test(String(g.rsvp)));
  const rsvpDone = (guests.length > 0 && rsvped.length / guests.length >= 0.8) || undefined;   // headcount-final
  const floralVision = vendors.some(v => v && v.category === 'Florals' && /confirm/i.test(v.status || '')) || undefined; // florals confirmed = vision signed off

  // ---- corporate signals (forward-looking fields; absent today → undefined → date-estimate) ----
  const speakers = Array.isArray(event.speakers) ? event.speakers : [];
  const speakersConfirmed = (speakers.length > 0 && speakers.every(s => s && /confirm|booked|signed/i.test(s.status || ''))) || undefined;
  const decksIn = (speakers.length > 0 && speakers.every(s => s && (s.deckReceived || /deck|received|delivered/i.test(s.contentStatus || '')))) || undefined;
  const reg = event.registration || {};
  const regLive = !!(reg.live || event.registrationLive) || undefined;
  const regOpen = !!(reg.open || reg.live || event.registrationOpen) || undefined;
  const regClosed = !!(reg.closed || event.registrationClosed) || rsvpDone;   // headcount locked
  const hasAgenda = (Array.isArray(event.ros) && event.ros.length > 0) || !!event.agenda || undefined;
  const swagDone = !!event.swag || bookedRe(/swag|print|merch|signage/i) || undefined;
  const coiAll = bk.length ? (bk.every(v => v.coiStatus && /valid|on.?file|received|signed|active/i.test(v.coiStatus)) || undefined) : undefined;
  const balAll = bk.length ? bk.every(v => v.balancePaid) : undefined;
  // generic, family-agnostic signals reused by the keyword-inference layer below
  const venueSig    = (!!event.venue || booked('Venue')) || undefined;
  const cateringSig = (booked('Catering') || bookedRe(/cater/i)) || undefined;
  const guestsSig   = (guests.length > 0) || undefined;
  const photoSig    = (booked('Photography') || bookedRe(/photo|video/i)) || undefined;
  const entSig      = (booked('Entertainment') || bookedRe(/dj|music|band|entertain/i)) || undefined;
  const R = {
    // positive signal asserts DONE; absence → undefined → date-estimate (never assert "not booked" from missing data)
    date_budget: !!(event.date && (event.budget || event.totalBudget)) || undefined,
    venue: !!event.venue || booked('Venue') || undefined,
    venue_date: !!event.venue || booked('Venue') || undefined,
    photographer: booked('Photography') || undefined,
    caterer: booked('Catering') || undefined,
    catering: booked('Catering') || undefined,
    florist: booked('Florals') || undefined,
    band_dj: booked('Entertainment') || undefined,
    cake: booked('Cake') || undefined,
    av_production: booked('AV / Tech') || bookedRe(/av|tech|production|sound|stage/i) || undefined,
    // ---- corporate milestones ----
    objective_signoff: !!event.objective || !!event.sponsorSignoff || undefined,
    budget_approval: !!event.budgetApproved || undefined,        // approval is a GATE, not just "a budget exists"
    speakers_confirm: speakersConfirmed,
    speaker_content: decksIn,
    agenda_ros_v1: hasAgenda,
    registration_live: regLive,
    invites_open_reg: regOpen,
    registration_close: regClosed,
    final_count_catering: regClosed,
    swag: swagDone,
    ros_lock: !!event.rosLocked || undefined,
    guestlist_draft: guests.length > 0 || undefined,
    guestlist_final: guests.length > 0 || undefined,
    rsvp_close: rsvpDone,
    final_count_caterer: rsvpDone,
    floral_signoff: floralVision,
    deposits: vendors.some(v => v && v.depositPaid) || undefined,
    final_payments: bk.length ? bk.every(v => v.balancePaid) : undefined,
    coi_collection: bk.length ? (bk.every(v => v.coiStatus && /valid|on.?file|received|signed|active/i.test(v.coiStatus)) || undefined) : undefined,
    vendor_coi: bk.length ? (bk.every(v => v.coiStatus && /valid|on.?file|received|signed|active/i.test(v.coiStatus)) || undefined) : undefined,
    timeline_ros: (Array.isArray(event.ros) && event.ros.length > 0) || undefined,
    seating_chart: (Array.isArray(event.tables) && event.tables.length > 0) || undefined,
  };
  // Keyword inference — maps the NEW per-family node ids (hp_venue, s16_catering,
  // bs_guestlist, gr_rsvp_close, …) to the generic signals by what the id is ABOUT,
  // so each family's graph reads real data without enumerating every node.
  const dateBudgetSig = (!!(event.date && (event.budget || event.totalBudget))) || undefined;
  const infer = (id) => {
    const s = id.toLowerCase();
    // the opening "define the event" milestone — true the moment a dated, budgeted
    // event exists in the app (every family's first node; NOT budget_approval, a gate).
    if (/vision|objective|concept|fundraising_goal/.test(s)) return dateBudgetSig;
    if (/venue|room|location/.test(s)) return venueSig;
    if (/cater/.test(s)) return cateringSig;
    if (/(rsvp|headcount|final.?count|quorum_confirm)/.test(s)) return rsvpDone;
    if (/guest.?list/.test(s)) return guestsSig;
    if (/(^|_)(coi)(_|$)|vendor_coi/.test(s)) return coiAll;
    if (/final_pay|final.?balance/.test(s)) return balAll;
    if (/photo|video/.test(s)) return photoSig;
    if (/(^|_)(dj|band|music|entertain)/.test(s)) return entSig;
    if (/run_of_show|agenda|ros_lock/.test(s)) return hasAgenda;
    return undefined;
  };
  // Reconcile with the planner's OWN checklist: a milestone whose name overlaps a
  // timeline task the planner already ticked done is treated as done (believe the human).
  const doneTasks = (Array.isArray(event.timeline) ? event.timeline : [])
    .filter(t => t && t.done).map(t => String(t.task || '').toLowerCase());
  const matchesDoneTask = (name) => {
    const words = String(name).toLowerCase().split(/\W+/).filter(w => w.length > 3);
    return doneTasks.some(t => words.filter(w => t.includes(w)).length >= 2);
  };
  const completed = new Set();
  for (const m of graph) {
    let done = R[m.id];                                  // 1) explicit, nuanced signal
    if (done === undefined) done = infer(m.id);          // 2) family-agnostic keyword inference
    if (done === undefined && matchesDoneTask(m.name)) done = true; // 3) planner's own ticked checklist
    if (done === undefined) done = m._lateComplete && m._lateComplete < cutoff && m.id !== 'event'; // 4) date-estimate
    if (done) completed.add(m.id);
  }
  return completed;
}

// enginePreview — app-facing. Fully guarded; returns null on any problem.
function enginePreview(event, asOf = new Date()) {
  try {
    const dateStr = event && (event.date || event.eventDate || event.weddingDate);
    if (!dateStr) return null;
    const D = new Date(dateStr);
    if (isNaN(D.getTime())) return null;
    const family = familyFor(event);
    const graph = GRAPHS[family];
    if (!graph) return null;
    solve(graph, D, new Set(), asOf);                  // populate _lateComplete (estimate fallback)
    const completed = completionFromEvent(event, graph, asOf);
    return { family, mapped: true, ...solve(graph, D, completed, asOf) };
  } catch (e) { return null; }
}

// Re-export the canonical taxonomy resolvers THROUGH this engine module so the
// webpack app reaches them via the single proven CJS chain (eventSolveAdapter ->
// eventSolve -> eventTaxonomy). No ESM module imports eventTaxonomy directly — when
// it had multiple ESM-side importers, the production bundle flagged it ESM and its
// `module.exports` tripped webpack's "ES Modules may not assign module.exports" guard.
export { GRAPHS, solve, familyFor, completionFromEvent, enginePreview };
// Re-export the canonical taxonomy resolvers through the engine so app surfaces can
// reach them via the engine adapter (one ESM boundary for the whole engine).
export {
  EVENT_TAXONOMY,
  resolveCanonicalType,
  intakeFamilyFor,
  budgetFamilyFor,
  solveFamilyFor,
  budgetShareFamilyFor,
  recordKindFor,
  curatedRosterKeyFor,
  culturalFlagFor,
} from './eventTaxonomy.mjs';

// CLI self-test lives in scripts/engineSelfTest.mjs (run: node scripts/engineSelfTest.mjs).
// It was moved out of this module so the engine carries no node-only `require.main`
// code into the webpack bundle.
