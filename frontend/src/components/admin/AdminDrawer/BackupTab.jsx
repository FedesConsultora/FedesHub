import { useState } from 'react'
import { FiDownload, FiUpload, FiAlertTriangle, FiCheckCircle, FiLoader } from 'react-icons/fi'
import { api } from '../../../api/client' // Corregido path a client.js
import './BackupTab.scss'

export default function BackupTab() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const handleExport = async (type) => {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const response = await api.get(`/mantenimiento/export/${type}`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `fhub-${type}-${new Date().toISOString().split('T')[0]}.json`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            setResult({ message: `Exportación de ${type} completada.` })
        } catch (err) {
            setError(`Error al exportar ${type}: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleImport = async (e, type) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!window.confirm(`¿Estás seguro de que quieres importar ${type}? Esto podría sobrescribir o duplicar datos existentes.`)) {
            e.target.value = ''
            return
        }

        setLoading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await api.post(`/mantenimiento/import/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setResult({
                message: `Importación de ${type} finalizada.`,
                details: response.data
            })
        } catch (err) {
            setError(`Error al importar ${type}: ${err.response?.data?.error || err.message}`)
        } finally {
            setLoading(false)
            e.target.value = ''
        }
    }

    return (
        <div className="backupTab">
            <header className="tabInnerHead">
                <h3>Sistema de Copias de Seguridad</h3>
                <p>Exporta e importa la base de datos completa de Clientes y Tareas en formato JSON.</p>
            </header>

            <div className="backupGrid">
                {/* CLIENTES SECTION */}
                <section className="backupCard">
                    <div className="cardInfo">
                        <h4>Clientes</h4>
                        <p>Exporta todos los clientes y sus contactos asociados.</p>
                    </div>
                    <div className="cardActions">
                        <button className="btnExport" onClick={() => handleExport('clientes')} disabled={loading}>
                            <FiDownload /> Exportar JSON
                        </button>
                        <label className="btnImport">
                            <FiUpload /> Importar JSON
                            <input type="file" accept=".json" onChange={(e) => handleImport(e, 'clientes')} disabled={loading} hidden />
                        </label>
                    </div>
                </section>

                {/* TAREAS SECTION */}
                <section className="backupCard">
                    <div className="cardInfo">
                        <h4>Tareas</h4>
                        <p>Exporta tareas, responsables, colaboraciones, etiquetas, checklist y comentarios.</p>
                    </div>
                    <div className="cardActions">
                        <button className="btnExport" onClick={() => handleExport('tareas')} disabled={loading}>
                            <FiDownload /> Exportar JSON
                        </button>
                        <label className="btnImport">
                            <FiUpload /> Importar JSON
                            <input type="file" accept=".json" onChange={(e) => handleImport(e, 'tareas')} disabled={loading} hidden />
                        </label>
                    </div>
                </section>
            </div>

            {loading && (
                <div className="backupLoading">
                    <FiLoader className="spin" />
                    <span>Procesando datos, por favor espera...</span>
                </div>
            )}

            {result && (
                <div className="backupResult success">
                    <FiCheckCircle />
                    <div>
                        <strong>{result.message}</strong>
                        {result.details && (
                            <ul className="details">
                                <li>Creados: {result.details.created}</li>
                                <li>Actualizados: {result.details.updated}</li>
                                {result.details.errors?.length > 0 && (
                                    <li className="errors">Errores: {result.details.errors.length}</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="backupResult error">
                    <FiAlertTriangle />
                    <span>{error}</span>
                </div>
            )}

            <div className="backupNotice">
                <FiAlertTriangle />
                <p><strong>Atención:</strong> Asegúrate de exportar primero los Clientes antes que las Tareas si vas a restaurar un backup completo, ya que las tareas dependen de la existencia de los clientes.</p>
            </div>
        </div>
    )
}
