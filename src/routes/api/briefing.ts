import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const HOME = process.env.HOME || ''
const BRIEFING_PATH = path.join(HOME, '.clawdbot/morning-briefings.json')
const NEWS_PATH = path.join(HOME, '.clawdbot/news.json')
const TASKS_PATH = path.join(HOME, '.clawdbot/kanban-tasks.json')
const JOBS_PATH = path.join(HOME, '.clawdbot/jobs/job-queue.json')
const PROJECTS_PATH = path.join(HOME, '.clawdbot/projects/projects.json')
const DAILY_BUILDS_PATH = path.join(HOME, '.clawdbot/daily-builds.json')
const ACTIVITY_LOG_PATH = path.join(HOME, '.clawdbot/activity-log.json')

interface BriefingItem {
  id: string
  type: 'paper' | 'article' | 'news' | 'tool' | 'dataset' | 'job-trend'
  title: string
  source: string
  url?: string
  summary: string
  relevance: string
  tags: string[]
  read: boolean
  starred: boolean
  addedAt: string
}

interface BriefingSummary {
  text: string
  sections: {
    tasksCompleted: string[]
    dailyBuild: { title: string; description: string } | null
    topNews: { title: string; summary: string }[]
    jobUpdates: string[]
    newIdeas: string[]
  }
  generatedAt: string
}

interface Briefing {
  date: string
  items: BriefingItem[]
  summary?: BriefingSummary
  sentToChat: boolean
  generatedAt: string
}

interface BriefingsData {
  version: number
  briefings: Briefing[]
}

async function loadJSON(filepath: string): Promise<any> {
  try {
    if (existsSync(filepath)) {
      const data = await readFile(filepath, 'utf-8')
      return JSON.parse(data)
    }
  } catch {}
  return null
}

async function loadBriefings(): Promise<Briefing[]> {
  const data = await loadJSON(BRIEFING_PATH)
  return data?.briefings || []
}

