// /frontend/src/components/tasks/TaskStatusCard.jsx
import React, { useState, Fragment } from 'react'
import { getPriorityMeta } from './priority-utils'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import './TaskStatusCard.scss'

const MAP = {
  pendiente:  { name:'Pendiente',  dot:'#7A1B9F' },
  en_curso: { name: 'En curso', dot: '#9F1B50' },
  revision: {name: 'En Revisión', dot: '#1B6D9F'},
  aprobada: { name:'Aprobada', dot:'#1B9F4E' },
  cancelada:  { name:'Cancelada',  dot:'#9F1B1B' }
}

export default function TaskStatusCard({
  estadoCodigo='pendiente',
  progresoPct=0,
  aprobLabel=null,
  prioridad=null,
  vencimientoISO=null,
  etiquetas=[],
  estadosCatalog=[],
  onPick
}){
  const [busy, setBusy] = useState(null)
  const modal = useModal()
  const toast = useToast()

  const active = MAP[estadoCodigo] ? estadoCodigo : 'pendiente'
  const idByCode = Object.fromEntries((estadosCatalog||[]).map(e => [e.codigo, e.id]))

  const doPick = async (code) => {
    if (busy || code===active) return
    const id = idByCode[code]
    if (!id || !onPick) return

    // Confirmación mínima para "cancelada"
    if (code === 'cancelada') {
      const ok = await modal.confirm({
        title: 'Cancelar tarea',
        message: '¿Seguro que querés marcar esta tarea como cancelada?',
        okText: 'Cancelar tarea',
        cancelText: 'Volver'
      })
      if (!ok) return
    }

    try {
      setBusy(code)
      await onPick(id)
      const msg =
        code === 'cancelada' ? 'Tarea cancelada' :
        code === 'aprobada' ? 'Tarea aprobada' : 'Estado actualizado'
      toast?.success(msg)
    } catch (e) {
      toast?.error(e?.message || 'No se pudo actualizar el estado')
    } finally {
      setBusy(null)
    }
  }

  const prio = getPriorityMeta(Number(prioridad)||0, vencimientoISO)

  return (
    <div className={`taskStatusCard stateCard ${prio.class}`}>
      <div className="stateRail" role="tablist" aria-label="Estados de la tarea">
        {Object.entries(MAP).map(([code, info], i) => (
          <Fragment key={code}>
            <div
              className={`st ${active===code?'active':''} ${busy===code?'busy':''}`}
              role="tab"
              aria-selected={active===code}
              tabIndex={active===code ? -1 : 0}
              onKeyDown={(e)=> (e.key==='Enter'||e.key===' ') && doPick(code)}
              onClick={()=>doPick(code)}
              title={info.name}
            >
              <span className="dot" style={{ background: info.dot }} />
              {info.name}
            </div>
            {i < 3 && <span className="sep">—</span>}
          </Fragment>
        ))}
      </div>

      <div className="stateRight">
        {aprobLabel && <span className="chipStat">{aprobLabel}</span>}
        <span className={`prioBadge ${prio.class}`}>
          <span className="dot" /> Prioridad: {prio.label}
        </span>
        <div className="progress" aria-label="Progreso">
          <div className="bar" style={{ width: `${Math.max(0, Math.min(100, Number(progresoPct)||0))}%` }} />
        </div>
      </div>
    </div>
  )
}
