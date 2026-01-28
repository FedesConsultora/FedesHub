// frontend/src/pages/Admin/Comercial/AdminDescuentos.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../../api/comercial'
import { FiPlus, FiEdit2, FiTrash2, FiPercent, FiDollarSign } from 'react-icons/fi'
import { useToast } from '../../../components/toast/ToastProvider'
import DiscountFormModal from './DiscountFormModal'
import ConfirmModal from '../../../components/common/ConfirmModal'

export default function AdminDescuentos() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingDiscount, setEditingDiscount] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const toast = useToast()

    const load = async () => {
        try {
            const res = await comercialApi.listDescuentos()
            setList(res.data || [])
        } catch (e) {
            toast.error('Error al cargar descuentos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleSave = async (data) => {
        try {
            if (editingDiscount) {
                await comercialApi.updateDescuento(editingDiscount.id, data)
                toast.success('Descuento actualizado')
            } else {
                await comercialApi.createDescuento(data)
                toast.success('Descuento creado')
            }
            setEditingDiscount(null)
            setShowCreate(false)
            load()
        } catch (e) {
            toast.error(e.response?.data?.error || 'Error al guardar')
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await comercialApi.deleteDescuento(deletingId)
            toast.success('Descuento eliminado')
            setDeletingId(null)
            load()
        } catch (e) {
            toast.error('Error al eliminar')
        }
    }

    if (loading) return <div>Cargando...</div>

    return (
        <div className="AdminDescuentos">
            <div className="admin-list-header">
                <h3>Tipos de Descuento</h3>
                <button className="btn-add" onClick={() => setShowCreate(true)}>
                    <FiPlus /> Crear Descuento
                </button>
            </div>

            <div className="admin-table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map(d => (
                            <tr key={d.id}>
                                <td><strong>{d.nombre}</strong></td>
                                <td>
                                    {d.tipo === 'percentage' ? (
                                        <><FiPercent style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Porcentaje</>
                                    ) : (
                                        <><FiDollarSign style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Monto Fijo</>
                                    )}
                                </td>
                                <td>
                                    {d.tipo === 'percentage' ? `${parseFloat(d.valor)}%` : `$${parseFloat(d.valor).toLocaleString()}`}
                                </td>
                                <td>
                                    <div className="actions">
                                        <button title="Editar" onClick={() => setEditingDiscount(d)}><FiEdit2 /></button>
                                        <button className="delete" title="Eliminar" onClick={() => setDeletingId(d.id)}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(showCreate || editingDiscount) && (
                <DiscountFormModal
                    discount={editingDiscount}
                    onClose={() => { setShowCreate(false); setEditingDiscount(null); }}
                    onSave={handleSave}
                />
            )}

            {deletingId && (
                <ConfirmModal
                    title="¿Eliminar Descuento?"
                    message="¿Estás seguro de eliminar este tipo de descuento? Esta acción no se puede deshacer."
                    confirmText="Eliminar Descuento"
                    onConfirm={handleDelete}
                    onClose={() => setDeletingId(null)}
                />
            )}
        </div>
    )
}
