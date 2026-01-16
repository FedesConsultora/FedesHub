// /frontend/src/pages/Comercial/ImportLeadsModal.jsx
import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FiX, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { comercialApi } from '../../api/comercial'
import { useToast } from '../../components/toast/ToastProvider'
import './ImportLeadsModal.scss'

export default function ImportLeadsModal({ onClose, onImported }) {
    const toast = useToast()
    const [file, setFile] = useState(null)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)

    const handleFile = async (rawFile) => {
        if (!rawFile) return
        setLoading(true)
        setFile(rawFile)

        try {
            const reader = new FileReader()
            reader.onload = (e) => {
                const bstr = e.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const json = XLSX.utils.sheet_to_json(ws)

                // Basic validation & enhancement
                const processed = json.map((row, idx) => {
                    const errors = []
                    if (!row.nombre && !row.Nombre) errors.push('Falta nombre')
                    if (!row.email && !row.Email) errors.push('Falta email')

                    return {
                        id: idx,
                        ...row,
                        __errors: errors,
                        __isValid: errors.length === 0
                    }
                })

                setData(processed)
                setLoading(false)
            }
            reader.readAsBinaryString(rawFile)
        } catch (err) {
            toast?.error('Error al leer el archivo')
            setLoading(false)
        }
    }

    const onDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) handleFile(droppedFile)
    }

    const handleImport = async () => {
        if (!file || importing) return

        const validRows = data.filter(r => r.__isValid)
        if (validRows.length === 0) {
            toast?.error('No hay filas válidas para importar')
            return
        }

        setImporting(true)
        const fd = new FormData()
        fd.append('file', file)

        try {
            const { data: result } = await comercialApi.importLeads(fd)
            toast?.success(`Importación exitosa. Creados: ${result.created}, Actualizados: ${result.updated}`)
            onImported?.()
            onClose()
        } catch (e) {
            toast?.error(e.fh?.message || 'Error al importar')
        } finally {
            setImporting(false)
        }
    }

    const validCount = data.filter(r => r.__isValid).length
    const invalidCount = data.length - validCount

    return (
        <div className="ImportLeadsModal">
            <div className="modal-card">
                <header className="modal-header">
                    <h2>Importar Leads desde Excel</h2>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-body">
                    {!file ? (
                        <div
                            className={`dropzone ${dragging ? 'dragging' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <i className="fi fi-rr-cloud-upload"></i>
                            <p>Arrastrá tu archivo Excel aquí</p>
                            <span>o haz clic para buscarlo en tu computadora</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                        </div>
                    ) : (
                        <div className="preview-section">
                            <div className="stats">
                                <div className="stat-item">
                                    <span className="label">Total Filas</span>
                                    <span className="value">{data.length}</span>
                                </div>
                                <div className="stat-item success">
                                    <span className="label">Listas para importar</span>
                                    <span className="value">{validCount}</span>
                                </div>
                                {invalidCount > 0 && (
                                    <div className="stat-item error">
                                        <span className="label">Con errores</span>
                                        <span className="value">{invalidCount}</span>
                                    </div>
                                )}
                            </div>

                            <div className="preview-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Estado</th>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Empresa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.slice(0, 10).map((row) => (
                                            <tr key={row.id}>
                                                <td>
                                                    {row.__isValid ? (
                                                        <FiCheckCircle style={{ color: '#4ade80' }} title="Válido" />
                                                    ) : (
                                                        <FiAlertCircle style={{ color: '#f87171' }} title={row.__errors.join(', ')} />
                                                    )}
                                                </td>
                                                <td>{row.nombre || row.Nombre || '-'}</td>
                                                <td>{row.email || row.Email || '-'}</td>
                                                <td>{row.empresa || row.Empresa || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.length > 10 && (
                                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                                        Mostrando las primeras 10 filas de {data.length}
                                    </div>
                                )}
                            </div>

                            <button
                                className="btn-secondary"
                                style={{ marginTop: '16px', borderRadius: '8px' }}
                                onClick={() => { setFile(null); setData([]) }}
                            >
                                Cambiar archivo
                            </button>
                        </div>
                    )}

                    <a href="#" className="template-link" onClick={(e) => e.preventDefault()}>
                        <FiDownload /> Descargar plantilla ejemplo
                    </a>
                </div>

                <footer className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-primary"
                        disabled={!file || validCount === 0 || importing}
                        onClick={handleImport}
                    >
                        {importing ? <><FiLoader className="spin" /> Procesando...</> : `Importar ${validCount} leads`}
                    </button>
                </footer>
            </div>
        </div>
    )
}
