import React, { forwardRef, useContext, useImperativeHandle, useRef, useState } from 'react'
import { useSendMessage, useChannelMembers } from '../../../hooks/useChat'
import { useTypingEmitter } from '../../../hooks/useTypingEmitter'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { FiSend, FiSmile, FiX, FiMic } from 'react-icons/fi'
import { FaRegFile } from 'react-icons/fa'
import EmojiPicker from '../../common/EmojiPicker'
import AttachmentIcon from './AttachmentIcon'
import AudioRecorderModal from './AudioRecorderModal'
import { ChatActionCtx } from './context'
import MentionInput from './MentionInput'
import { fullName, displayName, pickAvatar, getEmail } from '../../../utils/people'
import './Composer.scss'

/* ---------------- Helpers menciones ---------------- */
const escapeRe = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/**
 * Convierte @Nombre Apellido -> @user:<id>, respetando espacios/puntuación.
 * No toca las menciones que YA vienen en forma @user:<id>.
 */
function normalizeMentions(plainText = '', feders = []) {
  if (!plainText || !plainText.includes('@')) return plainText

  // Lista (id, nombre completo) válida y ordenada por longitud desc (evita colisiones: "Ana" vs "Ana María")
  const list = feders.map(f => ({
    id: Number(f.id),
    full: `${f?.nombre || ''} ${f?.apellido || ''}`.replace(/\s+/g, ' ').trim()
  })).filter(f => f.id && f.full)
  if (!list.length) return plainText

  list.sort((a, b) => b.full.length - a.full.length)

  let out = plainText
  for (const f of list) {
    const re = new RegExp(`(^|\\s)@${escapeRe(f.full)}(?=(\\s|[.,!?;:]|$))`, 'gi')
    out = out.replace(re, (_, p1) => `${p1}@user:${f.id}`)
  }
  return out
}

