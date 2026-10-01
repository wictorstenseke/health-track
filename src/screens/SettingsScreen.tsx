import { useState } from 'react'
import { DecimalField, TextField } from '../components/Fields'
import { ImportCsv } from '../components/ImportCsv'
import { clearAllData } from '../db/entries'
import { setHeightCm, setName, type Profile } from '../db/settings'
import { sv } from '../i18n/sv'
import { exportCsv } from '../io/csvFiles'
import { formatRelativeDay, parseDecimal } from '../lib/format'
import { isValidHeight } from '../lib/metrics'

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

  const deleteAll = () => {
    if (window.confirm(sv.settings.confirmDeleteAll) && window.confirm(sv.settings.confirmDeleteAllAgain)) void clearAllData()
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
        <button type="button" onClick={() => void exportCsv()} className="w-full rounded-full bg-ink py-3 font-semibold text-white">
          {sv.settings.exportCsv}
        </button>
        <p className="text-center text-sm text-zinc-500">
          {profile.lastExportAt === null
            ? sv.settings.neverExported
            : sv.settings.lastExport(formatRelativeDay(profile.lastExportAt, Date.now()))}
        </p>
      </section>

      <button type="button" onClick={deleteAll} className="w-full rounded-full bg-red-50 py-3 font-semibold text-red-600">
        {sv.settings.deleteAll}
      </button>
      <p className="text-center text-xs text-zinc-400">{sv.settings.version(__APP_VERSION__)}</p>
    </main>
  )
}
