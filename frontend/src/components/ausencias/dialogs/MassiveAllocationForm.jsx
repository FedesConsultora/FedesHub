import { useEffect, useState, useMemo } from 'react'
import { FiTag, FiCalendar, FiMessageCircle, FiHash, FiUsers, FiCheck, FiSearch, FiX, FiUserPlus, FiArrowRight } from 'react-icons/fi'
import { ausenciasApi } from '../../../api/ausencias'
import useFeders from '../../../hooks/useFeders'
import PremiumSelect from '../../ui/PremiumSelect'
import Avatar from '../../Avatar'
import './Dialog.scss'

export default function MassiveAllocationForm({ onCancel, onDone }) {
    const [tipos, setTipos] = useState([])
    const [tipoId, setTipoId] = useState('')
    const [cantidad, setCantidad] = useState('')
    const [desde, setDesde] = useState(new Date().toISOString().slice(0, 10))
    const [hasta, setHasta] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10))
    const [motivo, setMotivo] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Selección de Feders
    const { rows: allFeders, loading: loadingFeders } = useFeders({ limit: 1000, is_activo: 'true' })
    const [selectedFids, setSelectedFids] = useState(new Set())
    const [search, setSearch] = useState('')

    useEffect(() => {
        ausenciasApi.catalog.tipos().then(setTipos).catch(() => { })
    }, [])

    const filteredFeders = useMemo(() => {
        const q = search.toLowerCase()
        return allFeders.filter(f =>
            f.nombre.toLowerCase().includes(q) ||
            f.apellido.toLowerCase().includes(q) ||
            f.email?.toLowerCase().includes(q)
        ).sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre))
    }, [allFeders, search])

    const selectedFeders = useMemo(() => {
        return allFeders.filter(f => selectedFids.has(f.id))
    }, [allFeders, selectedFids])

    const toggleFeder = (id) => {
        const next = new Set(selectedFids)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedFids(next)
    }

    const selectFiltered = () => {
        const next = new Set(selectedFids)
        filteredFeders.forEach(f => next.add(f.id))
        setSelectedFids(next)
    }

    const unselectFiltered = () => {
        const next = new Set(selectedFids)
        filteredFeders.forEach(f => next.delete(f.id))
        setSelectedFids(next)
    }

    async function submit() {
        if (selectedFids.size === 0) {
            setError('Debes seleccionar al menos una persona')
            return
        }
        setSubmitting(true); setError(null)
        try {
            const t = tipos.find(x => x.id === Number(tipoId))
            const body = {
                feder_ids: Array.from(selectedFids),
                tipo_id: Number(tipoId),
                unidad_id: t?.unidad?.id || t?.unidad_id,
                cantidad_total: Number(cantidad),
                vigencia_desde: desde,
                vigencia_hasta: hasta,
                comentario: motivo || undefined
            }

            await ausenciasApi.cuotas.assignBatch(body)
            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia_cuota' } }))
            onDone?.()
        } catch (e) {
            setError(e?.response?.data?.error || e?.fh?.message || e?.message || 'Error al procesar la asignación masiva')
        } finally {
            setSubmitting(false)
        }
    }

    const selectedTipo = tipos.find(x => x.id === Number(tipoId))
    const isHora = (selectedTipo?.unidad?.codigo || selectedTipo?.unidad_codigo) === 'hora'

    const disabled = !tipoId || !cantidad || submitting || selectedFids.size === 0

    const tipoOptions = useMemo(() => tipos.map(t => ({
        value: t.id,
        label: `${t.nombre} (${(t.unidad?.codigo || t.unidad_codigo) === 'hora' ? 'Horas' : 'Días'})`,
        meta: t
    })), [tipos])

    return (
        <form className="dlg-form massive-alloc-v2" onSubmit={e => e.preventDefault()}>
            <div className="row-grid">
                <div className="section">
                    <PremiumSelect
                        label="Tipo de Ausencia"
                        icon={FiTag}
                        placeholder="Selecciona el tipo..."
                        options={tipoOptions}
                        value={tipoId}
                        onChange={val => {
                            setTipoId(val)
                            setCantidad('')
                        }}
                    />
                </div>
                <div className="section">
                    <label><FiHash /> Cantidad ({isHora ? 'Horas' : 'Días'})</label>
                    <input
                        className="fh-input"
                        type="number"
                        min="0.5"
                        step={isHora ? "0.5" : "1"}
                        value={cantidad}
                        onChange={e => setCantidad(e.target.value)}
                        placeholder={isHora ? "Horas" : "Días"}
                    />
                </div>
            </div>

            <div className="row-grid">
                <div className="section">
                    <label><FiCalendar /> Vigencia Desde</label>
                    <input className="fh-input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                </div>
                <div className="section">
                    <label><FiCalendar /> Vigencia Hasta</label>
                    <input className="fh-input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                </div>
            </div>

            <div className="section">
                <label><FiUsers /> Personas Seleccionadas ({selectedFids.size})</label>
                <div className="selected-chips">
                    {selectedFeders.length === 0 ? (
                        <span className="muted-hint">Aún no has seleccionado a nadie</span>
                    ) : (
                        selectedFeders.map(f => (
                            <div key={f.id} className="feder-chip">
                                <Avatar src={f.avatar_url} name={`${f.nombre} ${f.apellido}`} size={20} />
                                <span>{f.apellido}</span>
                                <button type="button" onClick={() => toggleFeder(f.id)}><FiX /></button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="section selector-main">
                <div className="selector-header">
                    <div className="search-wrap">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Buscar feder..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="selector-actions">
                        <button type="button" className="fh-btn ghost sm" onClick={selectFiltered}>
                            Seleccionar Filtrados
                        </button>
                        <button type="button" className="fh-btn ghost sm" onClick={unselectFiltered}>
                            Deseleccionar Filtrados
                        </button>
                    </div>
                </div>

                <div className="selector-list">
                    {loadingFeders ? (
                        <div className="loading-state">Cargando feders...</div>
                    ) : (
                        filteredFeders.map(f => {
                            const selected = selectedFids.has(f.id)
                            return (
                                <div
                                    key={f.id}
                                    className={`selector-item ${selected ? 'is-selected' : ''}`}
                                    onClick={() => toggleFeder(f.id)}
                                >
                                    <div className="info">
                                        <Avatar src={f.avatar_url} name={`${f.nombre} ${f.apellido}`} size={32} />
                                        <div className="text">
                                            <span className="n">{f.apellido} {f.nombre}</span>
                                            <span className="e">{f.email || 'Sin email'}</span>
                                        </div>
                                    </div>
                                    <div className="check">
                                        {selected ? <FiX className="rem" /> : <FiUserPlus className="add" />}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div className="section">
                <label><FiMessageCircle /> Comentario</label>
                <textarea
                    className="fh-input"
                    rows={1}
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Opcional..."
                />
            </div>

            {error && <div className="fh-err">{error}</div>}

            <div className="actions">
                <button type="button" className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
                <button type="button" className="fh-btn primary" disabled={disabled} onClick={submit}>
                    {submitting ? 'Asignando...' : (
                        <>Asignar a {selectedFids.size} <FiArrowRight /></>
                    )}
                </button>
            </div>

            <style>{`
                .massive-alloc-v2 {
                    .selected-chips {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        max-height: 80px;
                        overflow-y: auto;
                        padding: 4px;
                        
                        .muted-hint {
                            font-size: 0.85rem;
                            color: rgba(255,255,255,0.3);
                            padding: 4px 0;
                        }
                    }

                    .feder-chip {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(var(--fh-accent-rgb), 0.15);
                        border: 1px solid rgba(var(--fh-accent-rgb), 0.3);
                        padding: 4px 8px;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: #fff;

                        button {
                            background: none;
                            border: none;
                            color: #fff;
                            cursor: pointer;
                            display: flex;
                            padding: 2px;
                            opacity: 0.7;
                            &:hover { opacity: 1; }
                        }
                    }

                    .selector-main {
                        gap: 12px;
                        padding-bottom: 0;
                    }

                    .selector-header {
                        display: flex;
                        justify-content: space-between;
                        gap: 12px;
                        align-items: center;

                        @media(max-width: 600px) {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .search-wrap {
                            flex: 1;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            padding: 0 12px;
                            border-radius: 10px;
                            svg { color: var(--fh-accent); }
                            input {
                                background: transparent;
                                border: none;
                                color: #fff;
                                outline: none;
                                padding: 8px 0;
                                width: 100%;
                                font-size: 0.9rem;
                            }
                        }

                        .selector-actions {
                            display: flex;
                            gap: 8px;
                        }
                    }

                    .selector-list {
                        max-height: 240px;
                        overflow-y: auto;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        padding-right: 4px;

                        @media(max-width: 600px) {
                            grid-template-columns: 1fr;
                        }

                        .selector-item {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 8px 12px;
                            background: rgba(255,255,255,0.03);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.2s;

                            &:hover {
                                background: rgba(255,255,255,0.06);
                                border-color: rgba(255,255,255,0.1);
                            }

                            &.is-selected {
                                background: rgba(var(--fh-accent-rgb), 0.1);
                                border-color: rgba(var(--fh-accent-rgb), 0.3);
                                .check .rem { color: #ef4444; }
                            }

                            .info {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                .text {
                                    display: flex;
                                    flex-direction: column;
                                    .n { font-size: 0.85rem; font-weight: 700; color: #fff; }
                                    .e { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
                                }
                            }

                            .check {
                                font-size: 1.1rem;
                                display: grid;
                                place-items: center;
                                .add { color: var(--fh-accent); opacity: 0.5; }
                            }
                        }
                    }
                }
            `}</style>
        </form>
    )
}
