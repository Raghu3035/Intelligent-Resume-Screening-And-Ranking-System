// src/components/Filters.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'

export default function Filters({ filters, onChange, onReset }) {
  const hasActive = filters.search || filters.skill || filters.min_score > 0 || filters.min_experience > 0

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={15} className="text-indigo-400" />
        <span className="text-sm font-semibold text-slate-300">Filters</span>
        {hasActive && (
          <button onClick={onReset} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
            <X size={12} /> Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative col-span-2 md:col-span-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name…"
            value={filters.search || ''}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="input-glass w-full pl-8 pr-3 py-2 text-sm"
          />
        </div>

        {/* Skill filter */}
        <input
          type="text"
          placeholder="Filter by skill…"
          value={filters.skill || ''}
          onChange={e => onChange({ ...filters, skill: e.target.value })}
          className="input-glass w-full px-3 py-2 text-sm"
        />

        {/* Min score */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Min score</label>
          <input
            type="number" min={0} max={100}
            value={filters.min_score || 0}
            onChange={e => onChange({ ...filters, min_score: +e.target.value })}
            className="input-glass w-full px-2 py-2 text-sm text-center"
          />
          <span className="text-xs text-slate-600">%</span>
        </div>

        {/* Min experience */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Min exp</label>
          <input
            type="number" min={0} max={30} step={0.5}
            value={filters.min_experience || 0}
            onChange={e => onChange({ ...filters, min_experience: +e.target.value })}
            className="input-glass w-full px-2 py-2 text-sm text-center"
          />
          <span className="text-xs text-slate-600">yr</span>
        </div>
      </div>
    </div>
  )
}
