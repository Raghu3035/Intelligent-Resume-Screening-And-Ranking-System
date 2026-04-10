// src/pages/UploadPage.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Upload, Brain, BarChart2 } from 'lucide-react'
import UploadResume from '../components/UploadResume'
import toast from 'react-hot-toast'

const steps = [
  { icon: Upload,    label: '1. Upload Resumes',  desc: 'PDF, DOCX or TXT files' },
  { icon: Brain,     label: '2. Add Job Details', desc: 'Describe the role & skills' },
  { icon: BarChart2, label: '3. View Rankings',   desc: 'AI-ranked candidate list' },
]

export default function UploadPage() {
  const [uploadedCount, setUploadedCount] = useState(0)
  const navigate = useNavigate()

  const handleUploaded = (results) => {
    setUploadedCount(c => c + results.length)
  }

  return (
    <div className="min-h-screen px-4 py-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-4"
             style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          <Sparkles size={12} /> AI-Powered Resume Screening
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span className="gradient-text">Screen Resumes</span>
          <br />
          <span className="text-slate-300">10× Faster</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Upload resumes, describe the role, and let AI rank candidates by match score instantly.
        </p>
      </motion.div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-10 max-w-xl mx-auto">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center gap-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <s.icon size={16} className="text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-slate-300 whitespace-nowrap">{s.label}</p>
              <p className="text-xs text-slate-600">{s.desc}</p>
            </motion.div>
            {i < steps.length - 1 && <ArrowRight size={14} className="text-slate-700 shrink-0 mt-[-12px]" />}
          </React.Fragment>
        ))}
      </div>

      {/* Upload Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card p-8 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Upload size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-200">Upload Resumes</h2>
        </div>
        <UploadResume onUploaded={handleUploaded} />

        {uploadedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                 style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-sm text-emerald-400 font-medium">✓ {uploadedCount} resume{uploadedCount > 1 ? 's' : ''} ready</p>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/analyze')}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
              >
                Analyze Now <ArrowRight size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
