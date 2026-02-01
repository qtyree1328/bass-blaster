import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const QUEUE_PATH = join(homedir(), '.clawdbot/job-hunter/jobs_queue.json')

interface Job {
  id: string
  title: string
  company: string
  status: string
  rejectReason?: string
  acceptReason?: string
  [key: string]: unknown
}

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
    let existingData: { version: number; lastScan: string | null; jobs: Job[] } = { version: 1, lastScan: null, jobs: [] }
    if (existsSync(QUEUE_PATH)) {
      try {
        existingData = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'))
      } catch {}
    }
    
    // Detect status changes and feedback additions for notifications
    const oldJobsMap = new Map(existingData.jobs.map((j: Job) => [j.id, j]))
    const notifications: Array<{ action: string; job: Job }> = []
    
    for (const newJob of jobs as Job[]) {
      const oldJob = oldJobsMap.get(newJob.id)
      if (oldJob) {
        // Check for status change to rejected with feedback
        if (newJob.status === 'rejected' && oldJob.status !== 'rejected' && newJob.rejectReason) {
          notifications.push({ action: 'rejected', job: newJob })
        }
        // Check for status change to accepted with feedback
        if (newJob.status === 'accepted' && oldJob.status !== 'accepted') {
          notifications.push({ action: 'accepted', job: newJob })
        }
        // Check for new feedback on existing rejected/accepted
        if (newJob.rejectReason && newJob.rejectReason !== oldJob.rejectReason) {
          if (!notifications.find(n => n.job.id === newJob.id)) {
            notifications.push({ action: 'feedback-updated', job: newJob })
          }
        }
      }
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
    
    // Send notifications after save (non-blocking)
    for (const { action, job } of notifications) {
      notifyAgent(
        'job-feedback',
        action,
        `${job.title} at ${job.company}`,
        job.rejectReason || job.acceptReason
      ).catch(() => {})
    }
    
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
