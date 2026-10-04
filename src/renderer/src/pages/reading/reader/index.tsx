import { Reader } from './Reader'

/**
 * Reader route entry (/reader/:bookHash): a standalone full-screen page outside AppShell (no app sidebar).
 *
 * Reader's root is flex-1 (so it can embed in toolbar containers like the Demo gallery); this wrapper
 * adds h-screen/w-screen so opening a book fills the whole window, like readest.
 */
export default function ReaderPage(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-page-bg">
      <Reader />
    </div>
  )
}
