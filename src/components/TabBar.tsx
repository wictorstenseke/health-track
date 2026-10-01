import type { ComponentType } from 'react'
import { sv } from '../i18n/sv'
import { navigate, type TabName } from '../lib/router'
import { HomeIcon, RulerIcon, SlidersIcon } from './icons'

const TABS: { name: TabName; label: string; Icon: ComponentType }[] = [
  { name: 'home', label: sv.tabs.home, Icon: HomeIcon },
  { name: 'measures', label: sv.tabs.measures, Icon: RulerIcon },
  { name: 'settings', label: sv.tabs.settings, Icon: SlidersIcon },
]

/** Floating glass capsule, icons only; the active tab sits on a grey pill. */
export function TabBar({ active }: { active: TabName }) {
  return (
    // The wrapper spans the screen but lets taps through; only the capsule catches them.
    <nav className="pointer-events-none fixed inset-x-0 bottom-(--tab-bar-bottom) z-30 px-6">
      <ul className="pointer-events-auto mx-auto flex h-(--tab-bar-height) max-w-sm rounded-full border border-white/70 bg-white/70 p-1.5 shadow-[0_10px_30px_-8px_rgb(20_20_22/0.25)] backdrop-blur-xl backdrop-saturate-150">
        {TABS.map(({ name, label, Icon }) => (
          <li key={name} className="flex-1">
            <button
              type="button"
              onClick={() => navigate({ name }, { replace: true })}
              aria-label={label}
              aria-current={active === name ? 'page' : undefined}
              className={`flex h-full w-full items-center justify-center rounded-full transition-colors ${active === name ? 'bg-black/[0.06] text-ink' : 'text-zinc-500'}`}
            >
              <Icon />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
