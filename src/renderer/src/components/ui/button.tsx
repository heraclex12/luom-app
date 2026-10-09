import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Button with primary / brand / secondary / ghost / danger variants.
 * `loading` shows a spinner and blocks interaction. asChild applies the styles to any child.
 */

const button = cva(
  'btn-squish inline-flex items-center justify-center relative shrink-0 select-none whitespace-nowrap gap-1.5 ' +
    'text-sm font-medium border-0 outline-2 outline-offset-1 outline-transparent ' +
    'focus-visible:outline-accent-100 disabled:pointer-events-none [&:disabled:not([aria-busy=true])]:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-fill-primary text-on-primary hover:bg-fill-primary-hover font-semibold',
        brand: 'bg-fill-brand text-on-brand hover:bg-fill-brand-hover font-semibold',
        danger: 'bg-fill-danger text-on-danger hover:bg-fill-danger-hover font-semibold',
        secondary:
          'bg-fill-control text-text-primary hover:bg-fill-control-hover font-semibold',
        ghost: 'bg-transparent text-text-secondary hover:bg-fill-ghost-hover hover:text-text-primary',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-full min-w-[5rem]',
        sm: 'h-8 rounded-full px-3.5 min-w-[4rem] !text-xs',
        lg: 'h-10 rounded-full px-5 min-w-[6rem] !text-[15px]',
        icon: 'h-9 w-9 rounded-full',
        iconXs: 'h-6 w-6 rounded-full',
        iconSm: 'h-8 w-8 rounded-full',
        iconLg: 'h-11 w-11 rounded-full',
      },
      round: { true: '!rounded-full' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, round, asChild = false, loading = false, disabled, type, children, ...props },
  ref
) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      ref={ref}
      {...(asChild ? {} : { type: type ?? 'button' })}
      aria-busy={loading || undefined}
      disabled={disabled || loading || undefined}
      className={cn(button({ variant, size, round }), className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />
          <span className="sr-only">Loading…</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
})

export { button as buttonVariants }
