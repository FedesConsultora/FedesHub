import { useEffect, useMemo, useRef, useState } from 'react'
import useClientesCatalog from '../../pages/Clientes/hooks/useClientesCatalog'
import { clientesApi } from '../../api/clientes'
import { useToast } from '../toast/ToastProvider.jsx'
import { FiBriefcase, FiGlobe, FiMail, FiPhone, FiTag, FiUsers, FiX } from 'react-icons/fi'
import './CreateCliente.scss'

export default function CreateClienteModal({ onClose, onCreated }) {
  const { data: cat, loading, error } = useClientesCatalog()
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  const toast = useToast()
  const formRef = useRef(null)
  const firstFieldRef = useRef(null)

  // campos
  const [nombre, setNombre] = useState('')
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // const [celulaId, setCelulaId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [estadoId, setEstadoId] = useState('')
  const [ponderacion, setPonderacion] = useState('3') // default UI
  const [color, setColor] = useState('#3B82F6') // default blue

  // validaciones mínimas
  const nombreError = useMemo(() => {
    const t = nombre.trim()
    if (!t) return 'Requerido'
    if (t.length < 2) return 'Min. 2 caracteres'
    if (t.length > 160) return 'Máx. 160 caracteres'
    return null
  }, [nombre])

  // const celulaError = useMemo(() => (!celulaId ? 'Requerido' : null), [celulaId])

  const canSubmit = !!nombre.trim() && !nombreError && !loading

  // Enter para enviar
  useEffect(() => {
    const f = formRef.current
    if (!f) return
    const onKey = (ev) => { if (ev.key === 'Enter' && canSubmit) f.requestSubmit() }
    f.addEventListener('keydown', onKey)
    return () => f.removeEventListener('keydown', onKey)
  }, [canSubmit])

  // Foco inicial + Escape para cerrar
  useEffect(() => {
    firstFieldRef.current?.focus?.()
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  // helpers de normalización
  const numOrUndef = (v) => (v === '' || v == null ? undefined : Number(v))
  const strOrUndef = (v) => (v == null ? undefined : (v.trim() === '' ? undefined : v.trim()))

  const buildPayload = () => {
    // En el backend resolvemos tipo/estado por default si no vienen.
    // Solo mandamos lo que tenga valor "real" (evitamos strings vacíos).
    console.log('[buildPayload] color state value:', color)
    console.log('[buildPayload] strOrUndef(color):', strOrUndef(color))
    const body = {
      nombre: nombre.trim(),
      // celula_id: Number(celulaId),
      alias: strOrUndef(alias),
      email: strOrUndef(email),
      telefono: strOrUndef(telefono),
      sitio_web: strOrUndef(sitioWeb),
      descripcion: strOrUndef(descripcion),
      ponderacion: numOrUndef(ponderacion),
      tipo_id: numOrUndef(tipoId),
      estado_id: numOrUndef(estadoId),
      color: strOrUndef(color),
    }
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k])
    return body
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setApiError(null)
    setSubmitting(true)

    let created = null
    let success = false

    try {
      const payload = buildPayload()
      console.log('[CreateClienteModal] Sending payload:', payload)
      created = await clientesApi.create(payload)
      console.log('[CreateClienteModal] Created client:', created)
      success = true
    } catch (err) {
      const msg = err?.fh?.message || err?.response?.data?.message || 'No se pudo crear el cliente'
      setApiError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }

    // Si fue exitoso, notificar y cerrar (fuera del try/catch para no mostrar error si callbacks fallan)
    if (success) {
      toast.success('Cliente creado')
      onCreated?.(created)
      onClose?.()
    }
  }

  return (
    <div className="clienteModalWrap" role="dialog" aria-modal="true" aria-label="Crear cliente">
      <form ref={formRef} className="ccCard" onSubmit={onSubmit} noValidate>
        <header className="ccHeader">
          <div className="brand">
            <div className="logo">Nuevo cliente</div>
            <div className="subtitle">Campos mínimos: Nombre</div>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <FiX />
          </button>
        </header>

        {/* Contenido con scroll interno si no entra en viewport */}
        <div className="ccBody">
          <div className="ccGrid">
            {/* Columna izquierda */}
            <div className="col">
              {/* Célula removed */}

              {/* Tipo */}
              {(cat.tipos || []).length > 0 && (
                <>
                  <label className="lbl" htmlFor="tipo">Tipo</label>
                  <div className="field">
                    <FiTag className="ico" aria-hidden />
                    <select
                      id="tipo" name="tipo_id" value={tipoId}
                      onChange={(e) => setTipoId(e.target.value)}
                      disabled={loading || submitting}
                    >
                      <option value="">— Automático —</option>
                      {(cat.tipos || []).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} (pond. {t.ponderacion})</option>
                      ))}
                    </select>
                    <div className="addon" aria-hidden />
                  </div>
                </>
              )}

              {/* Estado */}
              {(cat.estados || []).length > 0 && (
                <>
                  <label className="lbl" htmlFor="estado">Estado</label>
                  <div className="field">
                    <FiTag className="ico" aria-hidden />
                    <select
                      id="estado" name="estado_id" value={estadoId}
                      onChange={(e) => setEstadoId(e.target.value)}
                      disabled={loading || submitting}
                    >
                      <option value="">— Activo (default) —</option>
                      {(cat.estados || []).map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                    <div className="addon" aria-hidden />
                  </div>
                </>
              )}

              {/* Ponderación */}
              {(cat.ponderaciones || []).length > 0 && (
                <>
                  <label className="lbl" htmlFor="pond">Ponderación</label>
                  <div className="field">
                    <FiTag className="ico" aria-hidden />
                    <select
                      id="pond" name="ponderacion" value={ponderacion}
                      onChange={(e) => setPonderacion(e.target.value)}
                      disabled={loading || submitting}
                    >
                      {(cat.ponderaciones || [1, 2, 3, 4, 5]).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <div className="addon" aria-hidden />
                  </div>
                </>
              )}

              {/* Color */}
              <label className="lbl" htmlFor="color">Color</label>
              <div className="field" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="color"
                  name="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={loading || submitting}
                  style={{ width: '60px', height: '38px', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3B82F6"
                  maxLength={7}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  disabled={loading || submitting}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col">
              {/* Nombre */}
              <label className="lbl" htmlFor="nombre">Nombre <span className="req">*</span></label>
              <div className={'field ' + (nombreError ? 'is-error' : '')}>
                <FiBriefcase className="ico" aria-hidden />
                <input
                  id="nombre" name="nombre" type="text"
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Acme Corp" maxLength={160}
                  aria-invalid={!!nombreError}
                  aria-describedby={nombreError ? 'err-nombre' : undefined}
                  disabled={loading || submitting}
                />
                <div className="addon" aria-hidden />
              </div>
              {nombreError && <div id="err-nombre" className="help error-inline">{nombreError}</div>}

              {/* Alias */}
              <label className="lbl" htmlFor="alias">Alias</label>
              <div className="field">
                <FiTag className="ico" aria-hidden />
                <input id="alias" name="alias" type="text" value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  disabled={loading || submitting} />
                <div className="addon" aria-hidden />
              </div>

              {/* Email */}
              <label className="lbl" htmlFor="email">Email</label>
              <div className="field">
                <FiMail className="ico" aria-hidden />
                <input id="email" name="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || submitting} />
                <div className="addon" aria-hidden />
              </div>

              {/* Teléfono */}
              <label className="lbl" htmlFor="tel">Teléfono</label>
              <div className="field">
                <FiPhone className="ico" aria-hidden />
                <input id="tel" name="telefono" type="tel" value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={loading || submitting} />
                <div className="addon" aria-hidden />
              </div>

              {/* Sitio web */}
              <label className="lbl" htmlFor="web">Sitio web</label>
              <div className="field">
                <FiGlobe className="ico" aria-hidden />
                <input id="web" name="sitio_web" type="url" value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  disabled={loading || submitting} placeholder="https://…" />
                <div className="addon" aria-hidden />
              </div>

              {/* Descripción */}
              <label className="lbl" htmlFor="desc">Descripción</label>
              <div className="field area">
                <FiTag className="ico" aria-hidden />
                <textarea id="desc" name="descripcion" rows={5} value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={loading || submitting} />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error" role="alert">Error cargando catálogos.</div>}
        {apiError && <div className="error" role="alert">{apiError}</div>}

        <footer className="ccFooter">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Creando…' : 'Crear cliente'}
          </button>
        </footer>
      </form>
    </div>
  )
}
