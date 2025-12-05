// frontend/src/context/UploadProvider.jsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { api, ensureCsrf } from '../api/client'

const UploadContext = createContext(null)

// Generar ID único para cada upload
const generateId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export function UploadProvider({ children }) {
    const [uploads, setUploads] = useState([])
    const [showFloatingIndicator, setShowFloatingIndicator] = useState(true)
    const abortControllersRef = useRef({})

    // Advertencia antes de cerrar/recargar si hay uploads activos
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const hasActive = uploads.some(u => u.status === 'uploading' || u.status === 'processing')
            if (hasActive) {
                e.preventDefault()
                e.returnValue = 'Hay archivos subiéndose. ¿Estás seguro de que querés salir?'
                return e.returnValue
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [uploads])

    // Agregar upload a la cola y empezar
    const queueUpload = useCallback(async ({ taskId, files, esEmbebido = false, onComplete }) => {
        const uploadIds = []

        // Mostrar el indicador flotante al iniciar un upload
        setShowFloatingIndicator(true)

        for (const file of files) {
            const id = generateId()
            uploadIds.push(id)

            // Agregar a la lista
            setUploads(prev => [...prev, {
                id,
                taskId,
                esEmbebido, // Para saber a qué galería pertenece
                fileName: file.name,
                fileSize: file.size,
                progress: 0,
                status: 'uploading', // uploading | processing | completed | error | cancelled
                error: null
            }])

            // Crear AbortController para poder cancelar
            const controller = new AbortController()
            abortControllersRef.current[id] = controller

                // Subir archivo en background
                ; (async () => {
                    try {
                        await ensureCsrf()

                        const formData = new FormData()
                        formData.append('files', file)
                        if (esEmbebido) {
                            formData.append('es_embebido', 'true')
                        }

                        // Marcar como "procesando" cuando llega a 100% (el servidor aún procesa)
                        let markedAsProcessing = false

                        await api.post(`/tareas/${taskId}/adjuntos/upload`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            timeout: 0, // Sin timeout
                            signal: controller.signal,
                            onUploadProgress: (progressEvent) => {
                                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)

                                // Si llegó al 100% pero aún no terminó, mostrar "procesando"
                                if (percent >= 100 && !markedAsProcessing) {
                                    markedAsProcessing = true
                                    setUploads(prev => prev.map(u =>
                                        u.id === id ? { ...u, progress: 100, status: 'processing' } : u
                                    ))
                                } else if (percent < 100) {
                                    setUploads(prev => prev.map(u =>
                                        u.id === id ? { ...u, progress: percent } : u
                                    ))
                                }
                            }
                        })

                        // Marcar como completado
                        setUploads(prev => prev.map(u =>
                            u.id === id ? { ...u, status: 'completed', progress: 100 } : u
                        ))

                        // Callback de completado
                        if (onComplete) {
                            onComplete(id, taskId)
                        }

                        // NO remover automáticamente - el usuario debe limpiar manualmente
                        delete abortControllersRef.current[id]

                    } catch (err) {
                        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                            setUploads(prev => prev.map(u =>
                                u.id === id ? { ...u, status: 'cancelled' } : u
                            ))
                        } else {
                            setUploads(prev => prev.map(u =>
                                u.id === id ? { ...u, status: 'error', error: err.message || 'Error al subir' } : u
                            ))
                        }
                        delete abortControllersRef.current[id]
                    }
                })()
        }

        return uploadIds
    }, [])

    // Cancelar un upload
    const cancelUpload = useCallback((id) => {
        const controller = abortControllersRef.current[id]
        if (controller) {
            controller.abort()
        }
        // Remover de la lista después de un momento
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.id !== id))
        }, 1000)
    }, [])

    // Limpiar uploads completados/errores
    const clearCompleted = useCallback(() => {
        setUploads(prev => prev.filter(u => u.status === 'uploading' || u.status === 'processing'))
    }, [])

    // Ocultar/mostrar el indicador flotante
    const hideFloatingIndicator = useCallback(() => {
        setShowFloatingIndicator(false)
    }, [])

    const revealFloatingIndicator = useCallback(() => {
        setShowFloatingIndicator(true)
    }, [])

    const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'processing')

    const value = {
        uploads,
        queueUpload,
        cancelUpload,
        clearCompleted,
        hasActiveUploads,
        showFloatingIndicator,
        hideFloatingIndicator,
        revealFloatingIndicator
    }

    return (
        <UploadContext.Provider value={value}>
            {children}
        </UploadContext.Provider>
    )
}

export const useUploadContext = () => useContext(UploadContext)

