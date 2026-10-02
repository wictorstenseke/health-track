import { useState } from 'react'
import { Group } from '../components/GroupedList'
import { ImportCsv } from '../components/ImportCsv'
import { ProfileRows } from '../components/ProfileRows'
import { setHeightCm, setName } from '../db/settings'
import { sv } from '../i18n/sv'
import { parseDecimal } from '../lib/format'
import { isValidHeight } from '../lib/metrics'

export function SetupScreen() {
  const [name, setNameText] = useState('')
  const [height, setHeight] = useState('')
  const heightValue = parseDecimal(height)
  const heightOk = height.trim() === '' || (heightValue !== null && isValidHeight(heightValue))
  const canStart = name.trim() !== '' && heightOk

  const start = async () => {
    if (!canStart) return
    if (heightValue !== null) await setHeightCm(heightValue)
    // Name last: saving it switches the app from setup to home.
    await setName(name)
  }

  return (
    <main className="space-y-7 px-4 pt-(--screen-top) pb-10">
      <div className="hero-gradient rounded-[36px] px-4 py-12 text-center">
        <h1 className="font-display text-3xl text-balance text-white text-sticker">{sv.setup.title}</h1>
      </div>
      <Group label={sv.settings.profile}>
        <ProfileRows name={name} onNameChange={setNameText} height={height} onHeightChange={setHeight} heightInvalid={!heightOk} />
      </Group>
      <Group label={sv.setup.importLabel}>
        <ImportCsv />
      </Group>
      <button
        type="button"
        disabled={!canStart}
        onClick={() => void start()}
        className="w-full rounded-full bg-ink py-3 text-lg font-semibold text-on-ink disabled:opacity-40"
      >
        {sv.setup.start}
      </button>
    </main>
  )
}
