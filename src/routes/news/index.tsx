import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  summary: string
  category: 'industry' | 'papers' | 'conservation' | 'tools' | 'datasets'
  tags: string[]
  addedAt: string
  read: boolean
  starred: boolean
}

const categoryColors: Record<string, string> = {
  industry: 'bg-blue-100 text-blue-700',
  papers: 'bg-purple-100 text-purple-700',
  conservation: 'bg-green-100 text-green-700',
  tools: 'bg-orange-100 text-orange-700',
  datasets: 'bg-cyan-100 text-cyan-700',
}

const categoryLabels: Record<string, string> = {
  industry: '📰 Industry',
  papers: '📄 Papers',
  conservation: '🌿 Conservation',
  tools: '🔧 Tools',
  datasets: '📊 Datasets',
}

export const Route = createFileRoute('/news/')({
  component: NewsPage,
})

function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [stats, setStats] = useState({ total: 0, unread: 0, starred: 0 })
  const [filter, setFilter] = useState<string | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchNews = async () => {
    const params = new URLSearchParams()
    if (filter) params.set('category', filter)
    if (showUnreadOnly) params.set('unread', 'true')
    
    const res = await fetch(`/api/news?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setStats(data.stats || { total: 0, unread: 0, starred: 0 })
    setLoading(false)
  }

  useEffect(() => {
    fetchNews()
  }, [filter, showUnreadOnly])

  const markRead = async (id: string) => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', id }),
    })
    fetchNews()
  }

  const toggleStar = async (id: string) => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'star', id }),
    })
    fetchNews()
  }

  const markAllRead = async () => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    })
    fetchNews()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">📰</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">News & Research</h1>
              <p className="text-xs text-slate-500">Industry updates, papers, conservation tech</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {stats.unread} unread
            </span>
            {stats.unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === null
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded"
            />
            Unread only
          </label>
        </div>

        {/* News items */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-2">No news items yet</p>
            <p className="text-sm text-slate-400">I'll add items here during heartbeats</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`bg-white rounded-xl border p-4 transition hover:shadow-sm ${
                  item.read ? 'border-slate-100 opacity-70' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStar(item.id)}
                    className={`mt-1 text-lg ${item.starred ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}
                  >
                    {item.starred ? '★' : '☆'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[item.category]}`}>
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400">{item.source}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{formatDate(item.addedAt)}</span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markRead(item.id)}
                          className="hover:text-blue-600"
                        >
                          {item.title} ↗
                        </a>
                      ) : (
                        item.title
                      )}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{item.summary}</p>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
