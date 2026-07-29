import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { List } from '../../domain/types'
import { updateList, deleteList, setListArchived } from '../../data/lists'
import { LIST_COLORS, LIST_ICONS } from '../../data/lists'
import { Dialog } from '../../components/Dialog'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import type { IconName } from '../../components/Icon'
import { useConfirm } from '../../components/ConfirmContext'

export function ListHeaderActions({ list }: { list: List }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="gear" /> Edit list
      </Button>
      {open && <ListEditorDialog list={list} onClose={() => setOpen(false)} />}
    </>
  )
}

export function ListEditorDialog({ list, onClose }: { list: List; onClose: () => void }) {
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [name, setName] = useState(list.name)
  const [color, setColor] = useState(list.color)
  const [icon, setIcon] = useState(list.icon)

  async function save() {
    await updateList(list.id, { name: name.trim() || list.name, color, icon })
    onClose()
  }

  async function archive() {
    await setListArchived(list.id, !list.archived)
    onClose()
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete "${list.name}"?`,
      message: 'The list is removed and its tasks move safely back to your Inbox.',
      confirmLabel: 'Delete list',
      danger: true,
    })
    if (ok) {
      await deleteList(list.id)
      onClose()
      navigate('/inbox')
    }
  }

  return (
    <Dialog open onClose={onClose} title="List settings">
      <div className="detail-grid">
        <div>
          <span className="field-label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div>
          <span className="field-label">Icon</span>
          <div className="icon-picker">
            {LIST_ICONS.map((ic) => (
              <button
                key={ic}
                className={`icon-choice ${icon === ic ? 'icon-choice--on' : ''}`}
                onClick={() => setIcon(ic)}
                aria-label={ic}
              >
                <Icon name={ic as IconName} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">Color</span>
          <div className="color-picker">
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                className={`color-choice ${color === c ? 'color-choice--on' : ''}`}
                style={{ background: c }}
                aria-label="Pick color"
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="detail-actions detail-actions--split">
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
            <Button variant="subtle" onClick={archive}>
              {list.archived ? 'Unarchive' : 'Archive'}
            </Button>
          </div>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
