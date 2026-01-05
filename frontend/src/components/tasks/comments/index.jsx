import React, { useMemo, useRef, useState, useEffect } from 'react'
import Avatar from '../../Avatar.jsx'
import AttendanceBadge from '../../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../../hooks/useAttendanceStatus.js'
import { useTaskComments } from '../../../pages/Tareas/hooks/useTaskComments'
import CommentItem from './CommentItem'
import Composer from './Composer'
import './comments.scss'

// ---- Utils ----
const fmtDateTime = (iso, locale = 'es-AR') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

const timeAgo = (iso) => {
  const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

const groupByDay = (arr = []) => {
  const out = []; let cur = null
  for (const c of arr) {
    const key = new Date(c.created_at).toDateString()
    if (!cur || cur.key !== key) { cur = { key, items: [c] }; out.push(cur) }
    else cur.items.push(c)
  }
  return out
}

// helper: normaliza a number o null
const toNum = v => (v === null || v === undefined || v === '' ? null : Number(v))

export default function TaskComments({ taskId, catalog }) {
  const { comentarios, loading, add } = useTaskComments(taskId, catalog)
  const [replyTo, setReplyTo] = useState(null)
  const composerRef = useRef(null)
  const listRef = useRef(null)

  const canPost = !!catalog?.comentario_tipos?.length
  const feders = catalog?.feders || []

  // === IDs del usuario actual (robusto a distintos shapes) ===
  const meUserId = toNum(
    catalog?.me?.user_id ??
    catalog?.current_user_id ??
    null
  )

  const meFederId = toNum(
    catalog?.me?.feder_id ??
    catalog?.me?.feder?.id ??
    catalog?.me?.id ??
    null
  )

  // mapa id → persona
  const fedById = useMemo(() => {
    const m = new Map()
    for (const f of feders) m.set(toNum(f.id), f)
    return m
  }, [feders])

  // fallback feder propio si no vino explícito en 'me'
  const myFederId = useMemo(() => {
    if (meFederId != null) return meFederId
    if (meUserId == null) return null
    const me = (feders || []).find(f => toNum(f.user_id) === meUserId)
    return toNum(me?.id ?? null)
  }, [meFederId, meUserId, feders])

  const escapeHtml = (s = '') =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Render: se escribe @id pero se muestra @Nombre Apellido
  const renderContenido = (texto = '', menciones = []) => {
    // 1) escape + saltos de línea
    let html = escapeHtml(texto).replace(/\n/g, '<br/>')

    // 2) reemplazo de menciones conocidas por id → nombre
    //    (primero por lista de menciones, luego fallback global @(\d+) o @[Nombre](id))
    const replaceIdWithName = (_, idStr) => {
      const f = fedById.get(Number(idStr))
      if (!f) return `@${idStr}`
      const full = `${f.nombre || ''} ${f.apellido || ''}`.trim()
      return `<span class="mentions">@${full}</span>`
    }

    const replaceTokenWithName = (_, nameStr, idStr) => {
      // Usamos el ID como fuente de verdad por si el nombre cambió
      const f = fedById.get(Number(idStr))
      const full = f ? `${f.nombre || ''} ${f.apellido || ''}`.trim() : nameStr
      return `<span class="mentions">@${full}</span>`
    }

    // por arreglo de menciones del backend (legacy support)
    for (const fidRaw of (menciones || [])) {
      const fid = toNum(fidRaw)
      if (!fid) continue
      const f = fedById.get(fid); if (!f) continue
      const full = `${f.nombre || ''} ${f.apellido || ''}`.trim()
      html = html.replace(new RegExp(`@${fid}\\b`, 'g'), `<span class="mentions">@${full}</span>`)
    }

    // New format: @[Nombre](id)
    html = html.replace(/@\[([^\]\n]+)\]\((\d+)\)/g, replaceTokenWithName)

    // Fallback: cualquier @(\d+)
    html = html.replace(/@(\d+)\b/g, replaceIdWithName)

    // 3) linkify (después de menciones)
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

    return { __html: html }
  }

  const renderReplyExcerpt = (texto = '') => {
    let html = escapeHtml(texto.replace(/\s+/g, ' '))
    // Formato nuevo: @[Nombre](id)
    html = html.replace(/@\[([^\]\n]+)\]\((\d+)\)/g, (_, name, id) => {
      const f = fedById.get(toNum(id))
      const full = f ? `${f.nombre || ''} ${f.apellido || ''}`.trim() : name
      return `<span class="mentions">@${full}</span>`
    })
    // Formato viejo
    html = html.replace(/@(\d+)\b/g, (_, id) => {
      const f = fedById.get(toNum(id))
      if (!f) return `@${id}`
      const full = `${f.nombre || ''} ${f.apellido || ''}`.trim()
      return `<span class="mentions">@${full}</span>`
    })
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
    return { __html: html }
  }

  // orden por fecha (viejos arriba)
  const sorted = useMemo(
    () => (comentarios || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [comentarios]
  )
  const groups = useMemo(() => groupByDay(sorted), [sorted])

  // Get feder IDs for attendance status
  const commentFederIds = useMemo(() => {
    const ids = new Set()
    for (const c of sorted) {
      const fid = toNum(c.feder_id ?? c.autor_feder_id)
      if (fid) ids.add(fid)
    }
    return [...ids]
  }, [sorted])
  const { statuses } = useAttendanceStatus(commentFederIds)

  // autoscroll al final
  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [sorted.length])

  const handleSend = async ({ contenido, adjuntos, menciones, files }) => {
    await add({ contenido, adjuntos, menciones, files, reply_to_id: replyTo?.id || null })
    setReplyTo(null)
  }

  const handleReply = (c) => {
    setReplyTo(c)
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  const dayLabel = (iso) =>
    new Intl.DateTimeFormat('es-AR', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
      .format(new Date(iso))

  return (
    <div className="card comments">
      <div className="cardHeader">
        <div className="header-info">
          <span className="title">Conversación</span>
          {!loading && (
            <span className="count-badge">
              {sorted?.length || 0}
            </span>
          )}
        </div>
      </div>

      <div className="list" ref={listRef}>
        {loading && <div className="empty">Cargando…</div>}
        {!loading && (!sorted || sorted.length === 0) && <div className="empty">—</div>}

        {!loading && groups.map(g => (
          <div key={g.key}>
            <div className="daySep"><span>{dayLabel(g.items[0].created_at)}</span></div>
            {g.items.map(c => {
              const author = [c.autor_nombre, c.autor_apellido].filter(Boolean).join(' ') || 'Feder'

              // Tolerante al shape del backend
              const cFederId = toNum(c.feder_id ?? c.autor_feder_id ?? null)
              const cAutorUid = toNum(c.autor_user_id ?? null)

              // FALLBACK cliente si no viene is_mine
              const fallbackIsMine =
                (cAutorUid != null && meUserId != null && cAutorUid === meUserId) ||
                (cFederId != null && myFederId != null && cFederId === myFederId)

              // ROBUSTO: prioriza c.is_mine del backend
              const isMine = (typeof c.is_mine === 'boolean') ? c.is_mine : fallbackIsMine

              return (
                <div className={`item ${isMine ? 'mine' : ''}`} key={c.id}>
                  <div className="avatarWrapper">
                    <Avatar className="ph-avatar" name={author} src={c.autor_avatar_url} size={30} />
                    <AttendanceBadge modalidad={getModalidad(statuses, cFederId)} size={12} />
                  </div>
                  <CommentItem
                    c={c}
                    author={author}
                    isMine={isMine}
                    timeAgo={timeAgo}
                    fmtDateTime={fmtDateTime}
                    onReply={() => handleReply(c)}
                    renderContenido={renderContenido}
                    renderReplyExcerpt={renderReplyExcerpt}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <Composer
        ref={composerRef}
        canPost={canPost}
        feders={feders}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  )
}