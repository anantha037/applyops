import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

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
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [pos, setPos] = useState(null)

  const selectedOption = options.find(opt => opt.value === value) || (value !== undefined && value !== null && value !== '' ? options[0] : null)

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
    if (!isOpen) return

    requestAnimationFrame(reposition)

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
        <ChevronDown 
          className={`w-3 h-3 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`} 
        />
      </button>

      {isOpen && createPortal(
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
          {options.map((option) => {
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
                <div className="flex items-center gap-2">
                  {option.dotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${option.dotColor}`} />
                  )}
                  <span>{option.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary ml-3 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
