/**
 * Shared SVG filters for the seal's ink impression (mounted once per window, see main.tsx):
 * - envi-ink: the chop pressed onto dó paper. Edges break up (displacement) and the ink lifts in small specks
 *   where the paper fibres didn't take it (a grain mask cut out of the inked shape).
 * - envi-ink-sm: small seals (16px) only get the slightly broken edge; grain there would muddy the carved letter.
 */
export function InkDefs(): React.JSX.Element {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="envi-ink" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="edgeNoise" />
          <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 2.55" result="grainMask" />
          <feComposite in="rough" in2="grainMask" operator="in" />
        </filter>
        <filter id="envi-ink-sm" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="11" result="edgeNoise" />
          <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="0.7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
