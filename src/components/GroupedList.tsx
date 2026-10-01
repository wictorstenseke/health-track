import type { ReactNode } from 'react'

/** One list row: label left, value or control right. Buttons and labels reuse the class to look the same. */
export const rowClass = 'flex min-h-13 w-full items-center justify-between gap-4 px-5'

export function Row({ children }: { children: ReactNode }) {
  return <div className={rowClass}>{children}</div>
}

/** iOS-style grouped list: a quiet label over one card whose rows are split by hairlines. */
export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 px-5 text-sm font-medium text-muted">{label}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">{children}</div>
    </section>
  )
}
