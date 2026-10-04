// Rich text: render <b>…</b> kept from the source as bold; drop all other tags.

export function Highlighted({ text, className }: { text: string; className?: string }): React.JSX.Element {
  const parts = text.split(/(<b>|<\/b>)/i)
  let bold = false
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (/^<b>$/i.test(p)) {
          bold = true
          return null
        }
        if (/^<\/b>$/i.test(p)) {
          bold = false
          return null
        }
        return bold ? (
          <strong key={i} className="font-semibold text-text-primary">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      })}
    </span>
  )
}
