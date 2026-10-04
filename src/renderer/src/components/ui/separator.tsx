import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/** Divider, horizontal by default (h-px w-full); orientation="vertical" makes it w-px h-full. */

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator({ className, orientation = 'horizontal', decorative = true, ...props }, ref) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
})

export { Separator }
