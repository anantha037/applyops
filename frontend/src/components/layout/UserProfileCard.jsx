import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings as SettingsIcon, ChevronUp } from 'lucide-react'

export default function UserProfileCard({ onViewChange, onLogout, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {isOpen && (
        <div className={`absolute ${isCollapsed ? 'left-full bottom-0 ml-3 w-44' : 'bottom-full left-0 right-0 mb-2'} rounded-xl bg-sidebar-surface border border-sidebar-border shadow-2xl p-1.5 z-50 animate-in fade-in duration-150`}>
          <button
            onClick={() => {
              onViewChange('settings')
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text transition-colors text-left font-medium"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <div className="h-px bg-sidebar-border my-1" />
          
          <button
            onClick={() => {
              setIsOpen(false)
              if (onLogout) onLogout()
              else alert('Logged out successfully.')
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-sidebar-hover hover:text-rose-300 transition-colors text-left font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-xl bg-sidebar-surface/50 hover:bg-sidebar-surface border border-sidebar-border transition-all duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group ${
          isCollapsed ? 'w-10 h-10 justify-center p-0 mx-auto' : 'w-full gap-3 p-2'
        }`}
        title={isCollapsed ? "Aman Raj (Job Seeker)" : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-sidebar-surface border border-sidebar-border overflow-hidden flex-shrink-0 flex items-center justify-center">
          <img
            src="https://api.dicebear.com/7.x/notionists/svg?seed=Aman&backgroundColor=b6e3f4"
            alt="Aman Raj"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sidebar-text truncate">Aman Raj</div>
              <div className="text-[10px] text-sidebar-text-muted truncate font-medium">Job Seeker</div>
            </div>
            <ChevronUp className={`w-4 h-4 text-sidebar-text-muted transition-transform duration-200 mr-0.5 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
    </div>
  )
}
