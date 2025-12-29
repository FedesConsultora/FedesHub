// /frontend/src/hooks/useFederDetail.js
import { useCallback, useEffect, useState } from 'react'
import { federsApi } from '../api/feders'

export default function useFederDetail(federId, { listen = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!federId) return
    setError(null)
    // Usamos el estado anterior para decidir si mostrar el spinner global
    setLoading(prevLoading => {
      // Si ya tenemos data, no mostramos loading global (evita parpadeo)
      // Pero si es el primer fetch, sí mostramos loading.
      return data ? false : true
    })

    try {
      const f = await federsApi.get(federId)
      setData(f)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [federId])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!listen || !federId) return
    const handler = (ev) => {
      const d = ev?.detail || {}
      const id = Number(d?.feder_id || d?.feder?.id || d?.payload?.feder_id || 0)
      if (id === Number(federId)) refetch()
    }
    window.addEventListener('fh:push', handler)
    return () => window.removeEventListener('fh:push', handler)
  }, [listen, federId, refetch])

  const toggleActive = async () => {
    if (!data) return
    const next = !data.is_activo
    await federsApi.setActive(data.id, next)
    await refetch()
  }

  return { data, loading, error, refetch, toggleActive, setData }
}
