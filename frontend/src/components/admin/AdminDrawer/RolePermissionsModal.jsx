import { useState, useEffect, useMemo } from 'react'
import { FiX, FiCheck, FiSearch } from 'react-icons/fi'
import GlobalLoader from '../../loader/GlobalLoader.jsx'
import * as A from '../../../api/auth'
import './RolePermissionsModal.scss'

export default function RolePermissionsModal({ roleId, initialPermissions = [], onSave, onCancel }) {
    const [loading, setLoading] = useState(true)
    const [catalog, setCatalog] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set(initialPermissions.map(p => p.id)))
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchCatalog()
    }, [])

    const fetchCatalog = async () => {
        try {
            const { data } = await A.adminListPermissions()
            setCatalog(data || [])
        } catch (e) {
            console.error('Error fetching permission catalog', e)
        } finally {
            setLoading(false)
        }
    }

    const grouped = useMemo(() => {
        const groups = {}
        const filtered = catalog.filter(p =>
            p.modulo.toLowerCase().includes(search.toLowerCase()) ||
            p.accion.toLowerCase().includes(search.toLowerCase()) ||
            p.nombre?.toLowerCase().includes(search.toLowerCase())
        )
        for (const p of filtered) {
            if (!groups[p.modulo]) groups[p.modulo] = []
            groups[p.modulo].push(p)
        }
        return groups
    }, [catalog, search])

    const toggle = (id) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleModule = (moduleName, items) => {
        const next = new Set(selectedIds)
        const allInModuleSelected = items.every(item => next.has(item.id))

        if (allInModuleSelected) {
            items.forEach(item => next.delete(item.id))
        } else {
            items.forEach(item => next.add(item.id))
        }
        setSelectedIds(next)
    }

    const handleSave = () => {
        onSave(Array.from(selectedIds))
    }

    return (
        <div className="rolePermissionsModal">
            <div className="searchBar">
                <FiSearch />
                <input
                    type="text"
                    placeholder="Buscar permiso..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={60} />
                </div>
            ) : (
                <div className="catalogList">
                    {Object.entries(grouped).map(([mod, items]) => {
                        const itemsInModuleSelected = items.filter(item => selectedIds.has(item.id)).length
                        const allSelected = itemsInModuleSelected === items.length
                        const someSelected = itemsInModuleSelected > 0 && !allSelected

                        return (
                            <div key={mod} className="moduleGroup">
                                <header onClick={() => toggleModule(mod, items)}>
                                    <div className={`checkbox ${allSelected ? 'checked' : someSelected ? 'partial' : ''}`}>
                                        {allSelected && <FiCheck />}
                                        {someSelected && <div className="dot" />}
                                    </div>
                                    <span className="modName">{mod}</span>
                                    <span className="count">({itemsInModuleSelected}/{items.length})</span>
                                </header>
                                <div className="actionsList">
                                    {items.map(p => (
                                        <div
                                            key={p.id}
                                            className={`actionItem ${selectedIds.has(p.id) ? 'selected' : ''}`}
                                            onClick={() => toggle(p.id)}
                                        >
                                            <div className="chk">
                                                {selectedIds.has(p.id) && <FiCheck />}
                                            </div>
                                            <div className="text">
                                                <div className="actName">{p.accion}</div>
                                                {p.nombre && <div className="actDesc">{p.nombre}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <footer className="modalFooter">
                <button className="btnCancel" onClick={onCancel}>Cancelar</button>
                <button className="btnSave" onClick={handleSave} disabled={loading}>Guardar Cambios</button>
            </footer>
        </div>
    )
}
