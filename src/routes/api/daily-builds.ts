import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const BUILDS_FILE = path.join(process.env.HOME || '', '.clawdbot', 'daily-builds.json')
const REJECTIONS_FILE = path.join(process.env.HOME || '', '.clawdbot', 'daily-builds-rejections.json')
const ROUTES_DIR = path.join(process.env.HOME || '', 'clawd', 'projects', 'crabwalk', 'src', 'routes')

async function notifyAgent(type: string, action: string, title: string, feedback?: string) {
  let message = `[Command Center] ${type}: "${title}" — ${action}`
  if (feedback) {
    message += `\nFeedback: ${feedback}`
  }
  try {
    await execAsync(`clawdbot system event --text "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --mode now`, {
      timeout: 15000,
    })
  } catch (e) {
    console.error('Failed to notify agent:', e)
  }
}

interface DailyBuild {
  id: string
  date: string
  title: string
  description: string
  category: 'workflow' | 'gis-demo' | 'tool' | 'interface' | 'experiment'
  status: 'pending-review' | 'accepted' | 'rejected'
  buildPath?: string
  previewUrl?: string
  buildLog?: string
  userFeedback?: string
  createdAt: string
  reviewedAt?: string
}

interface RejectedBuild {
  id: string
  title: string
  description: string
  category: string
  buildPath?: string
  userFeedback?: string
  createdAt: string
  rejectedAt: string
}

interface BuildsData {
  builds: DailyBuild[]
  lastBuildDate?: string
}

interface RejectionsData {
  rejections: RejectedBuild[]
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

async function loadRejections(): Promise<RejectionsData> {
  try {
    if (existsSync(REJECTIONS_FILE)) {
      const data = await readFile(REJECTIONS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch {}
  return { rejections: [] }
}

async function saveRejections(data: RejectionsData): Promise<void> {
  const dir = path.dirname(REJECTIONS_FILE)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(REJECTIONS_FILE, JSON.stringify(data, null, 2))
}

async function deleteRouteFiles(buildPath: string): Promise<void> {
  if (!buildPath) return
  
  // Extract route name from path like "/recon" or "/coords"
  const routeName = buildPath.replace(/^\//, '').split('/')[0]
  if (!routeName) return
  
  const routeDir = path.join(ROUTES_DIR, routeName)
  
  try {
    if (existsSync(routeDir)) {
      await rm(routeDir, { recursive: true })
      console.log(`Deleted route directory: ${routeDir}`)
    }
  } catch (e) {
    console.error(`Failed to delete route ${routeDir}:`, e)
  }
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  
  const data = await loadBuilds()
  let builds = data.builds
  
  if (status && status !== 'all') {
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
      accepted: data.builds.filter(b => b.status === 'accepted').length,
    }
  })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, buildId, feedback, ...payload } = body
  
  const data = await loadBuilds()
  
  // Create new build
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
  
  // Accept build - create project in development, then remove from daily builds
  if (action === 'accept' && buildId) {
    const idx = data.builds.findIndex(b => b.id === buildId)
    if (idx === -1) {
      return Response.json({ error: 'Build not found' }, { status: 404 })
    }
    
    const build = data.builds[idx]
    
    // Create project in the projects system
    try {
      const projectsFile = path.join(process.env.HOME || '', '.clawdbot', 'projects', 'projects.json')
      let projectsData: { projects: any[] } = { projects: [] }
      
      if (existsSync(projectsFile)) {
        const content = await readFile(projectsFile, 'utf-8')
        projectsData = JSON.parse(content)
      }
      
      const newProject = {
        id: `proj-${Date.now()}`,
        name: build.title,
        description: build.description,
        tech: [],
        category: build.category,
        priority: 'medium',
        status: 'development',
        createdAt: build.createdAt,
        updatedAt: new Date().toISOString(),
        addedBy: 'ai',
        overview: build.buildLog || '',
        goals: [],
        chat: [],
        buildPath: build.buildPath,
        previewUrl: build.previewUrl,
        userFeedback: feedback,
      }
      
      projectsData.projects.push(newProject)
      await writeFile(projectsFile, JSON.stringify(projectsData, null, 2))
    } catch (e) {
      console.error('Failed to create project:', e)
    }
    
    // Remove from daily builds (it's now in projects)
    data.builds.splice(idx, 1)
    await saveBuilds(data)
    
    // Notify agent about acceptance
    notifyAgent('build-accepted', 'accepted', build.title, feedback).catch(() => {})
    
    return Response.json({ ok: true, movedToProjects: true })
  }
  
  // Reject build - save to rejections log, delete from builds, delete route files
  if (action === 'reject' && buildId) {
    const idx = data.builds.findIndex(b => b.id === buildId)
    if (idx === -1) {
      return Response.json({ error: 'Build not found' }, { status: 404 })
    }
    
    const build = data.builds[idx]
    
    // Save to rejections log for context
    const rejections = await loadRejections()
    rejections.rejections.push({
      id: build.id,
      title: build.title,
      description: build.description,
      category: build.category,
      buildPath: build.buildPath,
      userFeedback: feedback,
      createdAt: build.createdAt,
      rejectedAt: new Date().toISOString()
    })
    await saveRejections(rejections)
    
    // Delete route files if they exist
    if (build.buildPath) {
      await deleteRouteFiles(build.buildPath)
    }
    
    // Remove from builds list
    data.builds.splice(idx, 1)
    await saveBuilds(data)
    
    // Notify agent about rejection with feedback
    notifyAgent('build-rejected', 'rejected', build.title, feedback).catch(() => {})
    
    return Response.json({ ok: true, deleted: true, rejectionSaved: true })
  }
  
  // Legacy update action (for compatibility)
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
