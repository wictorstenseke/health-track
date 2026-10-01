import { LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_DAY_MAX, MONTH_START_DAYS } from '../lib/dates'
import { formatMonthInitial } from '../lib/format'
import type { YearSeries } from '../lib/stats'

const AXIS_TICK = { fontSize: 11, fill: '#a1a1aa' }

/** Current year in ember, older years as fading ink ghosts. */
export function yearColor(year: number, currentYear = new Date().getFullYear()): string {
  const age = currentYear - year
  if (age <= 0) return '#ff5a1f'
  if (age === 1) return 'rgb(20 20 22 / 0.55)'
  if (age === 2) return 'rgb(20 20 22 / 0.3)'
  return 'rgb(20 20 22 / 0.18)'
}

/** `series` newest first. Lines are drawn oldest first so the current year sits on top. */
export function YearChart({ series, height, variant }: { series: YearSeries[]; height: number; variant: 'card' | 'full' }) {
  const currentYear = new Date().getFullYear()
  const full = variant === 'full'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart margin={{ top: 8, right: 36, bottom: 0, left: full ? 0 : 4 }}>
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, CHART_DAY_MAX]}
          ticks={MONTH_START_DAYS}
          tickFormatter={(v: number) => formatMonthInitial(MONTH_START_DAYS.indexOf(v))}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          allowDuplicatedCategory={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={['dataMin - 1', 'dataMax + 1']}
          hide={!full}
          width={30}
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => String(Math.round(v))}
        />
        {[...series].reverse().map((s) => {
          const color = yearColor(s.year, currentYear)
          const lastIndex = s.points.length - 1
          return (
            <Line
              key={s.year}
              data={s.points}
              dataKey="y"
              type="monotone"
              stroke={color}
              strokeWidth={s.year === currentYear ? 2.5 : 1.75}
              dot={s.points.length === 1 ? { r: 3, fill: color, stroke: color } : false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="y"
                content={(props) =>
                  props.index === lastIndex ? (
                    <text x={Number(props.x) + 6} y={Number(props.y)} dy={4} fontSize={11} fontWeight={600} fill={color}>
                      {s.year}
                    </text>
                  ) : null
                }
              />
            </Line>
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
