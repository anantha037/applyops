import { useEffect } from 'react'
import { 
  LayoutDashboard, 
  Briefcase, 
  Calendar, 
  Users, 
  BarChart3, 
  Sparkles, 
  Settings,
  X,
  PanelLeftClose,
  Search,
  Zap
} from 'lucide-react'
import SidebarItem from './SidebarItem'
import SidebarGroup from './SidebarGroup'
import SidebarFooter from './SidebarFooter'

const NAV_GROUPS = [
  {
    title: "Command Center",
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '#/dashboard' },
      { id: 'applications', label: 'Applications', icon: Briefcase, href: '#/applications' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, href: '#/calendar' },
      { id: 'contacts', label: 'Contacts', icon: Users, href: '#/contacts' },
    ]
  },
  {
    title: "Analytics & Config",
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '#/analytics' },
      { id: 'updates', label: 'Updates', icon: Sparkles, href: '#/updates' },
      { id: 'settings', label: 'Settings', icon: Settings, href: '#/settings' },
    ]
  }
]

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  theme, 
  onThemeChange, 
  isOpenMobile, 
  onCloseMobile, 
  onLogout,
  isCollapsed,
  onToggleCollapse
}) {

  // Keyboard shortcut Cmd+B / Ctrl+B to toggle collapse
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        if (onToggleCollapse) onToggleCollapse()
      }
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpenMobile, onCloseMobile, onToggleCollapse])

  const sidebarContent = (
    <div className="flex flex-col h-full max-h-screen bg-sidebar-bg text-sidebar-text overflow-hidden transition-all duration-300 ease-in-out select-none">
      {/* Header Area — Dynamic Theme Border */}
      <div className={`flex items-center border-b border-sidebar-border flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? 'px-2 py-3.5 justify-center' : 'px-3.5 py-3.5 justify-between'
      }`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-1.5 min-w-0">
            {/* Logo Icon — 18px matching Nav item icon size & axis */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold tracking-tight text-sidebar-text truncate leading-tight">
                ApplyOps
              </span>
              <span className="text-[10px] text-sidebar-text-muted truncate font-medium mt-0.5">
                Personal Workspace
              </span>
            </div>
          </div>
        ) : (
          /* Collapsed Brand Mark Button — centered 44px target */
          <button
            onClick={onToggleCollapse}
            className="w-11 h-11 rounded-xl text-primary hover:bg-sidebar-hover transition-all duration-150 focus:outline-none flex items-center justify-center"
            title="Expand sidebar (⌘B)"
            aria-label="Expand sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </button>
        )}

        {/* Collapse toggle button when expanded */}
        {!isCollapsed && !isOpenMobile && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            title="Collapse sidebar (⌘B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

        {isOpenMobile && (
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text transition-colors"
            aria-label="Close mobile sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search Shortcut Bar (Expanded Mode Only) */}
      {!isCollapsed && (
        <div className="px-3.5 pt-2 flex-shrink-0">
          <button 
            onClick={() => onViewChange('applications')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-sidebar-surface/70 border border-sidebar-border text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-all duration-150 group shadow-2xs"
          >
            <span className="flex items-center gap-2 font-medium">
              <Search className="w-3.5 h-3.5 text-sidebar-text-muted group-hover:text-sidebar-text" />
              Quick search...
            </span>
            <kbd className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sidebar-surface text-sidebar-text-muted border border-sidebar-border">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Navigation Groups List */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-none transition-all duration-300 ${
        isCollapsed ? 'px-2 py-4 flex flex-col gap-3' : 'px-3.5 py-4 flex flex-col gap-5'
      }`} aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.title} title={group.title} isCollapsed={isCollapsed}>
            {group.items.map((item) => (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                href={item.href}
                isActive={currentView === item.id}
                isCollapsed={isCollapsed}
                onClick={() => {
                  onViewChange(item.id)
                  if (isOpenMobile) onCloseMobile()
                }}
              />
            ))}
          </SidebarGroup>
        ))}

        {/* Goal Progress Widget (Expanded Mode Only) */}
        {!isCollapsed && (
          <div className="mt-auto px-1 pt-3 flex-shrink-0">
            <div className="rounded-xl bg-sidebar-surface/60 border border-sidebar-border p-3.5 space-y-2.5 shadow-2xs transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-text-muted flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" /> Goal Pace
                </span>
                <span className="text-[10px] font-bold text-sidebar-active-text bg-sidebar-active-bg px-1.5 py-0.5 rounded">
                  80%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-sidebar-text">
                  <span>Weekly outreach</span>
                  <span>4 / 5 days</span>
                </div>
                <div className="h-1.5 w-full bg-sidebar-hover rounded-full overflow-hidden">
                  <div className="h-full bg-sidebar-active-text rounded-full transition-all duration-500" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer — Fixed bottom */}
      <div className="flex-shrink-0 mt-auto">
        <SidebarFooter 
          theme={theme} 
          onThemeChange={onThemeChange} 
          onViewChange={(view) => {
            onViewChange(view)
            if (isOpenMobile) onCloseMobile()
          }}
          onLogout={onLogout} 
          isCollapsed={isCollapsed}
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Fixed Sidebar — Dynamic Theme Border */}
      <aside className={`hidden lg:block h-screen max-h-screen border-r border-sidebar-border bg-sidebar-bg sticky top-0 left-0 flex-shrink-0 z-30 overflow-hidden shadow-xs transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[76px]' : 'w-60'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          isOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpenMobile}
      >
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onCloseMobile} 
        />
        <aside 
          className={`absolute top-0 bottom-0 left-0 w-60 max-w-[80vw] border-r border-sidebar-border bg-sidebar-bg overflow-hidden shadow-2xl transition-transform duration-250 ease-in-out transform ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