const Composer = forwardRef(function Composer({ canal_id, canal, disabled = false, reason = '' }, ref) {
  const [text, setText] = useState('')
  const [openEmoji, setOpenEmoji] = useState(false)
  const [openAudio, setOpenAudio] = useState(false)
  const [files, setFiles] = useState([])
  const send = useSendMessage()
  const fileRef = useRef(null)
  const { replyTo, setReplyTo } = useContext(ChatActionCtx)

  const { data: members = [] } = useChannelMembers(canal_id)
  const { user } = useAuthCtx()
  const myId = user?.id

  const typing = useTypingEmitter(canal_id, {
    my_user_id: myId,
    throttleMs: 1200,
    ttl: 5,
    debugSelf: process.env.NODE_ENV !== 'production'
  })

  useImperativeHandle(ref, () => ({ addFiles: (arr = []) => setFiles(prev => prev.concat(arr)) }))

  const feders = members.map(m => ({
    id: m.user_id,
    nombre: m?.user?.feder?.nombre ?? m?.feder?.nombre ?? '',
    apellido: m?.user?.feder?.apellido ?? m?.feder?.apellido ?? '',
    email: m?.user?.email || ''
  }))

  // Capta imágenes del portapapeles (incluye blobs sin nombre)
  const addClipboardImages = (e) => {
    if (!e?.clipboardData || disabled) return
    const imgs = Array.from(e.clipboardData.items || [])
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
    setFiles(prev => {
      const seen = new Set(prev.map(p => `${p.name}-${p.size}-${p.lastModified}`))
      const merged = [...prev]
      imgs.forEach(f => {
        const key = `${f.name}-${f.size}-${f.lastModified}`
        if (!seen.has(key)) { merged.push(f); seen.add(key) }
      })
      return merged
    })
  }

  async function onSubmit(e) {

    e?.preventDefault?.()
    const isStuck = send.isPending && (Date.now() - lastSubmitAt.current > 10000)
    if (send.isPending && !isStuck) return
    if (disabled) return
    lastSubmitAt.current = Date.now()
    const bodyTextRaw = text.trim()
    if ((bodyTextRaw.length === 0 && files.length === 0) || disabled) return

    // Prevenir clics dobles rápidos, pero sin bloquear el reintento si algo falló.
    // Usamos el estado isPending de react-query.

    // 🔁 Normalizamos menciones visibles a tokens para el backend
    const bodyText = normalizeMentions(bodyTextRaw, feders)

    try {
      if (files.length) {
        const fd = new FormData()
        fd.append('body_text', bodyText)
        if (replyTo?.id) fd.append('parent_id', String(replyTo.id))
        files.forEach(f => fd.append('files', f))
        await send.mutateAsync({ canal_id, body: fd, isMultipart: true })
      } else {
        const payload = { body_text: bodyText, parent_id: replyTo?.id || null }
        await send.mutateAsync({ canal_id, body: payload })
      }
      window.dispatchEvent(new CustomEvent('fh:chat:sent', { detail: { canal_id } }))
      setText(''); setFiles([]); setOpenEmoji(false); setReplyTo(null)
    } catch (err) {
      console.error('send failed', err)
    } finally {
      typing.stop()
    }
  }

  function onChange(v) { setText(v); typing.ping() }
  const lastSubmitAt = useRef(0)
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Safety: si isPending está trabado (más de 10s), permitimos intentar de nuevo
      const isStuck = send.isPending && (Date.now() - lastSubmitAt.current > 10000)
      if (send.isPending && !isStuck) {
        e.preventDefault()
        return
      }
      lastSubmitAt.current = Date.now()
    }
    typing.ping()
  }
  const onBlur = () => { typing.stop() }
  const addEmoji = (em) => setText(t => (t + em))
  const onPickFiles = (e) => { const arr = Array.from(e.target.files || []); setFiles(prev => prev.concat(arr)); e.target.value = '' }
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))
  const onDragOver = (e) => { e.preventDefault(); if (disabled) return }
  const onDrop = (e) => { e.preventDefault(); if (disabled) return; const arr = Array.from(e.dataTransfer?.files || []); if (arr.length) setFiles(prev => prev.concat(arr)) }

  const replyAuthor = fullName(replyTo) || displayName(replyTo) || 'alguien'

  return (
    <form
      className={`chat-composer ${disabled ? 'is-disabled' : ''}`}
      onSubmit={onSubmit}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPasteCapture={addClipboardImages} /* captura aunque el input hijo no propague */
    >
      <div className="controlsLeft">
        <button type="button" className="attachBtn" disabled={disabled} title="Adjuntar archivos" onClick={() => fileRef.current?.click()}>
          <FaRegFile />
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={onPickFiles} />
      </div>

      <div className="inputWrap">
        {replyTo && (
          <div className="replyingTo">
            <span className="lbl">RESPONDIENDO A</span>
            <span className="who" title={replyAuthor}>{replyAuthor}</span>
            <button className="ghost" type="button" onClick={() => setReplyTo(null)}><FiX /></button>
          </div>
        )}

        <MentionInput
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          feders={feders}
          disabled={disabled}
          placeholder="Escribí un mensaje… (@ para mencionar)"
          onPaste={addClipboardImages}
        />

        {!!files.length && (
          <div className="attachPreview">
            {files.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className="chip">
                <span className="ico"><AttachmentIcon mime={f.type} name={f.name} /></span>
                <span className="nm" title={f.name}>{f.name}</span>
                <button type="button" className="rm" title="Quitar" onClick={() => removeFile(idx)}><FiX /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="controlsRight">
        <button
          type="button"
          className="emojiBtn"
          disabled={disabled}
          title="Grabar audio"
          onClick={() => setOpenAudio(true)}
        >
          <FiMic />
        </button>

        <button
          type="submit"
          className="sendBtn"
          disabled={disabled || (send.isPending && (Date.now() - lastSubmitAt.current < 10000)) || (!text.trim() && files.length === 0)}
          title="Enviar"
        >
          <FiSend />
        </button>
      </div>

      {disabled && (
        <div className="disabledOverlay">
          <div className="msg">{reason || 'No tenés permisos para publicar en este canal'}</div>
        </div>
      )}

      <AudioRecorderModal
        open={openAudio}
        onClose={() => setOpenAudio(false)}
        onSend={(file) => setFiles(prev => [...prev, file])}
      />
    </form>
  )
})

export default Composer