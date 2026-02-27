import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { gastosApi } from '../../api/gastos'
import { useToast } from '../../components/toast/ToastProvider'
import { FiX, FiDollarSign, FiCalendar, FiFileText, FiUpload, FiArrowRight } from 'react-icons/fi'
import '../Tareas/components/modal-panel.scss'
import '../../components/tasks/CreateTask.scss'
import './gastos.scss'

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
        if (isOpen) {
            document.body.style.overflow = 'hidden'
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
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
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

    if (!isOpen) return null

    const modalContent = (
        <div className="taskModalWrap" role="dialog" aria-modal="true" onClick={(e) => {
            if (e.target.classList.contains('taskModalWrap')) onClose()
        }}>
            <form className="tcCard" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
                <header className="tcHeader">
                    <div className="brand">
                        <div className="logo">{initialData ? 'Editar Gasto' : 'Nuevo Gasto'}</div>
                        <div className="subtitle">Completa los detalles del comprobante</div>
                    </div>
                    <button type="button" className="close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
                </header>

                <div className="tcBody">
                    <div className="tcGrid">
                        {/* Columna Izquierda: Datos */}
                        <div className="col">
                            <div className="field">
                                <FiFileText className="ico" />
                                <input
                                    type="text"
                                    placeholder="Descripción corta del gasto..."
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-row">
                                <div className="field has-label" style={{ flex: 2 }}>
                                    <FiDollarSign className="ico" />
                                    <div className="field-content">
                                        <span className="field-label">Monto</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.monto}
                                            onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="field has-label" style={{ flex: 1 }}>
                                    <div className="field-content">
                                        <span className="field-label">Moneda</span>
                                        <select
                                            value={formData.moneda}
                                            onChange={e => setFormData({ ...formData, moneda: e.target.value })}
                                        >
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="field has-label">
                                <FiCalendar className="ico" />
                                <div className="field-content">
                                    <span className="field-label">Fecha del Comprobante</span>
                                    <input
                                        type="date"
                                        value={formData.fecha}
                                        onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Adjuntos */}
                        <div className="col">
                            <div className="field upload-files" style={{ minHeight: '180px', background: 'rgba(255,255,255,0.02)' }}>
                                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Constancia / Ticket</label>
                                <span>Arrastra o selecciona archivos</span>

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
                                    className="btn"
                                    style={{ marginTop: '1rem', width: 'auto', marginBottom: '1rem' }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FiUpload style={{ marginRight: 8 }} />
                                    Elegir archivos
                                </button>
                            </div>

                            {files.length > 0 && (
                                <div className="filesList" style={{ paddingBottom: 0 }}>
                                    {files.map((file, idx) => (
                                        <div key={idx} className="fileRow" style={{ width: '100px' }}>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                style={{
                                                    position: 'absolute',
                                                    top: -5,
                                                    right: -5,
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    zIndex: 10,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px'
                                                }}
                                            >✕</button>
                                            {file.type?.startsWith('image/') ? (
                                                <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: 8 }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📄</div>
                                            )}
                                            <span style={{ fontSize: '0.7rem', marginTop: 4, opacity: 0.6, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="tcFooter">
                    <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
                    <button type="submit" className="submit" disabled={loading}>
                        {loading ? 'Guardando...' : initialData ? 'Actualizar Gasto' : 'Registrar Gasto'}
                        <FiArrowRight style={{ marginLeft: 8 }} />
                    </button>
                </footer>
            </form>
        </div>
    )

    return createPortal(modalContent, document.body)
}
