import React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  [key: string]: any;
}

export function Avatar({ src, alt = 'Avatar', fallback, size = 'md', className, ...props }: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-2xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
  };

  const getInitials = (name?: string) => {
    if (!name) return 'KV';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-[#1D3E37]/15 bg-[#1D3E37] font-semibold text-[#FAF8F4]',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="font-semibold tracking-[0.04em] text-[#E4EBE7]">{fallback || getInitials(alt)}</span>
      )}
    </div>
  );
}
