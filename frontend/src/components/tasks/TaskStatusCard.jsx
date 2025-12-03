// /frontend/src/components/tasks/TaskStatusCard.jsx
import React, { useState, Fragment, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getPriorityMeta } from './priority-utils'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import './TaskStatusCard.scss'

const MAP = {
  pendiente: { name: 'Pendiente', dot: '#7A1B9F' },
  en_curso: { name: 'En curso', dot: '#9F1B50' },
  revision: { name: 'Revisión', dot: '#1B6D9F' },
  aprobada: { name: 'Aprobada', dot: '#1B9F4E' },
  cancelada: { name: 'Cancelada', dot: '#9F1B1B' }
}

export default function TaskStatusCard({
  estadoCodigo = 'pendiente',
  progresoPct = 0,
  aprobLabel = null,
  prioridad = null,
  vencimientoISO = null,
  etiquetas = [],
  estadosCatalog = [],
  onPick,
  isResponsible = false
}) {
  const [busy, setBusy] = useState(null)
  const modal = useModal()
  const toast = useToast()
  const buttonRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  const active = MAP[estadoCodigo] ? estadoCodigo : 'pendiente'
  const idByCode = Object.fromEntries((estadosCatalog || []).map(e => [e.codigo, e.id]))
  const [open, setOpen] = useState(false)

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left - 12
      })
    }
  }, [open])

  // Cerrar dropdown con scroll o click fuera
  useEffect(() => {
    if (!open) return

    const handleScroll = () => setOpen(false)
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const doPick = async (code) => {
    if (busy || code === active) return

    // Validar permisos para aprobar o cancelar
    if ((code === 'aprobada' || code === 'cancelada') && !isResponsible) {
      toast?.error('Solo los responsables de la tarea pueden aprobar o cancelar');
      setOpen(false);
      return;
    }

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

  const prio = getPriorityMeta(Number(prioridad) || 0, vencimientoISO)

  return (

    <div className="statusDropdown">
      <button
        ref={buttonRef}
        className="statusTrigger"
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ background: MAP[active].dot }}
      >
        {MAP[active].name}
      </button>

      {open && createPortal(
        <div
          className="statusMenu statusMenu--portal"
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          {Object.entries(MAP)
            .filter(([code]) => code !== active)
            .map(([code, info]) => {
              // Mostrar si puede cambiar a este estado
              const isRestricted = (code === 'aprobada' || code === 'cancelada');
              const canChange = !isRestricted || isResponsible;

              return (
                <div
                  key={code}
                  className={`item ${active === code ? 'active' : ''} ${busy === code ? 'busy' : ''} ${!canChange ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!canChange) {
                      toast?.error('Solo los responsables pueden aprobar o cancelar tareas');
                      return;
                    }
                    setOpen(false);
                    doPick(code);
                  }}
                  style={{ backgroundColor: info.dot, opacity: !canChange ? 0.5 : 1 }}
                  title={!canChange ? 'Solo responsables' : ''}
                >

                  {info.name}
                  {!canChange && <span className="lock-icon">🔒</span>}
                </div>
              );
            })}
        </div>,
        document.body
      )}
    </div>



  )

}
