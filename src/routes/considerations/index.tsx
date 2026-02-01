import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface ChatMessage {
  id: string
  author: 'user' | 'ai'
  content: string
  timestamp: string
}

interface Consideration {
  id: string
  topic: string
  type: 'article' | 'idea' | 'product' | 'feature' | 'skill' | 'quote' | 'other'
  summary: string
  sourceUrl?: string
  notes: string[]
  tags: string[]
  status: 'new' | 'reviewing' | 'actionable' | 'archived'
  chat?: ChatMessage[]
  createdAt: string
  updatedAt?: string
}

export const Route = createFileRoute('/considerations/')({
  component: ConsiderationsPage,
})

const TYPE_ICONS: Record<string, string> = {
  article: '📰',
  idea: '💡',
  product: '📦',
  feature: '⚙️',
  skill: '🎯',
  quote: '💬',
  other: '📌',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'border-l-amber-400 bg-amber-50/50',
  reviewing: 'border-l-blue-400 bg-blue-50/50',
  actionable: 'border-l-emerald-400 bg-emerald-50/50',
  archived: 'border-l-slate-300 bg-slate-50/50 opacity-60',
}

function ConsiderationsPage() {
  const [considerations, setConsiderations] = useState<Consideration[]>([])
  const [stats, setStats] = useState({ total: 0, new: 0, reviewing: 0, actionable: 0, archived: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [chatMessage, setChatMessage] = useState('')

  const loadData = async () => {
    try {
      const params = filter !== 'all' && filter !== 'archived' ? `?status=${filter}` : ''
      const res = await fetch(`/api/considerations${params}`)
      if (res.ok) {
        const data = await res.json()
        // Filter out archived unless specifically viewing archived
        let items = data.considerations || []
        if (filter === 'all') {
          items = items.filter((c: Consideration) => c.status !== 'archived')
        } else if (filter === 'archived') {
          items = items.filter((c: Consideration) => c.status === 'archived')
        }
        setConsiderations(items)
        setStats(data.stats || {})
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [filter])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/considerations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-status', id, status })
    })
    loadData()
  }

  const addNote = async (id: string) => {
    if (!noteText.trim()) return
    await fetch('/api/considerations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-note', id, note: noteText })
    })
    setNoteText('')
    loadData()
  }

  const sendChat = async (id: string) => {
    if (!chatMessage.trim()) return
    await fetch('/api/considerations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-chat', id, author: 'user', content: chatMessage })
    })
    setChatMessage('')
    loadData()
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this consideration?')) return
    await fetch('/api/considerations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    setExpanded(null)
    loadData()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Considerations</h1>
              <p className="text-xs text-slate-500">Things to think about later</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Hub
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'all' 
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Active ({stats.total - stats.archived})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'new' 
                ? 'bg-amber-500 text-white' 
                : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            New ({stats.new})
          </button>
          <button
            onClick={() => setFilter('reviewing')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'reviewing' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            Reviewing ({stats.reviewing})
          </button>
          <button
            onClick={() => setFilter('actionable')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'actionable' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            Actionable ({stats.actionable})
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'archived' 
                ? 'bg-slate-400 text-white' 
                : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Archived ({stats.archived})
          </button>
        </div>

        {/* How to use hint */}
        {considerations.length === 0 && !loading && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">🧠</span>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No considerations yet</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Send me a message starting with <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">/Considerations</code> followed by 
              an article, idea, product, or anything you want to think about later.
            </p>
            <p className="text-slate-400 text-sm mt-4">
              Example: <code className="bg-slate-100 px-2 py-1 rounded font-mono">/Considerations Observable notebooks for data viz</code>
            </p>
          </div>
        )}

        {/* Considerations List */}
        <div className="space-y-3">
          {considerations.map((item) => (
            <div
              key={item.id}
              className={`border-l-4 rounded-r-xl bg-white shadow-sm hover:shadow transition-all ${STATUS_COLORS[item.status]}`}
            >
              {/* Header - always visible */}
              <button
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <span className="text-2xl shrink-0">{TYPE_ICONS[item.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-slate-900 leading-tight">{item.topic}</h3>
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.summary}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-slate-400 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Expanded content */}
              {expanded === item.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  {/* Full summary */}
                  <div className="pt-4 pb-3">
                    <p className="text-slate-700 leading-relaxed">{item.summary}</p>
                    {item.sourceUrl && (
                      <a 
                        href={item.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                      >
                        View source ↗
                      </a>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</h4>
                      <div className="space-y-2">
                        {item.notes.map((note, i) => (
                          <p key={i} className="text-sm text-slate-600 bg-slate-50 rounded p-2">{note}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add note */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a note..."
                        value={expanded === item.id ? noteText : ''}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNote(item.id)}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => addNote(item.id)}
                        className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      💬 Discussion {item.chat?.length ? `(${item.chat.length})` : ''}
                    </h4>
                    {item.chat && item.chat.length > 0 && (
                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                        {item.chat.map((msg) => (
                          <div
                            key={msg.id}
                            className={`text-sm p-2 rounded-lg ${
                              msg.author === 'user'
                                ? 'bg-blue-50 text-blue-900 ml-4'
                                : 'bg-slate-100 text-slate-700 mr-4'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs">
                                {msg.author === 'user' ? '👤 You' : '🤖 AI'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(msg.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ask a question or add context..."
                        value={expanded === item.id ? chatMessage : ''}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChat(item.id)}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => sendChat(item.id)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      {item.status !== 'reviewing' && (
                        <button
                          onClick={() => updateStatus(item.id, 'reviewing')}
                          className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                        >
                          Start Reviewing
                        </button>
                      )}
                      {item.status !== 'actionable' && (
                        <button
                          onClick={() => updateStatus(item.id, 'actionable')}
                          className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                        >
                          Mark Actionable
                        </button>
                      )}
                      {item.status !== 'archived' && (
                        <button
                          onClick={() => updateStatus(item.id, 'archived')}
                          className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                          Archive
                        </button>
                      )}
                      {item.status === 'archived' && (
                        <button
                          onClick={() => updateStatus(item.id, 'new')}
                          className="text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
