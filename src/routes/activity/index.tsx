import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'feature' | 'bug' | 'improvement' | 'research' | 'design' | 'other'
  project?: string
  dueDate?: string
  createdAt: string
  completedAt?: string
  createdBy: 'user' | 'ai'
  order: number
}

type ColumnId = 'backlog' | 'in_progress' | 'review' | 'done'

const COLUMNS: { id: ColumnId; label: string; color: string; bgColor: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  { id: 'in_progress', label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'review', label: 'Review', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'done', label: 'Done', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
]

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-slate-300',
}

const CATEGORY_BADGES: Record<string, { icon: string; color: string }> = {
  feature: { icon: '✨', color: 'bg-purple-100 text-purple-700' },
  bug: { icon: '🐛', color: 'bg-red-100 text-red-700' },
  improvement: { icon: '⚡', color: 'bg-blue-100 text-blue-700' },
  research: { icon: '🔬', color: 'bg-cyan-100 text-cyan-700' },
  design: { icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  other: { icon: '📌', color: 'bg-slate-100 text-slate-700' },
}

export const Route = createFileRoute('/activity/')({
  component: KanbanPage,
})

function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({ backlog: 0, inProgress: 0, review: 0, done: 0, total: 0 })
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', category: 'other' })
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setStats(data.stats || {})
        setCompletedToday(data.completedToday || 0)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTasks()
    // Refresh every 30 seconds
    const interval = setInterval(loadTasks, 30000)
    return () => clearInterval(interval)
  }, [loadTasks])

  const getColumnTasks = (columnId: ColumnId) => 
    tasks.filter(t => t.status === columnId).sort((a, b) => a.order - b.order)

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (columnId: ColumnId) => {
    if (!draggedTask || draggedTask.status === columnId) {
      setDraggedTask(null)
      return
    }

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === draggedTask.id ? { ...t, status: columnId } : t
    ))

    // Save to backend
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', id: draggedTask.id, status: columnId })
    })

    setDraggedTask(null)
    loadTasks()
  }

  const addTask = async () => {
    if (!newTask.title.trim()) return
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'add',
        ...newTask,
        createdBy: 'user'
      })
    })
    
    setNewTask({ title: '', description: '', priority: 'medium', category: 'other' })
    setShowAddModal(false)
    loadTasks()
  }

  const deleteTask = async (id: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    setEditingTask(null)
    loadTasks()
  }

  const clearOldDone = async () => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-done', daysOld: 7 })
    })
    loadTasks()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Kanban</h1>
              <p className="text-xs text-slate-500">
                {completedToday} completed today · {stats.inProgress} in progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              + Add Task
            </button>
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Hub
            </Link>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-4 h-[calc(100vh-140px)]">
            {COLUMNS.map(column => (
              <div
                key={column.id}
                className={`flex flex-col rounded-xl ${column.bgColor} border border-slate-200`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <h2 className={`font-semibold ${column.color}`}>{column.label}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-white ${column.color}`}>
                      {getColumnTasks(column.id).length}
                    </span>
                  </div>
                  {column.id === 'done' && stats.done > 5 && (
                    <button
                      onClick={clearOldDone}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear old
                    </button>
                  )}
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {getColumnTasks(column.id).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onClick={() => setEditingTask(task)}
                      className={`bg-white rounded-lg shadow-sm border-l-4 p-3 cursor-pointer hover:shadow-md transition ${PRIORITY_COLORS[task.priority]} ${
                        draggedTask?.id === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900 leading-tight">
                          {task.title}
                        </h3>
                        {task.createdBy === 'ai' && (
                          <span className="text-xs shrink-0">🤖</span>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {task.category && CATEGORY_BADGES[task.category] && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_BADGES[task.category].color}`}>
                            {CATEGORY_BADGES[task.category].icon} {task.category}
                          </span>
                        )}
                        {task.project && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {task.project}
                          </span>
                        )}
                      </div>
                      
                      {task.completedAt && column.id === 'done' && (
                        <p className="text-xs text-emerald-600 mt-2">
                          ✓ {formatDate(task.completedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {getColumnTasks(column.id).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      {column.id === 'backlog' ? 'Add tasks to get started' :
                       column.id === 'in_progress' ? 'Drag tasks here' :
                       column.id === 'review' ? 'Tasks awaiting review' :
                       'Completed tasks appear here'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="feature">✨ Feature</option>
                    <option value="bug">🐛 Bug</option>
                    <option value="improvement">⚡ Improvement</option>
                    <option value="research">🔬 Research</option>
                    <option value="design">🎨 Design</option>
                    <option value="other">📌 Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{editingTask.title}</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            {editingTask.description && (
              <p className="text-sm text-slate-600 mb-4">{editingTask.description}</p>
            )}
            
            <div className="space-y-2 text-sm text-slate-500 mb-4">
              <p><strong>Status:</strong> {editingTask.status.replace('_', ' ')}</p>
              <p><strong>Priority:</strong> {editingTask.priority}</p>
              {editingTask.category && <p><strong>Category:</strong> {editingTask.category}</p>}
              <p><strong>Created:</strong> {new Date(editingTask.createdAt).toLocaleString()}</p>
              {editingTask.completedAt && (
                <p><strong>Completed:</strong> {new Date(editingTask.completedAt).toLocaleString()}</p>
              )}
              <p><strong>By:</strong> {editingTask.createdBy === 'ai' ? '🤖 AI' : '👤 You'}</p>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => deleteTask(editingTask.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
