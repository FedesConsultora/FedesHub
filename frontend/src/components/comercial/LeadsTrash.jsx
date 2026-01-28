import React, { useEffect, useState } from 'react'
import { FiRefreshCw, FiTrash2, FiClock, FiUser, FiBriefcase } from 'react-icons/fi'
import { comercialApi } from '../../api/comercial'
import { useToast } from '../../components/toast/ToastProvider'
import './LeadsTrash.scss'

export default function LeadsTrash({ onRestore }) {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    const loadTrash = async () => {
        try {
            setLoading(true)
            const res = await comercialApi.listTrash()
            setLeads(res.data || [])
        } catch (err) {
            toast.error('Error al cargar papelera')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTrash()
    }, [])

    const handleRestore = async (id) => {
        try {
            await comercialApi.restoreLead(id)
            toast.success('Lead restaurado')
            setLeads(prev => prev.filter(l => l.id !== id))
            onRestore?.()
        } catch (err) {
            toast.error('Error al restaurar lead')
        }
    }

    if (loading) return <div className="trash-loading">Cargando papelera...</div>

    return (
        <div className="LeadsTrash">
            <header className="trash-header">
                <h2><FiTrash2 /> Papelera de Leads</h2>
                <p>Aquí se listan los leads eliminados. Se pueden restaurar o se eliminarán automáticamente tras 60 días.</p>
            </header>

            {leads.length === 0 ? (
                <div className="empty-trash-state">
                    <FiTrash2 />
                    <p>La papelera está vacía</p>
                </div>
            ) : (
                <div className="trash-list mt24">
                    {leads.map(l => (
                        <div key={l.id} className="trash-item card">
                            <div className="lead-info">
                                <div className="top">
                                    <span className="id">#{l.id}</span>
                                    <span className="status" style={{ background: l.status?.color }}>{l.status?.nombre}</span>
                                </div>
                                <h3 className="empresa">{l.empresa || 'Sin empresa'}</h3>
                                <div className="meta">
                                    <span><FiUser /> {l.nombre} {l.apellido}</span>
                                    <span><FiBriefcase /> {l.etapa?.nombre || 'Sin etapa'}</span>
                                </div>
                            </div>
                            <div className="actions">
                                <button className="btn-restore" onClick={() => handleRestore(l.id)}>
                                    <FiRefreshCw /> Restaurar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
