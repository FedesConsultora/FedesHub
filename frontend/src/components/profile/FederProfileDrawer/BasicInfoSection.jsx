import { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegFloppyDisk } from 'react-icons/fa6'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './BasicInfoSection.scss'

const COUNTRY_OPTIONS = [
  { cc: '+54', label: '🇦🇷 Argentina (+54)' }, { cc: '+598', label: '🇺🇾 Uruguay (+598)' },
  { cc: '+56', label: '🇨🇱 Chile (+56)' }, { cc: '+55', label: '🇧🇷 Brasil (+55)' },
  { cc: '+57', label: '🇨🇴 Colombia (+57)' }, { cc: '+51', label: '🇵🇪 Perú (+51)' },
  { cc: '+58', label: '🇻🇪 Venezuela (+58)' }, { cc: '+591', label: '🇧🇴 Bolivia (+591)' },
  { cc: '+595', label: '🇵🇾 Paraguay (+595)' }, { cc: '+593', label: '🇪🇨 Ecuador (+593)' },
  { cc: '+52', label: '🇲🇽 México (+52)' }, { cc: '+34', label: '🇪🇸 España (+34)' },
  { cc: '+39', label: '🇮🇹 Italia (+39)' }, { cc: '+33', label: '🇫🇷 Francia (+33)' },
  { cc: '+49', label: '🇩🇪 Alemania (+49)' }, { cc: '+44', label: '🇬🇧 Reino Unido (+44)' },
  { cc: '+1', label: '🇺🇸/🇨🇦 +1' },
]

// ---- helpers teléfono ----
const digitsOnly = (s = '') => String(s).replace(/\D/g, '')

// Dividir característica y número basado en longitud total
// Para Argentina: característica 2-4 dígitos, número 6-8 dígitos
function splitAreaNum(restDigits = '') {
  const d = digitsOnly(restDigits)

  // Si es muy corto, todo va al número
  if (d.length <= 6) return { area: '', num: d }

  // Heurística: característica mínima 2 dígitos, número mínimo 6 dígitos
  // Probamos de MAYOR a MENOR (4, 3, 2) para preferir áreas más largas
  if (d.length >= 8) {
    // Para 10+ dígitos: área de 4, 3, 2, resto es número
    for (let areaLen = 4; areaLen >= 2; areaLen--) {
      const area = d.slice(0, areaLen)
      const num = d.slice(areaLen)
      if (num.length >= 6 && num.length <= 8) return { area, num }
    }
  }

  // Fallback: primeros 2-3 dígitos son área, resto número
  if (d.length >= 8) return { area: d.slice(0, 2), num: d.slice(2) }
  return { area: '', num: d }
}

function parsePhone(raw = '') {
  const s = String(raw).trim()
  const m = s.match(/^\+(\d{1,3})\s*(.*)$/)
  if (m) {
    const cc = `+${m[1]}`
    const rest = digitsOnly(m[2] || '')
    const { area, num } = splitAreaNum(rest)
    return { cc, area, num }
  }
  const rest = digitsOnly(s)
  const { area, num } = splitAreaNum(rest)
  return { cc: '+54', area, num }
}

const pretty = (d = '') => digitsOnly(d).replace(/(\d{3})(?=\d)/g, '$1 ').trim()

