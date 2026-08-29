import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'gold' | 'emerald';
  [key: string]: any;
}

export function Badge({ children, className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs',
    secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    outline: 'border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    destructive: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    gold: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/60 font-medium',
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 font-medium',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

