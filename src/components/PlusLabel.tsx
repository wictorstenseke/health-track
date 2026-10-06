import type { ReactNode } from 'react'
import { PlusIcon } from './icons'

/**
 * A plus and its label in ember: what every "add" text button shows. The gap is small because the icon
 * already has 5 px of air around its strokes.
 */
export function PlusLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 font-medium text-ember-600 dark:text-ember-400">
      <PlusIcon />
      {children}
    </span>
  )
}
