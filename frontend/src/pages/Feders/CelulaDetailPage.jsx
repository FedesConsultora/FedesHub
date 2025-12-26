import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { celulasApi } from '../../api/celulas'
import { federsApi } from '../../api/feders'
import { useToast } from '../../components/toast/ToastProvider'
import { useModal } from '../../components/modal/ModalProvider'
import { useAuthCtx } from '../../context/AuthContext'
import {
    FiArrowLeft, FiEdit2, FiSave, FiX, FiUsers,
    FiTrash2, FiChevronRight, FiClock, FiPlus, FiLogOut
} from 'react-icons/fi'
import Avatar from '../../components/Avatar'
import PersonTag from '../../components/PersonTag'
import FormRow from '../../components/ui/FormRow'
import './CelulaDetailPage.scss'

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
        estado_codigo: 'activa'
    })

    const canUpdate = hasPerm('celulas', 'update')
    const canAssign = hasPerm('celulas', 'assign')

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const [data, cat, feders] = await Promise.all([
                celulasApi.get(id),
                celulasApi.catalog(),
                federsApi.list({ limit: 200, is_activo: true })
            ])
            setCelula(data)
            setCatalog(cat)
            setAllFeders(feders.rows || [])
            setForm({
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                perfil_md: data.perfil_md || '',
                avatar_url: data.avatar_url || '',
                cover_url: data.cover_url || '',
                estado_codigo: data.estado_codigo || 'activa'
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
    }, [reload, location.search])

    const startEdit = () => setEditing(true)
    const cancelEdit = () => {
        setEditing(false)
        setForm({
            nombre: celula.nombre || '',
            descripcion: celula.descripcion || '',
            perfil_md: celula.perfil_md || '',
            avatar_url: celula.avatar_url || '',
            cover_url: celula.cover_url || '',
            estado_codigo: celula.estado_codigo || 'activa'
        })
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const updated = await celulasApi.update(id, form)
            setCelula(updated)
            setEditing(false)
            toast.success('Célula actualizada')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploading(true)
            const updated = await celulasApi.uploadAvatar(id, file)
            setCelula(updated)
            toast.success('Avatar actualizado')
        } catch (err) {
            toast.error(err.fh?.message || 'Error al subir imagen')
        } finally {
            setUploading(false)
        }
    }

    const handleAddMember = async () => {
        let selection = {
            feder_id: '',
            rol_codigo: catalog.roles?.[0]?.codigo || 'miembro',
            desde: new Date().toISOString().split('T')[0]
        }

        const ok = await modal.open({
            title: 'Agregar Miembro',
            width: 400,
            render: (close) => (
                <div className="celulas-modal" style={{ padding: '0 4px' }}>
                    <FormRow label="Feder">
                        <select
                            onChange={e => selection.feder_id = e.target.value}
                            defaultValue=""
                        >
                            <option value="" disabled>Seleccionar Persona...</option>
                            {allFeders
                                .filter(f => !celula.asignaciones?.some(a => !a.hasta && Number(a.feder_id) === Number(f.id)))
                                .map(f => (
                                    <option key={f.id} value={f.id}>{f.apellido}, {f.nombre}</option>
                                ))
                            }
                        </select>
                    </FormRow>
                    <FormRow label="Rol">
                        <select
                            onChange={e => selection.rol_codigo = e.target.value}
                            defaultValue={selection.rol_codigo}
                        >
                            {catalog.roles.map(r => (
                                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
                            ))}
                        </select>
                    </FormRow>
                    <FormRow label="Desde">
                        <input
                            type="date"
                            onChange={e => selection.desde = e.target.value}
                            defaultValue={selection.desde}
                        />
                    </FormRow>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button className="fh-btn" onClick={() => close(false)}>Cancelar</button>
                        <button className="fh-btn primary" onClick={() => {
                            if (!selection.feder_id) return toast.warn('Seleccioná una persona')
                            close(selection)
                        }}>Asignar</button>
                    </div>
                </div>
            )
        })

        if (!ok) return
        try {
            await celulasApi.addAsignacion(id, ok)
            toast.success('Miembro asignado')
            reload()
        } catch (err) {
            toast.error(err.fh?.message || 'Error al asignar')
        }
    }

    const handleCloseAsign = async (asignId) => {
        let selection = {
            hasta: new Date().toISOString().split('T')[0]
        }

        const ok = await modal.open({
            title: 'Finalizar Asignación',
            width: 400,
            render: (close) => (
                <div className="celulas-modal" style={{ padding: '0 4px' }}>
                    <p style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#a0aec0' }}>
                        ¿Cuándo finaliza esta participación?
                    </p>
                    <FormRow label="Fecha Fin">
                        <input
                            type="date"
                            onChange={e => selection.hasta = e.target.value}
                            defaultValue={selection.hasta}
                        />
                    </FormRow>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button className="fh-btn" onClick={() => close(false)}>Cancelar</button>
                        <button className="fh-btn primary danger" onClick={() => close(selection)}>Finalizar</button>
                    </div>
                </div>
            )
        })

        if (!ok) return
        try {
            await celulasApi.closeAsignacion(asignId, ok)
            toast.success('Asignación finalizada')
            reload()
        } catch (err) {
            toast.error(err.fh?.message || 'Error al cerrar')
        }
    }

    if (loading) return <div className="CelulaDetailPage"><div className="loading">Cargando célula...</div></div>
    if (!celula) return null

    return (
        <div className="CelulaDetailPage">
            <nav className="detailNavbar">
                <div className="left">
                    <button className="backBtn" onClick={() => navigate('/feders/celulas')} title="Volver al listado">
                        <FiArrowLeft />
                    </button>
                    <div className="breadcrumb">
                        <Link to="/feders">Feders</Link>
                        <FiChevronRight className="sep" />
                        <Link to="/feders/celulas">Células</Link>
                        <FiChevronRight className="sep" />
                        <span>Detalle</span>
                    </div>
                </div>

                <div className="right">
                    <div className="actions">
                        {!editing ? (
                            canUpdate && <button className="editBtn" onClick={startEdit}><FiEdit2 /> Editar Célula</button>
                        ) : (
                            <>
                                <button className="cancelBtn" onClick={cancelEdit} disabled={saving}><FiX /> Cancelar</button>
                                <button className="saveBtn" onClick={handleSave} disabled={saving}><FiSave /> {saving ? 'Guardando...' : 'Guardar'}</button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <div className="detailGrid">
                <main className="mainCol">
                    <section className="profileCard">
                        <div className="avatarWrapper">
                            <label className={`avLabel ${uploading ? 'uploading' : ''}`}>
                                <Avatar src={celula.avatar_url} name={celula.nombre} size={80} rounded="md" />
                                {canUpdate && (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarFile}
                                        disabled={uploading}
                                    />
                                )}
                                {uploading && <div className="avSpinner">...</div>}
                                {canUpdate && <div className="avOverlay"><FiEdit2 /></div>}
                            </label>
                        </div>
                        <div className="profileInfo">
                            {editing ? (
                                <input
                                    className="titleInput"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Nombre de la Célula"
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
                                    <FiUsers /> {celula.asignaciones?.filter(a => !a.hasta || a.hasta > new Date().toISOString().split('T')[0]).length || 0} miembros
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="detailsPanel">
                        <div className="panelHeader">
                            <h3>Descripción</h3>
                        </div>
                        <div className="panelBody">
                            {editing ? (
                                <textarea
                                    rows={4}
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="¿Qué hace esta célula?"
                                />
                            ) : (
                                <p className="descText">{celula.descripcion || <span className="empty">Sin descripción.</span>}</p>
                            )}
                        </div>
                    </section>

                    <section className="detailsPanel">
                        <div className="panelHeader">
                            <h3>Miembros Activos</h3>
                            {canAssign && <button className="addBtn" onClick={handleAddMember}><FiPlus /> Agregar</button>}
                        </div>
                        <div className="panelBody membersList">
                            {celula.asignaciones?.filter(a => !a.hasta || a.hasta > new Date().toISOString().split('T')[0]).map(a => (
                                <div key={a.id} className="memberRow">
                                    <PersonTag
                                        p={{
                                            id: a.feder_id,
                                            nombre: a.feder_nombre || a.nombre,
                                            apellido: a.feder_apellido || a.apellido,
                                            avatar_url: a.feder_avatar_url || a.avatar_url
                                        }}
                                        subtitle={a.rol_nombre}
                                    />
                                    <div className="memberActions">
                                        <span className="since">Desde: {a.desde}</span>
                                        {canAssign && (
                                            <button className="closeBtn" onClick={() => handleCloseAsign(a.id)} title="Finalizar asignación">
                                                <FiLogOut />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {celula.asignaciones?.filter(a => !a.hasta || a.hasta > new Date().toISOString().split('T')[0]).length === 0 && <p className="empty">No hay miembros asignados.</p>}
                        </div>
                    </section>
                </main>

                <aside className="sideCol">
                    <section className="sidePanel">
                        <div className="sidePanelHeader">
                            <h4>Clientes Vinculados</h4>
                        </div>
                        <div className="simpleList">
                            {celula.clientes?.map(cli => (
                                <div key={cli.id} className="itemRow">
                                    <Avatar name={cli.nombre} size={24} rounded="sm" className="cliAv" />
                                    <span>{cli.nombre}</span>
                                </div>
                            ))}
                            {(!celula.clientes || celula.clientes.length === 0) && <p className="empty">Sin clientes asignados.</p>}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}
