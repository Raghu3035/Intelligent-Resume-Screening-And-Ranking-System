// src/components/CandidateCard.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { User, Clock, GraduationCap, ChevronRight, Trash2 } from 'lucide-react'

function ScoreRing({ score, size = 56 }) {
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score.toFixed(0)}%</span>
    </div>
  )
}

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n'
  return <div className={`rank-badge ${cls}`}>#{rank}</div>
}

export default function CandidateCard({ candidate, index, onDelete }) {
  const { id, name, match_score = 0, skill_score = 0, experience_score = 0,
          matched_skills = [], missing_skills = [], skills = [],
          experience = 0, education, rank = index + 1, filename } = candidate

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-card glass-card-hover p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <RankBadge rank={rank} />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{name}</h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">{filename}</p>
          </div>
        </div>
        <ScoreRing score={match_score} />
      </div>

      {/* Score bars */}
      <div className="space-y-2">
        <ScoreBar label="Skills" value={skill_score} color="#6366f1" />
        <ScoreBar label="Experience" value={experience_score} color="#8b5cf6" />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {experience > 0 && (
          <span className="flex items-center gap-1"><Clock size={11} />{experience}y exp</span>
        )}
        {education && (
          <span className="flex items-center gap-1"><GraduationCap size={11} />{education}</span>
        )}
        <span className="flex items-center gap-1"><User size={11} />{skills.length} skills</span>
      </div>

      {/* Skills preview */}
      {matched_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matched_skills.slice(0, 5).map(s => (
            <span key={s} className="skill-badge skill-matched">{s}</span>
          ))}
          {matched_skills.length > 5 && (
            <span className="skill-badge skill-neutral">+{matched_skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Missing skills */}
      {missing_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {missing_skills.slice(0, 3).map(s => (
            <span key={s} className="skill-badge skill-missing">{s}</span>
          ))}
          {missing_skills.length > 3 && (
            <span className="text-xs text-slate-600">+{missing_skills.length - 3} missing</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <Link to={`/candidate/${id}`} className="flex-1">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-indigo-400 transition-all"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            View Details <ChevronRight size={14} />
          </motion.button>
        </Link>
        {onDelete && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(id)}
            className="p-2 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Trash2 size={14} />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div className="progress-bar flex-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="progress-fill"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        />
      </div>
      <span className="text-xs font-medium w-10 text-right" style={{ color }}>{value.toFixed(0)}%</span>
    </div>
  )
}
