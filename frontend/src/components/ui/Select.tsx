import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, leftIcon, id, ...props }, ref) => {
    const reactId = React.useId();
    const selectId = id || reactId;
    const messageId = `${selectId}-message`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-label block">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 flex text-[#6F6F68]" aria-hidden="true">
              {leftIcon}
            </span>
          )}

          <select
            id={selectId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            className={cn(
              'h-11 w-full appearance-none rounded-xl border border-[#E7E3DA] bg-white px-3.5 pr-10',
              'text-sm text-[#1D3E37] shadow-xs transition-[border-color,box-shadow] duration-150',
              'hover:border-[#D3CEC2]',
              'focus:border-[#1D3E37] focus:ring-[3px] focus:ring-[#1D3E37]/10',
              'focus:outline-none focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:bg-[#F4F2ED] disabled:opacity-60',
              leftIcon && 'pl-10',
              error && 'border-[#C6544A] focus:border-[#A8332B] focus:ring-[#A8332B]/12',
              'cursor-pointer',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-[#6F6F68]" aria-hidden="true" />
        </div>

        {error && (
          <p id={messageId} className="text-xs font-medium text-[#A8332B]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
