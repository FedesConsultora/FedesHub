// src/api/client.js
import axios from 'axios'
const CSRF_COOKIE = 'fh_csrf'
const API_PATH = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')
const DEBUG = false

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  withCredentials: true,
  timeout: 26000
})

let CSRF = null
let csrfPromise = null

const isUnsafe = (m) => /^(post|put|patch|delete)$/i.test(m || '')
const isAuthPath = (u = '') => /\/auth\/(login|refresh|csrf)$/.test(u || '')

// Fuerza pedir/renovar el token CSRF cuando force=true
export async function ensureCsrf(force = false) {
  if (CSRF && !force) return CSRF
  if (!csrfPromise) {
    csrfPromise = api.post('/auth/csrf', null, { headers: { 'X-Skip-CSRF': '1' } })
      .then(({ data }) => {
        CSRF = data?.csrf || null
        if (CSRF) {
          // deja el token como default y también lo mandamos en request interceptor
          api.defaults.headers.common['X-CSRF-Token'] = CSRF
          api.defaults.headers.common['X-CSRF'] = CSRF
          api.defaults.headers.common['X-XSRF-TOKEN'] = CSRF

          // 👇 aseguro que la cookie exista YA mismo (evita 403 en el primer login)
          try {
            const got = document.cookie.split('; ').find(c => c.startsWith(CSRF_COOKIE + '='))
            const val = got ? decodeURIComponent(got.split('=')[1]) : null
            if (val !== CSRF) {
              const parts = [
                `${CSRF_COOKIE}=${encodeURIComponent(CSRF)}`,
                `Path=${API_PATH}`,
                'SameSite=Lax'
              ]
              if (location.protocol === 'https:') parts.push('Secure')
              document.cookie = parts.join('; ')
            }
          } catch { }
        }
        if (DEBUG) console.log('[auth] CSRF ok:', !!CSRF)
        return CSRF
      })
      .catch((e) => {
        if (DEBUG) console.log('[auth] CSRF FAIL:', e?.message || e)
        return null
      })
      .finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

export function parseApiError(error) {
  const r = error?.response, d = r?.data
  return {
    status: r?.status || 0,
    message: d?.message || (typeof d?.error === 'string' ? d.error : d?.error?.message) || error?.message || 'Error inesperado',
    code: d?.code || d?.error?.code || null,
    path: r?.config?.url || null,
    method: r?.config?.method || null
  }
}

api.interceptors.request.use(async (cfg) => {
  // Para métodos “inseguros”, asegura y adjunta CSRF (salvo endpoints de auth explícitos)
  if (isUnsafe(cfg.method) && !/\/auth\/csrf$/.test(cfg.url || '') && !cfg.headers?.['X-Skip-CSRF']) {
    if (!CSRF) await ensureCsrf()
    if (CSRF) {
      cfg.headers['X-CSRF-Token'] = CSRF
      cfg.headers['X-CSRF'] = CSRF
      cfg.headers['X-XSRF-TOKEN'] = CSRF
    }
  }
  if (DEBUG) console.log('[api:req]', cfg.method?.toUpperCase(), cfg.url, { baseURL: cfg.baseURL })
  return cfg
})

let isRefreshing = false
let queue = []

async function performRefresh() {
  if (DEBUG) console.log('[auth] refresh…')
  // El refresh usa cookie y NO requiere CSRF
  await api.post('/auth/refresh', null, { headers: { 'X-Skip-CSRF': '1' } })
  // Tras refrescar sesión/cookies, el CSRF pudo rotar: resincroniza
  CSRF = null
  await ensureCsrf(true)
}

api.interceptors.response.use(
  (r) => {
    if (DEBUG) console.log('[api:res]', r.status, r.config.method?.toUpperCase(), r.config.url)
    return r
  },
  async (err) => {
    const { config, response } = err || {}
    if (DEBUG) console.log('[api:err]', response?.status, config?.method?.toUpperCase(), config?.url, err?.message)

    // 403 por CSRF inválido → fuerza renovar CSRF y reintenta 1 vez
    if (response?.status === 403 && !config.__csrfRetry) {
      const msg = (response?.data?.message || response?.data?.error?.message || '').toLowerCase()
      const code = response?.data?.code || response?.data?.error?.code || ''
      const looksLikeCsrf =
        /csrf|xsrf/.test(msg) || code === 'EBADCSRFTOKEN' || /inválid|invalid|bad/.test(msg)

      if (looksLikeCsrf) {
        try {
          config.__csrfRetry = true
          await ensureCsrf(true)
          if (CSRF) {
            config.headers = config.headers || {}
            config.headers['X-CSRF-Token'] = CSRF
            config.headers['X-CSRF'] = CSRF
            config.headers['X-XSRF-TOKEN'] = CSRF
          }
          if (DEBUG) console.log('[auth] retry after CSRF refresh:', config.method?.toUpperCase(), config.url)
          return api(config)
        } catch (e) {
          if (DEBUG) console.log('[auth] CSRF retry FAIL:', e?.message || e)
        }
      }
    }

    // 401 → refresca sesión y reintenta (con cola anti “stampede”)
    if (response?.status === 401 && !config.__isRetry && !isAuthPath(config.url)) {
      config.__isRetry = true
      try {
        if (!isRefreshing) {
          isRefreshing = true
          await performRefresh()
          isRefreshing = false
          queue.forEach(q => q.resolve())
          queue = []
        } else {
          await new Promise((resolve) => queue.push({ resolve }))
        }
        if (DEBUG) console.log('[auth] retry:', config.method?.toUpperCase(), config.url)
        return api(config)
      } catch (e) {
        if (DEBUG) console.log('[auth] refresh FAIL:', e?.message || e)
        isRefreshing = false
        queue = []
      }
    }

    err.fh = parseApiError(err)
    return Promise.reject(err)
  }
)
