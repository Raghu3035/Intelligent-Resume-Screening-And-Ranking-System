// src/components/ResumePreview.jsx
import React, { useMemo } from 'react'
import { FileText } from 'lucide-react'

function highlightText(text, skills) {
  if (!skills || skills.length === 0) return text

  // Build regex from skills (longest first to avoid partial matches)
  const sorted = [...skills].sort((a, b) => b.length - a.length)
  const escaped = sorted.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (skills.some(s => s.toLowerCase() === part.toLowerCase())) {
      return (
        <mark key={i} style={{
          background: 'rgba(99,102,241,0.25)',
          color: '#a5b4fc',
          borderRadius: '3px',
          padding: '0 2px',
          fontWeight: 600,
        }}>{part}</mark>
      )
    }
    return part
  })
}

export default function ResumePreview({ rawText, matchedSkills = [], missingSkills = [] }) {
  const allHighlightSkills = [...matchedSkills, ...missingSkills]

  const highlighted = useMemo(() => {
    if (!rawText) return null
    return highlightText(rawText, allHighlightSkills)
  }, [rawText, allHighlightSkills])

  if (!rawText) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
        <FileText size={32} className="mb-2" />
        <p className="text-sm">No resume text available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)' }} />
        <span>Highlighted: matched &amp; missing skills</span>
      </div>
      <div
        className="font-mono text-xs text-slate-400 leading-relaxed whitespace-pre-wrap overflow-auto max-h-96 px-4 py-4 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {highlighted}
      </div>
    </div>
  )
}
