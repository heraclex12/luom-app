import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/** Form label; clicking focuses the associated control, greys out when the peer control is disabled. */

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm text-text-primary select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})

export { Label }
