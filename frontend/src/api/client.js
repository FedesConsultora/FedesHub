import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  withCredentials: true,
})

let CSRF_TOKEN = null
const isUnsafe = (m) => /^(post|put|patch|delete)$/i.test(m || '')

export async function ensureCsrf() {
  if (CSRF_TOKEN) return CSRF_TOKEN
  const { data } = await api.post('/auth/csrf')
  CSRF_TOKEN = data?.csrf || null
  return CSRF_TOKEN
}

api.interceptors.request.use(async (config) => {
  if (isUnsafe(config.method)) {
    if (!CSRF_TOKEN) { try { await ensureCsrf() } catch {} }
    if (CSRF_TOKEN) config.headers['X-CSRF-Token'] = CSRF_TOKEN
  }
  return config
})

let isRefreshing = false
let refreshQueue = []

async function performRefresh() {
  await ensureCsrf()
  await api.post('/auth/refresh')
}

api.interceptors.response.use(
  r => r,
  async (err) => {
    const { config, response } = err || {}
    if (response?.status === 401 && !config.__isRetry) {
      config.__isRetry = true
      try {
        if (!isRefreshing) {
          isRefreshing = true
          await performRefresh()
          isRefreshing = false
          refreshQueue.forEach(q => q.resolve())
          refreshQueue = []
        } else {
          await new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }))
        }
        return api(config)
      } catch (e) {
        isRefreshing = false
        refreshQueue.forEach(q => q.reject(e))
        refreshQueue = []
      }
    }
    err.fh = parseApiError(err)
    return Promise.reject(err)
  }
)

export function parseApiError(error) {
  const r = error?.response, d = r?.data
  return {
    status: r?.status || 0,
    message: d?.error?.message || d?.message || error?.message || 'Error inesperado',
    code: d?.error?.code || d?.code || null,
    details: d?.error?.details || d?.details || null,
    path: r?.config?.url || null,
    method: r?.config?.method || null,
  }
}
