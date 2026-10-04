import { Collapsible as CollapsiblePrimitive } from 'radix-ui'

/**
 * Single expand/collapse container with no height animation by default (instant mount/unmount).
 * For an animation, use --radix-collapsible-content-height with keyframes at the call site.
 */

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
