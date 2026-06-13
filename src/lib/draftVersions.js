// Reusable draft-version store. Every draft surface in the app — proposals,
// the event-day schedule, documents, messages — can keep multiple named
// versions and switch the active one. Each surface passes a stable `key`
// (e.g. `proposal:<eventId>`, `schedule:<eventId>`, `doc:<docId>`); we persist
// an ordered list of snapshots + which one is active under one localStorage row.
//
// `content` is anything JSON-serializable: a string (proposal / message body)
// or an array (schedule items, document rows). The store never inspects it —
// the surface decides how to render and how to restore it.
const PREFIX = 'ngw-draft-versions-';

const read = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFIX + key));
    if (raw && Array.isArray(raw.versions)) return raw;
  } catch {}
  return { versions: [], activeId: null };
};

const write = (key, state) => {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(state)); } catch {}
  return state;
};

export const listVersions = (key) => read(key).versions;
export const getActiveId = (key) => read(key).activeId;
export const getVersion = (key, id) => read(key).versions.find(v => v.id === id) || null;

// Snapshot the current content as a new version and make it active.
export const saveVersion = (key, content, label) => {
  const state = read(key);
  const n = state.versions.length + 1;
  const id = `v${n}-${Date.now().toString(36)}`;
  const version = {
    id,
    label: (label && String(label).trim()) || `Version ${n}`,
    content,
    createdAt: new Date().toISOString(),
  };
  write(key, { versions: [...state.versions, version], activeId: id });
  return version;
};

export const renameVersion = (key, id, label) => {
  const state = read(key);
  return write(key, {
    ...state,
    versions: state.versions.map(v => v.id === id ? { ...v, label: String(label || v.label) } : v),
  });
};

export const deleteVersion = (key, id) => {
  const state = read(key);
  const versions = state.versions.filter(v => v.id !== id);
  const activeId = state.activeId === id ? (versions[versions.length - 1]?.id || null) : state.activeId;
  return write(key, { versions, activeId });
};

export const setActiveVersion = (key, id) => write(key, { ...read(key), activeId: id });

// Overwrite the active version's content in place (used when "Save" should
// update the current version rather than fork a new one).
export const updateActiveVersion = (key, content) => {
  const state = read(key);
  if (!state.activeId) return state;
  return write(key, {
    ...state,
    versions: state.versions.map(v => v.id === state.activeId ? { ...v, content, updatedAt: new Date().toISOString() } : v),
  });
};
