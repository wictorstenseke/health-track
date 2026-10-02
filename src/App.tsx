import { memo, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ErrorToast } from './components/ErrorToast'
import { TabBar } from './components/TabBar'
import { EntriesProvider, useProfile } from './db/hooks'
import { routeToHash, tabOf, tabsFor, useRoute, type Route } from './lib/router'
import { DetailScreen } from './screens/DetailScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MeasuresScreen } from './screens/MeasuresScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SetupScreen } from './screens/SetupScreen'

// Every route change re-renders Screens; memo stops the hidden tabs (and their charts) re-rendering with it.
const Home = memo(HomeScreen)
const Measures = memo(MeasuresScreen)
const Settings = memo(SettingsScreen)

/** The toast sits outside the screens so it covers every one of them, including setup. */
export function App() {
  return (
    <>
      <EntriesProvider>
        <Screens />
      </EntriesProvider>
      <ErrorToast />
    </>
  )
}

function Screens() {
  const profile = useProfile()
  const route = useRoute()
  useScrollPerScreen(route)

  if (!profile) return null
  const setupOnly = !profile.name
  const tab = tabOf(route, profile.demo)
  const isDetail = route.name === 'metric'

  return (
    <div className="relative mx-auto max-w-md">
      {/* Setup keeps this first slot both alone and as the demo's tab, so ending the demo there keeps what was typed. */}
      {(setupOnly || profile.demo) && (
        <TabPanel shown={setupOnly || (tab === 'setup' && !isDetail)}>
          <SetupScreen demo={profile.demo} />
        </TabPanel>
      )}
      {!setupOnly && (
        <>
          <TabPanel shown={tab === 'home' && !isDetail}>
            <Home name={profile.name} />
          </TabPanel>
          <TabPanel shown={tab === 'measures' && !isDetail}>
            <Measures />
          </TabPanel>
          <TabPanel shown={tab === 'settings' && !isDetail}>
            <Settings profile={profile} />
          </TabPanel>
          {isDetail && <DetailScreen metricId={route.metricId} heightCm={profile.heightCm} />}
          <TabBar tabs={tabsFor(profile.demo)} active={tab} />
        </>
      )}
    </div>
  )
}

/**
 * Tabs stay mounted so switching is instant and keeps their state. A hidden tab takes no space but keeps
 * its width; `display: none` would collapse the charts to zero and make them re-measure and redraw on return.
 */
function TabPanel({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <div inert={!shown} className={shown ? undefined : 'invisible absolute inset-x-0 top-0 h-0 overflow-hidden'}>
      {children}
    </div>
  )
}

/** Each tab keeps its own scroll position; a detail screen opens at the top. */
function useScrollPerScreen(route: Route) {
  const positions = useRef(new Map<string, number>())
  const key = routeToHash(route)
  const isDetail = route.name === 'metric'

  useLayoutEffect(() => {
    window.scrollTo(0, isDetail ? 0 : (positions.current.get(key) ?? 0))
    const onScroll = () => positions.current.set(key, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key, isDetail])
}