export default function BasicInfoSection({ feder, celulaName, canEditCargo = false, isSelf = false }) {
  // baseline para detectar cambios reales
  const baseRef = useRef({
    nombre: feder?.nombre || '',
    apellido: feder?.apellido || '',
    cargo_principal: feder?.cargo_principal || '',
    telefono: feder?.telefono || ''
  })

  // estado editable
  const [local, setLocal] = useState({
    nombre: baseRef.current.nombre,
    apellido: baseRef.current.apellido,
    cargo_principal: baseRef.current.cargo_principal
  })
  const [phone, setPhone] = useState(parsePhone(baseRef.current.telefono))
  const { cc, area, num } = phone

  const toast = useToast()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // resincroniza si cambió desde afuera y no hay edición pendiente
  useEffect(() => {
    const next = {
      nombre: feder?.nombre || '',
      apellido: feder?.apellido || '',
      cargo_principal: feder?.cargo_principal || '',
      telefono: feder?.telefono || ''
    }
    if (!dirty && !saving) {
      baseRef.current = next
      setLocal({ nombre: next.nombre, apellido: next.apellido, cargo_principal: next.cargo_principal })
      setPhone(parsePhone(next.telefono))
    }
  }, [feder, dirty, saving])

  const setField = (k, v) => { setLocal(s => ({ ...s, [k]: v })); setDirty(true) }
  const setPhoneField = (patch) => { setPhone(p => ({ ...p, ...patch })); setDirty(true) }

  // +CC + área + número (sólo dígitos en área/número)
  const telFlat = useMemo(() => `${cc}${digitsOnly(area)}${digitsOnly(num)}`, [cc, area, num])

  const buildPayload = () => {
    const base = baseRef.current
    const p = {}
    // Normalizar a string vacía para comparaciones consistentes
    const normalize = (v) => (v ?? '') === '' ? '' : String(v)

    if (normalize(local.nombre) !== normalize(base.nombre)) p.nombre = local.nombre || ''
    if (normalize(local.apellido) !== normalize(base.apellido)) p.apellido = local.apellido || ''
    if (canEditCargo && normalize(local.cargo_principal) !== normalize(base.cargo_principal)) p.cargo_principal = local.cargo_principal || ''
    if (telFlat !== (base.telefono || '')) p.telefono = telFlat
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
      // Actualizar baseline local para evitar refetch
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
    <section className="pfBasic card" aria-label="Información básica">
      {/* Botón flotante: aparece sólo si hay cambios o está guardando */}
      {(dirty || saving) && (
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

      <h3>Información básica</h3>

      <div className="pfFormGrid">
        {/* Nombre */}
        <div className="pfInput">
          <label htmlFor="feder-nombre" className="lbl">Nombre</label>
          <input
            id="feder-nombre" name="nombre" className="control" placeholder="Nombre"
            autoComplete="given-name" value={local.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
          />
        </div>

        {/* Apellido */}
        <div className="pfInput">
          <label htmlFor="feder-apellido" className="lbl">Apellido</label>
          <input
            id="feder-apellido" name="apellido" className="control" placeholder="Apellido"
            autoComplete="family-name" value={local.apellido}
            onChange={(e) => setField('apellido', e.target.value)}
          />
        </div>

        {/* Cargo (respeta permisos) */}
        <div className="pfInput">
          <label htmlFor="feder-cargo" className="lbl">Cargo principal</label>
          <input
            id="feder-cargo" name="cargo_principal" className="control"
            placeholder="Ej. Desarrollador Fullstack" autoComplete="organization-title"
            value={local.cargo_principal} onChange={(e) => setField('cargo_principal', e.target.value)}
            disabled={!canEditCargo} readOnly={!canEditCargo}
          />
          {!canEditCargo && <small className="hint">No editable desde aquí</small>}
        </div>

        {/* Teléfono – País + Área + Número (CONTROLADOS) */}
        <div className="pfInput pfPhone" title="Teléfono">
          <label className="lbl" htmlFor="tel-num">Teléfono</label>

          <div className="phoneGroup" role="group" aria-labelledby="tel-num">
            <select
              name="tel_cc" className="control control--select cc" aria-label="Código de país"
              value={cc} onChange={(e) => setPhoneField({ cc: e.target.value })}
            >
              {COUNTRY_OPTIONS.map(o => <option key={o.cc} value={o.cc}>{o.label}</option>)}
            </select>

            <input
              id="tel-area" name="tel_area" className="control area" inputMode="numeric"
              placeholder="Área" title="Código de área (sin 0)"
              value={area} maxLength={5}
              onChange={(e) => setPhoneField({ area: digitsOnly(e.target.value).slice(0, 5) })}
            />

            <input
              id="tel-num" name="tel_num" className="control number" inputMode="tel"
              autoComplete="tel-national" placeholder="Número" title="Número de teléfono"
              value={pretty(num)} maxLength={20}
              onChange={(e) => setPhoneField({ num: digitsOnly(e.target.value).slice(0, 16) })}
            />
          </div>

          <small className="help">Se guardará como: <code>{telFlat || '—'}</code></small>
        </div>

        {/* Célula (solo lectura) */}
        <div className="pfInput pfCelula">
          <label className="lbl" htmlFor="feder-celula-ro">Célula</label>
          <input id="feder-celula-ro" className="control control--ro" value={celulaName || '(Sin célula)'} readOnly disabled />
        </div>
      </div>
    </section>
  )
}
