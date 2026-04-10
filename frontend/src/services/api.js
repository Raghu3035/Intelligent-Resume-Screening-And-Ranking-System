// src/services/api.js
import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.detail || error.message || 'Something went wrong'
    if (error.response?.status !== 404) {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

// ─── Resume Upload ─────────────────────────────────────────
export const uploadResume = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
    }
  })
  return data
}

export const uploadMultipleResumes = async (files, onProgress) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const { data } = await api.post('/upload-resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
    }
  })
  return data
}

// ─── Analysis ─────────────────────────────────────────────
export const analyzeResumes = async ({ job_description, min_experience = 0 }) => {
  const { data } = await api.post('/analyze', {
    job_description,
    min_experience,
  })
  return data
}

// ─── Results ──────────────────────────────────────────────
export const getResults = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.min_score !== undefined) params.append('min_score', filters.min_score)
  if (filters.max_score !== undefined) params.append('max_score', filters.max_score)
  if (filters.min_experience !== undefined) params.append('min_experience', filters.min_experience)
  if (filters.skill) params.append('skill', filters.skill)
  if (filters.search) params.append('search', filters.search)

  const { data } = await api.get(`/results?${params.toString()}`)
  return data
}

export const getCandidate = async (id) => {
  const { data } = await api.get(`/candidate/${id}`)
  return data
}

export const deleteCandidate = async (id) => {
  const { data } = await api.delete(`/candidate/${id}`)
  return data
}

export const clearAll = async () => {
  const { data } = await api.post('/clear')
  return data
}

export const getStats = async () => {
  const { data } = await api.get('/stats')
  return data
}

// ─── Export ───────────────────────────────────────────────
export const exportCSV = () => {
  window.open(`${BASE_URL}/export/csv`, '_blank')
}

export const exportPDF = () => {
  window.open(`${BASE_URL}/export/pdf`, '_blank')
}
