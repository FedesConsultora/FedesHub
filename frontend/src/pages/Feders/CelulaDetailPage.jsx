import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { celulasApi } from '../../api/celulas'
import { federsApi } from '../../api/feders'
import { useToast } from '../../components/toast/ToastProvider'
import { useModal } from '../../components/modal/ModalProvider'
import { useAuthCtx } from '../../context/AuthContext'
import {
    FiArrowLeft, FiEdit2, FiSave, FiX, FiUsers,
    FiTrash2, FiChevronRight, FiClock, FiPlus, FiLogOut, FiBriefcase
} from 'react-icons/fi'
import { CiCircleRemove } from "react-icons/ci";

import { clientesApi } from '../../api/clientes'
import Avatar from '../../components/Avatar'
import PersonTag from '../../components/PersonTag'
import FormRow from '../../components/ui/FormRow'
import './CelulaDetailPage.scss'

// --- Sub-components for Modals (to avoid hook rule violations) ---

function AddMemberModal({ availableFeders, roles, onSave, close }) {
    const [mem, setMem] = useState({ feder_id: '', rol_codigo: roles[0]?.codigo || 'miembro' })
    const toast = useToast()

    const handleOk = async () => {
        if (!mem.feder_id) return toast.warn('Seleccioná una persona')
        close()
        try {
            await onSave(mem)
        } catch (e) {
            // Error handling done by caller or toast
        }
    }

    return (
        <div className="custom-modal-form">
            <FormRow label="Persona">
                <select value={mem.feder_id} onChange={e => setMem({ ...mem, feder_id: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {availableFeders.map(f => (
                        <option key={f.id} value={f.id}>{f.nombre} {f.apellido}</option>
                    ))}
                </select>
            </FormRow>

            <div className="modal-footer">
                <button className="primary" onClick={handleOk}>Agregar</button>
                <button onClick={close}>Cancelar</button>
            </div>
        </div>
    )
}

function CloseAsignModal({ member, onSave, close }) {
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])

    const handleOk = async () => {
        try {
            await onSave(hasta)
            close()
        } catch (e) {
            // Error handling done by caller
        }
    }

    return (
        <div className="custom-modal-form">
            <p>¿Cuándo finaliza <b>{member.feder_apellido || member.apellido}, {member.feder_nombre || member.nombre}</b> su rol de {member.rol_nombre}?</p>
            <FormRow label="Fecha de fin">
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </FormRow>
            <div className="modal-footer">
                <button onClick={close}>Cancelar</button>
                <button className="danger" onClick={handleOk}>Finalizar Ahora</button>
            </div>
        </div>
    )
}

// --- Main Component ---

export default function CelulaDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const toast = useToast()
    const modal = useModal()
    const { roles, hasPerm } = useAuthCtx() || {}

    const [celula, setCelula] = useState(null)
    const [catalog, setCatalog] = useState({ estados: [], roles: [] })
    const [allFeders, setAllFeders] = useState([])
    const [allClientes, setAllClientes] = useState([])
    const [celulaClientes, setCelulaClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        perfil_md: '',
        avatar_url: '',
        cover_url: '',
        estado_codigo: 'activa',
        cliente_ids: []
    })

    const canUpdate = hasPerm('celulas', 'update')
    const canAssign = hasPerm('celulas', 'assign')
    const canDelete = roles?.includes('NivelA')

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const [data, cat, feders, cls, myCls] = await Promise.all([
                celulasApi.get(id),
                celulasApi.catalog(),
                federsApi.list({ limit: 200, is_activo: true }),
                clientesApi.list({ limit: 200, estado_id: 'all' }),
                celulasApi.listClientes(id)
            ])
            setCelula(data)
            setCatalog(cat)
            setAllFeders(feders.rows || [])
            setAllClientes(cls.rows || [])
            setCelulaClientes(myCls || [])
            setForm({
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                perfil_md: data.perfil_md || '',
                avatar_url: data.avatar_url || '',
                cover_url: data.cover_url || '',
                estado_codigo: data.estado_codigo || 'activa',
                cliente_ids: (myCls || []).map(c => c.id)
            })
            document.title = `${data.nombre} | FedesHub`
        } catch (err) {
            toast.error(err.message || 'Error al cargar la célula')
        } finally {
            setLoading(false)
        }
    }, [id, toast])

    useEffect(() => {
        reload().then(() => {
            const params = new URLSearchParams(location.search)
            if (params.get('edit') === 'true') {
                setEditing(true)
            }
        })
        // Guardar como última célula vista para persistencia de navegación
        localStorage.setItem('fh_last_celula_id', id)
    }, [reload, location.search, id])

    const startEdit = () => setEditing(true)
    const cancelEdit = () => {
        setEditing(false)
        setForm({
            nombre: celula.nombre || '',
            descripcion: celula.descripcion || '',
            perfil_md: celula.perfil_md || '',
            avatar_url: celula.avatar_url || '',
            cover_url: celula.cover_url || '',
            estado_codigo: celula.estado_codigo || 'activa',
            cliente_ids: (celulaClientes || []).map(c => c.id)
        })
    }

    const handleDelete = async () => {
        const ok = await modal.confirm({
            title: 'Eliminar Célula',
            message: `¿Estás seguro de que deseas eliminar la célula "${celula.nombre}"? Esta acción no se puede deshacer.`,
            tone: 'danger',
            okText: 'Eliminar Célula',
            cancelText: 'Cancelar'
        })
        if (!ok) return

        try {
            setSaving(true)
            await celulasApi.delete(id)
            toast.success('Célula eliminada correctamente')
            navigate('/feders/celulas')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al eliminar la célula')
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const updated = await celulasApi.update(id, form)
            setCelula(updated)
            const myCls = await celulasApi.listClientes(id)
            setCelulaClientes(myCls)
            setEditing(false)
            toast.success('Célula actualizada')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            setUploading(true)
            const updated = await celulasApi.uploadAvatar(id, file)
            setCelula(updated)
            toast.success('Avatar actualizado')
        } catch (err) {
            toast.error(err.message || 'Error al subir avatar')
        } finally {
            setUploading(false)
        }
    }

    const handleAddMember = () => {
        const assignedIds = (celula.asignaciones || []).filter(a => !a.hasta).map(a => a.feder_id)
        const availableFeders = allFeders.filter(f => !assignedIds.includes(f.id))

        modal.open({
            title: 'Agregar Miembro',
            render: (close) => (
                <AddMemberModal
                    availableFeders={availableFeders}
                    close={close}
                    onSave={async (mem) => {
                        try {
                            await celulasApi.addAsignacion(id, {
                                ...mem,
                                desde: new Date().toISOString().split('T')[0]
                            })
                            toast.success('Miembro agregado')
                            reload()
                        } catch (e) {
                            toast.error(e.fh?.message || 'Error al agregar')
                            throw e
                        }
                    }}
                />
            )
        })
    }

    const handleCloseAsign = (a) => {
        modal.open({
            title: 'Finalizar Participación',
            render: (close) => (
                <CloseAsignModal
                    member={a}
                    close={close}
                    onSave={async (hasta) => {
                        try {
                            await celulasApi.closeAsignacion(a.id, { hasta })
                            toast.success('Participación finalizada')
                            reload()
                        } catch (e) {
                            toast.error(e.fh?.message || 'Error al finalizar')
                            throw e
                        }
                    }}
                />
            )
        })
    }

    if (loading && !celula) return <div className="loadingPage">Cargando célula...</div>
    if (!celula) return <div className="errorPage">No se encontró la célula</div>

    const activeMembers = celula.asignaciones?.filter(a => !a.hasta || a.hasta > new Date().toISOString().split('T')[0]) || []

    return (
        <div className="CelulaDetailPage">
            <header className="detailNavbar">
                <div className="left">
                    <button className="backBtn" onClick={() => navigate('/feders/celulas')} title="Volver">
                        <FiArrowLeft />
                    </button>
                    <div className="breadcrumb">
                        <Link to="/feders">Feders</Link>
                        <span className="sep">/</span>
                        <Link to="/feders/celulas">Células</Link>
                        <span className="sep">/</span>
                        <span>{celula.nombre}</span>
                    </div>
                </div>

                <div className="actions">
                    {canDelete && !editing && (
                        <button className="deleteBtn" onClick={handleDelete} title="Eliminar célula">
                            <FiTrash2 /> Eliminar
                        </button>
                    )}
                    {!editing ? (
                        canUpdate && <button className="editBtn" onClick={startEdit}><FiEdit2 /> Editar Célula</button>
                    ) : (
                        <>
                            <button className="cancelBtn" onClick={cancelEdit} disabled={saving}><FiX /> Cancelar</button>
                            <button className="saveBtn" onClick={handleSave} disabled={saving}><FiSave /> {saving ? 'Guardando...' : 'Guardar'}</button>
                        </>
                    )}
                </div>
            </header>

            <section className="profileCard">
                <div className="avatarWrapper">
                    <label className={`avLabel ${uploading ? 'uploading' : ''}`}>
                        <Avatar src={celula.avatar_url} name={celula.nombre} size={110} />
                        {canUpdate && (
                            <div className="avOverlay">
                                <FiPlus />
                                <input type="file" hidden onChange={handleAvatarChange} accept="image/*" />
                            </div>
                        )}
                        {uploading && <div className="avSpinner">...</div>}
                    </label>
                </div>
                <div className="profileInfo">
                    {editing ? (
                        <input
                            className="titleInput"
                            value={form.nombre}
                            onChange={e => setForm({ ...form, nombre: e.target.value })}
                            autoFocus
                        />
                    ) : (
                        <h1>{celula.nombre}</h1>
                    )}
                    <div className="badgesRow">
                        {editing ? (
                            <select
                                className="stateSelect"
                                value={form.estado_codigo}
                                onChange={e => setForm({ ...form, estado_codigo: e.target.value })}
                            >
                                {catalog.estados.map(est => (
                                    <option key={est.codigo} value={est.codigo}>{est.nombre}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`badge state ${celula.estado_codigo}`}>{celula.estado_nombre}</span>
                        )}
                        <span className="badge members">
                            <FiUsers /> {activeMembers.length} miembros
                        </span>
                        <span className="badge clients">
                            <FiBriefcase /> {celulaClientes.length} clientes
                        </span>
                    </div>
                </div>
            </section>

            <main className="detailGrid">
                <div className="leftCol">
                    <section className="detailsPanel">
                        <header className="panelHeader">
                            <h3>Descripción</h3>
                        </header>
                        <div className="panelBody">
                            {editing ? (
                                <textarea
                                    className="descTextarea"
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Descripción o propósito de la célula..."
                                    rows={4}
                                />
                            ) : (
                                <p className="descText">{celula.descripcion || 'Sin descripción'}</p>
                            )}
                        </div>
                    </section>

                    <section className="detailsPanel">
                        <header className="panelHeader">
                            <h3>Miembros Activos</h3>
                            {canAssign && <button className="addBtn" onClick={handleAddMember}><FiPlus /> Agregar</button>}
                        </header>
                        <div className="panelBody">
                            <div className="membersList">
                                {activeMembers.map(a => (
                                    <div key={a.id} className="memberRow">
                                        <PersonTag
                                            p={{
                                                id: a.feder_id,
                                                nombre: a.feder_nombre || a.nombre,
                                                apellido: a.feder_apellido || a.apellido,
                                                avatar_url: a.feder_avatar_url || a.avatar_url,
                                                cargo_nombre: a.feder_cargo_nombre || a.rol_nombre
                                            }}
                                        />
                                        <div className="memberActions">
                                            {a.es_principal && <span className="principalTag">Principal</span>}
                                            <button className="closeBtn" onClick={() => handleCloseAsign(a)}>
                                                <CiCircleRemove size={30} />

                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {activeMembers.length === 0 && <p className="empty">No hay miembros asignados.</p>}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="rightCol">
                    <section className="detailsPanel clientsPanel">
                        <header className="panelHeader">
                            <h3>Clientes</h3>
                        </header>
                        <div className="panelBody">
                            {editing ? (
                                <div className="clientManagement">
                                    <div className="clientSearch">
                                        <select
                                            className="searchSelect"
                                            value=""
                                            onChange={e => {
                                                if (e.target.value) {
                                                    const id = Number(e.target.value)
                                                    if (!form.cliente_ids.includes(id)) {
                                                        setForm({ ...form, cliente_ids: [...form.cliente_ids, id] })
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">+ Asociar cliente...</option>
                                            {allClientes
                                                .filter(c => !form.cliente_ids.includes(c.id))
                                                .map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <div className="clientsMiniList">
                                        {form.cliente_ids.map(cid => {
                                            const c = allClientes.find(it => it.id === cid)
                                            if (!c) return null
                                            return (
                                                <div key={cid} className="clientMiniItem">
                                                    <span className="name">{c.nombre}</span>
                                                    <button
                                                        className="removeBtn"
                                                        onClick={() => setForm({
                                                            ...form,
                                                            cliente_ids: form.cliente_ids.filter(id => id !== cid)
                                                        })}
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        {form.cliente_ids.length === 0 && <p className="empty">Sin clientes asociados.</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="clientsList">
                                    {celulaClientes.map(c => (
                                        <Link key={c.id} to={`/clientes/${c.id}`} className="clientCard">
                                            <div className="clientInfo">
                                                <span className="clientName">{c.nombre}</span>
                                                <span className={`clientBadge ${c.estado_codigo}`}>{c.estado_nombre || c.estado_codigo}</span>
                                            </div>
                                            <FiChevronRight />
                                        </Link>
                                    ))}
                                    {celulaClientes.length === 0 && <p className="empty">Sin clientes asignados.</p>}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}
