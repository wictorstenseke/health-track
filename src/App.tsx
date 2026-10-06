import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ErrorToast } from './components/ErrorToast'
import { TabBar } from './components/TabBar'
import { DataProvider, useMetrics, useProfile } from './db/hooks'
import { detailMetricId, routeToHash, tabOf, tabsFor, useRoute, type Route, type TabName } from './lib/router'
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
      <DataProvider>
        <Screens />
      </DataProvider>
      <ErrorToast />
    </>
  )
}

function Screens() {
  const profile = useProfile()
  const route = useRoute()
  const metrics = useMetrics()
  const detailId = detailMetricId(route, metrics.map((m) => m.id))
  const isDetail = detailId !== null
  useScrollPerScreen(route, isDetail)
  const tab = tabOf(route, profile?.demo)
  const { enter, leaving } = useTabEnter(tab, tabsFor(profile?.demo ?? false), isDetail)

  if (!profile) return null
  const setupOnly = !profile.name

  return (
    <div className="relative mx-auto max-w-md overflow-x-clip">
      {/* Setup keeps this first slot both alone and as the demo's tab, so ending the demo there keeps what was typed. */}
      {(setupOnly || profile.demo) && (
        <TabPanel name="setup" shown={setupOnly || (tab === 'setup' && !isDetail)} enter={enter} leaving={leaving}>
          <SetupScreen demo={profile.demo} />
        </TabPanel>
      )}
      {!setupOnly && (
        <>
          <TabPanel name="home" shown={tab === 'home' && !isDetail} enter={enter} leaving={leaving}>
            <Home name={profile.name} />
          </TabPanel>
          <TabPanel name="measures" shown={tab === 'measures' && !isDetail} enter={enter} leaving={leaving}>
            <Measures />
          </TabPanel>
          <TabPanel name="settings" shown={tab === 'settings' && !isDetail} enter={enter} leaving={leaving}>
            <Settings profile={profile} />
          </TabPanel>
          {detailId !== null && <DetailScreen metricId={detailId} heightCm={profile.heightCm} />}
          <TabBar tabs={tabsFor(profile.demo)} active={tab} />
        </>
      )}
    </div>
  )
}
type TabEnter = 'left' | 'right' | null
type Leaving = { tab: TabName; toward: 'left' | 'right'; scrollY: number } | null

/**
 * Which side the newly shown tab's page slides in from: the side its tab sits on, relative to the previous one.
 * The page left behind slides out the other way for as long as the animation runs.
 * Null on first render and around detail screens, so opening or closing one never slides a tab.
 */
function useTabEnter(tab: TabName, tabs: TabName[], isDetail: boolean): { enter: TabEnter; leaving: Leaving } {
  const [prev, setPrev] = useState(tab)
  const [enter, setEnter] = useState<TabEnter>(null)
  const [leaving, setLeaving] = useState<Leaving>(null)
  if (tab !== prev) {
    setPrev(tab)
    const forward = tabs.indexOf(tab) > tabs.indexOf(prev)
    setEnter(isDetail ? null : forward ? 'right' : 'left')
    // Read now: the scroll jumps to the new tab's position right after this render commits.
    setLeaving(isDetail ? null : { tab: prev, toward: forward ? 'left' : 'right', scrollY: window.scrollY })
  } else if (isDetail && (enter !== null || leaving !== null)) {
    setEnter(null)
    setLeaving(null)
  }
  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setLeaving(null), 400)
    return () => window.clearTimeout(id)
  }, [leaving])
  return { enter, leaving }
}

/**
 * Tabs stay mounted so switching is instant and keeps their state. A hidden tab takes no space but keeps
 * its width; `display: none` would collapse the charts to zero and make them re-measure and redraw on return.
 * A tab just left is pinned over the screen, offset by where it was scrolled, while it slides away.
 */
function TabPanel({ name, shown, enter, leaving, children }: { name: TabName; shown: boolean; enter: TabEnter; leaving: Leaving; children: ReactNode }) {
  const shownClass = enter === 'right' ? 'tab-enter-from-right' : enter === 'left' ? 'tab-enter-from-left' : undefined
  if (!shown && leaving?.tab === name) {
    return (
      <div
        inert
        aria-hidden="true"
        style={{ top: -leaving.scrollY }}
        className={`pointer-events-none fixed inset-x-0 mx-auto max-w-md ${leaving.toward === 'left' ? 'tab-leave-to-left' : 'tab-leave-to-right'}`}
      >
        {children}
      </div>
    )
  }
  return (
    <div inert={!shown} className={shown ? shownClass : 'invisible absolute inset-x-0 top-0 h-0 overflow-hidden'}>
      {children}
    </div>
  )
}

/** Each tab keeps its own scroll position; a detail screen opens at the top. */
function useScrollPerScreen(route: Route, isDetail: boolean) {
  const positions = useRef(new Map<string, number>())
  const key = routeToHash(route)

  useLayoutEffect(() => {
    window.scrollTo(0, isDetail ? 0 : (positions.current.get(key) ?? 0))
    const onScroll = () => positions.current.set(key, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key, isDetail])
}
