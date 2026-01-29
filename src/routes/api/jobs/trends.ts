import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const TRENDS_PATH = path.join(process.env.HOME || '', '.clawdbot/job-hunter/trends.json')

interface SkillTrend {
  id: string
  skill: string
  category: 'technical' | 'tool' | 'method' | 'domain' | 'soft'
  frequency: number // percentage of jobs mentioning this
  trend: 'rising' | 'stable' | 'declining'
  inResume: boolean
  inPortfolio: boolean
  priority: 'high' | 'medium' | 'low'
  recommendation?: string
  projectIdea?: string
  addedAt: string
  updatedAt?: string
}

interface MarketInsight {
  id: string
  type: 'observation' | 'opportunity' | 'warning' | 'recommendation'
  title: string
  description: string
  actionable: boolean
  action?: string
  source?: string
  addedAt: string
  dismissed: boolean
}

interface TrendsData {
  version: number
  lastScan: string
  skills: SkillTrend[]
  insights: MarketInsight[]
  resumeGaps: string[]
  portfolioGaps: string[]
}

async function loadTrends(): Promise<TrendsData> {
  try {
    if (existsSync(TRENDS_PATH)) {
      const data = await readFile(TRENDS_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch {}
  return {
    version: 1,
    lastScan: '',
    skills: [],
    insights: [],
    resumeGaps: [],
    portfolioGaps: []
  }
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
  
  // Calculate stats
  const stats = {
    totalSkills: data.skills.length,
    gapsCount: data.skills.filter(s => !s.inResume && s.priority !== 'low').length,
    risingSkills: data.skills.filter(s => s.trend === 'rising').length,
    activeInsights: data.insights.filter(i => !i.dismissed).length,
  }
  
  // Sort skills by priority and frequency
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const sortedSkills = [...data.skills].sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.frequency - a.frequency
  })
  
  return Response.json({
    ...data,
    skills: sortedSkills,
    stats
  })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  const data = await loadTrends()
  
  // Add skill trend
  if (action === 'add-skill') {
    const newSkill: SkillTrend = {
      id: `skill-${Date.now()}`,
      skill: payload.skill || 'Unknown',
      category: payload.category || 'technical',
      frequency: payload.frequency || 0,
      trend: payload.trend || 'stable',
      inResume: payload.inResume || false,
      inPortfolio: payload.inPortfolio || false,
      priority: payload.priority || 'medium',
      recommendation: payload.recommendation,
      projectIdea: payload.projectIdea,
      addedAt: new Date().toISOString()
    }
    data.skills.push(newSkill)
    data.lastScan = new Date().toISOString()
    await saveTrends(data)
    return Response.json({ ok: true, skill: newSkill })
  }
  
  // Update skill
  if (action === 'update-skill' && id) {
    const idx = data.skills.findIndex(s => s.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    data.skills[idx] = {
      ...data.skills[idx],
      ...payload,
      updatedAt: new Date().toISOString()
    }
    await saveTrends(data)
    return Response.json({ ok: true, skill: data.skills[idx] })
  }
  
  // Add insight
  if (action === 'add-insight') {
    const newInsight: MarketInsight = {
      id: `insight-${Date.now()}`,
      type: payload.type || 'observation',
      title: payload.title || 'Untitled',
      description: payload.description || '',
      actionable: payload.actionable || false,
      action: payload.action,
      source: payload.source,
      addedAt: new Date().toISOString(),
      dismissed: false
    }
    data.insights.push(newInsight)
    await saveTrends(data)
    return Response.json({ ok: true, insight: newInsight })
  }
  
  // Dismiss insight
  if (action === 'dismiss-insight' && id) {
    const idx = data.insights.findIndex(i => i.id === id)
    if (idx !== -1) {
      data.insights[idx].dismissed = true
      await saveTrends(data)
    }
    return Response.json({ ok: true })
  }
  
  // Update gaps
  if (action === 'set-gaps') {
    if (payload.resumeGaps) data.resumeGaps = payload.resumeGaps
    if (payload.portfolioGaps) data.portfolioGaps = payload.portfolioGaps
    await saveTrends(data)
    return Response.json({ ok: true })
  }
  
  // Bulk update (for scan results)
  if (action === 'bulk-update') {
    if (payload.skills) data.skills = payload.skills
    if (payload.insights) data.insights = [...data.insights, ...payload.insights]
    if (payload.resumeGaps) data.resumeGaps = payload.resumeGaps
    if (payload.portfolioGaps) data.portfolioGaps = payload.portfolioGaps
    data.lastScan = new Date().toISOString()
    await saveTrends(data)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/jobs/trends')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
