import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const CONSIDERATIONS_PATH = path.join(process.env.HOME || '', '.clawdbot/considerations.json')

async function notifyAgent(topic: string, content: string) {
  const message = `[Command Center] consideration-chat: "${topic}" — new-message\\nContent: ${content}`
  try {
    await execAsync(`clawdbot system event --text "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --mode now`, {
      timeout: 15000,
    })
  } catch (e) {
    console.error('Failed to notify agent:', e)
  }
}

interface ChatMessage {
  id: string
  author: 'user' | 'ai'
  content: string
  timestamp: string
}

interface Consideration {
  id: string
  topic: string
  type: 'article' | 'idea' | 'product' | 'feature' | 'skill' | 'quote' | 'other'
  summary: string
  sourceUrl?: string
  notes: string[]
  tags: string[]
  status: 'new' | 'reviewing' | 'actionable' | 'archived'
  chat?: ChatMessage[]
  createdAt: string
  updatedAt?: string
}

interface ConsiderationsData {
  version: number
  considerations: Consideration[]
}

async function loadConsiderations(): Promise<Consideration[]> {
  try {
    if (existsSync(CONSIDERATIONS_PATH)) {
      const data = await readFile(CONSIDERATIONS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.considerations || []
    }
  } catch {}
  return []
}

async function saveConsiderations(considerations: Consideration[]): Promise<void> {
  const dir = path.dirname(CONSIDERATIONS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: ConsiderationsData = {
    version: 1,
    considerations
  }
  await writeFile(CONSIDERATIONS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  
  let considerations = await loadConsiderations()
  
  if (status) {
    considerations = considerations.filter(c => c.status === status)
  }
  if (type) {
    considerations = considerations.filter(c => c.type === type)
  }
  
  // Sort by newest first
  considerations.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  const all = await loadConsiderations()
  const stats = {
    total: all.length,
    new: all.filter(c => c.status === 'new').length,
    reviewing: all.filter(c => c.status === 'reviewing').length,
    actionable: all.filter(c => c.status === 'actionable').length,
    archived: all.filter(c => c.status === 'archived').length,
  }
  
  return Response.json({ considerations, stats })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  let considerations = await loadConsiderations()
  
  // Add new consideration
  if (action === 'add') {
    const newId = `cons-${Date.now()}`
    const newItem: Consideration = {
      id: newId,
      topic: payload.topic || 'Untitled',
      type: payload.type || 'other',
      summary: payload.summary || '',
      sourceUrl: payload.sourceUrl,
      notes: payload.notes || [],
      tags: payload.tags || [],
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    considerations.push(newItem)
    await saveConsiderations(considerations)
    return Response.json({ ok: true, consideration: newItem })
  }
  
  // Update consideration
  if (action === 'update' && id) {
    const idx = considerations.findIndex(c => c.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    considerations[idx] = {
      ...considerations[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    }
    await saveConsiderations(considerations)
    return Response.json({ ok: true, consideration: considerations[idx] })
  }
  
  // Add note to consideration
  if (action === 'add-note' && id) {
    const idx = considerations.findIndex(c => c.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    const timestamp = new Date().toLocaleString()
    const note = `[${timestamp}] ${payload.note}`
    considerations[idx].notes = [...(considerations[idx].notes || []), note]
    considerations[idx].updatedAt = new Date().toISOString()
    await saveConsiderations(considerations)
    return Response.json({ ok: true, consideration: considerations[idx] })
  }
  
  // Add chat message to consideration
  if (action === 'add-chat' && id) {
    const idx = considerations.findIndex(c => c.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      author: payload.author || 'user',
      content: payload.content || '',
      timestamp: new Date().toISOString(),
    }
    considerations[idx].chat = [...(considerations[idx].chat || []), message]
    considerations[idx].updatedAt = new Date().toISOString()
    await saveConsiderations(considerations)
    
    // Notify agent when user sends a chat message
    if (message.author === 'user') {
      notifyAgent(considerations[idx].topic, message.content).catch(() => {})
    }
    
    return Response.json({ ok: true, consideration: considerations[idx], message })
  }
  
  // Change status
  if (action === 'set-status' && id) {
    const idx = considerations.findIndex(c => c.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    considerations[idx].status = payload.status
    considerations[idx].updatedAt = new Date().toISOString()
    await saveConsiderations(considerations)
    return Response.json({ ok: true, consideration: considerations[idx] })
  }
  
  // Delete
  if (action === 'delete' && id) {
    considerations = considerations.filter(c => c.id !== id)
    await saveConsiderations(considerations)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/considerations')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
