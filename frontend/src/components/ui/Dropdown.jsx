import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Dropdown({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select option...', 
  className = '',
  size = 'md', // 'sm' | 'md'
  align = 'right' // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1 text-[11px]' 
    : 'px-3 py-1.5 text-xs'

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 rounded-lg border border-border bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group ${sizeClasses}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-foreground-secondary group-hover:text-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 min-w-[140px] rounded-xl border border-border bg-surface shadow-xl p-1 z-50 animate-in fade-in-80 zoom-in-95 duration-150`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value || (selectedOption && selectedOption.value === option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary ml-2 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
