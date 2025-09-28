import React, { useMemo, useRef, useState } from 'react'
import { useTaskAttachments } from '../../pages/Tareas/hooks/useTaskAttachments'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import { FaPaperclip, FaTrashAlt, FaExternalLinkAlt, FaPlus, FaUpload } from 'react-icons/fa'
import './TaskAttachments.scss'

export default function TaskAttachments({ taskId, onAfterChange = () => {} }) {
  const { adjuntos, loading, add, remove, upload } = useTaskAttachments(taskId, onAfterChange)
  const toast = useToast()
  const modal = useModal()

  const [nombre, setNombre] = useState('')
  const [url, setUrl] = useState('')
  const [mime, setMime] = useState('')
  const [busy, setBusy] = useState(null)   // 'add' | 'upload' | id
  const [isOver, setIsOver] = useState(false)

  const fileInputRef = useRef(null)

  const canAdd = useMemo(() => !!nombre.trim() && !!url.trim(), [nombre, url])
  const normalizeUrl = (s='') => (/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`)

  const resetForm = () => { setNombre(''); setUrl(''); setMime('') }

  const handleAdd = async () => {
    if (!canAdd || busy) return
    setBusy('add')
    try {
      await add({ nombre: nombre.trim(), drive_url: normalizeUrl(url), mime: mime.trim() || null })
      toast?.success('Adjunto agregado')
      resetForm()
    } catch (e) { toast?.error(e?.message || 'No se pudo agregar el adjunto') }
    finally { setBusy(null) }
  }
  const onKeyDownNew = (e) => { if (e.key === 'Enter' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); handleAdd() } }

  const handleRemove = async (a) => {
    if (busy) return
    const ok = await modal.confirm({ title: 'Quitar adjunto', message: `¿Eliminar “${a.nombre}”?`, okText: 'Eliminar' })
    if (!ok) return
    setBusy(a.id)
    try { await remove(a.id); toast?.success('Adjunto eliminado') }
    catch (e) { toast?.error(e?.message || 'No se pudo eliminar el adjunto') }
    finally { setBusy(null) }
  }

  // ---- Subida de archivos (drop/picker)
  const performUpload = async (files=[]) => {
    if (!files?.length || busy) return
    setBusy('upload')
    try { await upload(Array.from(files)); toast?.success(`${files.length} archivo(s) subido(s)`) }
    catch (e) { toast?.error(e?.message || 'No se pudieron subir los archivos') }
    finally { setBusy(null) }
  }
  const onPickFiles = (e) => { const f = e.target.files; if (f?.length) performUpload(f); e.target.value = '' }
  const onDrop = (e) => { e.preventDefault(); setIsOver(false); performUpload(e.dataTransfer?.files) }
  const onDragOver = (e) => { e.preventDefault(); setIsOver(true) }
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false) }

  return (
    <div className="TaskAttachments card">
      <div className="cardHeader">
        <div className="title">Adjuntos</div>
        <div className="subtitle">{loading ? 'Cargando…' : `(${adjuntos.length})`}</div>
      </div>

      {/* Dropzone */}
      <div
        className={`att-drop ${isOver ? 'is-over' : ''}`}
        onDragOver={onDragOver} onDragEnter={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        role="button" tabIndex={0}
        onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') fileInputRef.current?.click() }}
        title="Soltá archivos aquí o hacé clic para elegir"
        aria-label="Soltar archivos o elegir desde tu equipo"
      >
        <button
          type="button"
          className="pickBtn"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy === 'upload'}
          title="Elegir archivos desde tu equipo"
        >
          <FaUpload /> <span>Adjuntar archivos</span>
        </button>
        <div className="muted drop-help">
          Soltá acá o elegí archivos. (Imágenes, PDF, docs…)
        </div>
        <input ref={fileInputRef} type="file" hidden multiple onChange={onPickFiles} />
      </div>

      {/* Lista */}
      {loading && <div className="att-skeleton"><div className="skl"/><div className="skl"/></div>}
      {!loading && adjuntos.length === 0 && <div className="empty">Sin adjuntos</div>}

      {!!adjuntos.length && !loading && (
        <ul className="att-list">
          {adjuntos.map(a => (
            <li key={a.id} className="attItem">
              <span className="ico"><FaPaperclip/></span>
              {a.drive_url ? (
                <a className="name link" href={a.drive_url} target="_blank" rel="noreferrer" title={a.drive_url}>
                  {a.nombre} <FaExternalLinkAlt className="ext"/>
                </a>
              ) : <span className="name" title={a.nombre}>{a.nombre}</span>}
              <span className="muted mime" title={a.mime || ''}>{a.mime || ''}</span>
              <button className="rm" title={`Eliminar ${a.nombre}`} aria-label={`Eliminar ${a.nombre}`}
                      onClick={() => handleRemove(a)} disabled={busy === a.id}>
                <FaTrashAlt/>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Alta por URL (labels claras) */}
      <div className="att-add">
        <div className="fld">
          <label className="label" htmlFor="att-nombre">Nombre</label>
          <input
            id="att-nombre" className="att-input" placeholder="Nombre del archivo"
            title="Nombre visible del adjunto" value={nombre}
            onChange={e => setNombre(e.target.value)} onKeyDown={onKeyDownNew} maxLength={255} required
          />
        </div>
        <div className="fld urlfld">
          <label className="label" htmlFor="att-url">URL pública</label>
          <input
            id="att-url" className="att-input" placeholder="https://…"
            title="Enlace público (Drive, S3, etc.)" value={url}
            onChange={e => setUrl(e.target.value)} onKeyDown={onKeyDownNew} inputMode="url" required
            aria-describedby="att-url-help"
          />
        </div>
        <div className="fld mimefld">
          <label className="label" htmlFor="att-mime">MIME (opcional)</label>
          <input
            id="att-mime" className="att-input" placeholder="application/pdf"
            title="Tipo MIME (opcional)" value={mime}
            onChange={e => setMime(e.target.value)} onKeyDown={onKeyDownNew}
          />
        </div>
        <button
          className="addBtn" onClick={handleAdd}
          disabled={!canAdd || busy === 'add'}
          title={canAdd ? 'Agregar adjunto por URL' : 'Completá nombre y URL'}
        >
          <FaPlus/> <span>Agregar</span>
        </button>
      </div>
    </div>
  )
}
