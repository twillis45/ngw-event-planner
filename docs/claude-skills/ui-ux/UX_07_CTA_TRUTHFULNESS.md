# UX_07 — CTA Truthfulness and Integration Honesty

The most damaging UX failure in a professional tool is a button that lies. A planner who taps "Send Email" and nothing sends will never trust the app again. This skill defines the hard rules for what buttons can claim and when.

## The Truthfulness Taxonomy

Every interactive element in the app falls into exactly one of these levels:

### Level 1: DONE

The action is fully wired, end-to-end, in production.

- Tapping it performs the complete action.
- The result is visible, verifiable, and persisted.
- Examples: save to cloud, navigate to detail, toggle a local state, delete an item.

**Label rule:** Use the real verb. "Send Email", "Save Changes", "Delete Event", "Add Vendor."

### Level 2: DEEP HANDOFF

The app opens a real external tool or initiates a real external workflow.

- The user leaves the app (or a system dialog appears) to complete the action.
- The app has done everything it can — the rest depends on the external tool.
- Examples: `tel:` link opens phone dialer, `mailto:` opens email client, WhatsApp deep link opens chat.

**Label rule:** "Call [Name]", "Open in WhatsApp", "Email via [Client]". The label names the destination.

### Level 3: LIGHT HANDOFF

The app prepares content and copies it for the user to use elsewhere.

- The actual delivery happens outside the app.
- Examples: copy drafted email to clipboard, copy vendor follow-up text, export .ics calendar file.

**Label rule:** "Copy Draft", "Copy to Clipboard", "Download .ics". The label describes the preparation, not the delivery. Never "Send" when the action is "Copy."

### Level 4: RECORD-ONLY

The app records that the user performed an action, but does not perform it.

- Tapping the button updates local/cloud state to reflect the user's attestation.
- The actual action (payment, call, email) happened outside the app.
- Examples: "Mark as Sent", "Confirm Arrival", "Record Payment", "Mark Contract Signed".

**Label rule:** "Mark [Action] [Past Tense]" or "Record [Noun]". Must include "Mark" or "Record" — the user must understand they're recording, not performing.

### Level 5: DRAFT-ONLY

The app creates a draft that the user must review and explicitly send/apply.

- No automatic execution. Draft appears in a review panel.
- Examples: AI-generated vendor follow-up draft, suggested timeline change.

**Label rule:** "Generate Draft", "Preview Message", "Suggest [Action]". Never "Send" or "Apply" — those imply automatic execution.

### Level 6: STUB

The route or view exists, but the feature is minimal or placeholder.

- Tapping it opens something, but the user can't complete meaningful work.
- Examples: a tab that exists but has limited functionality.

**Label rule:** Must include "(preview)" or show reduced styling (ghost button, not primary). Never styled as a primary CTA.

### Level 7: PLANNED

No code exists for this feature. It is on the roadmap but not implemented.

**Label rule:** The button DOES NOT EXIST. Do not render buttons for features that don't exist. If context requires mentioning a future feature, use muted text: "Email delivery coming soon." Not a button. Not a card. Not an action.

## Classification Rules

### Rule: When in doubt, classify DOWN

If you're not sure whether a feature is DONE or LIGHT HANDOFF, classify it as LIGHT HANDOFF. If you're not sure whether it's STUB or PLANNED, classify it as PLANNED (and don't show the button).

False capability is worse than missing capability. A planner who can't find a button will ask about it. A planner who taps a fake button will lose trust.

### Rule: Classification applies to the full path, not the first hop

"Send Email" is DONE only if tapping it results in an email arriving in someone's inbox. If it creates a message in local state and shows "Sent" but no email is actually delivered, it is RECORD-ONLY at best.

Trace the action from tap to final result. Classify based on where the chain ends, not where it starts.

### Rule: Feature classification must be re-evaluated after each sprint

