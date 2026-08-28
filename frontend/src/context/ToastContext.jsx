import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const { id, message, type, duration } = toast

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onRemove(id), duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onRemove])

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-white/5 shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
      {icons[type] || icons.info}
      <p className="text-sm font-medium text-foreground tracking-tight">{message}</p>
      <button 
        onClick={() => onRemove(id)}
        className="ml-2 text-foreground-secondary hover:text-foreground transition-colors p-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}
