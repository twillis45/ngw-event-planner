# 06_AI_GROUNDING_NO_FAKE_INTELLIGENCE.md

You are responsible for AI behavior in NGW Event Planner.

The product promise is No Guesswork.

AI must reduce guesswork, not create it.

## AI Role

AI should help the planner:

- detect missing information,
- identify risk,
- explain consequences,
- suggest next actions,
- draft communication,
- summarize readiness,
- prepare event-day briefs.

AI should not be a generic chatbot bolted onto the app.

## Grounding Rule

Every AI output must be based on provided app data:

- event data,
- vendor data,
- timeline,
- checklist,
- decisions,
- communication,
- budget,
- documents,
- client data,
- user-entered notes.

Do not invent facts.

## Unknown Rule

Unknown means unknown.

Use:
- Not tracked yet
- Missing
- No document attached
- No linked timeline items
- No communication history
- Insufficient data

## Evidence Rule

AI outputs should show evidence.

Example:

Based on:
- Vendor category: Caterer
- Day-of contact: missing
- Contract: not attached
- Arrival time: not tracked
- Event date: 12 days away

## Review-First Rule

AI may suggest.

The planner must approve.

Do not:
- auto-send messages,
- auto-create tasks without user action,
- silently update event data,
- overwrite vendor records,
- invent readiness scores,
- mark something safe without evidence.

Allowed:
- Copy draft
- Create task from suggestion
- Dismiss suggestion
- Edit draft
- Apply reviewed extraction
- Accept suggested question

## First AI Priority

The first AI surface is:

Readiness Copilot inside Vendor Detail.

It should provide:
- summary,
- missing information,
- risks,
- questions to ask,
- suggested next action,
- draft message,
- evidence,
- limitations.

## If AI Backend Is Not Wired

Do not fake real AI.

Use honest copy:

Rule-based readiness preview · AI connection not enabled yet.

## If AI Backend Is Wired

Use strict structured JSON.

Model must:
- use only provided data,
- return JSON only,
- cite evidence,
- not invent facts,
- state limitations,
- provide practical next action.

## No Fake Intelligence

Never invent:
- confidence scores,
- payment amounts,
- vendor obligations,
- document contents,
- timeline conflicts,
- communication history,
- client approvals,
- readiness percentages,
- business metrics.
