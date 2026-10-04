import * as React from 'react'
import {
  PanelLeft,
  Search,
  Plus,
  MessageSquare,
  Layers,
  Code2,
  Briefcase,
  Palette,
  FlaskConical,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Left navigation sidebar, collapsible (49px ↔ 288px).
 * When collapsed, content keeps full width, the nav is clipped, labels fade out and icons stay clickable.
 */

type Ctx = { collapsed: boolean; toggle: () => void }
const SidebarCtx = React.createContext<Ctx | null>(null)
const useSidebar = () => {
  const c = React.useContext(SidebarCtx)
  if (!c) throw new Error('Sidebar.* must be used inside <Sidebar>')
  return c
}

export interface SidebarProps extends React.ComponentPropsWithoutRef<'nav'> {
  defaultCollapsed?: boolean
}

export function Sidebar({ defaultCollapsed = false, className, children, ...props }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
  const toggle = React.useCallback(() => setCollapsed((c) => !c), [])
  return (
    <SidebarCtx.Provider value={{ collapsed, toggle }}>
      <nav
        aria-label="Sidebar"
        data-collapsed={collapsed || undefined}
        className={cn(
          'flex flex-col h-screen shrink-0 overflow-hidden bg-bg-100 border-r-[0.5px] border-border-300',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[3.0625rem]' : 'w-72',
          className
        )}
        {...props}
      >
        {children}
      </nav>
    </SidebarCtx.Provider>
  )
}

/** Top: logo slot + search + collapse toggle. The search button only renders when onSearch is given. */
export function SidebarHeader({ logo, onSearch }: { logo?: React.ReactNode; onSearch?: () => void }) {
  const { collapsed, toggle } = useSidebar()
  return (
    <div className="relative flex w-full items-center h-12 px-2">
      <div
        className={cn(
          'flex items-center h-8 pl-2 overflow-clip transition-opacity duration-150',
          collapsed && 'opacity-0 pointer-events-none'
        )}
      >
        {logo ?? <DefaultLogo />}
      </div>
      <div
        className={cn(
          'absolute top-2 flex items-center gap-1 transition-all duration-150',
          collapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'
        )}
      >
        {!collapsed && onSearch && (
          <IconButton aria-label="Search" onClick={onSearch}>
            <Search className="size-4" strokeWidth={2} />
          </IconButton>
        )}
        <IconButton aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'} onClick={toggle}>
          <PanelLeft className="size-4" strokeWidth={2} />
        </IconButton>
      </div>
    </div>
  )
}

/** Small header icon button (ghost) */
function IconButton({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'group/btn relative isolate inline-flex shrink-0 items-center justify-center',
        'size-6 rounded-md border-0 outline-none select-none cursor-pointer',
        'text-text-300 transition-colors hover:text-text-100 focus-visible:shadow-focus',
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 -z-[1] rounded-[inherit] transition-colors duration-[60ms] bg-transparent group-hover/btn:bg-fill-ghost-hover" />
      {children}
    </button>
  )
}

/** Primary action (e.g. "+ New") */
export function SidebarAction({
  icon = <Plus className="size-[1.05rem]" strokeWidth={2.25} />,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const { collapsed } = useSidebar()
  return (
    <div className="px-2 pt-2">
      <button
        type="button"
        className={cn(
          'group inline-flex items-center w-full h-8 rounded-[9px] px-2 gap-3 overflow-hidden',
          'can-focus select-none text-sm text-text-100 transition-colors',
          'hover:bg-fill-ghost-hover active:bg-bg-300 cursor-pointer',
          collapsed && 'justify-center gap-0 px-0'
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <span className="flex items-center justify-center rounded-full size-[1.4rem] -mx-[0.2rem] bg-text-500/15 group-hover:bg-text-500/25 transition-colors text-text-100">
            {icon}
          </span>
        </span>
        <Label collapsed={collapsed}>{children}</Label>
      </button>
    </div>
  )
}

/** Single nav item */
export function SidebarItem({
  icon,
  active,
  disabled,
  badge,
  action,
  onClick,
  children,
}: {
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
  badge?: React.ReactNode
  action?: React.ReactNode
  onClick?: React.MouseEventHandler
  children: React.ReactNode
}) {
  const { collapsed } = useSidebar()
  return (
    <a
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'group can-focus relative flex items-center w-full h-8 rounded-[9px] px-2 gap-3 overflow-hidden',
        'select-none text-sm transition-colors cursor-pointer',
        collapsed && 'justify-center gap-0 px-0',
        disabled
          ? 'text-text-400/40 pointer-events-none'
          : active
            ? 'bg-bg-300 text-text-100'
            : 'text-text-300 hover:bg-fill-ghost-hover hover:text-text-100'
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center',
          disabled ? 'text-text-400/40' : 'text-text-100'
        )}
      >
        {icon}
      </span>
      <Label collapsed={collapsed}>{children}</Label>
      {badge && !collapsed && <span className="shrink-0">{badge}</span>}
      {action && !collapsed && (
        <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-400">
          {action}
        </span>
      )}
    </a>
  )
}

/** Group container + label */
export function SidebarGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className={cn('flex flex-col px-2 gap-px', label ? 'mt-4' : 'mt-px')}>
      {label && (
        <div
          className={cn(
            'flex items-center mt-1 pb-1 pl-2 text-xs text-text-500 select-none transition-opacity duration-150',
            collapsed && 'opacity-0'
          )}
        >
          <span className="truncate">{label}</span>
        </div>
      )}
      {children}
    </div>
  )
}

