import { useEffect } from 'react'
import { ErrorToast } from './components/ErrorToast'
import { TabBar } from './components/TabBar'
import { useProfile } from './db/hooks'
import { routeToHash, useRoute } from './lib/router'
import { DetailScreen } from './screens/DetailScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MeasuresScreen } from './screens/MeasuresScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SetupScreen } from './screens/SetupScreen'

/** The toast sits outside the screens so it covers every one of them, including setup. */
export function App() {
  return (
    <>
      <Screens />
      <ErrorToast />
    </>
  )
}

function Screens() {
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
      {route.name === 'measures' && <MeasuresScreen />}
      {route.name === 'settings' && <SettingsScreen profile={profile} />}
      {route.name === 'metric' && <DetailScreen metricId={route.metricId} heightCm={profile.heightCm} />}
      {route.name !== 'metric' && <TabBar active={route.name} />}
    </div>
  )
}
