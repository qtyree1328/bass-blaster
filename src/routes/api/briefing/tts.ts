import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

const AUDIO_DIR = path.join(process.env.HOME || '', '.clawdbot/briefing-audio')

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { text, date } = body
  
  if (!text) {
    return Response.json({ error: 'No text provided' }, { status: 400 })
  }

  // Ensure audio directory exists
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true })
  }

  const filename = `briefing-${date || 'current'}.mp3`
  const audioPath = path.join(AUDIO_DIR, filename)
  
  // Check if audio already exists
  if (existsSync(audioPath)) {
    return Response.json({ 
      audioUrl: `/api/briefing/audio?file=${filename}`,
      cached: true 
    })
  }

  try {
    // Use macOS say command with AIFF then convert to MP3
    // Or use Clawdbot's TTS if available
    const tempAiff = path.join(AUDIO_DIR, `temp-${Date.now()}.aiff`)
    
    // Escape text for shell
    const escapedText = text.replace(/'/g, "'\\''").replace(/"/g, '\\"')
    
    // Use macOS 'say' with a good voice
    await execAsync(`say -v Samantha -o "${tempAiff}" "${escapedText}"`)
    
    // Convert to MP3 using ffmpeg if available, otherwise use AIFF
    try {
      await execAsync(`ffmpeg -i "${tempAiff}" -acodec libmp3lame -q:a 2 "${audioPath}" -y`)
      await execAsync(`rm "${tempAiff}"`)
    } catch {
      // ffmpeg not available, rename AIFF to use as-is
      await execAsync(`mv "${tempAiff}" "${audioPath.replace('.mp3', '.aiff')}"`)
      return Response.json({ 
        audioUrl: `/api/briefing/audio?file=${filename.replace('.mp3', '.aiff')}` 
      })
    }

    return Response.json({ audioUrl: `/api/briefing/audio?file=${filename}` })
  } catch (err) {
    console.error('TTS error:', err)
    return Response.json({ error: 'TTS generation failed' }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/briefing/tts')({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
})
