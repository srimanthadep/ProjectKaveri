import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id || reactId;
    const messageId = `${inputId}-message`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-label block">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 flex text-[#6F6F68]" aria-hidden="true">
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            className={cn(
              'h-11 w-full rounded-xl border border-[#E7E3DA] bg-white px-3.5 text-sm text-[#1D3E37]',
              'shadow-xs transition-[border-color,box-shadow] duration-150',
              'hover:border-[#D3CEC2]',
              'focus:border-[#1D3E37] focus:ring-[3px] focus:ring-[#1D3E37]/10',
              'focus:outline-none focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:bg-[#F4F2ED] disabled:opacity-60',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error &&
                'border-[#C6544A] hover:border-[#C6544A] focus:border-[#A8332B] focus:ring-[#A8332B]/12',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3.5 flex text-[#6F6F68]" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p id={messageId} className="text-xs font-medium text-[#A8332B]">
            {error}
          </p>
        ) : helperText ? (
          <p id={messageId} className="text-xs text-[#6F6F68]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
