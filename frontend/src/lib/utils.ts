import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function calculateNights(checkIn: string, checkOut: string): number {
  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
}

export function generateVoucherCode(): string {
  const prefix = 'KVR';
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `#${prefix}-${randomNum}`;
}

export function generateIdempotencyKey(): string {
  return 'IDEM_' + Math.random().toString(36).substring(2, 12).toUpperCase() + '_' + Date.now();
}

export const PROPERTY_ID_MAP: Record<number, 'coorg' | 'ooty' | 'alleppey'> = {
  1: 'coorg',
  2: 'ooty',
  3: 'alleppey',
};

export const PROPERTY_SLUG_MAP: Record<string, number> = {
  coorg: 1,
  ooty: 2,
  alleppey: 3,
};

export function propIdToSlug(id?: number | null): 'coorg' | 'ooty' | 'alleppey' | undefined {
  if (!id) return undefined;
  return PROPERTY_ID_MAP[id] || 'coorg';
}

export function slugToPropId(slug?: string | null): number {
  if (!slug) return 1;
  return PROPERTY_SLUG_MAP[slug.toLowerCase()] || 1;
}
