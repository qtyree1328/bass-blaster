import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface NotifyPayload {
  type: 'job-feedback' | 'build-feedback' | 'build-chat' | 'task-created' | 'general'
  action: 'accepted' | 'rejected' | 'chat' | 'updated'
  title: string
  feedback?: string
  details?: Record<string, unknown>
}

async function notifyAgent(payload: NotifyPayload): Promise<boolean> {
  const { type, action, title, feedback, details } = payload
  
  // Build a concise message for the agent
  let message = `[Command Center] ${type}: "${title}" — ${action}`
  if (feedback) {
    message += `\nFeedback: ${feedback}`
  }
  if (details) {
    message += `\nDetails: ${JSON.stringify(details)}`
  }
  
  try {
    // Use clawdbot system event to immediately notify the agent
    await execAsync(`clawdbot system event --text "${message.replace(/"/g, '\\"')}" --mode now`, {
      timeout: 15000,
    })
    return true
  } catch (e) {
    console.error('Failed to notify agent:', e)
    return false
  }
}

async function handlePost({ request }: { request: Request }) {
  try {
    const payload: NotifyPayload = await request.json()
    
    if (!payload.type || !payload.action || !payload.title) {
      return Response.json({ error: 'Missing required fields: type, action, title' }, { status: 400 })
    }
    
    const sent = await notifyAgent(payload)
    
    return Response.json({ 
      ok: sent, 
      message: sent ? 'Agent notified' : 'Failed to notify agent'
    })
  } catch (e) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export const Route = createFileRoute('/api/notify-agent')({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
})
