import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface CustomDropdownProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  label?: string;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  error?: string;
}

export function CustomDropdown<T extends string | number>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select option...',
  leftIcon,
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
  error,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full space-y-1.5', className)} ref={containerRef}>
      {label && (
        <label className="text-label block text-xs font-semibold uppercase tracking-wider text-[#6F6F68]">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'group relative flex h-11 w-full items-center justify-between rounded-xl border border-[#E7E3DA] bg-white px-3.5 text-left',
          'text-xs font-medium text-[#1D3E37] shadow-2xs transition-all duration-200',
          'hover:border-[#C7D6CF] hover:bg-[#FAF8F5]',
          isOpen && 'border-[#1D3E37] ring-2 ring-[#1D3E37]/10 bg-[#FAF8F5]',
          disabled && 'cursor-not-allowed bg-[#F4F2ED] opacity-60',
          error && 'border-[#C6544A] ring-2 ring-[#C6544A]/10',
          buttonClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {leftIcon && (
            <span className="shrink-0 text-[#6F6F68] transition-colors group-hover:text-[#1D3E37]">
              {leftIcon}
            </span>
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#2F6154]">{selectedOption.icon}</span>
          )}
          <div className="min-w-0 truncate">
            <span className="block truncate font-medium text-[#1D3E37]">
              {selectedOption ? selectedOption.label : <span className="text-[#9A958A]">{placeholder}</span>}
            </span>
            {selectedOption?.sublabel && (
              <span className="block truncate text-2xs text-[#9A958A]">{selectedOption.sublabel}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2">
          {selectedOption?.badge && (
            <span className="rounded-md bg-[#F4F2ED] px-2 py-0.5 text-2xs font-semibold text-[#1D3E37]">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[#9A958A] transition-transform duration-200',
              isOpen && 'rotate-180 text-[#1D3E37]'
            )}
          />
        </div>
      </button>

      {/* Luxury Animated Popup Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute left-0 top-full z-50 mt-1.5 w-full min-w-[200px] overflow-hidden rounded-2xl border border-[#E7E3DA] bg-white p-1.5',
            'shadow-[0_12px_36px_-4px_rgba(29,62,55,0.14)] backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95',
            menuClassName
          )}
        >
          <div className="max-h-64 overflow-y-auto space-y-1 py-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-all duration-150',
                    isSelected
                      ? 'bg-[#1D3E37] text-white font-medium shadow-2xs'
                      : 'text-[#3C463F] hover:bg-[#F4F2ED] hover:text-[#1D3E37]'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {option.icon && (
                      <span className={cn('shrink-0', isSelected ? 'text-[#C59B27]' : 'text-[#6F6F68] group-hover:text-[#1D3E37]')}>
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className={cn('block truncate', isSelected ? 'text-white font-semibold' : 'text-[#1D3E37]')}>
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span className={cn('block truncate text-2xs', isSelected ? 'text-[#FAF8F4]/80' : 'text-[#9A958A]')}>
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {option.badge && (
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-2xs font-semibold',
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#F4F2ED] text-[#1D3E37]'
                        )}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#C59B27] shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs font-medium text-[#A8332B]">{error}</p>}
    </div>
  );
}
