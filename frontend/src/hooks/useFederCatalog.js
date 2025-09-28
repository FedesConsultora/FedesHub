// /frontend/src/hooks/useFederCatalog.js
import { useEffect, useState } from 'react'
import { federsApi } from '../api/feders'

export default function useFederCatalog(initial = null) {
  const [catalog, setCatalog] = useState(initial)
  const [loading, setLoading] = useState(!initial)

  useEffect(() => {
    let alive = true
    if (initial) { setLoading(false); return }
    ;(async () => {
      try {
        const cat = await federsApi.catalog()
        if (alive) setCatalog(cat)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [initial])

  return { catalog, loading }
}
