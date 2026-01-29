import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const BRIEFING_PATH = path.join(process.env.HOME || '', '.clawdbot/morning-briefings.json')

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

interface Briefing {
  date: string
  items: BriefingItem[]
  sentToChat: boolean
  generatedAt: string
}

interface BriefingsData {
  version: number
  briefings: Briefing[]
}

async function loadBriefings(): Promise<Briefing[]> {
  try {
    if (existsSync(BRIEFING_PATH)) {
      const data = await readFile(BRIEFING_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.briefings || []
    }
  } catch {}
  return []
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

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  
  const briefings = await loadBriefings()
  
  // Get today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0]
  
  if (date) {
    const briefing = briefings.find(b => b.date === date)
    return Response.json({ briefing: briefing || null })
  }
  
  // Return recent briefings (last 7 days)
  const recentBriefings = briefings
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
  
  const todayBriefing = briefings.find(b => b.date === today)
  
  const stats = {
    totalBriefings: briefings.length,
    unreadToday: todayBriefing?.items.filter(i => !i.read).length || 0,
    starredTotal: briefings.flatMap(b => b.items).filter(i => i.starred).length,
  }
  
  return Response.json({ 
    today: todayBriefing || null,
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
