// frontend/src/components/uploads/UploadIndicator.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadContext } from '../../context/UploadProvider'
import { FiX, FiChevronDown, FiChevronUp, FiUploadCloud, FiCheck, FiAlertCircle } from 'react-icons/fi'
import './UploadIndicator.scss'

export default function UploadIndicator() {
    const {
        uploads,
        cancelUpload,
        clearCompleted,
        hasActiveUploads,
        showFloatingIndicator,
        hideFloatingIndicator
    } = useUploadContext() || {}
    const [minimized, setMinimized] = useState(false)
    const navigate = useNavigate()

    // No mostrar si no hay uploads o si el usuario lo ocultó
    if (!uploads?.length || !showFloatingIndicator) return null

    const activeCount = uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length
    const completedCount = uploads.filter(u => u.status === 'completed').length
    const errorCount = uploads.filter(u => u.status === 'error').length

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
        return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <FiCheck className="icon success" />
            case 'error': return <FiAlertCircle className="icon error" />
            case 'cancelled': return <FiX className="icon cancelled" />
            default: return <FiUploadCloud className="icon uploading" />
        }
    }

    const handleUploadClick = (upload) => {
        // Si está completado, navegar a la tarea
        if (upload.status === 'completed' && upload.taskId) {
            navigate(`/tareas?taskId=${upload.taskId}`)
        }
    }

    const handleClose = (e) => {
        e.stopPropagation()
        hideFloatingIndicator?.()
    }

    return (
        <div className={`uploadIndicator ${minimized ? 'minimized' : ''}`}>
            {/* Header */}
            <div className="uploadHeader" onClick={() => setMinimized(v => !v)}>
                <div className="headerLeft">
                    <FiUploadCloud className="headerIcon" />
                    <span className="headerTitle">
                        {activeCount > 0
                            ? `Subiendo ${activeCount} archivo${activeCount > 1 ? 's' : ''}`
                            : `${completedCount + errorCount} completado${completedCount + errorCount > 1 ? 's' : ''}`
                        }
                    </span>
                </div>
                <div className="headerRight">
                    {!hasActiveUploads && (
                        <button className="clearBtn" onClick={(e) => { e.stopPropagation(); clearCompleted() }}>
                            Limpiar
                        </button>
                    )}
                    <button
                        className="closeBtn"
                        onClick={handleClose}
                        title="Cerrar (los uploads continúan en segundo plano)"
                    >
                        <FiX />
                    </button>
                </div>
            </div>

            {/* Lista de uploads */}
            {!minimized && (
                <div className="uploadList">
                    {uploads.map(upload => (
                        <div
                            key={upload.id}
                            className={`uploadItem ${upload.status} ${upload.status === 'completed' ? 'clickable' : ''}`}
                            onClick={() => handleUploadClick(upload)}
                            title={upload.status === 'completed' ? 'Click para ir a la tarea' : ''}
                        >
                            <div className="uploadInfo">
                                {getStatusIcon(upload.status)}
                                <div className="uploadDetails">
                                    <span className="fileName">{upload.fileName}</span>
                                    <span className="fileSize">
                                        {formatSize(upload.fileSize)}
                                        {upload.status === 'completed' && <span className="viewLink"> • Ver tarea</span>}
                                    </span>
                                </div>
                            </div>

                            {(upload.status === 'uploading' || upload.status === 'processing') && (
                                <div className="progressRow">
                                    <div className="progressBarWrapper">
                                        <div className="progressBar">
                                            <div
                                                className={`progressFill ${upload.status === 'processing' ? 'processing' : ''}`}
                                                style={{ width: `${upload.progress}%` }}
                                            />
                                        </div>
                                        {upload.status === 'uploading' && (
                                            <button
                                                className="cancelBtn"
                                                onClick={(e) => { e.stopPropagation(); cancelUpload(upload.id); }}
                                                title="Cancelar subida"
                                            >
                                                <FiX />
                                            </button>
                                        )}
                                    </div>
                                    <span className="progressText">
                                        {upload.status === 'processing' ? 'Procesando...' : `${upload.progress}%`}
                                    </span>
                                </div>
                            )}

                            {upload.status === 'error' && (
                                <span className="errorText">{upload.error}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
