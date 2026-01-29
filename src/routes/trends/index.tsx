import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

interface TrendItem {
  id: string
  type: 'skill' | 'tool' | 'topic' | 'gap'
  title: string
  description: string
  relevance: 'high' | 'medium' | 'low'
  source?: string
  mentions?: number
  addedAt: string
}

interface SkillGap {
  id: string
  skill: string
  demandLevel: 'high' | 'medium' | 'low'
  currentLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
  priority: number
  notes: string
  resources: string[]
}

const relevanceColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const typeIcons = {
  skill: '🎯',
  tool: '🔧',
  topic: '📈',
  gap: '⚠️',
}

const levelColors = {
  none: 'bg-red-500',
  basic: 'bg-orange-500',
  intermediate: 'bg-yellow-500',
  advanced: 'bg-green-500',
}

export const Route = createFileRoute('/trends/')({
  component: TrendsPage,
})

function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([])
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trends' | 'gaps'>('trends')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const res = await fetch('/api/trends')
    const data = await res.json()
    setTrends(data.trends || [])
    setSkillGaps(data.skillGaps || [])
    setLastAnalysis(data.lastAnalysis)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600">←</Link>
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Trends & Skill Gaps</h1>
              <p className="text-xs text-slate-500">Job market analysis & skills to develop</p>
            </div>
          </div>
          {lastAnalysis && (
            <span className="text-xs text-slate-400">
              Last analysis: {formatDate(lastAnalysis)}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'trends'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            📈 Market Trends
            {trends.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {trends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'gaps'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎯 Skill Gaps
            {skillGaps.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {skillGaps.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : activeTab === 'trends' ? (
          /* Trends Tab */
          trends.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-2">No trends tracked yet</p>
              <p className="text-sm text-slate-400">I'll analyze job postings and add trends during heartbeats</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trends.map((trend) => (
                <div
                  key={trend.id}
                  className={`bg-white rounded-xl border p-4 ${relevanceColors[trend.relevance]}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{typeIcons[trend.type]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{trend.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${relevanceColors[trend.relevance]}`}>
                          {trend.relevance}
                        </span>
                        {trend.mentions && (
                          <span className="text-xs text-slate-500">
                            {trend.mentions} mentions
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{trend.description}</p>
                      {trend.source && (
                        <p className="text-xs text-slate-400 mt-2">Source: {trend.source}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Skill Gaps Tab */
          skillGaps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-2">No skill gaps identified</p>
              <p className="text-sm text-slate-400">I'll compare job requirements to your resume</p>
            </div>
          ) : (
            <div className="space-y-3">
              {skillGaps.map((gap) => (
                <div key={gap.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-900">{gap.skill}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      gap.demandLevel === 'high'
                        ? 'bg-red-100 text-red-700'
                        : gap.demandLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {gap.demandLevel} demand
                    </span>
                  </div>
                  
                  {/* Skill level bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500 w-20">Your level:</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${levelColors[gap.currentLevel]}`}
                        style={{
                          width:
                            gap.currentLevel === 'none' ? '0%' :
                            gap.currentLevel === 'basic' ? '33%' :
                            gap.currentLevel === 'intermediate' ? '66%' : '100%'
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 w-24 text-right capitalize">
                      {gap.currentLevel}
                    </span>
                  </div>
                  
                  {gap.notes && (
                    <p className="text-sm text-slate-600 mb-2">{gap.notes}</p>
                  )}
                  
                  {gap.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {gap.resources.map((resource, i) => (
                        <a
                          key={i}
                          href={resource}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Resource {i + 1} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
