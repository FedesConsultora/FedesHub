// src/components/ausencias/dialogs/AbsenceForm.jsx
import { useMemo, useState } from 'react'
import { ausenciasApi } from '../../../api/ausencias'
import './Dialog.scss'

const two = n => String(n).padStart(2,'0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}` }
const WORKDAY_HOURS = Number(import.meta.env.VITE_WORKDAY_HOURS || 8)

export default function AbsenceForm({ onCancel, onCreated, initDate=null, tipos=[], saldos=[], canApprove=false }) {
  const [tipoId, setTipoId] = useState('')
  const [desde, setDesde] = useState(initDate || today())
  const [hasta, setHasta] = useState(initDate || today())
  const [medio, setMedio] = useState(false)
  const [mitad, setMitad] = useState(1)
  const [horas, setHoras] = useState('')
  const [motivo, setMotivo] = useState('')
  const [approveNow, setApproveNow] = useState(canApprove)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const tipo = useMemo(()=> tipos.find(t => t.id===Number(tipoId)) || null, [tipoId, tipos])
  const unidad = tipo?.unidad?.codigo || null
  const saldoByTipo = useMemo(()=> Object.fromEntries(saldos.map(s=>[s.tipo_id,s])), [saldos])
  const disponible = tipo ? Number(saldoByTipo[tipo.id]?.disponible || 0) : 0

  function requestedAmount() {
    if (!tipo) return 0
    if (unidad==='hora') return horas ? Number(horas) : estimateHours()
    if (medio) return 0.5
    const d1 = new Date(desde+'T00:00:00'), d2 = new Date(hasta+'T00:00:00')
    return Math.floor((d2-d1)/86400000)+1
  }
  function estimateHours() {
    if (unidad!=='hora') return 0
    const d1 = new Date(desde+'T00:00:00'), d2 = new Date(hasta+'T00:00:00')
    const days = Math.floor((d2-d1)/86400000)+1
    return (medio ? 0.5 : days) * WORKDAY_HOURS
  }
  const exceed = tipo ? requestedAmount() > disponible : false

  async function submit() {
    setError(null); setSubmitting(true)
    try {
      const body = {
        tipo_id: Number(tipoId),
        fecha_desde: desde,
        fecha_hasta: hasta,
        es_medio_dia: unidad==='dia' ? !!medio : false,
        mitad_dia_id: unidad==='dia' && medio ? Number(mitad) : undefined,
        duracion_horas: unidad==='hora' ? (horas ? Number(horas) : estimateHours()) : undefined,
        motivo: motivo || undefined
      }
      const row = await ausenciasApi.aus.meCreate(body)
      if (approveNow) { try { await ausenciasApi.aus.approve(row.id) } catch {} }
      onCreated?.(row)
    } catch (e) { setError(e?.fh?.message || e?.message || 'Error') }
    finally { setSubmitting(false) }
  }

  const disabled = !tipoId || !desde || !hasta || submitting

  return (
    <div className="dlg-form">
      <label>Tipo</label>
      <select className="fh-input" value={tipoId} onChange={e=>setTipoId(e.target.value)}>
        <option value="" disabled>Elegí un tipo…</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.unidad?.codigo})</option>)}
      </select>

      <div className="row">
        <div>
          <label>Desde</label>
          <input type="date" className="fh-input" value={desde} onChange={e=>setDesde(e.target.value)} />
        </div>
        <div>
          <label>Hasta</label>
          <input type="date" className="fh-input" value={hasta} onChange={e=>setHasta(e.target.value)} />
        </div>
      </div>

      {unidad==='dia' && (
        <div className="row">
          <label className="inline"><input type="checkbox" checked={medio} onChange={e=>setMedio(e.target.checked)} /> Medio día</label>
          {medio && (
            <select className="fh-input" value={mitad} onChange={e=>setMitad(e.target.value)}>
              <option value={1}>Mañana</option>
              <option value={2}>Tarde</option>
            </select>
          )}
        </div>
      )}

      {unidad==='hora' && (
        <div>
          <label>Duración (horas)</label>
          <input type="number" min="1" step="0.5" className="fh-input" value={horas} onChange={e=>setHoras(e.target.value)} />
          <small className="muted">Si lo dejás vacío: {estimateHours()} h (estimado por días).</small>
        </div>
      )}

      <div>
        <label>Motivo</label>
        <textarea className="fh-input" rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} />
      </div>

      {tipo && (
        <div className="hint">
          Disponible para <b>{tipo.nombre}</b>: <b>{disponible}</b> {unidad==='hora' ? 'h' : 'd'} ·
          Vas a solicitar: <b>{requestedAmount()}</b> {unidad==='hora' ? 'h' : 'd'}
          {exceed && <span className="warn"> (excede disponible)</span>}
        </div>
      )}

      {canApprove && (
        <label className="inline">
          <input type="checkbox" checked={approveNow} onChange={e=>setApproveNow(e.target.checked)} />
          Aprobar inmediatamente
        </label>
      )}

      {error && <div className="fh-err">{error}</div>}

      <div className="actions">
        <button className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="fh-btn primary" disabled={disabled} onClick={submit}>
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
