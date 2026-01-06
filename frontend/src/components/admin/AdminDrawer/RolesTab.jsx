import React, { useEffect, useState } from 'react'
import * as A from '../../../api/auth'
import { useToast } from '../../toast/ToastProvider'
import GlobalLoader from '../../loader/GlobalLoader.jsx'

export default function RolesTab() {
    const toast = useToast()
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)
    const [permissions, setPermissions] = useState({})

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

    const loadPermissions = async (roleId) => {
        if (permissions[roleId]) return
        try {
            const { data } = await A.adminGetRole(roleId)
            setPermissions(p => ({ ...p, [roleId]: data?.permisos || [] }))
        } catch (e) {
            toast?.error('Error cargando permisos')
        }
    }

    const toggleExpand = (roleId) => {
        if (expanded === roleId) {
            setExpanded(null)
        } else {
            setExpanded(roleId)
            loadPermissions(roleId)
        }
    }

    const groupPermissions = (perms) => {
        const groups = {}
        for (const p of perms) {
            const mod = p.modulo || 'otro'
            if (!groups[mod]) groups[mod] = []
            groups[mod].push(p.accion)
        }
        return groups
    }

    return (
        <div className="tabContent">
            <div className="toolbar">
                <div style={{ color: 'var(--fh-muted)', fontSize: 13 }}>
                    Los roles del sistema (NivelA, NivelB, NivelC) no se pueden editar.
                </div>
            </div>

            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={80} />
                </div>
            ) : roles.length === 0 ? (
                <div className="empty">No hay roles</div>
            ) : (
                <table className="dataTable">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Tipo</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(role => (
                            <React.Fragment key={role.id}>
                                <tr>
                                    <td><strong>{role.nombre}</strong></td>
                                    <td style={{ color: 'var(--fh-muted)' }}>{role.descripcion || '—'}</td>
                                    <td>
                                        <span className="badge role">
                                            {role.nombre.startsWith('Nivel') ? 'Sistema' : 'Custom'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button onClick={() => toggleExpand(role.id)}>
                                                {expanded === role.id ? 'Ocultar' : 'Ver permisos'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expanded === role.id && (
                                    <tr>
                                        <td colSpan={4} style={{ background: 'rgba(255,255,255,.02)', padding: '16px 20px' }}>
                                            {permissions[role.id] ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                                    {Object.entries(groupPermissions(permissions[role.id])).map(([mod, acts]) => (
                                                        <div key={mod} style={{
                                                            background: 'rgba(255,255,255,.04)',
                                                            padding: '10px 14px',
                                                            borderRadius: 8,
                                                            minWidth: 140
                                                        }}>
                                                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', color: 'var(--fh-accent)' }}>
                                                                {mod}
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                {acts.map(a => (
                                                                    <span key={a} style={{
                                                                        fontSize: 11,
                                                                        background: 'rgba(255,255,255,.08)',
                                                                        padding: '2px 8px',
                                                                        borderRadius: 10,
                                                                        color: 'var(--fh-text)'
                                                                    }}>
                                                                        {a}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ position: 'relative', minHeight: 60 }}>
                                                    <GlobalLoader size={40} />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
