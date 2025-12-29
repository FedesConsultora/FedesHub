import { useEffect, useRef, useState } from 'react'
import { FaRegFloppyDisk } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './IdentidadSection.scss'

const DOCUMENT_TYPES = [
  { value: '', label: '— Seleccioná —' },
  { value: 'DNI', label: 'DNI' },
  { value: 'CI', label: 'CI (Cédula de Identidad)' },
  { value: 'Pasaporte', label: 'Pasaporte' },
  { value: 'Otro', label: 'Otro' }
]

export default function IdentidadSection({ feder, isSelf = false, readOnly = false }) {
  // baseline para detectar cambios reales
  const baseRef = useRef({
    nombre_legal: feder?.nombre_legal || '',
    dni_tipo: feder?.dni_tipo || '',
    dni_numero: feder?.dni_numero || '', // texto plano
    fecha_nacimiento: feder?.fecha_nacimiento ? feder.fecha_nacimiento.slice(0, 10) : '',
    cuil_cuit: feder?.cuil_cuit || '' // texto plano
  })

  // estado editable
  const [local, setLocal] = useState({ ...baseRef.current })

  const toast = useToast()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // resincroniza si cambió desde afuera y no hay edición pendiente
  useEffect(() => {
    const next = {
      nombre_legal: feder?.nombre_legal || '',
      dni_tipo: feder?.dni_tipo || '',
      dni_numero: feder?.dni_numero || '',
      fecha_nacimiento: feder?.fecha_nacimiento ? feder.fecha_nacimiento.slice(0, 10) : '',
      cuil_cuit: feder?.cuil_cuit || ''
    }
    if (!dirty && !saving) {
      baseRef.current = next
      setLocal(next)
    }
  }, [feder, dirty, saving])

  const setField = (k, v) => {
    setLocal(s => ({ ...s, [k]: v }))
    setDirty(true)
  }

  const buildPayload = () => {
    const base = baseRef.current
    const p = {}
    // Normalizar a string vacía para comparaciones consistentes
    const normalize = (v) => (v ?? '') === '' ? '' : String(v)

    if (normalize(local.nombre_legal) !== normalize(base.nombre_legal)) p.nombre_legal = local.nombre_legal || null
    if (normalize(local.dni_tipo) !== normalize(base.dni_tipo)) p.dni_tipo = local.dni_tipo || null
    if (normalize(local.dni_numero) !== normalize(base.dni_numero)) p.dni_numero = local.dni_numero || null
    if (normalize(local.cuil_cuit) !== normalize(base.cuil_cuit)) p.cuil_cuit = local.cuil_cuit || null
    if (normalize(local.fecha_nacimiento) !== normalize(base.fecha_nacimiento)) p.fecha_nacimiento = local.fecha_nacimiento || null

    return p
  }

  const onSave = async () => {
    const payload = buildPayload()
    if (!Object.keys(payload).length) {
      // No hay cambios reales, resetear dirty sin hacer request
      setDirty(false)
      toast.info('No hay cambios para guardar')
      return
    }
    setSaving(true)
    try {
      if (isSelf) {
        await federsApi.updateSelf(payload)
      } else {
        await federsApi.update(feder.id, payload)
      }
      // Actualizar baseline local para evitar refetch innecesario
      baseRef.current = { ...baseRef.current, ...payload }
      setDirty(false)
      toast.success('Guardado')
      // Disparamos evento para consistencia (ahora es "silent refetch" sin parpadeo)
      try { window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'feders.updated', feder_id: feder.id, payload } })) } catch { }
    } catch (e) {
      toast.error(e?.fh?.message || e?.error || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="pfIdentidad card" aria-label="Identidad y legales">
      {/* Botón flotante: aparece sólo si hay cambios o está guardando, y NO es solo lectura */}
      {(!readOnly && (dirty || saving)) && (
        <button
          type="button"
          className={'btnSaveFloating' + (saving ? ' saving' : '')}
          onClick={onSave}
          disabled={saving}
          title="Guardar cambios"
        >
          {saving ? <span className="spinner" aria-hidden="true" /> : <FaRegFloppyDisk />}
          <span className="txt">{saving ? 'Guardando' : 'Guardar'}</span>
        </button>
      )}

      <h3>Identidad y legales</h3>

      <div className="pfIdGrid">
        {/* Nombre legal */}
        <div className="pfInput">
          <label htmlFor="feder-nombre-legal" className="lbl">Nombre legal</label>
          <input
            id="feder-nombre-legal"
            name="nombre_legal"
            className="control"
            placeholder="Como figura en el documento"
            autoComplete="name"
            value={local.nombre_legal}
            onChange={(e) => setField('nombre_legal', e.target.value)}
            disabled={readOnly} readOnly={readOnly}
          />
        </div>

        {/* Tipo de documento (select) */}
        <div className="pfInput">
          <label htmlFor="feder-dni-tipo" className="lbl">Tipo de documento</label>
          <select
            id="feder-dni-tipo"
            name="dni_tipo"
            className="control control--select"
            value={local.dni_tipo || ''}
            onChange={(e) => setField('dni_tipo', e.target.value)}
            disabled={readOnly}
          >
            {DOCUMENT_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Número de documento */}
        <div className="pfInput">
          <label htmlFor="feder-dni-num" className="lbl">Número de documento</label>
          <input
            id="feder-dni-num"
            name="dni_numero"
            className="control"
            placeholder="Ej: 12345678"
            inputMode="numeric"
            value={local.dni_numero || ''}
            onChange={(e) => setField('dni_numero', e.target.value)}
            disabled={readOnly} readOnly={readOnly}
          />
        </div>

        {/* Fecha de nacimiento */}
        <div className="pfInput">
          <label htmlFor="feder-fecha-nac" className="lbl">Fecha de nacimiento</label>
          <input
            id="feder-fecha-nac"
            type="date"
            name="fecha_nacimiento"
            className="control control--date"
            autoComplete="bday"
            value={local.fecha_nacimiento || ''}
            onChange={(e) => setField('fecha_nacimiento', e.target.value)}
            disabled={readOnly} readOnly={readOnly}
          />
        </div>

        {/* CUIL/CUIT (opcional) */}
        <div className="pfInput">
          <label htmlFor="feder-cuil" className="lbl">CUIL/CUIT <span className="optional">(opcional)</span></label>
          <input
            id="feder-cuil"
            name="cuil_cuit"
            className="control"
            placeholder="Ej: 20-12345678-9"
            inputMode="numeric"
            value={local.cuil_cuit || ''}
            onChange={(e) => setField('cuil_cuit', e.target.value)}
            disabled={readOnly} readOnly={readOnly}
          />
        </div>
      </div>

      {/* Nota de privacidad */}
      <p className="privacy-note">Los datos sensibles se almacenan cifrados.</p>
    </section>
  )
}