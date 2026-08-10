import ThemeToggle from './ThemeToggle'
import UserProfileCard from './UserProfileCard'

export default function SidebarFooter({ theme, onThemeChange, onViewChange, onLogout, isCollapsed }) {
  return (
    <div className={`mt-auto border-t border-sidebar-border transition-all duration-200 ${
      isCollapsed ? 'p-2.5 flex flex-col items-center gap-2' : 'p-3 flex flex-col gap-3'
    }`}>
      <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 w-full justify-center' : 'gap-2'}`}>
        <div className={isCollapsed ? 'w-full flex justify-center' : 'flex-1'}>
          <UserProfileCard onViewChange={onViewChange} onLogout={onLogout} isCollapsed={isCollapsed} />
        </div>
        <ThemeToggle theme={theme} onChange={onThemeChange} isCollapsed={isCollapsed} />
      </div>
    </div>
  )
}