When backend integration changes (e.g., Resend email delivery gets wired), buttons that were LIGHT HANDOFF may graduate to DONE. Update the label and styling when the classification changes.

## Visual Treatment by Level

| Level | Button Style | Icon | Label Pattern |
|---|---|---|---|
| DONE | Primary or secondary | Action icon | Verb + Object |
| DEEP HANDOFF | Secondary with external icon | External link / phone / app icon | "Open in [Tool]" or "Call [Name]" |
| LIGHT HANDOFF | Secondary | Copy / clipboard icon | "Copy [Thing]" |
| RECORD-ONLY | Secondary, subdued | Checkmark | "Mark [Action Past]" |
| DRAFT-ONLY | Secondary | Sparkle / edit icon | "Generate Draft" |
| STUB | Ghost button or muted | — | "[Action] (preview)" |
| PLANNED | NO BUTTON | — | Muted text if needed |

### Rule: Only DONE actions get primary button styling

If the action is not fully wired end-to-end, it does not get `C.accent` background primary button styling. Only DONE and DEEP HANDOFF earn primary styling. Everything else is secondary or ghost.

## Current Integration Classification Map

Track and update this as integrations are wired:

### Communication

| Action | Classification | Label |
|---|---|---|
| Post to in-app thread (local) | DONE | "Post Message" |
| Post to backend API thread | DONE (when API configured) | "Send Message" |
| Email via Resend (backend) | DONE (when email_configured) / LIGHT HANDOFF (otherwise) | "Send Email" / "Copy Draft" |
| WhatsApp message | DEEP HANDOFF | "Open in WhatsApp" |
| Phone call | DEEP HANDOFF | "Call [Name]" |
| SMS | DEEP HANDOFF | "Open in Messages" |

### Vendor Actions

| Action | Classification | Label |
|---|---|---|
| Edit vendor details | DONE | "Save Changes" |
| Mark vendor confirmed | RECORD-ONLY | "Mark Confirmed" |
| Mark payment sent | RECORD-ONLY | "Mark Payment Sent" |
| Mark arrival | RECORD-ONLY | "Confirm Arrival" |
| Generate follow-up draft (AI) | DRAFT-ONLY | "Generate Draft" |
| Send follow-up email | Per Communication classification above | Per above |

### Event Actions

| Action | Classification | Label |
|---|---|---|
| Create event | DONE | "Create Event" |
| Delete event | DONE | "Delete Event" |
| Edit event details | DONE | "Save Changes" |
| Download .ics | LIGHT HANDOFF | "Download .ics" |
| Share event | PLANNED | No button |

### Document Actions

| Action | Classification | Label |
|---|---|---|
| Upload file | DONE (when Supabase storage wired) / PLANNED | "Upload" / no button |
| View/download file | DONE (when wired) | "Download" |
| Generate contract | PLANNED | No button |

## Honest Fallback Pattern

When an action is not at its full classification, show an honest fallback:

```javascript
// Example: Send Email button
if (isEmailConfigured()) {
  // DONE: full email delivery
  return <Button primary onClick={sendEmail}>Send Email</Button>;
} else if (isCommApiConfigured()) {
  // RECORD-ONLY: records in thread but no email delivery
  return <Button secondary onClick={postToThread}>Post Message</Button>;
} else {
  // LIGHT HANDOFF: copy to clipboard
  return <Button secondary onClick={copyDraft}>Copy Draft</Button>;
}
```

The button label and style match the actual capability. No primary "Send Email" button when email isn't wired.

## Audit Checklist

When reviewing any surface:

1. List every button/CTA on the surface.
2. Classify each one against the taxonomy.
3. Verify the label matches the classification.
4. Verify the visual style matches the classification (only DONE gets primary).
5. Verify PLANNED features have NO buttons.
6. Verify RECORD-ONLY actions say "Mark" or "Record."
7. Verify LIGHT HANDOFF actions say "Copy" or "Download."
8. Trace each DONE action to its final result — does it actually complete?
