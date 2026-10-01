import type { ReactNode } from 'react'

/**
 * Since iOS 26.5 a web page only gets a haptic when a real tap toggles an `<input switch>`; triggering one
 * from code (`haptic()`) no longer fires. A transparent label over `children` takes the tap, toggles a hidden
 * switch (the iOS haptic) and runs `onTap`; Android gets a short vibration. The label is hidden from assistive
 * tech, so keyboard and screen readers reach the element underneath, which should run the same action.
 */
export function HapticTap({ onTap, disabled = false, children }: { onTap: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      {!disabled && (
        <label aria-hidden="true" className="absolute inset-0 cursor-pointer">
          <input
            type="checkbox"
            // React has no `switch` prop yet.
            ref={(el) => el?.setAttribute('switch', '')}
            tabIndex={-1}
            className="pointer-events-none absolute size-px opacity-0"
            onChange={() => {
              navigator.vibrate?.(8)
              onTap()
            }}
          />
        </label>
      )}
    </div>
  )
}
