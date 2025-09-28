// src/components/ausencias/dialogs/AllocationForm.jsx
import { useEffect, useState } from 'react'
import { ausenciasApi } from '../../../api/ausencias'
import './Dialog.scss'

export default function AllocationForm({ onCancel, onDone }) {
  const [tipos, setTipos] = useState([])
  const [tipoId, setTipoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [desde, setDesde] = useState(new Date().toISOString().slice(0,10))
  const [hasta, setHasta] = useState(new Date(new Date().getFullYear(),11,31).toISOString().slice(0,10))
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{ ausenciasApi.catalog.tipos().then(setTipos).catch(()=>{}) }, [])

  async function submit() {
    setSubmitting(true); setError(null)
    try {
      const t = tipos.find(x => x.id===Number(tipoId))
      const body = {
        tipo_id: Number(tipoId),
        unidad_id: t?.unidad?.id,
        cantidad_solicitada: Number(cantidad),
        vigencia_desde: desde,
        vigencia_hasta: hasta,
        motivo: motivo || undefined
      }
      await ausenciasApi.asignacion.create(body)
      onDone?.()
    } catch (e) { setError(e?.fh?.message || e?.message || 'Error') }
    finally { setSubmitting(false) }
  }

  const disabled = !tipoId || !cantidad || submitting

  return (
    <div className="dlg-form">
      <label>Tipo</label>
      <select className="fh-input" value={tipoId} onChange={e=>setTipoId(e.target.value)}>
        <option value="" disabled>Elegí un tipo…</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.unidad?.codigo})</option>)}
      </select>

      <label>Cantidad</label>
      <input className="fh-input" type="number" min="0.5" step="0.5" value={cantidad} onChange={e=>setCantidad(e.target.value)} />

      <div className="row">
        <div>
          <label>Vigencia desde</label>
          <input className="fh-input" type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
        </div>
        <div>
          <label>Vigencia hasta</label>
          <input className="fh-input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
        </div>
      </div>

      <label>Motivo</label>
      <textarea className="fh-input" rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} />

      {error && <div className="fh-err">{error}</div>}

      <div className="actions">
        <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="fh-btn primary" disabled={disabled} onClick={submit}>
          {submitting ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </div>
    </div>
  )
}
