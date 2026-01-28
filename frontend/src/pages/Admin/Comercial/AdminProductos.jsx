// frontend/src/pages/Admin/Comercial/AdminProductos.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../../api/comercial'
import { FiPlus, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi'
import { useToast } from '../../../components/toast/ToastProvider'
import ProductFormModal from './ProductFormModal'
import ConfirmModal from '../../../components/common/ConfirmModal'

export default function AdminProductos() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingProduct, setEditingProduct] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const toast = useToast()

    const load = async () => {
        try {
            const res = await comercialApi.listProductos()
            setList(res.data || [])
        } catch (e) {
            toast.error('Error al cargar productos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleSave = async (data) => {
        try {
            if (editingProduct) {
                await comercialApi.updateProducto(editingProduct.id, data)
                toast.success('Producto actualizado')
            } else {
                await comercialApi.createProducto(data)
                toast.success('Producto creado')
            }
            setEditingProduct(null)
            setShowCreate(false)
            load()
        } catch (e) {
            toast.error(e.response?.data?.error || 'Error al guardar')
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await comercialApi.deleteProducto(deletingId)
            toast.success('Producto eliminado')
            setDeletingId(null)
            load()
        } catch (e) {
            toast.error('Error al eliminar')
        }
    }

    if (loading) return <div>Cargando...</div>

    return (
        <div className="AdminProductos">
            <div className="admin-list-header">
                <h3>Planes y Onboardings</h3>
                <button className="btn-add" onClick={() => setShowCreate(true)}>
                    <FiPlus /> Crear Producto
                </button>
            </div>

            <div className="admin-table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Precio Actual</th>
                            <th>Objetivo?</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map(p => (
                            <tr key={p.id}>
                                <td><strong>{p.nombre}</strong></td>
                                <td>
                                    <span className={`badge ${p.tipo === 'plan' ? 'info' : 'warning'}`}>
                                        {p.tipo.toUpperCase()}
                                    </span>
                                </td>
                                <td>${parseFloat(p.precio_actual).toLocaleString()}</td>
                                <td>
                                    {p.es_onboarding_objetivo && (
                                        <FiCheckCircle title="Se usa para calcular objetivos" style={{ color: '#4ade80' }} />
                                    )}
                                </td>
                                <td>
                                    <div className="actions">
                                        <button title="Editar" onClick={() => setEditingProduct(p)}><FiEdit2 /></button>
                                        <button className="delete" title="Eliminar" onClick={() => setDeletingId(p.id)}><FiTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(showCreate || editingProduct) && (
                <ProductFormModal
                    product={editingProduct}
                    onClose={() => { setShowCreate(false); setEditingProduct(null); }}
                    onSave={handleSave}
                />
            )}

            {deletingId && (
                <ConfirmModal
                    title="¿Eliminar Producto?"
                    message="¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer y puede afectar cálculos históricos."
                    confirmText="Eliminar Producto"
                    onConfirm={handleDelete}
                    onClose={() => setDeletingId(null)}
                />
            )}
        </div>
    )
}
