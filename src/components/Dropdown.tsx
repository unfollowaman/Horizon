import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className="w-full neu-raised hover:neu-raised-hover rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(12px,2vw,16px)] cursor-pointer focus-within:ring-2 focus-within:ring-ink/20"
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
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 neu-raised rounded-lg p-[4px]">
          <div className="max-h-60 overflow-y-auto rounded-md py-1">
            {options.map((option) => (
              <div
                key={option}
                className={`px-[clamp(12px,2vw,16px)] py-3 cursor-pointer hover:bg-black/5 text-[clamp(14px,1.5vw,18px)] font-medium ${value === option ? 'font-bold bg-black/5' : ''}`}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
