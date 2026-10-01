import type { ComponentType } from 'react'
import { sv } from '../i18n/sv'
import { navigate, type TabName } from '../lib/router'
import { HomeIcon, RulerIcon, SlidersIcon } from './icons'

const TABS: { name: TabName; label: string; Icon: ComponentType }[] = [
  { name: 'home', label: sv.tabs.home, Icon: HomeIcon },
  { name: 'measures', label: sv.tabs.measures, Icon: RulerIcon },
  { name: 'settings', label: sv.tabs.settings, Icon: SlidersIcon },
]

/** Floating glass capsule, icons only; a grey pill glides under the active tab and its icon pops. */
export function TabBar({ active }: { active: TabName }) {
  const index = TABS.findIndex((tab) => tab.name === active)
  return (
    // The wrapper spans the screen but lets taps through; only the capsule catches them.
    <nav className="pointer-events-none fixed inset-x-0 bottom-(--tab-bar-bottom) z-30 px-6">
      <ul className="pointer-events-auto relative mx-auto flex h-(--tab-bar-height) max-w-60 rounded-full border border-white/70 bg-surface/70 dark:border-white/10 p-1.5 shadow-[0_10px_30px_-8px_rgb(20_20_22/0.25)] backdrop-blur-xl backdrop-saturate-150">
        <li
          aria-hidden="true"
          className="absolute inset-y-1.5 left-1.5 rounded-full bg-ink/[0.06] dark:bg-ink/10 transition-transform duration-[350ms] ease-[cubic-bezier(0.3,1.25,0.5,1)] motion-reduce:transition-none"
          style={{ width: `calc((100% - 0.75rem) / ${TABS.length})`, transform: `translateX(${index * 100}%)` }}
        />
        {TABS.map(({ name, label, Icon }) => (
          <li key={name} className="relative flex-1">
            <button
              type="button"
              onClick={() => navigate({ name }, { replace: true })}
              aria-label={label}
              aria-current={active === name ? 'page' : undefined}
              className={`flex h-full w-full items-center justify-center rounded-full transition-colors duration-300 ${active === name ? 'text-ink' : 'text-muted'}`}
            >
              <span className={active === name ? 'tab-pop' : undefined}>
                <Icon />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
