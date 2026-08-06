import { useState, useEffect } from 'react'
import { Menu, PanelLeftOpen } from 'lucide-react'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children, currentView, onViewChange, onLogout }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('applyops-theme') || 'light'
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('applyops-sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('applyops-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('applyops-sidebar-collapsed', isCollapsed ? 'true' : 'false')
  }, [isCollapsed])

  // Content area follows active user theme preference (light or dark)
  const contentTheme = theme

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
  }

  const pageTitle = currentView.charAt(0).toUpperCase() + currentView.slice(1)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200" data-theme={theme}>
      {/* Sidebar — mounted once, fixed height, persists across navigation */}
      <Sidebar
        currentView={currentView}
        onViewChange={onViewChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(prev => !prev)}
      />

      {/* Main Content Area — independent scroll container */}
      <div 
        className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden transition-all duration-300" 
        data-theme={contentTheme}
      >
        {/* Mobile Top Header */}
        <header className="lg:hidden h-14 border-b border-border bg-surface px-4 flex items-center gap-3 sticky top-0 z-20 transition-colors duration-200 flex-shrink-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {pageTitle}
          </span>
        </header>

        {/* Desktop Quick Header Bar when Collapsed */}
        {isCollapsed && (
          <div className="hidden lg:flex items-center gap-3 px-6 pt-4 pb-0 flex-shrink-0">
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground-secondary hover:text-foreground hover:bg-surface-secondary text-xs font-semibold shadow-xs transition-all duration-150 group"
              title="Expand sidebar (⌘B)"
            >
              <PanelLeftOpen className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
              <span>Show Navigation</span>
              <kbd className="ml-1 text-[10px] font-mono opacity-60">⌘B</kbd>
            </button>
          </div>
        )}

        {/* Page Content — scrolls independently without affecting sidebar */}
        <main className="flex-1 overflow-y-auto bg-background text-foreground p-6 md:p-8 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  )
}
