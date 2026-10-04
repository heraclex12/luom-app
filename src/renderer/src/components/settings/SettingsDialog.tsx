import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { SETTINGS_SECTIONS } from './sections'

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Section id to jump to on every open (see SETTINGS_SECTIONS), for entry points that open
   * settings in context (e.g. the reader's settings button → 'reading'). When omitted, the last
   * visited section is kept.
   */
  initialSection?: string
}

/**
 * Settings modal modelled on claude.ai's: 960×720, two columns — left rail (w-48 / surface-1 /
 * hairline border) and right content (surface-2 / px-6). Opens over the current page; closing
 * returns to where you were.
 *
 * The default DialogContent is a narrow modal, so it's overridden here: no padding, two-column
 * grid, fixed size; radius and shadow keep the Dialog defaults.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  initialSection,
}: SettingsDialogProps): React.JSX.Element {
  const [activeId, setActiveId] = useState(initialSection ?? 'general')
  const [query, setQuery] = useState('')

  // Jump to the requested section on every open (the dialog stays mounted, so it would otherwise
  // reopen on the last section). Entry points without initialSection keep the last section.
  useEffect(() => {
    if (open && initialSection) setActiveId(initialSection)
  }, [open, initialSection])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SETTINGS_SECTIONS
    return SETTINGS_SECTIONS.filter((s) => s.label.toLowerCase().includes(q))
  }, [query])

  const active = SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? SETTINGS_SECTIONS[0]
  const ActivePanel = active.Panel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[720px] max-h-[85vh] w-[calc(100%-2rem)] grid-cols-[12rem_1fr] gap-0 overflow-hidden p-0 sm:max-w-[960px]">
        {/* a11y: the modal still needs a title/description, visually hidden. */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Account and study preferences</DialogDescription>

        {/* Left: section rail. */}
        <aside className="flex h-full flex-col gap-2 overflow-y-auto border-r border-border bg-surface-1 p-3 [scrollbar-width:thin]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              strokeWidth={2}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings"
              className="pl-8"
            />
          </div>

          <div className="flex flex-col gap-px">
            <div className="select-none px-2 pb-1 pt-4 text-xs text-text-muted">Settings</div>
            {filtered.map(({ id, label, icon: Icon }) => {
              const isActive = id === activeId
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveId(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'can-focus flex h-8 w-full cursor-pointer select-none items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-alpha-2 font-medium text-text-100'
                      : 'text-text-secondary hover:bg-fill-ghost-hover hover:text-text-100'
                  )}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-sm text-text-muted">No matches</div>
            )}
          </div>
        </aside>

        {/* Right: active section content. Scrolls independently; pt-16 lines the first heading up
            with the "Settings" label on the left and clears the close button. */}
        <div className="min-w-0 overflow-y-auto bg-surface-2 px-6 pb-8 pt-16 [scrollbar-width:thin]">
          <ActivePanel />
        </div>
      </DialogContent>
    </Dialog>
  )
}
