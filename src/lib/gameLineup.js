// ─── The host's own games ────────────────────────────────────────────────────
// Owner request (11/6/2026): a host can name the games she has. They live on
// event.gameLineup and count toward the playbook's "Game library" need, so
// "still need 4" becomes "still need 1" as she names three. Her names, stored
// as typed (trimmed, capped); nothing here suggests or ranks a game.
export const GAME_NAME_MAX = 60;

const key = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** { list, added, reason } — the lineup with `name` added, or why it was not. */
export function addGame(list, name, id) {
  const cur = Array.isArray(list) ? list : [];
  const nm = String(name || '').trim().replace(/\s+/g, ' ');
  if (!nm) return { list: cur, added: false, reason: 'empty' };
  if (nm.length > GAME_NAME_MAX) return { list: cur, added: false, reason: 'long' };
  if (cur.some((g) => key(g && g.name) === key(nm))) return { list: cur, added: false, reason: 'duplicate' };
  return { list: [...cur, { id: id || 'gm-' + Date.now().toString(36), name: nm }], added: true, reason: null };
}

export function removeGame(list, id) {
  return (Array.isArray(list) ? list : []).filter((g) => g && g.id !== id);
}

/** Is this capacity item the game library? */
export const isGameLibrary = (it) => /game library/i.test(String((it && (it.item || it.short)) || ''));
