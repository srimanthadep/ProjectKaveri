import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function Tabs({ tabs, activeTab, onChange, className, variant = 'pills' }: TabsProps) {
  const isUnderline = variant === 'underline';

  return (
    <div
      role="tablist"
      className={cn(
        isUnderline
          ? 'flex gap-7 overflow-x-auto border-b border-[#E7E3DA] no-scrollbar'
          : 'inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#E7E3DA] bg-[#F4F2ED] p-1 no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-sm transition-colors duration-150',
              'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]',
              isUnderline
                ? [
                    'border-b-2 px-0.5 pb-3 pt-2.5',
                    isActive
                      ? 'border-[#1D3E37] font-semibold text-[#1D3E37]'
                      : 'border-transparent font-medium text-[#6F6F68] hover:border-[#D3CEC2] hover:text-[#1D3E37]',
                  ]
                : [
                    'rounded-lg px-3.5 py-2',
                    isActive
                      ? 'bg-white font-semibold text-[#1D3E37] shadow-xs'
                      : 'font-medium text-[#6F6F68] hover:text-[#1D3E37]',
                  ]
            )}
          >
            {tab.icon && (
              <span className={cn('flex shrink-0', isActive ? 'text-[#C59B27]' : 'text-current')} aria-hidden="true">
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 py-0.5 text-2xs font-semibold leading-none',
                  isActive ? 'bg-[#1D3E37] text-[#FAF8F4]' : 'bg-[#E7E3DA] text-[#545B56]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
