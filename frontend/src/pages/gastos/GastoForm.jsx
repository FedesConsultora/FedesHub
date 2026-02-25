import React, { useState, useEffect, useRef } from 'react'
import Modal from '../../components/ui/Modal'
import { gastosApi } from '../../api/gastos'
import { useToast } from '../../components/toast/ToastProvider'

export default function GastoForm({ isOpen, onClose, onSuccess, initialData = null }) {
    const toast = useToast()
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState([])
    const [formData, setFormData] = useState({
        descripcion: '',
        monto: '',
        moneda: 'ARS',
        fecha: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                descripcion: initialData.descripcion || '',
                monto: initialData.monto || '',
                moneda: initialData.moneda || 'ARS',
                fecha: initialData.fecha ? new Date(initialData.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            })
        } else {
            setFormData({
                descripcion: '',
                monto: '',
                moneda: 'ARS',
                fecha: new Date().toISOString().split('T')[0]
            })
        }
        setFiles([])
    }, [initialData, isOpen])

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files)
        setFiles(prev => [...prev, ...newFiles])
        e.target.value = ''
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()

        if (!initialData && files.length === 0) {
            toast?.error('Debe adjuntar al menos una constancia del gasto')
            return
        }

        setLoading(true)
        try {
            if (initialData?.id) {
                await gastosApi.update(initialData.id, formData)
                toast?.success('Gasto actualizado')
            } else {
                await gastosApi.create(formData, files)
                toast?.success('Gasto registrado')
            }
            onSuccess()
            onClose()
        } catch (error) {
            toast?.error('Error al guardar: ' + (error.fh?.message || error.message))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
            footer={
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" className="fh-btn" onClick={onClose}>Cancelar</button>
                    <button
                        type="button"
                        className="fh-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #44718D, #3a6179)',
                            borderColor: 'rgba(68,113,141,0.5)'
                        }}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            }
        >
            <div className="gasto-form">
                <div className="form-group">
                    <label>Descripción</label>
                    <input
                        type="text"
                        className="fh-input"
                        placeholder="Ej: Compra de insumos"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Monto</label>
                        <input
                            type="number"
                            step="0.01"
                            className="fh-input"
                            placeholder="0.00"
                            value={formData.monto}
                            onChange={e => setFormData({ ...formData, monto: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Moneda</label>
                        <select
                            className="fh-select"
                            value={formData.moneda}
                            onChange={e => setFormData({ ...formData, moneda: e.target.value })}
                        >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Fecha</label>
                    <input
                        type="date"
                        className="fh-input"
                        value={formData.fecha}
                        onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                        required
                    />
                </div>

                {/* Adjuntos */}
                <div className="form-group">
                    <label>Constancia del gasto *</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        className="gasto-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        Adjuntar archivos
                    </button>
                    {files.length > 0 && (
                        <div className="gasto-file-list">
                            {files.map((file, idx) => (
                                <div key={idx} className="gasto-file-item">
                                    <div className="gasto-file-info">
                                        <span className="gasto-file-icon">
                                            {file.type?.startsWith('image/') ? '🖼️' : '📄'}
                                        </span>
                                        <span className="gasto-file-name">{file.name}</span>
                                        <span className="gasto-file-size">{formatSize(file.size)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="gasto-file-remove"
                                        onClick={() => removeFile(idx)}
                                        title="Quitar"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {files.length === 0 && (
                        <span className="gasto-file-hint">Suba fotos, tickets o PDFs de la constancia</span>
                    )}
                </div>
            </div>
        </Modal>
    )
}
