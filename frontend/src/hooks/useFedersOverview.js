import { useEffect, useState, useCallback } from 'react'
import { federsApi } from '../api/feders'

const EMPTY = { c_level: [], areas: {} }

export default function useFedersOverview(initial = {}) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [params, setParams] = useState(initial)

  const refresh = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const json = await federsApi.overview(params)
      setData({ ...EMPTY, ...json })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, params, setParams, refresh }
}
