import { useCallback, useEffect, useState } from 'react'
import { tareasApi } from '../../../api/tareas'
import { parseApiError } from '../../../api/client'

/**
 * Hook para cargar la información de la familia de una tarea
 * @param {number} taskId - ID de la tarea actual
 * @returns {object} - { parentTask, siblings, children, loading, error, reload }
 */
export default function useTaskFamily(taskId) {
    const [parentTask, setParentTask] = useState(null)
    const [siblings, setSiblings] = useState([])
    const [children, setChildren] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        if (!taskId) return

        setLoading(true)
        setError(null)

        try {
            // Obtener la tarea actual para saber si tiene padre
            const currentTask = await tareasApi.get(taskId)

            // Si tiene padre, cargar el padre y los hermanos
            if (currentTask.tarea_padre_id) {
                const [parent, siblingsData] = await Promise.all([
                    tareasApi.get(currentTask.tarea_padre_id),
                    tareasApi.listChildren(currentTask.tarea_padre_id)
                ])

                setParentTask(parent)
                // Filtrar para no incluir la tarea actual en los hermanos
                setSiblings((siblingsData.rows || []).filter(t => t.id !== taskId))
            } else {
                setParentTask(null)
                setSiblings([])
            }

            // Cargar las subtareas (hijos)
            const childrenData = await tareasApi.listChildren(taskId)
            setChildren(childrenData.rows || [])

        } catch (e) {
            setError(parseApiError(e)?.message || 'No se pudo cargar la información de la familia')
        } finally {
            setLoading(false)
        }
    }, [taskId])

    useEffect(() => {
        if (taskId) load()
    }, [taskId, load])

    return {
        parentTask,
        siblings,
        children,
        loading,
        error,
        reload: load
    }
}