async function saveBriefings(briefings: Briefing[]): Promise<void> {
  const dir = path.dirname(BRIEFING_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: BriefingsData = {
    version: 1,
    briefings
  }
  await writeFile(BRIEFING_PATH, JSON.stringify(data, null, 2))
}

async function generateSummary(date: string): Promise<BriefingSummary> {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const todayStr = now.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  const sections: BriefingSummary['sections'] = {
    tasksCompleted: [],
    dailyBuild: null,
    topNews: [],
    jobUpdates: [],
    newIdeas: []
  }

  // Load activity log for completed tasks
  const activityLog = await loadJSON(ACTIVITY_LOG_PATH)
  if (activityLog?.entries) {
    const recentEntries = activityLog.entries
      .filter((e: any) => {
        const entryDate = e.timestamp?.split('T')[0]
        return entryDate === todayStr || entryDate === yesterdayStr
      })
      .slice(0, 5)
    sections.tasksCompleted = recentEntries.map((e: any) => e.title || e.description || 'Task completed')
  }

  // Load daily builds
  const dailyBuilds = await loadJSON(DAILY_BUILDS_PATH)
  if (dailyBuilds?.builds) {
    const todayBuild = dailyBuilds.builds.find((b: any) => {
      const buildDate = b.createdAt?.split('T')[0]
      return buildDate === todayStr || buildDate === yesterdayStr
    })
    if (todayBuild) {
      sections.dailyBuild = {
        title: todayBuild.title || 'Nightly Creation',
        description: todayBuild.description || todayBuild.summary || ''
      }
    }
  }

  // Load news
  const news = await loadJSON(NEWS_PATH)
  if (news?.items) {
    const recentNews = news.items
      .filter((n: any) => !n.read)
      .slice(0, 5)
    sections.topNews = recentNews.map((n: any) => ({
      title: n.title || 'News item',
      summary: n.summary || n.description || ''
    }))
  }

  // Load job updates
  const jobs = await loadJSON(JOBS_PATH)
  if (jobs?.jobs) {
    const newJobs = jobs.jobs
      .filter((j: any) => j.status === 'new' || j.status === 'pending')
      .slice(0, 3)
    sections.jobUpdates = newJobs.map((j: any) => `${j.title} at ${j.company}`)
  }

  // Load project ideas
  const projects = await loadJSON(PROJECTS_PATH)
  if (projects?.projects) {
    const ideas = projects.projects
      .filter((p: any) => p.status === 'idea')
      .slice(0, 3)
    sections.newIdeas = ideas.map((p: any) => p.name || p.title || 'New idea')
  }

  // Generate full text for TTS
  const textParts: string[] = []
  textParts.push(`Good morning! Here's your briefing for ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`)
  
  if (sections.tasksCompleted.length > 0) {
    textParts.push(`Overnight, I completed ${sections.tasksCompleted.length} tasks: ${sections.tasksCompleted.join('. ')}.`)
  }
  
  if (sections.dailyBuild) {
    textParts.push(`For today's nightly build, I created ${sections.dailyBuild.title}. ${sections.dailyBuild.description}`)
  }
  
  if (sections.topNews.length > 0) {
    textParts.push(`In the news: ${sections.topNews.map(n => n.title).join('. ')}.`)
  }
  
  if (sections.jobUpdates.length > 0) {
    textParts.push(`Job updates: ${sections.jobUpdates.join('. ')}.`)
  }
  
  if (sections.newIdeas.length > 0) {
    textParts.push(`New project ideas to consider: ${sections.newIdeas.join(', ')}.`)
  }
  
  textParts.push(`That's your briefing. Have a great day!`)

  return {
    text: textParts.join(' '),
    sections,
    generatedAt: new Date().toISOString()
  }
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const regenerate = url.searchParams.get('regenerate') === 'true'
  
  let briefings = await loadBriefings()
  const today = new Date().toISOString().split('T')[0]
  
  if (date) {
    const briefing = briefings.find(b => b.date === date)
    return Response.json({ briefing: briefing || null })
  }
  
  // Get or create today's briefing
  let todayBriefing = briefings.find(b => b.date === today)
  
  // Auto-generate summary if missing or requested
  if (todayBriefing && (!todayBriefing.summary || regenerate)) {
    todayBriefing.summary = await generateSummary(today)
    await saveBriefings(briefings)
  }
  
  // If no briefing exists for today, create one with just the summary
  if (!todayBriefing) {
    const summary = await generateSummary(today)
    todayBriefing = {
      date: today,
      items: [],
      summary,
      sentToChat: false,
      generatedAt: new Date().toISOString()
    }
    briefings.push(todayBriefing)
    await saveBriefings(briefings)
  }
  
  // Return recent briefings (last 7 days)
  const recentBriefings = briefings
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
  
  const stats = {
    totalBriefings: briefings.length,
    unreadToday: todayBriefing?.items.filter(i => !i.read).length || 0,
    starredTotal: briefings.flatMap(b => b.items).filter(i => i.starred).length,
  }
  
  return Response.json({ 
    today: todayBriefing,
    recent: recentBriefings,
    stats 
  })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, date, itemId, ...payload } = body
  
  let briefings = await loadBriefings()
  const today = new Date().toISOString().split('T')[0]
  
  // Create or update today's briefing
  if (action === 'add-item') {
    let briefing = briefings.find(b => b.date === today)
    if (!briefing) {
      briefing = {
        date: today,
        items: [],
        sentToChat: false,
        generatedAt: new Date().toISOString()
      }
      briefings.push(briefing)
    }
    
    const newItem: BriefingItem = {
      id: `item-${Date.now()}`,
      type: payload.type || 'article',
      title: payload.title || 'Untitled',
      source: payload.source || 'Unknown',
      url: payload.url,
      summary: payload.summary || '',
      relevance: payload.relevance || '',
      tags: payload.tags || [],
      read: false,
      starred: false,
      addedAt: new Date().toISOString()
    }
    
    briefing.items.push(newItem)
    await saveBriefings(briefings)
    return Response.json({ ok: true, item: newItem })
  }
  
  // Regenerate summary
  if (action === 'regenerate-summary') {
    const targetDate = date || today
    let briefing = briefings.find(b => b.date === targetDate)
    if (!briefing) {
      briefing = {
        date: targetDate,
        items: [],
        sentToChat: false,
        generatedAt: new Date().toISOString()
      }
      briefings.push(briefing)
    }
    briefing.summary = await generateSummary(targetDate)
    await saveBriefings(briefings)
    return Response.json({ ok: true, summary: briefing.summary })
  }
  
  // Mark item as read
  if (action === 'mark-read' && itemId) {
    for (const briefing of briefings) {
      const item = briefing.items.find(i => i.id === itemId)
      if (item) {
        item.read = true
        break
      }
    }
    await saveBriefings(briefings)
    return Response.json({ ok: true })
  }
  
  // Toggle star
  if (action === 'toggle-star' && itemId) {
    for (const briefing of briefings) {
      const item = briefing.items.find(i => i.id === itemId)
      if (item) {
        item.starred = !item.starred
        break
      }
    }
    await saveBriefings(briefings)
    return Response.json({ ok: true })
  }
  
  // Mark briefing as sent to chat
  if (action === 'mark-sent' && date) {
    const briefing = briefings.find(b => b.date === date)
    if (briefing) {
      briefing.sentToChat = true
      await saveBriefings(briefings)
    }
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/briefing')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
