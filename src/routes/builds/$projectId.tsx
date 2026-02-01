import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

interface ChatMessage {
  id: string
  author: 'user' | 'ai'
  content: string
  timestamp: string
}

interface ResearchItem {
  id: string
  title: string
  source: string
  url?: string
  notes: string
  addedAt: string
}

interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  category: string
  status: 'idea' | 'development' | 'built' | 'rejected'
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt?: string
  addedBy: 'user' | 'ai'
  overview?: string
  goals?: string[]
  plan?: string
  documentation?: string
  workshopNotes?: string[]
  chat?: ChatMessage[]
  research?: ResearchItem[]
  buildPath?: string
  previewUrl?: string
}

export const Route = createFileRoute('/builds/$projectId')({
  component: ProjectDetailPage,
})

type TabType = 'overview' | 'research' | 'plan' | 'docs' | 'chat'

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/builds/$projectId' })
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [chatMessage, setChatMessage] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        const found = data.projects?.find((p: Project) => p.id === projectId)
        setProject(found || null)
      }
    } catch {}
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const sendChat = async () => {
    if (!chatMessage.trim() || !project) return
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'add-chat', 
        projectId: project.id, 
        author: 'user', 
        content: chatMessage 
      })
    })
    setChatMessage('')
    loadProject()
  }

  const updateField = async (field: string, value: any) => {
    if (!project) return
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update-development', 
        projectId: project.id, 
        [field]: value 
      })
    })
    setEditingField(null)
    setEditValue('')
    loadProject()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Project not found</h2>
          <Link to="/builds" className="text-blue-600 hover:text-blue-800">
            ← Back to Builds
          </Link>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'plan', label: 'Plan', icon: '📝' },
    { id: 'docs', label: 'Docs', icon: '📚' },
    { id: 'chat', label: `Chat${project.chat?.length ? ` (${project.chat.length})` : ''}`, icon: '💬' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to="/builds" className="text-slate-400 hover:text-slate-600">
                ← Builds
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <p className="text-sm text-slate-500">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {project.previewUrl && (
                <a
                  href={project.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  👁️ View Live
                </a>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.priority === 'high' ? 'bg-red-100 text-red-700' :
                project.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {project.priority} priority
              </span>
            </div>
          </div>
          
          {/* Tech tags */}
          {project.tech && project.tech.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.map((t, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <nav className="flex gap-1 border-b border-slate-200 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview Section */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
                {editingField !== 'overview' && (
                  <button
                    onClick={() => { setEditingField('overview'); setEditValue(project.overview || '') }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingField === 'overview' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-40 p-3 border border-slate-200 rounded-lg text-sm"
                    placeholder="Project overview..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateField('overview', editValue)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                  {project.overview || <span className="text-slate-400 italic">No overview yet</span>}
                </div>
              )}
            </section>

            {/* Goals Section */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Goals</h2>
              {project.goals && project.goals.length > 0 ? (
                <ul className="space-y-2">
                  {project.goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">No goals defined</p>
              )}
            </section>

            {/* Workshop Notes */}
            {project.workshopNotes && project.workshopNotes.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Workshop Notes</h2>
                <div className="space-y-2">
                  {project.workshopNotes.map((note, i) => (
                    <p key={i} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {note}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Research & Data</h2>
            {project.research && project.research.length > 0 ? (
              <div className="space-y-4">
                {project.research.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500">{item.source}</p>
                      </div>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">
                          View ↗
                        </a>
                      )}
                    </div>
                    {item.notes && (
                      <p className="mt-2 text-sm text-slate-600">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No research collected yet. AI will add findings here.</p>
            )}
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Project Plan</h2>
              {editingField !== 'plan' && (
                <button
                  onClick={() => { setEditingField('plan'); setEditValue(project.plan || '') }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'plan' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-64 p-3 border border-slate-200 rounded-lg text-sm font-mono"
                  placeholder="## Phase 1&#10;- [ ] Task 1&#10;- [ ] Task 2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateField('plan', editValue)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap font-mono">
                {project.plan || <span className="text-slate-400 italic font-sans">No plan yet</span>}
              </div>
            )}
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Documentation</h2>
              {editingField !== 'documentation' && (
                <button
                  onClick={() => { setEditingField('documentation'); setEditValue(project.documentation || '') }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'documentation' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-64 p-3 border border-slate-200 rounded-lg text-sm font-mono"
                  placeholder="## Setup&#10;...&#10;&#10;## Usage&#10;..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateField('documentation', editValue)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap font-mono">
                {project.documentation || <span className="text-slate-400 italic font-sans">No documentation yet</span>}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Discussion</h2>
            
            {/* Chat messages */}
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {project.chat && project.chat.length > 0 ? (
                project.chat.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.author === 'user'
                        ? 'bg-blue-50 ml-8'
                        : 'bg-slate-50 mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {msg.author === 'user' ? '👤 You' : '🤖 AI'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-center py-8">
                  No messages yet. Start a conversation about this project.
                </p>
              )}
            </div>

            {/* Chat input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask a question or add context..."
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendChat}
                disabled={!chatMessage.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
