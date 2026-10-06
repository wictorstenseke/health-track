import { useId } from 'react'

const W = 96
const H = 36
/** Where the axes sit: half a pixel in, so a 1px line lands on whole pixels. */
const AXIS = 0.5
/** Room between the axes and the curve, and for the end dot so it never clips at the edge. */
const PAD = 4
/** How far the curve eases out of each value, as a share of the way to the next: 0 is straight lines, 0.5 the softest. */
const EASE = 0.25

/** A quiet trend mark for a list row: a soft curve fading down to faint axes, with a white-centred dot on the latest value. */
export function Sparkline({ values }: { values: number[] }) {
  const fade = useId()
  // Nothing to draw a trend from. The empty box keeps the row's height and the value's column.
  if (values.length < 2) return <svg width={W} height={H} aria-hidden />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const floor = H - AXIS
  const points = values.map((v, i) => ({
    x: AXIS + PAD + (i / (values.length - 1)) * (W - AXIS - PAD * 2),
    // An unchanged measure is a line through the middle, not along the bottom.
    y: span === 0 ? floor / 2 : floor - PAD - ((v - min) / span) * (floor - PAD * 2),
  }))
  // Control points share their neighbour's height, so the curve eases between values without overshooting them.
  const line = points.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = points[i - 1]
    const reach = (p.x - prev.x) * EASE
    return `${d} C${prev.x + reach},${prev.y} ${p.x - reach},${p.y} ${p.x},${p.y}`
  }, '')
  const end = points[points.length - 1]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="text-ember-500">
      <defs>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${end.x},${floor} L${points[0].x},${floor} Z`} fill={`url(#${fade})`} />
      <path d={`M${AXIS},0 V${floor} H${W}`} fill="none" strokeWidth={1} className="stroke-faint/40" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={end.x} cy={end.y} r={3} fill="currentColor" />
      <circle cx={end.x} cy={end.y} r={1.25} fill="#fff" />
    </svg>
  )
}
