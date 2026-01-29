import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

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
  buildPath?: string
  previewUrl?: string
  hubIcon?: string
  hubDescription?: string
  builtAt?: string
}

type TabType = 'ideas' | 'development' | 'built'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

const categoryOptions = ['Remote Sensing', 'Conservation', 'Web App', 'Data Viz', 'ML/AI', 'Workflow', 'Tool', 'Other']

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('ideas')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBuildModal, setShowBuildModal] = useState(false)
  
  // Form states
  const [newIdea, setNewIdea] = useState({ name: '', description: '', category: 'Other', priority: 'medium' as const })
  const [workshopNote, setWorkshopNote] = useState('')
  const [buildConfig, setBuildConfig] = useState({ hubIcon: '🚀', hubDescription: '', previewUrl: '' })

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const apiAction = async (action: string, projectId?: string, payload?: any) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, projectId, ...payload })
    })
    if (res.ok) {
      await loadProjects()
      const data = await res.json()
      if (data.project && selectedProject?.id === projectId) {
        setSelectedProject(data.project)
      }
      return data
    }
  }

  const addIdea = async () => {
    if (!newIdea.name.trim()) return
    await apiAction('add-idea', undefined, { ...newIdea, addedBy: 'user' })
    setNewIdea({ name: '', description: '', category: 'Other', priority: 'medium' })
    setShowAddModal(false)
  }

  const moveToDevelopment = async (project: Project) => {
    await apiAction('to-development', project.id)
    setActiveTab('development')
  }

  const addWorkshopNote = async () => {
    if (!selectedProject || !workshopNote.trim()) return
    await apiAction('add-note', selectedProject.id, { note: workshopNote })
    setWorkshopNote('')
  }

  const updateDevelopment = async (field: string, value: any) => {
    if (!selectedProject) return
    await apiAction('update-development', selectedProject.id, { [field]: value })
  }

  const buildProject = async () => {
    if (!selectedProject) return
    await apiAction('build', selectedProject.id, buildConfig)
    setShowBuildModal(false)
    setActiveTab('built')
  }

  const ideas = projects.filter(p => p.status === 'idea')
  const development = projects.filter(p => p.status === 'development')
  const built = projects.filter(p => p.status === 'built')
  
  const currentProjects = activeTab === 'ideas' ? ideas : 
                          activeTab === 'development' ? development : built

  const priorityColor = (p: string) => ({
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  }[p] || 'bg-slate-100 text-slate-600 border-slate-200')

  const categoryColor = (cat: string) => ({
    'Remote Sensing': 'bg-blue-100 text-blue-700',
    'Conservation': 'bg-green-100 text-green-700',
    'Web App': 'bg-purple-100 text-purple-700',
    'Data Viz': 'bg-pink-100 text-pink-700',
    'ML/AI': 'bg-indigo-100 text-indigo-700',
    'Workflow': 'bg-cyan-100 text-cyan-700',
    'Tool': 'bg-orange-100 text-orange-700',
  }[cat] || 'bg-slate-100 text-slate-600')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">💡</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
              <p className="text-xs text-slate-500">
                {ideas.length} ideas · {development.length} in development · {built.length} built
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
          >
            + Add Idea
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: 'ideas' as const, label: 'Ideas', count: ideas.length, emoji: '💭', desc: 'Raw concepts' },
              { id: 'development' as const, label: 'Development', count: development.length, emoji: '🔧', desc: 'Being planned' },
              { id: 'built' as const, label: 'Built', count: built.length, emoji: '🚀', desc: 'On the hub' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedProject(null) }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.emoji} {tab.label}
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project List */}
            <div className="lg:col-span-1 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              {currentProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`p-4 rounded-xl cursor-pointer border transition ${
                    selectedProject?.id === project.id 
                      ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-100' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {project.status === 'built' && <span>{project.hubIcon || '🚀'}</span>}
                        <h3 className="font-medium text-slate-900 text-sm">{project.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{project.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${priorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      {project.addedBy === 'ai' && (
                        <span className="text-xs text-purple-500">🤖</span>
                      )}
                    </div>
                  </div>
                  {project.category && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${categoryColor(project.category)}`}>
                      {project.category}
                    </span>
                  )}
                </div>
              ))}
              {currentProjects.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <span className="text-4xl mb-3 block">
                    {activeTab === 'ideas' ? '💭' : activeTab === 'development' ? '🔧' : '🚀'}
                  </span>
                  <p className="text-slate-500 text-sm">
                    {activeTab === 'ideas' ? 'No ideas yet. Add one!' :
                     activeTab === 'development' ? 'Move ideas here to develop them' :
                     'Build a project to see it here'}
                  </p>
                </div>
              )}
            </div>

            {/* Project Detail */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                          {selectedProject.status === 'built' && <span>{selectedProject.hubIcon}</span>}
                          {selectedProject.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor(selectedProject.category)}`}>
                            {selectedProject.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(selectedProject.priority)}`}>
                            {selectedProject.priority} priority
                          </span>
                          {selectedProject.addedBy === 'ai' && (
                            <span className="text-xs text-purple-500">🤖 AI suggested</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4 flex-wrap">
                      {selectedProject.status === 'idea' && (
                        <button
                          onClick={() => moveToDevelopment(selectedProject)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          🔧 Move to Development
                        </button>
                      )}
                      {selectedProject.status === 'development' && (
                        <button
                          onClick={() => {
                            setBuildConfig({ 
                              hubIcon: '🚀', 
                              hubDescription: selectedProject.description,
                              previewUrl: ''
                            })
                            setShowBuildModal(true)
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          🚀 Build & Add to Hub
                        </button>
                      )}
                      {selectedProject.status === 'built' && selectedProject.previewUrl && (
                        <a
                          href={selectedProject.previewUrl}
                          target="_blank"
                          rel="noopener"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          🔗 Open Project
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedProject.description}</p>
                  </div>

                  {/* Development Section */}
                  {(selectedProject.status === 'development' || selectedProject.status === 'built') && (
                    <>
                      {/* Overview */}
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Overview</h3>
                        {selectedProject.status === 'development' ? (
                          <textarea
                            value={selectedProject.overview || ''}
                            onChange={e => updateDevelopment('overview', e.target.value)}
                            placeholder="High-level overview of what this project does..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          />
                        ) : (
                          <p className="text-sm text-slate-600">{selectedProject.overview || 'No overview'}</p>
                        )}
                      </div>

                      {/* Goals */}
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Goals</h3>
                        {selectedProject.status === 'development' ? (
                          <textarea
                            value={(selectedProject.goals || []).join('\n')}
                            onChange={e => updateDevelopment('goals', e.target.value.split('\n').filter(g => g.trim()))}
                            placeholder="One goal per line..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                          />
                        ) : (
                          <ul className="text-sm text-slate-600 list-disc list-inside">
                            {(selectedProject.goals || []).map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        )}
                      </div>

                      {/* Plan */}
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Implementation Plan</h3>
                        {selectedProject.status === 'development' ? (
                          <textarea
                            value={selectedProject.plan || ''}
                            onChange={e => updateDevelopment('plan', e.target.value)}
                            placeholder="Step-by-step implementation plan..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[120px] font-mono"
                          />
                        ) : (
                          <pre className="text-sm text-slate-600 whitespace-pre-wrap">{selectedProject.plan || 'No plan'}</pre>
                        )}
                      </div>

                      {/* Documentation */}
                      <div className="p-6 border-b border-slate-100">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Documentation</h3>
                        {selectedProject.status === 'development' ? (
                          <textarea
                            value={selectedProject.documentation || ''}
                            onChange={e => updateDevelopment('documentation', e.target.value)}
                            placeholder="Technical documentation, API notes, etc..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[120px] font-mono"
                          />
                        ) : (
                          <pre className="text-sm text-slate-600 whitespace-pre-wrap">{selectedProject.documentation || 'No documentation'}</pre>
                        )}
                      </div>

                      {/* Workshop Notes */}
                      <div className="p-6">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">Workshop Notes</h3>
                        {selectedProject.workshopNotes && selectedProject.workshopNotes.length > 0 ? (
                          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {selectedProject.workshopNotes.map((note, i) => (
                              <div key={i} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {note}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 mb-4">No notes yet</p>
                        )}

                        {selectedProject.status === 'development' && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={workshopNote}
                              onChange={e => setWorkshopNote(e.target.value)}
                              placeholder="Add a note..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              onKeyDown={e => e.key === 'Enter' && addWorkshopNote()}
                            />
                            <button onClick={addWorkshopNote} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Tech Stack */}
                  {selectedProject.tech && selectedProject.tech.length > 0 && (
                    <div className="p-6 border-t border-slate-100">
                      <h3 className="text-sm font-medium text-slate-700 mb-3">Tech Stack</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.tech.map((t, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <p className="text-slate-400">Select a project to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Idea Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">💭 Add New Idea</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
                <input
                  type="text"
                  value={newIdea.name}
                  onChange={e => setNewIdea({ ...newIdea, name: e.target.value })}
                  placeholder="Project name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
                <textarea
                  value={newIdea.description}
                  onChange={e => setNewIdea({ ...newIdea, description: e.target.value })}
                  placeholder="What does this project do?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm h-24"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Category</label>
                  <select
                    value={newIdea.category}
                    onChange={e => setNewIdea({ ...newIdea, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newIdea.priority}
                    onChange={e => setNewIdea({ ...newIdea, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={addIdea} disabled={!newIdea.name.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">
                Add Idea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build Modal */}
      {showBuildModal && selectedProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">🚀 Build Project</h3>
            <p className="text-sm text-slate-500 mb-4">
              This will add <strong>{selectedProject.name}</strong> as a new card on the Command Hub.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Hub Icon</label>
                <input
                  type="text"
                  value={buildConfig.hubIcon}
                  onChange={e => setBuildConfig({ ...buildConfig, hubIcon: e.target.value })}
                  placeholder="🚀"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Hub Description</label>
                <input
                  type="text"
                  value={buildConfig.hubDescription}
                  onChange={e => setBuildConfig({ ...buildConfig, hubDescription: e.target.value })}
                  placeholder="Short description for the hub card"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Preview URL (optional)</label>
                <input
                  type="text"
                  value={buildConfig.previewUrl}
                  onChange={e => setBuildConfig({ ...buildConfig, previewUrl: e.target.value })}
                  placeholder="http://localhost:3001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBuildModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={buildProject} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                🚀 Build & Add to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
