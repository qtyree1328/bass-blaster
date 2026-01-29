import { createFileRoute } from '@tanstack/react-router'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

// Cost estimates (Claude pricing)
const COST_PER_1M_INPUT = 3
const COST_PER_1M_OUTPUT = 15

const SESSIONS_DIR = '/Users/hutchbot/.clawdbot/agents/main/sessions'

interface SessionUsage {
  sessionId: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  messageCount: number
  lastActivity: string
}

interface UsageData {
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheWrite: number
  totalCost: number
  sessions: SessionUsage[]
  lastUpdated: string
  // Context window info
  currentSession?: {
    sessionId: string
    contextUsed: number  // Total tokens in current context
    contextMax: number   // Claude Opus max (200K)
    input: number
    output: number
  }
}

const CLAUDE_OPUS_MAX_CONTEXT = 200000

async function parseSessionFile(filePath: string): Promise<SessionUsage | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n')
    
    let sessionId = ''
    let totalInput = 0
    let totalOutput = 0
    let totalCacheRead = 0
    let totalCacheWrite = 0
    let totalCost = 0
    let messageCount = 0
    let lastActivity = ''
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        
        // Get session ID from session entry
        if (entry.type === 'session' && entry.id) {
          sessionId = entry.id
        }
        
        // Track timestamps
        if (entry.timestamp) {
          lastActivity = entry.timestamp
        }
        
        // Aggregate usage from assistant messages
        if (entry.type === 'message' && entry.message?.role === 'assistant' && entry.message?.usage) {
          const usage = entry.message.usage
          totalInput += usage.input || 0
          totalOutput += usage.output || 0
          totalCacheRead += usage.cacheRead || 0
          totalCacheWrite += usage.cacheWrite || 0
          totalCost += usage.cost?.total || 0
          messageCount++
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    if (!sessionId || messageCount === 0) {
      return null
    }
    
    return {
      sessionId,
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead,
      cacheWrite: totalCacheWrite,
      cost: totalCost,
      messageCount,
      lastActivity
    }
  } catch {
    return null
  }
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || '24h'
  
  // Calculate time threshold based on range
  const now = Date.now()
  let threshold = 0
  switch (range) {
    case '1h':
      threshold = now - (60 * 60 * 1000)
      break
    case '24h':
      threshold = now - (24 * 60 * 60 * 1000)
      break
    case '7d':
      threshold = now - (7 * 24 * 60 * 60 * 1000)
      break
    case 'all':
    default:
      threshold = 0
  }
  
  try {
    const files = await readdir(SESSIONS_DIR)
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))
    
    const sessions: SessionUsage[] = []
    let totalInput = 0
    let totalOutput = 0
    let totalCacheRead = 0
    let totalCacheWrite = 0
    let totalCost = 0
    
    for (const file of jsonlFiles) {
      const filePath = join(SESSIONS_DIR, file)
      const sessionUsage = await parseSessionFile(filePath)
      
      if (sessionUsage) {
        // Filter by time range
        const activityTime = new Date(sessionUsage.lastActivity).getTime()
        if (range !== 'all' && activityTime < threshold) {
          continue
        }
        
        sessions.push(sessionUsage)
        totalInput += sessionUsage.input
        totalOutput += sessionUsage.output
        totalCacheRead += sessionUsage.cacheRead
        totalCacheWrite += sessionUsage.cacheWrite
        totalCost += sessionUsage.cost
      }
    }
    
    // Sort by most recent activity
    sessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )
    
    // Find main session (most recent, typically the active one)
    // Look for main session file specifically
    let currentSession = undefined
    try {
      const mainSessionPath = join(SESSIONS_DIR, 'main.jsonl')
      const mainUsage = await parseSessionFile(mainSessionPath)
      if (mainUsage) {
        const contextUsed = mainUsage.input + mainUsage.output
        currentSession = {
          sessionId: mainUsage.sessionId,
          contextUsed,
          contextMax: CLAUDE_OPUS_MAX_CONTEXT,
          input: mainUsage.input,
          output: mainUsage.output
        }
      }
    } catch {
      // If no main.jsonl, use most recent session
      if (sessions.length > 0) {
        const recent = sessions[0]
        const contextUsed = recent.input + recent.output
        currentSession = {
          sessionId: recent.sessionId,
          contextUsed,
          contextMax: CLAUDE_OPUS_MAX_CONTEXT,
          input: recent.input,
          output: recent.output
        }
      }
    }
    
    const result: UsageData = {
      totalInput,
      totalOutput,
      totalCacheRead,
      totalCacheWrite,
      totalCost,
      sessions: sessions.slice(0, 20), // Limit to top 20
      lastUpdated: new Date().toISOString(),
      currentSession
    }
    
    return Response.json(result)
  } catch (e) {
    // Return empty data if can't read sessions
    return Response.json({
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheWrite: 0,
      totalCost: 0,
      sessions: [],
      lastUpdated: new Date().toISOString()
    })
  }
}

export const Route = createFileRoute('/api/usage')({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
})
