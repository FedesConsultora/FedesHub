import React, { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useClienteDetail } from './hooks/useClienteDetail'
import { clientesApi } from '../../api/clientes'
import useClientesCatalog from './hooks/useClientesCatalog'
import ClienteContactList from '../../components/clients/ClienteContactList'
import ClienteTasksMini from '../../components/clients/ClienteTasksMini'
import { useToast } from '../../components/toast/ToastProvider'
import { FiArrowLeft, FiEdit2, FiSave, FiX, FiMail, FiPhone, FiGlobe, FiUsers } from 'react-icons/fi'
import './clienteDetail.scss'

export default function ClienteDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const { cliente, contactos, loading, error, refetch } = useClienteDetail(Number(id))
    const { data: catalog } = useClientesCatalog()

    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({})

    const startEdit = () => {
        setForm({
            nombre: cliente.nombre || '',
            alias: cliente.alias || '',
            email: cliente.email || '',
            telefono: cliente.telefono || '',
            sitio_web: cliente.sitio_web || '',
            descripcion: cliente.descripcion || '',
            celula_id: cliente.celula_id || '',
            tipo_id: cliente.tipo_id || '',
            estado_id: cliente.estado_id || '',
            ponderacion: cliente.ponderacion || 3,
            color: cliente.color || '#3B82F6'
        })
        setEditing(true)
    }

    const cancelEdit = () => {
        setEditing(false)
        setForm({})
    }

    const saveEdit = async () => {
        try {
            setSaving(true)
            await clientesApi.update(cliente.id, form)
            toast.success('Cliente actualizado')
            setEditing(false)
            refetch()
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const upd = (field, value) => setForm(f => ({ ...f, [field]: value }))

    if (loading) return (
        <div className="ClienteDetailPage"><div className="loading">Cargando…</div></div>
    )
    if (error) return (
        <div className="ClienteDetailPage"><div className="error">{error}</div></div>
    )
    if (!cliente) return null

    const initials = (cliente.nombre || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

    return (
        <div className="ClienteDetailPage">
            {/* Barra superior */}
            <header className="topBar">
                <button className="backBtn" onClick={() => navigate('/clientes')} title="Volver">
                    <FiArrowLeft />
                </button>
                <h1 className="pageTitle">Detalle del Cliente</h1>
                <div className="topActions">
                    {!editing ? (
                        <button className="editBtn" onClick={startEdit}>
                            <FiEdit2 /> Editar
                        </button>
                    ) : (
                        <>
                            <button className="cancelBtn" onClick={cancelEdit} disabled={saving}>
                                <FiX /> Cancelar
                            </button>
                            <button className="saveBtn" onClick={saveEdit} disabled={saving}>
                                <FiSave /> {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Contenido principal */}
            <div className="detailGrid">
                {/* Columna izquierda - Info principal */}
                <div className="mainCol">
                    <section className="infoCard">
                        <div className="cardHeader">
                            <div
                                className="clientAvatar"
                                style={{ backgroundColor: editing ? form.color : (cliente.color || '#3B82F6') }}
                            >
                                {initials || 'C'}
                            </div>
                            <div className="clientInfo">
                                {!editing ? (
                                    <>
                                        <h2>{cliente.nombre}</h2>
                                        {cliente.alias && <span className="alias">({cliente.alias})</span>}
                                    </>
                                ) : (
                                    <div className="editFields">
                                        <input
                                            type="text"
                                            value={form.nombre}
                                            onChange={e => upd('nombre', e.target.value)}
                                            placeholder="Nombre del cliente"
                                            className="inputLg"
                                        />
                                        <input
                                            type="text"
                                            value={form.alias}
                                            onChange={e => upd('alias', e.target.value)}
                                            placeholder="Alias (opcional)"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Badges/Meta */}
                        <div className="metaRow">
                            {!editing ? (
                                <>
                                    <span className="badge">{cliente.tipo_nombre}</span>
                                    <span className="badge">{cliente.estado_nombre}</span>
                                    <span className="badge">Pond. {cliente.ponderacion}</span>
                                    <Link to={`/celulas/${cliente.celula_id}`} className="badge link">
                                        <FiUsers size={12} /> {cliente.celula_nombre}
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <select value={form.tipo_id} onChange={e => upd('tipo_id', Number(e.target.value))}>
                                        {(catalog?.tipos || []).map(t => (
                                            <option key={t.id} value={t.id}>{t.nombre}</option>
                                        ))}
                                    </select>
                                    <select value={form.estado_id} onChange={e => upd('estado_id', Number(e.target.value))}>
                                        {(catalog?.estados || []).map(e => (
                                            <option key={e.id} value={e.id}>{e.nombre}</option>
                                        ))}
                                    </select>
                                    <select value={form.ponderacion} onChange={e => upd('ponderacion', Number(e.target.value))}>
                                        {[1, 2, 3, 4, 5].map(p => (
                                            <option key={p} value={p}>Pond. {p}</option>
                                        ))}
                                    </select>
                                    <select value={form.celula_id} onChange={e => upd('celula_id', Number(e.target.value))}>
                                        {(catalog?.celulas || []).map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Contacto */}
                        <div className="contactInfo">
                            {!editing ? (
                                <>
                                    <div className="contactItem">
                                        <FiMail className="icon" />
                                        <span>{cliente.email || '—'}</span>
                                    </div>
                                    <div className="contactItem">
                                        <FiPhone className="icon" />
                                        <span>{cliente.telefono || '—'}</span>
                                    </div>
                                    {cliente.sitio_web && (
                                        <div className="contactItem">
                                            <FiGlobe className="icon" />
                                            <a href={cliente.sitio_web} target="_blank" rel="noreferrer">{cliente.sitio_web}</a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="inputRow">
                                        <FiMail className="icon" />
                                        <input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="Email" />
                                    </div>
                                    <div className="inputRow">
                                        <FiPhone className="icon" />
                                        <input type="tel" value={form.telefono} onChange={e => upd('telefono', e.target.value)} placeholder="Teléfono" />
                                    </div>
                                    <div className="inputRow">
                                        <FiGlobe className="icon" />
                                        <input type="url" value={form.sitio_web} onChange={e => upd('sitio_web', e.target.value)} placeholder="Sitio web" />
                                    </div>
                                    <div className="inputRow">
                                        <label>Color:</label>
                                        <input type="color" value={form.color} onChange={e => upd('color', e.target.value)} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Descripción */}
                        {(cliente.descripcion || editing) && (
                            <div className="descSection">
                                <h3>Descripción</h3>
                                {!editing ? (
                                    <p>{cliente.descripcion || 'Sin descripción'}</p>
                                ) : (
                                    <textarea
                                        value={form.descripcion}
                                        onChange={e => upd('descripcion', e.target.value)}
                                        placeholder="Descripción del cliente..."
                                        rows={4}
                                    />
                                )}
                            </div>
                        )}
                    </section>

                    {/* Stats */}
                    <section className="statsRow">
                        <div className="statCard">
                            <div className="statValue">{cliente.tareas_abiertas ?? 0}</div>
                            <div className="statLabel">Tareas abiertas</div>
                        </div>
                        <div className="statCard">
                            <div className="statValue">{cliente.total_tareas ?? 0}</div>
                            <div className="statLabel">Tareas totales</div>
                        </div>
                    </section>
                </div>

                {/* Columna derecha - Paneles */}
                <div className="sideCol">
                    {/* Equipo de la célula */}
                    {cliente.gerentes?.length > 0 && (
                        <section className="panel">
                            <h3>Equipo asignado</h3>
                            <ul className="teamList">
                                {cliente.gerentes.map(g => (
                                    <li key={g.id} className="teamMember">
                                        <div
                                            className="memberAvatar"
                                            style={{ backgroundImage: g.avatar_url ? `url(${g.avatar_url})` : undefined }}
                                        >
                                            {!g.avatar_url && (g.nombre?.[0] || '').toUpperCase()}
                                        </div>
                                        <div className="memberInfo">
                                            <div className="memberName">{g.nombre} {g.apellido}</div>
                                            <div className="memberRole">{g.rol_nombre}</div>
                                        </div>
                                        {g.es_principal && <span className="principalTag">Principal</span>}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Contactos */}
                    <section className="panel">
                        <h3>Contactos</h3>
                        <ClienteContactList contactos={contactos} />
                    </section>

                    {/* Tareas */}
                    <section className="panel">
                        <h3>Tareas recientes</h3>
                        <ClienteTasksMini clienteId={cliente.id} />
                    </section>
                </div>
            </div>
        </div>
    )
}
