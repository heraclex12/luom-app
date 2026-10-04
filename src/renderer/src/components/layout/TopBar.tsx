import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'

/**
 * Top location bar showing where the user is (claude.ai-style: no divider, frosted glass, minimal).
 * `segments` is a breadcrumb with an icon-only back button on the left: disabled on top-level pages,
 * enabled on drill-down pages, where the last segment is the current page.
 * Back uses onBack, else navigate(backTo), else history back.
 */
export function TopBar({
  segments,
  backTo,
  onBack,
}: {
  segments: string[]
  backTo?: string
  onBack?: () => void
}): React.JSX.Element {
  const navigate = useNavigate()
  const nested = segments.length > 1
  const goBack =
    onBack ??
    ((): void => {
      if (backTo) navigate(backTo)
      else navigate(-1)
    })

  return (
    <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-1.5 bg-page-bg/80 px-3 backdrop-blur">
      <Button variant="ghost" size="iconSm" onClick={goBack} disabled={!nested} aria-label="Back">
        <ArrowLeft className="size-4" />
      </Button>
      <nav className="flex items-center gap-1.5 text-sm">
        {segments.map((seg, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-text-muted">/</span>}
            <span className={i === segments.length - 1 ? 'font-medium text-text-primary' : 'text-text-secondary'}>
              {seg}
            </span>
          </Fragment>
        ))}
      </nav>
    </div>
  )
}
