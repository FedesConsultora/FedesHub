import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { clientesApi } from '../../api/clientes'
import { useToast } from '../../components/toast/ToastProvider'
import { useModal } from '../../components/modal/ModalProvider'
import { useAuthCtx } from '../../context/AuthContext'
import {
    FiArrowLeft, FiEdit2, FiSave, FiX, FiMail, FiPhone,
    FiGlobe, FiUsers, FiTrash2, FiStar, FiChevronRight,
    FiMessageSquare, FiClock, FiCalendar
} from 'react-icons/fi'
import { getContrastColor, getCleanInitials } from '../../utils/ui'
import { resolveMediaUrl } from '../../utils/media'
import Avatar from '../../components/Avatar'
import ClienteStatusCard from '../../components/clients/ClienteStatusCard'
import AttendanceBadge from '../../components/common/AttendanceBadge'
import './clienteDetail.scss'

const linkify = (text = '') => {
    if (!text) return ''
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const withBr = escaped.replace(/\n/g, '<br/>')
    return withBr.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
}

import { useLoading } from '../../context/LoadingContext'

export default function ClienteDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const modal = useModal()
    const { roles } = useAuthCtx() || {}
    const { showLoader, hideLoader } = useLoading()

    const [cliente, setCliente] = useState(null)
    const [catalog, setCatalog] = useState({ tipos: [], estados: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (loading) showLoader()
        else hideLoader()
        return () => { if (loading) hideLoader() }
    }, [loading, showLoader, hideLoader])
    const [error, setError] = useState(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        nombre: '',
        alias: '',
        email: '',
        telefono: '',
        sitio_web: '',
        descripcion: '',
        tipo_id: '',
        ponderacion: 3,
        color: '#3B82F6'
    })

    const isDirectivo = roles?.includes('NivelA') || roles?.includes('NivelB')

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const [data, cat] = await Promise.all([
                clientesApi.get(id),
                clientesApi.catalog()
            ])
            setCliente(data)
            setCatalog(cat)
            setForm({
                nombre: data.nombre || '',
                alias: data.alias || '',
                email: data.email || '',
                telefono: data.telefono || '',
                sitio_web: data.sitio_web || '',
                descripcion: data.descripcion || '',
                tipo_id: data.tipo_id || '',
                ponderacion: data.ponderacion || 3,
                color: data.color || '#3B82F6'
            })
            document.title = `${data.nombre} | FedesHub`
        } catch (err) {
            setError(err.message || 'Error al cargar el cliente')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { reload() }, [reload])

    const startEdit = () => setEditing(true)
    const cancelEdit = () => {
        setEditing(false)
        setForm({
            nombre: cliente.nombre || '',
            alias: cliente.alias || '',
            email: cliente.email || '',
            telefono: cliente.telefono || '',
            sitio_web: cliente.sitio_web || '',
            descripcion: cliente.descripcion || '',
            tipo_id: cliente.tipo_id || '',
            ponderacion: cliente.ponderacion || 3,
            color: cliente.color || '#3B82F6'
        })
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const updated = await clientesApi.update(cliente.id, form)
            setCliente(updated)
            setEditing(false)
            toast.success('Cliente actualizado correctamente')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al guardar cambios')
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (estadoId) => {
        try {
            const updated = await clientesApi.update(cliente.id, { estado_id: estadoId })
            setCliente(updated)
        } catch (err) {
            toast.error(err.fh?.message || 'Error al cambiar estado')
            throw err
        }
    }

    const handleDelete = async () => {
        const ok = await modal.confirm({
            title: 'Eliminar cliente',
            message: '¿Estás seguro de que querés eliminar permanentemente este cliente? Esta acción no se puede deshacer.',
            okText: 'Eliminar permanentemente',
            cancelText: 'Cancelar',
            danger: true
        })

        if (!ok) return

        try {
            setSaving(true)
            await clientesApi.remove(cliente.id, { force: true })
            toast.success('Cliente eliminado permanentemente')
            navigate('/clientes')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al eliminar cliente')
        } finally {
            setSaving(false)
        }
    }

    if (loading && !cliente) return null
    if (error) return <div className="ClienteDetailPage"><div className="error">{error}</div></div>
    if (!cliente) return null

    const initials = getCleanInitials(editing ? form.nombre : cliente.nombre)
    const avatarBg = editing ? form.color : (cliente.color || '#3B82F6')
    const avatarColor = getContrastColor(avatarBg)

    return (
        <div className="ClienteDetailPage">
            <nav className="detailNavbar">
                <div className="left">
                    <button className="backBtn" onClick={() => navigate('/clientes')} title="Volver al listado">
                        <FiArrowLeft />
                    </button>
                    <div className="breadcrumb">
                        <Link to="/clientes">Clientes</Link>
                        <FiChevronRight className="sep" />
                        <span>Detalle de Cliente</span>
                    </div>
                </div>

                <div className="right">
                    <ClienteStatusCard
                        estadoCodigo={cliente.estado_codigo}
                        estadosCatalog={catalog.estados}
                        onPick={handleStatusChange}
                        disabled={editing || saving}
                    />

                    <div className="actions">
                        {!editing ? (
                            <>
                                {isDirectivo && cliente.total_tareas === 0 && (
                                    <button className="deleteBtn" onClick={handleDelete} title="Eliminar definitivamente">
                                        <FiTrash2 />
                                    </button>
                                )}
                                <button className="editBtn" onClick={startEdit}>
                                    <FiEdit2 /> Editar Perfil
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="cancelBtn" onClick={cancelEdit} disabled={saving}>
                                    <FiX /> Cancelar
                                </button>
                                <button className="saveBtn" onClick={handleSave} disabled={saving}>
                                    <FiSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <div className="detailGrid">
                <main className="mainCol">
                    <section className="profileCard">
                        <div className="avatarWrapper">
                            <div
                                className="avatar"
                                style={{ backgroundColor: avatarBg, color: avatarColor }}
                            >
                                {initials}
                            </div>
                            {editing && (
                                <div className="colorPicker">
                                    <input
                                        type="color"
                                        value={form.color}
                                        onChange={e => setForm({ ...form, color: e.target.value })}
                                        title="Color de identidad"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="profileInfo">
                            {editing ? (
                                <div className="editFields">
                                    <input
                                        className="titleInput"
                                        value={form.nombre}
                                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                                        placeholder="Nombre del Cliente"
                                    />
                                    <input
                                        className="aliasInput"
                                        value={form.alias}
                                        onChange={e => setForm({ ...form, alias: e.target.value })}
                                        placeholder="Alias / Nombre Fantasía"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h1>{cliente.nombre}</h1>
                                    {cliente.alias && <p className="alias">{cliente.alias}</p>}
                                </>
                            )}

                            <div className="badgesRow">
                                {!editing ? (
                                    <>
                                        <span className="badge type">{cliente.tipo_nombre}</span>
                                        {/* <span className="badge celula">{cliente.celula_nombre}</span> */}
                                        <span className="badge ponderacion">
                                            <FiStar className="icon" /> Pond. {cliente.ponderacion}
                                        </span>
                                    </>
                                ) : (
                                    <div className="editSelectors">
                                        <select value={form.tipo_id} onChange={e => setForm({ ...form, tipo_id: e.target.value })}>
                                            <option value="">Tipo de Cliente</option>
                                            {catalog.tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                        </select>
                                        <select value={form.ponderacion} onChange={e => setForm({ ...form, ponderacion: Number(e.target.value) })}>
                                            {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>Prioridad: {v}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="detailsPanel">
                        <div className="panelHeader">
                            <h3><FiUsers /> Información de Contacto</h3>
                        </div>
                        <div className="panelBody contactGrid">
                            <div className="contactField">
                                <label><FiMail /> Email Principal</label>
                                {editing ? (
                                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ejemplo@correo.com" />
                                ) : (
                                    <p>{cliente.email ? <a href={`mailto:${cliente.email}`}>{cliente.email}</a> : <span className="empty">Sin correo</span>}</p>
                                )}
                            </div>
                            <div className="contactField">
                                <label><FiPhone /> Teléfono</label>
                                {editing ? (
                                    <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54..." />
                                ) : (
                                    <p>{cliente.telefono ? <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a> : <span className="empty">Sin teléfono</span>}</p>
                                )}
                            </div>
                            <div className="contactField full">
                                <label><FiGlobe /> Sitio Web</label>
                                {editing ? (
                                    <input value={form.sitio_web} onChange={e => setForm({ ...form, sitio_web: e.target.value })} placeholder="https://..." />
                                ) : (
                                    <p>
                                        {cliente.sitio_web ? (
                                            <a href={cliente.sitio_web} target="_blank" rel="noopener noreferrer">{cliente.sitio_web}</a>
                                        ) : <span className="empty">Sin sitio web</span>}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="detailsPanel">
                        <div className="panelHeader">
                            <h3><FiMessageSquare /> Descripción / Notas Internas</h3>
                        </div>
                        <div className="panelBody">
                            {editing ? (
                                <textarea
                                    rows={6}
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Escribe detalles relevantes sobre el cliente..."
                                />
                            ) : (
                                <p className="descText" dangerouslySetInnerHTML={{ __html: linkify(cliente.descripcion) || '<span class="empty">No hay descripción disponible.</span>' }} />
                            )}
                        </div>
                    </section>

                    <section className="kpiGrid">
                        <div className="kpiCard">
                            <FiClock className="icon" />
                            <div className="data">
                                <strong>{cliente.tareas_abiertas || 0}</strong>
                                <span>Tareas Abiertas</span>
                            </div>
                        </div>
                        <div className="kpiCard">
                            <FiCalendar className="icon" />
                            <div className="data">
                                <strong>{cliente.total_tareas || 0}</strong>
                                <span>Tareas Totales</span>
                            </div>
                        </div>
                        <Link to={`/tareas?cliente_id=${cliente.id}`} className="kpiCard link">
                            <FiMessageSquare className="icon" />
                            <div className="data">
                                <strong>Ver tareas →</strong>
                                <span>Historial completo</span>
                            </div>
                        </Link>
                    </section>
                </main>

                <aside className="sideCol">
                    {/* Célula panel removed */}

                    <section className="sidePanel">
                        <div className="sidePanelHeader">
                            <h4>Contactos Directos ({cliente.contactos?.length || 0})</h4>
                        </div>
                        <div className="contactsList">
                            {cliente.contactos?.map(ct => (
                                <div key={ct.id} className="contactRow">
                                    <div className="contactMain">
                                        <strong>{ct.nombre}</strong>
                                        <span>{ct.cargo || 'Contacto'}</span>
                                    </div>
                                    <div className="contactActions">
                                        {ct.email && <a href={`mailto:${ct.email}`} title={ct.email}><FiMail /></a>}
                                        {ct.telefono && <a href={`tel:${ct.telefono}`} title={ct.telefono}><FiPhone /></a>}
                                    </div>
                                </div>
                            ))}
                            {(!cliente.contactos || cliente.contactos.length === 0) && (
                                <p className="empty">No hay contactos secundarios.</p>
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}
