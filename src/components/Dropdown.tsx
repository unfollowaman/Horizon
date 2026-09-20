import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.indexOf(value);
      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      optionRefs.current[targetIndex]?.focus();
    }
  }, [isOpen, options, value]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      optionRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[options.length - 1]?.focus();
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="w-full neu-raised hover:neu-raised-hover rounded-lg h-[clamp(48px,6vw,64px)] flex items-center px-[clamp(12px,2vw,16px)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 text-left"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
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
          <div role="listbox" aria-label={ariaLabel} className="max-h-60 overflow-y-auto rounded-md py-1">
            {options.map((option, index) => {
              const isSelected = value === option;

              return (
                <button
                  ref={(el) => { optionRefs.current[index] = el; }}
                  type="button"
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full text-left px-[clamp(12px,2vw,16px)] py-1 cursor-pointer hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none text-[clamp(14px,1.5vw,18px)] font-medium ${isSelected ? 'font-bold bg-black/5' : ''}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
