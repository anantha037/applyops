import React from "react";
import Dropdown from "./Dropdown";

/**
 * SearchableSelect (Wrapper around Dropdown)
 *
 * @param {Array} options - Array of objects: { value: string, label: string, sublabel?: string }
 * @param {string} value - Currently selected value (must match an option.value)
 * @param {function} onChange - Callback when value changes, receives the new value string (or null if cleared)
 * @param {string} placeholder - Placeholder text when nothing is selected
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} className - Optional container class
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = ""
}) {
  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchable={true}
      clearable={!disabled}
      className={`w-full ${className}`}
      triggerClassName={`w-full bg-surface-secondary border border-transparent hover:bg-surface-tertiary focus:bg-surface-tertiary text-foreground-secondary hover:text-foreground ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    />
  );
}
