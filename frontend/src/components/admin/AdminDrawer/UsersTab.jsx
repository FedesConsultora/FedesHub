import { useEffect, useState, useRef } from 'react'
import { FiPlus, FiEdit2, FiPower, FiEye, FiEyeOff } from 'react-icons/fi'
import * as A from '../../../api/auth'
import * as C from '../../../api/cargos'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider'
import GlobalLoader from '../../loader/GlobalLoader.jsx'

export default function UsersTab() {
    const toast = useToast()
    const modal = useModal()
    const formRef = useRef(null)

    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [cargos, setCargos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Form states
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [editingFeder, setEditingFeder] = useState(null)
    const [form, setForm] = useState({
        email: '',
        password: '',
        roles: [],
        is_activo: true,
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
            // cargos API returns { rows: [...] } or array directly
            const cargosData = cargosRes.data
            setCargos(Array.isArray(cargosData) ? cargosData : (cargosData?.rows || []))
        } catch (e) {
            console.error('Error loading admin data:', e)
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
        setEditingFeder(null)
        setShowForm(false)
        setShowPassword(false)
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
        if (!form.nombre || !form.apellido) {
            toast?.warn('Nombre y apellido son requeridos')
            return
        }
        if (!form.roles || form.roles.length === 0) {
            toast?.warn('Debes seleccionar al menos un rol')
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

            // 2. Create Feder (always)
            const catalog = await federsApi.catalog()
            const activoEstado = catalog.estados?.find(e => e.codigo === 'activo') || catalog.estados?.[0]

            const feder = await federsApi.create({
                user_id: data.user.id,
                nombre: form.nombre.trim(),
                apellido: form.apellido.trim(),
                estado_id: activoEstado?.id,
                is_activo: true
            })

            // 3. Assign cargo if selected
            if (form.cargo_id && feder?.id) {
                await C.assignToFeder(feder.id, {
                    cargo_id: parseInt(form.cargo_id),
                    es_principal: true,
                    desde: new Date().toISOString().split('T')[0]
                })
            }

            toast?.success('Usuario y Feder creados correctamente')
            resetForm()
            load()
        } catch (e) {
            console.error('Error creating user:', e)
            console.error('Response data:', e?.response?.data)
            const msg = e?.response?.data?.error || e?.response?.data?.message || e?.fh?.message || e?.message || 'Error al crear usuario'
            toast?.error(msg)
        }
    }

    const handleEdit = async (user) => {
        console.log('=== EDITING USER ===', user)
        setEditing(user)
        setEditingFeder(null)

        // Load feder for this user
        try {
            const feder = await federsApi.getByUserId(user.id)
            setEditingFeder(feder)

            // Find cargo ID by matching the cargo_principal name
            let cargoId = ''
            if (feder?.cargo_principal) {
                const matchingCargo = cargos.find(c => c.nombre === feder.cargo_principal)
                cargoId = matchingCargo?.id || ''
            }

            setForm({
                ...form,
                email: user.email,
                roles: (user.roles || []).map(r => r.id),
                is_activo: user.is_activo,
                cargo_id: cargoId ? String(cargoId) : ''
            })
        } catch (e) {
            console.error('❌ Error loading feder:', e)
            // User might not have a feder
            setForm({
                ...form,
                email: user.email,
                roles: (user.roles || []).map(r => r.id),
                is_activo: user.is_activo,
                cargo_id: ''
            })
        }

        setShowForm(true)
        // Scroll to form after render
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
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

            // Update cargo if feder exists and cargo changed
            if (editingFeder?.id && form.cargo_id) {
                const currentCargo = editingFeder?.cargos?.find(c => c.es_principal) || editingFeder?.cargos?.[0]
                const currentCargoId = currentCargo?.cargo_id ? String(currentCargo.cargo_id) : ''

                if (form.cargo_id !== currentCargoId) {
                    await C.assignToFeder(editingFeder.id, {
                        cargo_id: parseInt(form.cargo_id),
                        es_principal: true,
                        desde: new Date().toISOString().split('T')[0]
                    })
                }
            }

            toast?.success('Usuario actualizado')
            resetForm()
            load()
        } catch (e) {
            console.error('Error updating user:', e)
            toast?.error(e?.response?.data?.error || e?.fh?.message || 'Error al actualizar')
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
                <div className="userForm" ref={formRef}>
                    <h3>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>

                    {/* Show user info when editing */}
                    {editing && (
                        <div style={{
                            background: 'rgba(77, 208, 225, 0.1)',
                            border: '1px solid rgba(77, 208, 225, 0.3)',
                            borderRadius: 8,
                            padding: '12px 16px',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'rgba(77, 208, 225, 0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 600, color: '#4dd0e1'
                            }}>
                                {editing.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{editing.email}</div>
                                <div style={{ fontSize: 12, color: 'var(--fh-muted)' }}>
                                    ID: {editing.id}
                                    {(editing.created_at || editing.createdAt) &&
                                        ` • Creado: ${new Date(editing.created_at || editing.createdAt).toLocaleDateString('es-AR')}`
                                    }
                                </div>
                            </div>
                        </div>
                    )}

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
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Mínimo 10 caracteres"
                                            value={form.password}
                                            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                            style={{ paddingRight: 40 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            style={{
                                                position: 'absolute',
                                                right: 10,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--fh-muted)',
                                                cursor: 'pointer',
                                                padding: 4,
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={showPassword ? 'Ocultar' : 'Mostrar'}
                                        >
                                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                        </button>
                                    </div>
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

                        {/* Cargo field for editing users with feder */}
                        {editing && editingFeder && (
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
                        )}
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

                    {/* Feder info (only for new users - always created) */}
                    {!editing && (
                        <>
                            <div className="rolesGroup">
                                <div className="rolesLabel">Datos del Feder</div>
                            </div>

                            <div className="formGrid" style={{ marginTop: 8 }}>
                                <div className="formRow">
                                    <label>Nombre *</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre"
                                        value={form.nombre}
                                        onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                                    />
                                </div>
                                <div className="formRow">
                                    <label>Apellido *</label>
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
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={80} />
                </div>
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
