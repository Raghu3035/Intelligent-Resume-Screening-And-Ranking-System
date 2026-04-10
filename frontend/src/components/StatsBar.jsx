// src/components/StatsBar.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Award, BarChart2 } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5 flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

export default function StatsBar({ stats }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users}    label="Total Resumes"   value={stats.total}    color="#6366f1" delay={0} />
      <StatCard icon={BarChart2} label="Analyzed"       value={stats.analyzed} color="#8b5cf6" delay={0.05} />
      <StatCard icon={TrendingUp} label="Avg Score"     value={`${stats.avg_score}%`} color="#10b981" delay={0.1} />
      <StatCard icon={Award}    label="Top Score"       value={`${stats.top_score}%`} color="#f59e0b" delay={0.15} />
    </div>
  )
}
