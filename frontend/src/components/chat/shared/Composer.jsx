import React, { forwardRef, useContext, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react'
import { useSendMessage, useChannelMembers, useCreateInstantMeet } from '../../../hooks/useChat'
import { useGoogleStatus } from '../../../hooks/useCalendario'
import { useTypingEmitter } from '../../../hooks/useTypingEmitter'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { useToast } from '../../toast/ToastProvider'
import { FiSend, FiSmile, FiX, FiMic, FiPlus, FiVideo, FiCalendar, FiLink } from 'react-icons/fi'
import { FaRegFile } from 'react-icons/fa'
import EmojiPicker from '../../common/EmojiPicker'
import StickerPicker from './StickerPicker'
import AttachmentIcon from './AttachmentIcon'
import AudioRecorderModal from './AudioRecorderModal'
import { ChatActionCtx } from './context'
import MentionInput from './MentionInput'
import { CenteredPicker } from './ReactionBar'
import { fullName, displayName } from '../../../utils/people'
import { calendarioApi } from '../../../api/calendario'
import { chatApi } from '../../../api/chat'
import './Composer.scss'

/* ---------------- Helpers menciones ---------------- */
const escapeRe = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function normalizeMentions(plainText = '', feders = []) {
  if (!plainText || !plainText.includes('@')) return plainText
  const list = feders.map(f => ({
    id: Number(f.id),
    full: `${f?.nombre || ''} ${f?.apellido || ''}`.replace(/\s+/g, ' ').trim()
  })).filter(f => f.id && f.full)
  if (!list.length) return plainText
  list.sort((a, b) => b.full.length - a.full.length)
  let out = plainText
  for (const f of list) {
    const escaped = escapeRe(f.full)
    const re = new RegExp(`(^|\\s)@${escaped}(?=(\\s|[.,!?;:]|$))`, 'gi')
    out = out.replace(re, (_, p1) => `${p1}@user:${f.id}`)
  }
  return out
}

/* ---------------- Modal: Agendar Reunión ---------------- */
function ScheduleMeetModal({ canal_id, onClose, onSent, googleConnected }) {
  const toast = useToast()
  const [titulo, setTitulo] = useState('Reunión')
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    // Ajustar a ISO local para el input datetime-local
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  })
  const [duracion, setDuracion] = useState(60) // minutos
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!titulo.trim()) { toast?.error('Escribí un título para la reunión'); return }
    setLoading(true)
    try {
      const starts_at = new Date(fecha).toISOString()
      const ends_at = new Date(new Date(fecha).getTime() + duracion * 60000).toISOString()
      const result = await chatApi.meetings.schedule(canal_id, {
        titulo: titulo.trim(),
        starts_at,
        ends_at,
        provider_codigo: googleConnected ? 'google_meet' : 'none'
      })
      toast?.success('Reunión agendada y agregada al calendario ✅')
      onSent?.()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al agendar la reunión'
      toast?.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pasteMeetOverlay" onClick={onClose}>
      <div className="pasteMeetModal scheduleMeetModal" onClick={e => e.stopPropagation()}>
        <div className="pasteMeetHeader">
          <FiCalendar />
          <span>Agendar reunión</span>
          <button type="button" className="closeBtn" onClick={onClose}><FiX /></button>
        </div>

        <div className="scheduleMeetForm">
          <div className="smField">
            <label>Título</label>
            <input
              type="text"
              className="pasteMeetInput"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="ej. Reunión de equipo"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            />
          </div>

          <div className="smField">
            <label>Fecha y hora inicio</label>
            <input
              type="datetime-local"
              className="pasteMeetInput"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          <div className="smField">
            <label>Duración</label>
            <select
              className="pasteMeetInput"
              value={duracion}
              onChange={e => setDuracion(Number(e.target.value))}
            >
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h 30min</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          {!googleConnected && (
            <p className="smHint">
              💡 Para incluir un link de Google Meet, conectá tu cuenta de Google desde el módulo Calendario.
            </p>
          )}

          <div className="pasteMeetActions">
            <button type="button" className="cancelBtn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="sendBtn" disabled={loading || !titulo.trim()} onClick={handleSubmit}>
              {loading ? 'Agendando…' : '📅 Agendar reunión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Composer principal ---------------- */
const Composer = forwardRef(function Composer({ canal_id, canal, disabled = false, reason = '' }, ref) {
  const [text, setText] = useState('')
  const [openEmoji, setOpenEmoji] = useState(false)
  const [pickerTab, setPickerTab] = useState('emoji') // 'emoji' | 'sticker'
  const [openAudio, setOpenAudio] = useState(false)
  const [openPlus, setOpenPlus] = useState(false)
  const [openSchedule, setOpenSchedule] = useState(false)
  const [files, setFiles] = useState([])
  const send = useSendMessage()
  const createMeet = useCreateInstantMeet()
  const toast = useToast()
  const fileRef = useRef(null)
  const plusRef = useRef(null)
  const { replyTo, setReplyTo } = useContext(ChatActionCtx)

  const { data: members = [] } = useChannelMembers(canal_id)
  const { user } = useAuthCtx()
  const myId = user?.id

  // Estado de Google (para mostrar opciones correctas)
  const { connected: googleConnected, loading: googleLoading, refresh: refreshGoogleStatus } = useGoogleStatus()

  const typing = useTypingEmitter(canal_id, {
    my_user_id: myId,
    throttleMs: 1200,
    ttl: 5,
    debugSelf: process.env.NODE_ENV !== 'production'
  })

  // Autofocus logic
  const inputRef = useRef(null)
  useEffect(() => {
    if (canal_id && inputRef.current) {
      setTimeout(() => { inputRef.current?.focus() }, 100)
    }
  }, [canal_id])

  useImperativeHandle(ref, () => ({ addFiles: (arr = []) => setFiles(prev => prev.concat(arr)) }))

  const feders = members.map(m => ({
    id: m.user_id,
    nombre: m?.user?.feder?.nombre ?? m?.feder?.nombre ?? '',
    apellido: m?.user?.feder?.apellido ?? m?.feder?.apellido ?? '',
    email: m?.user?.email || '',
    avatar_url: m?.user?.feder?.avatar_url ?? m?.feder?.avatar_url ?? null
  }))

  // Capta imágenes del portapapeles
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

    const bodyText = normalizeMentions(bodyTextRaw, feders)

    try {
      if (files.length) {
        const MAX_SIZE = 50 * 1024 * 1024 * 1024
        const totalSize = files.reduce((acc, f) => acc + f.size, 0)
        if (totalSize > MAX_SIZE) {
          toast?.error(`El tamaño total de los archivos supera el límite de 50GB`)
          return
        }
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
      const msg = err.response?.status === 413
        ? 'El archivo es demasiado grande para el servidor'
        : (err.fh?.message || 'Error al enviar el mensaje')
      toast?.error(msg)
    } finally {
      typing.stop()
    }
  }

  function onChange(v) { setText(v); typing.ping() }
  const lastSubmitAt = useRef(0)
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
  const addEmoji = useCallback((em) => setText(t => (t + em)), [])

  const onSelectSticker = async (sticker) => {
    try {
      const payload = {
        body_text: "",
        body_json: {
          type: 'sticker',
          sticker: { id: sticker.id, url: sticker.url, name: sticker.name }
        },
        parent_id: replyTo?.id || null
      }
      await send.mutateAsync({ canal_id, body: payload })
      setOpenEmoji(false)
      setReplyTo(null)
    } catch (err) {
      toast?.error('Error al enviar sticker')
    }
  }
  const onPickFiles = (e) => { const arr = Array.from(e.target.files || []); setFiles(prev => prev.concat(arr)); e.target.value = '' }
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))
  const onDragOver = (e) => { e.preventDefault(); if (disabled) return }
  const onDrop = (e) => { e.preventDefault(); if (disabled) return; const arr = Array.from(e.dataTransfer?.files || []); if (arr.length) setFiles(prev => prev.concat(arr)) }

  // Plus menu: close on outside click
  useEffect(() => {
    if (!openPlus) return
    const handler = (e) => {
      if (plusRef.current && !plusRef.current.contains(e.target)) setOpenPlus(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPlus])

  // ---- Opción 1: link rápido (Instant Meet)
  const handleInstantMeet = async () => {
    setOpenPlus(false)
    try {
      await createMeet.mutateAsync({ canal_id })
      window.dispatchEvent(new CustomEvent('fh:chat:sent', { detail: { canal_id } }))
    } catch (err) {
      const code = err?.response?.data?.code || err?.code
      if (code === 'GOOGLE_NOT_CONNECTED') {
        refreshGoogleStatus()
        toast?.error('Conectá tu cuenta de Google desde el módulo Calendario para usar esta función.')
      } else {
        toast?.error(err?.response?.data?.message || err?.message || 'Error al crear reunión')
      }
    }
  }

  // ---- Opción 2: agendar reunión (modal)
  const handleOpenSchedule = () => {
    setOpenPlus(false)
    setOpenSchedule(true)
  }

  // ---- Conectar Google (si no está conectado)
  const handleConnectGoogle = () => {
    setOpenPlus(false)
    const url = calendarioApi.google.connectUrl()
    const w = window.open(url, '_blank', 'width=520,height=640')
    const timer = setInterval(() => {
      if (w?.closed) { clearInterval(timer); refreshGoogleStatus() }
    }, 700)
  }

  const replyAuthor = fullName(replyTo) || displayName(replyTo) || 'alguien'

  return (
    <>
      <form
        className={`chat-composer ${disabled ? 'is-disabled' : ''}`}
        onSubmit={onSubmit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPasteCapture={addClipboardImages}
      >
        <div className="controlsLeft" ref={plusRef}>
          <button type="button" className="plusBtn" disabled={disabled} title="Más opciones" onClick={() => setOpenPlus(p => !p)}>
            <FiPlus className={openPlus ? 'rotated' : ''} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={onPickFiles} />

          {openPlus && (
            <div className="plusMenu">
              {/* Adjuntar archivo - siempre visible */}
              <button type="button" onClick={() => { setOpenPlus(false); fileRef.current?.click() }}>
                <FaRegFile />
                <span>Adjuntar archivo</span>
              </button>

              <div className="plusMenu-divider" />

              {googleConnected ? (
                /* Google conectado: mostrar ambas opciones de reunión */
                <>
                  <button type="button" onClick={handleInstantMeet} disabled={createMeet.isPending}>
                    <FiLink />
                    <span>{createMeet.isPending ? 'Creando…' : 'Enviar link de reunión'}</span>
                  </button>
                  <button type="button" onClick={handleOpenSchedule}>
                    <FiCalendar />
                    <span>Agendar reunión</span>
                  </button>
                </>
              ) : (
                /* Sin Google: conectar + agendar sin meet link */
                <>
                  <button
                    type="button"
                    className="plusMenu-connect"
                    onClick={handleConnectGoogle}
                  >
                    <FiVideo />
                    <span>Conectar Google Meet</span>
                  </button>
                  <button type="button" onClick={handleOpenSchedule}>
                    <FiCalendar />
                    <span>Agendar reunión</span>
                  </button>
                </>
              )}
            </div>
          )}
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
            inputRef={inputRef}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            feders={feders}
            disabled={disabled}
            placeholder="Escribí un mensaje… (@ para mencionar)"
          />

          <div className="emojiIn">
            <button
              type="button"
              className="emojiBtn"
              disabled={disabled}
              title="Emojis y Stickers"
              onClick={() => setOpenEmoji(true)}
            >
              <FiSmile />
            </button>
          </div>

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

        {openEmoji && (
          <CenteredPicker
            onClose={() => setOpenEmoji(false)}
            className="composer-picker-panel"
            layerClassName="composer-picker-layer"
          >
            <div className="composer-popover">
              <div className="popover-tabs">
                <button
                  type="button"
                  className={pickerTab === 'emoji' ? 'active' : ''}
                  onClick={() => setPickerTab('emoji')}
                >
                  Emojis
                </button>
                <button
                  type="button"
                  className={pickerTab === 'sticker' ? 'active' : ''}
                  onClick={() => setPickerTab('sticker')}
                >
                  Stickers
                </button>
              </div>
              <div className="popover-content">
                {pickerTab === 'emoji' ? (
                  <EmojiPicker onSelect={(em) => { addEmoji(em) }} />
                ) : (
                  <StickerPicker onSelect={onSelectSticker} />
                )}
              </div>
            </div>
          </CenteredPicker>
        )}
      </form>

      {/* Modal fuera del <form> para evitar form anidado */}
      {openSchedule && (
        <ScheduleMeetModal
          canal_id={canal_id}
          googleConnected={googleConnected}
          onClose={() => setOpenSchedule(false)}
          onSent={() => {
            window.dispatchEvent(new CustomEvent('fh:chat:sent', { detail: { canal_id } }))
            window.dispatchEvent(new CustomEvent('fh:calendar:refresh'))
          }}
        />
      )}
    </>
  )
})

export default Composer