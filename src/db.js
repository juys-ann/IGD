import Dexie from 'dexie'

export const db = new Dexie('InterGenerationalDB')

db.version(1).stores({ journals: '++id, title, timestamp, mood' })
db.version(2).stores({
  journals:    '++id, title, timestamp, mood',
  graphLinks:  '++id, journalId, entityName, type',
  chatHistory: '++id, role, timestamp',
})
db.version(3).stores({
  journals:     '++id, title, timestamp, mood',
  graphLinks:   '++id, journalId, entityName, type',
  chatSessions: '++id, title, createdAt, updatedAt',
  chatHistory:  '++id, sessionId, role, timestamp',
})

// v4 — IAS: adds vault table for secure PIN storage + emotions on journals
db.version(4).stores({
  journals:     '++id, title, timestamp, mood',
  graphLinks:   '++id, journalId, entityName, type',
  chatSessions: '++id, title, createdAt, updatedAt',
  chatHistory:  '++id, sessionId, role, timestamp',
  // vault: stores the hashed PIN and role config — only one row ever exists
  vault:        '++id, role, createdAt',
})

// v5 — adds indexed `source` field ('written' | 'uploaded') to journals
//      so the Archive can show separate Written vs Uploaded tabs
db.version(5).stores({
  journals:     '++id, title, timestamp, mood, source',
  graphLinks:   '++id, journalId, entityName, type',
  chatSessions: '++id, title, createdAt, updatedAt',
  chatHistory:  '++id, sessionId, role, timestamp',
  vault:        '++id, role, createdAt',
})

// v6 — adds user profile table (single-user: name, photo, bio, api keys)
db.version(6).stores({
  journals:     '++id, title, timestamp, mood, source',
  graphLinks:   '++id, journalId, entityName, type',
  chatSessions: '++id, title, createdAt, updatedAt',
  chatHistory:  '++id, sessionId, role, timestamp',
  vault:        '++id, role, createdAt',
  profile:      '++id, createdAt',  // only one row ever exists
})

// v7 — adds goals table for BehavioralForesight (IGD-022)
db.version(7).stores({
  journals:     '++id, title, timestamp, mood, source',
  graphLinks:   '++id, journalId, entityName, type',
  chatSessions: '++id, title, createdAt, updatedAt',
  chatHistory:  '++id, sessionId, role, timestamp',
  vault:        '++id, role, createdAt',
  profile:      '++id, createdAt',
  goals:        '++id, createdAt',
})


// ── Journal helpers ───────────────────────────────────────────────────────────

export async function saveEntry({ title, content, mood = null, timestamp, emotions, source = 'written' }) {
  return db.journals.add({
    title:     title || 'Untitled Entry',
    content,
    mood,
    emotions:  emotions ?? [],
    source,                                    // 'written' | 'uploaded'
    timestamp: timestamp ?? new Date().toISOString(),
  })
}

export async function updateEntry(id, patch) {
  return db.journals.update(id, { ...patch, timestamp: new Date().toISOString() })
}

export async function getLatestEntry()    { return db.journals.orderBy('timestamp').last() }
export async function getEntryById(id)    { return db.journals.get(Number(id)) }
export async function getAllEntries()     { return db.journals.orderBy('timestamp').reverse().toArray() }
export async function deleteEntry(id)    { return db.journals.delete(id) }
export async function countEntries()     { return db.journals.count() }

export async function countWrittenEntries() {
  return db.journals.where('source').equals('written').count()
}

// ── Knowledge graph helpers ───────────────────────────────────────────────────

export async function addGraphLink({ journalId, entityName, type }) {
  return db.graphLinks.add({ journalId, entityName, type, createdAt: new Date().toISOString() })
}
export async function deleteGraphLinksByJournal(journalId) {
  return db.graphLinks.where('journalId').equals(journalId).delete()
}
export async function getGraphLinksByJournal(journalId) {
  return db.graphLinks.where('journalId').equals(journalId).toArray()
}
export async function getAllGraphLinks()  { return db.graphLinks.toArray() }

export async function getLatestJournalForEntity(entityName, type) {
  const links = await db.graphLinks.where({ entityName, type }).toArray()
  if (!links.length) return null
  const ids  = [...new Set(links.map((l) => l.journalId))]
  const rows = await db.journals.where(':id').anyOf(ids).sortBy('timestamp')
  return rows[rows.length - 1] ?? null
}

