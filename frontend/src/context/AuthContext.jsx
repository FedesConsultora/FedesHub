import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as auth from '../api/auth'
import { ensureCsrf } from '../api/client'

const Ctx = createContext(null)
const BOOT_TIMEOUT_MS = 5000
const DEBUG = true

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let sharedBootPromise = null

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [roles, setRoles] = useState([])
  const [perms, setPerms] = useState([])
  console.log('usuario: ', user);
  const [booted, setBooted] = useState(false)
  const [bootError, setBootError] = useState(null)

  useEffect(() => {
    let alive = true

    async function doBootOnce() {
      if (!sharedBootPromise) {
        sharedBootPromise = (async () => {
          try {
            if (DEBUG) console.log('[boot] start')
            await ensureCsrf().catch(() => {})

            const boot = (async () => {
              try {
                const resp = await auth.getSession().catch((e) => {
                  if (DEBUG) console.log('[boot] /auth/me FAIL:', e?.fh || e?.message || e)
                  return { status: 401, data: null }
                })
                const status = resp?.status ?? 401
                const data   = resp?.data ?? null
                return status === 200 ? { ok:true, data } : { ok:false, data:null }
              } catch (e) {
                if (DEBUG) console.log('[boot] exception:', e?.message || e)
                return { ok:false, data:null }
              }
            })()

            const timed = Promise.race([
              boot,
              (async () => { await sleep(BOOT_TIMEOUT_MS); return { ok:false, timeout:true } })()
            ])

            return await timed
          } finally {
            if (DEBUG) console.log('[boot] end (sharedPromise resolved)')
          }
        })()
      }
      return sharedBootPromise
    }

    ;(async () => {
      const result = await doBootOnce()
      if (!alive) return

      if (result.ok) {
        setUser(result.data?.user || null)
        setRoles(result.data?.roles || [])
        setPerms(result.data?.permisos || [])
        setBootError(null)
        if (DEBUG) console.log('[boot] OK user:', result.data?.user?.email)
      } else {
        setUser(null); setRoles([]); setPerms([])
        setBootError(result.timeout ? 'Tiempo de espera al iniciar sesión' : null)
        if (DEBUG) console.log('[boot] NO-SESSION', result.timeout ? '(timeout)' : '')
      }
      setBooted(true)
    })()

    return () => { alive = false }
  }, [])

  const hasPerm = (m, a) =>
    perms.includes(`${m}.${a}`) || perms.includes('*.*') || perms.includes(`${m}.*`) || perms.includes(`*.${a}`)

  const value = useMemo(() => ({
    user, roles, perms, booted, bootError, hasPerm,
    async login(email, password) {
      if (DEBUG) console.log('[auth] login', email)
      await ensureCsrf(true)
      await auth.login(email, password)
      await ensureCsrf(true)
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
  }), [user, roles, perms, booted, bootError])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Hooks
export const useAuthCtx = () => useContext(Ctx)
// 👇 alias para que puedas importar { useAuth } sin cambiar otros archivos
export { useAuthCtx as useAuth }
