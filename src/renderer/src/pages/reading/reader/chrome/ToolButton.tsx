import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Shared icon button for reader chrome (header / footer): CDS ghost icon button + Tooltip; darker when active.
 * Requires an outer `TooltipProvider` (each bar provides one).
 * Pass `activeSurface={false}` when the icon itself shows activation (e.g. solid bookmark): only
 * aria-pressed, no background — a persistent background reads as a stuck hover.
 *
 * Icon buttons in the selection popup don't use this: they sit on a floating surface with a different look.
 */
export function ToolButton({
  label,
  active,
  activeSurface = true,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  activeSurface?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(active && activeSurface && 'bg-fill-ghost-hover text-text-100')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
