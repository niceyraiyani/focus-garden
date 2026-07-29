import { useState } from 'react'
import { useSettings } from '../../app/SettingsContext'
import { normalizeDomain } from './nativeBlocker'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'

/**
 * Shared editor for the focus site blocklist. Used both in Settings and in the
 * pre-session builder so the "what am I blocking?" list is editable wherever it
 * matters. Writes straight to settings.blocklist (one shared list).
 */
export function BlocklistEditor() {
  const { settings, update } = useSettings()
  const [newSite, setNewSite] = useState('')
  const blocklist = settings.blocklist ?? []

  function addSite() {
    const domain = normalizeDomain(newSite)
    if (!domain) return
    if (blocklist.includes(domain)) {
      setNewSite('')
      return
    }
    void update({ blocklist: [...blocklist, domain] })
    setNewSite('')
  }

  function removeSite(domain: string) {
    void update({ blocklist: blocklist.filter((d) => d !== domain) })
  }

  return (
    <>
      <div className="setting-actions">
        <input
          className="input"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSite()}
          placeholder="e.g. youtube.com"
          aria-label="Add a site to block"
        />
        <Button variant="primary" onClick={addSite} disabled={!newSite.trim()}>
          <Icon name="plus" /> Block site
        </Button>
      </div>
      {blocklist.length === 0 ? (
        <p className="setting-hint">No sites blocked yet.</p>
      ) : (
        <div className="tag-row">
          {blocklist.map((d) => (
            <span key={d} className="chip">
              <Icon name="ban" /> {d}
              <button className="chip-x" aria-label={`Stop blocking ${d}`} onClick={() => removeSite(d)}>
                <Icon name="close" />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  )
}
