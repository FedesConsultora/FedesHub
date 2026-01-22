// frontend/src/pages/Admin/Comercial/AdminEECC.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../../api/comercial'
import { FiPlus, FiEdit2, FiTrash2, FiBarChart2 } from 'react-icons/fi'
import { useToast } from '../../../components/toast/ToastProvider'
import EeccStatsModal from './EeccStatsModal'
import EeccFormModal from './EeccFormModal'
import ConfirmModal from '../../../components/common/ConfirmModal'

export default function AdminEECC() {
    const [eeccs, setEeccs] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedStats, setSelectedStats] = useState(null)
    const [editingEecc, setEditingEecc] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const toast = useToast()

    const load = async () => {
        try {
            const res = await comercialApi.listEECC()
            setEeccs(res.data || [])
        } catch (e) {
            toast.error('Error al cargar EECC')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleSave = async (data) => {
        try {
            if (editingEecc) {
                await comercialApi.updateEECC(editingEecc.id, data)
                toast.success('Ejercicio actualizado')
            } else {
                await comercialApi.createEECC(data)
                toast.success('Ejercicio creado')
            }
            setEditingEecc(null)
            setShowCreate(false)
            load()
        } catch (e) {
            toast.error(e.response?.data?.error || 'Error al guardar')
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await comercialApi.deleteEECC(deletingId)
            toast.success('Ejercicio eliminado')
            setDeletingId(null)
            load()
        } catch (e) {
            toast.error('Error al eliminar')
        }
    }

    if (loading) return <div>Cargando...</div>

    return (
        <div className="AdminEECC">
            <div className="admin-list-header">
                <h3>Ejercicios Contables (EECC)</h3>
                <button className="btn-add" onClick={() => setShowCreate(true)}>
                    <FiPlus /> Definir Ejercicio
                </button>
            </div>

            <div className="admin-table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eeccs.map(eecc => (
                            <tr key={eecc.id}>
                                <td><strong>{eecc.nombre}</strong></td>
                                <td>{new Date(eecc.start_at).toLocaleDateString()}</td>
                                <td>{new Date(eecc.end_at).toLocaleDateString()}</td>
                                <td>
                                    {new Date() >= new Date(eecc.start_at) && new Date() <= new Date(eecc.end_at) ? (
                                        <span className="badge success">Activo</span>
                                    ) : (
                                        <span className="badge muted">Inactivo</span>
                                    )}
                                </td>
                                <td>
                                    <div className="actions">
                                        <button
                                            title="Ver Análisis"
                                            onClick={() => setSelectedStats(eecc)}
                                        >
                                            <FiBarChart2 />
                                        </button>
                                        <button title="Editar" onClick={() => setEditingEecc(eecc)}>
                                            <FiEdit2 />
                                        </button>
                                        <button className="delete" title="Eliminar" onClick={() => setDeletingId(eecc.id)}>
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedStats && (
                <EeccStatsModal
                    eecc={selectedStats}
                    onClose={() => setSelectedStats(null)}
                />
            )}

            {(showCreate || editingEecc) && (
                <EeccFormModal
                    eecc={editingEecc}
                    onClose={() => { setShowCreate(false); setEditingEecc(null); }}
                    onSave={handleSave}
                />
            )}

            {deletingId && (
                <ConfirmModal
                    title="¿Eliminar Ejercicio?"
                    message="¿Estás seguro de eliminar este ejercicio? Se perderán todas las metas y configuraciones mensuales asociadas de forma permanente."
                    confirmText="Eliminar Ejercicio"
                    onConfirm={handleDelete}
                    onClose={() => setDeletingId(null)}
                />
            )}
        </div>
    )
}
