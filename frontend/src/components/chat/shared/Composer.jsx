import React, { forwardRef, useContext, useImperativeHandle, useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useSendMessage, useChannelMembers, useCreateInstantMeet, useScheduleMeeting } from '../../../hooks/useChat'
import useFeders from '../../../hooks/useFeders'
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
import { fullName, displayName, pickAvatar, firstInitial } from '../../../utils/people'
import { resolveMediaUrl } from '../../../utils/media'
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

/* ---------------- Helper: próxima media hora desde ahora ---------------- */
function nextHalfHour() {
  const now = new Date()
  // redondear hacia arriba a la siguiente media hora
  const ms = 30 * 60 * 1000
  const next = new Date(Math.ceil(now.getTime() / ms) * ms)
  return next
}
function toLocalISO(d) {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

/* ---------------- Modal: Agendar Reunión ---------------- */
function ScheduleMeetModal({ canal_id, myId, allFeders = [], initialSelected = [], onClose, onSent, googleConnected }) {
  const toast = useToast()
  const scheduleMeeting = useScheduleMeeting()

  const defaultStart = useMemo(() => nextHalfHour(), [])
  const defaultEnd = useMemo(() => new Date(defaultStart.getTime() + 30 * 60000), [defaultStart])

  const [titulo, setTitulo] = useState('Reunión')
  const [startStr, setStartStr] = useState(() => toLocalISO(defaultStart))
  const [endStr, setEndStr] = useState(() => toLocalISO(defaultEnd))

  // Todos excepto el usuario actual
  const others = useMemo(() => allFeders.filter(f => f.id !== myId), [allFeders, myId])

  // Inicializar seleccionados una vez que los participantes y los miembros del canal carguen
  const initialized = useRef(false)
  const [selectedGuests, setSelectedGuests] = useState([])
  useEffect(() => {
    if (!initialized.current && others.length > 0 && initialSelected !== null) {
      if (initialSelected.length > 0) {
        const toSelect = initialSelected.filter(id => others.some(f => f.id === id))
        setSelectedGuests(toSelect)
      }
      initialized.current = true
    }
  }, [others, initialSelected])

  const toggleGuest = (id) =>
    setSelectedGuests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSubmit = async () => {
    if (!titulo.trim()) { toast?.error('Escribí un título para la reunión'); return }
    try {
      await scheduleMeeting.mutateAsync({
        canal_id,
        titulo: titulo.trim(),
        starts_at: new Date(startStr).toISOString(),
        ends_at: new Date(endStr).toISOString(),
        provider_codigo: googleConnected ? 'google_meet' : 'none',
        attendee_user_ids: selectedGuests
      })
      toast?.success('Reunión agendada ✅')
      window.dispatchEvent(new CustomEvent('fh:chat:sent', { detail: { canal_id } }))
      window.dispatchEvent(new CustomEvent('fh:calendar:refresh'))
      onSent?.()
      onClose()
    } catch (err) {
      toast?.error(err?.response?.data?.message || err?.message || 'Error al agendar la reunión')
    }
  }

  return (
    <div className="smOverlay" onClick={onClose}>
      <div className="smModal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="smHeader">
          <div className="smHeader-icon"><FiCalendar /></div>
          <div className="smHeader-text">
            <h3>Agendar reunión</h3>
            <p>{googleConnected ? 'Con Google Meet' : 'Sin link de Meet'}</p>
          </div>
          <button type="button" className="smClose" onClick={onClose}><FiX /></button>
        </div>

        {/* Body */}
        <div className="smBody">

          {/* Título */}
          <div className="smFormGroup">
            <label className="smLabel">Título</label>
            <input
              type="text"
              className="smInput"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="ej. Reunión de equipo"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            />
          </div>

          {/* Inicio / Fin en fila */}
          <div className="smDateRow">
            <div className="smFormGroup">
              <label className="smLabel">Inicio</label>
              <input type="datetime-local" className="smInput smDateInput" value={startStr} onChange={e => setStartStr(e.target.value)} />
            </div>
            <div className="smFormGroup">
              <label className="smLabel">Fin</label>
              <input type="datetime-local" className="smInput smDateInput" value={endStr} onChange={e => setEndStr(e.target.value)} />
            </div>
          </div>

          {/* Participantes — tile grid */}
          <div className="smFormGroup">
            <label className="smLabel">
              Participantes <span className="smLabelCount">({selectedGuests.length}/{others.length})</span>
            </label>

            {others.length > 0 ? (
              <div className="smTileGrid">
                {others.map(f => {
                  const name = `${f.nombre || ''} ${f.apellido || ''}`.trim() || f.email || `Usuario ${f.id}`
                  const firstName = f.nombre || name.split(' ')[0]
                  const sel = selectedGuests.includes(f.id)
                  return (
                    <button
                      key={String(f.id)}
                      type="button"
                      title={`${f.nombre} ${f.apellido}`.trim() || f.email}
                      className={`smTile${sel ? ' selected' : ''}`}
                      onClick={() => toggleGuest(f.id)}
                    >
                      <div className="smTileAvatarWrapper">
                        {f.avatar_url ? (
                          <img src={f.avatar_url} alt={f.nombre} className="smTileAvatar" />
                        ) : (
                          <span className="smTileInitial">{firstInitial(f)}</span>
                        )}
                        {sel && <span className="smTileCheck">✓</span>}
                      </div>
                      <span className="smTileName">{f.nombre || f.email?.split('@')[0]}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="smEmptyHint">Cargando lista de participantes...</p>
            )}
          </div>

          {!googleConnected && (
            <p className="smHint">
              💡 Conecta Google Calendar para incluir un link de Meet y enviar invitaciones por email.
            </p>
          )}

          <div className="smActions">
            <button type="button" className="fh-btn ghost" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="fh-btn primary"
              disabled={scheduleMeeting.isPending || !titulo.trim()}
              onClick={handleSubmit}
            >
              {scheduleMeeting.isPending ? 'Agendando…' : '📅 Agendar'}
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

  const { data: members = [], isLoading: membersLoading } = useChannelMembers(canal_id)
  const { user } = useAuthCtx()
  const myId = user?.id

  // Todos los feders para invitar (incluyendo los de DMs, no solo miembros del canal)
  const { rows: allFedersRaw = [] } = useFeders({ limit: 500, is_activo: 'true' })

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

  // Todos los feders con formato normalizado para el modal
  const allFeders = useMemo(() => {
    // 1) Empezar con los miembros del canal (que ya tenemos cargados)
    const base = members.map(m => {
      const nom = m?.user?.feder?.nombre ?? m?.feder?.nombre ?? ''
      const ape = m?.user?.feder?.apellido ?? m?.feder?.apellido ?? ''
      return {
        id: m.user_id,
        nombre: nom,
        apellido: ape,
        email: m?.user?.email || '',
        avatar_url: resolveMediaUrl(pickAvatar(m))
      }
    })

    // 2) Agregar los del sistema (500 limit)
    const extras = allFedersRaw.map(f => {
      return {
        id: f.user_id ?? f.id,
        nombre: f.nombre ?? '',
        apellido: f.apellido ?? '',
        email: f.email ?? f.user_email ?? '',
        avatar_url: resolveMediaUrl(pickAvatar(f))
      }
    })

    // 3) De-duplicar por ID (vía Map)
    const map = new Map()
    base.forEach(x => { if (x.id) map.set(x.id, x) })
    extras.forEach(x => {
      if (x.id && !map.has(x.id)) map.set(x.id, x)
    })

    return Array.from(map.values())
  }, [members, allFedersRaw])

  // IDs de miembros del canal (sin el propio usuario) — pre-selección por defecto
  const channelMemberIds = useMemo(() => {
    if (membersLoading) return null // Esperar hasta que carguen
    const othersM = members.map(m => m.user_id).filter(id => id && id !== myId)
    // "Sólo tiene que estar seleccionado el usuario del chat desde el que creo la reunion"
    // Interpretación: en un DM, pre-seleccionar al otro. En grupos/canales, dejar vacío para que el usuario elija.
    if (canal?.tipo_codigo === 'dm') return othersM
    return []
  }, [members, myId, canal?.tipo_codigo, membersLoading])

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
          key={canal_id} // Reset state when channel changes
          open={openSchedule}
          onClose={() => setOpenSchedule(false)}
          canal_id={canal_id}
          initialSelected={channelMemberIds}
          myId={myId}
          allFeders={allFeders}
          googleConnected={googleConnected}
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