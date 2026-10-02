import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Group, Row, rowClass } from '../components/GroupedList'
import { HapticTap } from '../components/HapticTap'
import { ChevronRightIcon } from '../components/icons'
import { ImportCsv } from '../components/ImportCsv'
import { ProfileRows } from '../components/ProfileRows'
import { clearAllData } from '../db/entries'
import { useAllEntries } from '../db/hooks'
import { setHeightCm, setName, type Profile } from '../db/settings'
import { sv } from '../i18n/sv'
import { exportCsv } from '../io/csvFiles'
import { formatRelativeDay, parseDecimal } from '../lib/format'
import { isValidHeight } from '../lib/metrics'
import { checkForUpdate, installUpdate, useUpdateStatus } from '../lib/pwa'
import { navigate } from '../lib/router'
import { setDark, useDark } from '../lib/theme'

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

  const update = useUpdateStatus()
  const dark = useDark()
  const toggleDark = () => setDark(!dark)

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

  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0)
  const deleteAll = async () => {
    await clearAllData()
    // Back to the start route so the app lands on Hem after the new setup.
    navigate({ name: 'home' })
  }

  return (
    <main className="space-y-7 px-4 pt-(--screen-top) pb-28">
      <h1 className="text-3xl font-semibold tracking-tight">{sv.settings.title}</h1>

      <Group label={sv.settings.profile}>
        <ProfileRows
          name={name}
          onNameChange={setNameText}
          onNameBlur={saveName}
          height={height}
          onHeightChange={setHeight}
          onHeightBlur={saveHeight}
          heightInvalid={heightInvalid}
        />
      </Group>

      <Group label={sv.settings.appearance}>
        <Row>
          <span id="dark-mode">{sv.settings.darkMode}</span>
          {/* iOS-style switch; HapticTap gives the tap a haptic tick. */}
          <HapticTap onTap={toggleDark}>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-labelledby="dark-mode"
              onClick={toggleDark}
              className={`flex h-[31px] w-[51px] items-center rounded-full p-0.5 transition-colors duration-200 ${dark ? 'bg-ember-500' : 'bg-faint/40'}`}
            >
              <span
                className={`size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-200 ${dark ? 'translate-x-5' : ''}`}
              />
            </button>
          </HapticTap>
        </Row>
      </Group>

      <Group label={sv.settings.data}>
        <ImportCsv />
        <button type="button" disabled={exporting} onClick={() => void runExport()} className={`${rowClass} py-2.5 text-left disabled:opacity-40`}>
          <span>
            <span className="block">{sv.settings.exportCsv}</span>
            <span className="block text-sm text-muted">
              {profile.lastExportAt === null
                ? sv.settings.neverExported
                : sv.settings.lastExport(formatRelativeDay(profile.lastExportAt, Date.now()))}
            </span>
          </span>
          <span className="text-faint">
            <ChevronRightIcon />
          </span>
        </button>
        {exportFailed && (
          <p role="alert" className="px-5 py-3 text-sm text-red-600 dark:text-red-400">
            {sv.settings.exportFailed}
          </p>
        )}
      </Group>

      <Group label={sv.settings.about}>
        <Row>
          <span>{sv.settings.version}</span>
          <span className="text-muted tabular-nums">{__APP_VERSION__}</span>
        </Row>
        {update === 'ready' ? (
          <button type="button" onClick={() => void installUpdate()} className={rowClass}>
            <span>{sv.settings.updateReady}</span>
            <span className="rounded-full bg-ember-500 px-3.5 py-1 text-sm font-semibold text-white">{sv.settings.installUpdate}</span>
          </button>
        ) : (
          <button type="button" disabled={update === 'checking'} onClick={() => void checkForUpdate()} className={`${rowClass} text-left`}>
            <span>{sv.settings.checkUpdate}</span>
            <span role="status" className="text-sm text-muted">
              {update === 'checking'
                ? sv.settings.checking
                : update === 'latest'
                  ? sv.settings.upToDate
                  : update === 'failed'
                    ? sv.settings.updateFailed
                    : ''}
            </span>
          </button>
        )}
      </Group>

      <button type="button" onClick={() => setConfirmStep(1)} className="mx-auto block h-10 rounded-full bg-red-600 px-5 text-base font-semibold text-white">
        {sv.settings.deleteAll}
      </button>

      {confirmStep > 0 && (
        <BottomSheet title={sv.settings.deleteAll} onClose={() => setConfirmStep(0)}>
          <p className="mb-5 px-2 text-center text-muted">
            {confirmStep === 1 ? sv.settings.confirmDeleteAll : sv.settings.confirmDeleteAllAgain}
          </p>
          <div className="space-y-2">
            {/* Two steps on purpose: everything goes and there is no undo. */}
            <button
              type="button"
              onClick={() => (confirmStep === 1 ? setConfirmStep(2) : void deleteAll())}
              className="w-full rounded-full bg-red-600 py-3 text-lg font-semibold text-white"
            >
              {confirmStep === 1 ? sv.settings.deleteAll : sv.settings.deleteAllFinal}
            </button>
            <button type="button" onClick={() => setConfirmStep(0)} className="w-full rounded-full bg-fill py-3 text-lg font-semibold">
              {sv.common.cancel}
            </button>
          </div>
        </BottomSheet>
      )}
    </main>
  )
}