/** Empty-state placeholder */
export function SidebarEmpty({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-8 text-center transition-opacity duration-150',
        collapsed && 'opacity-0'
      )}
    >
      <p className="text-sm text-text-500">{children}</p>
    </div>
  )
}

/** Scrollable body */
export function SidebarBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-grow overflow-y-auto overflow-x-hidden min-h-0 pt-0">
      {children}
    </div>
  )
}

/**
 * Bottom user area (64px expanded): 0.5px top divider, full-width button (hover highlight edge to edge).
 * Avatar defaults to an initials circle; pass `avatar` for any node (placed in a square slot that
 * scales with collapse; the content should use `size-full`).
 */
export function SidebarFooter({
  initials = 'U',
  avatar,
  name = 'User name',
  caption = 'Caption',
  onClick,
}: {
  initials?: string
  avatar?: React.ReactNode
  name?: string
  caption?: string
  onClick?: React.MouseEventHandler
}) {
  const { collapsed } = useSidebar()
  return (
    <div className="border-t-[0.5px] border-border-300">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${name}, Settings`}
        className={cn(
          'group inline-flex items-center w-full px-3.5 gap-2 overflow-hidden h-16',
          'can-focus select-none transition-colors hover:bg-fill-ghost-hover cursor-pointer',
          collapsed && 'justify-center gap-0 px-0'
        )}
      >
        <span
          className={cn(
            'relative shrink-0 transition-[width,height] duration-150',
            collapsed ? 'size-8' : 'size-9'
          )}
        >
          {avatar ?? (
            <span className="flex size-full items-center justify-center rounded-full text-[15px] font-bold select-none bg-text-200 text-bg-100">
              {initials}
            </span>
          )}
        </span>
        <span
          className={cn(
            'flex flex-1 items-center justify-between min-w-0 transition-opacity duration-150',
            collapsed && 'w-0 flex-none opacity-0'
          )}
        >
          <span className="flex flex-col items-start min-w-0 flex-1 pr-1">
            <span className="w-full text-start truncate text-sm font-medium text-text-100">{name}</span>
            <span className="w-full text-start truncate text-xs font-normal text-text-500">{caption}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-400" strokeWidth={2} />
        </span>
      </button>
    </div>
  )
}

function Label({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'truncate whitespace-nowrap flex-1 text-start transition-opacity duration-150',
        collapsed && 'w-0 flex-none opacity-0'
      )}
    >
      {children}
    </span>
  )
}

function DefaultLogo() {
  return <span className="text-xl font-semibold leading-none text-text-100 select-none">Logo</span>
}

/** Small pill badge (for disabled items) */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border-[0.5px] border-border-300 px-2 py-0.5 text-[11px] font-medium text-accent-100">
      {children}
    </span>
  )
}

/** Interactive example Sidebar for previews / dev. */
export default function SidebarDemo({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const [active, setActive] = React.useState('Option 1')
  const navItems = [
    { id: 'Option 1', icon: <MessageSquare className="size-[18px]" strokeWidth={2} /> },
    { id: 'Option 2', icon: <Layers className="size-[18px]" strokeWidth={2} /> },
    { id: 'Option 4', icon: <Briefcase className="size-[18px]" strokeWidth={2} /> },
  ]
  return (
    <Sidebar defaultCollapsed={defaultCollapsed}>
      <SidebarHeader />
      <SidebarBody>
        <SidebarAction>New</SidebarAction>
        <SidebarGroup>
          <SidebarItem
            icon={navItems[0].icon}
            active={active === 'Option 1'}
            onClick={() => setActive('Option 1')}
          >
            Option 1
          </SidebarItem>
          <SidebarItem
            icon={navItems[1].icon}
            active={active === 'Option 2'}
            onClick={() => setActive('Option 2')}
          >
            Option 2
          </SidebarItem>
          <SidebarItem icon={<Code2 className="size-[18px]" strokeWidth={2} />} disabled badge={<Pill>Upgrade</Pill>}>
            Option 3
          </SidebarItem>
          <SidebarItem
            icon={navItems[2].icon}
            active={active === 'Option 4'}
            onClick={() => setActive('Option 4')}
          >
            Option 4
          </SidebarItem>
        </SidebarGroup>
        <SidebarGroup label="Group">
          <SidebarItem
            icon={<Palette className="size-[18px]" strokeWidth={2} />}
            active={active === 'Sub-item 1'}
            onClick={() => setActive('Sub-item 1')}
            action={<FlaskConical className="size-4" strokeWidth={2} />}
          >
            Sub-item 1
          </SidebarItem>
        </SidebarGroup>
        <SidebarEmpty>Nothing here yet</SidebarEmpty>
      </SidebarBody>
      <SidebarFooter name="Preview user" caption="Free plan" initials="P" />
    </Sidebar>
  )
}
