import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: CommandCenter,
})

interface Task {
  description: string
  status: 'backlog' | 'in_progress' | 'review' | 'done'
  timestamp?: string
}

interface UsageStats {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  sessions: number
}

interface BuiltProject {
  id: string
  name: string
  hubIcon: string
  hubDescription: string
  previewUrl?: string
  builtAt: string
}

function CommandCenter() {
  const [time, setTime] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [jobCount, setJobCount] = useState(0)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [builtProjects, setBuiltProjects] = useState<BuiltProject[]>([])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load data on mount and refresh periodically
  useEffect(() => {
    const loadData = async () => {
      // Load tasks
      try {
        const taskRes = await fetch('/api/activity/checkpoint')
        if (taskRes.ok) {
          const data = await taskRes.json()
          setTasks(data.tasks || [])
        }
      } catch {}

      // Load job count
      try {
        const jobRes = await fetch('/api/jobs/queue')
        if (jobRes.ok) {
          const data = await jobRes.json()
          setJobCount(data.jobs?.filter((j: any) => j.status === 'pending')?.length || 0)
        }
      } catch {}

      // Load usage
      try {
        const usageRes = await fetch('/api/usage?range=24h')
        if (usageRes.ok) {
          const data = await usageRes.json()
          setUsage({
            totalTokens: (data.totalInput || 0) + (data.totalOutput || 0),
            inputTokens: data.totalInput || 0,
            outputTokens: data.totalOutput || 0,
            sessions: data.sessions?.length || 0
          })
          setGatewayStatus(data.totalInput > 0 || data.sessions?.length > 0 ? 'online' : 'online')
        }
      } catch {
        setGatewayStatus('offline')
      }

      // Load built projects
      try {
        const projectsRes = await fetch('/api/projects?built=true')
        if (projectsRes.ok) {
          const data = await projectsRes.json()
          setBuiltProjects(data.projects || [])
        }
      } catch {}
    }

    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Match Kanban statuses: in_progress is "Currently Working On"
  const inProgress = tasks.filter(t => t.status === 'in_progress').sort((a, b) => a.order - b.order)
  const pending = tasks.filter(t => t.status === 'backlog')
  const completed = tasks.filter(t => t.status === 'done')

  const formatTokens = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐙</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Command Center</h1>
              <p className="text-xs text-slate-500">AI Assistant Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                gatewayStatus === 'online' ? 'bg-emerald-500' : 
                gatewayStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></span>
              <span className="text-xs text-slate-500">
                {gatewayStatus === 'online' ? 'Gateway Online' : 
                 gatewayStatus === 'offline' ? 'Gateway Offline' : 'Connecting...'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono text-slate-900">{time.toLocaleTimeString()}</div>
              <div className="text-xs text-slate-500">
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Current Task Banner */}
        {inProgress.length > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-700">Currently Working On</span>
            </div>
            <p className="text-slate-900 font-medium">{inProgress[0].title}</p>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Tasks Today" 
            value={completed.length.toString()} 
            subtext={`${pending.length} pending`}
            color="blue"
          />
          <StatCard 
            label="Active Sessions" 
            value={usage?.sessions?.toString() || '0'} 
            subtext="24h"
            color="purple"
          />
          <StatCard 
            label="Tokens Used" 
            value={formatTokens(usage?.totalTokens || 0)} 
            subtext={`${formatTokens(usage?.inputTokens || 0)} in / ${formatTokens(usage?.outputTokens || 0)} out`}
            color="amber"
          />
          <StatCard 
            label="Job Matches" 
            value={jobCount.toString()} 
            subtext="pending review"
            color="rose"
          />
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <NavCard 
            to="/briefing" 
            icon="☀️" 
            name="Morning Briefing" 
            desc="Daily industry intelligence"
            highlight={true}
          />
          <NavCard 
            to="/news" 
            icon="📰" 
            name="News" 
            desc="Industry research & papers"
          />
          <NavCard 
            to="/trends" 
            icon="📊" 
            name="Trends" 
            desc="Job market & skill gaps"
          />
          <NavCard 
            to="/daily-builds" 
            icon="🌙" 
            name="Daily Builds" 
            desc="Nightly creations to review"
          />
          <NavCard 
            to="/jobs" 
            icon="🎯" 
            name="Job Hunter" 
            desc="View matches, track applications"
            badge={jobCount > 0 ? jobCount : undefined}
          />
          <NavCard 
            to="/activity" 
            icon="📋" 
            name="Kanban" 
            desc="Accountability hub - significant tasks"
            highlight={inProgress.length > 0}
          />
          <NavCard 
            to="/activity-log" 
            icon="📜" 
            name="Activity Log" 
            desc="Small tasks & routine work"
          />
          <NavCard 
            to="/usage" 
            icon="📈" 
            name="Usage" 
            desc="Token & cost analytics"
          />
          <NavCard 
            to="/projects" 
            icon="💡" 
            name="Ideas" 
            desc="Review project ideas"
          />
          <NavCard 
            to="/builds" 
            icon="🔨" 
            name="Builds" 
            desc="Active development"
          />
          <NavCard 
            to="/published" 
            icon="🚀" 
            name="Published" 
            desc="Live projects"
          />
          <NavCard 
            to="/keyrules" 
            icon="📜" 
            name="Key Rules" 
            desc="My operating instructions"
          />
          <NavCard 
            to="/code" 
            icon="🔍" 
            name="Code" 
            desc="Review & approve changes"
          />
          <NavCard 
            to="/considerations" 
            icon="🧠" 
            name="Considerations" 
            desc="Things to think about"
          />
          <NavCard 
            to="/crabwalk" 
            icon="🦀" 
            name="Crabwalk" 
            desc="Real-time monitor"
          />
          <NavCard 
            to="/sketch" 
            icon="✏️" 
            name="Quick Sketch" 
            desc="Draw & export GeoJSON"
          />
          <NavCard 
            to="/timelapse" 
            icon="🛰️" 
            name="Timelapse" 
            desc="NASA satellite timelapses"
          />
        </div>

        {/* Built Projects */}
        {builtProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">🚀 Your Built Projects</h2>
              <Link to="/projects" className="text-xs text-blue-600 hover:text-blue-800">Manage →</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {builtProjects.map(project => (
                project.previewUrl ? (
                  <a
                    key={project.id}
                    href={project.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5 hover:shadow-md hover:border-emerald-300 transition-all"
                  >
                    <span className="text-3xl mb-3 block">{project.hubIcon || '🚀'}</span>
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.hubDescription}</p>
                    <span className="absolute top-4 right-4 text-slate-400 text-xs">↗</span>
                  </a>
                ) : (
                  <div
                    key={project.id}
                    className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5"
                  >
                    <span className="text-3xl mb-3 block">{project.hubIcon || '🚀'}</span>
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.hubDescription}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Queue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Task Queue</h2>
              <Link to="/activity" className="text-xs text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            {pending.length > 0 ? (
              <ul className="space-y-2">
                {pending.slice(0, 6).map((t, i) => (
                  <li key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                    <span className="text-sm text-slate-700">{t.description}</span>
                  </li>
                ))}
                {pending.length > 6 && (
                  <li className="text-xs text-slate-400 pl-5">+{pending.length - 6} more tasks</li>
                )}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm py-4 text-center">No pending tasks</p>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Quick Links</h2>
            <div className="space-y-2">
              <QuickLink href="http://localhost:18789" icon="🦞" name="Clawdbot Dashboard" external />
              <QuickLink to="/monitor" icon="🔌" name="Live Monitor" />
              <QuickLink href="https://docs.clawd.bot" icon="📚" name="Documentation" external />
              <QuickLink href="https://github.com/clawdbot/clawdbot" icon="🐙" name="GitHub" external />
            </div>
          </div>
        </div>

        {/* Recent Completed */}
        {completed.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Recently Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completed.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-sm text-slate-600 line-clamp-2">{t.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, subtext, color }: { 
  label: string; value: string; subtext: string; color: 'blue' | 'purple' | 'amber' | 'rose' 
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
  }
  
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-1">{subtext}</p>
    </div>
  )
}

function NavCard({ to, icon, name, desc, badge, highlight }: { 
  to: string; icon: string; name: string; desc: string; badge?: number; highlight?: boolean 
}) {
  return (
    <Link
      to={to}
      className={`relative bg-white rounded-xl border p-5 hover:shadow-md hover:border-slate-300 transition-all ${
        highlight ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'
      }`}
    >
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="font-semibold text-slate-900">{name}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {highlight && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      )}
    </Link>
  )
}

function QuickLink({ to, href, icon, name, external }: { 
  to?: string; href?: string; icon: string; name: string; external?: boolean 
}) {
  const className = "flex items-center gap-3 p-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
  
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{name}</span>
        {external && <span className="text-slate-400 text-xs ml-auto">↗</span>}
      </a>
    )
  }
  
  return (
    <Link to={to!} className={className}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{name}</span>
    </Link>
  )
}
