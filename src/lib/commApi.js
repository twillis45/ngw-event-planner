// ─── Communication API client (FastAPI backend) ───────────────────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. When unset, the app
// keeps using its localStorage comms — isCommApiConfigured() is false and nothing
// here is called. UI wiring is deferred until the backend is deployed + testable.
//
// The planner token is a TEMPORARY dev gate (matches backend PLANNER_DEV_TOKEN)
// until Supabase Auth is wired. It is sent as X-Planner-Token.
const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // dev-only

export const isCommApiConfigured = () => Boolean(BASE);

const req = async (method, path, body) => {
  if (!BASE) throw new Error('Comm API not configured');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'X-Planner-Token': TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Comm API ${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
};

const base = (eventId) => `/api/events/${encodeURIComponent(eventId)}/communication`;

export const commApi = {
  listChannels:   (eventId)                       => req('GET',  `${base(eventId)}/channels`),
  ensureChannels: (eventId)                       => req('POST', `${base(eventId)}/channels/ensure`),
  listMessages:   (eventId, channelType, limit=100) => req('GET', `${base(eventId)}/channels/${channelType}/messages?limit=${limit}`),
  createMessage:  (eventId, channelType, msg)     => req('POST', `${base(eventId)}/channels/${channelType}/messages`, msg),
  updateMessage:  (eventId, messageId, patch)     => req('PATCH', `${base(eventId)}/messages/${messageId}`, patch),
  pinMessage:     (eventId, messageId, opts={})   => req('POST', `${base(eventId)}/messages/${messageId}/pin`, opts),
  unpinMessage:   (eventId, messageId)            => req('DELETE', `${base(eventId)}/messages/${messageId}/pin`),
  markRead:       (eventId, channelType, readerKey) => req('POST', `${base(eventId)}/channels/${channelType}/read`, { reader_key: readerKey }),
};
