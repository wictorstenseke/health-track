import { useState } from 'react'
import { Group, rowClass } from '../components/GroupedList'
import { ChevronRightIcon } from '../components/icons'
import { MeasureSheet } from '../components/MeasureSheet'
import { PlusLabel } from '../components/PlusLabel'
import { Sparkline } from '../components/Sparkline'
import { useEntries, useMetrics } from '../db/hooks'
import { sv } from '../i18n/sv'
import { formatDeltaValue, formatValue } from '../lib/format'
import { unitOf, type Metric } from '../lib/metrics'
import { navigate } from '../lib/router'
import { latest, pointsInYear, yearStats } from '../lib/stats'

/** Like `rowClass`, but in three columns: equal sides keep the graph in the middle of the row whatever the name's length. */
const metricRowClass = 'grid min-h-13 w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-3 text-left'

function MetricRow({ metric }: { metric: Metric }) {
  const entries = useEntries(metric.id)
  const year = new Date().getFullYear()
  const last = latest(entries)
  const stats = yearStats(entries, year)
  const unit = unitOf(metric.id)
  return (
    <button type="button" onClick={() => navigate({ name: 'metric', metricId: metric.id })} className={metricRowClass}>
      {/* min-w-0 lets a long name truncate instead of pushing the value off the row. */}
      <span className="min-w-0">
        <span className="block truncate">{metric.name}</span>
        {stats && stats.count >= 2 && <span className="block truncate text-sm text-muted">{sv.measures.thisYear(formatDeltaValue(stats.change, unit))}</span>}
      </span>
      <Sparkline values={pointsInYear(entries, year).map((p) => p.value)} />
      <span className="flex items-center justify-end gap-3">
        <span className="font-semibold tabular-nums">{last ? formatValue(last.value, unit) : '–'}</span>
        <span className="text-faint">
          <ChevronRightIcon />
        </span>
      </span>
    </button>
  )
}

export function MeasuresScreen() {
  const metrics = useMetrics()
  const [measuring, setMeasuring] = useState(false)
  return (
    <main className="px-4 pt-(--screen-top) pb-28">
      <h1 className="text-3xl font-semibold tracking-tight">{sv.measures.title}</h1>
      <div className="mt-7">
        <Group label={sv.measures.circumference}>
          {metrics.map((metric) => (
            <MetricRow key={metric.id} metric={metric} />
          ))}
          <button type="button" onClick={() => setMeasuring(true)} className={`${rowClass} justify-start`}>
            <PlusLabel>{sv.measures.newMeasurement}</PlusLabel>
          </button>
        </Group>
      </div>
      {measuring && <MeasureSheet onClose={() => setMeasuring(false)} />}
    </main>
  )
}
