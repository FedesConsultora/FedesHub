import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const formRef = React.useRef(null)
  const firstFieldRef = React.useRef(null)

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

  const mouseDownTarget = React.useRef(null)

  const handleOverlayClick = (e) => {
    if (mouseDownTarget.current !== e.currentTarget || e.target !== e.currentTarget) {
      return
    }
    onClose?.()
  }

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const modalContent = (
    <div className="clienteModalWrap" role="dialog" aria-modal="true" aria-label="Crear cliente" onMouseDown={(e) => mouseDownTarget.current = e.target} onClick={handleOverlayClick}>
      <form ref={formRef} className="ccCard" onSubmit={onSubmit} noValidate onClick={(e) => e.stopPropagation()}>
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
              {/* Tipo */}
              {(cat.tipos || []).length > 0 && (
                <div className="field has-label">
                  <FiTag className="ico" aria-hidden />
                  <div className="field-content">
                    <span className="field-label">Tipo</span>
                    <select
                      id="tipo" name="tipo_id" value={tipoId}
                      onChange={(e) => setTipoId(e.target.value)}
                      disabled={loading || submitting}
                    >
                      <option value="">— Automático —</option>
                      {(cat.tipos || []).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Estado */}
              {(cat.estados || []).length > 0 && (
                <div className="field has-label">
                  <FiTag className="ico" aria-hidden />
                  <div className="field-content">
                    <span className="field-label">Estado</span>
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
                  </div>
                </div>
              )}

              {/* Ponderación */}
              {(cat.ponderaciones || []).length > 0 && (
                <div className="field has-label">
                  <FiTag className="ico" aria-hidden />
                  <div className="field-content">
                    <span className="field-label">Ponderación</span>
                    <select
                      id="pond" name="ponderacion" value={ponderacion}
                      onChange={(e) => setPonderacion(e.target.value)}
                      disabled={loading || submitting}
                    >
                      {(cat.ponderaciones || [1, 2, 3, 4, 5]).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Color */}
              <div className="field has-label">
                <FiTag className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Color de Marca</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                    <div className="color-input-wrapper" style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)' }}>
                      <input
                        id="color"
                        name="color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        disabled={loading || submitting}
                        style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', cursor: 'pointer', border: 'none', background: 'none' }}
                      />
                    </div>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#3B82F6"
                      maxLength={7}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      disabled={loading || submitting}
                      style={{ flex: 1, fontSize: '15px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col">
              {/* Nombre */}
              <div className={'field has-label ' + (nombreError ? 'is-error' : '')}>
                <FiBriefcase className="ico" aria-hidden />
                <div className="field-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="field-label">Nombre <span className="req">*</span></span>
                    {nombreError && <span style={{ fontSize: '10px', color: '#ff9080', fontWeight: 'bold', textTransform: 'uppercase' }}>{nombreError}</span>}
                  </div>
                  <input
                    id="nombre" name="nombre" type="text"
                    value={nombre} onChange={(e) => setNombre(e.target.value)}
                    placeholder="Acme Corp" maxLength={160}
                    aria-invalid={!!nombreError}
                    disabled={loading || submitting}
                    ref={firstFieldRef}
                  />
                </div>
              </div>

              {/* Alias */}
              <div className="field has-label">
                <FiTag className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Alias</span>
                  <input id="alias" name="alias" type="text" value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Nombre corto..."
                    disabled={loading || submitting} />
                </div>
              </div>

              {/* Email */}
              <div className="field has-label">
                <FiMail className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Email</span>
                  <input id="email" name="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    disabled={loading || submitting} />
                </div>
              </div>

              {/* Teléfono */}
              <div className="field has-label">
                <FiPhone className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Teléfono</span>
                  <input id="tel" name="telefono" type="tel" value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54..."
                    disabled={loading || submitting} />
                </div>
              </div>

              {/* Sitio web */}
              <div className="field has-label">
                <FiGlobe className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Sitio web</span>
                  <input id="web" name="sitio_web" type="url" value={sitioWeb}
                    onChange={(e) => setSitioWeb(e.target.value)}
                    disabled={loading || submitting} placeholder="https://…" />
                </div>
              </div>

              {/* Descripción */}
              <div className="field area has-label">
                <FiTag className="ico" aria-hidden />
                <div className="field-content">
                  <span className="field-label">Descripción</span>
                  <textarea id="desc" name="descripcion" rows={3} value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Notas adicionales..."
                    disabled={loading || submitting} />
                </div>
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

  return createPortal(modalContent, document.body)
}
