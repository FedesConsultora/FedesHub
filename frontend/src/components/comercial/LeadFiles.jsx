import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FiFile, FiDownload, FiClock, FiUser, FiExternalLink } from 'react-icons/fi'
import './LeadFiles.scss'

export default function LeadFiles({ lead }) {
    const files = lead.adjuntos || []

    if (files.length === 0) {
        return (
            <div className="LeadFiles-empty">
                <FiFile size={40} />
                <p>No hay archivos adjuntos en este lead.</p>
                <span>Sube archivos a través de las notas para verlos aquí.</span>
            </div>
        )
    }

    return (
        <div className="LeadFiles">
            <div className="files-grid">
                {files.map(file => (
                    <div key={file.id} className="file-card">
                        <div className="file-icon">
                            <FileIcon mimetype={file.mimetype} />
                        </div>
                        <div className="file-info">
                            <h4 className="ellipsis" title={file.nombre_original}>
                                {file.nombre_original}
                            </h4>
                            <div className="file-meta">
                                <span className="size">{formatSize(file.size)}</span>
                                <span className="separator">•</span>
                                <span className="date" title={format(new Date(file.created_at), "PPPpp", { locale: es })}>
                                    {format(new Date(file.created_at), "dd/MM/yy", { locale: es })}
                                </span>
                            </div>
                            <div className="file-footer">
                                <div className="author">
                                    <FiUser size={12} />
                                    <span>{file.autor?.nombre || 'Sistema'}</span>
                                </div>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-download"
                                    title="Descargar/Ver"
                                >
                                    <FiExternalLink />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function FileIcon({ mimetype }) {
    if (!mimetype) return <FiFile />
    if (mimetype.includes('image')) return <FiFile style={{ color: '#10b981' }} />
    if (mimetype.includes('pdf')) return <FiFile style={{ color: '#ef4444' }} />
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return <FiFile style={{ color: '#10b981' }} />
    if (mimetype.includes('word')) return <FiFile style={{ color: '#3b82f6' }} />
    return <FiFile />
}

function formatSize(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
