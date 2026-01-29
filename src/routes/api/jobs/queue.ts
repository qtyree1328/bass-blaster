import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

const QUEUE_PATH = join(homedir(), '.clawdbot/job-hunter/jobs_queue.json')

async function handleGet() {
  try {
    if (!existsSync(QUEUE_PATH)) {
      return Response.json({ version: 1, lastScan: null, jobs: [] })
    }
    const data = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'))
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: 'Failed to read queue' }, { status: 500 })
  }
}

async function handlePost({ request }: { request: Request }) {
  try {
    const body = await request.json()
    const { jobs } = body
    
    if (!Array.isArray(jobs)) {
      return Response.json({ error: 'Jobs array required' }, { status: 400 })
    }
    
    // Read existing data to preserve version and lastScan
    let existingData = { version: 1, lastScan: null, jobs: [] }
    if (existsSync(QUEUE_PATH)) {
      try {
        existingData = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'))
      } catch {}
    }
    
    // Update jobs while preserving other fields
    const updatedData = {
      ...existingData,
      jobs,
      lastUpdated: new Date().toISOString()
    }
    
    // Ensure directory exists
    const dir = dirname(QUEUE_PATH)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(QUEUE_PATH, JSON.stringify(updatedData, null, 2), 'utf8')
    
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: 'Failed to save queue' }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/jobs/queue')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
