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
  status: 'pending-review' | 'incorporated' | 'archived' | 'rejected'
  buildPath?: string
  previewUrl?: string
  buildLog?: string
  userFeedback?: string
  incorporatedTo?: string
  createdAt: string
  reviewedAt?: string
}

interface Stats {
  total: number
  pendingReview: number
  incorporated: number
  archived: number
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

const statusColors: Record<string, string> = {
  'pending-review': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'incorporated': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'archived': 'bg-slate-100 text-slate-600 border-slate-200',
  'rejected': 'bg-red-100 text-red-700 border-red-200',
}

function DailyBuilds() {
  const [builds, setBuilds] = useState<DailyBuild[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pendingReview: 0, incorporated: 0, archived: 0 })
  const [filter, setFilter] = useState<string>('all')
  const [selectedBuild, setSelectedBuild] = useState<DailyBuild | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBuilds()
  }, [filter])

  const loadBuilds = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/daily-builds${params}`)
      if (res.ok) {
        const data = await res.json()
        setBuilds(data.builds || [])
        setStats(data.stats || { total: 0, pendingReview: 0, incorporated: 0, archived: 0 })
      }
    } catch (e) {
      console.error('Failed to load builds:', e)
    }
    setLoading(false)
  }

  const updateBuildStatus = async (buildId: string, status: string, incorporatedTo?: string) => {
    try {
      const res = await fetch('/api/daily-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          buildId, 
          status,
          incorporatedTo 
        })
      })
      if (res.ok) {
        loadBuilds()
        setSelectedBuild(null)
      }
    } catch (e) {
      console.error('Failed to update build:', e)
    }
  }

  const submitFeedback = async (buildId: string) => {
    if (!feedback.trim()) return
    try {
      const res = await fetch('/api/daily-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', buildId, feedback })
      })
      if (res.ok) {
        setFeedback('')
        loadBuilds()
      }
    } catch (e) {
      console.error('Failed to submit feedback:', e)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

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
              <p className="text-xs text-slate-500">Nightly creations while you sleep</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">{stats.pendingReview} pending review</div>
            <div className="text-xs text-slate-400">{stats.incorporated} incorporated</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`rounded-xl border p-4 text-left transition ${filter === 'all' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xs font-medium text-slate-500 mb-1">Total Builds</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </button>
          <button 
            onClick={() => setFilter('pending-review')}
            className={`rounded-xl border p-4 text-left transition ${filter === 'pending-review' ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xs font-medium text-slate-500 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
          </button>
          <button 
            onClick={() => setFilter('incorporated')}
            className={`rounded-xl border p-4 text-left transition ${filter === 'incorporated' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xs font-medium text-slate-500 mb-1">Incorporated</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.incorporated}</p>
          </button>
          <button 
            onClick={() => setFilter('archived')}
            className={`rounded-xl border p-4 text-left transition ${filter === 'archived' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xs font-medium text-slate-500 mb-1">Archived</p>
            <p className="text-2xl font-bold text-slate-500">{stats.archived}</p>
          </button>
        </div>

        {/* Builds List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading builds...</div>
        ) : builds.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="text-5xl mb-4 block">🌙</span>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No builds yet</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {filter === 'all' 
                ? "I'll start building things for you tonight while you sleep. Check back tomorrow morning!"
                : `No builds with status "${filter.replace('-', ' ')}"`
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
                        {build.buildPath && <span>📁 {build.buildPath.split('/').pop()}</span>}
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
                  <span className={`text-xs px-3 py-1 rounded-full border ${statusColors[build.status]}`}>
                    {build.status.replace('-', ' ')}
                  </span>
                </div>

                {/* Expanded View */}
                {selectedBuild?.id === build.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    {build.buildLog && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-slate-500 mb-2">Build Log</h4>
                        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-x-auto text-slate-600 max-h-40">
                          {build.buildLog}
                        </pre>
                      </div>
                    )}

                    {build.userFeedback && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-xs font-medium text-blue-700 mb-1">Your Feedback</h4>
                        <p className="text-sm text-blue-900">{build.userFeedback}</p>
                      </div>
                    )}

                    {build.status === 'pending-review' && (
                      <>
                        {/* Feedback Input */}
                        <div className="mb-4">
                          <textarea
                            placeholder="Leave feedback or notes about this build..."
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                            rows={2}
                          />
                          {feedback && (
                            <button
                              onClick={() => submitFeedback(build.id)}
                              className="mt-2 px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg"
                            >
                              Save Feedback
                            </button>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateBuildStatus(build.id, 'incorporated', 'projects')}
                            className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                          >
                            ✓ Incorporate to Projects
                          </button>
                          <button
                            onClick={() => updateBuildStatus(build.id, 'archived')}
                            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                          >
                            📦 Archive
                          </button>
                          <button
                            onClick={() => updateBuildStatus(build.id, 'rejected')}
                            className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                          >
                            ✕ Not Useful
                          </button>
                        </div>
                      </>
                    )}

                    {build.status === 'incorporated' && build.incorporatedTo && (
                      <div className="text-sm text-emerald-600">
                        ✓ Incorporated to: {build.incorporatedTo}
                        {build.reviewedAt && <span className="text-slate-400 ml-2">({formatDate(build.reviewedAt)})</span>}
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
