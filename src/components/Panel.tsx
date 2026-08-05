import type { ReactNode } from 'react'

interface PanelProps {
  title?: ReactNode
  /** Rendered at the right of the title bar (e.g. a count or action). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A card with a retro window title bar.
 *
 * The bar is purely decorative chrome — the dots don't close anything, they're
 * there because a little desktop-window nostalgia makes the app feel friendlier.
 * With retro chrome switched off the bar collapses to a plain heading, so the
 * same markup works in both skins.
 */
export function Panel({ title, actions, children, className = '' }: PanelProps) {
  return (
    <section className={`card panel ${className}`.trim()}>
      {title && (
        <header className="panel-bar">
          <span className="panel-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <h2 className="panel-title">{title}</h2>
          {actions && <span className="panel-actions">{actions}</span>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  )
}
