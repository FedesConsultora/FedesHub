import React, { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { FaReply } from 'react-icons/fa'
import MentionTextArea from './MentionTextArea.jsx'
import FilesPicker from '../../common/FilesPicker'
import { IoMdSend } from "react-icons/io";


const Composer = forwardRef(function Composer({ canPost, feders, replyTo, onCancelReply, onSend }, ref){
  const [msg, setMsg] = useState('')
  const [files, setFiles] = useState([])
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => { inputRef.current?.focus() }
  }), [])

  const escapeHtml = (s='') => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const replyHtml = useMemo(() => {
    if (!replyTo) return null
    let html = escapeHtml((replyTo.contenido||'').replace(/\s+/g,' '))
    html = html.replace(/@(\d+)\b/g, (_, id) => {
      const f = feders.find(ff => Number(ff.id) === Number(id))
      if (!f) return `@${id}`
      return `<span class="mentions">@${(f.nombre||'')+' '+(f.apellido||'')}</span>`
    })
    return { __html: ` — ${html}` }
  }, [replyTo, feders])

  const handleSend = async () => {
    if (!msg.trim() && files.length === 0) return
    const adj = files.map(f => ({ nombre:f.name, mime:f.type||null, tamano_bytes:f.size||0 }))
    const menciones = Array.from(new Set(
      [...(msg.matchAll(/@(\d+)\b/g))].map(m => Number(m[1]))
    )).filter(n => Number.isFinite(n))

    await onSend({ contenido: msg, adjuntos: adj, menciones })
    setMsg(''); setFiles([])
  }

  // ⬇️ ÚNICO handler de pegado para tareas
  const onPaste = (e) => {
    if (!e.clipboardData) return
    const imgs = Array.from(e.clipboardData.items||[])
      .filter(it => it.type?.startsWith('image/'))
      .map(it => it.getAsFile())
      .filter(Boolean)
      .map((f, i) => {
        if (!f.name) {
          const ext = (f.type?.split('/')?.[1] || 'png').toLowerCase()
          return new File([f], `clipboard-${Date.now()}-${i}.${ext}`, { type: f.type })
        }
        return f
      })
    if (!imgs.length) return
    e.preventDefault()
    e.stopPropagation() // evita que llegue a otros listeners potenciales
    setFiles(prev => {
      const next = [...prev, ...imgs]
      const seen = new Set()
      return next.filter(f => { const k = `${f.name}-${f.size}-${f.lastModified}`; if (seen.has(k)) return false; seen.add(k); return true })
    })
  }

  return (
    <div className="composer" onPasteCapture={onPaste}>
      <div style={{display:'grid', gap:6}}>
        {replyTo && (
          <div className="replyingTo">
            <FaReply className="ico" aria-hidden="true" />
            Respondiendo a <b>{[replyTo.autor_nombre, replyTo.autor_apellido].filter(Boolean).join(' ')||'Feder'}</b>
            <span className="muted" style={{marginLeft:6}} dangerouslySetInnerHTML={replyHtml} />
            <button className="ghost" onClick={onCancelReply} title="Cancelar">✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: 'row', padding: 0 }}>
           <button className="primary" onClick={handleSend} disabled={!canPost || (!msg.trim() && files.length===0)}>
            <IoMdSend aria-hidden="true" />
          </button>
        <MentionTextArea
          value={msg}
          onChange={setMsg}
          feders={feders}
          disabled={!canPost}
          // ⛔️ NO pasamos onPaste acá para que no duplique
          placeholder={'Escribir un mensaje… (mencioná con @nombre)'}
          classNames={{ root:'mentionBox', textarea:'mentionInput', popover:'mentionPopover', item:'mentionItem' }}
          inputRef={inputRef}
        />

        
         
      
        </div>
      </div>

      {/* ⛔️ No pasamos onPaste ni listenGlobal: evita el doble pegado */}
      <FilesPicker files={files} onChange={setFiles} showPreviews />
    </div>
  )
})

export default Composer
