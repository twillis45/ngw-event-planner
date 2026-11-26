// CONTACT INPUT (owner, 11/26/2026: "Make sure we are auto formatting contact
// info. Phone and email in both versions. Also add verification for those
// values."). The guest editor's Phone and Email. Same rules as hostv4, from
// lib/contactFormat: a phone formats as it's typed; once she leaves the field,
// what's wrong shows in one line; an email is written trimmed. Writes go out as
// she types, as the editor's other fields do.
import { useState } from 'react';
import { formatPhoneUS, cleanEmail, phoneProblem, emailProblem } from '@app/lib/contactFormat';

export default function ContactInput({ kind, label, value, onWrite, className, placeholder }) {
  const [left, setLeft] = useState(false);
  const v = value || '';
  const problem = left ? (kind === 'phone' ? phoneProblem(v) : emailProblem(v)) : null;
  const id = 'ci-' + kind + '-' + label.replace(/\W+/g, '');
  return (<>
    <input className={className} type={kind === 'phone' ? 'tel' : 'email'} inputMode={kind === 'phone' ? 'tel' : 'email'}
      aria-label={label} placeholder={placeholder} value={v}
      aria-invalid={problem ? true : undefined} aria-describedby={problem ? id : undefined}
      onChange={(e) => onWrite(kind === 'phone' ? formatPhoneUS(e.target.value) : e.target.value)}
      onBlur={() => { setLeft(true); if (kind === 'email' && cleanEmail(v) !== v) onWrite(cleanEmail(v)); }} />
    {problem && <p className="warn-note contact-problem" id={id} role="status" data-contact-problem={kind}>{problem}</p>}
  </>);
}
