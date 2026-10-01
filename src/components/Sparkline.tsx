const W = 96
const H = 36

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <svg width={W} height={H} aria-hidden />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => `${(i / (values.length - 1)) * (W - 4) + 2},${H - 2 - ((v - min) / span) * (H - 4)}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <polyline points={points} fill="none" stroke="#ff5a1f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
