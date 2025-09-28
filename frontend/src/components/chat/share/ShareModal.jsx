import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch, FiSend, FiX, FiMessageSquare, FiHash, FiUsers, FiCheckSquare, FiSquare } from 'react-icons/fi'
import { displayName } from '../../../utils/people'
import { resolveMediaUrl } from '../../../utils/media'
import './ShareModal.scss'

export default function ShareModal({
  open=false, onClose, data, onShare, busy=false,
  items=[], selectedIndexes=[], onToggleIndex, onSelectAll, onClearSel
}) {
  const [tab, setTab] = useState('dms') // 'dms' | 'channels' | 'groups'
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [targets, setTargets] = useState({ dms: new Set(), chans: new Set(), groups: new Set() })

  const { dms=[], channels=[], groups=[] } = data || {}

  const list = useMemo(() => {
    const base = tab === 'dms' ? dms : tab === 'channels' ? channels : groups
    const term = q.trim().toLowerCase()
    if (!term) return base
    return base.filter(r => {
      if (tab === 'dms') {
        const nm = (displayName(r) || r.email || '').toLowerCase()
        return nm.includes(term)
      }
      const nm = (r.nombre || r.slug || '').toLowerCase()
      const topic = (r.topic || '').toLowerCase()
      return nm.includes(term) || topic.includes(term)
    })
  }, [tab, dms, channels, groups, q])

  if (!open) return null
  const headerIcon = tab === 'dms' ? <FiMessageSquare/> : tab === 'channels' ? <FiHash/> : <FiUsers/>

  const toggleTarget = (id) => {
    setTargets(prev => {
      const n = { ...prev, dms: new Set(prev.dms), chans: new Set(prev.chans), groups: new Set(prev.groups) }
      if (tab === 'dms') (n.dms.has(id) ? n.dms.delete(id) : n.dms.add(id))
      if (tab === 'channels') (n.chans.has(id) ? n.chans.delete(id) : n.chans.add(id))
      if (tab === 'groups') (n.groups.has(id) ? n.groups.delete(id) : n.groups.add(id))
      return n
    })
  }

  const isChecked = (id) => (tab === 'dms'
    ? targets.dms.has(id)
    : tab === 'channels' ? targets.chans.has(id) : targets.groups.has(id)
  )

  const doShare = () => {
    const canalIds = [...targets.chans, ...targets.groups]
    const dmCanalIds = [...targets.dms]
    onShare?.({ canalIds, dmCanalIds, note })
  }

  const selCount = selectedIndexes.length
  const anyTarget = targets.dms.size + targets.chans.size + targets.groups.size

  const modal = (
    <div className="shareModalWrap onTop" role="dialog" aria-modal="true" aria-label="Compartir a…">
      <div className="shareBackdrop" onClick={onClose} />
      <div className="shareCard" onClick={(e)=>e.stopPropagation()}>
        <header className="shareHeader">
          <div className="brand">
            <div className="logo">{headerIcon} Compartir</div>
            <div className="subtitle">Seleccioná adjuntos y destinos</div>
          </div>
          <button className="close" onClick={onClose} aria-label="Cerrar"><FiX/></button>
        </header>

        <div className="shareBody">
          {/* Selección de adjuntos */}
          <div className="attachPicker">
            <div className="rowTop">
              <span className="lbl">Adjuntos ({selCount}/{items.length})</span>
              <div className="actions">
                <button className="mini" onClick={onSelectAll} type="button">Todos</button>
                <button className="mini" onClick={onClearSel} type="button">Ninguno</button>
              </div>
            </div>
            <div className="thumbs">
              {items.map((it, i) => {
                const checked = selectedIndexes.includes(i)
                const Ico = checked ? FiCheckSquare : FiSquare
                return (
                  <button key={i} className={'thumb' + (checked?' sel':'')} onClick={()=>onToggleIndex?.(i)} title={it.name || ''}>
                    <img src={resolveMediaUrl(it.url)} alt={it.name || ''} loading="lazy" />
                    <i className="chk"><Ico/></i>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tabs de destino */}
          <div className="tabsSmall" role="tablist" aria-label="Destino">
            <button role="tab" className={tab==='dms'?'active':''} onClick={()=>setTab('dms')}>DMs</button>
            <button role="tab" className={tab==='channels'?'active':''} onClick={()=>setTab('channels')}>Canales</button>
            <button role="tab" className={tab==='groups'?'active':''} onClick={()=>setTab('groups')}>Grupos</button>
          </div>

          <div className="field">
            <FiSearch className="ico" aria-hidden />
            <input type="search" placeholder="Buscar…" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>

          <label className="lbl" htmlFor="note">Mensaje (opcional)</label>
          <textarea id="note" className="note" rows={2} placeholder="Agregá un comentario…" value={note} onChange={(e)=>setNote(e.target.value)} />

          <div className="list" role="listbox">
            {list.map(r => {
              if (tab === 'dms') {
                const nm = displayName(r) || r.email || `Usuario ${r.user_id}`
                const initials = (nm[0] || '?').toUpperCase()
                const checked = isChecked(r.dm_canal_id)
                const Ico = checked ? FiCheckSquare : FiSquare
                return (
                  <button key={r.user_id} className={'row pickable' + (checked?' sel':'')} onClick={()=>toggleTarget(r.dm_canal_id)}>
                    <span className="ava">{initials}</span>
                    <span className="nm">{nm}<span className="sub">{r.email}</span></span>
                    <span className="go"><Ico/></span>
                  </button>
                )
              }
              const name = r.nombre || r.slug || `Canal ${r.id}`
              const img  = r.imagen_url ? resolveMediaUrl(r.imagen_url) : null
              const checked = isChecked(r.id)
              const Ico = checked ? FiCheckSquare : FiSquare
              return (
                <button key={r.id} className={'row pickable' + (checked?' sel':'')} onClick={()=>toggleTarget(r.id)}>
                  <span className={'bubble' + (img ? ' hasImg' : '')}>{img ? <img src={img} alt={name} /> : (r.slug || name).slice(0,2).toUpperCase()}</span>
                  <span className="nm">{name}{r.topic && <span className="sub">{r.topic}</span>}</span>
                  <span className="go"><Ico/></span>
                </button>
              )
            })}
            {!list.length && <div className="empty">Sin resultados</div>}
          </div>
        </div>

        <footer className="shareFooter">
          <button className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="submit" disabled={busy || !anyTarget || !selCount} onClick={doShare}>
            {busy ? 'Enviando…' : `Enviar (${selCount} adjunto${selCount>1?'s':''})`}
          </button>
        </footer>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
