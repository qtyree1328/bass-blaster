import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface BriefingItem {
  id: string
  type: 'paper' | 'article' | 'news' | 'tool' | 'dataset' | 'job-trend'
  title: string
  source: string
  url?: string
  summary: string
  relevance: string
  tags: string[]
  read: boolean
  starred: boolean
  addedAt: string
}

interface Briefing {
  date: string
  items: BriefingItem[]
  sentToChat: boolean
  generatedAt: string
}

export const Route = createFileRoute('/briefing/')({
  component: BriefingPage,
})

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  paper: { icon: '📄', label: 'Research Paper', color: 'bg-purple-100 text-purple-700' },
  article: { icon: '📰', label: 'Article', color: 'bg-blue-100 text-blue-700' },
  news: { icon: '📢', label: 'News', color: 'bg-amber-100 text-amber-700' },
  tool: { icon: '🔧', label: 'Tool/Library', color: 'bg-emerald-100 text-emerald-700' },
  dataset: { icon: '📊', label: 'Dataset', color: 'bg-cyan-100 text-cyan-700' },
  'job-trend': { icon: '📈', label: 'Job Trend', color: 'bg-rose-100 text-rose-700' },
}

function BriefingPage() {
  const [today, setToday] = useState<Briefing | null>(null)
  const [recent, setRecent] = useState<Briefing[]>([])
  const [stats, setStats] = useState({ totalBriefings: 0, unreadToday: 0, starredTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewBriefing, setViewBriefing] = useState<Briefing | null>(null)

  const loadData = async () => {
    try {
      const res = await fetch('/api/briefing')
      if (res.ok) {
        const data = await res.json()
        setToday(data.today)
        setRecent(data.recent || [])
        setStats(data.stats || {})
        if (data.today) {
          setViewBriefing(data.today)
          setSelectedDate(data.today.date)
        }
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectBriefing = async (date: string) => {
    setSelectedDate(date)
    const res = await fetch(`/api/briefing?date=${date}`)
    if (res.ok) {
      const data = await res.json()
      setViewBriefing(data.briefing)
    }
  }

  const markRead = async (itemId: string) => {
    await fetch('/api/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read', itemId })
    })
    loadData()
  }

  const toggleStar = async (itemId: string) => {
    await fetch('/api/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-star', itemId })
    })
    loadData()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Morning Briefing</h1>
              <p className="text-xs text-slate-500">Your daily industry intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <span className="text-amber-600 font-medium">{stats.unreadToday} unread today</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">{stats.starredTotal} starred</span>
            </div>
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Sidebar - Recent Briefings */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-amber-200 p-4 sticky top-24">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Briefings</h2>
              <div className="space-y-1">
                {recent.map(b => (
                  <button
                    key={b.date}
                    onClick={() => selectBriefing(b.date)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedDate === b.date
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-600 hover:bg-amber-50'
                    }`}
                  >
                    <span>{formatDate(b.date)}</span>
                    <span className={`float-right text-xs ${
                      selectedDate === b.date ? 'text-amber-100' : 'text-slate-400'
                    }`}>
                      {b.items.length} items
                    </span>
                  </button>
                ))}
                {recent.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    No briefings yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : !viewBriefing ? (
              <div className="text-center py-16 bg-white rounded-xl border border-amber-200">
                <span className="text-6xl mb-4 block">☀️</span>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No briefing yet</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  I'll gather research papers, articles, and industry news each morning and deliver them here + via text.
                </p>
                <p className="text-slate-400 text-sm mt-4">
                  Topics: Remote Sensing, GIS, Conservation Science, Geospatial Tech
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Briefing Header */}
                <div className="bg-white rounded-xl border border-amber-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {formatDate(viewBriefing.date)} Briefing
                      </h2>
                      <p className="text-sm text-slate-500">
                        {viewBriefing.items.length} items · {viewBriefing.items.filter(i => !i.read).length} unread
                      </p>
                    </div>
                    {viewBriefing.sentToChat && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Sent to chat
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                {viewBriefing.items.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border p-5 transition-all ${
                      item.read ? 'border-slate-200 opacity-75' : 'border-amber-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{TYPE_CONFIG[item.type]?.icon || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${TYPE_CONFIG[item.type]?.color || 'bg-slate-100 text-slate-600'}`}>
                                {TYPE_CONFIG[item.type]?.label || item.type}
                              </span>
                              <span className="text-xs text-slate-400">{item.source}</span>
                            </div>
                            <h3 className="font-medium text-slate-900">{item.title}</h3>
                          </div>
                          <button
                            onClick={() => toggleStar(item.id)}
                            className={`text-xl transition ${item.starred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                          >
                            {item.starred ? '★' : '☆'}
                          </button>
                        </div>
                        
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {item.summary}
                        </p>
                        
                        {item.relevance && (
                          <p className="text-sm text-amber-700 mt-2 bg-amber-50 rounded p-2">
                            <strong>Why this matters:</strong> {item.relevance}
                          </p>
                        )}
                        
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {item.tags.map((tag, i) => (
                              <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => markRead(item.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Read more ↗
                            </a>
                          )}
                          {!item.read && (
                            <button
                              onClick={() => markRead(item.id)}
                              className="text-sm text-slate-400 hover:text-slate-600"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
