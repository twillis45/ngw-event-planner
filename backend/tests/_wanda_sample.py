"""A Python copy of the fictional Wanda sample (src/data/wandaGoldEvent.js),
trimmed to the fields the privacy tests need. No real people: every name,
address and phone number here is the sample's own invented data.

The private things it carries, on purpose, are the ones the 11/22/2026 audit
(lane E, P0-1 and P0-2) found leaking from the public invite and the family
link: the lodging house address, who stays there, host notes, money in the
checklist, and guest names in the run of show.
"""
import copy

INVITE_CODE = "wanda-invite-code-0000000001"
FAMILY_CODE = "wanda-family-code-00000000000001"

_EVENT = {
    "id": "ev-x-wanda",
    "rsvpCode": INVITE_CODE,
    "familyCode": FAMILY_CODE,
    "name": "Wanda’s 50th & 30-Year Army Retirement — Black & Gold",
    "type": "Retirement Party",
    "honoree": "Wanda Mundy",
    "host": "Wanda Mundy",
    "date": "2027-03-20",
    "startTime": "18:30",
    "startTimeSource": "host",
    "venue": "Freedom Hall at VFW Post 1847",
    "venueCity": "Upper Marlboro, MD",
    "dressCode": "All black — she’s the only gold in the room",
    "guestCount": 75,
    "guestEstimate": 75,
    "meaning": "the family wants Wanda to feel honored, then surprised",
    "lodging": [
        {"id": "ev-x-wanda-lodge-1", "address": "4604 Grazin Way, Upper Marlboro, MD",
         "who": "Marcus + Nia + the 2 boys (in from Denver, CO)",
         "notes": "Family stay — arriving 2 days ahead for the presentation + photoshoot."},
        {"id": "ev-x-wanda-lodge-2", "address": "4604 Grazin Way, Upper Marlboro, MD",
         "who": "Wanda’s Mom (Gloria)", "notes": "Same house as Marcus’s family."},
    ],
    "budget": [
        {"id": "b1", "category": "Venue", "budgeted": 400, "actual": 400, "notes": "Paid."},
        {"id": "b2", "category": "Catering", "budgeted": 1500, "actual": 0,
         "notes": "Buffet for 75 at ~$20/head — cut to the bone to fit the $5,000."},
    ],
    "guests": [
        {"id": "g1", "name": "Cory Mundy", "rsvp": "Yes", "meal": "Beef", "plusOne": "",
         "notes": "Husband — arranged the SECRET singer."},
        {"id": "g2", "name": "Gloria (Wanda’s Mom)", "rsvp": "Yes", "plusOne": "", "notes": "Staying at 4604."},
        {"id": "g3", "name": "Marcus (brother)", "rsvp": "Yes", "plusOne": "+3 (Nia + 2 boys)",
         "notes": "In from Denver, CO — giving the Army retirement presentation. Family at 4604."},
        {"id": "g4", "name": "Diane (Cory’s Mom) + family", "rsvp": "Yes", "plusOne": "+2"},
        {"id": "g5", "name": "Vida Haynes", "rsvp": "Yes", "meal": "Vegetarian",
         "notes": "Helping Wanda run the day — day-of point person."},
        {"id": "g7", "name": "SFC Boyd + unit", "rsvp": "Maybe"},
        {"id": "g8", "name": "Chaplain Ellis", "rsvp": "Yes", "meal": "Gluten-free"},
        {"id": "g9", "name": "The Church Friends", "rsvp": "Pending"},
    ],
    "vendors": [
        {"id": "v1", "name": "VFW Post 1847 — Freedom Hall", "category": "Venue", "status": "Confirmed",
         "cost": 400, "contact": "Hank Delgado, Post Quartermaster", "phone": "555-0182",
         "notes": "Member rate. Paid in full."},
        {"id": "v2", "name": "Semper Catering Co.", "category": "Catering", "status": "Quoted",
         "cost": 1500, "contact": "Gina Marsh", "phone": "555-0355"},
        {"id": "v4", "name": "DJ Marcus Kane + dance floor", "category": "DJ", "status": "Deposit Paid",
         "cost": 550, "depositAmt": 200, "contact": "Marcus Kane", "phone": "555-0711"},
        {"id": "v8", "name": "Church singer (Cory’s surprise)", "category": "Entertainment",
         "status": "Confirmed", "isInformal": True, "surprise": True},
        {"id": "v9", "name": "Vida Haynes (day-of helper)", "category": "Helper", "status": "Confirmed",
         "isInformal": True, "contact": "Vida Haynes",
         "notes": "Not a paid vendor — Wanda’s friend helping run the day."},
    ],
    "timeline": [
        {"id": "t1", "task": "Book the pre-event photoshoot friend + confirm the 6-ft print turnaround "
                             "(everything decorative hangs on this)", "done": True, "owner": "Wanda"},
        {"id": "t2", "task": "Lock catering — pick Semper vs. the Post kitchen to fit the $5,000, "
                             "then book the open bar (or drop to beer/wine)", "done": False, "owner": "Wanda"},
        {"id": "t3", "task": "Book photobooth + night-of photographer, or trim to fit budget",
         "done": False, "owner": "Vida Haynes"},
        {"id": "t4", "task": "Do the photoshoot at 4604 and ORDER the 6-ft prints (~10 days out so they’re ready)",
         "done": False, "owner": "Wanda"},
        {"id": "t5", "task": "Set up the rooms at 4604 for Marcus’s family + Mom (arriving 2 days early)",
         "done": False, "owner": "Cory"},
        {"id": "t6", "task": "Coordinate the secret singer + gold-dress reveal cues with the DJ",
         "done": False, "owner": "Cory", "surprise": True},
        {"id": "t7", "task": "Final headcount to the caterer (~75), confirm run of show, "
                             "all-black dress reminder in the invite", "done": False, "owner": "Vida Haynes"},
    ],
    "ros": [
        {"id": "r1", "time": "6:30 PM", "label": "Doors — guests in all black; 6-ft prints + memory table on display"},
        {"id": "r2", "time": "6:45 PM", "label": "Wanda arrives in Army ceremonial dress"},
        {"id": "r3", "time": "7:00 PM", "label": "Buffet dinner"},
        {"id": "r4", "time": "7:45 PM", "label": "Army retirement presentation — Marcus (brother)"},
        {"id": "r5", "time": "8:15 PM", "label": "SURPRISE: church singer’s dedication (Cory’s doing)", "surprise": True},
        {"id": "r6", "time": "8:30 PM", "label": "Wardrobe change — Wanda returns in the gold dress"},
        {"id": "r7", "time": "8:45 PM", "label": "Toast + black-&-gold cake"},
        {"id": "r8", "time": "9:00 PM", "label": "Dance floor opens — DJ + photobooth"},
    ],
}

# Every guest's (and helper's, and vendor contact's) first name, plus the
# plus-one named only in a plus-one note. None of them is the honoree.
GUEST_NAMES = ("Cory", "Gloria", "Marcus", "Nia", "Diane", "Vida", "Haynes", "Boyd", "Ellis",
               "Hank", "Delgado", "Gina", "Marsh")
PRIVATE_ADDRESS = ("4604", "Grazin")


def wanda():
    """A fresh deep copy, so a test can add fields without touching another's."""
    return copy.deepcopy(_EVENT)
