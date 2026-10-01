import { useSyncExternalStore } from 'react'

/**
 * Dark mode: an on/off setting, kept in localStorage so the inline script in index.html can apply it before
 * the first paint (IndexedDB is async and would flash light). The theme lives on `<html data-theme="dark">`.
 */
// Prefixed: every app on the origin (GitHub Pages, a shared dev port) shares localStorage.
const KEY = 'vagen-theme'
const listeners = new Set<() => void>()

export function isDark(): boolean {
  return document.documentElement.dataset.theme === 'dark'
}

export function setDark(on: boolean): void {
  const root = document.documentElement
  if (on) root.dataset.theme = 'dark'
  else delete root.dataset.theme
  // The status bar takes its colour from theme-color: the page colour of the theme just set.
  const canvas = getComputedStyle(root).getPropertyValue('--color-canvas').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas)
  try {
    if (on) localStorage.setItem(KEY, 'dark')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the theme still applies until the app reloads.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** For colours that live in JS (SVG attributes in the charts and the dial). */
export function useDark(): boolean {
  return useSyncExternalStore(subscribe, isDark)
}
