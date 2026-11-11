// One quiet line of published policy links (lib/policyLinks). Renders nothing
// while no policy is published, which is the state today.
import { publishedPolicies } from '@app/lib/policyLinks';

export default function PolicyLinks({ prefix, style }) {
  const links = publishedPolicies();
  if (!links.length) return null;
  return (
    <p className="grounding policy-links" style={style}>
      {prefix ? prefix + ' ' : ''}
      {links.map((l, i) => (
        <span key={l.key}>{i ? ' · ' : ''}<a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></span>
      ))}
    </p>
  );
}
