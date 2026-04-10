// src/components/JobDescription.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

const TEMPLATES = [
  {
    label: 'Full-Stack Developer',
    text: 'Looking for a Full-Stack Developer with 3+ years of experience. Must have strong skills in React, Node.js, Python, and SQL. Experience with Docker, AWS, and REST API design is required. Knowledge of MongoDB and Redis is a plus.',
  },
  {
    label: 'Data Scientist',
    text: 'Seeking a Data Scientist with 2+ years experience in machine learning and data analysis. Required: Python, pandas, scikit-learn, TensorFlow or PyTorch, SQL. Experience with NLP, deep learning, and Tableau or Power BI preferred.',
  },
  {
    label: 'Backend Engineer',
    text: 'Looking for a Backend Engineer proficient in Python or Java with 4+ years of experience. Skills required: Django or FastAPI, PostgreSQL, Redis, Docker, Kubernetes, CI/CD, microservices architecture.',
  },
  {
    label: 'Frontend Developer',
    text: 'Frontend Developer with 2+ years experience needed. Must know React, TypeScript, TailwindCSS, and REST APIs. Experience with Next.js, GraphQL, and Webpack is highly desirable.',
  },
  {
    label: 'DevOps Engineer',
    text: 'DevOps Engineer with 3+ years experience. Skills: AWS or Azure, Docker, Kubernetes, Terraform, Jenkins or GitHub Actions, Linux, monitoring with Prometheus/Grafana, strong scripting skills.',
  },
]

export default function JobDescription({ value, onChange, minExperience, onMinExpChange }) {
  const [showTemplates, setShowTemplates] = useState(false)
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Templates toggle */}
      <div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Sparkles size={14} />
          Use a template
          {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => { onChange(t.text); setShowTemplates(false) }}
                className="text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-all"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={12} className="text-indigo-400" />
                  {t.label}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Looking for a Python developer with 3+ years of experience in machine learning, SQL, and REST APIs…"
          rows={6}
          className="input-glass w-full px-4 py-3 text-sm text-slate-200 placeholder-slate-500 resize-none"
          style={{ lineHeight: '1.7' }}
        />
        <div className="absolute bottom-3 right-3 text-xs text-slate-600">{wordCount} words</div>
      </div>

      {/* Min experience */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400 whitespace-nowrap">Min. experience</label>
        <input
          type="number"
          min={0}
          max={30}
          step={0.5}
          value={minExperience}
          onChange={(e) => onMinExpChange(parseFloat(e.target.value) || 0)}
          className="input-glass w-24 px-3 py-2 text-sm text-center text-slate-200"
        />
        <span className="text-sm text-slate-500">years</span>
        <span className="text-xs text-slate-600">(0 = any)</span>
      </div>
    </div>
  )
}
