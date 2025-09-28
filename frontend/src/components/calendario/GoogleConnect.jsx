// src/components/calendario/GoogleConnect.jsx
import { useRef } from 'react'
import { useGoogleBridge } from '../../hooks/useCalendario'
import './GoogleConnect.scss'

export default function GoogleConnect({ onChanged }) {
  const {
    loading, account, locals, remotes, vinculos,
    connect, link, syncOne, startWatch, stopWatch, reload
  } = useGoogleBridge(true)

  const localRef = useRef(null)
  const remoteRef = useRef(null)

  if (!account) {
    const missingUrl = !import.meta.env.VITE_GOOGLE_CONNECT_URL && !hasConnectUrl()
    return (
      <button className="fh-btn accent" disabled={loading} onClick={connect}>
        {loading ? '...' : (missingUrl ? 'Configurar OAuth' : 'Conectar Google')}
      </button>
    )
  }

  return (
    <details className="gc-dd">
      <summary className="fh-btn ghost">{account.email || 'Google'}</summary>
      <div className="gc-card">
        <div className="row">
          <div className="label">Vincular</div>
          <div className="val">
            <select ref={localRef} className="fh-input">
              {locals.map(l=><option key={l.id} value={l.id}>{l.nombre || `Local #${l.id}`}</option>)}
            </select>
            <span>⇄</span>
            <select ref={remoteRef} className="fh-input">
              {remotes.map(r=>{
                const id = r.id || r.google_calendar_id || r.calendarId || r.resourceId
                const name = r.summary || r.name || r.primary ? `${r.summary || 'Principal'} ⭐` : (r.summary || r.name || id)
                return <option key={id} value={id}>{name}</option>
              })}
            </select>
            <button className="fh-btn tiny" onClick={async ()=>{
              await link(Number(localRef.current.value), String(remoteRef.current.value), 'both')
              onChanged?.(); 
            }}>Vincular</button>
          </div>
        </div>

        <div className="row">
          <div className="label">Acciones</div>
          <div className="val">
            <button className="fh-btn tiny" onClick={async ()=>{
              const id = Number(localRef.current?.value || locals[0]?.id)
              if (id) { await syncOne(id); onChanged?.() }
            }}>Sync</button>
            <button className="fh-btn tiny" onClick={async ()=>{
              const id = Number(localRef.current?.value || locals[0]?.id)
              if (id) await startWatch(id)
            }}>Watch ON</button>
            {vinculos?.map(ch=>(
              <button key={ch.channel_id} className="fh-btn tiny" onClick={async ()=>{
                await stopWatch(ch.channel_id, ch.resource_id); await reload()
              }}>Stop {ch.channel_id.slice(0,6)}…</button>
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}

function hasConnectUrl(){
  try { return !!(window?.calendarioApi?.google?.connectUrl?.()) } catch { return false }
}