import { useState, useEffect, useMemo } from 'react'
import { FiX, FiCheck, FiSearch, FiUsers } from 'react-icons/fi'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import * as A from '../../../api/auth'
import './RoleMembersModal.scss'

export default function RoleMembersModal({ roleId, roleName, initialMembers = [], onSave, onCancel }) {
    const [loading, setLoading] = useState(true)
    const [allUsers, setAllUsers] = useState([])
    const [selectedUserIds, setSelectedUserIds] = useState(new Set(initialMembers.map(u => u.id)))
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data } = await A.adminListUsers()
            setAllUsers(data || [])
        } catch (e) {
            console.error('Error fetching users', e)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u =>
            u?.email && u.email.toLowerCase().includes(search.toLowerCase())
        )
    }, [allUsers, search])

    const toggleUser = (userId) => {
        const next = new Set(selectedUserIds)
        if (next.has(userId)) next.delete(userId)
        else next.add(userId)
        setSelectedUserIds(next)
    }

    const handleSave = () => {
        onSave(Array.from(selectedUserIds))
    }

    return (
        <div className="roleMembersModal">
            <div className="searchBar">
                <FiSearch />
                <input
                    type="text"
                    placeholder="Buscar usuario por email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="membersSummary">
                <FiUsers />
                <span>{selectedUserIds.size} seleccionados de {allUsers.length} totales para <strong>{roleName}</strong></span>
            </div>

            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={60} />
                </div>
            ) : (
                <div className="userList">
                    {filteredUsers.length === 0 ? (
                        <div className="noResults">No se encontraron usuarios</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`userItem ${selectedUserIds.has(user.id) ? 'selected' : ''}`}
                                onClick={() => toggleUser(user.id)}
                            >
                                <div className="chk">
                                    {selectedUserIds.has(user.id) && <FiCheck />}
                                </div>
                                <div className="userInfo">
                                    <div className="email">{user.email}</div>
                                    <div className="otherRoles">
                                        {(user.roles || [])
                                            .filter(r => r.id !== roleId)
                                            .map(r => r.nombre)
                                            .join(', ')}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <footer className="modalFooter">
                <button className="btnCancel" onClick={onCancel}>Cancelar</button>
                <button className="btnSave" onClick={handleSave} disabled={loading}>Guardar Miembros</button>
            </footer>
        </div>
    )
}
