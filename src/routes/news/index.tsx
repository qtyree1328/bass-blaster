import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  summary: string
  category: 'industry' | 'research' | 'conservation' | 'tools' | 'datasets'
  tags: string[]
  addedAt: string
  read: boolean
  starred: boolean
  saved: boolean
  notes?: string
}

const categoryColors: Record<string, string> = {
  industry: 'bg-blue-100 text-blue-700',
  research: 'bg-purple-100 text-purple-700',
  conservation: 'bg-green-100 text-green-700',
  tools: 'bg-orange-100 text-orange-700',
  datasets: 'bg-cyan-100 text-cyan-700',
}

export const Route = createFileRoute('/news/')({
  component: NewsPage,
})

function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [stats, setStats] = useState({ total: 0, unread: 0, starred: 0, saved: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null)
  const [notes, setNotes] = useState('')
  
  // Tabs: 'new' or 'library'
  const [mainTab, setMainTab] = useState<'new' | 'library'>('new')
  // Library sub-tabs: 'papers' or 'articles'
  const [libraryTab, setLibraryTab] = useState<'papers' | 'articles'>('papers')

  const fetchNews = async () => {
    const res = await fetch('/api/news')
    const data = await res.json()
    setItems(data.items || [])
    setStats(data.stats || { total: 0, unread: 0, starred: 0, saved: 0 })
    setLoading(false)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  // Filter items based on current tab
  const filteredItems = items.filter(item => {
    if (mainTab === 'new') {
      return !item.read && !item.saved
    } else {
      // Library - saved items
      if (!item.saved) return false
      if (libraryTab === 'papers') {
        return item.category === 'research'
      } else {
        return item.category !== 'research'
      }
    }
  })

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

  const saveToLibrary = async (id: string) => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', id }),
    })
    fetchNews()
    setSelectedItem(null)
  }

  const deleteItem = async (id: string) => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    fetchNews()
    setSelectedItem(null)
  }

  const updateNotes = async (id: string, notes: string) => {
    await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateNotes', id, notes }),
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

  const selectItem = (item: NewsItem) => {
    setSelectedItem(item)
    setNotes(item.notes || '')
    if (!item.read) {
      markRead(item.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">📰</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">News & Research</h1>
              <p className="text-xs text-slate-500">Industry updates, papers, conservation tech</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{stats.unread} new</span>
            <span>•</span>
            <span>{stats.saved} saved</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-slate-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setMainTab('new')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              mainTab === 'new'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🆕 New ({items.filter(i => !i.read && !i.saved).length})
          </button>
          <button
            onClick={() => setMainTab('library')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              mainTab === 'library'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📚 Library ({items.filter(i => i.saved).length})
          </button>
        </div>

        {/* Library Sub-tabs */}
        {mainTab === 'library' && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setLibraryTab('papers')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                libraryTab === 'papers'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              📄 Research Papers
            </button>
            <button
              onClick={() => setLibraryTab('articles')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                libraryTab === 'articles'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              📰 Articles & News
            </button>
          </div>
        )}

        {/* New tab: Mark all read */}
        {mainTab === 'new' && stats.unread > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={markAllRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Items List */}
          <div className={`${selectedItem ? 'col-span-5' : 'col-span-12'}`}>
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <p className="text-slate-400 mb-2">
                  {mainTab === 'new' ? 'All caught up!' : 'No saved items yet'}
                </p>
                <p className="text-sm text-slate-400">
                  {mainTab === 'new' 
                    ? 'New items will appear here during heartbeats' 
                    : 'Save items from the New tab to build your library'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition hover:shadow-md ${
                      selectedItem?.id === item.id 
                        ? 'border-blue-500 ring-2 ring-blue-100' 
                        : 'border-slate-200'
                    } ${item.read && mainTab === 'new' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(item.id); }}
                        className={`mt-1 text-lg ${item.starred ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}
                      >
                        {item.starred ? '★' : '☆'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[item.category] || 'bg-slate-100 text-slate-600'}`}>
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(item.addedAt)}</span>
                          {!item.read && mainTab === 'new' && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <h3 className="font-medium text-slate-900 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{item.source}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div className="col-span-7">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[selectedItem.category] || 'bg-slate-100'}`}>
                    {selectedItem.category}
                  </span>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {selectedItem.title}
                </h2>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <span>{selectedItem.source}</span>
                  <span>•</span>
                  <span>{formatDate(selectedItem.addedAt)}</span>
                </div>

                <p className="text-slate-700 leading-relaxed mb-4">
                  {selectedItem.summary}
                </p>

                {selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes section (for library items) */}
                {selectedItem.saved && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Your Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => updateNotes(selectedItem.id, notes)}
                      placeholder="Add your notes about this item..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  {selectedItem.url && (
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Read Full Article ↗
                    </a>
                  )}
                  
                  {!selectedItem.saved ? (
                    <button
                      onClick={() => saveToLibrary(selectedItem.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      💾 Save to Library
                    </button>
                  ) : (
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                      ✓ Saved
                    </span>
                  )}
                  
                  <button
                    onClick={() => deleteItem(selectedItem.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium ml-auto"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
