import React, { useState } from 'react'
import { X, Trash2, FileText, AlertCircle } from 'lucide-react'
import { api } from '../api/client'

export default function ManageResumesModal({ isOpen, onClose, resumes, setResumes, onResumeDeleted }) {
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleDelete = async (id) => {
    setError('')
    setDeleting(id)
    try {
      await api.deleteResume(id)
      setResumes(prev => prev.filter(r => r.id !== id))
      if (onResumeDeleted) onResumeDeleted(id)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-secondary">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Manage Resumes
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resumes.length === 0 ? (
            <div className="text-center py-8 text-foreground-secondary text-sm font-semibold">
              No resumes uploaded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map(resume => (
                <div key={resume.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary border border-border group hover:border-primary/30 transition-colors">
                  <div className="flex flex-col overflow-hidden mr-3">
                    <span className="text-xs font-bold text-foreground truncate">{resume.filename}</span>
                    <span className="text-[10px] font-semibold text-foreground-secondary mt-0.5">
                      Uploaded: {resume.uploaded_at ? resume.uploaded_at.split('T')[0] : 'Unknown'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    disabled={deleting === resume.id}
                    className="p-1.5 rounded-lg text-foreground-secondary hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 transition-colors flex-shrink-0"
                    title="Delete resume"
                  >
                    {deleting === resume.id ? (
                      <div className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
