import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        className="w-full neu-raised hover:neu-raised-hover rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(12px,2vw,16px)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink/20 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-ink text-[clamp(14px,1.5vw,18px)] font-bold flex-1 truncate pointer-events-none">
          {value}
        </span>
        <svg
          className={`h-[1.2em] w-[1.2em] text-ink shrink-0 ml-[clamp(4px,1vw,12px)] pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 neu-raised rounded-lg p-[4px]">
          <div className="max-h-60 overflow-y-auto rounded-md py-1">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={`w-full text-left px-[clamp(12px,2vw,16px)] py-1 cursor-pointer hover:bg-black/5 focus:bg-black/5 focus:outline-none text-[clamp(14px,1.5vw,18px)] font-medium ${value === option ? 'font-bold bg-black/5' : ''}`}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
