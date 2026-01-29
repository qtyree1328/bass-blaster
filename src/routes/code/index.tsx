import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

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

interface Project {
  name: string
  total: number
  pending: number
}

export const Route = createFileRoute('/code/')({
  component: CodePage,
})

const CATEGORY_ICONS: Record<string, string> = {
  issue: '⚠️',
  duplication: '📋',
  cleanup: '🧹',
  optimization: '⚡',
  refactor: '🔄',
  bug: '🐛',
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

function CodePage() {
  const [reviews, setReviews] = useState<CodeReview[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, applied: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'applied'>('pending')

  const loadData = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedProject) params.set('project', selectedProject)
      if (filter !== 'all') params.set('status', filter)
      
      const res = await fetch(`/api/code-reviews?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
        setProjects(data.projects || [])
        setStats(data.stats || {})
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [selectedProject, filter])

  const handleApprove = async (id: string) => {
    await fetch('/api/code-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id })
    })
    loadData()
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):')
    await fetch('/api/code-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id, reason })
    })
    loadData()
  }

  const handleApplied = async (id: string) => {
    await fetch('/api/code-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'applied', id })
    })
    loadData()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h1 className="text-xl font-semibold text-white">Code Reviews</h1>
              <p className="text-xs text-slate-400">AI-identified improvements awaiting approval</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
            ← Hub
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Sidebar - Projects */}
          <div className="col-span-3">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 sticky top-24">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Projects</h2>
              
              <button
                onClick={() => setSelectedProject(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition ${
                  !selectedProject 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Projects
                <span className="float-right text-xs opacity-70">{stats.pending} pending</span>
              </button>
              
              <div className="space-y-1 mt-2">
                {projects.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProject(p.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedProject === p.name 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate block">{p.name}</span>
                    {p.pending > 0 && (
                      <span className={`float-right text-xs px-1.5 py-0.5 rounded ${
                        selectedProject === p.name ? 'bg-white/20' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.pending}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {projects.length === 0 && !loading && (
                <p className="text-slate-500 text-sm text-center py-4">
                  No reviews yet
                </p>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {(['pending', 'approved', 'applied', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'pending' && stats.pending > 0 && (
                    <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                      {stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Reviews List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                <span className="text-5xl mb-4 block">✨</span>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  {filter === 'pending' ? 'No pending reviews' : 'No reviews found'}
                </h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  When I find code issues, duplications, or optimization opportunities, they'll appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div
                    key={review.id}
                    className={`bg-slate-800/50 rounded-xl border transition-all ${
                      review.status === 'pending' ? 'border-slate-600' : 'border-slate-700'
                    }`}
                  >
                    {/* Review Header */}
                    <button
                      onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      <span className="text-2xl">{CATEGORY_ICONS[review.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-white">{review.title}</h3>
                            <p className="text-sm text-slate-400 mt-0.5">
                              {review.project} · <span className="font-mono text-xs">{review.filePath}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-1 rounded border ${SEVERITY_COLORS[review.severity]}`}>
                              {review.severity}
                            </span>
                            {review.status !== 'pending' && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                review.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                review.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {review.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-slate-500 transition-transform ${expandedReview === review.id ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {/* Expanded Content */}
                    {expandedReview === review.id && (
                      <div className="px-4 pb-4 border-t border-slate-700">
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          {/* Problem */}
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                              Problem
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {review.problem}
                            </p>
                          </div>
                          
                          {/* Proposed Fix */}
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                              Proposed Fix
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {review.proposedFix}
                            </p>
                          </div>
                        </div>

                        {/* Code Snippet */}
                        {review.codeSnippet && (
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                              Code
                            </h4>
                            <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto font-mono">
                              {review.codeSnippet}
                            </pre>
                          </div>
                        )}

                        {/* Actions */}
                        {review.status === 'pending' && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                            <button
                              onClick={() => handleApprove(review.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(review.id)}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}

                        {review.status === 'approved' && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                            <button
                              onClick={() => handleApplied(review.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
                            >
                              Mark as Applied
                            </button>
                            <p className="text-sm text-slate-500 self-center ml-2">
                              Approved {review.reviewedAt && formatDate(review.reviewedAt)}
                            </p>
                          </div>
                        )}

                        {review.status === 'rejected' && review.rejectReason && (
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <p className="text-sm text-red-400">
                              Rejected: {review.rejectReason}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 mt-3">
                          Found {formatDate(review.createdAt)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
