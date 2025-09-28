// src/components/ausencias/dialogs/DayDetails.jsx
import { useMemo, useState } from 'react'
import { ausenciasApi } from '../../../api/ausencias'
import './Dialog.scss'

const statusLabel = (s) =>
  s==='aprobada' ? 'Aprobada' :
  s==='pendiente' ? 'Pendiente' :
  s==='denegada' ? 'Denegada' :
  s==='cancelada' ? 'Cancelada' : s

const initials = (txt='')=>{
  const p = (txt||'').trim().split(/\s+/).slice(0,2)
  return p.map(w=>w[0]||'').join('').toUpperCase() || '—'
}

export default function DayDetails({ date, items=[], canApprove=false, federById={}, onUpdated, onNew }) {
  const [rows, setRows] = useState(items)

  const enhanced = useMemo(() => rows.map(r => {
    const f = federById?.[r.feder_id]
    const name = f
      ? (`${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`)
      : (r.feder_nombre || `Feder #${r.feder_id}`)
    const avatar = f?.avatar_url || f?.img_url || null
    return { ...r, _name:name, _avatar:avatar }
  }), [rows, federById])

  async function approve(id) {
    const updated = await ausenciasApi.aus.approve(id)
    setRows(rs => rs.map(r => r.id===id ? { ...r, ...updated } : r))
    onUpdated?.(updated)
  }
  async function reject(id) {
    const updated = await ausenciasApi.aus.reject(id, { denegado_motivo: null })
    setRows(rs => rs.map(r => r.id===id ? { ...r, ...updated } : r))
    onUpdated?.(updated)
  }

  if (!rows.length) {
    return (
      <div className="dlg-form">
        <div className="empty">No hay ausencias en este día.</div>
        <div className="actions">
          <button className="fh-btn primary" onClick={onNew}>+ Solicitar ausencia</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dlg-form day-details">
      <div className="list">
        {enhanced.map(item => (
          <div key={item.id} className={`rowItem st-${item.estado_codigo}`}>
            <div className="left">
              <div className="who">
                {item._avatar
                  ? <img className="avatar" src={item._avatar} alt="" />
                  : <div className="avatar avatar--fallback">{initials(item._name)}</div>}
                <div className="whoText">
                  <div className="name">{item._name}</div>
                  <div className="type">{item.tipo_nombre}</div>
                </div>
              </div>

              {item.motivo && <div className="motivo">{item.motivo}</div>}
            </div>

            <div className="right">
              <div className={`badge ${item.estado_codigo}`}>{statusLabel(item.estado_codigo)}</div>
              <div className="when">
                {item.fecha_desde}{item.fecha_desde!==item.fecha_hasta ? ` → ${item.fecha_hasta}` : ''}
              </div>
              {item.unidad_codigo==='hora' && item.duracion_horas
                ? <div className="qty">{Number(item.duracion_horas).toFixed(1)} h</div>
                : null}
              {item.unidad_codigo==='dia' && item.es_medio_dia
                ? <div className="qty">½ día</div>
                : null}

              {canApprove && item.estado_codigo==='pendiente' && (
                <div className="actions inline">
                  <button className="fh-btn primary" onClick={()=>approve(item.id)}>Aprobar</button>
                  <button className="fh-btn danger" onClick={()=>reject(item.id)}>Rechazar</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="fh-btn ghost" onClick={onNew}>+ Nueva</button>
      </div>
    </div>
  )
}