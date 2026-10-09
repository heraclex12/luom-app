import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, FlaskConical, Gamepad2, LayoutGrid, Library, Palette, Plus, Search, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from '@/components/ui'
import { appBridge } from '@/platform'
import { activeNavPath } from './nav'
import { FreeAnswers } from './FreeAnswers'
import appIcon from '@/assets/app-icon.png'

/**
 * App sidebar, soft grey like the website's surfaces: "Add a word" (opens the capture window) as the one green pill, then the
 * primary navigation (My words / Play / Dictionary / Reading / Resources), then, on Lượm (Free), today's free AI
 * answers left, and Settings at the bottom. Labels match the page titles they open.
 */

const NAV_ITEMS = [
  { path: '/wordbook', label: 'My words', icon: Library },
  { path: '/wordbook/play', label: 'Play', icon: Gamepad2 },
  { path: '/lookup', label: 'Dictionary', icon: Search },
  { path: '/reading', label: 'Reading', icon: BookOpen },
  { path: '/resources', label: 'Resources', icon: LayoutGrid },
] as const

export interface AppSidebarProps {
  /** Open settings, optionally on one section ('ai' from the free answers meter). */
  onOpenSettings: (section?: string) => void
}

export function AppSidebar({ onOpenSettings }: AppSidebarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = activeNavPath(pathname)

  return (
    <Sidebar>
      <SidebarHeader logo={<Logo />} />
      <SidebarBody>
        <div className="px-2 pb-3 pt-1">
          <button
            type="button"
            onClick={() => void appBridge.openCapture('')}
            className="btn-squish can-focus flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-full bg-fill-brand px-3.5 text-sm font-semibold text-on-brand shadow-sm transition-colors hover:bg-fill-brand-hover in-data-collapsed:justify-center in-data-collapsed:px-0"
          >
            <Plus className="size-[18px] shrink-0" strokeWidth={2.25} />
            <span className="flex-1 truncate text-start in-data-collapsed:hidden">Add a word</span>
            <kbd className="font-sans text-xs font-medium text-on-brand/75 in-data-collapsed:hidden">⌘N</kbd>
          </button>
        </div>
        <SidebarGroup>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <SidebarItem
              key={path}
              icon={<Icon className="size-[18px]" strokeWidth={2} />}
              active={active === path}
              onClick={() => navigate(path)}
            >
              {label}
            </SidebarItem>
          ))}
        </SidebarGroup>

        {/* DEV only: UI demo gallery and component browser; not rendered in production. */}
        {import.meta.env.DEV && (
          <SidebarGroup label="Development">
            <SidebarItem
              icon={<FlaskConical className="size-[18px]" strokeWidth={2} />}
              active={pathname.startsWith('/demos')}
              onClick={() => navigate('/demos')}
            >
              UI Demo
            </SidebarItem>
            <SidebarItem
              icon={<Palette className="size-[18px]" strokeWidth={2} />}
              active={pathname.startsWith('/gallery')}
              onClick={() => navigate('/gallery')}
            >
              Components
            </SidebarItem>
          </SidebarGroup>
        )}
      </SidebarBody>
      <FreeAnswers onOpen={() => onOpenSettings('ai')} />
      <SidebarFooter
        name="Settings"
        caption="Reminders, hotkey, AI"
        avatar={
          <span className="flex size-full items-center justify-center rounded-full bg-rail-active text-rail-fg shadow-sm">
            <Settings className="size-4" strokeWidth={2} />
          </span>
        }
        onClick={() => onOpenSettings()}
      />
    </Sidebar>
  )
}

function Logo(): React.JSX.Element {
  return (
    <span className="flex select-none items-center gap-2.5">
      <img src={appIcon} alt="" className="-my-1 size-7" draggable={false} />
      <span className="font-display text-xl leading-none text-rail-fg">Lượm</span>
    </span>
  )
}
