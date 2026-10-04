import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/**
 * Popover panel; the pop-in origin follows the trigger side.
 * Default p-4; override with p-0 if the content has its own padding.
 */

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'center', sideOffset = 4, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'anim-pop z-50 min-w-[128px] max-w-[320px] rounded-card bg-surface-3 p-4 text-sm text-text-primary shadow-panel outline-none',
          'origin-[var(--radix-popover-content-transform-origin)]',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
