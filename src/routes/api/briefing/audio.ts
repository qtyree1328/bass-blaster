import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const AUDIO_DIR = path.join(process.env.HOME || '', '.clawdbot/briefing-audio')

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const filename = url.searchParams.get('file')
  
  if (!filename) {
    return new Response('No file specified', { status: 400 })
  }

  // Sanitize filename to prevent path traversal
  const safeName = path.basename(filename)
  const audioPath = path.join(AUDIO_DIR, safeName)
  
  if (!existsSync(audioPath)) {
    return new Response('Audio not found', { status: 404 })
  }

  try {
    const audioData = await readFile(audioPath)
    const contentType = safeName.endsWith('.mp3') 
      ? 'audio/mpeg' 
      : safeName.endsWith('.aiff') 
        ? 'audio/aiff' 
        : 'audio/wav'
    
    return new Response(audioData, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioData.length.toString(),
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (err) {
    return new Response('Error reading audio', { status: 500 })
  }
}

export const Route = createFileRoute('/api/briefing/audio')({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
})
