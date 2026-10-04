import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, FlaskConical, LayoutGrid, Library, Palette, Plus, Search, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from '@/components/ui'
import { appBridge } from '@/platform'
import appIcon from '@/assets/app-icon.png'

/**
 * App sidebar: primary navigation (My words / Dictionary / Reading / Resources), a quick "Add word" entry
 * (opens the capture window) and Settings at the bottom.
 */

const NAV_ITEMS = [
  { path: '/wordbook', label: 'My words', icon: Library },
  { path: '/lookup', label: 'Dictionary', icon: Search },
  { path: '/reading', label: 'Reading', icon: BookOpen },
  { path: '/resources', label: 'Resources', icon: LayoutGrid },
] as const

export interface AppSidebarProps {
  onOpenSettings: () => void
}

export function AppSidebar({ onOpenSettings }: AppSidebarProps): React.JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <Sidebar>
      <SidebarHeader logo={<Logo />} />
      <SidebarBody>
        <SidebarGroup>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <SidebarItem
              key={path}
              icon={<Icon className="size-[18px]" strokeWidth={2} />}
              active={pathname.startsWith(path)}
              onClick={() => navigate(path)}
            >
              {label}
            </SidebarItem>
          ))}
          <SidebarItem icon={<Plus className="size-[18px]" strokeWidth={2} />} onClick={() => void appBridge.openCapture('')}>
            Add a word
          </SidebarItem>
        </SidebarGroup>

        {/* DEV only:UI demo gallery and component browser; not rendered in production. */}
        {import.meta.env.DEV && (
          <SidebarGroup>
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
      <SidebarFooter
        name="Settings"
        caption="Reminders, hotkey, AI"
        avatar={
          <span className="flex size-full items-center justify-center rounded-full bg-bg-neutral text-text-secondary">
            <Settings className="size-4" strokeWidth={2} />
          </span>
        }
        onClick={onOpenSettings}
      />
    </Sidebar>
  )
}

function Logo(): React.JSX.Element {
  return (
    <span className="flex select-none items-center gap-2.5">
      <img src={appIcon} alt="" className="size-7 -my-1" draggable={false} />
      <span className="text-lg font-semibold leading-none tracking-tight text-text-100">
        Lượm
      </span>
    </span>
  )
}
