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
        'transition-all duration-200 ease-out group',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isCollapsed
          ? 'w-11 h-11 justify-center mx-auto hover:scale-105'
          : 'w-full gap-3 px-3.5 py-2.5 hover:translate-x-1',
        isActive
          ? 'bg-sidebar-active-bg text-sidebar-active-text font-bold shadow-2xs'
          : 'text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-hover font-medium',
      ].join(' ')}
    >
      {/* Dynamic Left Accent Bar — Active & Hover Motion Pill */}
      <span
        className={[
          'absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full bg-primary transition-all duration-200 ease-out',
          isActive
            ? 'opacity-100 scale-y-100'
            : 'opacity-0 scale-y-50 group-hover:opacity-70 group-hover:scale-y-100',
        ].join(' ')}
        aria-hidden="true"
      />

      {Icon && (
        <Icon
          className={[
            'w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3',
            isActive
              ? 'text-sidebar-active-text'
              : 'text-sidebar-text-muted group-hover:text-sidebar-text',
          ].join(' ')}
        />
      )}

      {!isCollapsed && (
        <span className="capitalize truncate transition-colors duration-150">
          {label}
        </span>
      )}
    </a>
  )
}
