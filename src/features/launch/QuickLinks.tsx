import { useState } from 'react'
import type { QuickLink } from '../../domain/types'
import { useSettings } from '../../app/SettingsContext'
import { Icon } from '../../components/Icon'

/** Turn a pasted URL into a short label, e.g. "https://mail.google.com" -> "mail". */
export function labelFor(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const parts = host.split('.')
    // Prefer the distinctive part: "mail.google.com" reads better as "mail",
    // but "github.com" should be "github", not "com".
    return parts.length > 2 ? parts[0] : (parts[0] ?? host)
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || 'link'
  }
}

/** Accept "github.com" as readily as a full URL. */
export function toUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/**
 * The handful of places you actually open when you sit down.
 *
 * Capped on purpose. A link grid that grows without limit turns the launch page
 * into a bookmark manager, and rearranging bookmarks is a very comfortable way
 * to avoid working.
 */
export const MAX_LINKS = 8

export function QuickLinks({ links }: { links: QuickLink[] }) {
  const { update } = useSettings()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  async function add() {
    const url = toUrl(draft)
    if (!url || links.length >= MAX_LINKS) return
    await update({ quickLinks: [...links, { label: labelFor(url), url }] })
    setDraft('')
  }

  async function remove(i: number) {
    await update({ quickLinks: links.filter((_, n) => n !== i) })
  }

  return (
    <div className="quicklinks">
      <div className="quicklinks-row">
        {links.map((l, i) => (
          <span key={`${l.url}-${i}`} className="quicklink">
            <a href={l.url}>{l.label}</a>
            {editing && (
              <button className="quicklink-x" onClick={() => remove(i)} aria-label={`Remove ${l.label}`}>
                <Icon name="close" />
              </button>
            )}
          </span>
        ))}
        {links.length < MAX_LINKS && (
          <button className="quicklink quicklink--add" onClick={() => setEditing((e) => !e)}>
            {editing ? 'done' : '+ link'}
          </button>
        )}
      </div>
      {editing && (
        <form
          className="quicklinks-add"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            className="input input--sm"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            placeholder="github.com"
            aria-label="Link address"
          />
          <button className="btn btn--primary btn--sm" type="submit" disabled={!draft.trim()}>
            Add
          </button>
        </form>
      )}
    </div>
  )
}
