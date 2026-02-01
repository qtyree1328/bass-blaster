import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

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

interface BriefingSummary {
  text: string
  sections: {
    tasksCompleted: string[]
    dailyBuild: { title: string; description: string } | null
    topNews: { title: string; summary: string }[]
    jobUpdates: string[]
    newIdeas: string[]
  }
  generatedAt: string
}

interface Briefing {
  date: string
  items: BriefingItem[]
  summary?: BriefingSummary
  sentToChat: boolean
  generatedAt: string
}

export const Route = createFileRoute('/briefing/')({
  component: BriefingPage,
})

// Calendar Component
function BriefingCalendar({ 
  briefings, 
  selectedDate, 
  onSelectDate 
}: { 
  briefings: Briefing[]
  selectedDate: string | null
  onSelectDate: (date: string) => void 
}) {
  const [viewMonth, setViewMonth] = useState(new Date())
  
  const briefingDates = new Set(briefings.map(b => b.date))
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }
  
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  
  const getDateString = (day: number) => {
    const year = viewMonth.getFullYear()
    const month = String(viewMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${year}-${month}-${dayStr}`
  }
  
  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }
  
  const today = new Date().toISOString().split('T')[0]
  const days = getDaysInMonth(viewMonth)
  
  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button 
          onClick={prevMonth}
          className="p-1 hover:bg-amber-100 rounded transition text-slate-500 hover:text-slate-700"
        >
          ←
        </button>
        <h2 className="text-sm font-semibold text-slate-700">
          {formatMonthYear(viewMonth)}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-1 hover:bg-amber-100 rounded transition text-slate-500 hover:text-slate-700"
        >
          →
        </button>
      </div>
      
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }
          
          const dateStr = getDateString(day)
          const hasBriefing = briefingDates.has(dateStr)
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === today
          
          return (
            <button
              key={day}
              onClick={() => hasBriefing && onSelectDate(dateStr)}
              disabled={!hasBriefing}
              className={`
                aspect-square rounded-lg text-xs font-medium transition relative
                ${isSelected 
                  ? 'bg-amber-500 text-white' 
                  : hasBriefing 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer' 
                    : 'text-slate-300 cursor-default'
                }
                ${isToday && !isSelected ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
              `}
            >
              {day}
              {hasBriefing && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 bg-amber-100 rounded" />
          <span>Has briefing</span>
        </div>
      </div>
      
      {/* Quick List */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recent</h3>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {briefings.slice(0, 7).map(b => (
            <button
              key={b.date}
              onClick={() => onSelectDate(b.date)}
              className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                selectedDate === b.date
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 hover:bg-amber-50'
              }`}
            >
              {new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
              <span className={`float-right ${selectedDate === b.date ? 'text-amber-100' : 'text-slate-400'}`}>
                {b.items.length}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
    setAudioUrl(null)
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

  const generateAudio = async () => {
    if (!viewBriefing?.summary?.text) return
    setAudioLoading(true)
    try {
      const res = await fetch('/api/briefing/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: viewBriefing.summary.text,
          date: viewBriefing.date 
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAudioUrl(data.audioUrl)
      }
    } catch (err) {
      console.error('TTS error:', err)
    }
    setAudioLoading(false)
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const todayDate = new Date()
    const yesterday = new Date(todayDate)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateStr === todayDate.toISOString().split('T')[0]) return 'Today'
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
              <p className="text-xs text-slate-500">Your daily intelligence summary</p>
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
          
          {/* Sidebar - Calendar */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-amber-200 p-4 sticky top-24">
              <BriefingCalendar
                briefings={recent}
                selectedDate={selectedDate}
                onSelectDate={selectBriefing}
              />
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
                  I'll compile overnight work, research, news, and job updates each morning.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Section - THE KEY NEW FEATURE */}
                {viewBriefing.summary && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold">{formatDate(viewBriefing.date)} Summary</h2>
                        <p className="text-amber-100 text-sm">Your morning briefing at a glance</p>
                      </div>
                      
                      {/* TTS Controls */}
                      <div className="flex items-center gap-2">
                        {!audioUrl ? (
                          <button
                            onClick={generateAudio}
                            disabled={audioLoading}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition disabled:opacity-50"
                          >
                            {audioLoading ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <span>🔊</span>
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={togglePlayPause}
                              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
                            >
                              <span>{isPlaying ? '⏸️' : '▶️'}</span>
                              <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </button>
                            <audio 
                              ref={audioRef} 
                              src={audioUrl}
                              onEnded={() => setIsPlaying(false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary Content */}
                    <div className="space-y-4">
                      {/* Tasks Completed */}
                      {viewBriefing.summary.sections.tasksCompleted.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-2">
                            ✅ Completed Overnight
                          </h3>
                          <ul className="space-y-1">
                            {viewBriefing.summary.sections.tasksCompleted.map((task, i) => (
                              <li key={i} className="text-sm text-white/90">• {task}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Daily Build */}
                      {viewBriefing.summary.sections.dailyBuild && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-2">
                            🌙 Nightly Build
                          </h3>
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="font-medium">{viewBriefing.summary.sections.dailyBuild.title}</p>
                            <p className="text-sm text-white/80 mt-1">{viewBriefing.summary.sections.dailyBuild.description}</p>
                          </div>
                        </div>
                      )}

                      {/* Top News */}
                      {viewBriefing.summary.sections.topNews.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-2">
                            📰 Top News
                          </h3>
                          <div className="grid gap-2">
                            {viewBriefing.summary.sections.topNews.slice(0, 3).map((item, i) => (
                              <div key={i} className="bg-white/10 rounded-lg p-3">
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-white/70 mt-1">{item.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Job Updates */}
                      {viewBriefing.summary.sections.jobUpdates.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-2">
                            🎯 Job Updates
                          </h3>
                          <ul className="space-y-1">
                            {viewBriefing.summary.sections.jobUpdates.map((update, i) => (
                              <li key={i} className="text-sm text-white/90">• {update}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* New Ideas */}
                      {viewBriefing.summary.sections.newIdeas.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-2">
                            💡 New Ideas
                          </h3>
                          <ul className="space-y-1">
                            {viewBriefing.summary.sections.newIdeas.map((idea, i) => (
                              <li key={i} className="text-sm text-white/90">• {idea}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Full Text (collapsible) */}
                    <details className="mt-4">
                      <summary className="text-sm text-amber-200 cursor-pointer hover:text-white">
                        View full summary text
                      </summary>
                      <div className="mt-3 p-4 bg-white/10 rounded-lg text-sm whitespace-pre-wrap">
                        {viewBriefing.summary.text}
                      </div>
                    </details>
                  </div>
                )}

                {/* Briefing Header */}
                <div className="bg-white rounded-xl border border-amber-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Research & News Items
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

                {viewBriefing.items.length === 0 && !viewBriefing.summary && (
                  <div className="text-center py-8 text-slate-400">
                    No items in this briefing yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
