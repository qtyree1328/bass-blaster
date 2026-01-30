import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface TrendItem {
  id: string
  type: 'market' | 'skill'
  title: string
  description: string
  relevance: 'high' | 'medium' | 'low'
  source?: string
  addedAt: string
  updatedAt: string
  saved: boolean
  notes?: string
}

const relevanceColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
}

export const Route = createFileRoute('/trends/')({
  component: TrendsPage,
})

function TrendsPage() {
  const [items, setItems] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<TrendItem | null>(null)
  const [notes, setNotes] = useState('')
  
  // Main tabs: 'new' or 'library'
  const [mainTab, setMainTab] = useState<'new' | 'library'>('new')
  // Library sub-tabs
  const [libraryTab, setLibraryTab] = useState<'market' | 'skill'>('market')

  const fetchData = async () => {
    const res = await fetch('/api/trends')
    const data = await res.json()
    setItems(data.trends || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter based on tabs
  const filteredItems = items.filter(item => {
    if (mainTab === 'new') {
      return !item.saved
    } else {
      if (!item.saved) return false
      return item.type === libraryTab
    }
  })

  const saveItem = async (id: string) => {
    await fetch('/api/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', id, notes })
    })
    fetchData()
    setSelectedItem(null)
  }

  const deleteItem = async (id: string) => {
    await fetch('/api/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    fetchData()
    setSelectedItem(null)
  }

  const updateNotes = async (id: string, newNotes: string) => {
    await fetch('/api/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateNotes', id, notes: newNotes })
    })
    fetchData()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const selectItem = (item: TrendItem) => {
    setSelectedItem(item)
    setNotes(item.notes || '')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Trends & Skill Gaps</h1>
              <p className="text-xs text-slate-500">Job market analysis & skills to develop</p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {items.filter(i => !i.saved).length} new · {items.filter(i => i.saved).length} saved
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
            🆕 New ({items.filter(i => !i.saved).length})
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
              onClick={() => setLibraryTab('market')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                libraryTab === 'market'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              📈 Market Trends
            </button>
            <button
              onClick={() => setLibraryTab('skill')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                libraryTab === 'skill'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              🎯 Skill Gaps
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
                  {mainTab === 'new' ? 'No new trends' : 'No saved trends yet'}
                </p>
                <p className="text-sm text-slate-400">
                  {mainTab === 'new'
                    ? 'New trends will appear here from job market analysis'
                    : 'Save trends from the New tab to build your library'}
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
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.type === 'market' ? '📈' : '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${relevanceColors[item.relevance]}`}>
                            {item.relevance}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(item.addedAt)}</span>
                        </div>
                        <h3 className="font-medium text-slate-900 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedItem.type === 'market' ? '📈' : '🎯'}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${relevanceColors[selectedItem.relevance]}`}>
                      {selectedItem.relevance} relevance
                    </span>
                  </div>
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

                <p className="text-slate-700 leading-relaxed mb-4">
                  {selectedItem.description}
                </p>

                {selectedItem.source && (
                  <p className="text-sm text-slate-500 mb-4">
                    Source: {selectedItem.source}
                  </p>
                )}

                {/* Notes section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => selectedItem.saved && updateNotes(selectedItem.id, notes)}
                    placeholder="Add your thoughts, action items, or how this applies to your job search..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedItem.saved ? 'Notes auto-save on blur' : 'Notes will be saved when you save this trend'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  {!selectedItem.saved ? (
                    <button
                      onClick={() => saveItem(selectedItem.id)}
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
