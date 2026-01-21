// /frontend/src/pages/Comercial/ImportLeadsModal.jsx
import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FiX, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { comercialApi } from '../../api/comercial'
import { useToast } from '../../components/toast/ToastProvider'
import './ImportLeadsModal.scss'

export default function ImportLeadsModal({ onClose, onImported }) {
    const toast = useToast()
    const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview
    const [file, setFile] = useState(null)
    const [headers, setHeaders] = useState([])
    const [mapping, setMapping] = useState({})
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)

    const AVAILABLE_FIELDS = [
        { id: 'nombre', label: 'Nombre', required: true, category: 'Básico' },
        { id: 'apellido', label: 'Apellido', category: 'Básico' },
        { id: 'email', label: 'Email', category: 'Contacto' },
        { id: 'telefono', label: 'Teléfono', category: 'Contacto' },
        { id: 'empresa', label: 'Empresa', category: 'Información' },
        { id: 'ubicacion', label: 'Ubicación / Ciudad', category: 'Información' },
        { id: 'sitio_web', label: 'Sitio Web', category: 'Información' },
        { id: 'alias', label: 'Interés / Alias / Main Goal', category: 'Otros' },
    ]

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

                if (json.length === 0) {
                    toast?.error('El archivo está vacío')
                    setLoading(false)
                    return
                }

                const fileHeaders = Object.keys(json[0])
                setHeaders(fileHeaders)

                // Smart Auto-Mapping
                const initialMapping = {}
                AVAILABLE_FIELDS.forEach(field => {
                    const match = fileHeaders.find(h => {
                        const lowH = h.toLowerCase().trim()
                        const lowF = field.label.toLowerCase()
                        return lowH === lowF || lowH === field.id ||
                            (field.id === 'nombre' && (lowH === 'name' || lowH === 'full name' || lowH === 'cliente' || lowH === 'client')) ||
                            (field.id === 'email' && (lowH === 'e-mail' || lowH === 'correo' || lowH === 'email address')) ||
                            (field.id === 'telefono' && (lowH === 'tel' || lowH === 'phone' || lowH === 'celular'))
                    })
                    if (match) initialMapping[field.id] = match
                })
                setMapping(initialMapping)

                setData(json)
                setStep(2) // Move to mapping step
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

        setImporting(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('mapping', JSON.stringify(mapping))

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

    const categories = [...new Set(AVAILABLE_FIELDS.map(f => f.category))]

    const getPreviewVal = (row, fieldId) => {
        const header = mapping[fieldId]
        return header ? row[header] : '-'
    }

    return (
        <div className="ImportLeadsModal">
            <div className={`modal-card step-${step}`}>
                <header className="modal-header">
                    <div className="title-group">
                        <h2>Importar Leads</h2>
                        <div className="steps-indicator">
                            <span className={step >= 1 ? 'active' : ''}>1. Subir</span>
                            <span className={step >= 2 ? 'active' : ''}>2. Mapear</span>
                            <span className={step >= 3 ? 'active' : ''}>3. Confirmar</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="modal-body">
                    {step === 1 && (
                        <>
                            <div className="import-info">
                                <div className="info-card">
                                    <FiCheckCircle className="icon" />
                                    <div>
                                        <strong>Formatos aceptados</strong>
                                        <p>Excel (.xlsx, .xls) y CSV. ¡También aceptamos archivos de <strong>Cliengo</strong>!</p>
                                    </div>
                                </div>
                            </div>
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
                        </>
                    )}

                    {step === 2 && (
                        <div className="mapping-section">
                            <div className="section-header">
                                <h3>Vincular Columnas</h3>
                                <p>Relaciona las columnas de tu archivo con los campos de FedesHub.</p>
                            </div>

                            <div className="mapping-container">
                                {categories.map(cat => (
                                    <div key={cat} className="mapping-group">
                                        <h4>{cat}</h4>
                                        {AVAILABLE_FIELDS.filter(f => f.category === cat).map(field => (
                                            <div key={field.id} className="mapping-row">
                                                <div className="field-info">
                                                    <label>{field.label} {field.required && <span className="req">*</span>}</label>
                                                </div>
                                                <div className="header-select">
                                                    <select
                                                        value={mapping[field.id] || ''}
                                                        onChange={(e) => setMapping(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                    >
                                                        <option value="">-- No importar --</option>
                                                        {headers.map(h => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="preview-section">
                            <div className="stats-header">
                                <h3>Vista previa de importación</h3>
                                <div className="stats-badges">
                                    <div className="stat-badge total">{data.length} filas detectadas</div>
                                </div>
                            </div>

                            <div className="preview-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Teléfono</th>
                                            <th>Empresa / Ciudad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.slice(0, 10).map((row, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <strong>{getPreviewVal(row, 'nombre')}</strong>
                                                    <span>{getPreviewVal(row, 'apellido')}</span>
                                                </td>
                                                <td>{getPreviewVal(row, 'email')}</td>
                                                <td>{getPreviewVal(row, 'telefono')}</td>
                                                <td>
                                                    <div className="extra-info">
                                                        <span>{getPreviewVal(row, 'empresa')}</span>
                                                        <small>{getPreviewVal(row, 'ubicacion')}</small>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.length > 10 && (
                                    <div className="more-rows">
                                        Mostrando una muestra de las {data.length} filas encontradas.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="modal-footer">
                    {step === 1 ? (
                        <>
                            <div className="footer-left">
                                <button className="template-download" onClick={downloadTemplate}>
                                    <FiDownload /> Descargar plantilla
                                </button>
                            </div>
                            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-back" onClick={() => setStep(step - 1)}>Atrás</button>
                            <div className="spacer" />
                            {step === 2 && (
                                <button
                                    className="btn-next"
                                    onClick={() => setStep(3)}
                                    disabled={!mapping.nombre}
                                >
                                    Siguiente
                                </button>
                            )}
                            {step === 3 && (
                                <button
                                    className="btn-import"
                                    disabled={importing}
                                    onClick={handleImport}
                                >
                                    {importing ? <><FiLoader className="spin" /> Importando...</> : `Confirmar Importación`}
                                </button>
                            )}
                        </>
                    )}
                </footer>
            </div>
        </div>
    )
}
