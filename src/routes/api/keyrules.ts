import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'fs/promises'
import { join } from 'path'

const WORKSPACE = process.env.CLAWD_WORKSPACE || '/Users/hutchbot/clawd'

const DOC_FILES = [
  { 
    name: 'CODE_PRINCIPLES.md', 
    path: 'CODE_PRINCIPLES.md',
    description: 'Coding rules and principles I follow'
  },
  { 
    name: 'AGENTS.md', 
    path: 'AGENTS.md',
    description: 'How I operate and manage memory'
  },
  { 
    name: 'SOUL.md', 
    path: 'SOUL.md',
    description: 'My core personality and values'
  },
  { 
    name: 'USER.md', 
    path: 'USER.md',
    description: 'About my human'
  },
  { 
    name: 'TOOLS.md', 
    path: 'TOOLS.md',
    description: 'Local tool configurations'
  },
  { 
    name: 'IDENTITY.md', 
    path: 'IDENTITY.md',
    description: 'Who I am'
  },
]

async function handleGet() {
  const docs = []
  
  for (const doc of DOC_FILES) {
    try {
      const fullPath = join(WORKSPACE, doc.path)
      const content = await readFile(fullPath, 'utf-8')
      docs.push({
        name: doc.name,
        path: `~/${doc.path}`,
        description: doc.description,
        content
      })
    } catch (e) {
      // Skip files that don't exist
    }
  }
  
  return Response.json({ docs })
}

export const Route = createFileRoute('/api/keyrules')({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
})
