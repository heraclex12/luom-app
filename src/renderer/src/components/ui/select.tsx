import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Select with a check mark on the selected item. */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(function SelectTrigger({ className, children, ...props }, ref) {
  // While open, Radix disables outside pointer events, so the trigger loses CSS :hover. We use
  // document pointermove to check whether the pointer is over the trigger and drive the hover
  // highlight in the open state, without touching pointer-events or Radix's close logic.
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [openHover, setOpenHover] = React.useState(false)
  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
  React.useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const onPointerMove = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect()
      setOpenHover(
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      )
    }
    const syncOpen = (): void => {
      if (el.getAttribute('data-state') === 'open') {
        setOpenHover(true) // pointer is usually on the trigger when it opens; pointermove corrects it
        document.addEventListener('pointermove', onPointerMove)
      } else {
        document.removeEventListener('pointermove', onPointerMove)
        setOpenHover(false)
      }
    }
    const observer = new MutationObserver(syncOpen)
    observer.observe(el, { attributes: true, attributeFilter: ['data-state'] })
    syncOpen()
    return () => {
      observer.disconnect()
      document.removeEventListener('pointermove', onPointerMove)
    }
  }, [])
  return (
    <SelectPrimitive.Trigger
      ref={setRefs}
      className={cn(
        'group flex h-9 w-fit items-center gap-1.5 rounded-field pl-3 pr-2.5 text-sm text-text-primary',
        'bg-transparent outline-none transition duration-[60ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        // Closed: CSS :hover. Open: :hover is dead, so the JS-driven openHover takes over.
        // Either way it only highlights while the pointer is actually on the trigger.
        'hover:bg-fill-ghost-hover',
        openHover && 'bg-fill-ghost-hover',
        'focus-visible:shadow-focus data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          className="mr-0.5 size-4 shrink-0 text-text-muted transition-colors group-hover:text-text-secondary"
          strokeWidth={2}
          aria-hidden
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(function SelectScrollUpButton({ className, ...props }, ref) {
  return (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn('flex cursor-default items-center justify-center py-1 text-text-muted', className)}
      {...props}
    >
      <ChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
})

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(function SelectScrollDownButton({ className, ...props }, ref) {
  return (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn('flex cursor-default items-center justify-center py-1 text-text-muted', className)}
      {...props}
    >
      <ChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
})

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent({ className, children, position = 'popper', ...props }, ref) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        className={cn(
          'anim-pop z-50 max-h-[var(--radix-select-content-available-height)] min-w-[12rem] overflow-hidden',
          'rounded-field bg-surface-3 text-sm text-text-primary shadow-popover outline-none',
          'origin-[var(--radix-select-content-transform-origin)]',
          position === 'popper' && 'data-[side=bottom]:mt-1 data-[side=top]:mb-1',
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(function SelectLabel({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('px-3 py-1 text-[13px] font-medium text-text-muted', className)}
      {...props}
    />
  )
})

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'group/item relative flex min-h-8 w-full cursor-pointer select-none items-center gap-2 rounded-[8px] px-3 py-1',
        'text-sm text-text-primary outline-none',
        // Background follows the physical pointer only; selection is shown by the check mark. Radix
        // focuses the selected item on open (data-highlighted), so we can't colour by that or it
        // would highlight without hover. Matches claude.ai.
        'hover:bg-fill-ghost-hover',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto flex shrink-0 items-center text-text-accent">
        <Check className="size-4" strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(function SelectSeparator({ className, ...props }, ref) {
  return <SelectPrimitive.Separator ref={ref} className={cn('mx-2.5 my-1 h-px bg-border', className)} {...props} />
})

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
