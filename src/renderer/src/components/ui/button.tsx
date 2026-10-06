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
          'bg-transparent text-text-primary border border-border-strong hover:bg-fill-ghost-hover hover:border-border-stronger font-semibold',
        ghost: 'bg-transparent text-text-secondary hover:bg-fill-ghost-hover hover:text-text-primary',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-[5px] min-w-[5rem]',
        sm: 'h-8 rounded-[4px] px-3 min-w-[4rem] !text-xs',
        lg: 'h-11 rounded-[6px] px-5 min-w-[6rem] !text-base',
        icon: 'h-9 w-9 rounded-[5px]',
        iconXs: 'h-6 w-6 rounded-[4px]',
        iconSm: 'h-8 w-8 rounded-[4px]',
        iconLg: 'h-11 w-11 rounded-[6px]',
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
