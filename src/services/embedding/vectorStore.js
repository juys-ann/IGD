/**
 * src/services/embedding/vectorStore.js
 *
 * Local vector store backed by IndexedDB (via Dexie).
 * Stores 384-dim sentence embeddings alongside journal entry IDs.
 * Provides cosine similarity search — the foundation for semantic RAG.
 *
 * Sprint 2/3 requirement (IGD-005): "All text chunks are successfully
 * converted into high-dimensional vectors locally. The vector index
 * persists in the browser's local storage for offline retrieval.
 * Semantic search returns relevant results in under 500ms."
 */

import Dexie from 'dexie'

// Separate lightweight DB just for vectors — keeps the main DB clean
const vectorDB = new Dexie('IGD_Vectors')
vectorDB.version(1).stores({
  vectors: '++id, journalId, chunkIndex, createdAt',
  // vector field stored as a Float32Array serialised to a JSON string
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cosine similarity between two equal-length arrays. Returns -1 to 1. */
export function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

/** Split long text into overlapping chunks for better retrieval coverage. */
export function chunkText(text, maxWords = 150, overlapWords = 20) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return [text]

  const chunks = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length)
    chunks.push(words.slice(start, end).join(' '))
    if (end === words.length) break
    start += maxWords - overlapWords
  }
  return chunks
}

// ── Store operations ──────────────────────────────────────────────────────────

/**
 * Save one or more chunk vectors for a journal entry.
 * Replaces any existing vectors for that entry (re-indexing).
 */
export async function saveVectors(journalId, vectors) {
  // Delete stale vectors for this entry first
  await vectorDB.vectors.where('journalId').equals(journalId).delete()

  const now = new Date().toISOString()
  const rows = vectors.map((vector, chunkIndex) => ({
    journalId,
    chunkIndex,
    vector: JSON.stringify(vector),  // IndexedDB can't store Float32Array directly
    createdAt: now,
  }))

  await vectorDB.vectors.bulkAdd(rows)
}

/**
 * Delete all vectors for a journal entry (called when entry is deleted).
 */
export async function deleteVectors(journalId) {
  return vectorDB.vectors.where('journalId').equals(journalId).delete()
}

/**
 * Count total stored vectors (for stats).
 */
export async function countVectors() {
  return vectorDB.vectors.count()
}

/**
 * Semantic search: find the topK most similar journal entries to a query vector.
 *
 * Returns array of { journalId, score, chunkIndex } sorted by score descending.
 * De-duplicates by journalId — if multiple chunks from the same entry match,
 * only the highest-scoring chunk is returned.
 */
export async function semanticSearch(queryVector, topK = 5) {
  const allRows = await vectorDB.vectors.toArray()
  if (!allRows.length) return []

  const scored = allRows.map((row) => ({
    journalId:  row.journalId,
    chunkIndex: row.chunkIndex,
    score:      cosineSimilarity(queryVector, JSON.parse(row.vector)),
  }))

  // De-duplicate: keep best score per journal entry
  const best = {}
  for (const item of scored) {
    if (!best[item.journalId] || item.score > best[item.journalId].score) {
      best[item.journalId] = item
    }
  }

  return Object.values(best)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Check if a journal entry has been indexed.
 */
export async function isIndexed(journalId) {
  const count = await vectorDB.vectors.where('journalId').equals(journalId).count()
  return count > 0
}

/**
 * Get all indexed journal IDs.
 */
export async function getIndexedIds() {
  const rows = await vectorDB.vectors.toArray()
  return [...new Set(rows.map((r) => r.journalId))]
}
