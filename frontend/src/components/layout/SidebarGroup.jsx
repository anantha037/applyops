import React from 'react'

export default function SidebarGroup({ title, isCollapsed, children }) {
  return (
    <div className="flex flex-col gap-1">
      {!isCollapsed ? (
        <h3 className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-text-muted select-none">
          {title}
        </h3>
      ) : (
        <div className="h-px bg-sidebar-border/40 my-1 mx-3" />
      )}
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  )
}
