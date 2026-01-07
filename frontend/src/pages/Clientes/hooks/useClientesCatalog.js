import { useEffect, useState, useCallback } from 'react'
import { clientesApi } from '../../../api/clientes'

export default function useClientesCatalog() {
  const [data, setData] = useState({ tipos: [], estados: [], ponderaciones: [1, 2, 3, 4, 5] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await clientesApi.catalog()
      setData(res || {})
    } catch (e) {
      setError(e?.fh?.message || e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
