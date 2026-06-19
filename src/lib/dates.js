// Canonical day-difference math — ONE source of truth so every surface agrees on
// "how many days until the event". A YYYY-MM-DD string is parsed as LOCAL midnight
// and measured from local midnight today, so the result is a clean integer that
// never drifts by a day with the time of day or timezone.
//
// This reconciles a latent bug: the weather window was gated in two places that
// computed the day count differently — daysUntil (local-midnight to local-midnight)
// vs an inline `ceil((new Date(iso) - new Date())/day)` (UTC-midnight to now). They
// disagreed by a day right at the 14-day boundary, so a forecast occasionally
// wouldn't show for an event sitting exactly 14 days out.

export const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const daysUntil = (d) => {
  if (!d) return null;
  const target = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return isNaN(target) ? null : Math.ceil((target - getToday()) / 86400000);
};
