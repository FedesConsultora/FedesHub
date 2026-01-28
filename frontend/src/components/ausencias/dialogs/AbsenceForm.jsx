import { useMemo, useState, useEffect } from 'react'
import { FiTag, FiCalendar, FiClock, FiMessageCircle, FiCheckCircle, FiHash, FiPaperclip, FiX } from 'react-icons/fi'
import { ausenciasApi } from '../../../api/ausencias'
import { useAuth } from '../../../context/AuthContext'
import PremiumSelect from '../../ui/PremiumSelect'
import './Dialog.scss'

const two = n => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` }
const WORKDAY_HOURS = Number(import.meta.env.VITE_WORKDAY_HOURS || 8)

export default function AbsenceForm({ onCancel, onCreated, initDate = null, initHasta = null, tipos = [], saldos = [], canApprove = false, editingItem = null }) {
  const [tipoId, setTipoId] = useState(editingItem?.tipo_id || '')
  const [desde, setDesde] = useState(editingItem?.fecha_desde || initDate || today())
  const [hasta, setHasta] = useState(editingItem?.fecha_hasta || initHasta || initDate || today())
  const [medio, setMedio] = useState(editingItem?.es_medio_dia || false)
  const [mitad, setMitad] = useState(editingItem?.mitad_dia_id || 1)
  const [horas, setHoras] = useState(editingItem?.duracion_horas || '')
  const [motivo, setMotivo] = useState(editingItem?.motivo || '')
  const [approveNow, setApproveNow] = useState(false) // Lo seteamos en un useEffect mejor o calculamos después
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const { roles, user } = useAuth()
  const isRRHH = roles.includes('RRHH')
  const isEditingSelf = !editingItem || String(editingItem.user_id) === String(user?.id)

  // Un RRHH no puede auto-aprobarse
  const canFinalApprove = canApprove && !(isRRHH && isEditingSelf)

  const tipo = useMemo(() => tipos.find(t => t.id === Number(tipoId)) || null, [tipoId, tipos])
  const unidad = tipo?.unidad?.codigo || tipo?.unidad_codigo || null
  const saldoByTipo = useMemo(() => Object.fromEntries(saldos.map(s => [s.tipo_id, s])), [saldos])
  const disponible = tipo ? Number(saldoByTipo[tipo.id]?.disponible || 0) : 0

  const [horaDesde, setHoraDesde] = useState(editingItem?.hora_desde || '09:00')
  const [horaHasta, setHoraHasta] = useState(editingItem?.hora_hasta || '13:00')

  useEffect(() => {
    setApproveNow(canFinalApprove && editingItem?.estado_codigo !== 'aprobada')
  }, [canFinalApprove, editingItem])

  // Auto-calcular horas si cambian los tiempos
  useMemo(() => {
    if (unidad === 'hora' && !horas) {
      const [h1, m1] = horaDesde.split(':').map(Number)
      const [h2, m2] = horaHasta.split(':').map(Number)
      let diff = (h2 + m2 / 60) - (h1 + m1 / 60)
      if (diff < 0) diff += 24 // por si cruza medianoche (raro pero posible)
      // setHoras(diff.toFixed(1)) // No podemos usar setState en useMemo, lo haremos en useEffect o al cambiar input
    }
  }, [horaDesde, horaHasta, unidad, horas])

  const calculatedHoras = useMemo(() => {
    if (unidad !== 'hora') return 0
    const [h1, m1] = horaDesde.split(':').map(Number)
    const [h2, m2] = horaHasta.split(':').map(Number)
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60)
    if (diff < 0) diff += 24
    return Number(diff.toFixed(1))
  }, [horaDesde, horaHasta, unidad])

  function requestedAmount() {
    if (!tipo) return 0
    if (unidad === 'hora') return horas ? Number(horas) : calculatedHoras
    if (medio) return 0.5

    // Contar días hábiles (excluir fines de semana)
    let count = 0
    let cur = new Date(desde + 'T00:00:00')
    const last = new Date(hasta + 'T00:00:00')
    while (cur <= last) {
      const wd = cur.getDay()
      if (wd !== 0 && wd !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }
  function estimateHours() {
    if (unidad !== 'hora') return 0
    const d1 = new Date(desde + 'T00:00:00'), d2 = new Date(hasta + 'T00:00:00')
    const days = Math.floor((d2 - d1) / 86400000) + 1
    const total = (medio ? 0.5 : days) * WORKDAY_HOURS
    return isNaN(total) ? 0 : total
  }
  const exceed = tipo ? requestedAmount() > disponible : false

  async function submit() {
    setError(null); setSubmitting(true)
    try {
      // Validar saldo solo para NUEVAS ausencias (no para editar)
      if (!editingItem && exceed) {
        setError('No tienes saldo suficiente para esta ausencia. Por favor, solicita una asignación de cupo primero.')
        setSubmitting(false)
        return
      }

      const body = {
        tipo_id: Number(tipoId),
        fecha_desde: desde,
        fecha_hasta: unidad === 'hora' ? desde : hasta, // Si es hora, forzamos un solo día
        es_medio_dia: unidad === 'dia' ? !!medio : false,
        mitad_dia_id: (unidad === 'dia' && medio) ? Number(mitad) : undefined,
        duracion_horas: unidad === 'hora' ? (horas ? Number(horas) : calculatedHoras) : undefined,
        motivo: motivo || undefined,
        archivo_url: undefined
      }

      if (file) {
        const { url } = await ausenciasApi.upload(file)
        body.archivo_url = url
      }

      let row;
      if (editingItem) {
        row = await ausenciasApi.aus.update(editingItem.id, body)
      } else {
        row = await ausenciasApi.aus.meCreate(body)
      }

      if (approveNow && row.estado_codigo === 'pendiente') {
        try { await ausenciasApi.aus.approve(row.id) } catch { }
      }
      onCreated?.(row)
      window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia' } }))
    } catch (e) {
      setError(e?.response?.data?.error || e?.fh?.message || e?.message || 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const hasExistingFile = !!editingItem?.archivo_url
  const disabled = !tipoId || !desde || (!hasta && unidad !== 'hora') || submitting || (!editingItem && exceed)

  const tipoOptions = useMemo(() => tipos.map(t => ({
    value: t.id,
    label: `${t.nombre} (${(t.unidad?.codigo || t.unidad_codigo) === 'hora' ? 'Horas' : 'Días'})`,
    meta: t
  })), [tipos])

  return (
    <form className="dlg-form" onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault() }}>
      <div className="section">
        <PremiumSelect
          label="Tipo de Ausencia"
          icon={FiTag}
          placeholder="Selecciona el motivo..."
          options={tipoOptions}
          value={tipoId}
          onChange={val => {
            setTipoId(val)
            setHoras('')
          }}
        />
      </div>

      <div className={unidad === 'hora' ? '' : 'row-grid'}>
        <div className="section">
          <label><FiCalendar /> Fecha {unidad === 'hora' ? 'de la ausencia' : 'Desde'}</label>
          <input type="date" className="fh-input" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        {unidad !== 'hora' && (
          <div className="section">
            <label><FiCalendar /> Fecha Hasta</label>
            <input type="date" className="fh-input" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
      </div>

      {unidad === 'dia' && (
        <div className="section">
          <label><FiClock /> Duración del día</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="check-row">
              <input type="checkbox" checked={medio} onChange={e => setMedio(e.target.checked)} />
              <span>Medio día</span>
            </label>
            {medio && (
              <select className="fh-input" style={{ flex: 1 }} value={mitad} onChange={e => setMitad(e.target.value)}>
                <option value={1}>Mañana (AM)</option>
                <option value={2}>Tarde (PM)</option>
              </select>
            )}
          </div>
        </div>
      )}

      {unidad === 'hora' && (
        <>
          <div className="row-grid">
            <div className="section">
              <label><FiClock /> Desde (Hora)</label>
              <input type="time" className="fh-input" value={horaDesde} onChange={e => setHoraDesde(e.target.value)} />
            </div>
            <div className="section">
              <label><FiClock /> Hasta (Hora)</label>
              <input type="time" className="fh-input" value={horaHasta} onChange={e => setHoraHasta(e.target.value)} />
            </div>
          </div>
          <div className="section">
            <label><FiHash /> Total Horas</label>
            <input
              type="number"
              min="0.5"
              step="0.1"
              className="fh-input"
              value={horas || calculatedHoras}
              onChange={e => setHoras(e.target.value)}
              placeholder="Ej: 4"
            />
            <small style={{ color: 'var(--fh-muted)', marginTop: 4 }}>
              Basado en el horario: <strong>{calculatedHoras}h</strong>. Puedes ajustarlo manualmente.
            </small>
          </div>
        </>
      )}

      <div className="section">
        <label><FiMessageCircle /> Motivo / Comentario</label>
        <textarea className="fh-input" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional..." />
      </div>

      <div className="section">
        <label><FiPaperclip /> Adjunto</label>
        {!file ? (
          <div className="file-upload-zone" onClick={() => document.getElementById('aus-file').click()}>
            <FiPaperclip />
            <span>Haz clic para adjuntar un comprobante</span>
            <input
              id="aus-file"
              type="file"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="file-selected">
            <FiCheckCircle color="var(--fh-accent)" />
            <span className="file-name">{file.name}</span>
            <button type="button" className="remove-file" onClick={() => setFile(null)}><FiX /></button>
          </div>
        )}
        {hasExistingFile && !file && (
          <div className="file-existing" style={{ marginTop: 8, fontSize: '0.85rem' }}>
            <a href={editingItem.archivo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--fh-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiPaperclip /> Ver archivo actual
            </a>
          </div>
        )}
      </div>

      {tipoId && (
        <div className={`hint ${exceed ? 'danger' : ''}`}>
          <div className="hint-row">
            <span>Disponible:</span>
            <b>{disponible} {unidad === 'hora' ? 'horas' : 'días'}</b>
          </div>
          <div className="hint-row">
            <span>Solicitado:</span>
            <b>{requestedAmount()} {unidad === 'hora' ? 'horas' : 'días'}</b>
          </div>
          {exceed && (
            <div className="warn-banner" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '12px 16px',
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#ef4444' }}>
                ⚠️ Saldo insuficiente
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--fh-text)' }}>
                No podrás crear esta solicitud hasta que tengas saldo disponible.
                {!editingItem && (
                  <strong style={{ display: 'block', marginTop: 4, color: 'var(--fh-accent)' }}>
                    💡 Primero solicita una asignación de cupo para este tipo de ausencia.
                  </strong>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="fh-err" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="actions">
        {canFinalApprove && (
          <label className="check-row" style={{ marginRight: 'auto' }}>
            <input type="checkbox" checked={approveNow} onChange={e => setApproveNow(e.target.checked)} />
            <span><FiCheckCircle /> Aprobar ahora</span>
          </label>
        )}
        <button type="button" className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="fh-btn primary" disabled={disabled} onClick={submit}>
          {submitting ? 'Guardando...' : editingItem ? 'Actualizar' : 'Solicitar'}
        </button>
      </div>
    </form>
  )
}
