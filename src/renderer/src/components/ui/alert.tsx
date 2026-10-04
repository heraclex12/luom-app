import * as React from 'react'
import { cn } from '@/lib/cn'

/**
 * Inline callout composed of AlertIcon, AlertContent (with AlertDescription) and AlertAction slots.
 * Static by default (no role=alert); callers add it when it should be announced.
 */

function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-card bg-surface-1 px-4 py-3 text-sm text-text-primary shadow-card-ring',
        className
      )}
      {...props}
    />
  )
}

function AlertIcon({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('flex shrink-0 items-center text-text-secondary [&_svg]:size-4', className)} {...props} />
}

function AlertContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2', className)} {...props} />
  )
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-[min(20ch,100%)] flex-1 text-text-primary', className)} {...props} />
}

function AlertAction({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('flex shrink-0 items-center', className)} {...props} />
}

export { Alert, AlertIcon, AlertContent, AlertDescription, AlertAction }
