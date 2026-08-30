import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const base =
  'relative inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap ' +
  'transition-all duration-200 ease-out ' +
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E7B36] ' +
  'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none';

const variants = {
  primary:
    'bg-[#183028] text-[#FAF8F5] border border-[#183028] shadow-2xs hover:bg-[#224036] hover:border-[#224036] hover:shadow-xs',
  emerald:
    'bg-[#183028] text-[#FAF8F5] border border-[#183028] shadow-2xs hover:bg-[#224036] hover:border-[#224036]',
  gold:
    'bg-[#9E7B36] text-white border border-[#9E7B36] shadow-2xs hover:bg-[#8A6A2E] hover:shadow-xs',
  secondary:
    'bg-[#F5F1E9] text-[#2C2924] border border-[#E3DDD1] shadow-2xs hover:bg-[#EBE5DA] hover:border-[#D5CDBC]',
  outline:
    'border border-[#D9D3C7] bg-white text-[#2C2924] shadow-2xs hover:bg-[#FAF8F5] hover:border-[#B5ACA0]',
  ghost:
    'text-[#4A463F] hover:bg-[#F2ECE1] hover:text-[#183028]',
  destructive:
    'bg-[#8C2C24] text-white border border-[#8C2C24] shadow-2xs hover:bg-[#78231C]',
  link:
    'text-[#183028] underline decoration-[#9E7B36] decoration-1 underline-offset-4 hover:text-[#9E7B36] p-0 h-auto',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9.5 px-4 text-xs font-medium gap-2',
  lg: 'h-11 px-5 text-sm font-medium gap-2.5',
  icon: 'h-8.5 w-8.5 p-0',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-3.5 w-3.5 animate-spin text-current"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
