import { useState } from 'react'
import { DecimalField, TextField } from '../components/Fields'
import { ImportCsv } from '../components/ImportCsv'
import { clearAllData } from '../db/entries'
import { useAllEntries } from '../db/hooks'
import { setHeightCm, setName, type Profile } from '../db/settings'
import { sv } from '../i18n/sv'
import { exportCsv } from '../io/csvFiles'
import { formatRelativeDay, parseDecimal } from '../lib/format'
import { isValidHeight } from '../lib/metrics'
import { navigate } from '../lib/router'

const card = 'rounded-[28px] bg-white p-5 shadow-card'

export function SettingsScreen({ profile }: { profile: Profile }) {
  const [name, setNameText] = useState(profile.name)
  const [height, setHeight] = useState(profile.heightCm === null ? '' : String(profile.heightCm).replace('.', ','))
  const heightValue = parseDecimal(height)
  const heightInvalid = height.trim() !== '' && (heightValue === null || !isValidHeight(heightValue))

  const saveName = () => {
    if (name.trim() !== '') void setName(name)
  }

  const saveHeight = () => {
    if (height.trim() === '') void setHeightCm(null)
    else if (heightValue !== null && !heightInvalid) void setHeightCm(heightValue)
  }

  const [exportFailed, setExportFailed] = useState(false)
  const [exporting, setExporting] = useState(false)
  // Loaded up front so the share sheet can open synchronously inside the tap.
  const entries = useAllEntries()

  const runExport = async () => {
    if (exporting) return
    setExportFailed(false)
    setExporting(true)
    try {
      await exportCsv(entries)
    } catch {
      setExportFailed(true)
    } finally {
      setExporting(false)
    }
  }

  const deleteAll = async () => {
    if (!window.confirm(sv.settings.confirmDeleteAll) || !window.confirm(sv.settings.confirmDeleteAllAgain)) return
    await clearAllData()
    // Back to the start route so the app lands on Hem after the new setup.
    navigate({ name: 'home' })
  }

  return (
    <main className="space-y-4 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-28">
      <h1 className="text-3xl font-semibold tracking-tight">{sv.settings.title}</h1>

      <section className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">{sv.settings.profile}</h2>
        <TextField label={sv.settings.name} value={name} onChange={setNameText} onBlur={saveName} autoComplete="given-name" />
        <DecimalField label={sv.settings.height} unit="cm" value={height} onChange={setHeight} onBlur={saveHeight} invalid={heightInvalid} />
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="text-lg font-semibold">{sv.settings.data}</h2>
        <ImportCsv />
        <button
          type="button"
          disabled={exporting}
          onClick={() => void runExport()}
          className="w-full rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-40"
        >
          {sv.settings.exportCsv}
        </button>
        {exportFailed && (
          <p role="alert" className="text-center text-sm text-red-600">
            {sv.settings.exportFailed}
          </p>
        )}
        <p className="text-center text-sm text-zinc-500">
          {profile.lastExportAt === null
            ? sv.settings.neverExported
            : sv.settings.lastExport(formatRelativeDay(profile.lastExportAt, Date.now()))}
        </p>
      </section>

      <button type="button" onClick={() => void deleteAll()} className="w-full rounded-full bg-red-50 py-3 font-semibold text-red-600">
        {sv.settings.deleteAll}
      </button>
      <p className="text-center text-xs text-zinc-400">{sv.settings.version(__APP_VERSION__)}</p>
    </main>
  )
}
