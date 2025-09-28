// /frontend/src/components/tasks/TaskHeaderActions.jsx
import React, { useEffect, useRef, useState } from 'react'
import { FaStar, FaRegStar, FaEye, FaEyeSlash, FaLink, FaPaperclip, FaEllipsisH } from 'react-icons/fa'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import { useToast } from '../../components/toast/ToastProvider.jsx'

export default function TaskHeaderActions({
  isFavorita = false,
  isSeguidor = false,
  onToggleFav,     // (on:boolean) => Promise
  onToggleFollow,  // (on:boolean) => Promise
  onQuickAttach,   // () => void
  onRelate         // () => void
}) {
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const modal = useModal()
  const toast = useToast()

  const lock = (k, fn) => async () => { if (busy) return; try { setBusy(k); await fn(); } finally { setBusy(null); } }

  // cerrar al clickear fuera o con Escape
  useEffect(() => {
    const onDoc = (e) => { if (open && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const actFav = lock('fav', async () => {
    try {
      await onToggleFav?.(!isFavorita)
      toast?.success(isFavorita ? 'Quitada de favoritos' : 'Agregada a favoritos')
    } catch (e) {
      toast?.error(e?.message || 'No se pudo actualizar favoritos')
    } finally {
      setOpen(false)
    }
  })

  const actFollow = lock('follow', async () => {
    try {
      await onToggleFollow?.(!isSeguidor)
      toast?.success(isSeguidor ? 'Dejaste de seguir la tarea' : 'Ahora estás siguiendo la tarea')
    } catch (e) {
      toast?.error(e?.message || 'No se pudo actualizar el seguimiento')
    } finally {
      setOpen(false)
    }
  })

  const actRel = () => { try { onRelate?.() } catch {} finally { setOpen(false) } }

  const actAdj = () => {
    try {
      onQuickAttach?.()
      // opcional: feedback suave al abrir el picker de archivos
      toast?.info?.('Elegí archivos para adjuntar')
    } catch (e) {
      toast?.error(e?.message || 'No se pudo abrir el selector de archivos')
    } finally {
      setOpen(false)
    }
  }

  return (
    <div className="actions" aria-busy={!!busy}>
      {/* Mobile ≤760px: botones sueltos */}
      <div className="btnGroup">
        <button
          className={`btn ${isFavorita ? 'on' : ''}`}
          onClick={actFav}
          title="Favorito"
          disabled={busy === 'fav'}
          aria-pressed={isFavorita}
        >
          <span className="ico">{isFavorita ? <FaStar/> : <FaRegStar/>}</span>
          <span className="lbl">{isFavorita ? 'Favorita' : 'Favorito'}</span>
        </button>

        <button
          className={`btn ${isSeguidor ? 'on' : ''}`}
          onClick={actFollow}
          title="Seguir"
          disabled={busy === 'follow'}
          aria-pressed={isSeguidor}
        >
          <span className="ico">{isSeguidor ? <FaEye/> : <FaEyeSlash/>}</span>
          <span className="lbl">{isSeguidor ? 'Siguiendo' : 'Seguir'}</span>
        </button>

        <button className="btn" onClick={actRel} title="Relacionar tarea" disabled={!!busy}>
          <span className="ico"><FaLink/></span>
          <span className="lbl">Relacionar</span>
        </button>

        <button className="btn" onClick={actAdj} title="Adjuntar" disabled={!!busy}>
          <span className="ico"><FaPaperclip/></span>
          <span className="lbl">Adjuntar</span>
        </button>
      </div>

      {/* Desktop >760px: botón ⋯ + menú */}
      <div className="moreWrap" ref={menuRef}>
        <button
          className="btn moreBtn"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Más acciones"
          disabled={!!busy}
        >
          <FaEllipsisH />
        </button>

        {open && (
          <div className="dropdown" role="menu">
            <button className="item" onClick={actFav} role="menuitem" disabled={busy === 'fav'}>
              <span className="ico">{isFavorita ? <FaStar/> : <FaRegStar/>}</span>
              <span>{isFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}</span>
            </button>
            <button className="item" onClick={actFollow} role="menuitem" disabled={busy === 'follow'}>
              <span className="ico">{isSeguidor ? <FaEye/> : <FaEyeSlash/>}</span>
              <span>{isSeguidor ? 'Dejar de seguir' : 'Seguir'}</span>
            </button>
            <button className="item" onClick={actRel} role="menuitem" disabled={!!busy}>
              <span className="ico"><FaLink/></span>
              <span>Relacionar</span>
            </button>
            <button className="item" onClick={actAdj} role="menuitem" disabled={!!busy}>
              <span className="ico"><FaPaperclip/></span>
              <span>Adjuntar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}