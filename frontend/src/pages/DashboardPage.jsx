// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Download, RefreshCw, Trash2, BarChart2, Loader2, FileDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'
import CandidateCard from '../components/CandidateCard'
import Filters from '../components/Filters'
import StatsBar from '../components/StatsBar'
import { getResults, getStats, deleteCandidate, clearAll, exportCSV, exportPDF } from '../services/api'

const DEFAULT_FILTERS = { search: '', skill: '', min_score: 0, min_experience: 0 }

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-slate-200 mb-1">{d.name}</p>
      <p style={{ color: payload[0].color }}>Score: {d.score?.toFixed(1)}%</p>
    </div>
  )
}

export default function DashboardPage() {
  const [candidates, setCandidates] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid') // 'grid' | 'chart'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [results, statsData] = await Promise.all([
        getResults(filters),
        getStats(),
      ])
      setCandidates(results)
      setStats(statsData)
    } catch {
      // error toasted
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id) => {
    try {
      await deleteCandidate(id)
      toast.success('Candidate removed')
      fetchData()
    } catch {}
  }

  const handleClearAll = async () => {
    if (!window.confirm('Clear ALL candidates? This cannot be undone.')) return
    try {
      await clearAll()
      toast.success('All candidates cleared')
      fetchData()
    } catch {}
  }

  const chartData = candidates
    .filter(c => c.match_score > 0)
    .slice(0, 12)
    .map(c => ({ name: c.name.split(' ')[0], score: c.match_score, full: c.name }))

  const getBarColor = (score) => score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen px-4 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))' }}>
            <LayoutDashboard size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
            <p className="text-xs text-slate-500">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} shown</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {['grid', 'chart'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-2 text-xs font-medium capitalize transition-all"
                style={{ background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent', color: view === v ? '#a5b4fc' : '#64748b' }}>
                {v === 'grid' ? '⊞ Grid' : '📊 Chart'}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 transition-all"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <FileDown size={13} /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-400 transition-all"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Download size={13} /> PDF
          </button>
          <button onClick={handleClearAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Trash2 size={13} /> Clear All
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && <div className="mb-6"><StatsBar stats={stats} /></div>}

      {/* Filters */}
      <div className="mb-6">
        <Filters filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : candidates.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-24 text-slate-600">
          <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold text-slate-500">No candidates yet</p>
          <p className="text-sm mt-1">Upload resumes and run analysis to see rankings here.</p>
        </motion.div>
      ) : view === 'chart' ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Match Score Comparison</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map((c, i) => (
              <CandidateCard key={c.id} candidate={c} index={i} onDelete={handleDelete} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
