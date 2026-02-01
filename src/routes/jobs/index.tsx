import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

interface Job {
  id: string
  company: string
  title: string
  url: string
  description?: string
  matchScore: number
  matchReasons?: string[]
  tone?: string
  discovered: string
  status: 'found' | 'to_apply' | 'submitted' | 'rejected'
  appliedDate?: string
  rejectedDate?: string
  rejectCategory?: string
  rejectReason?: string
  notes?: string
}

interface Company {
  id: string
  name: string
  ranking: number
  sector: string
  description?: string
  jobPortal: string
  favicon?: string
}

type TabType = 'found' | 'to_apply' | 'submitted' | 'companies' | 'trends'

interface SkillTrend {
  id: string
  skill: string
  category: 'technical' | 'tool' | 'method' | 'domain' | 'soft'
  frequency: number
  trend: 'rising' | 'stable' | 'declining'
  inResume: boolean
  inPortfolio: boolean
  priority: 'high' | 'medium' | 'low'
  recommendation?: string
  projectIdea?: string
}

interface MarketInsight {
  id: string
  type: 'observation' | 'opportunity' | 'warning' | 'recommendation'
  title: string
  description: string
  actionable: boolean
  action?: string
  dismissed: boolean
}

export const Route = createFileRoute('/jobs/')({
  component: JobsPage,
})

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('found')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [coverLetter, setCoverLetter] = useState<string | null>(null)
  const [coverLetterLoading, setCoverLetterLoading] = useState(false)
  const [editingLetter, setEditingLetter] = useState(false)
  const [editedLetter, setEditedLetter] = useState('')
  const [trends, setTrends] = useState<{ skills: SkillTrend[], insights: MarketInsight[], resumeGaps: string[], portfolioGaps: string[], lastScan: string }>({ skills: [], insights: [], resumeGaps: [], portfolioGaps: [], lastScan: '' })
  const [trendsStats, setTrendsStats] = useState({ totalSkills: 0, gapsCount: 0, risingSkills: 0, activeInsights: 0 })

  const loadData = useCallback(async () => {
    try {
      const [jobsRes, companiesRes, trendsRes] = await Promise.all([
        fetch('/api/jobs/queue'),
        fetch('/api/jobs/companies'),
        fetch('/api/jobs/trends')
      ])
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        // Migrate old status values
        const migratedJobs = (data.jobs || []).map((j: Job) => ({
          ...j,
          status: j.status === 'pending' ? 'found' 
            : j.status === 'applied' ? 'submitted' 
            : j.status === 'approved' ? 'to_apply'
            : j.status
        }))
        setJobs(migratedJobs)
      }
      if (companiesRes.ok) {
        const data = await companiesRes.json()
        setCompanies(data.companies || [])
      }
      if (trendsRes.ok) {
        const data = await trendsRes.json()
        setTrends({ skills: data.skills || [], insights: data.insights || [], resumeGaps: data.resumeGaps || [], portfolioGaps: data.portfolioGaps || [], lastScan: data.lastScan || '' })
        setTrendsStats(data.stats || { totalSkills: 0, gapsCount: 0, risingSkills: 0, activeInsights: 0 })
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadCoverLetter = async (jobId: string) => {
    setCoverLetterLoading(true)
    setCoverLetter(null)
    try {
      const res = await fetch(`/api/jobs/cover-letter?id=${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setCoverLetter(data.content || null)
        setEditedLetter(data.content || '')
      }
    } catch {}
    setCoverLetterLoading(false)
  }

  const selectJob = (job: Job) => {
    setSelectedJob(job)
    setEditingLetter(false)
    if (job.status === 'to_apply' || job.status === 'submitted') {
      loadCoverLetter(job.id)
    } else {
      setCoverLetter(null)
    }
  }

  const moveToApply = async (job: Job, feedback?: string) => {
    // Update status with feedback
    const updated = jobs.map(j => j.id === job.id ? { ...j, status: 'to_apply' as const, notes: feedback || j.notes } : j)
    setJobs(updated)
    setSelectedJob({ ...job, status: 'to_apply', notes: feedback || job.notes })
    setJobFeedback('')  // Clear feedback
    
    // Save to backend
    await fetch('/api/jobs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated })
    })
    
    // Trigger cover letter generation
    setCoverLetterLoading(true)
    setCoverLetter(null)
    try {
      const res = await fetch(`/api/jobs/generate-cover-letter?id=${job.id}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setCoverLetter(data.content)
        setEditedLetter(data.content || '')
      }
    } catch {}
    setCoverLetterLoading(false)
  }

  const markSubmitted = async (job: Job) => {
    const updated = jobs.map(j => j.id === job.id ? { ...j, status: 'submitted' as const, appliedDate: new Date().toISOString().split('T')[0] } : j)
    setJobs(updated)
    setSelectedJob({ ...job, status: 'submitted' })
    
    await fetch('/api/jobs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated })
    })
  }

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectCategory, setRejectCategory] = useState('')
  const [jobToReject, setJobToReject] = useState<Job | null>(null)
  const [jobFeedback, setJobFeedback] = useState('')  // Simple feedback for accept/reject

  const openRejectModal = (job: Job) => {
    setJobToReject(job)
    setRejectReason('')
    setRejectCategory('')
    setShowRejectModal(true)
  }

  const confirmReject = async () => {
    if (!jobToReject) return
    
    const updated = jobs.map(j => j.id === jobToReject.id ? { 
      ...j, 
      status: 'rejected' as const,
      rejectCategory,
      rejectReason,
      rejectedDate: new Date().toISOString().split('T')[0]
    } : j)
    setJobs(updated)
    setSelectedJob(null)
    setShowRejectModal(false)
    setJobToReject(null)
    
    await fetch('/api/jobs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated })
    })
  }

  // Simple reject with inline feedback (matches daily builds pattern)
  const rejectJob = async (job: Job, feedback?: string) => {
    const updated = jobs.map(j => j.id === job.id ? { 
      ...j, 
      status: 'rejected' as const,
      rejectReason: feedback,
      rejectedDate: new Date().toISOString().split('T')[0]
    } : j)
    setJobs(updated)
    setSelectedJob(null)
    setJobFeedback('')
    
    await fetch('/api/jobs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: updated })
    })
  }

  const saveCoverLetter = async () => {
    if (!selectedJob) return
    await fetch('/api/jobs/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedJob.id, content: editedLetter })
    })
    setCoverLetter(editedLetter)
    setEditingLetter(false)
  }

  const getFavicon = (company: string) => {
    const c = companies.find(co => co.name.toLowerCase() === company.toLowerCase())
    if (c?.jobPortal) {
      try {
        const domain = new URL(c.jobPortal).hostname
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      } catch {}
    }
    return null
  }

  // Filter jobs by tab
  const foundJobs = jobs.filter(j => j.status === 'found').sort((a, b) => b.matchScore - a.matchScore)
  const toApplyJobs = jobs.filter(j => j.status === 'to_apply').sort((a, b) => b.matchScore - a.matchScore)
  const submittedJobs = jobs.filter(j => j.status === 'submitted').sort((a, b) => 
    new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime()
  )

  const currentJobs = activeTab === 'found' ? foundJobs : activeTab === 'to_apply' ? toApplyJobs : submittedJobs

  const scoreColor = (s: number) => {
    if (s >= 8) return 'bg-emerald-500 text-white'
    if (s >= 6) return 'bg-amber-500 text-white'
    return 'bg-slate-400 text-white'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Job Hunter</h1>
              <p className="text-xs text-slate-500">
                {foundJobs.length} found · {toApplyJobs.length} to apply · {submittedJobs.length} submitted
              </p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">← Hub</Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: 'found' as const, label: 'Jobs Found', count: foundJobs.length, color: 'blue' },
              { id: 'to_apply' as const, label: 'To Apply', count: toApplyJobs.length, color: 'amber' },
              { id: 'submitted' as const, label: 'Submitted', count: submittedJobs.length, color: 'emerald' },
              { id: 'companies' as const, label: 'Companies', count: companies.length, color: 'purple' },
              { id: 'trends' as const, label: 'Trends', count: trendsStats.gapsCount, color: 'rose' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedJob(null) }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
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
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : activeTab === 'companies' ? (
          <CompanyGraph companies={companies} jobs={jobs} />
        ) : activeTab === 'trends' ? (
          <TrendsView trends={trends} stats={trendsStats} onRefresh={loadData} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job List */}
            <div className="lg:col-span-1 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              {currentJobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => selectJob(job)}
                  className={`p-4 rounded-xl cursor-pointer border transition ${
                    selectedJob?.id === job.id 
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getFavicon(job.company) && (
                      <img 
                        src={getFavicon(job.company)!} 
                        alt="" 
                        className="w-6 h-6 rounded mt-0.5"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-900 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
                      {job.status === 'submitted' && job.appliedDate && (
                        <p className="text-xs text-emerald-600 mt-1">Applied {job.appliedDate}</p>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${scoreColor(job.matchScore)} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {job.matchScore}
                    </div>
                  </div>
                </div>
              ))}
              {currentJobs.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-sm">
                    {activeTab === 'found' ? 'No new jobs found' : 
                     activeTab === 'to_apply' ? 'No jobs in your apply queue' : 
                     'No submitted applications'}
                  </p>
                </div>
              )}
            </div>

            {/* Job Detail */}
            <div className="lg:col-span-2">
              {selectedJob ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        {getFavicon(selectedJob.company) && (
                          <img 
                            src={getFavicon(selectedJob.company)!} 
                            alt="" 
                            className="w-10 h-10 rounded"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        )}
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">{selectedJob.title}</h2>
                          <p className="text-blue-600 font-medium">{selectedJob.company}</p>
                          <p className="text-xs text-slate-400 mt-1">Discovered {selectedJob.discovered}</p>
                        </div>
                      </div>
                      <div className={`w-14 h-14 rounded-xl ${scoreColor(selectedJob.matchScore)} flex items-center justify-center text-xl font-bold`}>
                        {selectedJob.matchScore}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 mt-4 flex-wrap">
                      <a
                        href={selectedJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                      >
                        View Posting →
                      </a>
                      
                      {selectedJob.status === 'found' && (
                        <div className="flex flex-col gap-3 w-full">
                          <textarea
                            value={jobFeedback}
                            onChange={(e) => setJobFeedback(e.target.value)}
                            placeholder="Feedback (optional) — submitted with your choice"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveToApply(selectedJob, jobFeedback)}
                              className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition"
                            >
                              ✓ Accept → Generate Cover Letter
                            </button>
                            <button
                              onClick={() => rejectJob(selectedJob, jobFeedback)}
                              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {selectedJob.status === 'to_apply' && (
                        <button
                          onClick={() => markSubmitted(selectedJob)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition"
                        >
                          Mark as Submitted ✓
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Match Reasons */}
                  {selectedJob.matchReasons && selectedJob.matchReasons.length > 0 && (
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-sm font-medium text-slate-700 mb-3">Why This Matches</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.matchReasons.map((r, i) => (
                          <span key={i} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedJob.description && (
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                    </div>
                  )}

                  {/* Tone */}
                  {selectedJob.tone && (
                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs text-slate-500">Letter Tone: </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        selectedJob.tone === 'missionary' ? 'bg-green-100 text-green-700' :
                        selectedJob.tone === 'mercenary' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {selectedJob.tone}
                      </span>
                    </div>
                  )}

                  {/* Cover Letter (only for to_apply and submitted) */}
                  {(selectedJob.status === 'to_apply' || selectedJob.status === 'submitted') && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Cover Letter</h3>
                        {selectedJob.status === 'to_apply' && !editingLetter && coverLetter && (
                          <button
                            onClick={() => setEditingLetter(true)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      
                      {coverLetterLoading ? (
                        <div className="text-sm text-slate-400 py-8 text-center">
                          Generating cover letter...
                        </div>
                      ) : editingLetter ? (
                        <div>
                          <textarea
                            value={editedLetter}
                            onChange={(e) => setEditedLetter(e.target.value)}
                            className="w-full h-80 p-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={saveCoverLetter}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => { setEditingLetter(false); setEditedLetter(coverLetter || '') }}
                              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : coverLetter ? (
                        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-80 overflow-y-auto">
                          {coverLetter}
                        </pre>
                      ) : (
                        <p className="text-sm text-slate-400 py-4 text-center">No cover letter yet</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <p className="text-slate-400">Select a job to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Rejection Feedback Modal */}
        {showRejectModal && jobToReject && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Why not interested?</h3>
              <p className="text-sm text-slate-500 mb-4">
                This feedback helps improve future job matching for <strong>{jobToReject.company}</strong>.
              </p>
              
              <div className="space-y-2 mb-4">
                {[
                  { id: 'not-real', label: '🚫 Not a real job listing', desc: 'Placeholder, "Various Positions", or general interest form' },
                  { id: 'no-jobs', label: '📭 No jobs actually available', desc: 'Careers page exists but no open positions' },
                  { id: 'not-relevant', label: '🎯 Role not relevant to my skills', desc: 'Wrong domain, seniority, or specialization' },
                  { id: 'company-mismatch', label: '🏢 Company/industry not a fit', desc: 'Not interested in this type of org' },
                  { id: 'location', label: '📍 Location or remote issues', desc: 'Can\'t work there or not actually remote' },
                  { id: 'already-applied', label: '✅ Already applied', desc: 'Applied through another channel' },
                  { id: 'other', label: '💬 Other reason', desc: 'Explain below' },
                ].map(opt => (
                  <label 
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      rejectCategory === opt.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectCategory"
                      value={opt.id}
                      checked={rejectCategory === opt.id}
                      onChange={(e) => setRejectCategory(e.target.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Any specific details that would help improve matching..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setJobToReject(null) }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!rejectCategory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Job
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Company Graph Component
function CompanyGraph({ companies, jobs }: { companies: Company[]; jobs: Job[] }) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  
  // Group companies by sector
  const sectors = [...new Set(companies.map(c => c.sector || 'Other'))].sort()
  
  const filteredCompanies = selectedSector 
    ? companies.filter(c => (c.sector || 'Other') === selectedSector)
    : companies

  const getJobCount = (companyName: string) => 
    jobs.filter(j => j.company.toLowerCase() === companyName.toLowerCase() && j.status !== 'rejected').length

  const sectorColors: Record<string, string> = {
    'Conservation Tech': 'bg-emerald-100 border-emerald-300 text-emerald-800',
    'Conservation Non-profit': 'bg-green-100 border-green-300 text-green-800',
    'AI-Powered Geospatial Monitoring': 'bg-blue-100 border-blue-300 text-blue-800',
    'Government': 'bg-slate-100 border-slate-300 text-slate-800',
    'Defense/GEOINT': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'Other': 'bg-gray-100 border-gray-300 text-gray-800',
  }

  const getSectorColor = (sector: string) => {
    for (const [key, value] of Object.entries(sectorColors)) {
      if (sector.toLowerCase().includes(key.toLowerCase())) return value
    }
    return sectorColors['Other']
  }

  return (
    <div>
      {/* Sector Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSector(null)}
          className={`px-3 py-1.5 text-sm rounded-full transition ${
            !selectedSector ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All ({companies.length})
        </button>
        {sectors.map(sector => {
          const count = companies.filter(c => (c.sector || 'Other') === sector).length
          return (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1.5 text-sm rounded-full transition ${
                selectedSector === sector ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {sector} ({count})
            </button>
          )
        })}
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCompanies.sort((a, b) => b.ranking - a.ranking).map(company => {
          const jobCount = getJobCount(company.name)
          
          // Safely get favicon URL
          let favicon = null
          if (company.jobPortal && company.jobPortal.trim()) {
            try {
              const domain = new URL(company.jobPortal).hostname
              favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
            } catch {
              // Invalid URL, skip favicon
            }
          }
          
          return (
            <a
              key={company.id}
              href={company.jobPortal || '#'}
              target={company.jobPortal ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`p-4 rounded-xl border-2 transition hover:shadow-md ${getSectorColor(company.sector || 'Other')}`}
            >
              <div className="flex items-start gap-3">
                {favicon && (
                  <img 
                    src={favicon} 
                    alt="" 
                    className="w-8 h-8 rounded"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{company.name}</h3>
                  <p className="text-xs opacity-70 truncate">{company.sector}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs opacity-60">Priority: {company.ranking}/10</span>
                {jobCount > 0 && (
                  <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                    {jobCount} job{jobCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// Trends View Component
function TrendsView({ trends, stats, onRefresh }: { 
  trends: { skills: SkillTrend[], insights: MarketInsight[], resumeGaps: string[], portfolioGaps: string[], lastScan: string }
  stats: { totalSkills: number, gapsCount: number, risingSkills: number, activeInsights: number }
  onRefresh: () => void 
}) {
  const dismissInsight = async (id: string) => {
    await fetch('/api/jobs/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss-insight', id })
    })
    onRefresh()
  }

  const categoryColors: Record<string, string> = {
    technical: 'bg-blue-100 text-blue-700',
    tool: 'bg-purple-100 text-purple-700',
    method: 'bg-emerald-100 text-emerald-700',
    domain: 'bg-amber-100 text-amber-700',
    soft: 'bg-pink-100 text-pink-700',
  }

  const priorityColors: Record<string, string> = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-slate-300 bg-slate-50',
  }

  const trendIcons: Record<string, string> = {
    rising: '📈',
    stable: '➡️',
    declining: '📉',
  }

  const insightTypeColors: Record<string, string> = {
    observation: 'bg-slate-100 border-slate-200',
    opportunity: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    recommendation: 'bg-blue-50 border-blue-200',
  }

  const activeInsights = trends.insights.filter(i => !i.dismissed)
  const skillGaps = trends.skills.filter(s => !s.inResume && s.priority !== 'low')

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-900">{stats.totalSkills}</p>
          <p className="text-xs text-slate-500">Skills Tracked</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <p className="text-2xl font-bold text-rose-600">{stats.gapsCount}</p>
          <p className="text-xs text-rose-600">Resume Gaps</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.risingSkills}</p>
          <p className="text-xs text-emerald-600">Rising Skills</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{activeInsights.length}</p>
          <p className="text-xs text-blue-600">Active Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills & Gaps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Skills in Demand</h2>
          
          {trends.skills.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-slate-500">No skill trends yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Trends are populated during job scans and morning briefings
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {trends.skills.map(skill => (
                <div 
                  key={skill.id}
                  className={`border-l-4 rounded-r-lg p-4 ${priorityColors[skill.priority]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{skill.skill}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[skill.category]}`}>
                          {skill.category}
                        </span>
                        <span className="text-sm">{trendIcons[skill.trend]}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{skill.frequency}% of postings</span>
                        {skill.inResume ? (
                          <span className="text-emerald-600">✓ In resume</span>
                        ) : (
                          <span className="text-rose-600">✗ Not in resume</span>
                        )}
                        {skill.inPortfolio && (
                          <span className="text-blue-600">✓ In portfolio</span>
                        )}
                      </div>
                      {skill.recommendation && (
                        <p className="text-sm text-slate-600 mt-2 bg-white/50 rounded p-2">
                          💡 {skill.recommendation}
                        </p>
                      )}
                      {skill.projectIdea && (
                        <p className="text-sm text-blue-700 mt-1">
                          🚀 Project idea: {skill.projectIdea}
                        </p>
                      )}
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      skill.priority === 'high' ? 'bg-red-100 text-red-700' :
                      skill.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {skill.priority}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Market Insights</h2>
          
          {activeInsights.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <span className="text-4xl mb-3 block">💡</span>
              <p className="text-slate-500">No active insights</p>
              <p className="text-xs text-slate-400 mt-1">
                Insights are generated during industry monitoring
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeInsights.map(insight => (
                <div 
                  key={insight.id}
                  className={`rounded-xl border p-4 ${insightTypeColors[insight.type]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {insight.type === 'opportunity' ? '🎯' : 
                           insight.type === 'warning' ? '⚠️' : 
                           insight.type === 'recommendation' ? '💡' : '📋'}
                        </span>
                        <h3 className="font-medium text-slate-900">{insight.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600">{insight.description}</p>
                      {insight.actionable && insight.action && (
                        <p className="text-sm text-blue-700 mt-2 font-medium">
                          → {insight.action}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last Scan Info */}
      {trends.lastScan && (
        <p className="text-xs text-slate-400 text-center">
          Last updated: {new Date(trends.lastScan).toLocaleString()}
        </p>
      )}
    </div>
  )
}
