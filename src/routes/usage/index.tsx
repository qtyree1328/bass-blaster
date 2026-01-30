import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/usage/')({
  component: UsagePage,
})

interface SessionUsage {
  sessionId: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  messageCount: number
  lastActivity: string
}

interface UsageData {
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheWrite: number
  totalCost: number
  sessions: SessionUsage[]
  lastUpdated: string
  currentSession?: {
    sessionId: string
    contextUsed: number
    contextMax: number
    input: number
    output: number
  }
}

function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/usage?range=${timeRange}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setUsage(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [timeRange])

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/usage?range=${timeRange}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => setUsage(data))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [timeRange])

  const formatTokens = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  const formatCost = (n: number) => {
    if (n < 0.01) return '<$0.01'
    return '$' + n.toFixed(2)
  }

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      
      if (diff < 60000) return 'just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  const totalTokens = (usage?.totalInput || 0) + (usage?.totalOutput || 0)
  const cacheTotal = (usage?.totalCacheRead || 0) + (usage?.totalCacheWrite || 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Usage</h1>
              <p className="text-xs text-slate-500">Token & cost analytics</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back to Hub
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(['1h', '24h', '7d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {range === '1h' ? '1 Hour' : range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : 'All Time'}
              </button>
            ))}
          </div>
          {usage?.lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {formatTime(usage.lastUpdated)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading usage data...</div>
        ) : usage ? (
          <div className="space-y-6">
            {/* $200 Subscription Progress */}
            <SubscriptionProgress totalCost={usage.totalCost} />

            {/* Context Window - Current Session */}
            {usage.currentSession && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-indigo-900">🧠 Current Context Window</h3>
                  <span className="text-xs text-indigo-600 font-mono">
                    {formatTokens(usage.currentSession.contextUsed)} / {formatTokens(usage.currentSession.contextMax)}
                  </span>
                </div>
                
                {/* Full context window bar */}
                <div className="h-6 rounded-full overflow-hidden bg-slate-200 flex relative">
                  {/* Input portion */}
                  <div 
                    className="bg-blue-500 transition-all relative z-10" 
                    style={{ width: `${(usage.currentSession.input / usage.currentSession.contextMax) * 100}%` }}
                  />
                  {/* Output portion */}
                  <div 
                    className="bg-orange-500 transition-all relative z-10" 
                    style={{ width: `${(usage.currentSession.output / usage.currentSession.contextMax) * 100}%` }}
                  />
                  {/* Remaining space is the grey background */}
                </div>
                
                <div className="flex justify-between mt-2 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Input: {formatTokens(usage.currentSession.input)}
                    </span>
                    <span className="flex items-center gap-1 text-orange-700">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Output: {formatTokens(usage.currentSession.output)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      Available: {formatTokens(usage.currentSession.contextMax - usage.currentSession.contextUsed)}
                    </span>
                  </div>
                  <span className="text-indigo-600 font-semibold">
                    {((usage.currentSession.contextUsed / usage.currentSession.contextMax) * 100).toFixed(1)}% used
                  </span>
                </div>
                
                {/* Warning if getting close to limit */}
                {usage.currentSession.contextUsed > usage.currentSession.contextMax * 0.8 && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ Context window is {((usage.currentSession.contextUsed / usage.currentSession.contextMax) * 100).toFixed(0)}% full. 
                    Consider running /new to start a fresh session.
                  </div>
                )}
              </div>
            )}

            {/* Explainer */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-900 mb-2">📊 What do these numbers mean?</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Context Window</strong> = Claude Opus has 200K tokens max. This shows how much of that is used in the current session.</p>
                <p><strong>Input tokens</strong> = what you send me (your messages, files, context)</p>
                <p><strong>Output tokens</strong> = what I generate (my responses, code, tool calls)</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                label="Total Tokens" 
                value={formatTokens(totalTokens)}
                subtext={`${formatTokens(usage.totalInput)} in / ${formatTokens(usage.totalOutput)} out`}
                tooltip="Combined input + output tokens processed"
                color="blue"
              />
              <StatCard 
                label="Est. Cost" 
                value={formatCost(usage.totalCost)}
                subtext="Based on API pricing"
                tooltip="What this would cost on pay-per-token API (you have Claude Max, so it's flat rate)"
                color="green"
              />
              <StatCard 
                label="Cache Tokens" 
                value={formatTokens(cacheTotal)}
                subtext={`${formatTokens(usage.totalCacheRead)} read / ${formatTokens(usage.totalCacheWrite)} write`}
                tooltip="Tokens saved by caching repeated context (system prompts, files)"
                color="purple"
              />
              <StatCard 
                label="Sessions" 
                value={usage.sessions.length.toString()}
                subtext="Active in period"
                tooltip="Separate conversations (Telegram, web, cron jobs, etc.)"
                color="amber"
              />
            </div>

            {/* Token Breakdown Bar - Period Totals */}
            {totalTokens > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-medium text-slate-700 mb-1">Period Token Breakdown</h3>
                <p className="text-xs text-slate-400 mb-3">Total tokens across all sessions in selected time range</p>
                <div className="h-4 rounded-full overflow-hidden bg-slate-100 flex">
                  <div 
                    className="bg-blue-500 transition-all" 
                    style={{ width: `${(usage.totalInput / totalTokens) * 100}%` }}
                    title={`Input: ${formatTokens(usage.totalInput)}`}
                  />
                  <div 
                    className="bg-orange-500 transition-all" 
                    style={{ width: `${(usage.totalOutput / totalTokens) * 100}%` }}
                    title={`Output: ${formatTokens(usage.totalOutput)}`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Input ({((usage.totalInput / totalTokens) * 100).toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Output ({((usage.totalOutput / totalTokens) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {/* Sessions List */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4">Usage by Session</h3>
              {usage.sessions.length > 0 ? (
                <div className="space-y-3">
                  {usage.sessions.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-mono text-slate-700 truncate block max-w-xs">
                            {s.sessionId.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-slate-400">{s.messageCount} messages</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-slate-900">{formatTokens(s.input + s.output)}</span>
                          <span className="text-xs text-slate-400 block">{formatTime(s.lastActivity)}</span>
                        </div>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
                        <div 
                          className="bg-blue-400" 
                          style={{ width: `${(s.input / (s.input + s.output)) * 100}%` }} 
                        />
                        <div 
                          className="bg-orange-400" 
                          style={{ width: `${(s.output / (s.input + s.output)) * 100}%` }} 
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                        <span>In: {formatTokens(s.input)}</span>
                        <span>Out: {formatTokens(s.output)}</span>
                        <span className="text-green-600">{formatCost(s.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">No usage data for this period</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">No usage data available</p>
            <p className="text-sm text-slate-400 mt-2">Session data will appear after AI interactions</p>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, subtext, tooltip, color }: { 
  label: string; value: string; subtext: string; tooltip?: string; color: 'blue' | 'green' | 'purple' | 'amber' 
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  }
  
  return (
    <div className={`rounded-xl border p-4 ${colors[color]} relative group`} title={tooltip}>
      <p className="text-xs font-medium opacity-70 mb-1 flex items-center gap-1">
        {label}
        {tooltip && <span className="text-[10px] opacity-50 cursor-help">ⓘ</span>}
      </p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-1">{subtext}</p>
    </div>
  )
}

function SubscriptionProgress({ totalCost }: { totalCost: number }) {
  const MAX_BUDGET = 200
  const BILLING_CYCLE_DAYS = 30
  
  // Calculate days into billing cycle (assuming starts on 1st of month)
  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - dayOfMonth
  
  // Calculate usage percentage and projections
  const usagePercent = (totalCost / MAX_BUDGET) * 100
  const dailyRate = dayOfMonth > 0 ? totalCost / dayOfMonth : 0
  const projectedTotal = dailyRate * daysInMonth
  const projectedPercent = (projectedTotal / MAX_BUDGET) * 100
  
  // Status colors
  const getStatusColor = (percent: number) => {
    if (percent > 90) return 'text-red-600 bg-red-50 border-red-200'
    if (percent > 70) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }
  
  const getBarColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500'
    if (percent > 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">💳 Monthly Budget</h3>
          <p className="text-slate-400 text-sm">Claude Max $200/month subscription</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
          <p className="text-slate-400 text-sm">of ${MAX_BUDGET}</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-4 rounded-full overflow-hidden bg-slate-700 mb-4">
        <div 
          className={`h-full transition-all ${getBarColor(usagePercent)}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-lg p-3 border ${getStatusColor(usagePercent)}`}>
          <p className="text-xs opacity-70 mb-1">Used</p>
          <p className="text-xl font-bold">{usagePercent.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg p-3 bg-slate-700/50 border border-slate-600">
          <p className="text-xs text-slate-400 mb-1">Days Left</p>
          <p className="text-xl font-bold text-white">{daysRemaining}</p>
        </div>
        <div className={`rounded-lg p-3 border ${getStatusColor(projectedPercent)}`}>
          <p className="text-xs opacity-70 mb-1">Projected</p>
          <p className="text-xl font-bold">${projectedTotal.toFixed(0)}</p>
        </div>
      </div>
      
      {/* Warning if over budget projection */}
      {projectedPercent > 100 && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-sm">
          ⚠️ At current rate, you'll hit ${projectedTotal.toFixed(0)} by month end ({projectedPercent.toFixed(0)}% of budget)
        </div>
      )}
      
      {/* Daily rate */}
      <div className="mt-4 text-xs text-slate-400 flex justify-between">
        <span>Daily avg: ${dailyRate.toFixed(2)}/day</span>
        <span>Day {dayOfMonth} of {daysInMonth}</span>
      </div>
    </div>
  )
}
