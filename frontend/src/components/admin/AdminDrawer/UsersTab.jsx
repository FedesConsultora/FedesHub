import { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiPower } from 'react-icons/fi'
import * as A from '../../../api/auth'
import * as C from '../../../api/cargos'
import * as F from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider'

export default function UsersTab() {
    const toast = useToast()
    const modal = useModal()

    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [cargos, setCargos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Form states
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        email: '',
        password: '',
        roles: [],
        is_activo: true,
        // Feder creation
        createFeder: true,
        nombre: '',
        apellido: '',
        cargo_id: ''
    })

    const load = async () => {
        setLoading(true)
        try {
            const [usersRes, rolesRes, cargosRes] = await Promise.all([
                A.adminListUsers(search),
                A.adminListRoles(),
                C.listCargos({ is_activo: true, limit: 100 })
            ])
            setUsers(usersRes.data || [])
            setRoles(rolesRes.data || [])
            setCargos(cargosRes.data || [])
        } catch (e) {
            toast?.error('Error cargando datos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setForm({
            email: '',
            password: '',
            roles: [],
            is_activo: true,
            createFeder: true,
            nombre: '',
            apellido: '',
            cargo_id: ''
        })
        setEditing(null)
        setShowForm(false)
    }

    const toggleRole = (roleId) => {
        setForm(f => ({
            ...f,
            roles: f.roles.includes(roleId)
                ? f.roles.filter(id => id !== roleId)
                : [...f.roles, roleId]
        }))
    }

    const handleCreate = async () => {
        if (!form.email || !form.password) {
            toast?.warn('Email y contraseña son requeridos')
            return
        }
        if (!/@fedes\.ai$/i.test(form.email)) {
            toast?.warn('Solo emails @fedes.ai')
            return
        }
        if (form.password.length < 10) {
            toast?.warn('Contraseña mínimo 10 caracteres')
            return
        }

        try {
            // 1. Create user
            const { data } = await A.adminCreateUser({
                email: form.email.toLowerCase().trim(),
                password: form.password,
                roles: form.roles,
                is_activo: form.is_activo
            })

            // 2. Create Feder if requested
            if (form.createFeder && form.nombre && form.apellido) {
                const estados = await F.listEstadosFeder()
                const activoEstado = estados.data?.find(e => e.codigo === 'activo') || estados.data?.[0]

                const feder = await F.createFeder({
                    user_id: data.user.id,
                    nombre: form.nombre.trim(),
                    apellido: form.apellido.trim(),
                    estado_id: activoEstado?.id,
                    is_activo: true
                })

                // 3. Assign cargo if selected
                if (form.cargo_id && feder.data?.id) {
                    await C.assignToFeder(feder.data.id, {
                        cargo_id: parseInt(form.cargo_id),
                        es_principal: true,
                        desde: new Date().toISOString().split('T')[0]
                    })
                }

                toast?.success('Usuario y Feder creados correctamente')
            } else {
                toast?.success('Usuario creado')
            }

            resetForm()
            load()
        } catch (e) {
            toast?.error(e?.fh?.message || 'Error al crear usuario')
        }
    }

    const handleEdit = (user) => {
        setEditing(user)
        setForm({
            ...form,
            email: user.email,
            roles: (user.roles || []).map(r => r.id),
            is_activo: user.is_activo
        })
        setShowForm(true)
    }

    const handleUpdate = async () => {
        if (!editing) return

        try {
            // Update roles
            await A.adminPatchUserRoles(editing.id, form.roles)

            // Update active status if changed
            if (form.is_activo !== editing.is_activo) {
                await A.adminPatchUserActive(editing.id, form.is_activo)
            }

            toast?.success('Usuario actualizado')
            resetForm()
            load()
        } catch (e) {
            toast?.error(e?.fh?.message || 'Error al actualizar')
        }
    }

    const toggleActive = async (user) => {
        const toActive = !user.is_activo
        const ok = await modal.confirm({
            title: toActive ? 'Activar usuario' : 'Desactivar usuario',
            message: toActive
                ? `¿Activar "${user.email}"?`
                : `¿Desactivar "${user.email}"? No podrá acceder al sistema.`,
            tone: toActive ? 'success' : 'danger',
            okText: toActive ? 'Activar' : 'Desactivar'
        })
        if (!ok) return

        try {
            await A.adminPatchUserActive(user.id, toActive)
            toast?.success(toActive ? 'Usuario activado' : 'Usuario desactivado')
            load()
        } catch (e) {
            toast?.error('Error al cambiar estado')
        }
    }

    return (
        <div className="tabContent">
            <div className="toolbar">
                <input
                    className="searchInput"
                    type="text"
                    placeholder="Buscar por email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button className="btnPrimary" onClick={() => { resetForm(); setShowForm(true) }}>
                    <FiPlus /> Nuevo Usuario
                </button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="userForm">
                    <h3>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>

                    <div className="formGrid">
                        {!editing && (
                            <>
                                <div className="formRow">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        placeholder="usuario@fedes.ai"
                                        value={form.email}
                                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                                <div className="formRow">
                                    <label>Contraseña</label>
                                    <input
                                        type="password"
                                        placeholder="Mínimo 10 caracteres"
                                        value={form.password}
                                        onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}

                        <div className="formRow">
                            <label>Estado</label>
                            <select
                                value={String(form.is_activo)}
                                onChange={(e) => setForm(f => ({ ...f, is_activo: e.target.value === 'true' }))}
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    {/* Roles */}
                    <div className="rolesGroup">
                        <div className="rolesLabel">Roles</div>
                        <div className="rolesChips">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    type="button"
                                    className={`chip ${form.roles.includes(role.id) ? 'active' : ''}`}
                                    onClick={() => toggleRole(role.id)}
                                    title={role.descripcion}
                                >
                                    {role.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feder creation (only for new users) */}
                    {!editing && (
                        <>
                            <div className="rolesGroup">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={form.createFeder}
                                        onChange={(e) => setForm(f => ({ ...f, createFeder: e.target.checked }))}
                                    />
                                    <span style={{ fontSize: 13 }}>Crear Feder asociado</span>
                                </label>
                            </div>

                            {form.createFeder && (
                                <div className="formGrid" style={{ marginTop: 12 }}>
                                    <div className="formRow">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre"
                                            value={form.nombre}
                                            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                                        />
                                    </div>
                                    <div className="formRow">
                                        <label>Apellido</label>
                                        <input
                                            type="text"
                                            placeholder="Apellido"
                                            value={form.apellido}
                                            onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))}
                                        />
                                    </div>
                                    <div className="formRow">
                                        <label>Cargo</label>
                                        <select
                                            value={form.cargo_id}
                                            onChange={(e) => setForm(f => ({ ...f, cargo_id: e.target.value }))}
                                        >
                                            <option value="">Sin cargo</option>
                                            {cargos.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="formActions">
                        <button type="button" className="cancel" onClick={resetForm}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="submit"
                            onClick={editing ? handleUpdate : handleCreate}
                        >
                            {editing ? 'Guardar cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            {loading ? (
                <div className="loading">Cargando...</div>
            ) : users.length === 0 ? (
                <div className="empty">No hay usuarios</div>
            ) : (
                <table className="dataTable">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Estado</th>
                            <th>Roles</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`badge ${user.is_activo ? 'ok' : 'off'}`}>
                                        {user.is_activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    {(user.roles || []).map(r => (
                                        <span key={r.id} className="badge role">{r.nombre}</span>
                                    ))}
                                </td>
                                <td>
                                    <div className="actions">
                                        <button onClick={() => handleEdit(user)} title="Editar">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(user)}
                                            className={user.is_activo ? 'danger' : ''}
                                            title={user.is_activo ? 'Desactivar' : 'Activar'}
                                        >
                                            <FiPower size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
