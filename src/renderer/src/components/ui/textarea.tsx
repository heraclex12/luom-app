import * as React from 'react'
import { cn } from '@/lib/cn'

/** Multi-line text area, styled like Input; `invalid` shows a red border (aria-invalid). Not resizable; set height via rows / className. */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full min-w-0 resize-none rounded-[5px] bg-fill-field px-3 py-2 text-sm/5 text-text-primary',
        'shadow-field-ring outline-none placeholder:text-text-muted',
        'transition-[box-shadow,background-color] duration-150',
        'focus-visible:bg-surface-popover focus-visible:shadow-focus',
        'aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--color-border-danger)]',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
