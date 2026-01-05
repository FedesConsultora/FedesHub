// src/pages/Notificaciones/NotifListPage.jsx
// (solo muestro el archivo completo con los toques para emitir el evento y refrescar queries)
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { notifApi } from '../../api/notificaciones'
import './NotifListPage.scss'

import { useEffect } from 'react'
import { useLoading } from '../../context/LoadingContext.jsx'

export default function NotifListPage({ buzonOverride }) {
  const params = useParams()
  const buzon = buzonOverride ?? params?.buzon // undefined = todas
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const limit = 25
  const offset = page * limit

  const queryParams = useMemo(() => ({
    buzon,
    include_archived: true,
    include_dismissed: true,
    q: q || undefined,
    limit,
    offset,
    sort: 'newest'
  }), [buzon, q, limit, offset])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notif', 'inbox', 'all', buzon || 'todo', { q, limit, offset }],
    queryFn: () => notifApi.inbox(queryParams),
    keepPreviousData: true,
    refetchOnWindowFocus: false
  })

  const { showLoader, hideLoader } = useLoading()
  useEffect(() => {
    if (isLoading) showLoader()
    else hideLoader()
    return () => { if (isLoading) hideLoader() }
  }, [isLoading, showLoader, hideLoader])

  const rows = data?.rows || []
  const total = data?.total || 0
  const qc = useQueryClient()

  const title = useMemo(() =>
    !buzon ? 'Todas las notificaciones'
      : buzon === 'chat' ? 'Notificaciones de Chat'
        : buzon === 'tareas' ? 'Notificaciones de Tareas'
          : 'Notificaciones de Calendario'
    , [buzon])

  return (
    <div className="fhNotifList">
      <div className="head fh-row">
        <h1 className="ttl">{title}</h1>
        <div className="grow" />
        <input
          className="fh-input"
          placeholder="Buscar…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0) }}
        />
      </div>


      {isError && <div className="fh-err">Error cargando.</div>}
      {!isLoading && !isError && rows.length === 0 && <div className="fh-empty">Sin resultados.</div>}

      {!!rows.length && (
        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="colMain">Título / Mensaje</th>
                <th>Buzón</th>
                <th>Fecha</th>
                <th className="colAct">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <TableRow
                  key={r.id}
                  r={r}
                  onChanged={() => {
                    // refrescamos conteos + inbox en todos lados
                    qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
                    qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
                    // y emitimos evento global para el header
                    window.dispatchEvent(new Event('fh:notif:changed'))
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span>{page * limit + 1}–{Math.min((page + 1) * limit, total)} / {total}</span>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

function TableRow({ r, onChanged }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const n = r.notificacion || {}

  const title =
    n.titulo || n?.tarea?.titulo || n?.evento?.titulo ||
    (n?.chatCanal ? `Mención en ${n.chatCanal.nombre}` : n?.tipo?.nombre || 'Notificación')

  const buz =
    n?.tipo?.buzon_id ? (n?.tipo?.codigo || n?.tipo?.nombre || '') :
      (n?.chatCanal ? 'chat' : n?.tarea ? 'tareas' : n?.evento ? 'calendario' : '')

  const createdAt = n?.created_at || n?.createdAt || r?.created_at || r?.createdAt

  const toggleRead = async () => {
    const turnOn = !r.read_at
    await notifApi.read(n.id, turnOn)

    // Optimistic update sobre todas las queries de inbox
    qc.setQueriesData({ queryKey: ['notif', 'inbox'], exact: false }, (old) => {
      if (!old || !old.rows) return old
      const rows = old.rows.map(row =>
        row.id === r.id
          ? { ...row, read_at: turnOn ? new Date().toISOString() : null }
          : row
      )
      return { ...old, rows }
    })

    onChanged?.()
  }

  const toggleArchive = async () => {
    const turnOn = !r.archived_at
    await notifApi.archive(n.id, turnOn)

    qc.setQueriesData({ queryKey: ['notif', 'inbox'], exact: false }, (old) => {
      if (!old || !old.rows) return old
      const rows = old.rows.map(row =>
        row.id === r.id
          ? { ...row, archived_at: turnOn ? new Date().toISOString() : null }
          : row
      )
      return { ...old, rows }
    })

    onChanged?.()
  }

  const handleOpen = async (e) => {
    e.preventDefault()
    const url = n.link_url || ''

    // Marcar como leída
    if (!r.read_at && n.id) {
      try {
        await notifApi.read(n.id, true)
        qc.invalidateQueries({ queryKey: ['notif', 'counts'] })
        qc.invalidateQueries({ queryKey: ['notif', 'inbox'] })
        window.dispatchEvent(new Event('fh:notif:changed'))
      } catch (err) {
        console.warn('Error marcando notificación como leída:', err)
      }
    }

    // Detectar link de tarea: /tareas/123 o similar
    const tareaMatch = url.match(/\/tareas\/(\d+)/)
    if (tareaMatch) {
      const tareaId = tareaMatch[1]
      navigate(`/tareas?open=${tareaId}`)
      return
    }

    // Detectar link de chat: /chat/c/123
    const chatMatch = url.match(/\/chat\/c\/(\d+)/)
    if (chatMatch) {
      navigate(url)
      return
    }

    // Para otros links
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else if (url.startsWith('/')) {
      navigate(url)
    }
  }

  return (
    <tr className={`row ${r.read_at ? 'read' : ''}`}>
      <td className="colMain">
        <div className="ttl">{title}</div>
        {n.mensaje && <div className="msg">{n.mensaje}</div>}
        {n.chatCanal && <div className="meta">Canal: {n.chatCanal?.nombre}</div>}
      </td>
      <td className="colBuzon">{buz || '-'}</td>
      <td className="colFecha">{createdAt ? new Date(createdAt).toLocaleString() : '-'}</td>
      <td className="colAct">
        {n.link_url && <button className="btn" onClick={handleOpen}>Abrir</button>}
        <button className="btn" onClick={toggleRead}>{r.read_at ? 'No leído' : 'Leído'}</button>
        <button className="btn" onClick={toggleArchive}>{r.archived_at ? 'Desarchivar' : 'Archivar'}</button>
      </td>
    </tr>
  )
}