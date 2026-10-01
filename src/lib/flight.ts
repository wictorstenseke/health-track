const FLIGHT_MS = 750

/**
 * Hem's save: a copy of the number in `source` arcs onto `mark` (the saved point, drawn by the chart),
 * shrinking and turning ember on the way; the mark then pops, rings and fades. The number itself dips out and
 * back in, so it reads as having flown. Resolves when it's all over; at once with reduced motion.
 */
export async function flyToMark(source: HTMLElement, mark: SVGGElement): Promise<void> {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const from = source.getBoundingClientRect()
  const to = mark.getBoundingClientRect()
  const fromX = from.left + from.width / 2
  const fromY = from.top + from.height / 2
  const style = getComputedStyle(source)
  const ember = getComputedStyle(document.documentElement).getPropertyValue('--color-ember-500').trim()

  // Three layers so x and y ease differently (that makes the arc); `translate` and `scale` are separate
  // properties, so shrinking never scales the distance travelled. Both scale around the number's centre.
  const outer = document.createElement('div')
  outer.ariaHidden = 'true'
  Object.assign(outer.style, { position: 'fixed', left: `${fromX}px`, top: `${fromY}px`, zIndex: '50', pointerEvents: 'none' })
  const inner = document.createElement('div')
  inner.style.transformOrigin = '0 0'
  const text = document.createElement('div')
  text.textContent = source.textContent
  Object.assign(text.style, {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    whiteSpace: 'nowrap',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    fontVariantNumeric: style.fontVariantNumeric,
    color: style.color,
  })
  inner.appendChild(text)
  outer.appendChild(inner)
  document.body.appendChild(outer)

  const flight = { duration: FLIGHT_MS, fill: 'forwards' } as const
  outer.animate({ translate: ['0 0', `${to.left + to.width / 2 - fromX}px 0`] }, { ...flight, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' })
  inner.animate({ translate: ['0 0', `0 ${to.top + to.height / 2 - fromY}px`] }, { ...flight, easing: 'cubic-bezier(0.2, 0.75, 0.35, 1)' })
  // A small lift as it leaves, then down to roughly the chart's label size.
  inner.animate({ scale: [1, 1.15, 0.3], offset: [0, 0.15, 1] }, { ...flight, easing: 'ease-in-out' })
  text.animate({ color: [style.color, ember] }, flight)
  source.animate(
    { opacity: [0, 0, 1], translate: ['0 8px', '0 8px', '0 0'], offset: [0, 0.6, 1] },
    { duration: FLIGHT_MS + 300, easing: 'ease-out' },
  )

  await Promise.all(outer.getAnimations({ subtree: true }).map((a) => a.finished))

  // Landed: the number melts into the dot.
  mark.style.opacity = '1'
  const [ring, dot] = mark.children
  dot.animate({ scale: [0, 1.6, 1] }, { duration: 380, easing: 'cubic-bezier(0.3, 1.25, 0.5, 1)' })
  ring.animate({ scale: [1, 3.5], opacity: [0.6, 0] }, { duration: 650, easing: 'ease-out', fill: 'forwards' })
  await text.animate({ opacity: [1, 0] }, { duration: 180, fill: 'forwards' }).finished
  outer.remove()
  await mark.animate({ opacity: [1, 0] }, { duration: 400, delay: 900, fill: 'forwards' }).finished
}
