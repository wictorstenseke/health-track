import type { ComponentType } from 'react'
import { sv } from '../i18n/sv'
import { routeToHash, type TabName } from '../lib/router'
import { HomeIcon, RulerIcon, SlidersIcon } from './icons'

const TABS: { name: TabName; label: string; Icon: ComponentType }[] = [
  { name: 'home', label: sv.tabs.home, Icon: HomeIcon },
  { name: 'measures', label: sv.tabs.measures, Icon: RulerIcon },
  { name: 'settings', label: sv.tabs.settings, Icon: SlidersIcon },
]

export function TabBar({ active }: { active: TabName }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ name, label, Icon }) => (
          <li key={name} className="flex-1">
            <a
              href={routeToHash({ name })}
              aria-current={active === name ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active === name ? 'text-ink' : 'text-zinc-400'}`}
            >
              <Icon />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
