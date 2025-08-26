// src/api/client.js
import axios from 'axios'
const DEBUG = true

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  withCredentials: true,
  timeout: 8000
})

let CSRF = null
let csrfPromise = null

const isUnsafe   = (m) => /^(post|put|patch|delete)$/i.test(m || '')
const isAuthPath = (u = '') => /\/auth\/(login|refresh|csrf)$/.test(u || '')

export async function ensureCsrf() {
  if (CSRF) return CSRF
  if (!csrfPromise) {
    csrfPromise = api.post('/auth/csrf', null, { headers: { 'X-Skip-CSRF': '1' } })
      .then(({ data }) => {
        CSRF = data?.csrf || null
        if (CSRF) api.defaults.headers.common['X-CSRF-Token'] = CSRF
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
    message: d?.message || d?.error?.message || error?.message || 'Error inesperado',
    code: d?.code || d?.error?.code || null,
    path: r?.config?.url || null,
    method: r?.config?.method || null
  }
}

api.interceptors.request.use(async (cfg) => {
  if (isUnsafe(cfg.method) && !/\/auth\/csrf$/.test(cfg.url || '') && !cfg.headers?.['X-Skip-CSRF']) {
    if (!CSRF) await ensureCsrf()
    if (CSRF) cfg.headers['X-CSRF-Token'] = CSRF
  }
  if (DEBUG) console.log('[api:req]', cfg.method?.toUpperCase(), cfg.url, { baseURL: cfg.baseURL })
  return cfg
})

let isRefreshing = false
let queue = []

async function performRefresh() {
  await ensureCsrf()
  if (DEBUG) console.log('[auth] refresh…')
  return api.post('/auth/refresh', null, { headers: { 'X-Skip-CSRF': '1' } })
}

api.interceptors.response.use(
  (r) => {
    if (DEBUG) console.log('[api:res]', r.status, r.config.method?.toUpperCase(), r.config.url)
    return r
  },
  async (err) => {
    const { config, response } = err || {}
    if (DEBUG) console.log('[api:err]', response?.status, config?.method?.toUpperCase(), config?.url, err?.message)

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