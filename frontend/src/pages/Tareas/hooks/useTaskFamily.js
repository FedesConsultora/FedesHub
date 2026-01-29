import { useCallback, useEffect, useState } from 'react'
import { tareasApi } from '../../../api/tareas'
import { parseApiError } from '../../../api/client'

/**
 * Hook para cargar la información de la familia de una tarea
 * @param {number} taskId - ID de la tarea actual
 * @returns {object} - { parentTask, siblings, children, loading, error, reload }
 */
export default function useTaskFamily(taskId) {
    const [levels, setLevels] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        if (!taskId) return

        setLoading(true)
        setError(null)

        try {
            const allTasks = await tareasApi.getFamily(taskId)

            // 1. Mapear todas las tareas por ID para acceso rápido
            const taskMap = {}
            allTasks.forEach(t => {
                taskMap[t.id] = { ...t, children: [] }
            })

            // 2. Construir la estructura de árbol y encontrar raíces
            const roots = []
            allTasks.forEach(t => {
                const node = taskMap[t.id]
                if (t.tarea_padre_id && taskMap[t.tarea_padre_id]) {
                    taskMap[t.tarea_padre_id].children.push(node)
                } else {
                    roots.push(node)
                }
            })

            // 3. Etiquetar nodos (isCurrent, isAncestor, isDescendant)
            const markNodes = (nodes, currentFound = false, path = []) => {
                let foundInBranch = false;
                nodes.forEach(node => {
                    node.isCurrent = Number(node.id) === Number(taskId)
                    node.isAncestor = false
                    node.isDescendant = currentFound

                    if (node.isCurrent) {
                        foundInBranch = true
                        path.forEach(ancestor => { ancestor.isAncestor = true })
                    }

                    if (node.children.length > 0) {
                        const childFound = markNodes(node.children, currentFound || node.isCurrent, [...path, node])
                        if (childFound) foundInBranch = true
                    }
                })
                return foundInBranch
            }

            markNodes(roots)
            setLevels(roots)

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
        levels,
        loading,
        error,
        reload: load
    }
}
