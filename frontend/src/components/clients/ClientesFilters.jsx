import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCalendarAlt } from 'react-icons/fa'
import './ClientesFilters.scss'

/* —— UI PRIMITIVES —— */
function Field({ id, label, children, className = '' }) {
  // label + control asociados, vertical
  return (
    <label htmlFor={id} className={`Field ${className}`}>
      <span className="Field__label">{label}</span>
      {children}
    </label>
  )
}

function Fieldset({ legend, children, className = '' }) {
  return (
    <fieldset className={`Fieldset ${className}`}>
      <legend className="Fieldset__legend">{legend}</legend>
      {children}
    </fieldset>
  )
}

// Input date con icono
function DateInput({ id, ...props }) {
  return (
    <div className="InputDate">
      <FaRegCalendarAlt className="InputDate__icon" aria-hidden="true" />
      <input id={id} type="date" {...props} />
    </div>
  )
}

export default function ClientesFilters({ value, catalog, onChange }) {
  const v = value || {}
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const popRef = useRef(null)

  const upd = (patch) => onChange?.({ ...v, ...patch })
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const clear = () => {
    onChange?.({
      q: '', celula_id: '', tipo_id: '', estado_id: '',
      ponderacion_min: '', ponderacion_max: '',
      created_from: '', created_to: '',
      order_by: 'nombre', order: 'asc', page: 0
    })
  }

  // cerrar con click afuera / Esc
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
    <form className="ClientesFilters" role="search" aria-label="Filtros de clientes" onSubmit={(e) => e.preventDefault()} ref={rootRef}>
      {/* BUSCADOR + caret */}
      <div className="searchBox">
        <label htmlFor="clientes-q" className="srOnly">Buscar por nombre, alias o email</label>
        <input
          id="clientes-q" name="q" type="search" inputMode="search" autoComplete="off"
          placeholder="Buscar por nombre / alias / email"
          value={v.q ?? ''} onChange={e => upd({ q: e.target.value })}
        />
        <button
          type="button"
          className="caretBtn"
          aria-expanded={open} aria-controls="clientes-popover"
          onClick={() => setOpen(o => !o)}
          title={open ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="srOnly">{open ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>

        {/* —— POPOVER —— */}
        {open && (
          <div id="clientes-popover" className="filterPopover" role="dialog" aria-modal="false" ref={popRef}>
            <div className="popHead">
              <strong>Filtros avanzados</strong>
              <button type="button" className="btnX" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <div className="grid">
              <Field id="clientes-celula" label="Célula">
                <select id="clientes-celula" name="celula_id" value={v.celula_id ?? ''} onChange={e => upd({ celula_id: e.target.value })}>
                  <option value="">Todas las células</option>
                  {catalog.celulas?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>

              <Field id="clientes-tipo" label="Tipo">
                <select id="clientes-tipo" name="tipo_id" value={v.tipo_id ?? ''} onChange={e => upd({ tipo_id: e.target.value })}>
                  <option value="">Todos los tipos</option>
                  {catalog.tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </Field>

              <Field id="clientes-estado" label="Estado">
                <select id="clientes-estado" name="estado_id" value={v.estado_id ?? ''} onChange={e => upd({ estado_id: e.target.value })}>
                  <option value="">Activos</option>
                  <option value="all">Filtro: Todos</option>
                  {catalog.estados?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Field>

              <Fieldset legend="Ponderación">
                <div className="inline two">
                  <Field id="pond-min" label="Mín.">
                    <select id="pond-min" name="ponderacion_min" value={v.ponderacion_min ?? ''} onChange={e => upd({ ponderacion_min: e.target.value })}>
                      <option value="">—</option>
                      {catalog.ponderaciones?.map(x => <option key={`min-${x}`} value={x}>{x}</option>)}
                    </select>
                  </Field>
                  <span className="sep" aria-hidden>–</span>
                  <Field id="pond-max" label="Máx.">
                    <select id="pond-max" name="ponderacion_max" value={v.ponderacion_max ?? ''} onChange={e => upd({ ponderacion_max: e.target.value })}>
                      <option value="">—</option>
                      {catalog.ponderaciones?.map(x => <option key={`max-${x}`} value={x}>{x}</option>)}
                    </select>
                  </Field>
                </div>
              </Fieldset>

              <Fieldset legend="Creado entre" className="span-2">
                <div className="inline two">
                  <Field id="fecha-desde" label="Desde">
                    <DateInput
                      id="fecha-desde"
                      name="created_from"
                      max={v.created_to || undefined}
                      value={v.created_from || ''}
                      onChange={e => upd({ created_from: e.target.value })}
                    />
                  </Field>
                  <span className="sep" aria-hidden>—</span>
                  <Field id="fecha-hasta" label="Hasta">
                    <DateInput
                      id="fecha-hasta"
                      name="created_to"
                      min={v.created_from || undefined}
                      max={todayISO}
                      value={v.created_to || ''}
                      onChange={e => upd({ created_to: e.target.value })}
                    />
                  </Field>
                </div>
              </Fieldset>

              <Field id="clientes-order-by" label="Ordenar por">
                <div className="inline auto">
                  <select id="clientes-order-by" name="order_by" value={v.order_by} onChange={e => upd({ order_by: e.target.value })}>
                    <option value="nombre">Nombre</option>
                    <option value="created_at">Fecha de creación</option>
                    <option value="ponderacion">Ponderación</option>
                  </select>
                  <select id="clientes-order" name="order" value={v.order} onChange={e => upd({ order: e.target.value })} aria-label="Dirección de orden">
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </div>
              </Field>
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
