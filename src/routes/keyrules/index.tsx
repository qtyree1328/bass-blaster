import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/keyrules/')({
  component: KeyRulesPage,
})

interface DocFile {
  name: string
  path: string
  content: string
  description: string
}

function KeyRulesPage() {
  const [docs, setDocs] = useState<DocFile[]>([])
  const [activeDoc, setActiveDoc] = useState<string>('CODE_PRINCIPLES.md')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/keyrules')
      .then(r => r.ok ? r.json() : { docs: [] })
      .then(data => {
        setDocs(data.docs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentDoc = docs.find(d => d.name === activeDoc)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📜</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Key Rules</h1>
              <p className="text-xs text-slate-500">My operating instructions & principles</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back to Hub
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading documentation...</div>
        ) : docs.length > 0 ? (
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-24">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Documents</h3>
                <nav className="space-y-1">
                  {docs.map(doc => (
                    <button
                      key={doc.name}
                      onClick={() => setActiveDoc(doc.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeDoc === doc.name 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-xs text-slate-400 truncate">{doc.description}</div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {currentDoc ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{currentDoc.name}</h2>
                      <p className="text-sm text-slate-500">{currentDoc.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{currentDoc.path}</span>
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <MarkdownContent content={currentDoc.content} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">Select a document</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-2">No documentation found</p>
            <p className="text-sm text-slate-400">Expected files in ~/clawd/</p>
          </div>
        )}
      </main>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let inCodeBlock = false
  let codeContent: string[] = []
  let codeLanguage = ''

  lines.forEach((line, i) => {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
            <code>{codeContent.join('\n')}</code>
          </pre>
        )
        codeContent = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
        codeLanguage = line.slice(3)
      }
      return
    }

    if (inCodeBlock) {
      codeContent.push(line)
      return
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{line.slice(2)}</h1>)
      return
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-semibold text-slate-900 mt-6 mb-3">{line.slice(3)}</h2>)
      return
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-medium text-slate-900 mt-5 mb-2">{line.slice(4)}</h3>)
      return
    }

    // Horizontal rule
    if (line.match(/^-{3,}$/)) {
      elements.push(<hr key={i} className="my-6 border-slate-200" />)
      return
    }

    // List items
    if (line.match(/^[-*]\s/)) {
      const text = line.slice(2)
      elements.push(
        <li key={i} className="text-slate-700 ml-4 list-disc">
          <InlineMarkdown text={text} />
        </li>
      )
      return
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, '')
      elements.push(
        <li key={i} className="text-slate-700 ml-4 list-decimal">
          <InlineMarkdown text={text} />
        </li>
      )
      return
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-4" />)
      return
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-slate-700 leading-relaxed">
        <InlineMarkdown text={line} />
      </p>
    )
  })

  return <>{elements}</>
}

function InlineMarkdown({ text }: { text: string }) {
  // Bold
  let result = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
  // Italic
  result = result.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  // Inline code
  result = result.replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">$1</code>')
  // Links
  result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener">$1</a>')
  
  return <span dangerouslySetInnerHTML={{ __html: result }} />
}
