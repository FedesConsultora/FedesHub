// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as auth from '../api/auth'
import { ensureCsrf } from '../api/client'

const Ctx = createContext(null)
const BOOT_TIMEOUT_MS = 5000
const DEBUG = true

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Helpers de timing que no rompen si se llama 2 veces (StrictMode)
const makeSafeTimer = () => {
  const active = new Set()
  return {
    start: (label) => {
      if (!active.has(label)) {
        active.add(label)
        console.time?.(label)
      }
    },
    end: (label) => {
      if (active.has(label)) {
        active.delete(label)
      }
    }
  }
}
const t = makeSafeTimer()

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [roles, setRoles] = useState([])
  const [perms, setPerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState(null)

  // Flag para ejecutar el boot SOLO una vez (StrictMode dobla los efectos)
  const didBoot = useRef(false)

  useEffect(() => {
    if (didBoot.current) return
    didBoot.current = true

    let cancelled = false

    const runBoot = async () => {
      t.start('[boot] total')
      try {
        const boot = (async () => {
          try {
            await ensureCsrf().catch(() => {})
            t.end('[boot] csrf')

            t.start('[boot] me')
            const resp = await auth.getSession().catch((e) => {
              if (DEBUG) console.log('[boot] /auth/me FAIL:', e?.fh || e?.message || e)
              return { status: 401, data: null }
            })
            t.end('[boot] me')

            const status = resp?.status ?? 401
            const data = resp?.data ?? null

            if (status === 200) return { ok: true, data }
            return { ok: false, data: null }
          } catch (e) {
            if (DEBUG) console.log('[boot] exception:', e?.message || e)
            return { ok: false, data: null }
          }
        })()

        const timed = Promise.race([
          boot,
          (async () => { await sleep(BOOT_TIMEOUT_MS); return { ok:false, timeout:true } })()
        ])

        const result = await timed
        if (cancelled) return

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
      } finally {
        if (!cancelled) setLoading(false)
        t.end('[boot] total')
      }
    }

    runBoot()
    return () => { cancelled = true }
  }, [])

  const hasPerm = (m, a) =>
    perms.includes(`${m}.${a}`) || perms.includes('*.*') || perms.includes(`${m}.*`) || perms.includes(`*.${a}`)

  const value = useMemo(() => ({
    user, roles, perms, loading, bootError, hasPerm,
    async login(email, password) {
      if (DEBUG) console.log('[auth] login', email)
      await auth.login(email, password)
      const { data } = await auth.getSession()
      setUser(data?.user || null)
      setRoles(data?.roles || [])
      setPerms(data?.permisos || [])
      return data
    },
    async logout() {
      try { await auth.logout() } finally { setUser(null); setRoles([]); setPerms([]) }
    },
    async changePassword(payload) {
      return auth.changePass(payload)
    }
  }), [user, roles, perms, loading, bootError])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuthCtx = () => useContext(Ctx)