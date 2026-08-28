import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export default function Dropdown({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select option...', 
  prefix = '',
  icon: Icon,
  className = '',
  triggerClassName = '',
  size = 'md',
  align = 'left',
  searchable = false,
  clearable = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const [pos, setPos] = useState(null)

  const selectedOption = options.find(opt => opt.value === value) || (value !== undefined && value !== null && value !== '' ? options[0] : null)

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options
    const lower = searchQuery.toLowerCase()
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lower) || 
      (opt.sublabel && opt.sublabel.toLowerCase().includes(lower))
    )
  }, [options, searchQuery, searchable])

  const reposition = useCallback(() => {
    const trig = triggerRef.current
    const menu = menuRef.current
    if (!trig || !menu) return

    const tr = trig.getBoundingClientRect()
    const mr = menu.getBoundingClientRect()
    const gap = 6
    const pad = 8

    const fitsBelow = tr.bottom + gap + mr.height <= window.innerHeight
    const top = fitsBelow ? tr.bottom + gap : Math.max(pad, tr.top - gap - mr.height)

    let left
    if (align === 'right') {
      left = tr.right - mr.width
      if (left < pad) left = pad
    } else {
      left = tr.left
      if (left + mr.width > window.innerWidth - pad) left = window.innerWidth - pad - mr.width
    }

    setPos({ top, left, minWidth: tr.width })
  }, [align])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      return
    }

    requestAnimationFrame(() => {
      reposition()
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    })

    const onClickOut = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setIsOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setIsOpen(false) }

    document.addEventListener('mousedown', onClickOut)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onClickOut)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [isOpen, reposition])

  const triggerLabel = prefix && selectedOption
    ? `${prefix}: ${selectedOption.label}`
    : selectedOption
      ? selectedOption.label
      : placeholder

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1 text-[11px]' 
    : 'px-3.5 py-2 text-xs'

  const defaultTriggerClass = 'border border-transparent bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary'
  const finalTriggerClass = triggerClassName || defaultTriggerClass

  return (
    <div className={`inline-block text-left select-none ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-between w-full gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 group ${sizeClasses} ${finalTriggerClass}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-foreground-secondary group-hover:text-foreground transition-colors" />}
          {selectedOption?.dotColor && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedOption.dotColor}`} />
          )}
          <span className="truncate">{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {clearable && selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              className="p-0.5 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown 
            className={`w-3 h-3 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`} 
          />
        </div>
      </button>

      {isOpen && createPortal(
        <>
          {/* Invisible overlay to catch outside clicks and prevent bubbling to modal backdrop */}
          <div className="fixed inset-0 z-[99]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onMouseDown={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div 
            ref={menuRef}
            className="fixed rounded-xl bg-surface shadow-2xl p-1.5"
            style={{
              zIndex: 100,
              ...(pos
                ? { top: pos.top, left: pos.left, minWidth: pos.minWidth }
                : { top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }
              ),
            }}
            role="listbox"
          >
            {searchable && (
              <div className="px-2 pb-2 mb-1.5 border-b border-white/5 relative">
                <Search className="w-3.5 h-3.5 text-foreground-secondary absolute left-4 top-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (filteredOptions.length > 0) {
                        onChange(filteredOptions[0].value)
                        setIsOpen(false)
                      }
                    }
                  }}
                  className="w-full bg-surface-secondary border border-transparent hover:bg-surface-tertiary focus:bg-surface-tertiary rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            )}
            
            <div className={`${searchable ? 'max-h-48 overflow-y-auto overflow-x-hidden scrollbar-none' : ''}`}>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-center text-foreground-secondary">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors duration-150 ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-col gap-0.5 truncate">
                        <div className="flex items-center gap-2">
                          {option.dotColor && (
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${option.dotColor}`} />
                          )}
                          <span className="truncate">{option.label}</span>
                        </div>
                        {option.sublabel && (
                          <span className="text-[10px] text-foreground-tertiary font-normal truncate pl-3.5">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary ml-3 flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
