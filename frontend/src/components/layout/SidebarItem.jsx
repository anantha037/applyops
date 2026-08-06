import React from 'react'

export default function SidebarItem({ label, icon: Icon, href, isActive, isCollapsed, onClick }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
      className={[
        'relative flex items-center rounded-xl text-[13px] no-underline select-none overflow-hidden',
        'transition-all duration-150 ease-in-out group',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isCollapsed ? 'w-11 h-11 justify-center mx-auto' : 'w-full gap-3 px-3 py-2.5',
        isActive
          ? 'bg-sidebar-active-bg text-sidebar-active-text font-semibold'
          : 'text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-hover font-medium',
      ].join(' ')}
    >
      {/* 3px Left Accent Indicator */}
      {isActive && (
        <span 
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-sidebar-active-text transition-all duration-150"
          aria-hidden="true" 
        />
      )}

      {Icon && (
        <Icon 
          className={[
            'w-4 h-4 flex-shrink-0 transition-colors duration-150',
            isActive 
              ? 'text-sidebar-active-text' 
              : 'text-sidebar-text-muted group-hover:text-sidebar-text',
          ].join(' ')} 
        />
      )}

      {!isCollapsed && (
        <span className="capitalize truncate transition-opacity duration-150">
          {label}
        </span>
      )}
    </a>
  )
}
