import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

async function handlePost({ request }: { request: Request }) {
  const url = new URL(request.url)
  const jobId = url.searchParams.get('id')
  
  if (!jobId) {
    return Response.json({ error: 'Job ID required' }, { status: 400 })
  }
  
  const coverLetterPath = join(homedir(), `.clawdbot/job-hunter/cover_letters/${jobId}.md`)
  
  // Check if cover letter already exists
  if (existsSync(coverLetterPath)) {
    try {
      const content = readFileSync(coverLetterPath, 'utf8')
      const cleaned = content
        .replace(/^#.*\n/gm, '')
        .replace(/\*\*Tone:\*\*.*\n/g, '')
        .replace(/---\n/g, '')
        .trim()
      return Response.json({ content: cleaned, generated: false, message: 'Cover letter already exists' })
    } catch {}
  }
  
  // Load job data to get details
  const queuePath = join(homedir(), '.clawdbot/job-hunter/jobs_queue.json')
  let job = null
  
  try {
    const queueData = JSON.parse(readFileSync(queuePath, 'utf8'))
    job = queueData.jobs?.find((j: any) => j.id === jobId)
  } catch {}
  
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }
  
  // Create a placeholder cover letter that prompts the user to generate via Clawdbot
  // In a full implementation, this would trigger the AI to generate the letter
  const placeholder = `[Cover letter for ${job.title} at ${job.company}]

This cover letter will be generated when you request it through the main Clawdbot interface.

To generate, tell Clawdbot:
"Generate a cover letter for the ${job.company} ${job.title} position"

Job Details:
- Company: ${job.company}
- Title: ${job.title}
- Match Score: ${job.matchScore}/10
- Tone: ${job.tone || 'balanced'}
${job.matchReasons ? `- Match Reasons: ${job.matchReasons.join(', ')}` : ''}
`

  // Save the placeholder
  const dir = dirname(coverLetterPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(coverLetterPath, placeholder, 'utf8')
  
  return Response.json({ 
    content: placeholder, 
    generated: true, 
    message: 'Placeholder created. Use Clawdbot to generate the full cover letter.' 
  })
}

export const Route = createFileRoute('/api/jobs/generate-cover-letter')({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
})
