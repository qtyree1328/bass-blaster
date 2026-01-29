import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const TRENDS_PATH = path.join(process.env.HOME || '', '.clawdbot/trends.json')

interface TrendItem {
  id: string
  type: 'skill' | 'tool' | 'topic' | 'gap'
  title: string
  description: string
  relevance: 'high' | 'medium' | 'low'
  source?: string
  mentions?: number
  addedAt: string
  updatedAt: string
}

interface SkillGap {
  id: string
  skill: string
  demandLevel: 'high' | 'medium' | 'low'
  currentLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
  priority: number
  notes: string
  resources: string[]
  addedAt: string
}

interface TrendsData {
  version: number
  trends: TrendItem[]
  skillGaps: SkillGap[]
  lastAnalysis: string | null
}

async function loadTrends(): Promise<TrendsData> {
  try {
    if (existsSync(TRENDS_PATH)) {
      const data = await readFile(TRENDS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch {}
  return { version: 1, trends: [], skillGaps: [], lastAnalysis: null }
}

async function saveTrends(data: TrendsData): Promise<void> {
  const dir = path.dirname(TRENDS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(TRENDS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet() {
  const data = await loadTrends()
  
  // Sort trends by relevance
  const relevanceOrder = { high: 0, medium: 1, low: 2 }
  data.trends.sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance])
  
  // Sort skill gaps by priority
  data.skillGaps.sort((a, b) => b.priority - a.priority)
  
  return Response.json(data)
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  const data = await loadTrends()
  
  // Add trend
  if (action === 'addTrend') {
    const newTrend: TrendItem = {
      id: `trend-${Date.now()}`,
      type: payload.type || 'topic',
      title: payload.title || 'Untitled',
      description: payload.description || '',
      relevance: payload.relevance || 'medium',
      source: payload.source,
      mentions: payload.mentions,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    data.trends.push(newTrend)
    await saveTrends(data)
    return Response.json({ ok: true, trend: newTrend })
  }
  
  // Add skill gap
  if (action === 'addGap') {
    const newGap: SkillGap = {
      id: `gap-${Date.now()}`,
      skill: payload.skill || 'Unknown',
      demandLevel: payload.demandLevel || 'medium',
      currentLevel: payload.currentLevel || 'none',
      priority: payload.priority || 5,
      notes: payload.notes || '',
      resources: payload.resources || [],
      addedAt: new Date().toISOString(),
    }
    data.skillGaps.push(newGap)
    await saveTrends(data)
    return Response.json({ ok: true, gap: newGap })
  }
  
  // Update trend
  if (action === 'updateTrend' && id) {
    const idx = data.trends.findIndex(t => t.id === id)
    if (idx !== -1) {
      data.trends[idx] = { ...data.trends[idx], ...payload, updatedAt: new Date().toISOString() }
      await saveTrends(data)
      return Response.json({ ok: true })
    }
  }
  
  // Update skill gap
  if (action === 'updateGap' && id) {
    const idx = data.skillGaps.findIndex(g => g.id === id)
    if (idx !== -1) {
      data.skillGaps[idx] = { ...data.skillGaps[idx], ...payload }
      await saveTrends(data)
      return Response.json({ ok: true })
    }
  }
  
  // Delete trend
  if (action === 'deleteTrend' && id) {
    data.trends = data.trends.filter(t => t.id !== id)
    await saveTrends(data)
    return Response.json({ ok: true })
  }
  
  // Delete skill gap
  if (action === 'deleteGap' && id) {
    data.skillGaps = data.skillGaps.filter(g => g.id !== id)
    await saveTrends(data)
    return Response.json({ ok: true })
  }
  
  // Mark analysis done
  if (action === 'markAnalysis') {
    data.lastAnalysis = new Date().toISOString()
    await saveTrends(data)
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
