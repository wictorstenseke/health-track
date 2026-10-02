import { useState } from 'react'
import { Group } from '../components/GroupedList'
import { ImportCsv } from '../components/ImportCsv'
import { ProfileRows } from '../components/ProfileRows'
import { startDemo } from '../db/demo'
import { clearAllData } from '../db/entries'
import { useAllEntries } from '../db/hooks'
import { setHeightCm, setName } from '../db/settings'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidHeight } from '../lib/metrics'
import { navigate } from '../lib/router'

/** In demo mode this is the first tab: entering real data here clears the example data first. */
export function SetupScreen({ demo }: { demo: boolean }) {
  const [name, setNameText] = useState('')
  const [height, setHeight] = useState('')
  const heightValue = parseDecimal(height)
  const heightOk = height.trim() === '' || (heightValue !== null && isValidHeight(heightValue))
  const canStart = name.trim() !== '' && heightOk
  // Offered only before any data is in, so the example data never mixes with an import.
  const hasEntries = useAllEntries().length > 0
  const canTryDemo = !demo && !hasEntries

  const start = async () => {
    if (!canStart) return
    if (demo) await clearAllData()
    if (heightValue !== null) await setHeightCm(heightValue)
    // Name last: saving it switches the app from setup to home.
    await setName(name)
    navigate({ name: 'home' }, { replace: true })
  }

  const tryDemo = async () => {
    await startDemo()
    navigate({ name: 'home' }, { replace: true })
  }

  return (
    <main className={`space-y-7 px-4 pt-(--screen-top) ${demo ? 'pb-28' : 'pb-10'}`}>
      <h1 className="flex justify-center pt-6">
        <img
          src={`${import.meta.env.BASE_URL}pwa-512x512.png`}
          alt={sv.setup.title}
          className="size-32 rounded-[29px] shadow-[0_12px_30px_-10px_rgb(20_20_22/0.45)]"
        />
      </h1>
      {demo && <p className="px-2 text-center text-muted text-balance">{sv.setup.demoNote}</p>}
      <Group label={sv.settings.profile}>
        <ProfileRows name={name} onNameChange={setNameText} height={height} onHeightChange={setHeight} heightInvalid={!heightOk} />
      </Group>
      <Group label={sv.setup.importLabel}>
        <ImportCsv onBeforeImport={demo ? clearAllData : undefined} />
      </Group>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => void start()}
          className="h-10 rounded-full bg-ink px-5 text-base font-semibold text-on-ink disabled:opacity-40"
        >
          {sv.setup.start}
        </button>
        {/* Small text with an ember link like the date fields: the second choice after entering your own data. */}
        {canTryDemo && (
          <button type="button" onClick={() => void tryDemo()} className="px-3 py-2 text-sm text-muted">
            <span className="font-medium text-ember-600 dark:text-ember-400">{sv.setup.tryDemo}</span> {sv.setup.tryDemoTail}
          </button>
        )}
      </div>
    </main>
  )
}
