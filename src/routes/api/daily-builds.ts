import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const BUILDS_FILE = path.join(process.env.HOME || '', '.clawdbot', 'daily-builds.json')

interface DailyBuild {
  id: string
  date: string
  title: string
  description: string
  category: 'workflow' | 'gis-demo' | 'tool' | 'interface' | 'experiment'
  status: 'pending-review' | 'incorporated' | 'archived' | 'rejected'
  buildPath?: string
  previewUrl?: string
  buildLog?: string
  userFeedback?: string
  incorporatedTo?: string
  createdAt: string
  reviewedAt?: string
}

interface BuildsData {
  builds: DailyBuild[]
  lastBuildDate?: string
}

async function loadBuilds(): Promise<BuildsData> {
  try {
    if (existsSync(BUILDS_FILE)) {
      const data = await readFile(BUILDS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch {}
  return { builds: [] }
}

async function saveBuilds(data: BuildsData): Promise<void> {
  const dir = path.dirname(BUILDS_FILE)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(BUILDS_FILE, JSON.stringify(data, null, 2))
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  
  const data = await loadBuilds()
  let builds = data.builds
  
  if (status) {
    builds = builds.filter(b => b.status === status)
  }
  
  // Sort by date descending
  builds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  
  return Response.json({ 
    builds,
    lastBuildDate: data.lastBuildDate,
    stats: {
      total: data.builds.length,
      pendingReview: data.builds.filter(b => b.status === 'pending-review').length,
      incorporated: data.builds.filter(b => b.status === 'incorporated').length,
      archived: data.builds.filter(b => b.status === 'archived').length,
    }
  })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, buildId, ...payload } = body
  
  const data = await loadBuilds()
  
  if (action === 'create') {
    const id = `build-${Date.now()}`
    const newBuild: DailyBuild = {
      id,
      date: new Date().toISOString().split('T')[0],
      title: payload.title || 'Untitled Build',
      description: payload.description || '',
      category: payload.category || 'experiment',
      status: 'pending-review',
      buildPath: payload.buildPath,
      previewUrl: payload.previewUrl,
      buildLog: payload.buildLog,
      createdAt: new Date().toISOString(),
    }
    
    data.builds.push(newBuild)
    data.lastBuildDate = newBuild.date
    await saveBuilds(data)
    
    return Response.json({ ok: true, build: newBuild })
  }
  
  if (action === 'update' && buildId) {
    const idx = data.builds.findIndex(b => b.id === buildId)
    if (idx === -1) {
      return Response.json({ error: 'Build not found' }, { status: 404 })
    }
    
    data.builds[idx] = {
      ...data.builds[idx],
      ...payload,
      reviewedAt: payload.status !== 'pending-review' ? new Date().toISOString() : data.builds[idx].reviewedAt
    }
    
    await saveBuilds(data)
    return Response.json({ ok: true, build: data.builds[idx] })
  }
  
  if (action === 'feedback' && buildId) {
    const idx = data.builds.findIndex(b => b.id === buildId)
    if (idx === -1) {
      return Response.json({ error: 'Build not found' }, { status: 404 })
    }
    
    data.builds[idx].userFeedback = payload.feedback
    await saveBuilds(data)
    return Response.json({ ok: true, build: data.builds[idx] })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/daily-builds')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
