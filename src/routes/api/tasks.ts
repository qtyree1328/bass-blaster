import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const TASKS_PATH = path.join(process.env.HOME || '', '.clawdbot/kanban-tasks.json')

interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'feature' | 'bug' | 'improvement' | 'research' | 'design' | 'other'
  project?: string
  dueDate?: string
  createdAt: string
  updatedAt?: string
  completedAt?: string
  createdBy: 'user' | 'ai'
  tokens?: { input: number; output: number }
  duration?: number
  order: number
}

interface TasksData {
  version: number
  tasks: Task[]
}

async function loadTasks(): Promise<Task[]> {
  try {
    if (existsSync(TASKS_PATH)) {
      const data = await readFile(TASKS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.tasks || []
    }
  } catch {}
  return []
}

async function saveTasks(tasks: Task[]): Promise<void> {
  const dir = path.dirname(TASKS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: TasksData = {
    version: 1,
    tasks
  }
  await writeFile(TASKS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet() {
  const tasks = await loadTasks()
  
  // Sort by order within each status
  const sorted = tasks.sort((a, b) => a.order - b.order)
  
  const stats = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    total: tasks.length,
  }
  
  // Get today's completed
  const today = new Date().toISOString().split('T')[0]
  const completedToday = tasks.filter(t => 
    t.status === 'done' && t.completedAt?.startsWith(today)
  ).length
  
  return Response.json({ tasks: sorted, stats, completedToday })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  let tasks = await loadTasks()
  
  // Add task
  if (action === 'add') {
    const maxOrder = Math.max(0, ...tasks.filter(t => t.status === 'backlog').map(t => t.order))
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: payload.title || 'Untitled Task',
      description: payload.description,
      status: payload.status || 'backlog',
      priority: payload.priority || 'medium',
      category: payload.category,
      project: payload.project,
      dueDate: payload.dueDate,
      createdAt: new Date().toISOString(),
      createdBy: payload.createdBy || 'ai',
      order: maxOrder + 1
    }
    tasks.push(newTask)
    await saveTasks(tasks)
    return Response.json({ ok: true, task: newTask })
  }
  
  // Move task (change status)
  if (action === 'move' && id) {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    const oldStatus = tasks[idx].status
    const newStatus = payload.status
    
    tasks[idx].status = newStatus
    tasks[idx].updatedAt = new Date().toISOString()
    
    if (newStatus === 'done' && oldStatus !== 'done') {
      tasks[idx].completedAt = new Date().toISOString()
    }
    
    // Update order if provided
    if (payload.order !== undefined) {
      tasks[idx].order = payload.order
    }
    
    await saveTasks(tasks)
    return Response.json({ ok: true, task: tasks[idx] })
  }
  
  // Reorder tasks
  if (action === 'reorder') {
    const { taskOrders } = payload // Array of { id, order }
    for (const { id: taskId, order } of taskOrders) {
      const task = tasks.find(t => t.id === taskId)
      if (task) task.order = order
    }
    await saveTasks(tasks)
    return Response.json({ ok: true })
  }
  
  // Update task
  if (action === 'update' && id) {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    tasks[idx] = {
      ...tasks[idx],
      ...payload,
      updatedAt: new Date().toISOString()
    }
    await saveTasks(tasks)
    return Response.json({ ok: true, task: tasks[idx] })
  }
  
  // Delete task
  if (action === 'delete' && id) {
    tasks = tasks.filter(t => t.id !== id)
    await saveTasks(tasks)
    return Response.json({ ok: true })
  }
  
  // Clear done tasks older than X days
  if (action === 'clear-done') {
    const daysOld = payload.daysOld || 7
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)
    
    tasks = tasks.filter(t => 
      t.status !== 'done' || 
      (t.completedAt && new Date(t.completedAt) > cutoff)
    )
    await saveTasks(tasks)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/tasks')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
