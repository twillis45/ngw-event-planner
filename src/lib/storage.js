/**
 * Supabase Storage — event file uploads (Sprint 62: Phase 2)
 *
 * Bucket: event-files (private, RLS: planner owns event)
 * Path pattern: {user_id}/{event_id}/{category}/{filename}
 *
 * Categories: contract | invoice | coi | menu | floorplan | other
 *
 * All functions are fail-soft — they return { ok, url, error } so callers
 * can persist metadata even if upload fails, and display honest status.
 *
 * Never called when !isSupabaseConfigured() — callers must check first.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'event-files';
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const isStorageConfigured = () => isSupabaseConfigured();

/** Validate file before upload. Returns { ok, error } */
export function validateFile(file) {
  if (!file) return { ok: false, error: 'No file selected' };
  if (file.size > MAX_SIZE_BYTES) return { ok: false, error: `File too large — max ${MAX_SIZE_MB}MB` };
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp|heic|doc|docx)$/i)) {
    return { ok: false, error: 'File type not supported — use PDF, image, or Word document' };
  }
  return { ok: true };
}

// The bucket accepts only ALLOWED_TYPES (migration 022). Some browsers report
// an empty or vague type for a file validateFile accepted by its extension
// (HEIC especially), so name the type from the extension in that case.
const TYPE_BY_EXT = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export function contentTypeFor(file) {
  if (file && ALLOWED_TYPES.includes(file.type)) return file.type;
  const ext = String((file && file.name) || '').split('.').pop().toLowerCase();
  return TYPE_BY_EXT[ext] || (file && file.type) || 'application/octet-stream';
}

/** Build the storage path for a file */
function buildPath(userId, eventId, category, filename) {
  // Sanitize filename — no directory traversal
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  return `${userId}/${eventId}/${category}/${ts}_${safe}`;
}

/**
 * Upload a file to Supabase Storage.
 * Returns { ok, path, url, error }
 */
export async function uploadFile({ file, eventId, category = 'other', userId }) {
  if (!isStorageConfigured()) return { ok: false, error: 'Storage not configured' };

  const validation = validateFile(file);
  if (!validation.ok) return { ok: false, error: validation.error };
  // Files live under the uploader's own id, and the bucket refuses anyone
  // signed out (migration 022). Say that instead of a bare "upload failed".
  if (!userId || userId === 'anon') return { ok: false, error: 'Sign in to attach files.' };

  const path = buildPath(userId || 'anon', eventId, category, file.name);

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        // Never overwrite: every path carries a timestamp, so a conflict would
        // mean a different file, and the bucket grants no UPDATE (022).
        upsert: false,
        contentType: contentTypeFor(file),
      });

    if (error) {
      console.error('[storage] upload error:', error);
      return { ok: false, error: error.message || 'Upload failed' };
    }

    // Get a signed URL valid for 1 hour (private bucket)
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);

    return {
      ok: true,
      path: data.path,
      url: signed?.signedUrl || null,
      error: signErr?.message || null,
    };
  } catch (e) {
    console.error('[storage] upload exception:', e);
    return { ok: false, error: e.message || 'Upload failed' };
  }
}

/**
 * Get a fresh signed URL for a stored file (1 hour TTL).
 * Returns { ok, url, error }
 */
export async function getSignedUrl(path) {
  if (!isStorageConfigured() || !path) return { ok: false, error: 'Not configured' };
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    if (error) return { ok: false, error: error.message };
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Delete a file from Storage.
 * Returns { ok, error }
 */
export async function deleteFile(path) {
  if (!isStorageConfigured() || !path) return { ok: false, error: 'Not configured' };
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Human-readable file size */
export function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Derive display category from file name or mime type */
export function inferCategory(file) {
  const name = (file.name || '').toLowerCase();
  if (name.includes('contract') || name.includes('agreement')) return 'contract';
  if (name.includes('invoice') || name.includes('receipt')) return 'invoice';
  if (name.includes('coi') || name.includes('insurance') || name.includes('certificate')) return 'coi';
  if (name.includes('menu')) return 'menu';
  if (name.includes('floor') || name.includes('layout') || name.includes('diagram')) return 'floorplan';
  return 'other';
}

export const FILE_CATEGORIES = [
  { id: 'contract',  label: 'Contract',    icon: '📄' },
  { id: 'invoice',   label: 'Invoice',     icon: '🧾' },
  { id: 'coi',       label: 'COI',         icon: '🛡️' },
  { id: 'menu',      label: 'Menu',        icon: '🍽️' },
  { id: 'floorplan', label: 'Floor plan',  icon: '📐' },
  { id: 'other',     label: 'Other',       icon: '📎' },
];
