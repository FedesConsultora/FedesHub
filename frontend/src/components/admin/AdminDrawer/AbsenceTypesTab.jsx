import React, { useEffect, useState } from 'react'
import { ausenciasApi as API } from '../../../api/ausencias'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider.jsx'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import PremiumSelect from '../../ui/PremiumSelect'
import {
    FiPlus, FiEdit2, FiTrash2, FiSun, FiCloudRain, FiBookOpen,
    FiUser, FiXCircle, FiGift, FiClock, FiHeart, FiCoffee,
    FiBriefcase, FiAlertCircle, FiTag, FiZap, FiCalendar,
    FiHome, FiMapPin, FiShield, FiShoppingCart, FiSmile, FiActivity
} from 'react-icons/fi'
import { FaBaby, FaHospital, FaUserGraduate, FaCar, FaUmbrellaBeach, FaPlane } from 'react-icons/fa'
import '../../ausencias/dialogs/Dialog.scss'

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
            width: 600,
            maxHeight: '75vh',
            render: (close) => (
                <AbsenceTypeForm
                    tipo={tipo}
                    onSave={async (data) => {
                        try {
                            if (tipo) await API.catalog.tipoPatch(tipo.id, data)
                            else await API.catalog.tipoCreate(data)
                            toast?.success(tipo ? 'Tipo actualizado' : 'Tipo creado')
                            close()
                            // Recargar la lista inmediatamente
                            await load()
                            // Notificar a otros componentes
                            window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia_tipo' } }))
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
        <div className="dlg-form premium-form" style={{ padding: '0 4px' }}>
            <div className="section">
                <label><FiTag /> Nombre del Tipo</label>
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
                />
            </div>

            <div className="section">
                <label><FiBriefcase /> Descripción / Reglas</label>
                <textarea
                    className="fh-input"
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    rows={2}
                    placeholder="Describe cuándo se aplica..."
                />
            </div>

            <div className="section">
                <PremiumSelect
                    label="Unidad de Medida"
                    icon={FiClock}
                    options={[
                        { value: 'dia', label: 'Días' },
                        { value: 'hora', label: 'Horas' }
                    ]}
                    value={form.unidad_codigo}
                    onChange={val => setForm({ ...form, unidad_codigo: val })}
                />
            </div>
            <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="check-row">
                    <input type="checkbox" checked={form.requiere_asignacion} onChange={e => setForm({ ...form, requiere_asignacion: e.target.checked })} />
                    <span>Requiere Cupo</span>
                </label>
                {!isHora && (
                    <label className="check-row">
                        <input type="checkbox" checked={form.permite_medio_dia} onChange={e => setForm({ ...form, permite_medio_dia: e.target.checked })} />
                        <span>Permitir 1/2 Día</span>
                    </label>
                )}
            </div>

            <div className="section">
                <label style={{ marginBottom: 8 }}>Selecciona un Icono</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: 8,
                    maxHeight: 120,
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)'
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

            <div className="section">
                <label style={{ marginBottom: 8 }}>Selecciona un Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px' }}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setForm({ ...form, color: c })}
                            style={{
                                width: 24, height: 24, borderRadius: '50%', border: '2px solid',
                                borderColor: form.color === c ? '#fff' : 'transparent',
                                background: c, cursor: 'pointer', transition: 'transform 0.2s',
                                transform: form.color === c ? 'scale(1.2)' : 'none',
                                boxShadow: form.color === c ? `0 0 10px ${c}` : 'none'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="actions">
                <button type="button" className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
                <button type="button" className="fh-btn primary" onClick={() => onSave(form)} disabled={!form.nombre || !form.codigo}>
                    {tipo ? 'Guardar Cambios' : 'Crear Tipo'}
                </button>
            </div>
        </div>
    )
}
