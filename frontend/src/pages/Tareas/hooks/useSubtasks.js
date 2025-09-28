import { useCallback, useEffect, useState } from 'react'
import { tareasApi } from '../../../api/tareas'
import { parseApiError } from '../../../api/client'

export default function useSubtasks(parentId){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { rows } = await tareasApi.listChildren(parentId)
      setList(rows || [])
    } catch (e){
      setError(parseApiError(e)?.message || 'No se pudieron cargar las tareas hijas')
    } finally { setLoading(false) }
  }, [parentId])

  const create = useCallback(async ({ titulo, cliente_id }) => {
    if (!titulo?.trim()) throw new Error('Título requerido')
    const data = await tareasApi.createChild(parentId, { titulo: titulo.trim(), cliente_id })
    await load()
    return data
  }, [parentId, load])

  useEffect(() => { if (parentId) load() }, [parentId, load])

  return { list, loading, error, reload: load, create }
}
