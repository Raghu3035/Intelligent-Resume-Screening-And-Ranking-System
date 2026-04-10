// src/components/UploadResume.jsx
import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadResume, uploadMultipleResumes } from '../services/api'

const ACCEPTED = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] }

function FileItem({ file, status, message, onRemove }) {
  const icons = { idle: <File size={16} className="text-indigo-400" />, uploading: <Loader2 size={16} className="text-indigo-400 animate-spin" />, success: <CheckCircle size={16} className="text-emerald-400" />, error: <AlertCircle size={16} className="text-red-400" /> }
  const colors = { idle: 'rgba(99,102,241,0.08)', uploading: 'rgba(99,102,241,0.1)', success: 'rgba(16,185,129,0.08)', error: 'rgba(239,68,68,0.08)' }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: colors[status], border: `1px solid ${status === 'success' ? 'rgba(16,185,129,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)'}` }}>
      {icons[status]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
        {message && <p className={`text-xs mt-0.5 ${status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>{message}</p>}
        {status === 'idle' && <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>}
      </div>
      {status === 'idle' && (
        <button onClick={() => onRemove(file.name)} className="text-slate-500 hover:text-red-400 transition-colors">
          <X size={14} />
        </button>
      )}
    </motion.div>
  )
}

export default function UploadResume({ onUploaded }) {
  const [files, setFiles] = useState([])
  const [statuses, setStatuses] = useState({})
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.filter(f => !files.find(x => x.name === f.name))
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(f => setStatuses(s => ({ ...s, [f.name]: { status: 'idle', message: '' } })))
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, multiple: true })

  const removeFile = (name) => {
    setFiles(f => f.filter(x => x.name !== name))
    setStatuses(s => { const n = { ...s }; delete n[name]; return n })
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)
    const uploaded = []

    for (const file of files) {
      setStatuses(s => ({ ...s, [file.name]: { status: 'uploading', message: 'Parsing resume...' } }))
      try {
        const result = await uploadResume(file)
        setStatuses(s => ({ ...s, [file.name]: { status: 'success', message: `Parsed: ${result.parsed?.name || 'Unknown'} | ${result.parsed?.skills?.length || 0} skills found` } }))
        uploaded.push(result)
      } catch (e) {
        setStatuses(s => ({ ...s, [file.name]: { status: 'error', message: e?.response?.data?.detail || 'Upload failed' } }))
      }
    }

    setUploading(false)
    if (uploaded.length) {
      toast.success(`${uploaded.length} resume(s) uploaded successfully!`)
      if (onUploaded) onUploaded(uploaded)
    }
  }

  const clearAll = () => { setFiles([]); setStatuses({}) }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${isDragActive ? 'dropzone-active' : 'border-slate-700 hover:border-indigo-500/50'}`}
        style={{ background: isDragActive ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)' }}>
        <input {...getInputProps()} />
        <motion.div animate={{ y: isDragActive ? -4 : 0 }} className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Upload size={24} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">
              {isDragActive ? 'Drop resumes here…' : 'Drag & drop resumes'}
            </p>
            <p className="text-slate-500 text-sm mt-1">or <span className="text-indigo-400 underline underline-offset-2">browse files</span></p>
            <p className="text-slate-600 text-xs mt-2">Supports PDF, DOCX, TXT · Max 10MB per file</p>
          </div>
        </motion.div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-slate-400">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear all</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {files.map(file => (
                <FileItem key={file.name} file={file} status={statuses[file.name]?.status || 'idle'} message={statuses[file.name]?.message || ''} onRemove={removeFile} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <motion.button
        onClick={handleUpload}
        disabled={!files.length || uploading}
        whileHover={{ scale: files.length && !uploading ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
      >
        {uploading ? <><Loader2 size={18} className="animate-spin" /> Uploading…</> : <><FileText size={18} /> Upload & Parse {files.length > 0 ? `(${files.length})` : ''}</>}
      </motion.button>
    </div>
  )
}
