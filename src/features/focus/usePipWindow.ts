import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A floating, always-on-top timer window.
 *
 * ADHD is, among other things, a broken internal clock — Barkley's work frames
 * time as either "now" or "not now". The clinical answer is to externalise it:
 * make elapsed time continuously visible without anyone having to go and look.
 * A timer you must switch tabs to see isn't doing that job.
 *
 * Document Picture-in-Picture gives us a real OS-level window that floats over
 * everything else, so the session stays present while you work in another app.
 * Chromium and Firefox support it; Safari doesn't, so we feature-detect and
 * simply don't offer the button there.
 */

interface DocumentPiP {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>
  window: Window | null
}

function pip(): DocumentPiP | null {
  const w = window as unknown as { documentPictureInPicture?: DocumentPiP }
  return w.documentPictureInPicture ?? null
}

export function pipSupported(): boolean {
  return pip() !== null
}

/** Copy our stylesheets into the PiP document so it inherits the theme. */
function adoptStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join('\n')
      const el = target.document.createElement('style')
      el.textContent = css
      target.document.head.appendChild(el)
    } catch {
      // Cross-origin sheets (web fonts) can't be read; link them instead.
      if (sheet.href) {
        const link = target.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        target.document.head.appendChild(link)
      }
    }
  }
}

/** Mirror the theme attributes so the floating window matches the app. */
function adoptTheme(target: Window) {
  const from = document.documentElement
  const to = target.document.documentElement
  for (const name of ['data-theme', 'data-vibe', 'data-accent', 'data-retro', 'data-motion']) {
    const v = from.getAttribute(name)
    if (v) to.setAttribute(name, v)
  }
}

export interface PipController {
  supported: boolean
  open: boolean
  container: HTMLElement | null
  toggle: () => void
  close: () => void
}

/**
 * Opens a PiP window and hands back a DOM node to render into via a portal.
 */
export function usePipWindow(): PipController {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const winRef = useRef<Window | null>(null)

  const close = useCallback(() => {
    winRef.current?.close()
    winRef.current = null
    setContainer(null)
  }, [])

  const toggle = useCallback(() => {
    const api = pip()
    if (!api) return
    if (winRef.current) {
      close()
      return
    }
    void (async () => {
      try {
        const w = await api.requestWindow({ width: 260, height: 168 })
        adoptStyles(w)
        adoptTheme(w)
        const root = w.document.createElement('div')
        root.className = 'pip-root'
        w.document.body.appendChild(root)
        winRef.current = w
        setContainer(root)
        // The user can close the floating window directly; keep React in step.
        w.addEventListener('pagehide', () => {
          winRef.current = null
          setContainer(null)
        })
      } catch {
        // Denied or unavailable — the in-app timer is still right there.
      }
    })()
  }, [close])

  // Never leave an orphaned window behind when the session view unmounts.
  useEffect(() => () => winRef.current?.close(), [])

  return { supported: pipSupported(), open: container !== null, container, toggle, close }
}
