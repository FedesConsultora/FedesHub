// src/pages/Diag.jsx
import { useState } from 'react'
import { api, ensureCsrf } from '../api/client'

export default function Diag() {
  const [out, setOut] = useState('')
  const log = (title, data) => setOut(prev => `${title}\n${JSON.stringify(data, null, 2)}\n\n${prev}`)

  const ping = async (url, method='get') => {
    try {
      const r = await api.request({ url, method })
      log(`${method.toUpperCase()} ${url} -> ${r.status}`, r.data)
    } catch (e) {
      log(`${method.toUpperCase()} ${url} ERROR`, { status: e?.response?.status, err: e?.message })
    }
  }

  return (
    <div style={{padding:16}}>
      <h2>Diag</h2>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button onClick={() => ping('/auth/health')}>GET /auth/health</button>
        <button onClick={() => ensureCsrf()}>POST /auth/csrf</button>
        <button onClick={() => ping('/auth/me')}>GET /auth/me</button>
      </div>
      <pre style={{whiteSpace:'pre-wrap', marginTop:12, background:'#111', padding:12, borderRadius:8}}>
        {out || 'Sin salida aún…'}
      </pre>
    </div>
  )
}
