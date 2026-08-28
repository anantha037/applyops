import React from 'react'

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, isDeleting, title, message, confirmText = 'Delete', confirmingText = 'Deleting...', confirmStyle = 'bg-rose-500 hover:bg-rose-600' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden select-none border border-transparent">
        <div className="p-6">
          <h3 className="text-base font-bold text-foreground mb-2">{title || 'Delete'}</h3>
          <p className="text-xs text-foreground-secondary mb-6">{message || 'Are you sure you want to delete this?'}</p>
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-tertiary rounded-xl transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={isDeleting} className={`px-4 py-2 text-xs font-semibold text-white ${confirmStyle} rounded-xl transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-2`}>
              {isDeleting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isDeleting ? confirmingText : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
