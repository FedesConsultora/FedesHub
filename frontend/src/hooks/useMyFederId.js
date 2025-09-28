// /frontend/src/hooks/useMyFederId.js
import { useEffect, useState } from 'react'
import { useAuthCtx } from '../context/AuthContext.jsx'
import { federsApi } from '../api/feders'

export default function useMyFederId() {
  const { user, booted } = useAuthCtx()
  const [federId, setFederId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function run() {
      if (!booted) return
      try {
        const fid =
          user?.feder?.id || user?.profile?.feder_id || user?.feder_id || null
        if (fid) {
          if (!alive) return
          setFederId(fid)
          return
        }
        if (user?.id) {
          try {
            const me = await federsApi.getMine()
            if (!alive) return
            if (me?.id) { setFederId(me.id); return }
          } catch {}
          try {
            const byU = await federsApi.getByUserId(user.id)
            if (!alive) return
            if (byU?.id) { setFederId(byU.id); return }
          } catch {}
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [booted, user])

  return { federId, loading }
}
