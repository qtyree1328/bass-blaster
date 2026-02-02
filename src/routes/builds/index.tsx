import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  category: string
  status: 'idea' | 'development' | 'built' | 'published' | 'rejected'
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt?: string
  addedBy: 'user' | 'ai'
  chat?: { id: string; author: string; content: string; timestamp: string }[]
  previewUrl?: string
  hubIcon?: string
}

export const Route = createFileRoute('/builds/')({
  component: BuildsPage,
})

function BuildsPage() {
  const [builds, setBuilds] = useState<Project[]>([])
  const [published, setPublished] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'builds' | 'published'>('builds')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json()
          const all = data.projects || []
          setBuilds(all.filter((p: Project) => p.status === 'development'))
          setPublished(all.filter((p: Project) => p.status === 'published'))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const priorityColor = (p: string) => ({
    high: 'border-l-red-400 bg-red-50/50',
    medium: 'border-l-amber-400 bg-amber-50/50',
    low: 'border-l-slate-300 bg-slate-50/50',
  }[p] || 'border-l-slate-300 bg-slate-50/50')

  const categoryIcon = (cat: string) => ({
    'Remote Sensing': '🛰️',
    'Conservation': '🌿',
    'Web App': '🌐',
    'Data Viz': '📊',
    'ML/AI': '🤖',
    'Workflow': '⚙️',
    'Tool': '🔧',
  }[cat] || '📦')

  const projects = activeTab === 'builds' ? builds : published

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">{activeTab === 'builds' ? '🔨' : '🚀'}</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {activeTab === 'builds' ? 'Builds' : 'Published'}
              </h1>
              <p className="text-xs text-slate-500">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link
            to="/projects"
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
          >
            💡 View Ideas
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('builds')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
              activeTab === 'builds'
                ? 'bg-amber-100 text-amber-800'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🔨 Builds ({builds.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
              activeTab === 'published'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🚀 Published ({published.length})
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <span className="text-5xl mb-4 block">{activeTab === 'builds' ? '🔨' : '🚀'}</span>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {activeTab === 'builds' ? 'No Active Builds' : 'No Published Projects'}
            </h2>
            <p className="text-slate-500 mb-4">
              {activeTab === 'builds' 
                ? 'Approve ideas from the Projects page to start building'
                : 'Projects with their own domain will appear here'}
            </p>
            {activeTab === 'builds' && (
              <Link
                to="/projects"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
              >
                💡 Browse Ideas
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/builds/${project.id}`}
                className={`block p-5 rounded-xl border-l-4 bg-white shadow-sm hover:shadow-md transition ${
                  activeTab === 'published' 
                    ? 'border-l-emerald-400 bg-emerald-50/30' 
                    : priorityColor(project.priority)
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{project.hubIcon || categoryIcon(project.category)}</span>
                  {project.previewUrl && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activeTab === 'published' ? '🌐 Live' : 'Preview'}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{project.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{project.description}</p>
                
                {/* Tech tags */}
                {project.tech && project.tech.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tech.slice(0, 3).map((t, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                    {project.tech.length > 3 && (
                      <span className="text-xs text-slate-400">+{project.tech.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  {activeTab === 'builds' ? (
                    <span className={`px-2 py-0.5 rounded ${
                      project.priority === 'high' ? 'bg-red-100 text-red-600' :
                      project.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {project.priority}
                    </span>
                  ) : (
                    <span className="text-emerald-600">Published</span>
                  )}
                  {project.chat && project.chat.length > 0 && (
                    <span className="flex items-center gap-1">
                      💬 {project.chat.length}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
