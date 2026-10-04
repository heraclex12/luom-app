import * as React from 'react'
import { cn } from '@/lib/cn'

/** Overflow container with native thin scrollbars (scrollbar-width: thin), overlay style. */
function ScrollArea({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-auto [scrollbar-color:var(--scrollbar-thumb)_transparent] [scrollbar-width:thin]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollArea }
