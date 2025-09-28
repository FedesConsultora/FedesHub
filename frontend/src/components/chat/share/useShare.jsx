import { useCallback, useMemo, useState } from 'react'
import { chatApi } from '../../../api/chat'
import { useChannels, useDmCandidates } from '../../../hooks/useChat'
import { useToast } from '../../toast/ToastProvider'
import ShareModal from './ShareModal'

/**
 * useShare:
 *  open({ items, selectedIndexes })
 *  items = [{ url, name?, mime? }]
 */
export default function useShare() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState([]) // idxs
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const abs = (u) => {
    if (!u) return ''
    try {
      // Si viene blob: no sirve para el backend → usamos la pública (url) si existe
      if (String(u).startsWith('blob:')) return ''
      return new URL(u, window.location.origin).href
    } catch { return '' }
  }

  const chansQ = useChannels({ scope: 'mine' })
  const dmsQ   = useDmCandidates()

  const data = useMemo(() => ({
    channels: (chansQ.data || []).filter(c => c?.tipo?.codigo === 'canal'),
    groups:   (chansQ.data || []).filter(c => c?.tipo?.codigo === 'grupo'),
    dms:      (dmsQ.data   || []).filter(u => !!u.dm_canal_id)
  }), [chansQ.data, dmsQ.data])

  const openShare = useCallback(({ items=[], selectedIndexes=[0] }) => {
    setItems(items)
    setSelected(selectedIndexes)
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const shareToMany = useCallback(async ({ canalIds=[], dmCanalIds=[], note='' }) => {
    if (!Array.isArray(items) || items.length === 0) return
    const picks = (selected.length ? selected : [0]).map(i => items[i]).filter(Boolean)
    const attachments = picks.map(p => {
      const raw = p.srcUrl || p.url
      const file_url = abs(raw)
      return {
        file_url,
        file_name: p.name || 'archivo',
        mime_type: p.mime || undefined
      }
    }).filter(a => !!a.file_url)
    const targets = [...canalIds, ...dmCanalIds].filter(Boolean)
    if (!targets.length) return

    setBusy(true)
    try {
      const ops = targets.map(id =>
        chatApi.messages.create(id, { body_text: note?.trim() || '', attachments })
      )
      const res = await Promise.allSettled(ops)
      const ok = res.filter(r => r.status === 'fulfilled').length
      const fail = res.length - ok
      if (ok) toast?.success(`Enviado a ${ok} destino${ok>1?'s':''}`)
      if (fail) toast?.warn(`${fail} envío${fail>1?'s':''} no se completaron`)
      setOpen(false)
    } catch (e) {
      toast?.error('No se pudo compartir')
    } finally {
      setBusy(false)
    }
  }, [items, selected, toast])

  const Modal = useCallback(() => (
    <ShareModal
      open={open}
      onClose={close}
      data={data}
      busy={busy}
      items={items}
      selectedIndexes={selected}
      onToggleIndex={(i) =>
        setSelected(prev => prev.includes(i) ? prev.filter(x => x!==i) : [...prev, i])
      }
      onSelectAll={() => setSelected(items.map((_,i)=>i))}
      onClearSel={() => setSelected([])}
      onShare={shareToMany}
    />
  ), [open, close, data, busy, items, selected, shareToMany])

  return { open: openShare, Modal, isOpen: open }
}
