import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import './CelulaDetailPage.scss'

export default function CelulaDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
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
        cover_url: ''
    })

    const canUpdate = hasPerm('celulas', 'update')
    const canAssign = hasPerm('celulas', 'assign')

    const reload = useCallback(async () => {
        try {
            setLoading(true)
            const [data, cat, feders] = await Promise.all([
                celulasApi.get(id),
                celulasApi.catalog(),
                federsApi.list({ limit: 500, is_activo: true })
            ])
            setCelula(data)
            setCatalog(cat)
            setAllFeders(feders.rows || [])
            setForm({
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                perfil_md: data.perfil_md || '',
                avatar_url: data.avatar_url || '',
                cover_url: data.cover_url || ''
            })
            document.title = `${data.nombre} | FedesHub`
        } catch (err) {
            toast.error(err.message || 'Error al cargar la célula')
        } finally {
            setLoading(false)
        }
    }, [id, toast])

    useEffect(() => { reload() }, [reload])

    const startEdit = () => setEditing(true)
    const cancelEdit = () => {
        setEditing(false)
        setForm({
            nombre: celula.nombre || '',
            descripcion: celula.descripcion || '',
            perfil_md: celula.perfil_md || '',
            avatar_url: celula.avatar_url || '',
            cover_url: celula.cover_url || ''
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
        const ok = await modal.prompt({
            title: 'Agregar Miembro',
            fields: [
                { name: 'feder_id', label: 'Feder', type: 'select', options: allFeders.map(f => ({ value: f.id, label: `${f.apellido}, ${f.nombre}` })) },
                { name: 'rol_codigo', label: 'Rol', type: 'select', options: catalog.roles.map(r => ({ value: r.codigo, label: r.nombre })) },
                { name: 'desde', label: 'Desde', type: 'date', defaultValue: new Date().toISOString().split('T')[0] }
            ]
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
        const ok = await modal.prompt({
            title: 'Finalizar Asignación',
            message: '¿Cuándo finaliza esta participación?',
            fields: [
                { name: 'hasta', label: 'Fecha Fin', type: 'date', defaultValue: new Date().toISOString().split('T')[0] }
            ]
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
                                <span className={`badge state ${celula.estado_codigo}`}>{celula.estado_nombre}</span>
                                <span className="badge members"><FiUsers /> {celula.asignaciones?.filter(a => !a.hasta).length || 0} miembros</span>
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
                            {celula.asignaciones?.filter(a => !a.hasta).map(a => (
                                <div key={a.id} className="memberRow">
                                    <PersonTag
                                        p={{ id: a.feder_id, nombre: a.nombre, apellido: a.apellido, avatar_url: a.avatar_url }}
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
                            {celula.asignaciones?.filter(a => !a.hasta).length === 0 && <p className="empty">No hay miembros asignados.</p>}
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
