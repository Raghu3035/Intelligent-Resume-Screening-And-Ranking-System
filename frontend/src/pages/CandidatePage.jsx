// src/pages/CandidatePage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Mail, Phone, GraduationCap, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getCandidate } from '../services/api'
import ResumePreview from '../components/ResumePreview'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

function ScoreGauge({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const r = 70, circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={168} height={168} viewBox="0 0 168 168" className="-rotate-90">
        <circle cx={84} cy={84} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx={84} cy={84} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: '52px' }}>
        <span className="text-3xl font-extrabold" style={{ color }}>{score.toFixed(1)}%</span>
        <span className="text-xs text-slate-500">Match Score</span>
      </div>
    </div>
  )
}

export default function CandidatePage() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview') // 'overview' | 'preview'

  useEffect(() => {
    getCandidate(id).then(setCandidate).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  )

  if (!candidate) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-slate-500">Candidate not found.</p>
      <Link to="/dashboard" className="btn-primary px-4 py-2 text-sm">← Back to Dashboard</Link>
    </div>
  )

  const { name, email, phone, education, experience, skills = [],
          match_score = 0, skill_score = 0, experience_score = 0,
          bert_score = 0, tfidf_score = 0,
          matched_skills = [], missing_skills = [], raw_text, rank, filename } = candidate

  const radarData = [
    { subject: 'Skills', value: skill_score },
    { subject: 'Experience', value: experience_score },
    { subject: 'TF-IDF', value: tfidf_score },
    { subject: 'BERT', value: bert_score },
    { subject: 'Overall', value: match_score },
  ]

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-4">
          {/* Profile card */}
          <div className="glass-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <span className="text-2xl font-bold text-white">{name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{name}</h2>
              {rank > 0 && <p className="text-sm text-indigo-400 font-semibold mt-1">Rank #{rank}</p>}
              <p className="text-xs text-slate-600 mt-1 truncate">{filename}</p>
            </div>
            <div className="space-y-2 text-left pt-2 border-t border-slate-800">
              {email && <p className="flex items-center gap-2 text-sm text-slate-400"><Mail size={13} className="text-indigo-400" />{email}</p>}
              {phone && <p className="flex items-center gap-2 text-sm text-slate-400"><Phone size={13} className="text-indigo-400" />{phone}</p>}
              {education && <p className="flex items-center gap-2 text-sm text-slate-400"><GraduationCap size={13} className="text-indigo-400" />{education}</p>}
              {experience > 0 && <p className="flex items-center gap-2 text-sm text-slate-400"><Clock size={13} className="text-indigo-400" />{experience} years experience</p>}
            </div>
          </div>

          {/* Score gauge */}
          <div className="glass-card p-6 flex flex-col items-center">
            <div className="relative">
              <ScoreGauge score={match_score} />
            </div>
            <div className="w-full mt-4 space-y-2">
              {[['Skill Match', skill_score, '#6366f1'], ['Experience', experience_score, '#8b5cf6']].map(([label, val, color]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
                  <div className="progress-bar flex-1">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 1, ease: [0.4,0,0.2,1] }}
                      className="progress-fill" style={{ background: color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color }}>{val?.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Radar chart */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-slate-400 mb-3">Score Breakdown</p>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Tooltip formatter={v => `${v?.toFixed(1)}%`} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['overview', 'preview'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={{ background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t ? '#a5b4fc' : '#64748b' }}>
                {t === 'overview' ? '📋 Overview' : '📄 Resume Preview'}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              {/* Matched skills */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={15} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Matched Skills ({matched_skills.length})</h3>
                </div>
                {matched_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matched_skills.map(s => <span key={s} className="skill-badge skill-matched">{s}</span>)}
                  </div>
                ) : <p className="text-sm text-slate-600">No skills matched the job description.</p>}
              </div>

              {/* Missing skills */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={15} className="text-red-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Missing Skills ({missing_skills.length})</h3>
                </div>
                {missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missing_skills.map(s => <span key={s} className="skill-badge skill-missing">{s}</span>)}
                  </div>
                ) : <p className="text-sm text-emerald-500 font-medium">✓ Candidate has all required skills!</p>}
              </div>

              {/* All resume skills */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">All Extracted Skills ({skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => <span key={s} className="skill-badge skill-neutral">{s}</span>)}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Resume Text (with highlights)</h3>
              <ResumePreview rawText={raw_text} matchedSkills={matched_skills} missingSkills={missing_skills} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
