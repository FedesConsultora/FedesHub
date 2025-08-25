import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../api/auth'
import { ensureCsrf } from '../api/client'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [perms, setPerms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // preparar CSRF y levantar sesión
    ensureCsrf()
      .then(() => auth.getSession())
      .then(({ data }) => {
        setUser(data?.user || null)
        setRoles(data?.roles || [])
        setPerms(data?.permisos || [])
      })
      .catch(() => { setUser(null); setRoles([]); setPerms([]) })
      .finally(() => setLoading(false))
  }, [])

  const hasPerm = (m, a) =>
    perms.includes(`${m}.${a}`) || perms.includes('*.*') || perms.includes(`${m}.*`) || perms.includes(`*.${a}`)

  const value = useMemo(() => ({
    user, roles, perms, loading, hasPerm,
    async login(email, password) {
      await auth.login(email, password)
      const { data } = await auth.getSession()
      setUser(data?.user || null)
      setRoles(data?.roles || [])
      setPerms(data?.permisos || [])
      return data
    },
    async logout() {
      try { await auth.logout() } finally {
        setUser(null); setRoles([]); setPerms([])
      }
    },
    async changePassword(payload) {
      return auth.changePass(payload)
    }
  }), [user, roles, perms, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuthCtx = () => useContext(Ctx)