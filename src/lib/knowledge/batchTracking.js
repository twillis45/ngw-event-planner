// ─── Batch Research Tracking — run visibility for bulk campaigns ─────────────
// Tracks batches of research campaigns: what's queued, running, done, failed.
// Every batch has metadata (ID, intent type, start time, count).
// Every run links to a batch ID for aggregated progress tracking.

import { loadRuns, upsertWorker } from './knowledgeWorkers';

const BATCH_STORE_KEY = 'ngw-batch-history';

export const BATCH_STATE = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

// ─── Batch record structure ────────────────────────────────────────────────
export function createBatch(intentType, gapCount, selectedGaps = []) {
  const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    intentType,           // e.g. 'QUANTITY-VALIDATION', 'COST-VERIFICATION'
    state: BATCH_STATE.QUEUED,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    totalItems: gapCount,
    selectedGapIds: selectedGaps,
    stats: {
      queued: gapCount,
      running: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
    },
    runIds: [],           // Array of run IDs in this batch
    cancelledAt: null,
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────
export function loadBatchHistory() {
  try {
    const stored = localStorage.getItem(BATCH_STORE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveBatchHistory(batches) {
  try {
    localStorage.setItem(BATCH_STORE_KEY, JSON.stringify(batches));
  } catch {
    console.warn('Failed to save batch history');
  }
}

// ─── Batch lifecycle ──────────────────────────────────────────────────────
export function upsertBatch(batch) {
  const history = loadBatchHistory();
  const idx = history.findIndex((b) => b.id === batch.id);
  if (idx >= 0) {
    history[idx] = batch;
  } else {
    history.push(batch);
  }
  saveBatchHistory(history);
  return batch;
}

export function getBatch(batchId) {
  return loadBatchHistory().find((b) => b.id === batchId) || null;
}

export function startBatch(batchId) {
  const batch = getBatch(batchId);
  if (batch) {
    batch.state = BATCH_STATE.RUNNING;
    batch.startedAt = new Date().toISOString();
    upsertBatch(batch);
  }
  return batch;
}

export function completeBatch(batchId) {
  const batch = getBatch(batchId);
  if (batch) {
    batch.state = BATCH_STATE.COMPLETED;
    batch.completedAt = new Date().toISOString();
    upsertBatch(batch);
  }
  return batch;
}

export function failBatch(batchId) {
  const batch = getBatch(batchId);
  if (batch) {
    batch.state = BATCH_STATE.FAILED;
    batch.completedAt = new Date().toISOString();
    upsertBatch(batch);
  }
  return batch;
}

export function cancelBatch(batchId) {
  const batch = getBatch(batchId);
  if (batch) {
    batch.state = BATCH_STATE.CANCELLED;
    batch.cancelledAt = new Date().toISOString();
    upsertBatch(batch);
  }
  return batch;
}

// ─── Link run to batch ─────────────────────────────────────────────────────
export function addRunToBatch(batchId, runId) {
  const batch = getBatch(batchId);
  if (batch && !batch.runIds.includes(runId)) {
    batch.runIds.push(runId);
    upsertBatch(batch);
  }
  return batch;
}

// ─── Batch progress calculation ────────────────────────────────────────────
export function getBatchProgress(batchId) {
  const batch = getBatch(batchId);
  if (!batch) return null;

  const allRuns = loadRuns();
  const batchRuns = allRuns.filter((r) => batch.runIds.includes(r.id));

  let stats = {
    queued: batchRuns.filter((r) => r.state === 'queued').length,
    running: batchRuns.filter((r) => r.state === 'running').length,
    completed: batchRuns.filter((r) => r.state === 'completed').length,
    failed: batchRuns.filter((r) => r.state === 'failed').length,
  };

  // If batch is complete but no individual runs tracked, infer all are done
  if (batch.state === BATCH_STATE.COMPLETED && batchRuns.length === 0) {
    stats = {
      queued: 0,
      running: 0,
      completed: batch.totalItems || 0,
      failed: 0,
    };
  } else if (batch.state === BATCH_STATE.FAILED && batchRuns.length === 0) {
    stats = {
      queued: 0,
      running: 0,
      completed: 0,
      failed: batch.totalItems || 0,
    };
  }

  const total = batchRuns.length || batch.totalItems || 0;
  const done = stats.completed + stats.failed;
  const pctComplete = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    ...batch,
    stats,
    total,
    done,
    pctComplete,
    isActive: batch.state === BATCH_STATE.RUNNING,
    recentRuns: batchRuns.slice(-10),
  };
}

// ─── Active batch (currently running) ──────────────────────────────────────
export function getActiveBatch() {
  const history = loadBatchHistory();
  return history.find((b) => b.state === BATCH_STATE.RUNNING) || null;
}

export function clearBatchHistory() {
  localStorage.removeItem(BATCH_STORE_KEY);
}
