import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

/**
 * SearchableSelect
 *
 * @param {Array} options - Array of objects: { value: string, label: string, sublabel?: string }
 * @param {string} value - Currently selected value (must match an option.value)
 * @param {function} onChange - Callback when value changes, receives the new value string (or null if cleared)
 * @param {string} placeholder - Placeholder text when nothing is selected
 * @param {boolean} disabled - Whether the select is disabled
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(lowerSearch))
    );
  }, [options, search]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus-within:ring-1 focus-within:ring-cyan-500 focus-within:border-cyan-500 bg-gray-800 border-gray-700 text-white ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="text-gray-100">{selectedOption.label}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-200 focus:outline-none p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onMouseDown={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute z-[100] w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-700 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-gray-700 rounded-md leading-5 bg-gray-900 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  }
                }
              }}
              autoFocus
            />
          </div>
          <ul className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results found</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  className={`cursor-pointer select-none relative px-3 py-2 rounded-md ${
                    opt.value === value
                      ? "bg-cyan-900 text-cyan-100"
                      : "text-gray-200 hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-gray-400 truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </li>
              ))
            )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
