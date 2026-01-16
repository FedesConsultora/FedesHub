// frontend/src/components/comercial/LeadsFilters.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCalendarAlt } from 'react-icons/fa'
import './LeadsFilters.scss'

function Field({ id, label, children, className = '' }) {
    return (
        <label htmlFor={id} className={`Field ${className}`}>
            <span className="Field__label">{label}</span>
            {children}
        </label>
    )
}

export default function LeadsFilters({ value, catalog, onChange }) {
    const v = value || {}
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const popRef = useRef(null)

    const upd = (patch) => onChange?.({ ...v, ...patch })
    const clear = () => {
        onChange?.({
            q: '', status_id: '', etapa_id: '', fuente_id: '',
            responsable_feder_id: '', page: 0
        })
    }

    useEffect(() => {
        if (!open) return
        const onDown = (ev) => {
            const r = rootRef.current, p = popRef.current
            if (!r || !p) return
            if (!r.contains(ev.target) && !p.contains(ev.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    return (
        <form className="LeadsFilters" onSubmit={(e) => e.preventDefault()} ref={rootRef}>
            <div className="searchBox">
                <input
                    type="search"
                    placeholder="Buscar lead por nombre, empresa o email..."
                    value={v.q ?? ''}
                    onChange={e => upd({ q: e.target.value })}
                />
                <button
                    type="button"
                    className="caretBtn"
                    onClick={() => setOpen(o => !o)}
                    title="Filtros avanzados"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                {open && (
                    <div className="filterPopover" ref={popRef}>
                        <div className="popHead">
                            <strong>Filtros avanzados</strong>
                            <button type="button" className="btnX" onClick={() => setOpen(false)}>×</button>
                        </div>

                        <div className="grid">
                            <Field id="lead-status" label="Estado Macro">
                                <select id="lead-status" value={v.status_id ?? ''} onChange={e => upd({ status_id: e.target.value })}>
                                    <option value="">Todos los estados</option>
                                    {catalog.statuses?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </Field>

                            <Field id="lead-etapa" label="Etapa Pipeline">
                                <select id="lead-etapa" value={v.etapa_id ?? ''} onChange={e => upd({ etapa_id: e.target.value })}>
                                    <option value="">Todas las etapas</option>
                                    {catalog.etapas?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                </select>
                            </Field>

                            <Field id="lead-fuente" label="Fuente">
                                <select id="lead-fuente" value={v.fuente_id ?? ''} onChange={e => upd({ fuente_id: e.target.value })}>
                                    <option value="">Todas las fuentes</option>
                                    {catalog.fuentes?.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                                </select>
                            </Field>
                        </div>

                        <div className="actions">
                            <button type="button" className="btn-secondary" onClick={clear}>Limpiar</button>
                            <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Aplicar</button>
                        </div>
                    </div>
                )}
            </div>
        </form>
    )
}
