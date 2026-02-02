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
  type: 'document' | 'data' | 'source' | 'finding' | 'benchmark'
  content: string
  source?: string
  url?: string
  addedAt: string
  addedBy: 'user' | 'ai'
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
  previewUrl?: string  // Local dev URL (localhost, file://)
  liveUrl?: string     // Hosted URL (GitHub Pages, custom domain)
  repoUrl?: string     // GitHub repo URL
}

export const Route = createFileRoute('/builds/$projectId')({
  component: ProjectDetailPage,
})

type TabType = 'overview' | 'research' | 'plan' | 'docs' | 'chat'

const TYPE_BADGES: Record<string, { icon: string; color: string; label: string }> = {
  document: { icon: '📄', color: 'bg-blue-100 text-blue-700', label: 'Document' },
  data: { icon: '📊', color: 'bg-green-100 text-green-700', label: 'Data' },
  source: { icon: '🔗', color: 'bg-purple-100 text-purple-700', label: 'Source' },
  finding: { icon: '💡', color: 'bg-amber-100 text-amber-700', label: 'Finding' },
  benchmark: { icon: '📈', color: 'bg-cyan-100 text-cyan-700', label: 'Benchmark' },
}

// Simple markdown renderer for research docs
function renderMarkdown(content: string): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let inCodeBlock = false
  let codeContent: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  
  lines.forEach((line, i) => {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm my-3">
            <code>{codeContent.join('\n')}</code>
          </pre>
        )
        codeContent = []
      }
      inCodeBlock = !inCodeBlock
      return
    }
    
    if (inCodeBlock) {
      codeContent.push(line)
      return
    }
    
    // Tables
    if (line.startsWith('|')) {
      if (!inTable) inTable = true
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (!cells.every(c => c.match(/^[-:]+$/))) {
        tableRows.push(cells)
      }
      return
    } else if (inTable) {
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="min-w-full text-sm border border-slate-200 rounded-lg">
            <thead className="bg-slate-100">
              <tr>
                {tableRows[0]?.map((cell, j) => (
                  <th key={j} className="px-4 py-2 text-left font-semibold border-b border-slate-200">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 border-b border-slate-100">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }
    
    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-slate-900 mt-6 mb-3">{line.slice(2)}</h1>)
      return
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-bold text-slate-800 mt-5 mb-2">{line.slice(3)}</h2>)
      return
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-semibold text-slate-700 mt-4 mb-2">{line.slice(4)}</h3>)
      return
    }
    
    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(<hr key={i} className="my-6 border-slate-200" />)
      return
    }
    
    // List items
    if (line.match(/^[-*] /)) {
      elements.push(
        <li key={i} className="ml-4 text-slate-600 my-1 list-disc list-inside">
          {formatInline(line.slice(2))}
        </li>
      )
      return
    }
    
    // Numbered list
    if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={i} className="ml-4 text-slate-600 my-1 list-decimal list-inside">
          {formatInline(line.replace(/^\d+\. /, ''))}
        </li>
      )
      return
    }
    
    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-3" />)
      return
    }
    
    // Regular paragraph
    elements.push(<p key={i} className="text-slate-600 my-2">{formatInline(line)}</p>)
  })
  
  // Handle trailing table
  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="final-table" className="overflow-x-auto my-4">
        <table className="min-w-full text-sm border border-slate-200 rounded-lg">
          <thead className="bg-slate-100">
            <tr>
              {tableRows[0]?.map((cell, j) => (
                <th key={j} className="px-4 py-2 text-left font-semibold border-b border-slate-200">{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(1).map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 border-b border-slate-100">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  
  return <>{elements}</>
}

function formatInline(text: string): JSX.Element {
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm">$1</code>')
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
  
  return <span dangerouslySetInnerHTML={{ __html: text }} />
}

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/builds/$projectId' })
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [chatMessage, setChatMessage] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedResearch, setExpandedResearch] = useState<Set<string>>(new Set())
  const [researchFilter, setResearchFilter] = useState<string>('all')

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

  const toggleResearchExpand = (id: string) => {
    setExpandedResearch(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
    { id: 'research', label: `Research${project.research?.length ? ` (${project.research.length})` : ''}`, icon: '🔬' },
    { id: 'plan', label: 'Plan', icon: '📝' },
    { id: 'docs', label: 'Docs', icon: '📚' },
    { id: 'chat', label: `Chat${project.chat?.length ? ` (${project.chat.length})` : ''}`, icon: '💬' },
  ]

  const filteredResearch = project.research?.filter(r => 
    researchFilter === 'all' || r.type === researchFilter
  ) || []

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
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                >
                  🔧 View Local
                </a>
              )}
              {(project.liveUrl || project.repoUrl) && (
                <a
                  href={project.liveUrl || project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                >
                  🌐 View Hosted
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
          
          {project.tech && project.tech.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.map((t, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

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
                    <button onClick={() => updateField('overview', editValue)} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">Save</button>
                    <button onClick={() => setEditingField(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
                  {project.overview || <span className="text-slate-400 italic">No overview yet</span>}
                </div>
              )}
            </section>

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

            {project.workshopNotes && project.workshopNotes.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Workshop Notes</h2>
                <div className="space-y-2">
                  {project.workshopNotes.map((note, i) => (
                    <p key={i} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{note}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Research Tab - Enhanced */}
        {activeTab === 'research' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Filter:</span>
                <select 
                  value={researchFilter}
                  onChange={(e) => setResearchFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
                >
                  <option value="all">All Types</option>
                  <option value="document">📄 Documents</option>
                  <option value="benchmark">📈 Benchmarks</option>
                  <option value="finding">💡 Findings</option>
                  <option value="data">📊 Data</option>
                  <option value="source">🔗 Sources</option>
                </select>
              </div>
              <div className="text-sm text-slate-500">
                {filteredResearch.length} item{filteredResearch.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Research items */}
            {filteredResearch.length > 0 ? (
              <div className="space-y-4">
                {filteredResearch.map((item) => {
                  const isExpanded = expandedResearch.has(item.id)
                  const badge = TYPE_BADGES[item.type] || TYPE_BADGES.document
                  const preview = item.content.slice(0, 200)
                  
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Header - always visible */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-slate-50 transition flex items-start justify-between"
                        onClick={() => toggleResearchExpand(item.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                              {badge.icon} {badge.label}
                            </span>
                            <span className="text-xs text-slate-400">{formatDate(item.addedAt)}</span>
                            {item.addedBy === 'ai' && <span className="text-xs">🤖</span>}
                          </div>
                          <h3 className="font-semibold text-slate-900">{item.title}</h3>
                          {item.source && <p className="text-xs text-slate-500 mt-1">Source: {item.source}</p>}
                          {!isExpanded && (
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{preview}...</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View ↗
                            </a>
                          )}
                          <span className="text-slate-400 text-lg">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>
                      
                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-6 bg-slate-50">
                          <div className="prose prose-sm max-w-none">
                            {renderMarkdown(item.content)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <span className="text-4xl mb-4 block">🔬</span>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Research Yet</h3>
                <p className="text-slate-500">Research documents, data, and findings will appear here.</p>
              </div>
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
                  <button onClick={() => updateField('plan', editValue)} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">Save</button>
                  <button onClick={() => setEditingField(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm">Cancel</button>
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
                  <button onClick={() => updateField('documentation', editValue)} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">Save</button>
                  <button onClick={() => setEditingField(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm">Cancel</button>
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
            
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {project.chat && project.chat.length > 0 ? (
                project.chat.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.author === 'user' ? 'bg-blue-50 ml-8' : 'bg-slate-50 mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{msg.author === 'user' ? '👤 You' : '🤖 AI'}</span>
                      <span className="text-xs text-slate-400">{formatDate(msg.timestamp)}</span>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-center py-8">
                  No messages yet. Start a conversation about this project.
                </p>
              )}
            </div>

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
