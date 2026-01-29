import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const NEWS_PATH = path.join(process.env.HOME || '', '.clawdbot/news.json')

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  summary: string
  category: 'industry' | 'papers' | 'conservation' | 'tools' | 'datasets'
  tags: string[]
  addedAt: string
  read: boolean
  starred: boolean
}

interface NewsData {
  version: number
  items: NewsItem[]
}

async function loadNews(): Promise<NewsItem[]> {
  try {
    if (existsSync(NEWS_PATH)) {
      const data = await readFile(NEWS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.items || []
    }
  } catch {}
  return []
}

async function saveNews(items: NewsItem[]): Promise<void> {
  const dir = path.dirname(NEWS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: NewsData = { version: 1, items }
  await writeFile(NEWS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const unreadOnly = url.searchParams.get('unread') === 'true'
  const starred = url.searchParams.get('starred') === 'true'
  
  let items = await loadNews()
  
  if (category) items = items.filter(i => i.category === category)
  if (unreadOnly) items = items.filter(i => !i.read)
  if (starred) items = items.filter(i => i.starred)
  
  // Sort by date, newest first
  items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  
  const stats = {
    total: (await loadNews()).length,
    unread: (await loadNews()).filter(i => !i.read).length,
    starred: (await loadNews()).filter(i => i.starred).length,
  }
  
  return Response.json({ items, stats })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  let items = await loadNews()
  
  if (action === 'add') {
    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      title: payload.title || 'Untitled',
      source: payload.source || 'Unknown',
      url: payload.url || '',
      summary: payload.summary || '',
      category: payload.category || 'industry',
      tags: payload.tags || [],
      addedAt: new Date().toISOString(),
      read: false,
      starred: false,
    }
    items.push(newItem)
    await saveNews(items)
    return Response.json({ ok: true, item: newItem })
  }
  
  if (action === 'markRead' && id) {
    const idx = items.findIndex(i => i.id === id)
    if (idx !== -1) {
      items[idx].read = true
      await saveNews(items)
      return Response.json({ ok: true })
    }
  }
  
  if (action === 'markAllRead') {
    items = items.map(i => ({ ...i, read: true }))
    await saveNews(items)
    return Response.json({ ok: true })
  }
  
  if (action === 'star' && id) {
    const idx = items.findIndex(i => i.id === id)
    if (idx !== -1) {
      items[idx].starred = !items[idx].starred
      await saveNews(items)
      return Response.json({ ok: true, starred: items[idx].starred })
    }
  }
  
  if (action === 'delete' && id) {
    items = items.filter(i => i.id !== id)
    await saveNews(items)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/news')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
