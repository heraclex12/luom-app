import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge classNames: clsx join + tailwind-merge conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
