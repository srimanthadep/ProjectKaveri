import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'gold' | 'emerald';
  dot?: boolean;
  [key: string]: any;
}

const variantStyles = {
  default: 'bg-[#183028] text-[#FAF8F5] border border-transparent',
  secondary: 'bg-[#F2ECE1] text-[#4A463F] border border-[#E3DCCF]',
  outline: 'bg-transparent text-[#4A463F] border border-[#D9D2C5]',
  success: 'bg-[#EBF3EE] text-[#1E4A35] border border-[#CDE1D5]',
  warning: 'bg-[#FBF5E8] text-[#7A5B18] border border-[#EBDDBB]',
  destructive: 'bg-[#FBEEEC] text-[#8C2C24] border border-[#EACEC9]',
  gold: 'bg-[#F9F5EC] text-[#8C6D2B] border border-[#E6DCBF]',
  emerald: 'bg-[#EBF3EE] text-[#1E4A35] border border-[#CDE1D5]',
} as const;

const dotColors = {
  default: 'bg-[#FAF8F5]',
  secondary: 'bg-[#8C877D]',
  outline: 'bg-[#8C877D]',
  success: 'bg-[#2C6B4D]',
  warning: 'bg-[#B88B27]',
  destructive: 'bg-[#A63A30]',
  gold: 'bg-[#B89047]',
  emerald: 'bg-[#2C6B4D]',
} as const;

export function Badge({ children, className, variant = 'default', dot = false, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-2xs font-medium leading-none',
        'tracking-[0.02em] whitespace-nowrap align-middle shadow-2xs',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
