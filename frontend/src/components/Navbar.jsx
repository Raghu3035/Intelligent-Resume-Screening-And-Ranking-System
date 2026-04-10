// src/components/Navbar.jsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Upload, BarChart2, LayoutDashboard } from 'lucide-react'

const links = [
  { to: '/upload',    label: 'Upload',    icon: Upload },
  { to: '/analyze',   label: 'Analyze',   icon: Brain },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
         style={{ background: 'rgba(15,15,26,0.85)', backdropFilter: 'blur(16px)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/upload" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">ResumeAI</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to}>
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: active ? '#a5b4fc' : '#94a3b8',
                    border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  }}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
