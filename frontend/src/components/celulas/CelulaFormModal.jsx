import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import FormRow from '../ui/FormRow'
import { celulasApi } from '../../api/celulas'
import { federsApi } from '../../api/feders'
import { useToast } from '../toast/ToastProvider'
import { FiUser, FiX, FiPlus, FiTrash2, FiBriefcase } from 'react-icons/fi'
import { clientesApi } from '../../api/clientes'
import Avatar from '../Avatar'

export default function CelulaFormModal({ open, onClose, celula = null, onSaved }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [catalog, setCatalog] = useState({ estados: [], roles: [] })
    const [allFeders, setAllFeders] = useState([])
    const [allClientes, setAllClientes] = useState([])
    const [asignaciones, setAsignaciones] = useState([]) // Local state for assignments
    const [newMember, setNewMember] = useState({ feder_id: '', rol_codigo: 'miembro' })

    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        estado_codigo: 'activa',
        cliente_ids: []
    })

    useEffect(() => {
        if (open) {
            loadData()
            if (celula) {
                setForm({
                    nombre: celula.nombre || '',
                    descripcion: celula.descripcion || '',
                    estado_codigo: celula.estado_codigo || 'activa',
                    cliente_ids: [] // We don't pre-load them here easily unless we fetch them
                })
                loadAsignaciones(celula.id)
            } else {
                setForm({
                    nombre: '',
                    descripcion: '',
                    estado_codigo: 'activa',
                    cliente_ids: []
                })
                setAsignaciones([])
            }
        }
    }, [open, celula])

    const loadData = async () => {
        try {
            const [cat, feders, cls] = await Promise.all([
                celulasApi.catalog(),
                federsApi.list({ limit: 200, is_activo: true }),
                clientesApi.list({ limit: 200, estado_id: 'all' })
            ])
            setCatalog(cat)
            setAllFeders(feders.rows || [])
            setAllClientes(cls.rows || [])
            if (cat.roles?.length > 0) {
                setNewMember(v => ({ ...v, rol_codigo: cat.roles[0].codigo }))
            }
        } catch (err) {
            console.error('Error loading data:', err)
        }
    }

    const loadAsignaciones = async (id) => {
        try {
            const data = await celulasApi.listAsignaciones(id)
            setAsignaciones(data.filter(a => !a.hasta) || [])
        } catch (err) {
            console.error('Error loading asignaciones:', err)
        }
    }

    const handleAddMember = async () => {
        if (!newMember.feder_id) return toast.warn('Seleccioná una persona')

        // Find person info to add to local list
        const feder = allFeders.find(f => Number(f.id) === Number(newMember.feder_id))
        const rol = catalog.roles.find(r => r.codigo === newMember.rol_codigo)

        const memberData = {
            feder_id: Number(newMember.feder_id),
            rol_codigo: newMember.rol_codigo,
            nombre: feder?.nombre,
            apellido: feder?.apellido,
            avatar_url: feder?.avatar_url,
            rol_nombre: rol?.nombre,
            desde: new Date().toISOString().split('T')[0]
        }

        if (celula) {
            // Existing cell: save to API immediately
            try {
                setLoading(true)
                await celulasApi.addAsignacion(celula.id, memberData)
                toast.success('Miembro agregado')
                loadAsignaciones(celula.id)
                setNewMember({ ...newMember, feder_id: '' })
            } catch (err) {
                toast.error(err.fh?.message || 'Error al agregar miembro')
            } finally {
                setLoading(false)
            }
        } else {
            // New cell: only local state
            setAsignaciones(prev => [...prev, { ...memberData, id: `temp-${Date.now()}` }])
            setNewMember({ ...newMember, feder_id: '' })
            toast.info('Miembro agregado a la lista')
        }
    }

    const handleRemoveMember = async (asign) => {
        if (celula && !String(asign.id).startsWith('temp-')) {
            // Existing cell & saved assignment: call API
            try {
                setLoading(true)
                await celulasApi.closeAsignacion(asign.id, {
                    hasta: new Date().toISOString().split('T')[0]
                })
                toast.success('Miembro removido')
                loadAsignaciones(celula.id)
            } catch (err) {
                toast.error(err.fh?.message || 'Error al remover')
            } finally {
                setLoading(false)
            }
        } else {
            // Local state only
            setAsignaciones(prev => prev.filter(a => a.id !== asign.id))
        }
    }

    const handleSave = async () => {
        if (!form.nombre.trim()) return toast.warn('El nombre es obligatorio')

        try {
            setLoading(true)
            if (celula) {
                await celulasApi.update(celula.id, form)
                toast.success('Célula actualizada')
            } else {
                // Create cell
                const created = await celulasApi.create(form)
                const newId = created.id || created.celula?.id // Depende de la respuesta del API

                // Assign members sequentially to avoid DB race conditions
                if (asignaciones.length > 0) {
                    for (const a of asignaciones) {
                        if (!a.feder_id || !a.rol_codigo) continue;
                        await celulasApi.addAsignacion(newId, {
                            feder_id: a.feder_id,
                            rol_codigo: a.rol_codigo,
                            desde: a.desde
                        })
                    }
                }
                toast.success('Célula y miembros creados')
            }
            onSaved()
            onClose()
        } catch (err) {
            toast.error(err.fh?.message || 'Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={celula ? 'Editar Célula' : 'Nueva Célula'}
            footer={
                <>
                    <button onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </>
            }
        >
            <div className="celulas-modal">
                <FormRow label="Nombre">
                    <input
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        placeholder="Nombre de la célula"
                        autoFocus
                    />
                </FormRow>
                <FormRow label="Estado">
                    <select
                        value={form.estado_codigo}
                        onChange={e => setForm({ ...form, estado_codigo: e.target.value })}
                    >
                        {catalog.estados.map(est => (
                            <option key={est.codigo} value={est.codigo}>{est.nombre}</option>
                        ))}
                    </select>
                </FormRow>
                <FormRow label="Descripción">
                    <textarea
                        rows={2}
                        value={form.descripcion}
                        onChange={e => setForm({ ...form, descripcion: e.target.value })}
                        placeholder="Descripción opcional"
                    />
                </FormRow>

                <div className="members-section">
                    <header className="section-head">
                        <FiUser />
                        <h4>Miembros</h4>
                    </header>

                    <div className="add-member-form">
                        <select
                            className="feder-select"
                            value={newMember.feder_id}
                            onChange={e => setNewMember({ ...newMember, feder_id: e.target.value })}
                        >
                            <option value="">Seleccionar Persona...</option>
                            {allFeders
                                .filter(f => !asignaciones.some(a => Number(a.feder_id) === Number(f.id)))
                                .map(f => (
                                    <option key={f.id} value={f.id}>{f.apellido}, {f.nombre}</option>
                                ))
                            }
                        </select>
                        <select
                            className="rol-select"
                            value={newMember.rol_codigo}
                            onChange={e => setNewMember({ ...newMember, rol_codigo: e.target.value })}
                        >
                            {catalog.roles.map(r => (
                                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
                            ))}
                        </select>
                        <button className="add-btn" onClick={handleAddMember} disabled={loading || !newMember.feder_id}>
                            <FiPlus />
                        </button>
                    </div>

                    <div className="members-list-mini">
                        {asignaciones.map(a => (
                            <div key={a.id || a.feder_id} className="member-item">
                                <Avatar
                                    src={a.feder_avatar_url || a.avatar_url}
                                    name={`${a.feder_nombre || a.nombre} ${a.feder_apellido || a.apellido}`}
                                    size={24}
                                />
                                <div className="info">
                                    <span className="name">
                                        {a.feder_apellido || a.apellido}, {a.feder_nombre || a.nombre}
                                    </span>
                                    <span className="role">{a.rol_nombre}</span>
                                </div>
                                <button className="del-btn" onClick={() => handleRemoveMember(a)} disabled={loading}>
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {asignaciones.length === 0 && (
                            <div className="empty-mini">Sin miembros asignados</div>
                        )}
                    </div>
                </div>

                <div className="members-section clients-section">
                    <header className="section-head">
                        <FiBriefcase />
                        <h4>Clientes</h4>
                    </header>

                    <div className="add-member-form">
                        <select
                            className="feder-select"
                            value=""
                            onChange={e => {
                                if (e.target.value) {
                                    setForm(f => ({
                                        ...f,
                                        cliente_ids: [...new Set([...f.cliente_ids, Number(e.target.value)])]
                                    }))
                                }
                            }}
                        >
                            <option value="">Asociar Cliente...</option>
                            {allClientes
                                .filter(c => !form.cliente_ids.includes(c.id))
                                .map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))
                            }
                        </select>
                    </div>

                    <div className="members-list-mini">
                        {form.cliente_ids.map(cid => {
                            const c = allClientes.find(it => it.id === cid)
                            if (!c) return null
                            return (
                                <div key={cid} className="member-item">
                                    <div className="info">
                                        <span className="name">{c.nombre}</span>
                                        {c.celula_nombre && <span className="role">De: {c.celula_nombre}</span>}
                                    </div>
                                    <button
                                        className="del-btn"
                                        onClick={() => setForm(f => ({
                                            ...f,
                                            cliente_ids: f.cliente_ids.filter(id => id !== cid)
                                        }))}
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            )
                        })}
                        {form.cliente_ids.length === 0 && (
                            <div className="empty-mini">Sin clientes asociados</div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
