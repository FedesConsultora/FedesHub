import { useEffect, useRef, useState } from 'react'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './IdentidadSection.scss'

export default function IdentidadSection({ feder }) {
  const [local, setLocal] = useState({
    nombre_legal: feder?.nombre_legal || '',
    dni_tipo: feder?.dni_tipo || '',
    dni_numero_enc: feder?.dni_numero_enc || '',
    cuil_cuit_enc: feder?.cuil_cuit_enc || '',
    fecha_nacimiento: feder?.fecha_nacimiento ? feder.fecha_nacimiento.slice(0,10) : ''
  })

  const qRef = useRef({})
  const tRef = useRef()
  const toast = useToast()

  useEffect(() => {
    setLocal({
      nombre_legal: feder?.nombre_legal || '',
      dni_tipo: feder?.dni_tipo || '',
      dni_numero_enc: feder?.dni_numero_enc || '',
      cuil_cuit_enc: feder?.cuil_cuit_enc || '',
      fecha_nacimiento: feder?.fecha_nacimiento ? feder.fecha_nacimiento.slice(0,10) : ''
    })
  }, [feder])

  const queue = (k, v) => {
    setLocal(s => ({ ...s, [k]: v }))
    qRef.current[k] = v
    clearTimeout(tRef.current)
    tRef.current = setTimeout(async () => {
      const payload = { ...qRef.current }
      qRef.current = {}
      try { await federsApi.update(feder.id, payload) }
      catch (e) { toast.error(e?.error || 'No se pudo guardar') }
    }, 500)
  }

  return (
    <section className="pfIdentidad card" aria-label="Identidad y legales">
      <h3 title="Identidad y legales">Identidad y legales</h3>

      <div className="pfIdGrid">
        {/* Nombre legal */}
        <div className="pfInput">
          <label htmlFor="feder-nombre-legal" className="lbl" title="Nombre legal">Nombre legal</label>
          <input
            id="feder-nombre-legal"
            name="nombre_legal"
            className="control"
            placeholder="Como figura en el documento"
            autoComplete="name"
            value={local.nombre_legal}
            onChange={(e)=>queue('nombre_legal', e.target.value)}
          />
        </div>

        {/* Fecha de nacimiento */}
        <div className="pfInput">
          <label htmlFor="feder-fecha-nac" className="lbl" title="Fecha de nacimiento">Fecha de nacimiento</label>
          <input
            id="feder-fecha-nac"
            type="date"
            name="fecha_nacimiento"
            className="control control--date"
            autoComplete="bday"
            value={local.fecha_nacimiento || ''}
            onChange={(e)=>queue('fecha_nacimiento', e.target.value || null)}
          />
        </div>

        {/* DNI/CI/Pass - Tipo */}
        <div className="pfInput">
          <label htmlFor="feder-dni-tipo" className="lbl" title="Tipo de documento">DNI / CI / Pasaporte (tipo)</label>
          <input
            id="feder-dni-tipo"
            name="dni_tipo"
            className="control"
            placeholder="DNI / CI / Pasaporte"
            value={local.dni_tipo || ''}
            onChange={(e)=>queue('dni_tipo', e.target.value)}
          />
        </div>

        {/* Número (encriptado) */}
        <div className="pfInput">
          <label htmlFor="feder-dni-num" className="lbl" title="Número de documento (encriptado)">Número (encriptado)</label>
          <input
            id="feder-dni-num"
            name="dni_numero_enc"
            className="control"
            placeholder="valor encriptado/hasheado"
            value={local.dni_numero_enc || ''}
            onChange={(e)=>queue('dni_numero_enc', e.target.value)}
          />
          <p className="hint">Guardamos este valor encriptado/hasheado.</p>
        </div>

        {/* CUIL/CUIT (encriptado) */}
        <div className="pfInput">
          <label htmlFor="feder-cuil" className="lbl" title="CUIL/CUIT (encriptado)">CUIL/CUIT (enc)</label>
          <input
            id="feder-cuil"
            name="cuil_cuit_enc"
            className="control"
            placeholder="valor encriptado/hasheado"
            inputMode="numeric"
            value={local.cuil_cuit_enc || ''}
            onChange={(e)=>queue('cuil_cuit_enc', e.target.value)}
          />
          <p className="hint">También se almacena en forma encriptada.</p>
        </div>
      </div>
    </section>
  )
}