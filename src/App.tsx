import { useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { useProfile } from './db/hooks'
import { sv } from './i18n/sv'
import { routeToHash, useRoute } from './lib/router'
import { DetailScreen } from './screens/DetailScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SetupScreen } from './screens/SetupScreen'

/** Stand-in until the real screen lands (Task 11). */
function Placeholder({ title }: { title: string }) {
  return <main className="px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-3xl font-semibold tracking-tight">{title}</main>
}

export function App() {
  const profile = useProfile()
  const route = useRoute()
  const hash = routeToHash(route)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [hash])

  if (!profile) return null
  if (!profile.name) return <SetupScreen />

  return (
    <div className="mx-auto max-w-md">
      {route.name === 'home' && <HomeScreen name={profile.name} />}
      {route.name === 'measures' && <Placeholder title={sv.tabs.measures} />}
      {route.name === 'settings' && <SettingsScreen profile={profile} />}
      {route.name === 'metric' && <DetailScreen metricId={route.metricId} heightCm={profile.heightCm} />}
      {route.name !== 'metric' && <TabBar active={route.name} />}
    </div>
  )
}
