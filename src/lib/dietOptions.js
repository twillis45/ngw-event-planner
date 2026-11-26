// ONE LIST of what a guest eats, what rules they keep, and what they're
// allergic to (owner, 11/25/2026: "Dietary options are missing, and allergies
// need to be separated from dietary options"). The guest's RSVP form and the
// host's guest sheet ask from these same lists, and save to the same fields:
// g.meal, g.diets and g.allergens, which the food plan and helper asks read.
//
// Moved here unchanged from hostv2/src/InviteV2.jsx, where they were authored
// (host request 2026-07-12): ALLERGENS is the FDA "big-9"; DIET_RULES are rules
// and preferences, softer than the same-named allergen (the host sees both).
export const MEALS = Object.freeze(['Standard', 'Vegetarian', 'Vegan', 'Pescatarian']);
export const ALLERGENS = Object.freeze(['Peanut', 'Tree nuts', 'Milk', 'Egg', 'Fish', 'Shellfish', 'Soy', 'Wheat / gluten', 'Sesame']);
export const DIET_RULES = Object.freeze(['Gluten-free', 'Dairy-free', 'Halal', 'Kosher', 'No alcohol']);
