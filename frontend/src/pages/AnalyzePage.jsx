// src/pages/AnalyzePage.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, Play, Loader2, ArrowRight, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import JobDescription from '../components/JobDescription'
import { analyzeResumes } from '../services/api'

export default function AnalyzePage() {
  const [jobDesc, setJobDesc] = useState('')
  const [minExp, setMinExp] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const handleAnalyze = async () => {
    if (!jobDesc.trim()) { toast.error('Please enter a job description.'); return }
    setLoading(true)
    try {
      const data = await analyzeResumes({ job_description: jobDesc, min_experience: minExp })
      setResult(data)
      toast.success(`Ranked ${data.total_candidates} candidate(s)!`)
    } catch (e) {
      // error toasted by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))' }}>
            <Brain size={18} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Analyze Resumes</h1>
        </div>
        <p className="text-slate-500 text-sm">Describe the role and run AI matching against all uploaded resumes.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-7 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Job Description *</label>
          <JobDescription value={jobDesc} onChange={setJobDesc} minExperience={minExp} onMinExpChange={setMinExp} />
        </div>

        <motion.button
          onClick={handleAnalyze}
          disabled={loading || !jobDesc.trim()}
          whileHover={{ scale: !loading && jobDesc.trim() ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
            : <><Zap size={18} /> Run AI Matching</>}
        </motion.button>
      </motion.div>

      {/* Result summary */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Play size={16} fill="currentColor" />
            <span className="font-semibold">Analysis Complete</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Candidates', value: result.total_candidates },
              { label: 'Top Score', value: `${result.top_candidate?.match_score?.toFixed(1) || 0}%` },
              { label: 'Skills Found', value: result.job_skills?.length || 0 },
            ].map(s => (
              <div key={s.label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xl font-bold gradient-text">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {result.job_skills?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Extracted job skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.job_skills.slice(0, 15).map(s => (
                  <span key={s} className="skill-badge skill-neutral">{s}</span>
                ))}
                {result.job_skills.length > 15 && (
                  <span className="text-xs text-slate-600">+{result.job_skills.length - 15} more</span>
                )}
              </div>
            </div>
          )}

          <motion.button
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            View Full Rankings <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
