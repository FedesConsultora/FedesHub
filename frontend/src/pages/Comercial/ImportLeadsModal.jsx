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

    const downloadTemplate = () => {
        const templateData = [
            {
                Nombre: 'Juan',
                Apellido: 'Pérez',
                Empresa: 'Empresa S.A.',
                Email: 'juan@ejemplo.com',
                Telefono: '+54 11 1234 5678',
                Fuente: 'WhatsApp',
                Ubicacion: 'Buenos Aires, AR',
                Alias: 'Juan de Empresa',
                'Sitio Web': 'www.empresa.com'
            }
        ]
        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla de Leads')
        XLSX.writeFile(wb, 'plantilla_leads_fedes.xlsx')
    }

    const validCount = data.filter(r => r.__isValid).length
    const invalidCount = data.length - validCount

    return (
        <div className="ImportLeadsModal">
            <div className="modal-card">
                <header className="modal-header">
                    <div className="title-group">
                        <h2>Importar Leads</h2>
                        <p>Subí tus contactos de forma masiva vía Excel o CSV</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-body">
                    <div className="import-info">
                        <div className="info-card">
                            <FiCheckCircle className="icon" />
                            <div>
                                <strong>Formatos aceptados</strong>
                                <p>Excel (.xlsx, .xls) y CSV. ¡También aceptamos archivos de <strong>Cliengo</strong>!</p>
                            </div>
                        </div>
                    </div>

                    {!file ? (
                        <div
                            className={`dropzone ${dragging ? 'dragging' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="dz-icon">
                                <FiUpload />
                            </div>
                            <p>Arrastrá tu archivo aquí</p>
                            <span>o haz clic para buscarlo</span>
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
                            <div className="stats-header">
                                <h3>Vista previa de los datos</h3>
                                <div className="stats-badges">
                                    <div className="stat-badge total">
                                        {data.length} filas
                                    </div>
                                    <div className="stat-badge success">
                                        {validCount} válidas
                                    </div>
                                    {invalidCount > 0 && (
                                        <div className="stat-badge error">
                                            {invalidCount} errores
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="preview-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}></th>
                                            <th>Nombre</th>
                                            <th>Email / Tel</th>
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
                                                <td>
                                                    <div className="lead-main-info">
                                                        <strong>{row.nombre || row.Nombre || row['Full Name'] || '-'}</strong>
                                                        <span>{row.apellido || row.Apellido || ''}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="lead-contact-info">
                                                        <span>{row.email || row.Email || row['Email address'] || '-'}</span>
                                                        <small>{row.telefono || row.Telefono || row['Phone Number'] || '-'}</small>
                                                    </div>
                                                </td>
                                                <td>{row.empresa || row.Empresa || row.Company || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.length > 10 && (
                                    <div className="more-rows">
                                        Mostrando 10 de {data.length} filas detectadas
                                    </div>
                                )}
                            </div>

                            <button
                                className="change-file-btn"
                                onClick={() => { setFile(null); setData([]) }}
                            >
                                Seleccionar otro archivo
                            </button>
                        </div>
                    )}

                    <div className="actions-footer">
                        <button className="template-download" onClick={downloadTemplate}>
                            <FiDownload /> Descargar plantilla ejemplo
                        </button>
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-import"
                        disabled={!file || validCount === 0 || importing}
                        onClick={handleImport}
                    >
                        {importing ? <><FiLoader className="spin" /> Procesando...</> : `Confirmar Importación`}
                    </button>
                </footer>
            </div>
        </div>
    )
}
