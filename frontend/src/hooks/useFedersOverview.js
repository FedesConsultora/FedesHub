import { useEffect, useState } from 'react'
import { federsApi } from '../api/feders'

const EMPTY = { c_level: [], tri: { tecnologia: [], performance: [], marketing: [] }, celulas: [] }

export default function useFedersOverview(initial = { celulas_estado: 'activa', limit_celulas: 200 }) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [params, setParams] = useState(initial)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const json = await federsApi.overview(params)
        console.log('feder overview: ', json)
        if (alive) setData({ ...EMPTY, ...json })
      } catch (e) {
        if (alive) setError(e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [params])

  return { data, loading, error, params, setParams }
}
