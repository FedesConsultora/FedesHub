import React, { useEffect, useState } from 'react'
import * as A from '../../../api/auth'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider.jsx'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import RolePermissionsModal from './RolePermissionsModal.jsx'
import RoleMembersModal from './RoleMembersModal.jsx'
import { FiEdit2, FiShield, FiPlus, FiTrash2, FiEye, FiSettings, FiUsers } from 'react-icons/fi'

export default function RolesTab() {
    const toast = useToast()
    const modal = useModal()
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await A.adminListRoles()
            setRoles(data || [])
        } catch (e) {
            toast?.error('Error cargando roles')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const openPermissions = (role) => {
        modal.open({
            title: `Permisos: ${role.nombre}`,
            width: 800,
            render: (close) => (
                <RolePermissionsModal
                    roleId={role.id}
                    initialPermissions={role.permisos || []}
                    onSave={async (newIds) => {
                        try {
                            await A.adminSetRolePermissions(role.id, newIds)
                            toast?.success('Permisos actualizados')
                            load()
                            close()
                        } catch (e) {
                            toast?.error(e.response?.data?.error || 'Error al guardar permisos')
                        }
                    }}
                    onCancel={() => close()}
                />
            )
        })
    }

    const openMembers = (role) => {
        modal.open({
            title: `Miembros: ${role.nombre}`,
            width: 500,
            render: (close) => (
                <RoleMembersModal
                    roleId={role.id}
                    roleName={role.nombre}
                    initialMembers={role.members || []}
                    onSave={async (userIds) => {
                        try {
                            await A.adminSetRoleMembers(role.id, userIds)
                            toast?.success('Miembros actualizados')
                            load()
                            close()
                        } catch (e) {
                            toast?.error(e.response?.data?.error || 'Error al guardar miembros')
                        }
                    }}
                    onCancel={() => close()}
                />
            )
        })
    }

    const openEditRole = (role = null) => {
        modal.open({
            title: role ? 'Editar Rol' : 'Nuevo Rol',
            width: 400,
            render: (close) => (
                <RoleForm
                    role={role}
                    onSave={async (data) => {
                        try {
                            if (role) await A.adminUpdateRole(role.id, data)
                            else await A.adminCreateRole(data)
                            toast?.success(role ? 'Rol actualizado' : 'Rol creado')
                            load()
                            close()
                        } catch (e) {
                            toast?.error(e.response?.data?.error || 'Error al guardar rol')
                        }
                    }}
                    onCancel={() => close()}
                />
            )
        })
    }

    const handleDelete = async (role) => {
        if (!window.confirm(`¿Estás seguro de eliminar el rol "${role.nombre}"?`)) return
        try {
            await A.adminDeleteRole(role.id)
            toast?.success('Rol eliminado')
            load()
        } catch (e) {
            toast?.error(e.response?.data?.error || 'Error al eliminar rol')
        }
    }

    const fetchAndOpenPermissions = async (role) => {
        try {
            const { data } = await A.adminGetRole(role.id)
            openPermissions(data)
        } catch (e) {
            toast?.error('Error al cargar detalle del rol')
        }
    }

    const fetchAndOpenMembers = async (role) => {
        try {
            const { data } = await A.adminGetRole(role.id)
            openMembers(data)
        } catch (e) {
            toast?.error('Error al cargar miembros del rol')
        }
    }

    return (
        <div className="tabContent rolesTab">
            <header className="tabInnerHead" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3>Gestión de Roles y Permisos</h3>
                    <p style={{ color: 'var(--fh-muted)', fontSize: '0.9rem', margin: 0 }}>Define qué puede hacer cada perfil en el sistema.</p>
                </div>
                <button className="fh-btn primary" onClick={() => openEditRole()}>
                    <FiPlus /> Nuevo Rol
                </button>
            </header>

            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={80} />
                </div>
            ) : roles.length === 0 ? (
                <div className="empty">No hay roles</div>
            ) : (
                <div className="rolesGrid">
                    {roles.map(role => {
                        const isSystem = role.nombre.startsWith('Nivel')
                        return (
                            <div key={role.id} className={`roleCard ${isSystem ? 'system' : ''}`}>
                                <div className="roleInfo">
                                    <div className="top">
                                        <FiShield className="icon" />
                                        <div className="labels">
                                            <span className="name">{role.nombre}</span>
                                            {isSystem && <span className="badge system">Sistema</span>}
                                        </div>
                                    </div>
                                    <p className="desc">{role.descripcion || 'Sin descripción.'}</p>
                                </div>
                                <div className="roleActions">
                                    <button
                                        className="btnAction"
                                        onClick={() => fetchAndOpenPermissions(role)}
                                        title="Gestionar Permisos"
                                    >
                                        <FiEdit2 /> Permisos
                                    </button>
                                    <button
                                        className="btnAction"
                                        onClick={() => fetchAndOpenMembers(role)}
                                        title="Gestionar Usuarios"
                                    >
                                        <FiUsers /> Miembros
                                    </button>
                                    {!isSystem && (
                                        <>
                                            <button
                                                className="btnAction"
                                                onClick={() => openEditRole(role)}
                                                title="Editar nombre/desc"
                                            >
                                                <FiSettings />
                                            </button>
                                            <button
                                                className="btnAction danger"
                                                onClick={() => handleDelete(role)}
                                                title="Eliminar"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </>
                                    )}
                                    {isSystem && (
                                        <button className="btnAction ghost" disabled title="Roles de sistema no editables">
                                            <FiEye /> Solo lectura
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function RoleForm({ role, onSave, onCancel }) {
    const [form, setForm] = useState({
        nombre: role?.nombre || '',
        descripcion: role?.descripcion || ''
    })

    return (
        <div className="dlg-form">
            <div className="formRow">
                <label>Nombre del Rol</label>
                <input
                    type="text"
                    className="fh-input"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Auditor RRHH"
                    required
                />
            </div>
            <div className="formRow">
                <label>Descripción</label>
                <textarea
                    className="fh-input"
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Para qué sirve este rol..."
                />
            </div>
            <div className="actions">
                <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
                <button className="fh-btn primary" onClick={() => onSave(form)} disabled={!form.nombre}>
                    {role ? 'Actualizar' : 'Crear'}
                </button>
            </div>
        </div>
    )
}

