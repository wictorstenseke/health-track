import { useState } from 'react'
import { DecimalField, TextField } from '../components/Fields'
import { ImportCsv } from '../components/ImportCsv'
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
    <main className="min-h-dvh pb-10">
      <section className="px-4 pt-(--screen-top)">
        <div className="hero-gradient rounded-[36px] px-4 py-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{sv.setup.title}</h1>
        </div>
      </section>
      <div className="mt-4 space-y-4 px-4">
        <section className="space-y-4 rounded-[28px] bg-white p-5 shadow-card">
          <TextField label={sv.setup.nameLabel} value={name} onChange={setNameText} autoComplete="given-name" />
          <DecimalField label={sv.setup.heightLabel} unit="cm" value={height} onChange={setHeight} invalid={!heightOk} />
        </section>
        <section className="rounded-[28px] bg-white p-5 shadow-card">
          <p className="mb-3 text-sm font-medium text-zinc-500">{sv.setup.importLabel}</p>
          <ImportCsv />
        </section>
        <button
          type="button"
          disabled={!canStart}
          onClick={() => void start()}
          className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white disabled:opacity-40"
        >
          {sv.setup.start}
        </button>
      </div>
    </main>
  )
}
