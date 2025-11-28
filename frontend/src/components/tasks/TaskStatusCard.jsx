// /frontend/src/components/tasks/TaskStatusCard.jsx
import React, { useState, Fragment } from 'react'
import { getPriorityMeta } from './priority-utils'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import './TaskStatusCard.scss'

const MAP = {
  pendiente:  { name:'Pendiente',  dot:'#7A1B9F' },
  en_curso: { name: 'En curso', dot: '#9F1B50' },
  revision: {name: 'Revisión', dot: '#1B6D9F'},
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
const [open, setOpen] = useState(false)

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
 
    <div className="statusDropdown">
      <button
        className="statusTrigger"
        type="button"
      onClick={() => setOpen(v => !v)}
       style={{ background: MAP[active].dot }}
      >
        {MAP[active].name}
      </button>

      {open && (
        <div className="statusMenu">
          {Object.entries(MAP).map(([code, info]) => (
            <div
              key={code}
              className={`item ${active===code?'active':''} ${busy===code?'busy':''}`}
              onClick={() => { setOpen(false); doPick(code); }}
              style={{ backgroundColor: info.dot }}

            >
             
              {info.name}
            </div>
          ))}
        </div>
      )}
    </div>

  
  
)

}
