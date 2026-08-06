import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ theme, onChange, isCollapsed }) {
  const isDark = theme === 'dark'
  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`

  return (
    <button
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className={`relative flex items-center justify-center rounded-xl text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group ${
        isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'p-2'
      }`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}
