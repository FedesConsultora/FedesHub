import React, { useEffect, useState } from 'react'
import { ausenciasApi as API } from '../../../api/ausencias'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider.jsx'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import {
    FiPlus, FiEdit2, FiTrash2, FiSun, FiCloudRain, FiBookOpen,
    FiUser, FiXCircle, FiGift, FiClock, FiHeart, FiCoffee,
    FiBriefcase, FiAlertCircle, FiTag, FiZap, FiCalendar,
    FiHome, FiMapPin, FiShield, FiShoppingCart, FiSmile, FiActivity
} from 'react-icons/fi'
import { FaBaby, FaHospital, FaUserGraduate, FaCar, FaUmbrellaBeach, FaPlane } from 'react-icons/fa'

const ICON_MAP = {
    // Basic
    FiTag, FiZap, FiCalendar, FiClock, FiActivity,
    // Work/Life
    FiBriefcase, FiHome, FiMapPin, FaPlane, FiShoppingCart,
    // Health/Events
    FiHeart, FiSmile, FiGift, FiCoffee, FiBookOpen,
    // Nature/Other
    FiSun, FiCloudRain, FiShield, FiAlertCircle, FiXCircle,
    // FontAwesome helpers
    FaBaby, FaHospital, FaUserGraduate, FaCar, FaUmbrellaBeach
}

const COLORS = [
    '#ff9f43', '#54a0ff', '#1dd1a1', '#feca57', '#ee5253',
    '#ff9fcf', '#576574', '#c56cf0', '#48dbfb', '#ff6b6b',
    '#00d2d3', '#5f27cd', '#341f97', '#222f3e', '#10ac84',
    '#f368e0', '#2e86de', '#ff9ff3', '#0abde3'
]

