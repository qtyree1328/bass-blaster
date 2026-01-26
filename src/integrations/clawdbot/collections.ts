import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { MonitorSession, MonitorAction } from './protocol'

// Track runId → sessionKey mapping (learned from chat events)
const runSessionMap = new Map<string, string>()

export const sessionsCollection = createCollection(
  localOnlyCollectionOptions<MonitorSession>({
    id: 'clawdbot-sessions',
    getKey: (item) => item.key,
  })
)

export const actionsCollection = createCollection(
  localOnlyCollectionOptions<MonitorAction>({
    id: 'clawdbot-actions',
    getKey: (item) => item.id,
  })
)

// Helper to update or insert session
export function upsertSession(session: MonitorSession) {
  const existing = sessionsCollection.state.get(session.key)
  if (existing) {
    sessionsCollection.update(session.key, (draft) => {
      Object.assign(draft, session)
    })
  } else {
    sessionsCollection.insert(session)
  }
}

// Helper to add or update action
// For deltas, we aggregate into a single "streaming" action per runId
export function addAction(action: MonitorAction) {
  // Learn runId → sessionKey mapping from actions with real session keys
  if (action.sessionKey && !action.sessionKey.includes('lifecycle')) {
    runSessionMap.set(action.runId, action.sessionKey)
  }

  // Resolve sessionKey: use mapped value if action has lifecycle/invalid key
  let sessionKey = action.sessionKey
  if (!sessionKey || sessionKey === 'lifecycle') {
    sessionKey = runSessionMap.get(action.runId) || sessionKey
  }

  // For deltas, use runId as the key (aggregate all deltas)
  if (action.type === 'delta') {
    const streamingId = `${action.runId}-stream`
    const existing = actionsCollection.state.get(streamingId)
    if (existing) {
      // Append content and update sessionKey if we learned it
      actionsCollection.update(streamingId, (draft) => {
        draft.content = (draft.content || '') + (action.content || '')
        draft.seq = action.seq
        draft.timestamp = action.timestamp
        if (sessionKey && sessionKey !== 'lifecycle') {
          draft.sessionKey = sessionKey
        }
      })
    } else {
      // Create new streaming action
      actionsCollection.insert({
        ...action,
        id: streamingId,
        sessionKey,
      })
    }
    return
  }

  // For final/error/aborted, update the streaming action's type
  if (action.type === 'final' || action.type === 'error' || action.type === 'aborted') {
    const streamingId = `${action.runId}-stream`
    const streaming = actionsCollection.state.get(streamingId)
    if (streaming) {
      actionsCollection.update(streamingId, (draft) => {
        draft.type = action.type
        draft.seq = action.seq
        draft.timestamp = action.timestamp
        if (sessionKey && sessionKey !== 'lifecycle') {
          draft.sessionKey = sessionKey
        }
      })
      return
    }
    // No streaming action found, create as-is
  }

  // For tool_call/tool_result or orphaned finals, add as new
  const existing = actionsCollection.state.get(action.id)
  if (!existing) {
    actionsCollection.insert({ ...action, sessionKey })
  }
}

// Helper to update session status
export function updateSessionStatus(
  key: string,
  status: MonitorSession['status']
) {
  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, (draft) => {
      draft.status = status
      draft.lastActivityAt = Date.now()
    })
  }
}

// Helper to update partial session data
export function updateSession(key: string, update: Partial<MonitorSession>) {
  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, (draft) => {
      Object.assign(draft, update)
    })
  }
}

// Clear all data
export function clearCollections() {
  for (const session of sessionsCollection.state.values()) {
    sessionsCollection.delete(session.key)
  }
  for (const action of actionsCollection.state.values()) {
    actionsCollection.delete(action.id)
  }
}
