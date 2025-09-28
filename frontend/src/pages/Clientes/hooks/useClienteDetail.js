// frontend/src/modules/clientes/pages/hooks/useClienteDetail.js
import { useCallback, useEffect, useState } from 'react'
import { clientesApi } from '../../../api/clientes' // ajustá si tu ruta difiere

export function useClienteDetail(id) {
  const [cliente, setCliente] = useState(null)
  const [contactos, setContactos] = useState([])
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!id) { setCliente(null); setContactos([]); setTareas([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      // preferimos detail(); si tu backend devuelve {cliente, contactos, tareas} o un solo objeto, soporta ambos
      const data = await (typeof clientesApi.detail === 'function'
        ? clientesApi.detail(id, { with: 'contactos,tareas' })
        : clientesApi.get(id))

      const cli = data?.cliente ?? data
      setCliente(cli)
      setContactos(data?.contactos ?? cli?.contactos ?? [])
      setTareas(data?.tareas ?? cli?.tareas ?? [])
    } catch (e) {
      setError(e?.fh?.message || e.message)
      setCliente(null); setContactos([]); setTareas([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  return { cliente, contactos, tareas, loading, error, refetch: load }
}