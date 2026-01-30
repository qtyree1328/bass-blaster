import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir, appendFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const HOME = process.env.HOME || ''
const TRENDS_PATH = path.join(HOME, '.clawdbot/trends.json')
const MEMORY_PATH = path.join(HOME, 'clawd/memory/trends-notes.md')

interface TrendItem {
  id: string
  type: 'market' | 'skill'
  title: string
  description: string
  relevance: 'high' | 'medium' | 'low'
  source?: string
  addedAt: string
  updatedAt: string
  saved: boolean
  notes?: string
}

interface TrendsData {
  version: number
  trends: TrendItem[]
}

async function loadTrends(): Promise<TrendItem[]> {
  try {
    if (existsSync(TRENDS_PATH)) {
      const data = await readFile(TRENDS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return (parsed.trends || []).map((item: any) => ({
        ...item,
        saved: item.saved ?? false,
        notes: item.notes ?? ''
      }))
    }
  } catch {}
  return []
}

async function saveTrends(trends: TrendItem[]): Promise<void> {
  const dir = path.dirname(TRENDS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: TrendsData = { version: 1, trends }
  await writeFile(TRENDS_PATH, JSON.stringify(data, null, 2))
}

// Write to memory file when user saves a trend with notes
async function writeToMemory(trend: TrendItem): Promise<void> {
  const memDir = path.dirname(MEMORY_PATH)
  if (!existsSync(memDir)) {
    await mkdir(memDir, { recursive: true })
  }
  
  const date = new Date().toISOString().split('T')[0]
  const entry = `
## ${date} - ${trend.title}

**Type:** ${trend.type === 'market' ? 'Market Trend' : 'Skill Gap'}
**Relevance:** ${trend.relevance}
**Source:** ${trend.source || 'Unknown'}

${trend.description}

**My Notes:**
${trend.notes || 'No notes'}

---
`
  
  await appendFile(MEMORY_PATH, entry)
}

async function handleGet() {
  const trends = await loadTrends()
  
  // Sort by date, newest first
  trends.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  
  return Response.json({ trends })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  let trends = await loadTrends()
  
  if (action === 'add') {
    const newTrend: TrendItem = {
      id: `trend-${Date.now()}`,
      type: payload.type || 'market',
      title: payload.title || 'Untitled',
      description: payload.description || '',
      relevance: payload.relevance || 'medium',
      source: payload.source,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      notes: ''
    }
    trends.unshift(newTrend)
    await saveTrends(trends)
    return Response.json({ ok: true, trend: newTrend })
  }
  
  if (action === 'save' && id) {
    const idx = trends.findIndex(t => t.id === id)
    if (idx !== -1) {
      trends[idx].saved = true
      trends[idx].notes = payload.notes || trends[idx].notes || ''
      trends[idx].updatedAt = new Date().toISOString()
      await saveTrends(trends)
      
      // Write to memory file
      await writeToMemory(trends[idx])
      
      return Response.json({ ok: true })
    }
  }
  
  if (action === 'unsave' && id) {
    const idx = trends.findIndex(t => t.id === id)
    if (idx !== -1) {
      trends[idx].saved = false
      trends[idx].updatedAt = new Date().toISOString()
      await saveTrends(trends)
      return Response.json({ ok: true })
    }
  }
  
  if (action === 'updateNotes' && id) {
    const idx = trends.findIndex(t => t.id === id)
    if (idx !== -1) {
      trends[idx].notes = payload.notes || ''
      trends[idx].updatedAt = new Date().toISOString()
      await saveTrends(trends)
      
      // Update memory file
      if (trends[idx].saved) {
        await writeToMemory(trends[idx])
      }
      
      return Response.json({ ok: true })
    }
  }
  
  if (action === 'delete' && id) {
    trends = trends.filter(t => t.id !== id)
    await saveTrends(trends)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/trends')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
