import { useMemo, useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiInfo, FiCalendar, FiClock, FiPaperclip, FiUpload } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { ausenciasApi } from '../../../api/ausencias'
import { useToast } from '../../toast/ToastProvider'
import './Dialog.scss'

const initials = (txt = '') => {
  const p = (txt || '').trim().split(/\s+/).slice(0, 2)
  return p.map(w => w[0] || '').join('').toUpperCase() || '—'
}

export default function DayDetails({ date, items = [], canApprove = false, federById = {}, onUpdated, onNew, onNewAlloc, onEdit }) {
  const [rows, setRows] = useState(items)

  useEffect(() => {
    setRows(items)
  }, [items])
  const { success, error: toastError } = useToast?.() || {}
  const { roles, user } = useAuth()
  const isRRHH = roles.includes('RRHH') || roles.includes('NivelA')
  const [uploadingId, setUploadingId] = useState(null)

  const enhanced = useMemo(() => rows.map(r => {
    const f = federById?.[r.feder_id]
    const name = f
      ? (`${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`)
      : (r.feder_nombre || `Feder #${r.feder_id}`)
    const avatar = f?.avatar_url || f?.img_url || null
    return { ...r, _name: name, _avatar: avatar }
  }), [rows, federById])

  async function approve(id) {
    try {
      const updated = await ausenciasApi.aus.approve(id)
      setRows(rs => rs.map(r => r.id === id ? { ...r, ...updated } : r))
      onUpdated?.(updated)
      success?.('La ausencia ha sido aprobada.')
    } catch (e) {
      toastError?.(e.response?.data?.error || 'No se pudo aprobar la ausencia.')
    }
  }

  async function reject(id) {
    try {
      const updated = await ausenciasApi.aus.reject(id, { denegado_motivo: null })
      setRows(rs => rs.map(r => r.id === id ? { ...r, ...updated } : r))
      onUpdated?.(updated)
      success?.('La ausencia ha sido rechazada.')
    } catch (e) {
      toastError?.(e.response?.data?.error || 'Error al rechazar.')
    }
  }

  async function cancel(id) {
    if (!window.confirm('¿Quieres cancelar esta solicitud?')) return
    try {
      const updated = await ausenciasApi.aus.cancel(id)
      setRows(rs => rs.map(r => r.id === id ? { ...r, ...updated } : r))
      onUpdated?.(updated)
      success?.('Solicitud cancelada con éxito.')
    } catch (e) {
      toastError?.(e.response?.data?.error || 'Error al cancelar.')
    }
  }

  async function handleUploadAttachment(id) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,image/*,.doc,.docx'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploadingId(id)
      try {
        // 1. Subir archivo
        const { url } = await ausenciasApi.upload(file)

        // 2. Actualizar ausencia con la URL
        const updated = await ausenciasApi.aus.update(id, { archivo_url: url })
        setRows(rs => rs.map(r => r.id === id ? { ...r, ...updated } : r))
        onUpdated?.(updated)
        success?.('Adjunto agregado correctamente')
      } catch (e) {
        toastError?.(e.response?.data?.error || 'Error al subir el adjunto')
      } finally {
        setUploadingId(null)
      }
    }
    input.click()
  }

  return (
    <div className="dlg-form day-details">
      {!rows.length ? (
        <div className="section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <FiInfo size={40} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--fh-muted)' }} />
          <p style={{ color: 'var(--fh-muted)', marginBottom: '2rem' }}>No hay registros para este día.</p>
        </div>
      ) : (
        <div className="list">
          {enhanced.map(item => (
            <div key={item.id} className="rowItem">
              <div className="left">
                <div className="who">
                  {item._avatar
                    ? <img className="avatar" src={item._avatar} style={{ width: 42, height: 42, borderRadius: '50%' }} alt="" />
                    : <div className="avatar avatar--fallback" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', fontWeight: 800, fontSize: '0.8rem' }}>{initials(item._name)}</div>}
                  <div className="whoText">
                    <span className="name">{item._name}</span>
                    <span className="type">{item.tipo_nombre}</span>
                  </div>
                </div>
                {(isRRHH || item.user_id === user?.id) && item.motivo && (
                  <div className="motivo" style={{
                    marginTop: 8,
                    fontSize: '0.85rem',
                    color: 'var(--fh-muted)',
                    fontStyle: 'italic',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    borderLeft: '2px solid var(--fh-accent)'
                  }}>
                    "{item.motivo}"
                  </div>
                )}

                {/* Acciones para pendientes */}
                {item.estado_codigo === 'pendiente' && (
                  <div style={{ display: 'flex', gap: 8, paddingLeft: 54, marginTop: 4 }}>
                    {canApprove ? (
                      <>
                        <button className="fh-btn primary sm" onClick={() => approve(item.id)}><FiCheck /> Aprobar</button>
                        <button className="fh-btn danger sm" onClick={() => reject(item.id)}><FiX /> Rechazar</button>
                      </>
                    ) : (
                      <>
                        <button className="fh-btn ghost sm" style={{ padding: '6px 12px' }} onClick={() => onEdit(item)}><FiEdit2 /> Editar</button>
                        <button className="fh-btn danger sm" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }} onClick={() => cancel(item.id)}><FiTrash2 /> Cancelar</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="right">
                <div className="status-dot-wrap">
                  <span className={`dot ${item.estado_codigo}`}></span>
                  {item.estado_codigo}
                </div>
                <div className="when" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiCalendar size={12} />
                  {item.fecha_desde === item.fecha_hasta ? item.fecha_desde : 'Rango'}
                </div>
                <div className="qty" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiClock size={14} style={{ opacity: 0.5 }} />
                  {item.unidad_codigo === 'hora'
                    ? `${Number(item.duracion_horas).toFixed(1)}h`
                    : item.es_medio_dia ? '0.5d' : '1.0d'}
                </div>

                {item.archivo_url && (
                  <div className="file-indicator" style={{ marginTop: 8 }}>
                    {(isRRHH || item.user_id === user?.id) ? (
                      <a
                        href={item.archivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="file-link"
                        title="Ver adjunto"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fh-accent)', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        <FiPaperclip /> Adjunto (Ver)
                      </a>
                    ) : (
                      <span
                        className="file-exists"
                        title="Hay un archivo adjunto (Solo RRHH puede verlo)"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fh-muted)', fontSize: '0.75rem' }}
                      >
                        <FiPaperclip /> Adjunto (📎)
                      </span>
                    )}
                  </div>
                )}

                {/* Botón para agregar adjunto si no hay ninguno y el usuario tiene permiso */}
                {!item.archivo_url && (() => {
                  const isOwner = item.user_id === user?.id
                  const isDenegada = item.estado_codigo === 'denegada'

                  // Si está rechazada, solo el dueño puede agregar adjunto
                  if (isDenegada) {
                    return isOwner && (
                      <button
                        className="fh-btn ghost sm"
                        style={{ marginTop: 8, fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => handleUploadAttachment(item.id)}
                        disabled={uploadingId === item.id}
                      >
                        {uploadingId === item.id ? (
                          <><FiUpload className="spin" /> Subiendo...</>
                        ) : (
                          <><FiUpload /> Agregar Adjunto</>
                        )}
                      </button>
                    )
                  }

                  // Para cualquier otro estado (pendiente, aprobada, etc.), RRHH o el dueño pueden agregar
                  return (isRRHH || isOwner) && (
                    <button
                      className="fh-btn ghost sm"
                      style={{ marginTop: 8, fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => handleUploadAttachment(item.id)}
                      disabled={uploadingId === item.id}
                    >
                      {uploadingId === item.id ? (
                        <><FiUpload className="spin" /> Subiendo...</>
                      ) : (
                        <><FiUpload /> Agregar Adjunto</>
                      )}
                    </button>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bottom-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="fh-btn primary" style={{ minWidth: 200 }} onClick={() => onNew(date)}>
          <FiPlus /> Solicitar Ausencia
        </button>
      </div>
    </div>
  )
}