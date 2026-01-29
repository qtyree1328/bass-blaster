import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const PROJECTS_PATH = path.join(process.env.HOME || '', '.clawdbot/projects/projects.json')

interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  category: string
  status: 'idea' | 'development' | 'built' | 'rejected'
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt?: string
  addedBy: 'user' | 'ai'
  overview?: string
  goals?: string[]
  plan?: string
  documentation?: string
  workshopNotes?: string[]
  buildPath?: string
  previewUrl?: string
  hubIcon?: string
  hubDescription?: string
  builtAt?: string
  rejectCategory?: string
  rejectReason?: string
}

interface ProjectsData {
  version: number
  lastUpdated: string
  projects: Project[]
}

async function loadProjects(): Promise<Project[]> {
  try {
    if (existsSync(PROJECTS_PATH)) {
      const data = await readFile(PROJECTS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.projects || []
    }
  } catch {}
  return []
}

async function saveProjects(projects: Project[]): Promise<void> {
  const dir = path.dirname(PROJECTS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: ProjectsData = {
    version: 2,
    lastUpdated: new Date().toISOString(),
    projects
  }
  await writeFile(PROJECTS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const builtOnly = url.searchParams.get('built') === 'true'
  
  let projects = await loadProjects()
  
  if (status) {
    projects = projects.filter(p => p.status === status)
  }
  
  if (builtOnly) {
    projects = projects.filter(p => p.status === 'built')
  }
  
  const allProjects = await loadProjects()
  const stats = {
    ideas: allProjects.filter(p => p.status === 'idea').length,
    development: allProjects.filter(p => p.status === 'development').length,
    built: allProjects.filter(p => p.status === 'built').length,
  }
  
  return Response.json({ projects, stats })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, projectId, ...payload } = body
  
  let projects = await loadProjects()
  
  // Bulk save (legacy support)
  if (body.projects && Array.isArray(body.projects)) {
    await saveProjects(body.projects)
    return Response.json({ success: true })
  }
  
  // Add new idea
  if (action === 'add-idea') {
    const id = `project-${Date.now()}`
    const newProject: Project = {
      id,
      name: payload.name || 'Untitled Idea',
      description: payload.description || '',
      tech: payload.tech || [],
      category: payload.category || 'Other',
      status: 'idea',
      priority: payload.priority || 'medium',
      createdAt: new Date().toISOString(),
      addedBy: payload.addedBy || 'user',
    }
    projects.push(newProject)
    await saveProjects(projects)
    return Response.json({ ok: true, project: newProject })
  }
  
  // Move to development
  if (action === 'to-development' && projectId) {
    const idx = projects.findIndex(p => p.id === projectId)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    projects[idx] = {
      ...projects[idx],
      status: 'development',
      updatedAt: new Date().toISOString(),
      overview: payload.overview || projects[idx].overview || '',
      goals: payload.goals || projects[idx].goals || [],
      plan: payload.plan || projects[idx].plan || '',
      documentation: payload.documentation || projects[idx].documentation || '',
    }
    await saveProjects(projects)
    return Response.json({ ok: true, project: projects[idx] })
  }
  
  // Update development details
  if (action === 'update-development' && projectId) {
    const idx = projects.findIndex(p => p.id === projectId)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    projects[idx] = {
      ...projects[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    }
    await saveProjects(projects)
    return Response.json({ ok: true, project: projects[idx] })
  }
  
  // Add workshop note
  if (action === 'add-note' && projectId) {
    const idx = projects.findIndex(p => p.id === projectId)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    const note = `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}] ${payload.note}`
    projects[idx].workshopNotes = [...(projects[idx].workshopNotes || []), note]
    projects[idx].updatedAt = new Date().toISOString()
    await saveProjects(projects)
    return Response.json({ ok: true, project: projects[idx] })
  }
  
  // Build project (makes it a hub card)
  if (action === 'build' && projectId) {
    const idx = projects.findIndex(p => p.id === projectId)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    projects[idx] = {
      ...projects[idx],
      status: 'built',
      builtAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      buildPath: payload.buildPath || projects[idx].buildPath,
      previewUrl: payload.previewUrl || projects[idx].previewUrl,
      hubIcon: payload.hubIcon || '🚀',
      hubDescription: payload.hubDescription || projects[idx].description,
    }
    await saveProjects(projects)
    return Response.json({ ok: true, project: projects[idx] })
  }
  
  // Reject
  if (action === 'reject' && projectId) {
    const idx = projects.findIndex(p => p.id === projectId)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    projects[idx] = {
      ...projects[idx],
      status: 'rejected',
      rejectCategory: payload.rejectCategory,
      rejectReason: payload.rejectReason,
      updatedAt: new Date().toISOString(),
    }
    await saveProjects(projects)
    return Response.json({ ok: true, project: projects[idx] })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/projects')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
