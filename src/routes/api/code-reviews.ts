import { createFileRoute } from '@tanstack/react-router'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const REVIEWS_PATH = path.join(process.env.HOME || '', '.clawdbot/code-reviews.json')

interface CodeReview {
  id: string
  project: string
  filePath: string
  category: 'issue' | 'duplication' | 'cleanup' | 'optimization' | 'refactor' | 'bug'
  severity: 'low' | 'medium' | 'high'
  title: string
  problem: string
  proposedFix: string
  codeSnippet?: string
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  createdAt: string
  reviewedAt?: string
  appliedAt?: string
  rejectReason?: string
}

interface ReviewsData {
  version: number
  reviews: CodeReview[]
}

async function loadReviews(): Promise<CodeReview[]> {
  try {
    if (existsSync(REVIEWS_PATH)) {
      const data = await readFile(REVIEWS_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return parsed.reviews || []
    }
  } catch {}
  return []
}

async function saveReviews(reviews: CodeReview[]): Promise<void> {
  const dir = path.dirname(REVIEWS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const data: ReviewsData = {
    version: 1,
    reviews
  }
  await writeFile(REVIEWS_PATH, JSON.stringify(data, null, 2))
}

async function handleGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const project = url.searchParams.get('project')
  const status = url.searchParams.get('status')
  
  let reviews = await loadReviews()
  
  if (project) {
    reviews = reviews.filter(r => r.project === project)
  }
  if (status) {
    reviews = reviews.filter(r => r.status === status)
  }
  
  // Sort by severity (high first) then by date
  const severityOrder = { high: 0, medium: 1, low: 2 }
  reviews.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  
  // Get unique projects with pending counts
  const allReviews = await loadReviews()
  const projectsMap = new Map<string, { total: number; pending: number }>()
  for (const r of allReviews) {
    const existing = projectsMap.get(r.project) || { total: 0, pending: 0 }
    existing.total++
    if (r.status === 'pending') existing.pending++
    projectsMap.set(r.project, existing)
  }
  const projects = Array.from(projectsMap.entries()).map(([name, counts]) => ({
    name,
    ...counts
  })).sort((a, b) => b.pending - a.pending)
  
  const stats = {
    total: allReviews.length,
    pending: allReviews.filter(r => r.status === 'pending').length,
    approved: allReviews.filter(r => r.status === 'approved').length,
    applied: allReviews.filter(r => r.status === 'applied').length,
    rejected: allReviews.filter(r => r.status === 'rejected').length,
  }
  
  return Response.json({ reviews, projects, stats })
}

async function handlePost({ request }: { request: Request }) {
  const body = await request.json()
  const { action, id, ...payload } = body
  
  let reviews = await loadReviews()
  
  // Add new review
  if (action === 'add') {
    const newId = `review-${Date.now()}`
    const newReview: CodeReview = {
      id: newId,
      project: payload.project || 'Unknown',
      filePath: payload.filePath || '',
      category: payload.category || 'issue',
      severity: payload.severity || 'medium',
      title: payload.title || 'Untitled',
      problem: payload.problem || '',
      proposedFix: payload.proposedFix || '',
      codeSnippet: payload.codeSnippet,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    reviews.push(newReview)
    await saveReviews(reviews)
    return Response.json({ ok: true, review: newReview })
  }
  
  // Approve review
  if (action === 'approve' && id) {
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    reviews[idx].status = 'approved'
    reviews[idx].reviewedAt = new Date().toISOString()
    await saveReviews(reviews)
    return Response.json({ ok: true, review: reviews[idx] })
  }
  
  // Reject review
  if (action === 'reject' && id) {
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    reviews[idx].status = 'rejected'
    reviews[idx].reviewedAt = new Date().toISOString()
    reviews[idx].rejectReason = payload.reason
    await saveReviews(reviews)
    return Response.json({ ok: true, review: reviews[idx] })
  }
  
  // Mark as applied
  if (action === 'applied' && id) {
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 })
    
    reviews[idx].status = 'applied'
    reviews[idx].appliedAt = new Date().toISOString()
    await saveReviews(reviews)
    return Response.json({ ok: true, review: reviews[idx] })
  }
  
  // Delete review
  if (action === 'delete' && id) {
    reviews = reviews.filter(r => r.id !== id)
    await saveReviews(reviews)
    return Response.json({ ok: true })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

export const Route = createFileRoute('/api/code-reviews')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
})
