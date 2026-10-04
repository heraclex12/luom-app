import notionAvatar from '@/assets/avatars/notion-avatar.svg'
import { Avatar, AvatarImage } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * User avatar: the same hand-drawn illustration for everyone (no avatar upload).
 * Size comes from className (`size-12` / `size-full`…).
 *
 * Constant light background + thin border: the illustration is black line art on white, so a dark
 * background would swallow it. The figure fills ~60% of the canvas, so it's scaled 1.25× to fill the circle.
 */
export function UserAvatar({ className }: { className?: string }): React.JSX.Element {
  return (
    <Avatar className={cn('border border-border-300 bg-always-white', className)}>
      <AvatarImage src={notionAvatar} alt="" className="scale-125" />
    </Avatar>
  )
}
