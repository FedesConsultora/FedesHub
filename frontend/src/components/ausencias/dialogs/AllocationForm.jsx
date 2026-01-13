import { useEffect, useState, useMemo } from 'react'
import { FiTag, FiCalendar, FiMessageCircle, FiHash, FiPaperclip, FiX, FiCheckCircle } from 'react-icons/fi'
import { ausenciasApi } from '../../../api/ausencias'
import PremiumSelect from '../../ui/PremiumSelect'
import './Dialog.scss'

export default function AllocationForm({ onCancel, onDone, initDate = null }) {
  const [tipos, setTipos] = useState([])
  const [tipoId, setTipoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [desde, setDesde] = useState(initDate || new Date().toISOString().slice(0, 10))
  const [hasta, setHasta] = useState(initDate || new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10))
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)

  useEffect(() => {
    ausenciasApi.catalog.tipos().then(setTipos).catch(() => { })
  }, [])

  async function submit() {
    setSubmitting(true); setError(null)
    try {
      const t = tipos.find(x => x.id === Number(tipoId))
      const body = {
        tipo_id: Number(tipoId),
        unidad_id: t?.unidad?.id,
        cantidad_solicitada: Number(cantidad),
        vigencia_desde: desde,
        vigencia_hasta: hasta,
        motivo: motivo || undefined,
        archivo_url: undefined
      }

      if (file) {
        const { url } = await ausenciasApi.upload(file)
        body.archivo_url = url
      }
      await ausenciasApi.asignacion.create(body)
      window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'ausencia_asignacion' } }))
      onDone?.()
    } catch (e) { setError(e?.fh?.message || e?.message || 'Error') }
    finally { setSubmitting(false) }
  }

  const selectedTipo = tipos.find(x => x.id === Number(tipoId))
  const isHora = (selectedTipo?.unidad?.codigo || selectedTipo?.unidad_codigo) === 'hora'

  const disabled = !tipoId || !cantidad || submitting || !file

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
          placeholder="Selecciona el tipo a reforzar..."
          options={tipoOptions}
          value={tipoId}
          onChange={val => {
            setTipoId(val)
            setCantidad('')
          }}
        />
      </div>

      <div className="section">
        <label><FiHash /> {isHora ? 'Cantidad de Horas a solicitar' : 'Cantidad de Días a solicitar'}</label>
        <input
          className="fh-input"
          type="number"
          min="0.5"
          step={isHora ? "0.5" : "1"}
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          placeholder={isHora ? "Ej: 4 (para 4 horas extra)" : "Ej: 5 (para 5 días extra)"}
        />
      </div>

      <div className="row-grid">
        <div className="section">
          <label><FiCalendar /> Vigencia Desde</label>
          <input className="fh-input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="section">
          <label><FiCalendar /> Vigencia Hasta</label>
          <input className="fh-input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>

      <div className="section">
        <label><FiMessageCircle /> Motivo / Comentario</label>
        <textarea className="fh-input" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="¿Por qué necesitas estos días/horas adicionales?" />
      </div>

      <div className="section">
        <label><FiPaperclip /> Adjunto</label>
        {!file ? (
          <div className="file-upload-zone" onClick={() => document.getElementById('alloc-file').click()}>
            <FiPaperclip />
            <span>Haz clic para adjuntar sustento</span>
            <input
              id="alloc-file"
              type="file"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="file-selected">
            <FiCheckCircle color="var(--fh-accent)" />
            <span className="file-name">{file.name}</span>
            <button className="remove-file" onClick={() => setFile(null)}><FiX /></button>
          </div>
        )}
      </div>

      {error && <div className="fh-err">{error}</div>}

      <div className="actions">
        <button type="button" className="fh-btn ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="fh-btn primary" disabled={disabled} onClick={submit}>
          {submitting ? 'Enviando...' : 'Solicitar Cupo'}
        </button>
      </div>
    </form>
  )
}