// ── Chat session helpers ──────────────────────────────────────────────────────

export async function createChatSession(title = 'New Conversation') {
  const now = new Date().toISOString()
  return db.chatSessions.add({ title, createdAt: now, updatedAt: now })
}
export async function renameChatSession(id, title) {
  return db.chatSessions.update(id, { title, updatedAt: new Date().toISOString() })
}
export async function deleteChatSession(id) {
  await db.chatHistory.where('sessionId').equals(id).delete()
  return db.chatSessions.delete(id)
}
export async function getAllChatSessions() {
  return db.chatSessions.orderBy('updatedAt').reverse().toArray()
}

// ── Chat message helpers ──────────────────────────────────────────────────────

export async function saveChatMessage({ sessionId, role, text, contextIds = [] }) {
  const now = new Date().toISOString()
  await db.chatSessions.update(sessionId, { updatedAt: now })
  return db.chatHistory.add({ sessionId, role, text, contextIds, timestamp: now })
}
export async function loadSessionMessages(sessionId) {
  return db.chatHistory.where('sessionId').equals(sessionId).sortBy('timestamp')
}
export async function clearSessionMessages(sessionId) {
  return db.chatHistory.where('sessionId').equals(sessionId).delete()
}
export async function countChatMessages() { return db.chatHistory.count() }

// ── Vault / Auth helpers (IAS: Secure Authentication) ────────────────────────

/**
 * Save the hashed PIN and role to the vault.
 * Only one vault record exists — the first setup call creates it,
 * subsequent calls update it (for PIN change).
 */
export async function setupVault({ pinHash, role = 'owner' }) {
  const existing = await db.vault.toCollection().first()
  if (existing) {
    return db.vault.update(existing.id, { pinHash, role, updatedAt: new Date().toISOString() })
  }
  return db.vault.add({ pinHash, role, createdAt: new Date().toISOString() })
}

/** Returns the vault record, or null if not set up yet */
export async function getVault() {
  return db.vault.toCollection().first()
}

/** Check if the vault has been configured */
export async function isVaultSetup() {
  const count = await db.vault.count()
  return count > 0
}

// ── Profile helpers ───────────────────────────────────────────────────────────

/**
 * Get the single profile record, or null if not set up.
 * Fields: { name, photo (base64 dataURL), bio, geminiApiKey }
 */
export async function getProfile() {
  return db.profile.toCollection().first()
}

/**
 * Save or update the user profile (only one record ever exists).
 */
export async function saveProfile(patch) {
  const existing = await db.profile.toCollection().first()
  if (existing) {
    return db.profile.update(existing.id, { ...patch, updatedAt: new Date().toISOString() })
  }
  return db.profile.add({ ...patch, createdAt: new Date().toISOString() })
}

/**
 * Delete all user data — journals, chat, vault, profile.
 * Called from the "Delete Account" flow.
 */
export async function deleteAllUserData() {
  await db.journals.clear()
  await db.graphLinks.clear()
  await db.chatSessions.clear()
  await db.chatHistory.clear()
  await db.vault.clear()
  await db.profile.clear()
  await db.goals.clear()
}

// ── Compatibility aliases ─────────────────────────────────────────────────────
// Satisfies any imports that reference these names from older source files.

/** Alias: update the stored display name on the profile */
export async function updateDisplayName(name) {
  return saveProfile({ name })
}

/** Alias: update the stored profile photo */
export async function updateProfilePhoto(photo) {
  return saveProfile({ photo })
}

/** Alias: get the stored display name, or a default */
export async function getDisplayName() {
  const p = await getProfile()
  return p?.name ?? 'Jhoyce'
}

// ── Goals helpers (BehavioralForesight — IGD-022) ─────────────────────────────

export async function addGoal({ text, probability = 0 }) {
  return db.goals.add({
    text,
    probability,
    createdAt: new Date().toISOString(),
  })
}

export async function deleteGoal(id) {
  return db.goals.delete(id)
}

export async function getAllGoals() {
  return db.goals.orderBy('createdAt').reverse().toArray()
}
