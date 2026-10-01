/**
 * One light tap. Android: Vibration API. iOS 18+: clicking a hidden `<input switch>` fires the system haptic.
 * Best effort; may not fire outside direct user gestures.
 */
export function haptic(): void {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8)
      return
    }
    const label = document.createElement('label')
    label.ariaHidden = 'true'
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.head.appendChild(label)
    label.click()
    label.remove()
  } catch {
    // unsupported
  }
}
