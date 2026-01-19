import React, { useEffect, useRef, useState } from 'react'
import { FaFilter, FaSearch, FaTimes } from 'react-icons/fa'
import './LeadsFilters.scss'

function Field({ label, children }) {
    return (
        <label className="Field">
            <span className="Field__label">{label}</span>
            {children}
        </label>
    )
}

export default function LeadsFilters({ value, catalog, onChange }) {
    const v = value || {}
    const [open, setOpen] = useState(false)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const rootRef = useRef(null)
    const searchInputRef = useRef(null)

    const upd = (patch) => onChange?.({ ...v, ...patch })

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded)
        if (!isSearchExpanded) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }
    }

    const clear = () => onChange?.({
        q: '',
        status_id: '',
        etapa_id: '',
        fuente_id: '',
        responsable_feder_id: ''
    })

    useEffect(() => {
        if (!open) return
        const onDown = (ev) => {
            if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const activeFiltersCount = [
        v.status_id, v.etapa_id, v.fuente_id, v.responsable_feder_id
    ].filter(x => x && x !== '').length

    return (
        <div className="LeadsFiltersContainer" ref={rootRef}>
            <div className="FilterToolbar">
                {/* BUSCADOR PRINCIPAL */}
                <div className={`searchWrapper ${isSearchExpanded || v.q ? 'expanded' : 'collapsed'}`}>
                    <button
                        type="button"
                        className="searchToggle"
                        onClick={toggleSearch}
                        title="Buscar"
                    >
                        <FaSearch className="searchIcon" />
                    </button>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar por empresa, contacto..."
                        value={v.q ?? ''}
                        onChange={e => upd({ q: e.target.value })}
                        onBlur={() => { if (!v.q) setIsSearchExpanded(false); }}
                    />
                    {v.q && (
                        <button className="clearSearch" onClick={() => { upd({ q: '' }); setIsSearchExpanded(false); }}>
                            <FaTimes />
                        </button>
                    )}
                </div>

                {/* BOTÓN FILTROS AVANZADOS */}
                <button
                    className={`advancedBtn ${open ? 'open' : ''} ${activeFiltersCount > 0 ? 'hasFilters' : ''}`}
                    onClick={() => setOpen(!open)}
                >
                    <FaFilter />
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && <span className="badge">{activeFiltersCount}</span>}
                </button>
            </div>

            {open && (
                <div className="filterPopover">
                    <div className="popHead">
                        <strong>Filtros avanzados</strong>
                        <button type="button" className="btnX" onClick={() => setOpen(false)}>×</button>
                    </div>

                    <div className="popBody">
                        <div className="filterGrid">
                            <Field label="Estado Macro">
                                <select value={v.status_id ?? ''} onChange={e => upd({ status_id: e.target.value })}>
                                    <option value="">Todos los estados</option>
                                    {catalog.statuses?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </Field>

                            <Field label="Etapa Pipeline">
                                <select value={v.etapa_id ?? ''} onChange={e => upd({ etapa_id: e.target.value })}>
                                    <option value="">Todas las etapas</option>
                                    {catalog.etapas?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                </select>
                            </Field>

                            <Field label="Fuente">
                                <select value={v.fuente_id ?? ''} onChange={e => upd({ fuente_id: e.target.value })}>
                                    <option value="">Todas las fuentes</option>
                                    {catalog.fuentes?.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    <div className="popFooter">
                        <button type="button" className="btnReset" onClick={clear}>Restablecer</button>
                        <button type="button" className="btnApply" onClick={() => setOpen(false)}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    )
}