export default function AbsenceTypesTab() {
    const toast = useToast()
    const modal = useModal()
    const [tipos, setTipos] = useState([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const data = await API.catalog.tipos()
            setTipos(data || [])
        } catch (e) {
            toast?.error('Error cargando tipos de ausencia')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load();
        const handlePush = (e) => {
            if (e.detail?.type === 'ausencia_tipo') load();
        };
        window.addEventListener('fh:push', handlePush);
        return () => window.removeEventListener('fh:push', handlePush);
    }, [])

    const openEdit = (tipo = null) => {
        modal.open({
            title: tipo ? 'Editar Tipo de Ausencia' : 'Nuevo Tipo de Ausencia',
            width: 550,
            render: (close) => (
                <AbsenceTypeForm
                    tipo={tipo}
                    onSave={async (data) => {
                        try {
                            if (tipo) await API.catalog.tipoPatch(tipo.id, data)
                            else await API.catalog.tipoCreate(data)
                            toast?.success(tipo ? 'Tipo actualizado' : 'Tipo creado')
                            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia_tipo' } }))
                            close()
                        } catch (e) {
                            toast?.error(e.response?.data?.error || 'Error al guardar tipo')
                        }
                    }}
                    onCancel={() => close()}
                />
            )
        })
    }

    return (
        <div className="tabContent rolesTab">
            <header className="tabInnerHead" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Tipos de Ausencia</h3>
                    <p style={{ color: 'var(--fh-muted)', fontSize: '0.9rem', margin: 0 }}>Gestiona los motivos de ausencia, sus iconos y colores para todo el equipo.</p>
                </div>
                <button className="fh-btn primary" onClick={() => openEdit()} style={{ height: 42, padding: '0 20px', borderRadius: 12 }}>
                    <FiPlus /> Nuevo Tipo
                </button>
            </header>

            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={80} />
                </div>
            ) : tipos.length === 0 ? (
                <div className="empty" style={{ background: 'var(--fh-card)', padding: 40, borderRadius: 20, textAlign: 'center', opacity: 0.6 }}>No hay tipos configurados</div>
            ) : (
                <div className="rolesGrid">
                    {tipos.map(t => {
                        const Icon = ICON_MAP[t.icon] || FiTag
                        return (
                            <div key={t.id} className="roleCard" style={{ border: '1px solid var(--fh-border)', background: 'var(--fh-card-alt)' }}>
                                <div className="roleInfo">
                                    <div className="top">
                                        <div className="iconContainer" style={{
                                            background: `${t.color}15`,
                                            color: t.color,
                                            width: 44, height: 44, borderRadius: 12,
                                            display: 'grid', placeItems: 'center', fontSize: '1.4rem'
                                        }}>
                                            <Icon />
                                        </div>
                                        <div className="labels">
                                            <span className="name" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{t.nombre}</span>
                                            <span className="badge system" style={{
                                                background: 'var(--fh-bg)',
                                                border: '1px solid var(--fh-border)',
                                                fontSize: '0.7rem'
                                            }}>{t.unidad_codigo === 'hora' ? 'POR HORAS' : 'POR DÍAS'}</span>
                                        </div>
                                    </div>
                                    <p className="desc" style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: 12 }}>{t.descripcion || 'Sin descripción.'}</p>
                                    <div style={{
                                        marginTop: 12,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        gap: 12,
                                        opacity: 0.5
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {t.requiere_asignacion ? '✓ Requiere cupo' : 'Libre solicitud'}
                                        </span>
                                        {t.permite_medio_dia && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                • Permite 1/2 día
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="roleActions" style={{ borderTop: '1px solid var(--fh-border)' }}>
                                    <button
                                        className="btnAction"
                                        onClick={() => openEdit(t)}
                                        style={{ fontWeight: 600, color: 'var(--fh-muted)' }}
                                    >
                                        <FiEdit2 /> Editar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function AbsenceTypeForm({ tipo, onSave, onCancel }) {
    const [form, setForm] = useState({
        nombre: tipo?.nombre || '',
        codigo: tipo?.codigo || '',
        descripcion: tipo?.descripcion || '',
        unidad_codigo: tipo?.unidad_codigo || 'dia',
        requiere_asignacion: tipo?.requiere_asignacion ?? true,
        permite_medio_dia: tipo?.permite_medio_dia ?? false,
        icon: tipo?.icon || 'FiTag',
        color: tipo?.color || '#ff9f43'
    })

    const isHora = form.unidad_codigo === 'hora'

    return (
        <div className="dlg-form premium-form" style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="section">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiTag /> Nombre del Tipo
                    </label>
                    <input
                        type="text"
                        className="fh-input"
                        value={form.nombre}
                        onChange={e => {
                            const val = e.target.value
                            setForm({
                                ...form,
                                nombre: val,
                                codigo: tipo ? form.codigo : val.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            })
                        }}
                        placeholder="Ej: Vacaciones"
                        required
                        style={{ height: 42, background: 'var(--fh-bg)', border: '1px solid var(--fh-border)', borderRadius: 10 }}
                    />
                </div>
                {!tipo && (
                    <div className="section">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiZap /> Código Único
                        </label>
                        <input
                            type="text"
                            className="fh-input"
                            value={form.codigo}
                            onChange={e => setForm({ ...form, codigo: e.target.value })}
                            placeholder="vacaciones"
                            required
                            style={{ height: 42, background: 'var(--fh-bg)', border: '1px solid var(--fh-border)', borderRadius: 10 }}
                        />
                    </div>
                )}
            </div>

            <div className="section" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiBriefcase /> Descripción / Reglas
                </label>
                <textarea
                    className="fh-input"
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    rows={2}
                    placeholder="Describe cuándo se aplica..."
                    style={{ background: 'var(--fh-bg)', border: '1px solid var(--fh-border)', borderRadius: 10, padding: '10px 14px' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="section">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiClock /> Unidad
                    </label>
                    <select
                        className="fh-input"
                        value={form.unidad_codigo}
                        onChange={e => setForm({ ...form, unidad_codigo: e.target.value })}
                        style={{ height: 42, background: 'var(--fh-bg)', border: '1px solid var(--fh-border)', borderRadius: 10 }}
                    >
                        <option value="dia">Días</option>
                        <option value="hora">Horas</option>
                    </select>
                </div>
                <div className="section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={form.requiere_asignacion} onChange={e => setForm({ ...form, requiere_asignacion: e.target.checked })} />
                        Requiere Cupo
                    </label>
                    {!isHora && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input type="checkbox" checked={form.permite_medio_dia} onChange={e => setForm({ ...form, permite_medio_dia: e.target.checked })} />
                            Permitir 1/2 Día
                        </label>
                    )}
                </div>
            </div>

            <div className="section" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 12 }}>Selecciona un Icono</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: 8,
                    maxHeight: 140,
                    overflowY: 'auto',
                    padding: '10px',
                    background: 'var(--fh-bg)',
                    borderRadius: 14,
                    border: '1px solid var(--fh-border)'
                }}>
                    {Object.keys(ICON_MAP).map(key => {
                        const Icon = ICON_MAP[key]
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setForm({ ...form, icon: key })}
                                style={{
                                    width: 40, height: 40, display: 'grid', placeItems: 'center',
                                    border: 'none',
                                    background: form.icon === key ? `${form.color}25` : 'transparent',
                                    color: form.icon === key ? form.color : 'var(--fh-muted)',
                                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                                    fontSize: '1.2rem',
                                    outline: form.icon === key ? `2px solid ${form.color}` : 'none'
                                }}
                            >
                                <Icon />
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="section" style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fh-muted)', marginBottom: 12 }}>Selecciona un Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px' }}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setForm({ ...form, color: c })}
                            style={{
                                width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                                borderColor: form.color === c ? '#fff' : 'transparent',
                                background: c, cursor: 'pointer', transition: 'transform 0.2s',
                                transform: form.color === c ? 'scale(1.2)' : 'none',
                                boxShadow: form.color === c ? `0 0 10px ${c}` : 'none'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--fh-border)', paddingTop: 20 }}>
                <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
                <button className="fh-btn primary" onClick={() => onSave(form)} disabled={!form.nombre || !form.codigo} style={{ minWidth: 140 }}>
                    {tipo ? 'Guardar Cambios' : 'Crear Tipo'}
                </button>
            </div>
        </div>
    )
}
