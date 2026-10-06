import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/** Toggle switch. Track colour changes instantly; the thumb slides with a slight overshoot. */

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'group peer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 outline-none',
        'bg-switch-track hover:bg-switch-track-hover',
        'data-[state=checked]:bg-fill-accent data-[state=checked]:hover:bg-fill-accent-hover',
        'focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-4 rounded-full bg-switch-knob shadow-sm',
          'transition-transform duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          'data-[state=checked]:translate-x-4'
        )}
      />
    </SwitchPrimitive.Root>
  )
})

export { Switch }
