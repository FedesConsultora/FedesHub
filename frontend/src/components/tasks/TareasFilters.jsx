// frontend/src/components/tasks/TareasFilters.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCalendarAlt } from 'react-icons/fa'
import './TareasFilters.scss'

function Field({ id, label, children, className = '' }) {
  return (<label htmlFor={id} className={`Field ${className}`}>
    <span className="Field__label">{label}</span>{children}
  </label>)
}
function Fieldset({ legend, children, className = '' }) {
  return (<fieldset className={`Fieldset ${className}`}>
    <legend className="Fieldset__legend">{legend}</legend>{children}
  </fieldset>)
}
const DateInput = ({ id, ...props }) => (
  <div className="InputDate">
    <FaRegCalendarAlt className="InputDate__icon" aria-hidden="true" />
    <input id={id} type="date" {...props} />
  </div>
)

export default function TareasFilters({ value, catalog, onChange }) {
  const v = value || {}
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null), popRef = useRef(null)
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const upd = (patch) => onChange?.({ ...v, ...patch })
  const clear = () => onChange?.({
    q: '',
    cliente_id: undefined,
    estado_id: undefined,
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: '',
    vencimiento_to: '',
    orden_by: 'prioridad',
    sort: 'desc',
    page: 0
  })

  useEffect(() => {
    if (!open) return
    const onDown = (ev) => {
      const r = rootRef.current, p = popRef.current
      if (!r || !p) return
      if (!r.contains(ev.target) && !p.contains(ev.target)) setOpen(false)
    }
    const onKey = (ev) => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <form className="TareasFilters" role="search" aria-label="Filtros de tareas" onSubmit={(e) => e.preventDefault()} ref={rootRef}>
      <div className="searchBox">
        <label htmlFor="tareas-q" className="srOnly">Buscar por título / cliente / hito</label>
        <input
          id="tareas-q" name="q" type="search" inputMode="search" autoComplete="off"
          placeholder="Buscar por título / cliente / hito"
          value={v.q ?? ''} onChange={e => upd({ q: e.target.value })}
        />
        <button
          type="button"
          className="caretBtn"
          aria-expanded={open}
          aria-controls="tareas-popover"
          onClick={() => setOpen(o => !o)}
          title={open ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="srOnly">{open ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>

        {open && (
          <div id="tareas-popover" className="filterPopover" role="dialog" aria-modal="false" ref={popRef}>
            <div className="popHead">
              <strong>Filtros avanzados</strong>
              <button type="button" className="btnX" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <div className="grid">
              <Field id="tareas-cliente" label="Cliente">
                <select
                  id="tareas-cliente"
                  name="cliente_id"
                  value={v.cliente_id ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    upd({ cliente_id: val === '' ? undefined : Number(val) })
                  }}
                >
                  <option value="">Todos</option>
                  {catalog.clientes?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>

              <Field id="tareas-estado" label="Estado">
                <select
                  id="tareas-estado"
                  name="estado_id"
                  value={v.estado_id ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    upd({ estado_id: val === '' ? undefined : Number(val) })
                  }}
                >
                  <option value="">Todos</option>
                  {catalog.estados?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Field>

              <Field id="tareas-impacto" label="Impacto">
                <select
                  id="tareas-impacto"
                  name="impacto_id"
                  value={v.impacto_id ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    upd({ impacto_id: val === '' ? undefined : Number(val) })
                  }}
                >
                  <option value="">Todos</option>
                  {catalog.impactos?.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </Field>

              <Field id="tareas-urgencia" label="Urgencia">
                <select
                  id="tareas-urgencia"
                  name="urgencia_id"
                  value={v.urgencia_id ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    upd({ urgencia_id: val === '' ? undefined : Number(val) })
                  }}
                >
                  <option value="">Todas</option>
                  {catalog.urgencias?.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </Field>

              <Fieldset legend="Vencimiento entre" className="span-2">
                <div className="inline two">
                  <Field id="vto-desde" label="Desde">
                    <DateInput
                      id="vto-desde"
                      name="vencimiento_from"
                      max={v.vencimiento_to || undefined}
                      value={v.vencimiento_from || ''}
                      onChange={e => upd({ vencimiento_from: e.target.value })}
                    />
                  </Field>
                  <span className="sep" aria-hidden>—</span>
                  <Field id="vto-hasta" label="Hasta">
                    <DateInput
                      id="vto-hasta"
                      name="vencimiento_to"
                      min={v.vencimiento_from || undefined}
                      max={todayISO}
                      value={v.vencimiento_to || ''}
                      onChange={e => upd({ vencimiento_to: e.target.value })}
                    />
                  </Field>
                </div>
              </Fieldset>

              <Field id="tareas-order-by" label="Ordenar por">
                <div className="inline auto">
                  <select
                    id="tareas-order-by"
                    name="orden_by"
                    value={v.orden_by ?? 'prioridad'}
                    onChange={e => upd({ orden_by: e.target.value })}
                  >
                    <option value="prioridad">Prioridad</option>
                    <option value="vencimiento">Vencimiento</option>
                    <option value="fecha_inicio">Inicio</option>
                    <option value="created_at">Creación</option>
                    <option value="updated_at">Actualización</option>
                    <option value="cliente">Cliente</option>
                    <option value="titulo">Título</option>
                  </select>
                  <select
                    id="tareas-sort"
                    name="sort"
                    value={v.sort ?? 'desc'}
                    onChange={e => upd({ sort: e.target.value })}
                    aria-label="Dirección de orden"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </Field>
            </div>

            <div className="checkboxRow">
              <label className="toggleCheck">
                <input
                  type="checkbox"
                  checked={!!v.solo_mias}
                  onChange={e => upd({ solo_mias: e.target.checked })}
                />
                <span className="checkmark"></span>
                <span className="label">Sólo mis tareas</span>
              </label>

              <label className="toggleCheck">
                <input
                  type="checkbox"
                  checked={!!v.include_archivadas}
                  onChange={e => upd({ include_archivadas: e.target.checked })}
                />
                <span className="checkmark"></span>
                <span className="label">Incluir archivadas</span>
              </label>
            </div>

            <div className="actions">
              <button type="button" className="btn clear" onClick={clear}>Limpiar</button>
              <button type="button" className="btn apply" onClick={() => setOpen(false)}>Aplicar</button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
