import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
} as const;

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: DialogProps) {
  const titleId = React.useId();
  const descId = React.useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0C1E1A]/45 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            initial={{ opacity: 0, scale: 0.985, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 my-8 w-full overflow-y-auto rounded-2xl border border-[#E7E3DA] bg-white',
              'max-h-[90vh] p-6 shadow-2xl sm:p-8',
              maxWidthClasses[maxWidth]
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className={cn(
                'absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#6F6F68]',
                'transition-colors hover:bg-[#F4F2ED] hover:text-[#1D3E37]',
                'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]'
              )}
            >
              <X className="h-4 w-4" />
            </button>

            {(title || description) && (
              <header className="mb-6 pr-10">
                {title && (
                  <h2
                    id={titleId}
                    className="flex items-center gap-2 font-serif text-xl font-semibold tracking-[-0.015em] text-[#1D3E37]"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descId} className="mt-1.5 text-sm leading-relaxed text-[#545B56]">
                    {description}
                  </p>
                )}
              </header>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
