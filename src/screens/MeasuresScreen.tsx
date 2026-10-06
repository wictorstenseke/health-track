import { useState } from 'react'
import { Group, rowClass } from '../components/GroupedList'
import { ChevronRightIcon, PlusIcon } from '../components/icons'
import { MeasureSheet } from '../components/MeasureSheet'
import { Sparkline } from '../components/Sparkline'
import { useEntries } from '../db/hooks'
import { sv } from '../i18n/sv'
import { formatDeltaValue, formatValue } from '../lib/format'
import { MEASURE_METRIC_IDS, METRICS, type MetricId } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, pointsInYear, yearStats } from '../lib/stats'

function MetricRow({ metricId }: { metricId: MetricId }) {
  const entries = useEntries(metricId)
  const year = new Date().getFullYear()
  const last = latest(entries)
  const stats = yearStats(entries, year)
  return (
    <button type="button" onClick={() => navigate({ name: 'metric', metricId })} className={`${rowClass} py-3 text-left`}>
      <span>
        <span className="block">{sv.metrics[metricId]}</span>
        {stats && stats.count >= 2 && (
          <span className="block text-sm text-muted">{sv.measures.thisYear(formatDeltaValue(stats.change, METRICS[metricId].unit))}</span>
        )}
      </span>
      <span className="flex items-center gap-3">
        <Sparkline values={pointsInYear(entries, year).map((p) => p.value)} />
        <span className="min-w-16 text-right font-semibold tabular-nums">{last ? formatValue(last.value, METRICS[metricId].unit) : '–'}</span>
        <span className="text-faint">
          <ChevronRightIcon />
        </span>
      </span>
    </button>
  )
}

export function MeasuresScreen() {
  const [measuring, setMeasuring] = useState(false)
  return (
    <main className="px-4 pt-(--screen-top) pb-28">
      <h1 className="text-3xl font-semibold tracking-tight">{sv.measures.title}</h1>
      <div className="mt-7">
        <Group label={sv.measures.circumference}>
          {MEASURE_METRIC_IDS.map((id) => (
            <MetricRow key={id} metricId={id} />
          ))}
          <button
            type="button"
            onClick={() => setMeasuring(true)}
            className={`${rowClass} justify-start gap-2 font-medium text-ember-600 dark:text-ember-400`}
          >
            <PlusIcon />
            {sv.measures.newMeasurement}
          </button>
        </Group>
      </div>
      {measuring && <MeasureSheet onClose={() => setMeasuring(false)} />}
    </main>
  )
}
