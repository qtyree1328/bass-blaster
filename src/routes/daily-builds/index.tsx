import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/daily-builds/')({
  component: DailyBuilds,
})

interface DailyBuild {
  id: string
  date: string
  title: string
  description: string
  category: 'workflow' | 'gis-demo' | 'tool' | 'interface' | 'experiment'
  status: 'pending-review' | 'accepted' | 'rejected'
  buildPath?: string
  previewUrl?: string
  buildLog?: string
  userFeedback?: string
  createdAt: string
  reviewedAt?: string
}

interface Stats {
  total: number
  pendingReview: number
  accepted: number
}

const categoryIcons: Record<string, string> = {
  'workflow': '⚡',
  'gis-demo': '🌍',
  'tool': '🔧',
  'interface': '🎨',
  'experiment': '🧪',
}

const categoryColors: Record<string, string> = {
  'workflow': 'bg-blue-100 text-blue-700',
  'gis-demo': 'bg-emerald-100 text-emerald-700',
  'tool': 'bg-purple-100 text-purple-700',
  'interface': 'bg-rose-100 text-rose-700',
  'experiment': 'bg-amber-100 text-amber-700',
}

function DailyBuilds() {
  const [builds, setBuilds] = useState<DailyBuild[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pendingReview: 0, accepted: 0 })
  const [filter, setFilter] = useState<string>('pending-review')
  const [selectedBuild, setSelectedBuild] = useState<DailyBuild | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadBuilds()
  }, [filter])

  // Reset feedback when selecting a different build
  useEffect(() => {
    setFeedback(selectedBuild?.userFeedback || '')
  }, [selectedBuild?.id])

  const loadBuilds = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/daily-builds${params}`)
      if (res.ok) {
        const data = await res.json()
        setBuilds(data.builds || [])
        setStats(data.stats || { total: 0, pendingReview: 0, accepted: 0 })
      }
    } catch (e) {
      console.error('Failed to load builds:', e)
    }
    setLoading(false)
  }

  const handleAccept = async (build: DailyBuild) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/daily-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'accept', 
          buildId: build.id,
          feedback: feedback.trim() || undefined
        })
      })
      if (res.ok) {
        setFeedback('')
        setSelectedBuild(null)
        loadBuilds()
      }
    } catch (e) {
      console.error('Failed to accept build:', e)
    }
    setProcessing(false)
  }

  const handleReject = async (build: DailyBuild) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/daily-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject', 
          buildId: build.id,
          feedback: feedback.trim() || undefined
        })
      })
      if (res.ok) {
        setFeedback('')
        setSelectedBuild(null)
        loadBuilds()
      }
    } catch (e) {
      console.error('Failed to reject build:', e)
    }
    setProcessing(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const pendingBuilds = builds.filter(b => b.status === 'pending-review')
  const acceptedBuilds = builds.filter(b => b.status === 'accepted')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-3xl">🌙</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Daily Builds</h1>
              <p className="text-xs text-slate-500">Nightly creations to review</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">{stats.pendingReview} pending review</div>
            <div className="text-xs text-slate-400">{stats.accepted} accepted</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setFilter('pending-review')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'pending-review' 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Pending Review ({stats.pendingReview})
          </button>
          <button 
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'accepted' 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Accepted ({stats.accepted})
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
        </div>

        {/* Builds List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading builds...</div>
        ) : builds.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="text-5xl mb-4 block">🌙</span>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No builds to review</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {filter === 'pending-review' 
                ? "All caught up! Check back tomorrow morning for new builds."
                : "No builds in this category yet."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {builds.map(build => (
              <div 
                key={build.id}
                className={`bg-white rounded-xl border p-5 transition cursor-pointer hover:shadow-md ${
                  selectedBuild?.id === build.id ? 'ring-2 ring-blue-300 border-blue-300' : 'border-slate-200'
                }`}
                onClick={() => setSelectedBuild(selectedBuild?.id === build.id ? null : build)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{categoryIcons[build.category] || '🧪'}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{build.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[build.category]}`}>
                          {build.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{build.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{formatDate(build.createdAt)}</span>
                        {build.previewUrl && (
                          <a 
                            href={build.previewUrl} 
                            target="_blank" 
                            rel="noopener"
                            onClick={e => e.stopPropagation()}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            🔗 Preview
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {build.status === 'accepted' && (
                    <span className="text-xs px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                      accepted
                    </span>
                  )}
                </div>

                {/* Expanded View */}
                {selectedBuild?.id === build.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    {build.buildLog && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-slate-500 mb-2">Build Log</h4>
                        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-x-auto text-slate-600 max-h-40 whitespace-pre-wrap">
                          {build.buildLog}
                        </pre>
                      </div>
                    )}

                    {build.status === 'pending-review' && (
                      <>
                        {/* Feedback Input */}
                        <div className="mb-4">
                          <label className="text-xs font-medium text-slate-500 mb-2 block">
                            Feedback (optional - submitted with your choice)
                          </label>
                          <textarea
                            placeholder="What did you think? Any issues or suggestions?"
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                            rows={2}
                          />
                        </div>

                        {/* Action Buttons - Only Accept/Reject */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAccept(build)}
                            disabled={processing}
                            className="flex-1 px-4 py-3 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 font-medium"
                          >
                            ✓ Accept → Move to Builds
                          </button>
                          <button
                            onClick={() => handleReject(build)}
                            disabled={processing}
                            className="flex-1 px-4 py-3 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 font-medium"
                          >
                            ✕ Reject → Delete
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">
                          Rejected builds are deleted. Feedback is saved for context.
                        </p>
                      </>
                    )}

                    {build.status === 'accepted' && (
                      <div className="text-sm text-emerald-600 flex items-center gap-2">
                        <span>✓ Accepted</span>
                        {build.reviewedAt && (
                          <span className="text-slate-400">({formatDate(build.reviewedAt)})</span>
                        )}
                        <Link to="/builds" className="ml-auto text-blue-500 hover:text-blue-700">
                          View in Builds →
                        </Link>
                      </div>
                    )}

                    {build.userFeedback && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-xs font-medium text-blue-700 mb-1">Your Feedback</h4>
                        <p className="text-sm text-blue-900">{build.userFeedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
